import { withTransaction, query } from '../config/db.js';
import { generateDocumentNumber } from '../utils/invoiceNumberGenerator.js';
import { round } from '../utils/taxCalculator.js';

export async function listPurchases(req, res, next) {
  try {
    const { supplierId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (supplierId) {
      conditions.push('pi.supplier_id = ?');
      params.push(supplierId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await query(`SELECT COUNT(*) AS total FROM purchase_invoices pi ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT 
        pi.id,
        pi.invoice_number,
        pi.supplier_invoice_number,
        pi.invoice_date,
        pi.status,
        pi.grand_total,
        pi.amount_paid,
        pi.balance_due,
        pi.payment_status,
        s.company_name AS supplier_name,
        u.full_name AS received_by_name
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      JOIN users u ON pi.received_by_user_id = u.id
      ${where}
      ORDER BY pi.invoice_date DESC, pi.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), offset);
    const rows = await query(dataSql, params);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalRecords,
        totalPages: Math.ceil(totalRecords / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createPurchase(req, res, next) {
  try {
    const {
      supplierId,
      supplierInvoiceNumber,
      items, // [{ productId, quantity, unitPrice, gstRate, batchNumber, expiryDate }]
      amountPaid = 0,
      paymentMode = 'BANK_TRANSFER',
      accountId = 2, // Bank Account
      notes = null,
    } = req.body;

    if (!supplierId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and at least one purchase item are required.',
      });
    }

    const receivedByUserId = req.user?.id || 1;

    const purchase = await withTransaction(async (conn) => {
      let subtotal = 0;
      let totalTax = 0;
      let grandTotal = 0;

      const processedItems = [];

      for (const item of items) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const rate = Number(item.gstRate || 0);

        const lineTaxable = round(qty * price);
        const lineTax = round((lineTaxable * rate) / 100);
        const lineTotal = round(lineTaxable + lineTax);

        subtotal += lineTaxable;
        totalTax += lineTax;
        grandTotal += lineTotal;

        processedItems.push({
          productId: item.productId,
          batchNumber: item.batchNumber || null,
          expiryDate: item.expiryDate || null,
          quantity: qty,
          unitPrice: price,
          taxableAmount: lineTaxable,
          gstRate: rate,
          taxAmount: lineTax,
          totalAmount: lineTotal,
        });
      }

      grandTotal = round(grandTotal);
      const paid = Math.min(Number(amountPaid) || 0, grandTotal);
      const balanceDue = round(grandTotal - paid);
      let paymentStatus = 'PAID';
      if (balanceDue > 0 && paid > 0) {
        paymentStatus = 'PARTIAL';
      } else if (balanceDue > 0 && paid === 0) {
        paymentStatus = 'UNPAID';
      }

      const invoiceNumber = await generateDocumentNumber(conn, 'PURCHASE');

      // 1. Insert purchase_invoices
      const [pResult] = await conn.query(`
        INSERT INTO purchase_invoices (
          invoice_number, supplier_invoice_number, invoice_date, supplier_id,
          status, subtotal, total_tax, grand_total, amount_paid, balance_due,
          payment_status, notes, received_by_user_id
        ) VALUES (?, ?, NOW(), ?, 'RECEIVED', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        invoiceNumber,
        supplierInvoiceNumber || null,
        supplierId,
        round(subtotal),
        round(totalTax),
        grandTotal,
        paid,
        balanceDue,
        paymentStatus,
        notes,
        receivedByUserId,
      ]);

      const purchaseId = pResult.insertId;

      // 2. Insert items, update product stock & purchase price, and record stock movements
      for (const item of processedItems) {
        await conn.query(`
          INSERT INTO purchase_invoice_items (
            purchase_id, product_id, batch_number, expiry_date,
            quantity, unit_price, taxable_amount, gst_rate, tax_amount, total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          purchaseId,
          item.productId,
          item.batchNumber,
          item.expiryDate,
          item.quantity,
          item.unitPrice,
          item.taxableAmount,
          item.gstRate,
          item.taxAmount,
          item.totalAmount,
        ]);

        // Lock & update product current_stock and update purchase_price
        const [prod] = await conn.query('SELECT current_stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        const newStock = round(Number(prod[0]?.current_stock || 0) + item.quantity, 3);

        await conn.query(`
          UPDATE products 
          SET current_stock = ?, purchase_price = ?
          WHERE id = ?
        `, [newStock, item.unitPrice, item.productId]);

        // Record stock movement (PURCHASE)
        await conn.query(`
          INSERT INTO stock_movements (
            product_id, movement_type, reference_type, reference_id,
            quantity, balance_after, notes, created_by_user_id
          ) VALUES (?, 'PURCHASE', 'PURCHASE_INVOICE', ?, ?, ?, ?, ?)
        `, [
          item.productId,
          purchaseId,
          item.quantity,
          newStock,
          `Purchase received from supplier inv ${invoiceNumber}`,
          receivedByUserId,
        ]);
      }

      // 3. If payment made to supplier immediately
      if (paid > 0) {
        const paymentNumber = await generateDocumentNumber(conn, 'PAYMENT');
        const [payResult] = await conn.query(`
          INSERT INTO payments (
            payment_number, payment_date, reference_type, reference_id,
            supplier_id, payment_mode, account_id, amount, notes, received_by_user_id
          ) VALUES (?, NOW(), 'PURCHASE_INVOICE', ?, ?, ?, ?, ?, ?, ?)
        `, [
          paymentNumber,
          purchaseId,
          supplierId,
          paymentMode,
          accountId,
          paid,
          `Payment for purchase invoice ${invoiceNumber}`,
          receivedByUserId,
        ]);

        // Deduct from bank/cash account
        await conn.query('UPDATE financial_accounts SET current_balance = current_balance - ? WHERE id = ?', [paid, accountId]);

        const [acc] = await conn.query('SELECT current_balance FROM financial_accounts WHERE id = ?', [accountId]);
        const newBal = acc[0]?.current_balance || 0;

        const txnNumber = await generateDocumentNumber(conn, 'TRANSACTION');
        await conn.query(`
          INSERT INTO account_transactions (
            transaction_number, transaction_date, account_id, transaction_type,
            amount, balance_after, reference_type, reference_id, description, created_by_user_id
          ) VALUES (?, NOW(), ?, 'DEBIT', ?, ?, 'PURCHASE_PAYMENT', ?, ?, ?)
        `, [
          txnNumber,
          accountId,
          paid,
          newBal,
          purchaseId,
          `Supplier payment for purchase ${invoiceNumber}`,
          receivedByUserId,
        ]);
      }

      // 4. Update supplier payable balance if balance due > 0
      if (balanceDue > 0) {
        await conn.query('UPDATE suppliers SET current_balance = current_balance + ? WHERE id = ?', [balanceDue, supplierId]);
      }

      return {
        purchaseId,
        invoiceNumber,
        grandTotal,
        amountPaid: paid,
        balanceDue,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase invoice recorded and inventory updated successfully.',
      data: purchase,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseById(req, res, next) {
  try {
    const { id } = req.params;

    const purchases = await query(`
      SELECT 
        pi.*,
        s.name AS supplier_contact_name,
        s.company_name AS supplier_name,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        s.address AS supplier_address,
        s.gstin AS supplier_gstin,
        u.full_name AS received_by_name
      FROM purchase_invoices pi
      JOIN suppliers s ON pi.supplier_id = s.id
      JOIN users u ON pi.received_by_user_id = u.id
      WHERE pi.id = ? OR pi.invoice_number = ?
      LIMIT 1
    `, [id, id]);

    if (!purchases || purchases.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase invoice not found.' });
    }

    const purchase = purchases[0];

    const items = await query(`
      SELECT 
        pii.*,
        p.name AS product_name,
        p.barcode,
        p.sku,
        u.short_code AS unit_code
      FROM purchase_invoice_items pii
      JOIN products p ON pii.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE pii.purchase_id = ?
      ORDER BY pii.id ASC
    `, [purchase.id]);

    const returns = await query(`
      SELECT pr.*, u.full_name AS processed_by_name
      FROM purchase_returns pr
      JOIN users u ON pr.processed_by_user_id = u.id
      WHERE pr.purchase_id = ?
    `, [purchase.id]);

    return res.json({
      success: true,
      data: {
        purchase,
        items,
        returns,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function processPurchaseReturn(req, res, next) {
  try {
    const { id } = req.params;
    const { items, reason, refundAmount } = req.body;
    // items: [{ productId, quantity, unitPrice }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Return items are required.' });
    }

    const result = await withTransaction(async (conn) => {
      const [pRows] = await conn.query('SELECT * FROM purchase_invoices WHERE id = ?', [id]);
      if (!pRows || pRows.length === 0) {
        throw new Error('Purchase invoice not found.');
      }
      const purchase = pRows[0];
      const returnNumber = await generateDocumentNumber(conn, 'PURCHASE_RETURN');
      const refund = Number(refundAmount) || 0;

      // 1. Insert purchase_returns
      const [retResult] = await conn.query(`
        INSERT INTO purchase_returns (
          return_number, return_date, purchase_id, supplier_id,
          refund_amount, reason, processed_by_user_id
        ) VALUES (?, NOW(), ?, ?, ?, ?, ?)
      `, [returnNumber, purchase.id, purchase.supplier_id, refund, reason || 'Return to supplier', req.user?.id || 1]);

      // 2. Reduce stock for each returned item
      for (const item of items) {
        const qty = Number(item.quantity);
        if (qty <= 0) continue;

        const [prodRows] = await conn.query('SELECT current_stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        const currentStock = Number(prodRows[0]?.current_stock || 0);
        const newStock = round(Math.max(0, currentStock - qty), 3);

        await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.productId]);

        await conn.query(`
          INSERT INTO stock_movements (
            product_id, movement_type, reference_type, reference_id,
            quantity, balance_after, notes, created_by_user_id
          ) VALUES (?, 'PURCHASE_RETURN', 'PURCHASE_RETURN', ?, ?, ?, ?, ?)
        `, [item.productId, retResult.insertId, -qty, newStock, `Returned to supplier for invoice ${purchase.invoice_number}`, req.user?.id || 1]);
      }

      // 3. Adjust supplier payable balance
      if (refund > 0) {
        await conn.query('UPDATE suppliers SET current_balance = current_balance - ? WHERE id = ?', [refund, purchase.supplier_id]);
      }

      return {
        returnId: retResult.insertId,
        returnNumber,
        refundAmount: refund,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase return processed and stock adjusted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

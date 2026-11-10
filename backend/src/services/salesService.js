import { withTransaction, query } from '../config/db.js';
import { calculateItemTaxes, calculateInvoiceTotals, round } from '../utils/taxCalculator.js';
import { generateDocumentNumber } from '../utils/invoiceNumberGenerator.js';
import { acquireIdempotencyLock, releaseIdempotencyLock } from '../utils/idempotency.js';

export class SalesService {
  /**
   * Process a Complete POS Sale atomically
   */
  static async checkoutSale({
    customerId = 1, // Default Walk-in Customer
    cashierId,
    items, // [{ productId, quantity, discountPercent, discountAmount }]
    billDiscountPercent = 0,
    billDiscountAmount = 0,
    redeemPoints = 0, // Loyalty points to redeem
    paymentMode = 'CASH', // 'CASH', 'UPI', 'CARD', 'SPLIT', etc.
    payments = [], // Optional split payments: [{ mode, amount, accountId, tenderAmount, transactionRef }]
    tenderAmount = 0, // Amount handed by customer
    accountId = 1, // Primary account receiving money (1 = Cash Drawer)
    notes = null,
    idempotencyKey = null,
  }) {
    if (!items || items.length === 0) {
      throw new Error('Shopping cart cannot be empty.');
    }

    // 1. Idempotency Check
    if (idempotencyKey) {
      const lockAcquired = acquireIdempotencyLock(idempotencyKey);
      if (!lockAcquired) {
        throw new Error('This checkout is already being processed. Please wait.');
      }

      // Check if invoice with this idempotency key was already created
      const existingInvoices = await query(
        'SELECT id, invoice_number, grand_total FROM sales_invoices WHERE idempotency_key = ? LIMIT 1',
        [idempotencyKey]
      );
      if (existingInvoices && existingInvoices.length > 0) {
        releaseIdempotencyLock(idempotencyKey);
        const dup = existingInvoices[0];
        return {
          id: dup.id,
          invoiceId: dup.id,
          invoiceNumber: dup.invoice_number,
          grandTotal: dup.grand_total,
          isDuplicateSubmission: true,
        };
      }
    }

    try {
      const result = await withTransaction(async (conn) => {
        // Fetch Store settings for state code, prefix & loyalty configuration
        const [settingsRows] = await conn.query(`
          SELECT 
            state_code, invoice_prefix, loyalty_enabled, loyalty_min_purchase,
            loyalty_points_per_invoice, loyalty_redemption_rate, loyalty_redemption_enabled
          FROM business_settings 
          LIMIT 1
        `);
        const settings = settingsRows[0] || {};
        const storeStateCode = settings.state_code || '33';
        const invoicePrefix = settings.invoice_prefix || 'INV-';
        const loyaltyEnabled = settings.loyalty_enabled !== 0 && settings.loyalty_enabled !== false;
        const minPurchase = Number(settings.loyalty_min_purchase) || 100.00;
        const pointsPerInvoice = Number(settings.loyalty_points_per_invoice) || 1;
        const redemptionRate = Number(settings.loyalty_redemption_rate) || 1.00;
        const redemptionEnabled = settings.loyalty_redemption_enabled !== 0 && settings.loyalty_redemption_enabled !== false;

        // Fetch Customer details with row lock (FOR UPDATE)
        const [custRows] = await conn.query(
          'SELECT id, name, phone, state_code, current_balance, credit_limit, loyalty_points FROM customers WHERE id = ? FOR UPDATE',
          [customerId]
        );
        if (!custRows || custRows.length === 0) {
          throw new Error('Selected customer does not exist.');
        }
        const customer = custRows[0];
        const customerStateCode = customer.state_code || storeStateCode;
        const isWalkIn = customer.id === 1 || customer.phone === '9999999999';

        // 2. Fetch & Lock Product Rows for Concurrent Checkout Safety (FOR UPDATE)
        const productIds = items.map((i) => i.productId);
        const placeholders = productIds.map(() => '?').join(',');

        const [dbProducts] = await conn.query(
          `SELECT 
            p.id, p.name, p.barcode, p.hsn_code, p.selling_price, p.mrp,
            p.purchase_price, p.gst_rate, p.is_tax_inclusive, p.discount_percent,
            p.current_stock, p.is_active, u.short_code as unit_code, u.allows_decimal
           FROM products p
           JOIN units u ON p.unit_id = u.id
           WHERE p.id IN (${placeholders})
           FOR UPDATE`,
          productIds
        );

        const productMap = new Map();
        dbProducts.forEach((p) => productMap.set(p.id, p));

        // 3. Validate Stock & Assemble Server-Calculated Line Items (Do NOT trust frontend prices)
        const validatedItems = [];

        for (const item of items) {
          const dbProd = productMap.get(item.productId);
          if (!dbProd) {
            throw new Error(`Product ID ${item.productId} was not found in catalog.`);
          }
          if (!dbProd.is_active) {
            throw new Error(`Product "${dbProd.name}" is currently deactivated.`);
          }

          const requestedQty = Number(item.quantity);
          if (isNaN(requestedQty) || requestedQty <= 0) {
            throw new Error(`Invalid quantity ${item.quantity} for product "${dbProd.name}".`);
          }

          if (!dbProd.allows_decimal && !Number.isInteger(requestedQty)) {
            throw new Error(`Fractional quantity is not permitted for unit "${dbProd.unit_code}" (${dbProd.name}).`);
          }

          const availableStock = Number(dbProd.current_stock);
          if (availableStock < requestedQty) {
            throw new Error(
              `Insufficient stock for "${dbProd.name}". Requested: ${requestedQty}, Available: ${availableStock}.`
            );
          }

          // Use server product price and tax settings
          validatedItems.push({
            productId: dbProd.id,
            itemName: dbProd.name,
            barcode: dbProd.barcode,
            hsnCode: dbProd.hsn_code,
            unitCode: dbProd.unit_code,
            unitPrice: Number(dbProd.selling_price),
            mrp: Number(dbProd.mrp),
            purchasePrice: Number(dbProd.purchase_price),
            quantity: requestedQty,
            discountPercent: Number(item.discountPercent !== undefined ? item.discountPercent : dbProd.discount_percent || 0),
            discountAmount: Number(item.discountAmount || 0),
            gstRate: Number(dbProd.gst_rate),
            isTaxInclusive: Boolean(dbProd.is_tax_inclusive),
            currentStock: availableStock,
          });
        }

        // 4. Calculate Taxes & Totals (Independent Server Verification)
        const calculation = calculateInvoiceTotals(validatedItems, {
          billDiscountPercent,
          billDiscountAmount,
          customerStateCode,
          storeStateCode,
        });

        // 5. Loyalty Points Earning & Redemption Calculation
        const preLoyaltyGrandTotal = calculation.grandTotal;

        // Earning Rule: award points only if final eligible purchase amount (before loyalty redemption) is ABOVE minPurchase (> ₹100)
        let pointsEarned = 0;
        if (!isWalkIn && loyaltyEnabled && preLoyaltyGrandTotal > minPurchase) {
          pointsEarned = pointsPerInvoice;
        }

        // Redemption Rule: 1 point = ₹1 discount (configurable), cannot make bill negative
        let actualPointsRedeemed = 0;
        let loyaltyDiscount = 0;

        if (!isWalkIn && loyaltyEnabled && redemptionEnabled && Number(redeemPoints) > 0) {
          const reqRedeem = Math.floor(Number(redeemPoints));
          const currentPoints = Number(customer.loyalty_points) || 0;

          if (reqRedeem > currentPoints) {
            throw new Error(`Cannot redeem ${reqRedeem} points. Customer only has ${currentPoints} available points.`);
          }

          const maxDiscount = preLoyaltyGrandTotal; // Never allow negative bill total
          const requestedDiscount = round(reqRedeem * redemptionRate);
          loyaltyDiscount = round(Math.min(requestedDiscount, maxDiscount));
          actualPointsRedeemed = Math.min(reqRedeem, Math.ceil(loyaltyDiscount / redemptionRate));
        }

        const finalGrandTotal = round(Math.max(0, preLoyaltyGrandTotal - loyaltyDiscount));
        const grandTotal = finalGrandTotal;

        // Customer loyalty points before & after
        const pointsBefore = Number(customer.loyalty_points) || 0;
        let pointsAfter = pointsBefore;

        if (!isWalkIn) {
          pointsAfter = Math.max(0, pointsBefore - actualPointsRedeemed + pointsEarned);
          if (pointsAfter !== pointsBefore) {
            await conn.query('UPDATE customers SET loyalty_points = ? WHERE id = ?', [pointsAfter, customer.id]);
          }
        }

        // 6. Generate Safe Unique Invoice Number
        const invoiceNumber = await generateDocumentNumber(conn, 'SALE');

        // Payment status calculation
        let totalPaid = 0;

        // If split payments provided
        const paymentList = [];
        if (payments && payments.length > 0) {
          for (const p of payments) {
            const pAmt = Number(p.amount) || 0;
            totalPaid += pAmt;
            paymentList.push({
              mode: p.mode || paymentMode,
              amount: pAmt,
              accountId: p.accountId || accountId,
              tenderAmount: Number(p.tenderAmount || pAmt),
              changeReturned: Math.max(0, Number(p.tenderAmount || pAmt) - pAmt),
              reference: p.transactionRef || null,
            });
          }
        } else if (paymentMode === 'CREDIT' || paymentMode === 'KHATA') {
          // Khata / Customer credit sale: no immediate cash received at counter
          totalPaid = 0;
        } else {
          // Single payment mode
          const singleTender = Number(tenderAmount) > 0 ? Number(tenderAmount) : grandTotal;
          totalPaid = grandTotal;
          paymentList.push({
            mode: paymentMode,
            amount: grandTotal,
            accountId: accountId,
            tenderAmount: singleTender,
            changeReturned: Math.max(0, singleTender - grandTotal),
            reference: null,
          });
        }

        const balanceDue = round(Math.max(0, grandTotal - totalPaid));
        let paymentStatus = 'PAID';
        if (balanceDue > 0 && totalPaid > 0) {
          paymentStatus = 'PARTIAL';
        } else if (balanceDue > 0 && totalPaid === 0) {
          paymentStatus = 'UNPAID';
        }

        // 7. Save Sales Invoice Record (including loyalty snapshot)
        const [invResult] = await conn.query(`
          INSERT INTO sales_invoices (
            invoice_number, invoice_date, customer_id, cashier_id, status,
            subtotal, total_discount, loyalty_points_earned, loyalty_points_redeemed,
            loyalty_discount_amount, customer_points_before, customer_points_after,
            taxable_amount, cgst_amount, sgst_amount, igst_amount,
            total_tax, round_off, grand_total, amount_paid, balance_due,
            payment_status, payment_mode, notes, idempotency_key
          ) VALUES (?, NOW(), ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoiceNumber,
          customerId,
          cashierId,
          calculation.subtotal,
          round(calculation.totalDiscount + loyaltyDiscount),
          pointsEarned,
          actualPointsRedeemed,
          loyaltyDiscount,
          pointsBefore,
          pointsAfter,
          calculation.taxableAmount,
          calculation.cgstAmount,
          calculation.sgstAmount,
          calculation.igstAmount,
          calculation.totalTax,
          calculation.roundOff,
          grandTotal,
          totalPaid,
          balanceDue,
          paymentStatus,
          paymentMode,
          notes,
          idempotencyKey,
        ]);

        const invoiceId = invResult.insertId;

        // 8. Record Loyalty Transactions
        if (!isWalkIn) {
          if (actualPointsRedeemed > 0) {
            await conn.query(`
              INSERT INTO loyalty_transactions (
                customer_id, invoice_id, transaction_type, points, rupee_value, description
              ) VALUES (?, ?, 'REDEEM', ?, ?, ?)
            `, [
              customer.id,
              invoiceId,
              actualPointsRedeemed,
              loyaltyDiscount,
              `Redeemed ${actualPointsRedeemed} points (₹${loyaltyDiscount.toFixed(2)} discount) on invoice ${invoiceNumber}`,
            ]);
          }

          if (pointsEarned > 0) {
            await conn.query(`
              INSERT INTO loyalty_transactions (
                customer_id, invoice_id, transaction_type, points, rupee_value, description
              ) VALUES (?, ?, 'EARN', ?, ?, ?)
            `, [
              customer.id,
              invoiceId,
              pointsEarned,
              0.00,
              `Earned ${pointsEarned} loyalty point on invoice ${invoiceNumber}`,
            ]);
          }
        }

        // 9. Save Sales Invoice Items & Deduct Stock & Record Stock Movements
        for (const item of calculation.items) {
          // Snapshot item
          await conn.query(`
            INSERT INTO sales_invoice_items (
              invoice_id, product_id, item_name, barcode, hsn_code, unit_code,
              quantity, unit_price, mrp, discount_percent, discount_amount,
              taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount,
              total_tax, total_amount, returned_quantity
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `, [
            invoiceId,
            item.productId,
            item.itemName,
            item.barcode || null,
            item.hsnCode,
            item.unitCode,
            item.quantity,
            item.unitPrice,
            item.mrp,
            item.discountPercent,
            item.discountAmount,
            item.taxableAmount,
            item.gstRate,
            item.cgstAmount,
            item.sgstAmount,
            item.igstAmount,
            item.totalTax,
            item.totalAmount,
          ]);

          // Deduct stock from products table
          const remainingStock = round(item.currentStock - item.quantity, 3);
          await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [remainingStock, item.productId]);

          // Record stock movement
          await conn.query(`
            INSERT INTO stock_movements (
              product_id, movement_type, reference_type, reference_id,
              quantity, balance_after, notes, created_by_user_id
            ) VALUES (?, 'SALE', 'SALES_INVOICE', ?, ?, ?, ?, ?)
          `, [
            item.productId,
            invoiceId,
            -item.quantity,
            remainingStock,
            `Sale checkout invoice ${invoiceNumber}`,
            cashierId,
          ]);
        }

        // 8. Record Payments, Payment Allocations & Account Ledger Updates
        for (const pay of paymentList) {
          if (pay.amount > 0) {
            const paymentNumber = await generateDocumentNumber(conn, 'PAYMENT');

            const [payResult] = await conn.query(`
              INSERT INTO payments (
                payment_number, payment_date, reference_type, reference_id,
                customer_id, payment_mode, account_id, amount,
                tender_amount, change_returned, transaction_reference, notes,
                received_by_user_id
              ) VALUES (?, NOW(), 'SALES_INVOICE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              paymentNumber,
              invoiceId,
              customerId,
              pay.mode,
              pay.accountId,
              pay.amount,
              pay.tenderAmount,
              pay.changeReturned,
              pay.reference,
              `Payment for invoice ${invoiceNumber}`,
              cashierId,
            ]);

            const paymentId = payResult.insertId;

            // Payment Allocation
            await conn.query(`
              INSERT INTO payment_allocations (payment_id, invoice_type, invoice_id, allocated_amount)
              VALUES (?, 'SALE', ?, ?)
            `, [paymentId, invoiceId, pay.amount]);

            // Update Account Balance (Inflow: CREDIT)
            await conn.query(
              'UPDATE financial_accounts SET current_balance = current_balance + ? WHERE id = ?',
              [pay.amount, pay.accountId]
            );

            // Fetch new account balance for ledger snapshot
            const [accRow] = await conn.query('SELECT current_balance FROM financial_accounts WHERE id = ?', [pay.accountId]);
            const newBalance = accRow[0]?.current_balance || 0;

            const txnNumber = await generateDocumentNumber(conn, 'TRANSACTION');
            await conn.query(`
              INSERT INTO account_transactions (
                transaction_number, transaction_date, account_id, transaction_type,
                amount, balance_after, reference_type, reference_id, description,
                created_by_user_id
              ) VALUES (?, NOW(), ?, 'CREDIT', ?, ?, 'SALE_PAYMENT', ?, ?, ?)
            `, [
              txnNumber,
              pay.accountId,
              pay.amount,
              newBalance,
              invoiceId,
              `Received for Sale ${invoiceNumber} via ${pay.mode}`,
              cashierId,
            ]);
          }
        }

        // 9. If balance due > 0, update customer outstanding balance
        if (balanceDue > 0) {
          await conn.query(
            'UPDATE customers SET current_balance = current_balance + ? WHERE id = ?',
            [balanceDue, customerId]
          );
        }

        return {
          invoiceId,
          invoiceNumber,
          grandTotal,
          totalPaid,
          balanceDue,
          roundOff: calculation.roundOff,
          subtotal: calculation.subtotal,
          totalTax: calculation.totalTax,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          changeReturned: paymentList[0]?.changeReturned || 0,
          paymentStatus,
          itemCount: calculation.items.length,
          loyaltyPointsEarned: pointsEarned,
          loyaltyPointsRedeemed: actualPointsRedeemed,
          loyaltyDiscountAmount: loyaltyDiscount,
          customerPointsBefore: pointsBefore,
          customerPointsAfter: pointsAfter,
          loyalty: {
            pointsEarned,
            pointsRedeemed: actualPointsRedeemed,
            loyaltyDiscount,
            pointsBefore,
            pointsAfter,
          },
        };
      });

      return result;
    } finally {
      if (idempotencyKey) {
        releaseIdempotencyLock(idempotencyKey);
      }
    }
  }

  /**
   * Process a Sales Return and Refund
   */
  static async processSaleReturn({
    invoiceId,
    items, // [{ invoiceItemId, quantity, reason }]
    refundMode = 'CASH',
    accountId = 1,
    processedByUserId,
    userId,
    reason = 'Customer return',
  }) {
    const finalUserId = processedByUserId || userId || 1;
    return await withTransaction(async (conn) => {
      // 1. Fetch sales invoice
      const [invRows] = await conn.query('SELECT * FROM sales_invoices WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invRows || invRows.length === 0) {
        throw new Error('Sales invoice not found.');
      }
      const invoice = invRows[0];

      // 2. Fetch invoice items
      const [invItems] = await conn.query('SELECT * FROM sales_invoice_items WHERE invoice_id = ?', [invoiceId]);
      const itemMap = new Map();
      invItems.forEach((it) => itemMap.set(it.id, it));

      let returnSubtotal = 0;
      let returnTax = 0;
      let totalRefund = 0;
      const validatedReturnItems = [];

      for (const retItem of items) {
        const origItem = itemMap.get(retItem.invoiceItemId);
        if (!origItem) {
          throw new Error(`Invoice item ID ${retItem.invoiceItemId} not found.`);
        }

        const returnQty = Number(retItem.quantity);
        const alreadyReturned = Number(origItem.returned_quantity || 0);
        const maxReturnable = Number(origItem.quantity) - alreadyReturned;

        if (returnQty <= 0 || returnQty > maxReturnable) {
          throw new Error(
            `Invalid return quantity ${returnQty} for "${origItem.item_name}". Max returnable: ${maxReturnable}.`
          );
        }

        const proportion = returnQty / Number(origItem.quantity);
        const itemRefundAmount = round(Number(origItem.total_amount) * proportion);
        const itemTaxRefund = round(Number(origItem.total_tax) * proportion);
        const itemTaxableRefund = round(itemRefundAmount - itemTaxRefund);

        returnSubtotal += itemTaxableRefund;
        returnTax += itemTaxRefund;
        totalRefund += itemRefundAmount;

        validatedReturnItems.push({
          invoiceItemId: origItem.id,
          productId: origItem.product_id,
          quantity: returnQty,
          unitPrice: origItem.unit_price,
          gstRate: origItem.gst_rate,
          refundAmount: itemRefundAmount,
        });
      }

      totalRefund = round(totalRefund);
      const returnNumber = await generateDocumentNumber(conn, 'SALE_RETURN');

      // 3. Insert sales_returns record
      const [retResult] = await conn.query(`
        INSERT INTO sales_returns (
          return_number, return_date, invoice_id, customer_id,
          processed_by_user_id, return_subtotal, return_tax, refund_amount,
          refund_mode, reason
        ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        returnNumber,
        invoiceId,
        invoice.customer_id,
        finalUserId,
        round(returnSubtotal),
        round(returnTax),
        totalRefund,
        refundMode,
        'Customer return at counter',
      ]);

      const salesReturnId = retResult.insertId;

      // 4. Update returned_quantity, restore inventory stock and record movements
      for (const item of validatedReturnItems) {
        // Record return item
        await conn.query(`
          INSERT INTO sales_return_items (
            sales_return_id, invoice_item_id, product_id,
            quantity, unit_price, tax_rate, refund_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          salesReturnId,
          item.invoiceItemId,
          item.productId,
          item.quantity,
          item.unitPrice,
          item.gstRate,
          item.refundAmount,
        ]);

        // Update returned quantity on original invoice item
        await conn.query(
          'UPDATE sales_invoice_items SET returned_quantity = returned_quantity + ? WHERE id = ?',
          [item.quantity, item.invoiceItemId]
        );

        // Lock & update product stock (ADD back)
        const [pRows] = await conn.query('SELECT current_stock FROM products WHERE id = ? FOR UPDATE', [item.productId]);
        const newStock = round(Number(pRows[0]?.current_stock || 0) + item.quantity, 3);
        await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, item.productId]);

        // Record stock movement (SALE_RETURN)
        await conn.query(`
          INSERT INTO stock_movements (
            product_id, movement_type, reference_type, reference_id,
            quantity, balance_after, notes, created_by_user_id
          ) VALUES (?, 'SALE_RETURN', 'SALES_RETURN', ?, ?, ?, ?, ?)
        `, [
          item.productId,
          salesReturnId,
          item.quantity, // Positive addition
          newStock,
          `Return for Invoice ${invoice.invoice_number}`,
          finalUserId,
        ]);
      }

      // 5. If refund is Cash/Bank/UPI, record outflow from account
      if (totalRefund > 0 && refundMode !== 'STORE_CREDIT') {
        await conn.query(
          'UPDATE financial_accounts SET current_balance = current_balance - ? WHERE id = ?',
          [totalRefund, accountId]
        );

        const [accRow] = await conn.query('SELECT current_balance FROM financial_accounts WHERE id = ?', [accountId]);
        const newBalance = accRow[0]?.current_balance || 0;

        const txnNumber = await generateDocumentNumber(conn, 'TRANSACTION');
        await conn.query(`
          INSERT INTO account_transactions (
            transaction_number, transaction_date, account_id, transaction_type,
            amount, balance_after, reference_type, reference_id, description,
            created_by_user_id
          ) VALUES (?, NOW(), ?, 'DEBIT', ?, ?, 'SALE_REFUND', ?, ?, ?)
        `, [
          txnNumber,
          accountId,
          totalRefund,
          newBalance,
          salesReturnId,
          `Refund for Return ${returnNumber} (Inv ${invoice.invoice_number})`,
          finalUserId,
        ]);
      }

      // Check if all items in invoice are now returned
      const [sumReturned] = await conn.query(`
        SELECT 
          SUM(quantity) AS total_sold,
          SUM(returned_quantity) AS total_ret
        FROM sales_invoice_items
        WHERE invoice_id = ?
      `, [invoiceId]);

      if (Number(sumReturned[0]?.total_ret) >= Number(sumReturned[0]?.total_sold)) {
        await conn.query("UPDATE sales_invoices SET status = 'RETURNED' WHERE id = ?", [invoiceId]);
      }

      // 6. Reverse loyalty points if applicable (for registered customers)
      if (invoice.customer_id && invoice.customer_id !== 1) {
        const [existingRev] = await conn.query(
          "SELECT id FROM loyalty_transactions WHERE invoice_id = ? AND transaction_type = 'REVERSAL' LIMIT 1",
          [invoiceId]
        );

        if (!existingRev || existingRev.length === 0) {
          const earned = Number(invoice.loyalty_points_earned) || 0;
          const redeemed = Number(invoice.loyalty_points_redeemed) || 0;

          if (earned > 0) {
            await conn.query(
              'UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - ?) WHERE id = ?',
              [earned, invoice.customer_id]
            );
            await conn.query(`
              INSERT INTO loyalty_transactions (
                customer_id, invoice_id, transaction_type, points, rupee_value, description
              ) VALUES (?, ?, 'REVERSAL', ?, 0.00, ?)
            `, [
              invoice.customer_id,
              invoiceId,
              -earned,
              `Reversed ${earned} earned point(s) due to return/refund on invoice ${invoice.invoice_number}`,
            ]);
          }

          if (redeemed > 0) {
            await conn.query(
              'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
              [redeemed, invoice.customer_id]
            );
            await conn.query(`
              INSERT INTO loyalty_transactions (
                customer_id, invoice_id, transaction_type, points, rupee_value, description
              ) VALUES (?, ?, 'REVERSAL', ?, ?, ?)
            `, [
              invoice.customer_id,
              invoiceId,
              redeemed,
              Number(invoice.loyalty_discount_amount) || 0.00,
              `Restored ${redeemed} redeemed point(s) due to return/refund on invoice ${invoice.invoice_number}`,
            ]);
          }
        }
      }

      return {
        returnId: salesReturnId,
        returnNumber,
        refundAmount: totalRefund,
      };
    });
  }
}

export default SalesService;

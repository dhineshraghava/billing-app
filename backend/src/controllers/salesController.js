import { SalesService } from '../services/salesService.js';
import { query } from '../config/db.js';

export async function createSale(req, res, next) {
  try {
    const {
      customerId,
      items,
      billDiscountPercent,
      billDiscountAmount,
      redeemPoints,
      paymentMode,
      payments,
      tenderAmount,
      accountId,
      notes,
      idempotencyKey,
    } = req.body;

    const cashierId = req.user?.id || 1;

    const result = await SalesService.checkoutSale({
      customerId: customerId || 1,
      cashierId,
      items,
      billDiscountPercent,
      billDiscountAmount,
      redeemPoints: Number(redeemPoints) || 0,
      paymentMode: paymentMode || 'CASH',
      payments,
      tenderAmount,
      accountId: accountId || 1,
      notes,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: result.isDuplicateSubmission
        ? 'Duplicate submission detected. Returning existing invoice.'
        : 'Sale completed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSaleById(req, res, next) {
  try {
    const { id } = req.params;

    // Fetch invoice with customer and cashier details
    const invoices = await query(`
      SELECT 
        si.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address AS customer_address,
        c.gstin AS customer_gstin,
        u.full_name AS cashier_name,
        u.username AS cashier_username
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id
      WHERE si.id = ? OR si.invoice_number = ?
      LIMIT 1
    `, [id, id]);

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sales invoice not found.',
      });
    }

    const invoice = invoices[0];

    // Role check: Cashiers can only view their own invoices
    if ((req.user?.roleName === 'CASHIER' || req.user?.roleName === 'SALESPERSON') && invoice.cashier_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cashiers can only view their own sales invoices.',
      });
    }

    // Fetch line items snapshot
    const items = await query(`
      SELECT 
        sii.*,
        COALESCE(sii.barcode, p.barcode, '') AS barcode,
        p.sku
      FROM sales_invoice_items sii
      LEFT JOIN products p ON sii.product_id = p.id
      WHERE sii.invoice_id = ?
      ORDER BY sii.id ASC
    `, [invoice.id]);

    // Fetch payments
    const payments = await query(`
      SELECT 
        p.*,
        fa.account_name,
        fa.account_type
      FROM payments p
      LEFT JOIN financial_accounts fa ON p.account_id = fa.id
      WHERE p.reference_type = 'SALES_INVOICE' AND p.reference_id = ?
    `, [invoice.id]);

    // Fetch store business settings
    const settingsRows = await query('SELECT * FROM business_settings LIMIT 1');
    const settings = settingsRows && settingsRows.length > 0 ? settingsRows[0] : {};

    return res.json({
      success: true,
      data: {
        invoice,
        items,
        payments,
        store: settings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listSales(req, res, next) {
  try {
    const {
      search,
      status,
      paymentStatus,
      startDate,
      endDate,
      cashierId,
      customerId,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (search && search.trim()) {
      conditions.push('(si.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (status) {
      conditions.push('si.status = ?');
      params.push(status);
    }

    if (paymentStatus) {
      conditions.push('si.payment_status = ?');
      params.push(paymentStatus);
    }

    if (startDate) {
      conditions.push('DATE(si.invoice_date) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(si.invoice_date) <= ?');
      params.push(endDate);
    }

    // Role-based sales isolation: Cashiers / Salespersons can only view their own sales!
    if (req.user?.roleName === 'CASHIER' || req.user?.roleName === 'SALESPERSON') {
      conditions.push('si.cashier_id = ?');
      params.push(req.user.id);
    } else if (cashierId) {
      conditions.push('si.cashier_id = ?');
      params.push(cashierId);
    }

    if (customerId) {
      conditions.push('si.customer_id = ?');
      params.push(customerId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await query(`
      SELECT COUNT(*) AS total 
      FROM sales_invoices si 
      LEFT JOIN customers c ON si.customer_id = c.id 
      ${where}
    `, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT 
        si.id,
        si.invoice_number,
        si.invoice_date,
        si.status,
        si.grand_total,
        si.amount_paid,
        si.balance_due,
        si.payment_status,
        si.payment_mode,
        c.name AS customer_name,
        c.phone AS customer_phone,
        u.full_name AS cashier_name,
        (SELECT COUNT(*) FROM sales_invoice_items WHERE invoice_id = si.id) AS item_count
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id
      ${where}
      ORDER BY si.invoice_date DESC, si.id DESC
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

export async function processReturn(req, res, next) {
  try {
    const { id } = req.params;
    const { items, refundMode = 'CASH', accountId = 1 } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items selected for return.',
      });
    }

    const result = await SalesService.processSaleReturn({
      invoiceId: id,
      items,
      refundMode,
      accountId,
      processedByUserId: req.user?.id || 1,
    });

    return res.status(201).json({
      success: true,
      message: 'Sales return processed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

import { query } from '../config/db.js';

export async function listCustomers(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = ['is_active = 1'];

    if (search && search.trim()) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const [countRow] = await query(`SELECT COUNT(*) as total FROM customers ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT id, name, phone, email, address, gstin, state, state_code, credit_limit, current_balance, loyalty_points, created_at
      FROM customers
      ${where}
      ORDER BY id ASC
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

export async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;
    const [customer] = await query('SELECT * FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Recent invoices
    const recentInvoices = await query(
      'SELECT id, invoice_number, invoice_date, grand_total, amount_paid, balance_due, payment_status, loyalty_points_earned, loyalty_points_redeemed FROM sales_invoices WHERE customer_id = ? ORDER BY invoice_date DESC LIMIT 10',
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...customer,
        recentInvoices,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerByPhone(req, res, next) {
  try {
    const rawPhone = req.params.phone ? req.params.phone.trim() : '';
    if (!rawPhone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // Extract digits
    const digitsOnly = rawPhone.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Search exact match or matching last 10 digits
    const rows = await query(`
      SELECT id, name, phone, email, address, gstin, state, state_code, credit_limit, current_balance, loyalty_points, is_active
      FROM customers
      WHERE phone = ? OR phone LIKE ? OR phone LIKE ?
      LIMIT 1
    `, [rawPhone, `%${last10}`, `%${rawPhone}%`]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No customer found with phone number "${rawPhone}".`,
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerLoyaltyHistory(req, res, next) {
  try {
    const { id } = req.params;

    const [customer] = await query('SELECT id, name, phone, loyalty_points FROM customers WHERE id = ?', [id]);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    // Transactions list
    const transactions = await query(`
      SELECT 
        lt.id,
        lt.customer_id,
        lt.invoice_id,
        lt.transaction_type,
        lt.points,
        lt.rupee_value,
        lt.description,
        lt.created_at,
        si.invoice_number,
        si.grand_total AS invoice_total
      FROM loyalty_transactions lt
      LEFT JOIN sales_invoices si ON lt.invoice_id = si.id
      WHERE lt.customer_id = ?
      ORDER BY lt.created_at DESC, lt.id DESC
      LIMIT 100
    `, [id]);

    // Summary calculations
    const [summaryRow] = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'EARN' THEN points ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN transaction_type = 'REDEEM' THEN points ELSE 0 END), 0) AS total_redeemed,
        COALESCE(SUM(CASE WHEN transaction_type = 'REVERSAL' THEN points ELSE 0 END), 0) AS total_reversed
      FROM loyalty_transactions
      WHERE customer_id = ?
    `, [id]);

    return res.json({
      success: true,
      data: {
        customer,
        summary: {
          currentPoints: customer.loyalty_points || 0,
          totalEarned: Number(summaryRow?.total_earned) || 0,
          totalRedeemed: Number(summaryRow?.total_redeemed) || 0,
          totalReversed: Number(summaryRow?.total_reversed) || 0,
        },
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const { name, phone, email, address, gstin, state = 'Tamil Nadu', stateCode = '33', creditLimit = 0 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Customer name and phone number are required.' });
    }

    const cleanPhone = phone.trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;

    // Check if customer with this phone number already exists
    const existing = await query(`
      SELECT * FROM customers 
      WHERE phone = ? OR phone LIKE ? 
      LIMIT 1
    `, [cleanPhone, `%${last10}`]);

    if (existing && existing.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Existing customer found with this phone number.',
        data: existing[0],
        isExisting: true,
      });
    }

    const result = await query(`
      INSERT INTO customers (name, phone, email, address, gstin, state, state_code, credit_limit, current_balance, loyalty_points, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 0, 1)
    `, [name.trim(), cleanPhone, email || null, address || null, gstin || null, state, stateCode, creditLimit]);

    return res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      data: { id: result.insertId, name: name.trim(), phone: cleanPhone, loyalty_points: 0 },
      isExisting: false,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gstin, state, stateCode, creditLimit } = req.body;

    await query(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        gstin = COALESCE(?, gstin),
        state = COALESCE(?, state),
        state_code = COALESCE(?, state_code),
        credit_limit = COALESCE(?, credit_limit)
      WHERE id = ?
    `, [name, phone, email, address, gstin, state, stateCode, creditLimit, id]);

    return res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (error) {
    next(error);
  }
}

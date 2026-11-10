import { query } from '../config/db.js';

export async function listSuppliers(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = ['is_active = 1'];

    if (search && search.trim()) {
      conditions.push('(name LIKE ? OR company_name LIKE ? OR phone LIKE ? OR gstin LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const [countRow] = await query(`SELECT COUNT(*) as total FROM suppliers ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT id, name, company_name, phone, email, address, gstin, state, state_code, current_balance, created_at
      FROM suppliers
      ${where}
      ORDER BY company_name ASC
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

export async function getSupplierById(req, res, next) {
  try {
    const { id } = req.params;
    const [supplier] = await query('SELECT * FROM suppliers WHERE id = ?', [id]);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found.' });
    }

    const purchases = await query(
      'SELECT id, invoice_number, invoice_date, grand_total, amount_paid, balance_due, payment_status FROM purchase_invoices WHERE supplier_id = ? ORDER BY invoice_date DESC LIMIT 10',
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...supplier,
        purchases,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createSupplier(req, res, next) {
  try {
    const { name, companyName, phone, email, address, gstin, state = 'Tamil Nadu', stateCode = '33' } = req.body;

    if (!name || !companyName || !phone) {
      return res.status(400).json({ success: false, message: 'Contact name, company name, and phone are required.' });
    }

    const result = await query(`
      INSERT INTO suppliers (name, company_name, phone, email, address, gstin, state, state_code, current_balance, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.00, 1)
    `, [name.trim(), companyName.trim(), phone.trim(), email || null, address || null, gstin || null, state, stateCode]);

    return res.status(201).json({
      success: true,
      message: 'Supplier added successfully.',
      data: { id: result.insertId, companyName },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSupplier(req, res, next) {
  try {
    const { id } = req.params;
    const { name, companyName, phone, email, address, gstin, state, stateCode } = req.body;

    await query(`
      UPDATE suppliers SET
        name = COALESCE(?, name),
        company_name = COALESCE(?, company_name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        gstin = COALESCE(?, gstin),
        state = COALESCE(?, state),
        state_code = COALESCE(?, state_code)
      WHERE id = ?
    `, [name, companyName, phone, email, address, gstin, state, stateCode, id]);

    return res.json({ success: true, message: 'Supplier updated successfully.' });
  } catch (error) {
    next(error);
  }
}

import { query } from '../config/db.js';

export async function listCategories(req, res, next) {
  try {
    const rows = await query('SELECT * FROM categories WHERE is_active = 1 ORDER BY name ASC');
    return res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const result = await query(
      'INSERT INTO categories (name, description, is_active) VALUES (?, ?, 1)',
      [name.trim(), description || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      data: { id: result.insertId, name: name.trim() },
    });
  } catch (error) {
    next(error);
  }
}

export async function listUnits(req, res, next) {
  try {
    const rows = await query('SELECT * FROM units WHERE is_active = 1 ORDER BY id ASC');
    return res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

export async function createUnit(req, res, next) {
  try {
    const { name, shortCode, allowsDecimal = false } = req.body;
    if (!name || !shortCode) {
      return res.status(400).json({ success: false, message: 'Unit name and short code are required.' });
    }

    const result = await query(
      'INSERT INTO units (name, short_code, allows_decimal, is_active) VALUES (?, ?, ?, 1)',
      [name.trim(), shortCode.trim().toUpperCase(), allowsDecimal ? 1 : 0]
    );

    return res.status(201).json({
      success: true,
      message: 'Unit created successfully.',
      data: { id: result.insertId, name, shortCode },
    });
  } catch (error) {
    next(error);
  }
}

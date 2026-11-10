import { query, withTransaction } from '../config/db.js';

export async function getInventorySummary(req, res, next) {
  try {
    const [row] = await query(`
      SELECT 
        COUNT(*) as totalProducts,
        COALESCE(SUM(current_stock), 0) as totalUnits,
        COALESCE(SUM(current_stock * purchase_price), 0) as valuationCost,
        COALESCE(SUM(current_stock * selling_price), 0) as valuationRetail,
        COALESCE(SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END), 0) as outOfStockCount,
        COALESCE(SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_qty THEN 1 ELSE 0 END), 0) as lowStockCount
      FROM products
      WHERE is_active = 1
    `);

    const valuationCost = Number(row?.valuationCost || 0);
    const valuationRetail = Number(row?.valuationRetail || 0);
    const potentialProfit = Math.max(0, valuationRetail - valuationCost);

    return res.json({
      success: true,
      data: {
        totalProducts: Number(row?.totalProducts || 0),
        totalUnits: Number(row?.totalUnits || 0),
        valuationCost,
        valuationRetail,
        potentialProfit,
        outOfStockCount: Number(row?.outOfStockCount || 0),
        lowStockCount: Number(row?.lowStockCount || 0),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInventory(req, res, next) {
  try {
    const { search, categoryId, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = ['p.is_active = 1'];

    if (search && search.trim()) {
      conditions.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countRow] = await query(`SELECT COUNT(*) as total FROM products p ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sku,
        c.name AS category_name,
        u.short_code AS unit_code,
        u.allows_decimal,
        p.purchase_price,
        p.selling_price,
        p.current_stock,
        p.min_stock_qty,
        (p.current_stock * p.purchase_price) AS stock_valuation,
        CASE 
          WHEN p.current_stock <= 0 THEN 'OUT_OF_STOCK'
          WHEN p.current_stock <= p.min_stock_qty THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      ${where}
      ORDER BY p.current_stock ASC
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

export async function getLowStockProducts(req, res, next) {
  try {
    const rows = await query(`
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sku,
        c.name AS category_name,
        u.short_code AS unit_code,
        p.current_stock,
        p.min_stock_qty,
        p.purchase_price,
        p.selling_price,
        GREATEST(10, (p.min_stock_qty * 2) - p.current_stock) AS suggested_reorder_qty,
        (SELECT s.name FROM purchase_items pi 
         JOIN purchase_invoices pinv ON pi.purchase_invoice_id = pinv.id 
         JOIN suppliers s ON pinv.supplier_id = s.id 
         WHERE pi.product_id = p.id ORDER BY pinv.invoice_date DESC LIMIT 1) AS last_supplier_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.is_active = 1 AND p.current_stock <= p.min_stock_qty
      ORDER BY p.current_stock ASC
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getStockMovements(req, res, next) {
  try {
    const { productId, movementType, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (productId) {
      conditions.push('sm.product_id = ?');
      params.push(productId);
    }

    if (movementType) {
      conditions.push('sm.movement_type = ?');
      params.push(movementType);
    }

    if (startDate) {
      conditions.push('DATE(sm.created_at) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(sm.created_at) <= ?');
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await query(`SELECT COUNT(*) as total FROM stock_movements sm ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT 
        sm.id,
        sm.product_id,
        p.name AS product_name,
        p.barcode,
        u.short_code AS unit_code,
        sm.movement_type,
        sm.reference_type,
        sm.reference_id,
        sm.quantity,
        sm.balance_after,
        sm.notes,
        usr.full_name AS created_by_name,
        sm.created_at
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN units u ON p.unit_id = u.id
      LEFT JOIN users usr ON sm.created_by_user_id = usr.id
      ${where}
      ORDER BY sm.created_at DESC, sm.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), offset);
    const movements = await query(dataSql, params);

    return res.json({
      success: true,
      data: movements,
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

export async function createStockAdjustment(req, res, next) {
  try {
    const { productId, adjustmentType, quantity, notes } = req.body;
    // adjustmentType: 'ADD' (e.g. found stock) or 'SUBTRACT' (e.g. damaged, expired, stolen)
    const qty = Number(quantity);

    if (!productId || !adjustmentType || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid productId, adjustmentType (ADD/SUBTRACT), and positive quantity are required.',
      });
    }

    const result = await withTransaction(async (conn) => {
      // Lock product row
      const [rows] = await conn.query('SELECT id, current_stock, name FROM products WHERE id = ? FOR UPDATE', [productId]);
      if (!rows || rows.length === 0) {
        throw new Error('Product not found.');
      }

      const product = rows[0];
      const currentStock = Number(product.current_stock);
      const deltaQty = adjustmentType === 'ADD' ? qty : -qty;
      const newStock = currentStock + deltaQty;

      if (newStock < 0) {
        throw new Error(`Insufficient stock. Current stock is ${currentStock}, cannot deduct ${qty}.`);
      }

      // Update product current_stock
      await conn.query('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, productId]);

      // Record stock movement
      const [movResult] = await conn.query(`
        INSERT INTO stock_movements (
          product_id, movement_type, reference_type, reference_id,
          quantity, balance_after, notes, created_by_user_id
        ) VALUES (?, 'ADJUSTMENT', 'MANUAL_ADJUSTMENT', NULL, ?, ?, ?, ?)
      `, [productId, deltaQty, newStock, notes || `Manual stock adjustment (${adjustmentType})`, req.user?.id || 1]);

      return {
        productId,
        productName: product.name,
        previousStock: currentStock,
        adjustment: deltaQty,
        newStock,
        movementId: movResult.insertId,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Stock adjusted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

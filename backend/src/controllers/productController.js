import { query, withTransaction } from '../config/db.js';

export async function listProducts(req, res, next) {
  try {
    const {
      search,
      categoryId,
      stockStatus,
      isActive,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (search && search.trim()) {
      conditions.push('(p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ? OR p.hsn_code LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (stockStatus === 'low') {
      conditions.push('p.current_stock <= p.min_stock_qty AND p.current_stock > 0');
    } else if (stockStatus === 'out') {
      conditions.push('p.current_stock <= 0');
    }

    if (isActive !== undefined && isActive !== '') {
      conditions.push('p.is_active = ?');
      params.push(isActive === 'true' || isActive === '1' ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total records
    const countSql = `SELECT COUNT(*) AS total FROM products p ${whereClause}`;
    const [countResult] = await query(countSql, params);
    const totalRecords = countResult?.total || 0;

    // Fetch records with Category and Unit names
    const dataSql = `
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.unit_id,
        u.name AS unit_name,
        u.short_code AS unit_code,
        u.allows_decimal,
        p.hsn_code,
        p.purchase_price,
        p.selling_price,
        p.mrp,
        p.gst_rate,
        p.is_tax_inclusive,
        p.discount_percent,
        p.current_stock,
        p.min_stock_qty,
        p.batch_tracking_enabled,
        p.is_active,
        p.image_url,
        p.created_at,
        p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      ${whereClause}
      ORDER BY p.name ASC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), offset);
    const products = await query(dataSql, params);

    return res.json({
      success: true,
      data: products,
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

export async function getProductById(req, res, next) {
  try {
    const { id } = req.params;
    const rows = await query(`
      SELECT 
        p.*,
        c.name AS category_name,
        u.name AS unit_name,
        u.short_code AS unit_code,
        u.allows_decimal
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.id = ? LIMIT 1
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
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

export async function getProductByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;
    const rows = await query(`
      SELECT 
        p.id,
        p.name,
        p.barcode,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.unit_id,
        u.name AS unit_name,
        u.short_code AS unit_code,
        u.allows_decimal,
        p.hsn_code,
        p.purchase_price,
        p.selling_price,
        p.mrp,
        p.gst_rate,
        p.is_tax_inclusive,
        p.discount_percent,
        p.current_stock,
        p.min_stock_qty,
        p.is_active,
        p.image_url
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE (p.barcode = ? OR p.sku = ?)
      LIMIT 1
    `, [barcode.trim(), barcode.trim()]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Product with barcode or SKU "${barcode}" not found.`,
      });
    }

    const product = rows[0];
    if (!product.is_active) {
      return res.status(400).json({
        success: false,
        message: `Product "${product.name}" is inactive/deactivated and cannot be billed.`,
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const {
      name,
      barcode,
      sku,
      categoryId,
      unitId,
      hsnCode = '2106',
      purchasePrice = 0,
      sellingPrice = 0,
      mrp = 0,
      gstRate = 0,
      isTaxInclusive = true,
      discountPercent = 0,
      openingStock = 0,
      minStockQty = 5,
      batchTrackingEnabled = false,
      imageUrl = null,
    } = req.body;

    if (!name || !barcode || !categoryId || !unitId) {
      return res.status(400).json({
        success: false,
        message: 'Product name, barcode, category, and unit are required fields.',
      });
    }

    // Atomic insert of product and stock movement
    const createdProduct = await withTransaction(async (conn) => {
      // Check if barcode already exists
      const [existing] = await conn.query('SELECT id FROM products WHERE barcode = ?', [barcode.trim()]);
      if (existing.length > 0) {
        throw new Error(`A product with barcode "${barcode}" already exists.`);
      }

      const generatedSku = sku && sku.trim() ? sku.trim() : `SKU-${Date.now().toString().slice(-6)}`;

      const [insertResult] = await conn.query(`
        INSERT INTO products (
          name, barcode, sku, category_id, unit_id, hsn_code,
          purchase_price, selling_price, mrp, gst_rate, is_tax_inclusive,
          discount_percent, current_stock, min_stock_qty, batch_tracking_enabled,
          is_active, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [
        name.trim(),
        barcode.trim(),
        generatedSku,
        categoryId,
        unitId,
        hsnCode,
        purchasePrice,
        sellingPrice,
        mrp || sellingPrice,
        gstRate,
        isTaxInclusive ? 1 : 0,
        discountPercent,
        openingStock,
        minStockQty,
        batchTrackingEnabled ? 1 : 0,
        imageUrl,
      ]);

      const productId = insertResult.insertId;

      // If initial opening stock > 0, log it in stock movements
      if (Number(openingStock) > 0) {
        await conn.query(`
          INSERT INTO stock_movements (
            product_id, movement_type, reference_type, reference_id,
            quantity, balance_after, notes, created_by_user_id
          ) VALUES (?, 'OPENING', 'INITIAL_ENTRY', ?, ?, ?, 'Opening stock on product creation', ?)
        `, [productId, productId, openingStock, openingStock, req.user?.id || 1]);
      }

      return { id: productId, name, barcode };
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: createdProduct,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      barcode,
      sku,
      categoryId,
      unitId,
      hsnCode,
      purchasePrice,
      sellingPrice,
      mrp,
      gstRate,
      isTaxInclusive,
      discountPercent,
      minStockQty,
      batchTrackingEnabled,
      imageUrl,
    } = req.body;

    const [existing] = await query('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Check barcode conflict with other products
    if (barcode) {
      const [conflict] = await query('SELECT id FROM products WHERE barcode = ? AND id != ?', [barcode.trim(), id]);
      if (conflict && conflict.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Barcode "${barcode}" is already used by another product.`,
        });
      }
    }

    await query(`
      UPDATE products SET
        name = COALESCE(?, name),
        barcode = COALESCE(?, barcode),
        sku = COALESCE(?, sku),
        category_id = COALESCE(?, category_id),
        unit_id = COALESCE(?, unit_id),
        hsn_code = COALESCE(?, hsn_code),
        purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price),
        mrp = COALESCE(?, mrp),
        gst_rate = COALESCE(?, gst_rate),
        is_tax_inclusive = COALESCE(?, is_tax_inclusive),
        discount_percent = COALESCE(?, discount_percent),
        min_stock_qty = COALESCE(?, min_stock_qty),
        batch_tracking_enabled = COALESCE(?, batch_tracking_enabled),
        image_url = COALESCE(?, image_url)
      WHERE id = ?
    `, [
      name ? name.trim() : null,
      barcode ? barcode.trim() : null,
      sku ? sku.trim() : null,
      categoryId || null,
      unitId || null,
      hsnCode || null,
      purchasePrice !== undefined ? purchasePrice : null,
      sellingPrice !== undefined ? sellingPrice : null,
      mrp !== undefined ? mrp : null,
      gstRate !== undefined ? gstRate : null,
      isTaxInclusive !== undefined ? (isTaxInclusive ? 1 : 0) : null,
      discountPercent !== undefined ? discountPercent : null,
      minStockQty !== undefined ? minStockQty : null,
      batchTrackingEnabled !== undefined ? (batchTrackingEnabled ? 1 : 0) : null,
      imageUrl !== undefined ? imageUrl : null,
      id,
    ]);

    return res.json({
      success: true,
      message: 'Product updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProductStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: 'isActive status is required.',
      });
    }

    await query('UPDATE products SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, id]);

    return res.json({
      success: true,
      message: `Product ${isActive ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function exportProductsCsv(req, res, next) {
  try {
    const products = await query(`
      SELECT 
        p.id, p.name, p.brand, p.barcode, p.sku, c.name AS category_name, u.short_code AS unit_code,
        p.hsn_code, p.purchase_price, p.selling_price, p.mrp, p.gst_rate,
        p.is_tax_inclusive, p.discount_percent, p.current_stock, p.min_stock_qty, p.expiry_date
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `);

    const headers = [
      'Barcode', 'Product Name', 'Brand', 'SKU', 'Category', 'Unit', 'HSN Code',
      'Purchase Price', 'Selling Price', 'MRP', 'GST Rate %', 'Tax Inclusive',
      'Discount %', 'Current Stock', 'Min Stock', 'Expiry Date'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const p of products) {
      csvRows.push([
        escapeCsv(p.barcode),
        escapeCsv(p.name),
        escapeCsv(p.brand || ''),
        escapeCsv(p.sku || ''),
        escapeCsv(p.category_name || ''),
        escapeCsv(p.unit_code || 'PCS'),
        escapeCsv(p.hsn_code || ''),
        escapeCsv(p.purchase_price),
        escapeCsv(p.selling_price),
        escapeCsv(p.mrp),
        escapeCsv(p.gst_rate),
        escapeCsv(p.is_tax_inclusive ? 'YES' : 'NO'),
        escapeCsv(p.discount_percent || 0),
        escapeCsv(p.current_stock),
        escapeCsv(p.min_stock_qty),
        escapeCsv(p.expiry_date ? new Date(p.expiry_date).toISOString().split('T')[0] : '')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="supermart_products.csv"');
    return res.status(200).send(csvRows.join('\r\n'));
  } catch (error) {
    next(error);
  }
}

export async function importProductsJson(req, res, next) {
  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Products array is required.' });
    }

    const categories = await query('SELECT id, name FROM categories');
    const units = await query('SELECT id, short_code FROM units');
    const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const unitMap = new Map(units.map(u => [u.short_code.toUpperCase(), u.id]));
    const defaultCatId = categories[0]?.id || 1;
    const defaultUnitId = units[0]?.id || 1;

    let importedCount = 0;
    let updatedCount = 0;

    await withTransaction(async (conn) => {
      for (const item of products) {
        if (!item.name || !item.barcode) continue;
        const barcode = String(item.barcode).trim();
        const catId = item.category ? (catMap.get(String(item.category).toLowerCase()) || defaultCatId) : defaultCatId;
        const unitId = item.unit ? (unitMap.get(String(item.unit).toUpperCase()) || defaultUnitId) : defaultUnitId;
        const purchasePrice = Number(item.purchasePrice) || 0;
        const sellingPrice = Number(item.sellingPrice) || 0;
        const mrp = Number(item.mrp) || sellingPrice;
        const gstRate = Number(item.gstRate) || 0;
        const currentStock = Number(item.currentStock) || 0;
        const minStock = Number(item.minStock) || 5;
        const brand = item.brand || null;
        const hsnCode = item.hsnCode || '2106';

        const [existing] = await conn.query('SELECT id FROM products WHERE barcode = ?', [barcode]);
        if (existing && existing.length > 0) {
          await conn.query(`
            UPDATE products SET 
              name = ?, brand = ?, category_id = ?, unit_id = ?, purchase_price = ?,
              selling_price = ?, mrp = ?, gst_rate = ?, hsn_code = ?, min_stock_qty = ?
            WHERE id = ?
          `, [item.name, brand, catId, unitId, purchasePrice, sellingPrice, mrp, gstRate, hsnCode, minStock, existing[0].id]);
          updatedCount++;
        } else {
          const sku = item.sku || `SKU-${Date.now().toString().slice(-6)}-${Math.floor(Math.random()*1000)}`;
          const [ins] = await conn.query(`
            INSERT INTO products (
              name, brand, barcode, sku, category_id, unit_id, hsn_code,
              purchase_price, selling_price, mrp, gst_rate, current_stock, min_stock_qty, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          `, [item.name, brand, barcode, sku, catId, unitId, hsnCode, purchasePrice, sellingPrice, mrp, gstRate, currentStock, minStock]);
          
          if (currentStock > 0) {
            await conn.query(`
              INSERT INTO stock_movements (
                product_id, movement_type, reference_type, quantity, balance_after, notes
              ) VALUES (?, 'OPENING', 'INITIAL_IMPORT', ?, ?, 'Opening stock from CSV import')
            `, [ins.insertId, currentStock, currentStock]);
          }
          importedCount++;
        }
      }
    });

    return res.json({
      success: true,
      message: `Successfully processed: ${importedCount} added, ${updatedCount} updated.`,
      data: { importedCount, updatedCount },
    });
  } catch (error) {
    next(error);
  }
}

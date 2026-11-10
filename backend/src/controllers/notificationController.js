import { query } from '../config/db.js';

export async function getNotifications(req, res, next) {
  try {
    const alerts = [];

    // 1. Out of stock items
    const outOfStock = await query(`
      SELECT id, name, barcode, current_stock, min_stock_qty 
      FROM products 
      WHERE is_active = 1 AND current_stock <= 0
      ORDER BY name ASC
      LIMIT 10
    `);
    outOfStock.forEach(item => {
      alerts.push({
        id: `out-of-stock-${item.id}`,
        type: 'DANGER',
        title: 'Out of Stock Alert',
        message: `"${item.name}" is completely out of stock (0 remaining).`,
        link: '/inventory',
        createdAt: new Date().toISOString(),
      });
    });

    // 2. Low stock items
    const lowStock = await query(`
      SELECT id, name, barcode, current_stock, min_stock_qty 
      FROM products 
      WHERE is_active = 1 AND current_stock > 0 AND current_stock <= min_stock_qty
      ORDER BY current_stock ASC
      LIMIT 10
    `);
    lowStock.forEach(item => {
      alerts.push({
        id: `low-stock-${item.id}`,
        type: 'WARNING',
        title: 'Low Stock Warning',
        message: `"${item.name}" is running low (${item.current_stock} left, min: ${item.min_stock_qty}).`,
        link: '/inventory',
        createdAt: new Date().toISOString(),
      });
    });

    // 3. Expiring products (within 45 days)
    const expiring = await query(`
      SELECT id, name, barcode, expiry_date, current_stock 
      FROM products 
      WHERE is_active = 1 AND expiry_date IS NOT NULL AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL 45 DAY)
      ORDER BY expiry_date ASC
      LIMIT 10
    `);
    expiring.forEach(item => {
      alerts.push({
        id: `expiring-${item.id}`,
        type: 'WARNING',
        title: 'Expiry Notice',
        message: `"${item.name}" expires soon on ${new Date(item.expiry_date).toLocaleDateString()}.`,
        link: '/products',
        createdAt: new Date().toISOString(),
      });
    });

    // 4. Pending Supplier Payables
    const [supplierPayable] = await query(`
      SELECT COUNT(id) AS count, COALESCE(SUM(current_balance), 0) AS total_due 
      FROM suppliers 
      WHERE current_balance > 0
    `);
    if (supplierPayable && supplierPayable.count > 0 && Number(supplierPayable.total_due) > 0) {
      alerts.push({
        id: 'supplier-payable',
        type: 'INFO',
        title: 'Pending Supplier Payments',
        message: `₹${Number(supplierPayable.total_due).toFixed(2)} payable across ${supplierPayable.count} supplier(s).`,
        link: '/suppliers',
        createdAt: new Date().toISOString(),
      });
    }

    // 5. Customer Outstanding Khata / Credit
    const [customerCredit] = await query(`
      SELECT COUNT(id) AS count, COALESCE(SUM(current_balance), 0) AS total_due 
      FROM customers 
      WHERE current_balance > 0
    `);
    if (customerCredit && customerCredit.count > 0 && Number(customerCredit.total_due) > 0) {
      alerts.push({
        id: 'customer-credit',
        type: 'INFO',
        title: 'Customer Credit Receivables',
        message: `₹${Number(customerCredit.total_due).toFixed(2)} due from ${customerCredit.count} customer(s).`,
        link: '/customers',
        createdAt: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      data: {
        totalAlerts: alerts.length,
        unreadCount: alerts.length,
        alerts,
      },
    });
  } catch (error) {
    next(error);
  }
}


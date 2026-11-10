import { query } from '../config/db.js';

export async function getDashboardSummary(req, res, next) {
  try {
    // 1. Today's sales & bill count
    const [todaySales] = await query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) AS total_amount,
        COALESCE(SUM(taxable_amount), 0) AS taxable_amount,
        COALESCE(SUM(total_tax), 0) AS total_tax,
        COUNT(id) AS bill_count
      FROM sales_invoices
      WHERE DATE(invoice_date) = CURDATE() AND status = 'COMPLETED'
    `);

    // 2. Current Month's sales
    const [monthSales] = await query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) AS total_amount,
        COUNT(id) AS bill_count
      FROM sales_invoices
      WHERE YEAR(invoice_date) = YEAR(CURDATE()) 
        AND MONTH(invoice_date) = MONTH(CURDATE())
        AND status = 'COMPLETED'
    `);

    // 3. Products summary (total, low stock, out of stock)
    const [productStats] = await query(`
      SELECT 
        COUNT(id) AS total_products,
        COALESCE(SUM(CASE WHEN current_stock <= min_stock_qty AND current_stock > 0 THEN 1 ELSE 0 END), 0) AS low_stock_count,
        COALESCE(SUM(CASE WHEN current_stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count
      FROM products
      WHERE is_active = 1
    `);

    // 4. Today's Purchases
    const [todayPurchases] = await query(`
      SELECT 
        COALESCE(SUM(grand_total), 0) AS total_amount,
        COUNT(id) AS purchase_count
      FROM purchase_invoices
      WHERE DATE(invoice_date) = CURDATE() AND status = 'RECEIVED'
    `);

    // 5. Current Month Expenses
    const [monthExpenses] = await query(`
      SELECT 
        COALESCE(SUM(amount), 0) AS total_amount
      FROM expenses
      WHERE YEAR(expense_date) = YEAR(CURDATE()) 
        AND MONTH(expense_date) = MONTH(CURDATE())
    `);

    // 6. Cash and Bank Balances
    const [balances] = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN account_type = 'CASH' THEN current_balance ELSE 0 END), 0) AS cash_balance,
        COALESCE(SUM(CASE WHEN account_type = 'BANK' THEN current_balance ELSE 0 END), 0) AS bank_balance,
        COALESCE(SUM(CASE WHEN account_type = 'UPI' THEN current_balance ELSE 0 END), 0) AS upi_balance,
        COALESCE(SUM(current_balance), 0) AS total_liquid_balance
      FROM financial_accounts
      WHERE is_active = 1
    `);

    // 7. Gross Profit calculation for the month:
    // Gross Profit = Total Sales Taxable - Total Cost of Goods Sold for those sales
    const [profitStats] = await query(`
      SELECT 
        COALESCE(SUM(sii.taxable_amount), 0) AS sales_taxable,
        COALESCE(SUM(sii.quantity * p.purchase_price), 0) AS cogs
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.id
      JOIN products p ON sii.product_id = p.id
      WHERE YEAR(si.invoice_date) = YEAR(CURDATE()) 
        AND MONTH(si.invoice_date) = MONTH(CURDATE())
        AND si.status = 'COMPLETED'
    `);

    const salesTaxable = Number(profitStats?.sales_taxable || 0);
    const cogs = Number(profitStats?.cogs || 0);
    const grossProfit = Math.round((salesTaxable - cogs) * 100) / 100;

    return res.json({
      success: true,
      data: {
        todaySales: {
          totalAmount: Number(todaySales?.total_amount || 0),
          taxableAmount: Number(todaySales?.taxable_amount || 0),
          totalTax: Number(todaySales?.total_tax || 0),
          billCount: Number(todaySales?.bill_count || 0),
        },
        monthSales: {
          totalAmount: Number(monthSales?.total_amount || 0),
          billCount: Number(monthSales?.bill_count || 0),
        },
        products: {
          total: Number(productStats?.total_products || 0),
          lowStock: Number(productStats?.low_stock_count || 0),
          outOfStock: Number(productStats?.out_of_stock_count || 0),
        },
        todayPurchases: {
          totalAmount: Number(todayPurchases?.total_amount || 0),
          count: Number(todayPurchases?.purchase_count || 0),
        },
        monthExpenses: {
          totalAmount: Number(monthExpenses?.total_amount || 0),
        },
        financials: {
          cashBalance: Number(balances?.cash_balance || 0),
          bankBalance: Number(balances?.bank_balance || 0),
          upiBalance: Number(balances?.upi_balance || 0),
          totalLiquidBalance: Number(balances?.total_liquid_balance || 0),
          estimatedGrossProfit: grossProfit,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentSales(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const sales = await query(`
      SELECT 
        si.id,
        si.invoice_number,
        si.invoice_date,
        si.grand_total,
        si.amount_paid,
        si.balance_due,
        si.payment_status,
        si.payment_mode,
        si.status,
        c.name AS customer_name,
        c.phone AS customer_phone,
        u.full_name AS cashier_name
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id
      ORDER BY si.invoice_date DESC, si.id DESC
      LIMIT ?
    `, [limit]);

    return res.json({
      success: true,
      data: sales,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalesChartData(req, res, next) {
  try {
    const days = parseInt(req.query.days || '7', 10);

    // Group sales by date for the last N days
    const rows = await query(`
      SELECT 
        DATE_FORMAT(invoice_date, '%Y-%m-%d') AS date_label,
        DATE_FORMAT(invoice_date, '%d %b') AS display_date,
        COALESCE(SUM(grand_total), 0) AS total_sales,
        COALESCE(SUM(taxable_amount), 0) AS taxable_sales,
        COUNT(id) AS bill_count
      FROM sales_invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND status = 'COMPLETED'
      GROUP BY DATE_FORMAT(invoice_date, '%Y-%m-%d'), DATE_FORMAT(invoice_date, '%d %b')
      ORDER BY date_label ASC
    `, [days]);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTopSellingProducts(req, res, next) {
  try {
    const limit = parseInt(req.query.limit || '5', 10);
    const rows = await query(`
      SELECT 
        p.id,
        p.name,
        p.barcode,
        c.name AS category_name,
        COALESCE(SUM(sii.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(sii.total_amount), 0) AS total_revenue
      FROM sales_invoice_items sii
      JOIN sales_invoices si ON sii.invoice_id = si.id
      JOIN products p ON sii.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE si.status = 'COMPLETED'
        AND si.invoice_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY p.id, p.name, p.barcode, c.name
      ORDER BY total_quantity_sold DESC
      LIMIT ?
    `, [limit]);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

import { query } from '../config/db.js';

async function updateDbForPos() {
  try {
    console.log('--- Updating supermarket_db for POS Barcode & Walk-in Customer ---');

    // 1. Ensure Walk-in Customer (id: 1) has exact name 'Walk-in Customer' and phone '9999999999'
    await query(`
      UPDATE customers 
      SET name = 'Walk-in Customer', phone = '9999999999', is_active = 1 
      WHERE id = 1
    `);
    console.log('✓ Customer 1 updated to "Walk-in Customer" (9999999999)');

    // 2. Add barcode column to sales_invoice_items if missing
    const [cols] = await query("SHOW COLUMNS FROM sales_invoice_items LIKE 'barcode'");
    if (!cols || cols.length === 0) {
      await query("ALTER TABLE sales_invoice_items ADD COLUMN barcode VARCHAR(60) NULL AFTER item_name");
      console.log('✓ Added barcode column to sales_invoice_items');
      
      // Backfill barcode from products for existing items
      await query(`
        UPDATE sales_invoice_items sii
        JOIN products p ON sii.product_id = p.id
        SET sii.barcode = p.barcode
        WHERE sii.barcode IS NULL
      `);
      console.log('✓ Backfilled existing sales_invoice_items.barcode from products');
    } else {
      console.log('✓ barcode column already exists in sales_invoice_items');
    }

    // 3. Inspect Customer 1
    const [c1] = await query('SELECT id, name, phone, current_balance FROM customers WHERE id = 1');
    console.log('Customer 1:', c1);

    // 4. Sample product barcodes
    const prods = await query('SELECT id, name, barcode, selling_price, current_stock, is_active FROM products LIMIT 5');
    console.log('Sample products:', prods);

    console.log('POS DB Updates completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error during POS DB update:', err);
    process.exit(1);
  }
}

updateDbForPos();


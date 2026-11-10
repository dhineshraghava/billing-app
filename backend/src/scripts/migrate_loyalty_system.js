import { query } from '../config/db.js';

async function migrateLoyalty() {
  try {
    console.log('--- Starting Loyalty System Migration for supermarket_db ---');

    // 1. Create loyalty_transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        customer_id INT UNSIGNED NOT NULL,
        invoice_id INT UNSIGNED DEFAULT NULL,
        transaction_type ENUM('EARN', 'REDEEM', 'REVERSAL', 'ADJUSTMENT') NOT NULL,
        points INT NOT NULL,
        rupee_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_lt_customer (customer_id),
        KEY idx_lt_invoice (invoice_id),
        CONSTRAINT fk_lt_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        CONSTRAINT fk_lt_invoice FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ loyalty_transactions table verified/created');

    // 2. Add columns to sales_invoices if not exist
    const invCols = await query("SHOW COLUMNS FROM sales_invoices");
    const invColNames = invCols.map(c => c.Field);

    const colsToAddInv = [
      { name: 'loyalty_points_earned', sql: 'ADD COLUMN loyalty_points_earned INT NOT NULL DEFAULT 0 AFTER total_discount' },
      { name: 'loyalty_points_redeemed', sql: 'ADD COLUMN loyalty_points_redeemed INT NOT NULL DEFAULT 0 AFTER loyalty_points_earned' },
      { name: 'loyalty_discount_amount', sql: 'ADD COLUMN loyalty_discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER loyalty_points_redeemed' },
      { name: 'customer_points_before', sql: 'ADD COLUMN customer_points_before INT NOT NULL DEFAULT 0 AFTER loyalty_discount_amount' },
      { name: 'customer_points_after', sql: 'ADD COLUMN customer_points_after INT NOT NULL DEFAULT 0 AFTER customer_points_before' },
    ];

    for (const col of colsToAddInv) {
      if (!invColNames.includes(col.name)) {
        await query(`ALTER TABLE sales_invoices ${col.sql}`);
        console.log(`✓ Added column ${col.name} to sales_invoices`);
      } else {
        console.log(`✓ Column ${col.name} already exists in sales_invoices`);
      }
    }

    // 3. Add columns to business_settings if not exist
    const setCols = await query("SHOW COLUMNS FROM business_settings");
    const setColNames = setCols.map(c => c.Field);

    const colsToAddSettings = [
      { name: 'loyalty_enabled', sql: 'ADD COLUMN loyalty_enabled TINYINT(1) NOT NULL DEFAULT 1' },
      { name: 'loyalty_min_purchase', sql: 'ADD COLUMN loyalty_min_purchase DECIMAL(12,2) NOT NULL DEFAULT 100.00' },
      { name: 'loyalty_points_per_invoice', sql: 'ADD COLUMN loyalty_points_per_invoice INT NOT NULL DEFAULT 1' },
      { name: 'loyalty_redemption_rate', sql: 'ADD COLUMN loyalty_redemption_rate DECIMAL(12,2) NOT NULL DEFAULT 1.00' },
      { name: 'loyalty_redemption_enabled', sql: 'ADD COLUMN loyalty_redemption_enabled TINYINT(1) NOT NULL DEFAULT 1' },
    ];

    for (const col of colsToAddSettings) {
      if (!setColNames.includes(col.name)) {
        await query(`ALTER TABLE business_settings ${col.sql}`);
        console.log(`✓ Added column ${col.name} to business_settings`);
      } else {
        console.log(`✓ Column ${col.name} already exists in business_settings`);
      }
    }

    // 4. Update row 1 in business_settings with default loyalty values if null
    await query(`
      UPDATE business_settings SET
        loyalty_enabled = COALESCE(loyalty_enabled, 1),
        loyalty_min_purchase = COALESCE(loyalty_min_purchase, 100.00),
        loyalty_points_per_invoice = COALESCE(loyalty_points_per_invoice, 1),
        loyalty_redemption_rate = COALESCE(loyalty_redemption_rate, 1.00),
        loyalty_redemption_enabled = COALESCE(loyalty_redemption_enabled, 1)
      WHERE id = 1
    `);
    console.log('✓ business_settings default loyalty settings updated');

    // 5. Verify Walk-in Customer has 0 loyalty points
    await query(`UPDATE customers SET loyalty_points = 0 WHERE id = 1`);
    console.log('✓ Customer 1 (Walk-in Customer) loyalty_points set to 0');

    console.log('\n--- Migration finished successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateLoyalty();


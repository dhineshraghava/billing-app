import { query } from '../config/db.js';

async function migrate() {
  console.log('Running database upgrades...');

  try {
    // 1. Add ACCOUNTANT role
    await query(`
      INSERT INTO roles (id, name, display_name, description) 
      VALUES (5, 'ACCOUNTANT', 'Store Accountant', 'Accounts, ledger, expenses, GST & tax reports')
      ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)
    `);

    // 2. Add cashier_shifts table
    await query(`
      CREATE TABLE IF NOT EXISTS cashier_shifts (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        register_name VARCHAR(50) NOT NULL DEFAULT 'Counter 1',
        opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME DEFAULT NULL,
        opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        expected_cash DECIMAL(12,2) DEFAULT NULL,
        actual_cash DECIMAL(12,2) DEFAULT NULL,
        cash_difference DECIMAL(12,2) DEFAULT NULL,
        total_sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_bills_count INT UNSIGNED NOT NULL DEFAULT 0,
        total_cash_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_upi_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        total_card_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_shift_user (user_id),
        KEY idx_shift_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Add brand and expiry_date to products if not exists
    const cols = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
    `);
    const colNames = cols.map(c => c.COLUMN_NAME);

    if (!colNames.includes('brand')) {
      await query(`ALTER TABLE products ADD COLUMN brand VARCHAR(100) DEFAULT NULL AFTER name`);
      console.log('Added `brand` column to products table.');
    }

    if (!colNames.includes('expiry_date')) {
      await query(`ALTER TABLE products ADD COLUMN expiry_date DATE DEFAULT NULL AFTER min_stock_qty`);
      console.log('Added `expiry_date` column to products table.');
    }

    console.log('Database upgrades applied successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();


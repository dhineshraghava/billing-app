import { query } from '../config/db.js';

async function migrate() {
  try {
    console.log('Modifying payments.payment_mode ENUM to include CREDIT and KHATA...');
    await query(`
      ALTER TABLE payments 
      MODIFY COLUMN payment_mode ENUM('CASH','UPI','CARD','BANK_TRANSFER','CHEQUE','CREDIT','KHATA') NOT NULL DEFAULT 'CASH'
    `);
    console.log('payments.payment_mode updated successfully.');

    // Check if expenses.payment_mode needs it
    console.log('Checking column types...');
    const cols = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'supermarket_billing' AND COLUMN_NAME = 'payment_mode'
    `);
    console.log('Updated column definitions:', cols);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();


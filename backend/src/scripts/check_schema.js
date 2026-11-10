import { query } from '../config/db.js';

async function check() {
  try {
    const cols = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'supermarket_billing' AND COLUMN_NAME = 'payment_mode'
    `);
    console.log('PAYMENT_MODE COLUMNS:');
    console.log(JSON.stringify(cols, null, 2));

    const enumCols = await query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'supermarket_billing' AND DATA_TYPE = 'enum'
    `);
    console.log('ENUM COLUMNS IN DB:');
    console.log(JSON.stringify(enumCols, null, 2));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

check();


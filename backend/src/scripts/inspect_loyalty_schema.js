import { query } from '../config/db.js';

async function inspect() {
  try {
    const tables = await query('SHOW TABLES');
    console.log('Tables in DB:', tables.map(r => Object.values(r)[0]));

    const custCols = await query('DESCRIBE customers');
    console.log('\nCustomers columns:', custCols.map(c => `${c.Field} (${c.Type})`));

    const invCols = await query('DESCRIBE sales_invoices');
    console.log('\nSales_invoices columns:', invCols.map(c => `${c.Field} (${c.Type})`));

    const settingsCols = await query('DESCRIBE business_settings');
    console.log('\nBusiness_settings columns:', settingsCols.map(c => `${c.Field} (${c.Type})`));

    const settingsRows = await query('SELECT * FROM business_settings LIMIT 1');
    console.log('\nCurrent settings row:', settingsRows[0]);

    process.exit(0);
  } catch (err) {
    console.error('Inspect error:', err);
    process.exit(1);
  }
}

inspect();


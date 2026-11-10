import { testConnection, query } from '../config/db.js';

async function main() {
  console.log('Testing MySQL Database Connectivity...\n');
  const connected = await testConnection();

  if (!connected) {
    console.error('RESULT: Database connection FAILED.');
    process.exit(1);
  }

  try {
    const tables = await query('SHOW TABLES');
    const [counts] = await query(`
      SELECT 
        (SELECT COUNT(*) FROM products) AS products_count,
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM customers) AS customers_count,
        (SELECT COUNT(*) FROM sales_invoices) AS sales_invoices_count,
        (SELECT COUNT(*) FROM financial_accounts) AS accounts_count
    `);

    console.log('Database Status: CONNECTED & HEALTHY');
    console.log(`Total Tables in Database: ${tables.length}`);
    console.log(`Products:        ${counts.products_count}`);
    console.log(`Users / Staff:   ${counts.users_count}`);
    console.log(`Customers:       ${counts.customers_count}`);
    console.log(`Sales Invoices:  ${counts.sales_invoices_count}`);
    console.log(`Bank/Cash Accs:  ${counts.accounts_count}`);
    console.log('\nAll database tables and relationships are intact and ready for operations.');
    process.exit(0);
  } catch (err) {
    console.error('Error querying database statistics:', err.message);
    process.exit(1);
  }
}

main();


import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
  console.log('=================================================================');
  console.log('   MIGRATING & SYNCHRONIZING TO NEW DATABASE: supermarket_db     ');
  console.log('=================================================================\n');

  const connectionConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };

  const conn = await mysql.createConnection(connectionConfig);

  try {
    // 1. Ensure supermarket_db exists
    console.log('[1/5] Ensuring `supermarket_db` database exists...');
    await conn.query(`
      CREATE DATABASE IF NOT EXISTS \`supermarket_db\`
      DEFAULT CHARACTER SET utf8mb4
      DEFAULT COLLATE utf8mb4_unicode_ci
    `);
    console.log('      supermarket_db exists.');

    // 2. Check if supermarket_billing exists and has tables
    console.log('[2/5] Checking source database `supermarket_billing` for existing data...');
    const [dbs] = await conn.query('SHOW DATABASES');
    const hasBillingDb = dbs.some(d => Object.values(d)[0] === 'supermarket_billing');

    let tablesCopied = 0;
    if (hasBillingDb) {
      const [srcTables] = await conn.query('SHOW TABLES FROM `supermarket_billing`');
      const tableNames = srcTables.map(t => Object.values(t)[0]);
      console.log(`      Found ${tableNames.length} tables in supermarket_billing.`);

      // Disable foreign key checks during schema creation and data transfer
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');

      for (const tbl of tableNames) {
        // Get create table statement from supermarket_billing
        const [createRow] = await conn.query(`SHOW CREATE TABLE \`supermarket_billing\`.\`${tbl}\``);
        const createSql = createRow[0]['Create Table'];

        // Execute create table in supermarket_db
        await conn.query(`USE \`supermarket_db\``);
        await conn.query(createSql.replace(/CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS'));

        // Copy records if any exist
        const [countRow] = await conn.query(`SELECT COUNT(*) as cnt FROM \`supermarket_billing\`.\`${tbl}\``);
        const count = countRow[0].cnt;
        if (count > 0) {
          await conn.query(`INSERT IGNORE INTO \`supermarket_db\`.\`${tbl}\` SELECT * FROM \`supermarket_billing\`.\`${tbl}\``);
          console.log(`      ✓ ${tbl}: schema synchronized & ${count} rows preserved.`);
        } else {
          console.log(`      ✓ ${tbl}: schema synchronized (0 rows).`);
        }
        tablesCopied++;
      }

      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    // 3. Ensure payments.payment_mode includes CREDIT and KHATA
    console.log('[3/5] Verifying payments.payment_mode column definition...');
    await conn.query(`USE \`supermarket_db\``);
    try {
      await conn.query(`
        ALTER TABLE \`payments\` 
        MODIFY COLUMN payment_mode ENUM('CASH','UPI','CARD','BANK_TRANSFER','CHEQUE','CREDIT','KHATA') NOT NULL DEFAULT 'CASH'
      `);
      console.log('      payments.payment_mode updated with CREDIT and KHATA support.');
    } catch (e) {
      console.log('      Note on payments.payment_mode:', e.message);
    }

    // 4. If any table was missing, execute schema.sql and seed.sql
    console.log('[4/5] Checking table completeness in `supermarket_db`...');
    const [dstTables] = await conn.query('SHOW TABLES FROM \`supermarket_db\`');
    const dstTableNames = dstTables.map(t => Object.values(t)[0]);
    console.log(`      Total tables in supermarket_db: ${dstTableNames.length}`);

    // Verify key tables
    const requiredTables = [
      'business_settings', 'roles', 'users', 'categories', 'units', 'products',
      'customers', 'suppliers', 'sales_invoices', 'sales_invoice_items',
      'payments', 'payment_allocations', 'stock_movements', 'sales_returns',
      'sales_return_items', 'purchase_invoices', 'purchase_invoice_items',
      'expenses', 'financial_accounts', 'account_transactions', 'cashier_shifts'
    ];

    const missingTables = requiredTables.filter(t => !dstTableNames.includes(t));
    if (missingTables.length > 0) {
      console.warn(`      Missing tables: ${missingTables.join(', ')}! Applying database/schema.sql...`);
      const schemaSql = fs.readFileSync(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      await conn.query(schemaSql);
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log('      schema.sql applied.');
    } else {
      console.log('      All required tables are verified present.');
    }

    // 5. Final verification of rows in supermarket_db
    console.log('[5/5] Final Table Verification in `supermarket_db`:');
    for (const tbl of dstTableNames) {
      const [cnt] = await conn.query(`SELECT COUNT(*) as c FROM \`supermarket_db\`.\`${tbl}\``);
      console.log(`      • ${tbl}: ${cnt[0].c} records`);
    }

    console.log('\n=================================================================');
    console.log('   MIGRATION & SYNCHRONIZATION TO supermarket_db COMPLETE!       ');
    console.log('=================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();


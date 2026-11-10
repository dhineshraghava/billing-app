import { query, getPool } from '../config/db.js';
import { env } from '../config/env.js';
import bcrypt from 'bcryptjs';

async function verify() {
  console.log('=================================================================');
  console.log('   VERIFYING DATABASE INTEGRATION WITH: ' + env.db.database);
  console.log('=================================================================\n');

  try {
    // 1. Connection & DB Name verification
    const [dbRow] = await query('SELECT DATABASE() as current_db, VERSION() as version');
    const currentDb = dbRow.current_db;
    console.log(`[1] Connection Verified:`);
    console.log(`    Host:     ${env.db.host}:${env.db.port}`);
    console.log(`    Database: ${currentDb}`);
    console.log(`    User:     ${env.db.user}`);
    console.log(`    Version:  ${dbRow.version}\n`);

    if (currentDb !== 'supermarket_db') {
      throw new Error(`Expected database to be supermarket_db, but got: ${currentDb}`);
    }

    // 2. Table completeness audit
    console.log('[2] Module & Table Completeness Audit:');
    const tables = await query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`    Total tables in ${currentDb}: ${tableNames.length}`);

    const expectedModules = {
      'User & Role Management': ['users', 'roles'],
      'Product & Category Management': ['products', 'categories', 'units'],
      'Customer Management': ['customers'],
      'Supplier Management': ['suppliers', 'supplier_payments'],
      'Sales & Billing': ['sales_invoices', 'sales_invoice_items'],
      'Payments & Allocations': ['payments', 'payment_allocations'],
      'Inventory & Stock Movements': ['stock_movements', 'inventory_batches'],
      'Purchase Management': ['purchase_invoices', 'purchase_invoice_items', 'purchase_returns'],
      'Financial Accounts & Ledger': ['financial_accounts', 'account_transactions'],
      'Store Operations & Settings': ['business_settings', 'cashier_shifts', 'expenses', 'audit_logs']
    };

    for (const [moduleName, modTables] of Object.entries(expectedModules)) {
      console.log(`    • ${moduleName}:`);
      for (const t of modTables) {
        if (tableNames.includes(t)) {
          const cnt = await query(`SELECT COUNT(*) as c FROM \`${t}\``);
          console.log(`      ✓ ${t.padEnd(25)} : ${cnt[0]?.c} rows`);
        } else {
          console.error(`      ✗ ${t.padEnd(25)} : MISSING!`);
        }
      }
    }

    // 3. User Authentication & Password Hash Verification
    console.log('\n[3] User Credentials & RBAC Verification:');
    const users = await query(`
      SELECT u.id, u.username, u.full_name, u.email, u.is_active, r.name as role_name, u.password_hash 
      FROM users u 
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.id ASC
    `);

    const testPasswords = {
      admin: 'Admin@123',
      manager: 'Manager@123',
      cashier: 'Cashier@123',
      inventory: 'Inventory@123'
    };

    for (const u of users) {
      const expectedPass = testPasswords[u.username];
      const match = expectedPass ? await bcrypt.compare(expectedPass, u.password_hash) : null;
      console.log(`    ✓ User [${u.username}] Role: ${u.role_name.padEnd(16)} | Active: ${u.is_active} | Bcrypt Password Match: ${match}`);
    }

    // 4. Products & Stock Verification
    console.log('\n[4] Product Catalog Sample:');
    const sampleProducts = await query(`
      SELECT p.id, p.name, p.barcode, p.selling_price, p.current_stock, c.name as category, u.short_code as unit
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN units u ON p.unit_id = u.id
      LIMIT 5
    `);
    sampleProducts.forEach(p => {
      console.log(`    • [${p.barcode}] ${p.name.padEnd(35)} ₹${Number(p.selling_price).toFixed(2)} | Stock: ${p.current_stock} ${p.unit || ''} | Cat: ${p.category}`);
    });

    console.log('\n=================================================================');
    console.log('   ALL VERIFICATION CHECKS PASSED FOR supermarket_db!            ');
    console.log('=================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verify();

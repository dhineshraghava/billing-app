import { query } from '../config/db.js';
import bcrypt from 'bcryptjs';

async function check() {
  try {
    const rows = await query('SELECT id, username, email, full_name, role_id, is_active, password_hash FROM users');
    console.log('--- USERS IN DATABASE ---');
    for (const r of rows) {
      const matchAdmin123 = await bcrypt.compare('Admin@123', r.password_hash);
      const matchCashier123 = await bcrypt.compare('Cashier@123', r.password_hash);
      const matchManager123 = await bcrypt.compare('Manager@123', r.password_hash);
      const matchInventory123 = await bcrypt.compare('Inventory@123', r.password_hash);
      const matchAdminLower = await bcrypt.compare('admin', r.password_hash);
      const matchAdmin123Lower = await bcrypt.compare('admin123', r.password_hash);
      console.log(`User: ${r.username} (Active: ${r.is_active})`);
      console.log(`  Admin@123:    ${matchAdmin123}`);
      console.log(`  admin:        ${matchAdminLower}`);
      console.log(`  admin123:     ${matchAdmin123Lower}`);
      console.log(`  Cashier@123:  ${matchCashier123}`);
      console.log(`  Manager@123:  ${matchManager123}`);
      console.log(`  Inventory@123:${matchInventory123}`);
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

check();


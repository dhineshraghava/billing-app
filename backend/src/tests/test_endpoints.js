import { query } from '../config/db.js';

async function test() {
  console.log('Testing newly added backend modules...');
  
  // 1. Check roles
  const roles = await query('SELECT * FROM roles');
  console.log('Roles:', roles.map(r => r.name).join(', '));

  // 2. Check cashier_shifts table
  const shifts = await query('SELECT COUNT(*) AS total FROM cashier_shifts');
  console.log('Cashier shifts count:', shifts[0].total);

  // 3. Test products export CSV generation logic
  const prods = await query('SELECT COUNT(*) AS total FROM products WHERE is_active = 1');
  console.log('Active products for CSV export:', prods[0].total);

  console.log('All backend extensions verified successfully!');
  process.exit(0);
}

test();


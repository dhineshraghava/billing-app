import { query } from '../config/db.js';

async function updateRoles() {
  await query("UPDATE roles SET display_name = 'Salesperson / Cashier' WHERE name = 'CASHIER'");
  const roles = await query('SELECT * FROM roles');
  console.log('Roles updated successfully:', roles);
  process.exit(0);
}

updateRoles().catch(err => {
  console.error(err);
  process.exit(1);
});


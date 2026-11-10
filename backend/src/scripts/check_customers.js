import { query } from '../config/db.js';

async function check() {
  const custs = await query("SELECT * FROM customers");
  console.log('ALL CUSTOMERS:');
  console.log(custs);
  process.exit(0);
}

check();


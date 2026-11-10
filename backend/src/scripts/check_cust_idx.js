import { query } from '../config/db.js';

async function checkCustIndex() {
  const indexes = await query('SHOW INDEX FROM customers');
  console.log('Customers indexes:', indexes.map(i => ({ Key_name: i.Key_name, Column_name: i.Column_name, Non_unique: i.Non_unique })));
  process.exit(0);
}

checkCustIndex();


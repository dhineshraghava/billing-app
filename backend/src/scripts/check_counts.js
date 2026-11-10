import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkCounts() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: 'supermarket_billing',
  });

  try {
    const [tables] = await conn.query('SHOW TABLES');
    console.log('TABLE ROW COUNTS IN supermarket_billing:');
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [rows] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
      console.log(`  ${tableName}: ${rows[0].cnt} rows`);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

checkCounts();


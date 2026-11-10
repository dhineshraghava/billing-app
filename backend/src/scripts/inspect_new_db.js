import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function inspect() {
  console.log('Connecting to MySQL host:', process.env.DB_HOST, 'user:', process.env.DB_USER);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
  });

  try {
    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('ALL DATABASES:', dbs.map(d => Object.values(d)[0]));

    const hasNewDb = dbs.some(d => Object.values(d)[0] === 'supermarket_db');
    console.log('Does supermarket_db exist?:', hasNewDb);

    if (hasNewDb) {
      const [tables] = await conn.query('SHOW TABLES FROM `supermarket_db`');
      console.log('TABLES IN supermarket_db:', tables.map(t => Object.values(t)[0]));
    }

    const hasOldDb = dbs.some(d => Object.values(d)[0] === 'supermarket_billing');
    if (hasOldDb) {
      const [oldTables] = await conn.query('SHOW TABLES FROM `supermarket_billing`');
      console.log('TABLES IN supermarket_billing:', oldTables.map(t => Object.values(t)[0]));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.end();
  }
}

inspect();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('Connecting to MySQL to apply seed data...');
  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    multipleStatements: true,
  });

  try {
    const seedPath = path.resolve(__dirname, '../../../database/seed.sql');
    const sql = fs.readFileSync(seedPath, 'utf8');

    console.log(`Executing ${seedPath}...`);
    await connection.query(sql);
    console.log('Seed data inserted successfully!');
  } catch (err) {
    console.error('Failed to run seed script:', err.message);
  } finally {
    await connection.end();
  }
}

runSeed();

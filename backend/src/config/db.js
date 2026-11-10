import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool = null;
let isConnected = false;

/**
 * Initializes and returns the MySQL connection pool
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.database,
      waitForConnections: true,
      connectionLimit: env.db.connectionLimit,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      decimalNumbers: true, // Parse DECIMAL columns as numbers where appropriate or preserve string precision
      timezone: 'Z',
    });
  }
  return pool;
}

/**
 * Tests connection to MySQL on application startup with actionable diagnostics
 */
export async function testConnection() {
  const safeHost = `${env.db.host}:${env.db.port}`;
  const safeDatabase = env.db.database;
  const safeUser = env.db.user;

  try {
    const currentPool = getPool();
    const connection = await currentPool.getConnection();
    
    // Verify database version and connectivity
    const [rows] = await connection.query('SELECT VERSION() as version, DATABASE() as current_db');
    connection.release();

    isConnected = true;
    console.log('\n======================================================');
    console.log('  MySQL Database Connected Successfully!');
    console.log(`  Host:      ${safeHost}`);
    console.log(`  Database:  ${rows[0]?.current_db || safeDatabase}`);
    console.log(`  User:      ${safeUser}`);
    console.log(`  Version:   MySQL ${rows[0]?.version}`);
    console.log('======================================================\n');
    return true;
  } catch (error) {
    isConnected = false;
    console.error('\n******************************************************');
    console.error('  [DATABASE CONNECTION WARNING / ERROR]');
    console.error(`  Could not connect to MySQL at ${safeHost}`);
    console.error(`  Database: ${safeDatabase} | User: ${safeUser}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('  Reason: Connection refused. Is MySQL Server running on port 3306?');
      console.error('  Action: Open Services (services.msc) and ensure "MySQL80" is Running,');
      console.error('          or verify DB_HOST and DB_PORT in your backend .env file.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  Reason: Access denied (invalid username or password).');
      console.error('  Action: Check DB_USER and DB_PASSWORD in backend/.env.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`  Reason: Database "${safeDatabase}" does not exist.`);
      console.error('  Action: Open MySQL Workbench and run database/schema.sql to create it.');
    } else {
      console.error(`  Error Code: ${error.code || 'UNKNOWN'}`);
      console.error(`  Message:    ${error.message}`);
    }
    console.error('******************************************************\n');
    return false;
  }
}

/**
 * Returns the current database connection status
 */
export function isDbConnected() {
  return isConnected;
}

/**
 * Helper to run queries with parameter binding
 */
export async function query(sql, params = []) {
  const currentPool = getPool();
  const [results] = await currentPool.execute(sql, params);
  return results;
}

/**
 * Helper to execute a function inside an isolated MySQL transaction
 * Automatically commits on success and rolls back on failure
 */
export async function withTransaction(callback) {
  const currentPool = getPool();
  const connection = await currentPool.getConnection();
  await connection.beginTransaction();

  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

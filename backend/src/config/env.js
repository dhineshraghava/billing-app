import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust candidate locations for .env
const candidatePaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
];

let loadedPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    loadedPath = p;
    break;
  }
}

if (!loadedPath) {
  dotenv.config(); // Fallback to default search
}

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supermarket_db',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supermarket_billing_default_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

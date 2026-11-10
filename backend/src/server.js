import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { testConnection, isDbConnected } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import shiftRoutes from './routes/shiftRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: [env.clientUrl, 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Health & Live Database Connection Status
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let latencyMs = null;
  let dbError = null;

  try {
    const start = Date.now();
    const currentPool = (await import('./config/db.js')).getPool();
    await currentPool.query('SELECT 1');
    latencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.code || err.message;
  }

  const isHealthy = dbStatus === 'connected';

  return res.status(isHealthy ? 200 : 503).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      latencyMs,
      host: `${env.db.host}:${env.db.port}`,
      database: env.db.database,
      user: env.db.user,
      ...(dbError ? { error: dbError } : {}),
    },
    environment: env.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', categoryRoutes);

// Centralized Error Handler
app.use(errorHandler);

// Start Server & Test Database Connection
const server = app.listen(env.port, async () => {
  console.log(`\n======================================================`);
  console.log(`  Supermarket Billing Backend running on port ${env.port}`);
  console.log(`  API Health: http://localhost:${env.port}/api/health`);
  console.log(`======================================================`);

  // Verify database connectivity
  await testConnection();
});

export default app;

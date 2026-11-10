import { env } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // Never leak credentials or raw DB connection strings
  console.error(`[Error Handler] ${req.method} ${req.originalUrl}:`, err.message || err);

  // MySQL specific errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique identifier (e.g., barcode, invoice number, username) already exists.',
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      success: false,
      message: 'Foreign key constraint violation: referenced category, customer, unit, or invoice item is invalid or in use.',
    });
  }

  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
}

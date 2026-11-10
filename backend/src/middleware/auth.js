import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';

/**
 * Middleware to authenticate requests via JWT Bearer token
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required.',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Your session has expired. Please sign in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Check if user is still active in database
    const users = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role_id, u.is_active, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ? LIMIT 1`,
      [decoded.userId]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      roleId: user.role_id,
      roleName: user.role_name,
    };

    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to authenticate user.',
    });
  }
}

/**
 * Role authorization guard
 * Example: authorize('ADMIN') or authorize(['ADMIN', 'MANAGER'])
 */
export function authorize(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated.',
      });
    }

    if (allowed.length > 0 && !allowed.includes(req.user.roleName)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of the following roles: [${allowed.join(', ')}]. Current role: ${req.user.roleName}`,
      });
    }

    next();
  };
}

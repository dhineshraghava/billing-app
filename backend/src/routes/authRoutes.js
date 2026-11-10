import { Router } from 'express';
import {
  login,
  logout,
  getMe,
  setupInitialAdmin,
  listUsers,
  createUser,
  getRoles,
  updateUser,
  toggleUserStatus,
} from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/setup-admin', setupInitialAdmin);
router.get('/me', authenticate, getMe);

// Admin-only user management
router.get('/roles', authenticate, authorize('ADMIN'), getRoles);
router.get('/users', authenticate, authorize('ADMIN'), listUsers);
router.post('/users', authenticate, authorize('ADMIN'), createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), updateUser);
router.patch('/users/:id/status', authenticate, authorize('ADMIN'), toggleUserStatus);

export default router;

import { Router } from 'express';
import { listAccounts } from '../controllers/accountController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Allow Cashiers, Managers, and Admins to list active accounts (needed for POS payment deposit account selection)
router.get('/', authorize(['ADMIN', 'MANAGER', 'CASHIER']), listAccounts);

export default router;

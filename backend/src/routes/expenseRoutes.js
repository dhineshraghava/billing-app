import { Router } from 'express';
import { listExpenses, createExpense } from '../controllers/expenseController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER', 'ACCOUNTANT']));

router.get('/', listExpenses);
router.post('/', createExpense);

export default router;

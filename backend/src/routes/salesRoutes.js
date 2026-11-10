import { Router } from 'express';
import { createSale, getSaleById, listSales, processReturn } from '../controllers/salesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listSales);
router.get('/:id', getSaleById);
router.post('/', createSale); // Any cashier/manager/admin can complete a sale
router.post('/:id/returns', authorize(['ADMIN', 'MANAGER']), processReturn); // Returns restricted to Manager/Admin

export default router;

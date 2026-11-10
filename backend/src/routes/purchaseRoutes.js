import { Router } from 'express';
import { listPurchases, createPurchase, getPurchaseById, processPurchaseReturn } from '../controllers/purchaseController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER', 'INVENTORY_STAFF']));

router.get('/', listPurchases);
router.get('/:id', getPurchaseById);
router.post('/', createPurchase);
router.post('/:id/returns', authorize(['ADMIN', 'MANAGER']), processPurchaseReturn);

export default router;

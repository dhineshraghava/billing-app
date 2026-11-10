import { Router } from 'express';
import {
  getInventorySummary,
  getInventory,
  getLowStockProducts,
  getStockMovements,
  createStockAdjustment,
} from '../controllers/inventoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER', 'INVENTORY_STAFF']));

router.get('/summary', getInventorySummary);
router.get('/', getInventory);
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getStockMovements);
router.post('/adjustments', createStockAdjustment);

export default router;

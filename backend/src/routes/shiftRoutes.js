import { Router } from 'express';
import { getCurrentShift, openShift, closeShift, getShiftHistory } from '../controllers/shiftController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/current', getCurrentShift);
router.post('/open', openShift);
router.post('/close', closeShift);
router.get('/history', authorize(['ADMIN', 'MANAGER', 'ACCOUNTANT']), getShiftHistory);

export default router;


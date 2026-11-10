import { Router } from 'express';
import { listCategories, createCategory, listUnits, createUnit } from '../controllers/categoryController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/categories', listCategories);
router.post('/categories', authorize(['ADMIN', 'MANAGER']), createCategory);

router.get('/units', listUnits);
router.post('/units', authorize(['ADMIN', 'MANAGER']), createUnit);

export default router;

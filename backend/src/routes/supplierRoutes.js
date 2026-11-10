import { Router } from 'express';
import { listSuppliers, getSupplierById, createSupplier, updateSupplier } from '../controllers/supplierController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER']));

router.get('/', listSuppliers);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);

export default router;

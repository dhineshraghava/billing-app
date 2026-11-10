import { Router } from 'express';
import {
  listProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  updateProductStatus,
  exportProductsCsv,
  importProductsJson,
} from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/export', exportProductsCsv);
router.post('/import', authorize(['ADMIN', 'MANAGER', 'INVENTORY_STAFF']), importProductsJson);
router.get('/', listProducts);
router.get('/barcode/:barcode', getProductByBarcode);
router.get('/:id', getProductById);

// Price and item editing restricted to Admin, Manager, and Inventory staff
router.post('/', authorize(['ADMIN', 'MANAGER', 'INVENTORY_STAFF']), createProduct);
router.put('/:id', authorize(['ADMIN', 'MANAGER']), updateProduct);
router.patch('/:id/status', authorize(['ADMIN', 'MANAGER']), updateProductStatus);

export default router;

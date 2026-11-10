import { Router } from 'express';
import {
  listCustomers,
  getCustomerById,
  getCustomerByPhone,
  getCustomerLoyaltyHistory,
  createCustomer,
  updateCustomer,
} from '../controllers/customerController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', listCustomers);
router.get('/by-phone/:phone', getCustomerByPhone);
router.get('/:id/loyalty-history', getCustomerLoyaltyHistory);
router.get('/:id', getCustomerById);
router.post('/', createCustomer);
router.put('/:id', updateCustomer);

export default router;

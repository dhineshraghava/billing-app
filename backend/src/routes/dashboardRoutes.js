import { Router } from 'express';
import { getDashboardSummary, getRecentSales, getSalesChartData, getTopSellingProducts } from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN', 'MANAGER']));

router.get('/summary', getDashboardSummary);
router.get('/recent-sales', getRecentSales);
router.get('/chart', getSalesChartData);
router.get('/top-products', getTopSellingProducts);

export default router;

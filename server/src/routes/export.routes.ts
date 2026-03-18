import { Router } from 'express';
import exportController from '../controllers/export.controller';

const router = Router();

// Export orders data
router.get('/orders', exportController.exportOrders);

// Export customers data
router.get('/customers', exportController.exportCustomers);

// Export products data
router.get('/products', exportController.exportProducts);

// Export executive summary
router.get('/summary', exportController.exportExecutiveSummary);

export default router;

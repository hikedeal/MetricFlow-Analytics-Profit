import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

// Get comprehensive dashboard overview
router.get('/overview', dashboardController.getDashboardOverview);

// Get sales intelligence metrics
router.get('/sales-intelligence', dashboardController.getSalesIntelligence);

// Get order tag intelligence
router.get('/order-tags', dashboardController.getOrderTagIntelligence);

// Get customer intelligence
router.get('/customers', dashboardController.getCustomerIntelligence);

// Get sales trends
router.get('/trends', dashboardController.getSalesTrends);

// Get product performance
router.get('/products', dashboardController.getProductPerformance);

// Get profit metrics
router.get('/profit', dashboardController.getProfitMetrics);

// Get date range presets
router.get('/date-presets', dashboardController.getDateRangePresets);

// Get live currency rates
router.get('/currency-rates', dashboardController.getCurrencyRates);

export default router;

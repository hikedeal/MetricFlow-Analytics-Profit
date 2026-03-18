import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

// Global Stats (Protected by x-admin-key)
router.get('/stats', AdminController.getGlobalStats);

// List All Stores
router.get('/stores', AdminController.getAllStores);

// Download Data Dump
router.get('/stores/:storeId/dump', AdminController.getStoreDataDump);

export const adminRoutes = router;

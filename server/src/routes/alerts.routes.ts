import { Router } from 'express';
import alertController from '../controllers/alerts.controller';

const router = Router();

// Get active alerts
router.get('/', alertController.getAlerts);

// Mark alerts as read
router.post('/read', alertController.markAsRead);

// Dismiss an individual alert
router.post('/dismiss/:id', alertController.dismiss);

export default router;

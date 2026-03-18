import { Router } from 'express';
import { OrdersController } from '../controllers/orders.controller';

const router = Router();

router.get('/', OrdersController.getOrders);
router.get('/stats', OrdersController.getStats);
router.get('/tags', OrdersController.getTags);
router.get('/:id', OrdersController.getOrderDetails);
router.put('/:id/risk', OrdersController.markAsRisky);
router.put('/:id/tags', OrdersController.updateTags);
router.post('/bulk/risk', OrdersController.bulkMarkAsRisky);
router.post('/bulk/tags', OrdersController.bulkAddTags);

export default router;

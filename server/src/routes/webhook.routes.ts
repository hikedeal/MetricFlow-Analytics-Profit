import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = Router();

// Shopify Webhooks
router.post('/', WebhookController.handle);

export default router;

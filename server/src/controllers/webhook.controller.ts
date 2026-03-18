import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../config/prisma';
import { logger } from '../config/logger';

export class WebhookController {
    /**
     * Handle incoming webhooks from Shopify
     */
    static async handle(req: Request, res: Response): Promise<void> {
        const topic = req.get('X-Shopify-Topic');
        const shop = req.get('X-Shopify-Shop-Domain');
        const hmac = req.get('X-Shopify-Hmac-Sha256');

        if (!topic || !shop || !hmac) {
            res.status(400).send('Missing Shopify webhook headers');
            return;
        }

        logger.info(`Webhook received: ${topic} from ${shop}`);

        // Verify HMAC
        let secret = process.env.SHOPIFY_API_SECRET || '';

        // Find custom secret from registry if it exists
        const registry = await prisma.appRegistry.findUnique({
            where: { shopDomain: shop }
        });

        if (registry) {
            secret = registry.apiSecret;
            logger.info(`Using custom secret for HMAC verification: ${shop}`);
        }

        const body = (req as any).rawBody ? (req as any).rawBody.toString('utf8') : JSON.stringify(req.body);
        const hash = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('base64');

        if (hash !== hmac) {
            logger.warn(`Invalid HMAC for webhook ${topic} from ${shop}`);
            res.status(401).send('Invalid HMAC');
            return;
        }

        try {
            const store = await prisma.store.findUnique({
                where: { shopifyDomain: shop }
            });

            if (!store) {
                logger.error(`Store not found for webhook: ${shop}`);
                res.status(404).send('Store not found');
                return;
            }

            // Offload processing to queue to respond immediately to Shopify
            const { QueueService } = require('../services/queue.service');
            const { WebhookService } = require('../services/webhook.service');

            try {
                await QueueService.addWebhookJob(store.id, topic, req.body);
                logger.info(`Webhook queued successfully: ${topic} for ${shop}`);
                res.status(200).send('OK (Queued)');
            } catch (queueError) {
                logger.warn(`Failed to queue webhook ${topic}, falling back to sync processing:`, queueError);

                // Fallback: Process synchronously
                // We still return 200 immediately if possible, or wait for sync processing
                // Since Shopify times out after 5s, we should try to process quickly or just return 200 and process in "background" of this request

                // Execute sync but don't await if we want to return 200 quickly? 
                // Better: Await it to ensure data integrity since queue is down, risking a timeout is better than data loss.
                await WebhookService.processWebhook(store.id, topic, req.body);

                logger.info(`Webhook processed synchronously: ${topic} for ${shop}`);
                res.status(200).send('OK (Sync Fallback)');
            }
        } catch (error) {
            logger.error(`Error handling webhook ${topic}:`, error);
            res.status(500).send('Internal Server Error');
        }
    }
}

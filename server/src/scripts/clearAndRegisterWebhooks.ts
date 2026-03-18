import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../config/prisma';
import { shopify } from '../config/shopify';
import { WebhookRegistrationService } from '../services/webhook_registration.service';
import { logger } from '../config/logger';

async function main() {
    logger.info('🚀 Starting deep webhook cleanup and re-registration...');

    if (!process.env.SHOPIFY_APP_URL) {
        logger.error('❌ SHOPIFY_APP_URL is not set in .env');
        process.exit(1);
    }

    logger.info(`🔗 Current App URL: ${process.env.SHOPIFY_APP_URL}`);

    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true }
        });

        for (const store of stores) {
            if (!store.accessToken) continue;

            logger.info(`🧹 Cleaning up webhooks for ${store.shopifyDomain}...`);

            const client = new shopify.clients.Rest({
                session: {
                    shop: store.shopifyDomain,
                    accessToken: store.accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            // 1. Fetch current webhooks
            const response = await client.get({ path: 'webhooks' });
            const webhooks = (response.body as any).webhooks;

            logger.info(`Found ${webhooks.length} webhooks to check for ${store.shopifyDomain}`);

            // 2. Delete webhooks that point to WRONG addresses or duplicates
            // Actually, let's just delete ALL to be safe and have a clean state
            for (const webhook of webhooks) {
                try {
                    await client.delete({ path: `webhooks/${webhook.id}` });
                    logger.info(`  DELETED: ${webhook.topic} (${webhook.address})`);
                } catch (delErr) {
                    logger.error(`  FAILED TO DELETE ${webhook.id}:`, delErr);
                }
            }

            // 3. Re-register using our standard service
            logger.info(`📦 Re-registering fresh webhooks for ${store.shopifyDomain}...`);
            try {
                await WebhookRegistrationService.registerWebhooks(store.shopifyDomain, store.accessToken);
                logger.info(`✅ Successfully registered webhooks for ${store.shopifyDomain}`);
            } catch (regErr) {
                logger.error(`❌ Failed to register webhooks for ${store.shopifyDomain}:`, regErr);
            }
        }

        logger.info('🏁 Deep cleanup completed.');
    } catch (error) {
        logger.error('❌ Fatal error during cleanup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

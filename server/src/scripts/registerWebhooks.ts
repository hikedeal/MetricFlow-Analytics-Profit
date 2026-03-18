import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../config/prisma';
import { shopify } from '../config/shopify';
import { WebhookRegistrationService } from '../services/webhook_registration.service';
import { logger } from '../config/logger';

async function main() {
    logger.info('🚀 Starting webhook re-registration for all stores...');

    // Check if SHOPIFY_APP_URL is set
    if (!process.env.SHOPIFY_APP_URL) {
        logger.error('❌ SHOPIFY_APP_URL is not set in .env');
        process.exit(1);
    }

    logger.info(`🔗 Current App URL: ${process.env.SHOPIFY_APP_URL}`);

    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true }
        });

        logger.info(`Found ${stores.length} active stores.`);

        for (const store of stores) {
            if (!store.accessToken) {
                logger.warn(`⚠️ Skipping store ${store.shopifyDomain}: No access token found.`);
                continue;
            }

            logger.info(`📦 Registering webhooks for ${store.shopifyDomain}...`);
            try {
                await WebhookRegistrationService.registerWebhooks(store.shopifyDomain, store.accessToken, shopify);
                logger.info(`✅ Successfully updated webhooks for ${store.shopifyDomain}`);
            } catch (error) {
                logger.error(`❌ Failed to register webhooks for ${store.shopifyDomain}:`, error);
            }
        }

        logger.info('🏁 Webhook re-registration completed.');
    } catch (error) {
        logger.error('❌ Fatal error during webhook registration:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

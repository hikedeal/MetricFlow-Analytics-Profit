import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

import prisma from '../config/prisma';
import { shopify } from '../config/shopify';
import { logger } from '../config/logger';

async function main() {
    try {
        const stores = await prisma.store.findMany({
            where: { isActive: true }
        });

        logger.info(`Found ${stores.length} active stores.`);

        for (const store of stores) {
            logger.info(`🔍 Fetching webhooks for ${store.shopifyDomain}...`);

            if (!store.accessToken) {
                logger.warn(`⚠️ Skipping store ${store.shopifyDomain}: No access token found.`);
                continue;
            }

            const client = new shopify.clients.Rest({
                session: {
                    shop: store.shopifyDomain,
                    accessToken: store.accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: 'webhooks',
            });

            const webhooks = (response.body as any).webhooks;
            logger.info(`Found ${webhooks.length} registered webhooks for ${store.shopifyDomain}:`);

            webhooks.forEach((webhook: any) => {
                logger.info(`- Topic: ${webhook.topic}, Address: ${webhook.address}, ID: ${webhook.id}`);
            });
        }

    } catch (error) {
        logger.error(`❌ Error fetching webhooks:`, error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

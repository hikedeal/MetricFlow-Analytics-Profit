import prisma from '../config/prisma';
import { logger } from '../config/logger';

async function registerApp(shopDomain: string, apiKey: string, apiSecret: string) {
    try {
        await prisma.appRegistry.upsert({
            where: { shopDomain },
            update: { apiKey, apiSecret },
            create: { shopDomain, apiKey, apiSecret }
        });

        logger.info(`✅ Successfully registered ${shopDomain} with custom API keys.`);
        logger.info(`API Key: ${apiKey}`);
    } catch (err) {
        logger.error(`❌ Registration failed for ${shopDomain}:`, err);
    } finally {
        await prisma.$disconnect();
    }
}

// Get arguments from command line
const [shop, key, secret] = process.argv.slice(2);

if (!shop || !key || !secret) {
    console.log('Usage: npx ts-node src/scripts/registerApp.ts <shop-domain> <api-key> <api-secret>');
    process.exit(1);
}

registerApp(shop, key, secret);

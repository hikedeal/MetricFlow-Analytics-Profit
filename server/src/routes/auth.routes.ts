import { Router } from 'express';
import { shopify as defaultShopify } from '../config/shopify';
import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { SyncService } from '../services/sync.service';
import { WebhookRegistrationService } from '../services/webhook_registration.service';

const router = Router();

// Get public config for frontend
router.get('/config', async (req, res) => {
    try {
        const shop = req.query.shop as string;
        if (!shop) throw new Error('Missing shop');

        const apiKey = process.env.SHOPIFY_API_KEY;
        logger.info(`Serving config for ${shop}: apiKey starts with ${apiKey?.substring(0, 6)}`);

        res.json({
            success: true,
            data: {
                apiKey: apiKey
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// Helper to get shopify instance for a shop
async function getShopifyForShop(_shop: string) {
    return defaultShopify;
}

// Test Route
router.get('/test', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'Auth router is working' });
});

// Init Shopify OAuth
router.get('/login', async (req, res) => {
    try {
        const shop = req.query.shop as string;
        if (!shop) {
            throw new Error('Missing shop parameter');
        }

        const shopifyInstance = await getShopifyForShop(shop);
        const sanitizedShop = shopifyInstance.utils.sanitizeShop(shop, true);
        if (!sanitizedShop) {
            throw new Error('Invalid shop parameter');
        }

        logger.info(`Initiating OAuth for shop: ${sanitizedShop}`);

        // Begin auth flow
        await shopifyInstance.auth.begin({
            shop: sanitizedShop,
            callbackPath: '/api/auth/callback',
            isOnline: false,
            rawRequest: req,
            rawResponse: res,
        });
    } catch (error) {
        logger.error('Auth begin error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Auth Callback
router.get('/callback', async (req, res) => {
    try {
        logger.info('OAuth callback received', { query: req.query });
        const shop = req.query.shop as string;

        const shopifyInstance = await getShopifyForShop(shop);

        // Complete auth
        const callback = await shopifyInstance.auth.callback({
            rawRequest: req,
            rawResponse: res,
        });

        const { session } = callback;
        if (!session || !session.accessToken) {
            throw new Error('Failed to obtain session or access token');
        }

        logger.info('Session details obtained:', {
            shop: session.shop,
            id: session.id,
            scope: session.scope,
            isOnline: session.isOnline
        });

        // Custom registry lookup removed; using default env credentials

        // Register/Update store in database
        const store = await prisma.store.upsert({
            where: { shopifyDomain: session.shop },
            update: {
                accessToken: session.accessToken,
                scope: session.scope || '',
                isActive: true,
                shopifyApiKey: process.env.SHOPIFY_API_KEY,
                shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
                updatedAt: new Date(),
            },
            create: {
                shopifyDomain: session.shop,
                shopifyStoreId: session.id.split('_').pop() || session.id,
                accessToken: session.accessToken,
                scope: session.scope || '',
                shopifyApiKey: process.env.SHOPIFY_API_KEY,
                shopifyApiSecret: process.env.SHOPIFY_API_SECRET,
                isActive: true,
                installedAt: new Date(),
            },
        });

        logger.info(`Store ${session.shop} registered successfully`);

        // Trigger initial background sync
        SyncService.fullSync(store.id).catch(err => {
            logger.error(`Initial sync failed for ${session.shop}:`, err);
        });

        // Register webhooks
        WebhookRegistrationService.registerWebhooks(session.shop, session.accessToken, shopifyInstance).catch(err => {
            logger.error(`Webhook registration failed for ${session.shop}:`, err);
        });

        // Redirect to app dashboard in Shopify
        const host = req.query.host as string;
        const apiKey = process.env.SHOPIFY_API_KEY;
        const appUrl = `https://${session.shop}/admin/apps/${apiKey}/dashboard?host=${host}`;

        res.redirect(appUrl);
    } catch (error) {
        logger.error('Auth callback error:', error);
        res.status(500).send('Authentication callback failed');
    }
});

export default router;

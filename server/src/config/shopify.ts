import '@shopify/shopify-api/adapters/node';
import { shopifyApi, LATEST_API_VERSION, DeliveryMethod } from '@shopify/shopify-api';

if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
    throw new Error('SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set');
}

// Instance cache to prevent session loss between requests for the same credentials
const instanceCache = new Map<string, any>();

export const createShopifyInstance = (apiKey?: string, apiSecretKey?: string) => {
    const key = apiKey || process.env.SHOPIFY_API_KEY!;
    const secret = apiSecretKey || process.env.SHOPIFY_API_SECRET!;
    const cacheKey = `${key}:${secret}`;

    if (instanceCache.has(cacheKey)) {
        return instanceCache.get(cacheKey);
    }

    const instance = shopifyApi({
        apiKey: key,
        apiSecretKey: secret,
        scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
        hostName: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, '') || 'localhost',
        hostScheme: process.env.SHOPIFY_APP_URL?.startsWith('https') ? 'https' : 'http',
        apiVersion: (process.env.SHOPIFY_API_VERSION as any) || LATEST_API_VERSION,
        isEmbeddedApp: true,
        isCustomStoreApp: false,
    });

    instanceCache.set(cacheKey, instance);
    return instance;
};

export const shopify = createShopifyInstance();

// Shopify API version
export const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

// Webhook topics
export const WEBHOOK_TOPICS = {
    ORDERS_CREATE: 'orders/create',
    ORDERS_UPDATED: 'orders/updated',
    ORDERS_CANCELLED: 'orders/cancelled',
    FULFILLMENTS_CREATE: 'fulfillments/create',
    FULFILLMENTS_UPDATE: 'fulfillments/update',
    REFUNDS_CREATE: 'refunds/create',
    CUSTOMERS_CREATE: 'customers/create',
    CUSTOMERS_UPDATE: 'customers/update',
    PRODUCTS_CREATE: 'products/create',
    PRODUCTS_UPDATE: 'products/update',
    PRODUCTS_DELETE: 'products/delete',
    APP_UNINSTALLED: 'app/uninstalled',
} as const;

export type WebhookTopic = typeof WEBHOOK_TOPICS[keyof typeof WEBHOOK_TOPICS];

// Register Webhook Handlers
shopify.webhooks.addHandlers({
    [WEBHOOK_TOPICS.ORDERS_CREATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.ORDERS_UPDATED]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.CUSTOMERS_CREATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.CUSTOMERS_UPDATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.PRODUCTS_CREATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.PRODUCTS_UPDATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.PRODUCTS_DELETE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.REFUNDS_CREATE]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.ORDERS_CANCELLED]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
    [WEBHOOK_TOPICS.APP_UNINSTALLED]: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: '/api/webhooks',
    },
});

import 'dotenv/config';
import { ShopifyService } from '../src/services/shopify.service';
import { SyncService } from '../src/services/sync.service';
import prisma from '../src/config/prisma';

async function syncFeb2026() {
    const store = await prisma.store.findFirst({ where: { shopifyDomain: 'jaibros1.myshopify.com' } });
    if (!store) return;

    console.log(`Manually fetching Feb 2026 orders for ${store.shopifyDomain}...`);

    // Shopify API doesn't support 'created_at_min' with 'since_id' in the same way, 
    // but we can use a date-based query or just fetch without since_id (latest first) 
    // if we use the right endpoint.

    const client = (ShopifyService as any).shopify.clients.Rest; // Wait, access the client
    // Actually, I'll just use the existing SyncService methods by modifying the since_id temporarily
    // OR just use a custom fetch.

    /* 
       SHOP_URL/admin/api/2024-01/orders.json?created_at_min=2026-02-01T00:00:00Z&status=any 
    */

    // Let's use the Rest client directly
    const { shopify } = require('../src/config/shopify');
    const restClient = new shopify.clients.Rest({
        session: {
            shop: store.shopifyDomain,
            accessToken: store.accessToken,
        }
    });

    let hasMore = true;
    let sinceId = '0';
    let count = 0;

    // Fast backfill for Feb 2026 specifically
    const response = await restClient.get({
        path: 'orders',
        query: {
            status: 'any',
            limit: 250,
            created_at_min: '2026-02-01T00:00:00Z',
            created_at_max: '2026-02-06T00:00:00Z',
        }
    });

    const orders = (response.body as any).orders;
    console.log(`Found ${orders.length} orders in Feb 1-6 range.`);

    if (orders.length > 0) {
        await (SyncService as any).bulkUpsertOrders(store.id, orders, store);
        console.log(`Synced ${orders.length} orders.`);
    }
}

// Map the private method access if needed, or just run a custom bulk upsert.
// Actually, I'll just update SyncService to have a 'syncRecent' method.

syncFeb2026().then(() => process.exit(0));

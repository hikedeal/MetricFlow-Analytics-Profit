import 'dotenv/config';
import { shopify } from '../src/config/shopify';
import prisma from '../src/config/prisma';

async function checkCounts() {
    const store = await prisma.store.findFirst({ where: { shopifyDomain: 'jaibros1.myshopify.com' } });
    if (!store) return;

    const client = new shopify.clients.Rest({
        session: {
            shop: store.shopifyDomain,
            accessToken: store.accessToken,
            state: '',
            isOnline: false,
        } as any,
    });

    const res: any = await client.get({
        path: 'orders/count',
        query: {
            status: 'any',
            created_at_min: '2026-02-01T00:00:00Z',
            created_at_max: '2026-02-06T23:59:59Z',
        }
    });

    console.log('Shopify Order Count (Feb 1-6):', res.body.count);

    // Check for "unpaid" or "pending" specifically?
    // User says "Gross Sales"

    const resAll: any = await client.get({
        path: 'orders',
        query: {
            status: 'any',
            limit: 250,
            fields: 'id,total_price',
            created_at_min: '2026-02-01T00:00:00Z',
            created_at_max: '2026-02-06T23:59:59Z',
        }
    });

    const orders = resAll.body.orders;
    let total = 0;
    orders.forEach((o: any) => total += parseFloat(o.total_price));
    console.log(`First 250 orders Total Price: ${total}`);
}

checkCounts().then(() => process.exit(0));

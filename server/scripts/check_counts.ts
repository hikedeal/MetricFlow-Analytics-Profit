import 'dotenv/config';
import { shopify } from '../src/config/shopify';
import prisma from '../src/config/prisma';

async function checkStoreStatistics() {
    const stores = await prisma.store.findMany({ where: { isActive: true } });

    for (const store of stores) {
        console.log(`\n--- Statistics for ${store.shopifyDomain} ---`);

        const client = new shopify.clients.Rest({
            session: {
                shop: store.shopifyDomain,
                accessToken: store.accessToken,
                state: '',
                isOnline: false,
            } as any,
        });

        const localOrderCount = await prisma.order.count({ where: { storeId: store.id } });
        const localProductCount = await prisma.product.count({ where: { storeId: store.id } });
        const localCustomerCount = await prisma.customer.count({ where: { storeId: store.id } });

        try {
            // Fetch counts from Shopify
            const orderRes = await client.get({ path: 'orders/count', query: { status: 'any' } });
            const productRes = await client.get({ path: 'products/count' });
            const customerRes = await client.get({ path: 'customers/count' });

            const shopifyOrderCount = (orderRes.body as any).count;
            const shopifyProductCount = (productRes.body as any).count;
            const shopifyCustomerCount = (customerRes.body as any).count;

            console.log(`Orders: Local=${localOrderCount}, Shopify=${shopifyOrderCount}`);
            console.log(`Products: Local=${localProductCount}, Shopify=${shopifyProductCount}`);
            console.log(`Customers: Local=${localCustomerCount}, Shopify=${shopifyCustomerCount}`);

            if (localOrderCount < shopifyOrderCount) {
                console.log(`[!] MISMATCH: Missing ${shopifyOrderCount - localOrderCount} orders.`);
            }
            if (localProductCount < shopifyProductCount) {
                console.log(`[!] MISMATCH: Missing ${shopifyProductCount - localProductCount} products.`);
            }
        } catch (error) {
            console.error(`Error fetching Shopify counts:`, error);
        }
    }
}

checkStoreStatistics().then(() => process.exit(0));

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    const store = await prisma.store.upsert({
        where: { shopifyDomain: 'dev-shop.myshopify.com' },
        update: {},
        create: {
            id: 'dev-store-123',
            shopifyDomain: 'dev-shop.myshopify.com',
            shopifyStoreId: '123456789',
            accessToken: 'mock-access-token',
            scope: 'read_orders,read_products,read_customers',
            currency: 'INR',
            settings: {
                create: {
                    enableProfitTracking: true,
                    theme: 'light',
                }
            }
        },
    });

    console.log(`✅ Seeded store: ${store.shopifyDomain} (${store.id})`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

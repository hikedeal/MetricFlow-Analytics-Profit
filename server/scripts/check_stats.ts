import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStats() {
    try {
        const stores = await prisma.store.findMany();
        console.log(`Found ${stores.length} stores.`);

        for (const store of stores) {
            const orderCount = await prisma.order.count({ where: { storeId: store.id } });
            console.log(`Store ${store.shopifyDomain}: ${orderCount} orders.`);

            const periodSnapshots = await prisma.order.findMany({
                where: { storeId: store.id },
                take: 5
            });
            console.log(`Sample 5 orders present: ${periodSnapshots.length > 0}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStats();

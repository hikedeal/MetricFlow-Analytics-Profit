import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const shop = 'jaibros1.myshopify.com';
    const store = await prisma.store.findUnique({ where: { shopifyDomain: shop } });
    if (!store) {
        console.log('Store not found');
        return;
    }

    const todayStart = new Date('2026-02-17T00:00:00Z');
    const yesterdayStart = new Date('2026-02-16T00:00:00Z');

    const ordersToday = await prisma.order.count({
        where: {
            storeId: store.id,
            orderDate: { gte: todayStart }
        }
    });

    const ordersYesterday = await prisma.order.count({
        where: {
            storeId: store.id,
            orderDate: { gte: yesterdayStart, lt: todayStart }
        }
    });

    const recentOrders = await prisma.order.findMany({
        where: { storeId: store.id },
        orderBy: { orderDate: 'desc' },
        take: 20,
        select: { orderName: true, orderDate: true, shopifyOrderId: true }
    });

    console.log(`Orders for ${shop}:`);
    console.log({ today: ordersToday, yesterday: ordersYesterday });
    console.log('Recent Orders:');
    console.table(recentOrders);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

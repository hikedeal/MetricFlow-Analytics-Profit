import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Current date is 2026-02-17
    const todayStart = new Date('2026-02-17T00:00:00Z');
    const yesterdayStart = new Date('2026-02-16T00:00:00Z');
    const tomorrowStart = new Date('2026-02-18T00:00:00Z');

    const ordersToday = await prisma.order.count({
        where: {
            orderDate: {
                gte: todayStart,
                lt: tomorrowStart
            }
        }
    });

    const ordersYesterday = await prisma.order.count({
        where: {
            orderDate: {
                gte: yesterdayStart,
                lt: todayStart
            }
        }
    });

    const recentOrders = await prisma.order.findMany({
        orderBy: { orderDate: 'desc' },
        take: 10,
        select: { orderName: true, orderDate: true, store: { select: { shopifyDomain: true } } }
    });

    console.log('Orders Count (by orderDate):');
    console.log({ today: ordersToday, yesterday: ordersYesterday });
    console.log('Most Recent Orders:');
    console.table(recentOrders.map(o => ({
        name: o.orderName,
        date: o.orderDate,
        shop: o.store.shopifyDomain
    })));

    const stores = await prisma.store.findMany({
        select: { shopifyDomain: true, timezone: true, lastSyncAt: true }
    });
    console.log('Stores Status:');
    console.table(stores);

    const caches = await prisma.analyticsCache.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' }
    });
    console.log('Recent Analytics Cache:');
    console.table(caches.map(c => ({ key: c.cacheKey, updated: c.updatedAt, expires: c.expiresAt })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

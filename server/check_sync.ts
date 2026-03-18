import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({
        where: { isActive: true },
        select: { shopifyDomain: true, lastSyncAt: true }
    });
    console.log('Stores Status:');
    console.table(stores);

    const syncJobs = await prisma.syncJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { jobType: true, status: true, createdAt: true, completedAt: true, errorMessage: true }
    });
    console.log('Recent Sync Jobs:');
    console.table(syncJobs);

    const orderCount = await prisma.order.count();
    const productCount = await prisma.product.count();
    const customerCount = await prisma.customer.count();

    console.log('Total Counts:');
    console.log({ orders: orderCount, products: productCount, customers: customerCount });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

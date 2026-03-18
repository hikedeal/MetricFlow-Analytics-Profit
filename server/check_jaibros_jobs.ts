import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const shop = 'jaibros1.myshopify.com';
    const syncJobs = await prisma.syncJob.findMany({
        where: { store: { shopifyDomain: shop } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { jobType: true, status: true, createdAt: true, completedAt: true, errorMessage: true }
    });
    console.log(`Sync Jobs for ${shop}:`);
    console.table(syncJobs);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const shop = 'jaibros1.myshopify.com';
    const store = await prisma.store.findUnique({ where: { shopifyDomain: shop } });

    if (!store) {
        console.error('Store not found');
        return;
    }

    // Mark current running/failed jobs for this store as failed to clear the queue
    await prisma.syncJob.updateMany({
        where: {
            storeId: store.id,
            status: { in: ['running', 'pending'] }
        },
        data: {
            status: 'failed',
            errorMessage: 'Restarted for rate-limit fix verification'
        }
    });

    console.log(`Starting fresh sync for ${shop}...`);
    // This will hit the SyncService.fullSync via a separate script or we can just call it here if we mock env
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());


import prisma from './src/config/prisma';
import { SyncService } from './src/services/sync.service';

async function cleanupAndResync() {
    try {
        const store = await prisma.store.findFirst();
        if (!store) {
            console.log('No store found');
            return;
        }

        console.log(`Cleaning up line items for store: ${store.shopifyDomain}`);

        // 1. Delete all line items for this store
        const deleted = await prisma.orderLineItem.deleteMany({
            where: { storeId: store.id }
        });
        console.log(`Deleted ${deleted.count} line items.`);

        // 2. Trigger a fresh sync
        console.log('Starting fresh sync...');
        await SyncService.fullSync(store.id);
        console.log('Sync completed.');

        // 3. Verify counts
        const orderCount = await prisma.order.count({ where: { storeId: store.id } });
        const itemCount = await prisma.orderLineItem.count({ where: { storeId: store.id } });
        console.log(`Final Counts - Orders: ${orderCount}, Line Items: ${itemCount}`);

    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupAndResync();

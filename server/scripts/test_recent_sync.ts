import 'dotenv/config';
import { SyncService } from '../src/services/sync.service';
import prisma from '../src/config/prisma';

async function testSync() {
    const store = await prisma.store.findFirst({ where: { shopifyDomain: 'jaibros1.myshopify.com' } });
    if (!store) return;

    console.log(`Manually calling SyncService.syncRecentOrders for ${store.shopifyDomain}...`);
    try {
        // Since it's private, I'll use as any
        await (SyncService as any).syncRecentOrders(store);
        console.log('SUCCESS: Recent sync finished.');
    } catch (err) {
        console.error('FAILED: Recent sync error:', err);
    }
}

testSync().then(() => process.exit(0));

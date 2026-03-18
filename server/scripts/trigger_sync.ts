import 'dotenv/config';
import { QueueService } from '../src/services/queue.service';
import prisma from '../src/config/prisma';

async function triggerSync() {
    const store = await prisma.store.findFirst({ where: { shopifyDomain: 'jaibros1.myshopify.com' } });
    if (!store) {
        console.error('Store not found');
        return;
    }
    console.log(`Triggering background sync for ${store.shopifyDomain}...`);
    await QueueService.addFullSyncJob(store.id);
    console.log('Job added to queue.');
}

triggerSync().then(() => process.exit(0));

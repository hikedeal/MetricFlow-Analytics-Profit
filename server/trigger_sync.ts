import { PrismaClient } from '@prisma/client';
import { QueueService } from './src/services/queue.service';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany({ where: { isActive: true } });
    for (const store of stores) {
        console.log(`Adding full sync job to queue for ${store.shopifyDomain}...`);
        await QueueService.addFullSyncJob(store.id);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

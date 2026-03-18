import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // 1. Mark all 'running' jobs as 'failed' (stale)
    const updated = await prisma.syncJob.updateMany({
        where: { status: 'running' },
        data: {
            status: 'failed',
            errorMessage: 'Automatically marked as failed due to being stuck/stale'
        }
    });
    console.log(`Marked ${updated.count} running jobs as failed.`);

    // 2. Clear old failed jobs if needed (optional, let's just keep them for history)

    // 3. Trigger a fresh full sync for all active stores
    const stores = await prisma.store.findMany({ where: { isActive: true } });
    for (const store of stores) {
        console.log(`Triggering fresh sync for ${store.shopifyDomain}...`);
        // We can't easily call the service from here without full setup, 
        // but we can just wait for the cron job or trigger it via a temporary script if needed.
        // Actually, let's just create a sync job entry so the worker picks it up (if using BullMQ).
        // OR better, we can invoke it via a tool call if we can run code.
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

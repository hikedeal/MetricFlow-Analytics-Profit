import cron from 'node-cron';
import prisma from '../config/prisma';
import { QueueService } from '../services/queue.service';
import { SyncService } from '../services/sync.service';
import { logger } from '../config/logger';

export async function initializeBackgroundJobs() {
    logger.info('Initializing background jobs...');

    // Every 30 minutes Full Sync (Auto Sync)
    const syncInterval = process.env.SYNC_INTERVAL_MINUTES || '30';
    cron.schedule(`*/${syncInterval} * * * *`, async () => {
        logger.info(`Starting auto-sync (every ${syncInterval} mins)...`);
        try {
            const activeStores = await prisma.store.findMany({
                where: { isActive: true }
            });

            for (const store of activeStores) {
                try {
                    await QueueService.addFullSyncJob(store.id);
                } catch (queueError) {
                    logger.warn(`Queue unavailable, falling back to direct sync for ${store.shopifyDomain}:`, queueError);
                    await SyncService.fullSync(store.id);
                }
            }
        } catch (error) {
            logger.error('Error in auto-sync job:', error);
        }
    });

    // Daily Full Sync at Midnight (0:00 AM)
    cron.schedule('0 0 * * *', async () => {
        logger.info('Starting scheduled daily full sync via Queue...');
        try {
            const activeStores = await prisma.store.findMany({
                where: { isActive: true }
            });

            for (const store of activeStores) {
                logger.info(`Dispatching sync job for ${store.shopifyDomain}`);
                try {
                    await QueueService.addFullSyncJob(store.id);
                } catch (queueError) {
                    logger.warn(`Queue unavailable, falling back to direct sync for ${store.shopifyDomain}:`, queueError);
                    await SyncService.fullSync(store.id);
                }
            }
            logger.info(`Dispatched sync jobs for ${activeStores.length} stores.`);
        } catch (error) {
            logger.error('Error in dispatching scheduled daily jobs:', error);
        }
    });

    // Hourly Health Check
    cron.schedule('0 * * * *', () => {
        logger.info('Hourly background heartbeat: Active');
    });
}

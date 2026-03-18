import { Queue, Worker } from 'bullmq';
import { SyncService } from './sync.service';
import { logger } from '../config/logger';

// Redis connection details (using the same REDIS_URL from env)
const connection = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const ENABLE_JOBS = process.env.ENABLE_BACKGROUND_JOBS === 'true';

// Queue Definitions
const SYNC_QUEUE_NAME = 'shopify-sync';
const ANALYTICS_QUEUE_NAME = 'analytics-processing';
const WEBHOOK_QUEUE_NAME = 'shopify-webhooks';

// 1. Create Queues
export const syncQueue = ENABLE_JOBS ? new Queue(SYNC_QUEUE_NAME, { connection }) : { add: async () => {} } as any;
export const analyticsQueue = ENABLE_JOBS ? new Queue(ANALYTICS_QUEUE_NAME, { connection }) : { add: async () => {} } as any;
export const webhookQueue = ENABLE_JOBS ? new Queue(WEBHOOK_QUEUE_NAME, { connection }) : { add: async () => {} } as any;

// 2. Define Workers (Processors)
const syncWorker = ENABLE_JOBS ? new Worker(SYNC_QUEUE_NAME, async (job) => {
    const { storeId, type } = job.data;
    logger.info(`[Queue] Processing Sync Job ${job.id}: ${type} for store ${storeId}`);

    try {
        if (type === 'full') {
            await SyncService.fullSync(storeId);
        }
        // Logic for specific types can be added when those methods are exposed
    } catch (error) {
        logger.error(`[Queue] Sync Job ${job.id} Failed:`, error);
        throw error;
    }
}, { connection }) : null;

// Placeholder for future analytics worker
export const analyticsWorker = ENABLE_JOBS ? new Worker(ANALYTICS_QUEUE_NAME, async (job) => {
    const { storeId } = job.data;
    logger.info(`[Queue] Processing Analytics Recalculation for ${storeId}`);
}, { connection }) : null;

// 3. Event Listeners
if (syncWorker) {
    syncWorker.on('completed', (job) => {
        logger.info(`[Queue] Sync Job ${job.id} Completed!`);
    });

    syncWorker.on('failed', (job, err) => {
        logger.error(`[Queue] Sync Job ${job?.id} Failed with ${err.message}`);
    });
}

export class QueueService {
    /**
     * Add a full sync job to the queue
     */
    static async addFullSyncJob(storeId: string) {
        await syncQueue.add('full-sync', { storeId, type: 'full' }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 }
        });
    }

    /**
     * Add analytics refresh job
     */
    static async addAnalyticsJob(storeId: string) {
        await analyticsQueue.add('refresh-analytics', { storeId }, {
            removeOnComplete: true
        });
    }

    /**
     * Add a webhook processing job to the queue
     */
    static async addWebhookJob(storeId: string, topic: string, payload: any) {
        await webhookQueue.add('process-webhook', { storeId, topic, payload }, {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true
        });
    }
}

// 4. Webhook Worker
import { WebhookService } from './webhook.service';

if (ENABLE_JOBS) {
    new Worker(WEBHOOK_QUEUE_NAME, async (job) => {
        const { storeId, topic, payload } = job.data;
        logger.info(`[Queue] Processing Webhook Job ${job.id}: ${topic} for store ${storeId}`);

        try {
            await WebhookService.processWebhook(storeId, topic, payload);
        } catch (error) {
            logger.error(`[Queue] Webhook Job ${job.id} Failed:`, error);
            throw error;
        }
    }, { connection });
}

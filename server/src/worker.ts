import { logger } from './config/logger';
import './config/prisma';
import { initializeRedis } from './services/redis.service';
import { initializeBackgroundJobs } from './jobs';

async function startWorker() {
    await initializeRedis();
    // Initialize standard cron jobs (e.g. daily cleanups)
    await initializeBackgroundJobs();

    logger.info('Background Worker Started');
    // BullMQ workers are initialized when imported in queue.service
    // We might need to explicitly import them to ensure they run
    require('./services/queue.service');
}

startWorker();

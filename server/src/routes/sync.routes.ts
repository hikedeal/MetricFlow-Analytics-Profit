import { Router } from 'express';
import { QueueService } from '../services/queue.service';

const router = Router();

router.post('/sync', async (req, res) => {
    try {
        const { storeId } = (req as any).user!;

        // Dispatch to background queue to prevent timeouts for large stores
        await QueueService.addFullSyncJob(storeId);

        res.json({ success: true, message: 'Sync started in background' });
    } catch (error) {
        console.error('Manual sync failed:', error);
        res.status(500).json({ error: 'Failed to complete sync' });
    }
});

export default router;

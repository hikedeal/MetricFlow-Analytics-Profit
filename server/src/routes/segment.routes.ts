import { Router } from 'express';
import segmentController from '../controllers/segment.controller';

const router = Router();

// Query segment (returns JSON)
router.post('/query', segmentController.querySegment);

// Export segment (returns CSV)
router.post('/export', segmentController.exportSegment);

export default router;

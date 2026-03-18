import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';

export class AdminController {
    /**
     * Get global platform stats
     */
    static async getGlobalStats(req: Request, res: Response, next: NextFunction) {
        try {
            // Simple security header check for now
            // In production, this should be a robust middleware
            const adminKey = req.headers['x-admin-key'];
            if (process.env.ADMIN_SECRET && adminKey !== process.env.ADMIN_SECRET) {
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid Admin Key' });
            }

            const stats = await AdminService.getGlobalStats();
            return res.json({ success: true, data: stats });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * List all stores
     */
    static async getAllStores(req: Request, res: Response, next: NextFunction) {
        try {
            const adminKey = req.headers['x-admin-key'];
            if (process.env.ADMIN_SECRET && adminKey !== process.env.ADMIN_SECRET) {
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid Admin Key' });
            }

            const stores = await AdminService.getAllStores();
            return res.json({ success: true, data: stores });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Download full data dump for a store
     */
    static async getStoreDataDump(req: Request, res: Response, next: NextFunction) {
        try {
            const adminKey = req.headers['x-admin-key'];
            if (process.env.ADMIN_SECRET && adminKey !== process.env.ADMIN_SECRET) {
                return res.status(403).json({ success: false, message: 'Forbidden: Invalid Admin Key' });
            }

            const { storeId } = req.params;
            const dump = await AdminService.generateStoreDataDump(storeId);

            // Set headers for file download
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=store_dump_${storeId}_${Date.now()}.json`);

            return res.json(dump);
        } catch (error) {
            return next(error);
        }
    }
}

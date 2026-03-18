import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../services/alerts.service';

export class AlertController {
    private alertService: AlertService;

    constructor() {
        this.alertService = new AlertService();
    }

    /**
     * Get alerts for the authenticated store
     */
    getAlerts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const alerts = await this.alertService.getAlerts(storeId);

            res.json({
                success: true,
                data: alerts,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Mark alerts as read
     */
    markAsRead = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { alertIds } = req.body;

            await this.alertService.markAsRead(storeId, alertIds);

            res.json({
                success: true,
                message: 'Alerts marked as read',
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Dismiss an alert
     */
    dismiss = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;

            await this.alertService.dismissAlert(storeId, id);

            res.json({
                success: true,
                message: 'Alert dismissed',
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new AlertController();

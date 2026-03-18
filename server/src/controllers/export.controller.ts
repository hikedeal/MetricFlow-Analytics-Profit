import { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service';

export class ExportController {
    private exportService: ExportService;

    constructor() {
        this.exportService = new ExportService();
    }

    /**
     * Handle order export requests
     */
    exportOrders = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const csvData = await this.exportService.exportOrders(
                storeId,
                req.query
            );

            const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(csvData);
        } catch (error) {
            console.error('[ExportController] Order export error:', error);
            next(error);
        }
    };

    /**
     * Handle customer export requests
     */
    exportCustomers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const csvData = await this.exportService.exportCustomers(
                storeId,
                req.query
            );
            const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(csvData);
        } catch (error) {
            console.error('[ExportController] Customer export error:', error);
            next(error);
        }
    };

    /**
     * Handle product export requests
     */
    exportProducts = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const csvData = await this.exportService.exportProducts(storeId, req.query);
            const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(csvData);
        } catch (error) {
            console.error('[ExportController] Product export error:', error);
            next(error);
        }
    };

    /**
     * Handle executive summary export requests
     */
    exportExecutiveSummary = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const csvData = await this.exportService.exportExecutiveSummary(
                storeId,
                startDate as string,
                endDate as string
            );

            const filename = `executive_summary_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(csvData);
        } catch (error) {
            console.error('[ExportController] Executive summary export error:', error);
            next(error);
        }
    };
}

export default new ExportController();

import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import prisma from '../config/prisma';
import { AlertService } from '../services/alerts.service';
import { CurrencyService } from '../services/currency.service';


export class DashboardController {
    private dashboardService: DashboardService;

    private alertService: AlertService;

    constructor() {
        this.dashboardService = new DashboardService();
        this.alertService = new AlertService();
    }

    /**
     * Get comprehensive sales intelligence metrics
     */
    getSalesIntelligence = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate, compareWith } = req.query;

            const metrics = await this.dashboardService.getSalesIntelligence(
                storeId,
                startDate as string,
                endDate as string,
                compareWith as string | undefined
            );

            res.json({
                success: true,
                data: metrics,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get order tag intelligence and categorization
     */
    getOrderTagIntelligence = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const tagData = await this.dashboardService.getOrderTagIntelligence(
                storeId,
                startDate as string,
                endDate as string
            );

            res.json({
                success: true,
                data: tagData,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get customer intelligence metrics
     */
    getCustomerIntelligence = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate, limit = 20 } = req.query;

            const customerData = await this.dashboardService.getCustomerIntelligence(
                storeId,
                startDate as string,
                endDate as string,
                parseInt(limit as string)
            );

            res.json({
                success: true,
                data: customerData,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get sales and order trends
     */
    getSalesTrends = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate, granularity = 'day' } = req.query;

            const trends = await this.dashboardService.getSalesTrends(
                storeId,
                startDate as string,
                endDate as string,
                granularity as 'day' | 'week' | 'month'
            );

            res.json({
                success: true,
                data: trends,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get product performance metrics
     */
    getProductPerformance = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate, limit = 20, sortBy = 'revenue' } = req.query;

            const products = await this.dashboardService.getProductPerformance(
                storeId,
                startDate as string,
                endDate as string,
                parseInt(limit as string),
                sortBy as string
            );

            res.json({
                success: true,
                data: products,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get profit readiness metrics
     */
    getProfitMetrics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const profitData = await this.dashboardService.getProfitMetrics(
                storeId,
                startDate as string,
                endDate as string
            );

            res.json({
                success: true,
                data: profitData,
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get all dashboard data in one call (for initial load)
     */
    getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate, viewType } = req.query;

            const [
                salesIntelligence,
                orderTags,
                customerIntelligence,
                trends,
                productPerformance,
                profitMetrics,
                alerts,
                salesForecast,
                regionalPerformance,
                cancellationIntelligence,
                cohortMetrics,
                funnelMetrics,
                ltvPrediction,
                churnRisk,
                profitabilityCurve,
                marketingMix,
                periodSnapshots,
            ] = await Promise.all([
                this.dashboardService.getSalesIntelligence(storeId, startDate as string, endDate as string),
                this.dashboardService.getOrderTagIntelligence(storeId, startDate as string, endDate as string),
                this.dashboardService.getCustomerIntelligence(storeId, startDate as string, endDate as string, 20),
                this.dashboardService.getSalesTrends(storeId, startDate as string, endDate as string, 'day'),
                this.dashboardService.getProductPerformance(storeId, startDate as string, endDate as string, 20, 'revenue'),
                this.dashboardService.getProfitMetrics(storeId, startDate as string, endDate as string),
                this.alertService.getAlerts(storeId),
                this.dashboardService.getSalesForecast(storeId),
                this.dashboardService.getRegionalPerformance(storeId, startDate as string, endDate as string),
                this.dashboardService.getCancellationIntelligence(storeId, startDate as string, endDate as string),
                this.dashboardService.getCohortMetrics(storeId),
                this.dashboardService.getFunnelMetrics(storeId, startDate as string, endDate as string),
                this.dashboardService.getLTVPrediction(storeId),
                this.dashboardService.getChurnRisk(storeId),
                this.dashboardService.getProfitabilityCurve(storeId),
                this.dashboardService.getMarketingMix(storeId),
                this.dashboardService.getPeriodSnapshots(storeId, viewType as string),
            ]);

            const store = await prisma.store.findUnique({
                where: { id: storeId },
                select: { currency: true }
            });

            const dailyTrend = trends.data || [];
            const todayData = dailyTrend[dailyTrend.length - 1];
            const yesterdayData = dailyTrend[dailyTrend.length - 2];

            res.json({
                success: true,
                data: {
                    storeCurrency: store?.currency || 'USD',
                    salesIntelligence,
                    orderTags,
                    customerIntelligence,
                    trends,
                    productPerformance,
                    profitMetrics,
                    alerts,
                    smartAlerts: alerts, // Map alerts to smartAlerts
                    salesForecast,
                    regionalPerformance,
                    cancellationIntelligence,
                    cohortMetrics,
                    funnelMetrics,
                    ltvPrediction,
                    churnRisk,
                    profitabilityCurve,
                    marketingMix,
                    periodSnapshots,
                    dailySnapshot: {
                        yesterdaySales: yesterdayData?.sales || 0,
                        todaySales: todayData?.sales || 0,
                        orderChange: salesIntelligence?.comparison?.totalOrders || 0,
                        profitChange: salesIntelligence?.comparison?.netSales || 0,
                    },
                    marketingMetrics: {
                        cac: 0,
                        roas: 0,
                        adSpend: 0,
                        contributionMargin: 0,
                    },
                    inventoryRisks: {
                        lowStock: [],
                        outOfStock: 0,
                    },
                    growthOpportunities: [],
                },
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * Get available date range presets
     */
    getDateRangePresets = async (_req: Request, res: Response, next: NextFunction) => {
        try {
            const presets = this.dashboardService.getDateRangePresets();

            res.json({
                success: true,
                data: presets,
            });
        } catch (error) {
            next(error);
        }
    };
    /**
     * Get live currency exchange rates
     */
    getCurrencyRates = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { base } = req.query;
            const rates = await CurrencyService.getExchangeRates(base as string || 'USD');

            res.json({
                success: true,
                data: rates,
            });
        } catch (error) {
            next(error);
        }
    };
}

export default new DashboardController();

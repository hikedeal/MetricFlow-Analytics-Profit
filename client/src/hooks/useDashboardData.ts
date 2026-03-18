import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface SalesMetrics {
    grossSales: number;
    netSales: number;
    netRevenue: number;
    totalOrders: number;
    cancelledOrders: number;
    rtoOrders: number;
    cancellationRate: number;
    refundAmount: number;
    totalDiscounts: number;
    averageOrderValue: number;
    ordersEditedCount: number;
    rtoRate?: number;
    returnRate?: number;
    newCustomerRate?: number;
    repeatCustomerRate: number;
    comparison?: {
        grossSales: number;
        netSales: number;
        totalOrders: number;
        averageOrderValue: number;
        cancellationRate: number;
        rtoRate: number;
        returnRate: number;
        newCustomerRate: number;
        repeatCustomerRate: number;
    };
    dateRange: {
        start: string;
        end: string;
    };
}

export interface TagMetric {
    tag: string;
    count: number;
    totalLoss: number;
    cancelledCount: number;
    rtoCount: number;
}

export interface TrendPoint {
    date: string;
    sales: number;
    orders: number;
    spend?: number;
    profit?: number;
    otherCosts?: number;
    cogs?: number;
    cancelled?: number;
    refunds?: number;
    discounts?: number;
    isForecast?: boolean;
}

export interface CancellationMetrics {
    reasons: { reason: string; count: number; value: number }[];
    byCity: { city: string; count: number }[];
    byPayment: { method: string; count: number; rate: number; value?: number }[];
    byCourier: { partner: string; count: number; rate: number }[];
    lossAmount: number;
    lossBreakdown?: {
        cancellation: { amount: number; count: number };
        rto: { amount: number; count: number };
        returns: { amount: number; count: number };
    };
    insights?: string[];
    rtoTrend: TrendPoint[];
}

export interface ProfitabilityPoint {
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
}

export interface MarketingChannel {
    channel: string;
    spend: number;
    revenue: number;
    roas: number;
}

export interface LTVPoint {
    month: string;
    value: number;
}

export interface ChurnSegment {
    segment: string;
    risk: number;
    count: number;
}

export interface RegionPoint {
    city: string;
    sales: number;
    orders: number;
}

export interface MarketingMetrics {
    cac: number;
    roas: number;
    adSpend: number;
    contributionMargin: number;
}

export interface FunnelMetrics {
    visitors: number;
    addToCart: number;
    checkoutInitiated: number;
    ordersCompleted: number;
}

export interface CohortMetrics {
    retentionCurve: { month: number; rate: number }[];
    repeatPurchaseTrend: TrendPoint[];
}

export interface InventoryRisks {
    lowStock: { title: string; stock: number; revenueRisk: number }[];
    outOfStock: number;
}

export interface SmartAlert {
    id: string;
    type: 'critical' | 'warning' | 'info' | 'success';
    message: string;
    metric?: string;
    change?: number;
}

export interface SmartInsight {
    id: string;
    type: 'positive' | 'negative' | 'neutral';
    title: string;
    description: string;
    impact: string;
    action?: string;
}

export interface BenchmarkData {
    industryAverage: number;
    topPerformers: number;
}

export interface ProfitabilityPoint {
    name: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
    benchmark?: number;
}

export interface MarketingChannel {
    channel: string;
    spend: number;
    revenue: number;
    roas: number;
    benchmark?: number;
}

export interface PeriodSnapshot {
    label: string;
    range: string;
    sales: number;
    orders: number;
    units: number;
    returns: number;
    advCost: number;
    roas: number;
    netProfit: number;
    salesChange: number;
    profitChange: number;
    // Detailed Breakdown
    grossSales: number;
    discounts: number;
    shipping: number;
    tax: number;
    paymentFees: number;
    marketplaceFees: number;
    cogs: number;
    expenses: number;
    grossProfit: number;
    margin: number;
    roi: number;
    poas: number;
    cac: number;
    refundsChange: number;
    sellableReturns: number;
}

export interface DashboardData {
    storeCurrency: string;
    salesIntelligence: SalesMetrics;
    orderTags: {
        tagBreakdown: TagMetric[];
        cancelReasonsBreakdown: { reason: string; count: number }[];
        rtoPercentage: number;
        totalTaggedOrders: number;
    };
    customerIntelligence: {
        topCustomers: any[];
        statistics: any;
        ltv?: { predicted: number; churnRate: number };
    };
    trends: {
        data: TrendPoint[];
        comparison?: TrendPoint[];
        forecast?: any[];
        summary?: {
            totalSales: number;
            prevTotalSales: number;
            totalProfit: number;
            prevTotalProfit: number;
            totalSpend: number;
            prevTotalSpend: number;
        };
    };
    productPerformance: {
        topProducts: any[];
    };
    profitMetrics: any;
    cancellationIntelligence: CancellationMetrics;
    marketingMetrics: MarketingMetrics;
    funnelMetrics: FunnelMetrics;
    cohortMetrics: CohortMetrics;
    inventoryRisks: InventoryRisks;
    smartAlerts: SmartAlert[];
    dailySnapshot: {
        yesterdaySales: number;
        orderChange: number;
        profitChange: number;
    };
    growthOpportunities: { title: string; potential: string; type: string }[];
    profitabilityCurve: ProfitabilityPoint[];
    marketingMix: MarketingChannel[];
    ltvPrediction: LTVPoint[];
    churnRisk: ChurnSegment[];
    regionalPerformance: RegionPoint[];
    periodSnapshots?: PeriodSnapshot[];
    // Advanced Optimization Data
    smartInsights: SmartInsight[];
    benchmarks: Record<string, BenchmarkData>;
    forecasting: {
        predictedRevenue: number;
        predictedOrders: number;
        confidence: number;
    };
    alerts: any[];
}

const fetchDashboardData = async (startDate?: string, endDate?: string, compareWith?: string, viewType?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (compareWith) params.append('compareWith', compareWith);
    if (viewType) params.append('viewType', viewType);

    try {
        const response = await api.get<{ data: DashboardData }>(`/dashboard/overview?${params.toString()}`);
        return response.data.data;
    } catch (error) {
        console.warn("API call failed, returning zero state", error);
        return getZeroData();
    }
};

export function useDashboardData(startDate?: string, endDate?: string, compareWith?: string, viewType?: string) {
    return useQuery({
        queryKey: ['dashboard', startDate, endDate, compareWith, viewType],
        queryFn: () => fetchDashboardData(startDate, endDate, compareWith, viewType),
    });
}

// Zero Data State
// Returns strict zeros when no data is available
const getZeroData = (): DashboardData => {
    return {
        storeCurrency: 'INR',
        salesIntelligence: {
            grossSales: 0,
            netSales: 0,
            netRevenue: 0,
            totalOrders: 0,
            cancelledOrders: 0,
            rtoOrders: 0,
            cancellationRate: 0,
            refundAmount: 0,
            totalDiscounts: 0,
            averageOrderValue: 0,
            ordersEditedCount: 0,
            repeatCustomerRate: 0,
            comparison: {
                grossSales: 0,
                netSales: 0,
                totalOrders: 0,
                averageOrderValue: 0,
                cancellationRate: 0,
                rtoRate: 0,
                returnRate: 0,
                newCustomerRate: 0,
                repeatCustomerRate: 0
            },
            dateRange: { start: '', end: '' }
        },
        orderTags: {
            tagBreakdown: [],
            cancelReasonsBreakdown: [],
            rtoPercentage: 0,
            totalTaggedOrders: 0,
        },
        customerIntelligence: {
            topCustomers: [],
            statistics: {},
            ltv: { predicted: 0, churnRate: 0 }
        },
        trends: {
            data: []
        },
        productPerformance: {
            topProducts: []
        },
        profitMetrics: {
            profit: 0,
            profitMargin: 0,
            totalSales: 0,
            totalExpenses: 0,
            grossProfit: 0,
            cancellationLoss: 0,
        },
        cancellationIntelligence: {
            reasons: [],
            byCity: [],
            byPayment: [],
            byCourier: [],
            lossAmount: 0,
            rtoTrend: []
        },
        marketingMetrics: {
            cac: 0,
            roas: 0,
            adSpend: 0,
            contributionMargin: 0
        },
        funnelMetrics: {
            visitors: 0,
            addToCart: 0,
            checkoutInitiated: 0,
            ordersCompleted: 0
        },
        cohortMetrics: {
            retentionCurve: [],
            repeatPurchaseTrend: []
        },
        inventoryRisks: {
            lowStock: [],
            outOfStock: 0
        },
        smartAlerts: [],
        dailySnapshot: {
            yesterdaySales: 0,
            orderChange: 0,
            profitChange: 0
        },
        growthOpportunities: [],
        profitabilityCurve: [],
        marketingMix: [],
        ltvPrediction: [],
        churnRisk: [],
        regionalPerformance: [],
        smartInsights: [],
        benchmarks: {
            'revenue': { industryAverage: 0, topPerformers: 0 },
            'roas': { industryAverage: 0, topPerformers: 0 },
            'ltv': { industryAverage: 0, topPerformers: 0 }
        },
        forecasting: {
            predictedRevenue: 0,
            predictedOrders: 0,
            confidence: 0
        },
        alerts: []
    };
};

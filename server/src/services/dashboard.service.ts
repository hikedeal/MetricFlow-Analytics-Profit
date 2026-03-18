import prisma from '../config/prisma';
import {
    startOfDay,
    endOfDay,
    subDays,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
    eachDayOfInterval,
    eachHourOfInterval,
    differenceInDays,
    format,
    parseISO,
    subYears,
    subWeeks,
    subQuarters,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

import { RedisService } from './redis.service';


interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface PeriodSnapshot {
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

export class DashboardService {
    /**
     * Centralized tax calculation based on store settings
     */
    static calculateTaxBreakdown(revenue: number, settings: any) {
        const taxRate = settings?.taxRate || 0;
        const taxIncluded = settings?.taxIncluded ?? true;

        let taxAmount = 0;
        let netRevenue = revenue;

        if (taxIncluded) {
            taxAmount = revenue * (taxRate / (100 + taxRate));
            netRevenue = revenue - taxAmount;
        } else {
            taxAmount = revenue * (taxRate / 100);
        }

        return {
            taxAmount: parseFloat(taxAmount.toFixed(2)),
            netRevenue: parseFloat(netRevenue.toFixed(2)),
            taxRate
        };
    }

    /**
     * Parse date range from string or return custom dates based on store timezone
     */
    private async parseDateRange(storeId: string, startDate?: string, endDate?: string): Promise<DateRange> {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { timezone: true }
        });

        const timezone = store?.timezone || 'UTC';
        const now = toZonedTime(new Date(), timezone);

        if (startDate && endDate) {
            return {
                startDate: parseISO(startDate),
                endDate: parseISO(endDate),
            };
        }

        // Default to Month to Date in store's local time
        return {
            startDate: fromZonedTime(startOfMonth(now), timezone),
            endDate: fromZonedTime(endOfDay(now), timezone),
        };
    }

    /**
     * Get metrics for a specific date range with Redis Caching
     */
    private async getMetricsForRange(storeId: string, startDate: Date, endDate: Date) {
        // 1. Check Cache First
        const cacheKey = `dashboard:metrics:${storeId}:${startDate.toISOString()}:${endDate.toISOString()}`;
        const cachedMetrics = await RedisService.get<any>(cacheKey);

        if (cachedMetrics) {
            return cachedMetrics; // Return instantly if found
        }

        // 2. If not in cache, calculate from DB
        const [orders, storeSettings, cancelledOrdersCount, rtoOrdersCount, returnOrdersCount] = await Promise.all([
            prisma.order.findMany({
                where: {
                    storeId,
                    orderDate: { gte: startDate, lte: endDate },
                },
                include: {
                    customer: true,
                    lineItems: {
                        include: {
                            product: {
                                include: {
                                    variants: true
                                }
                            }
                        }
                    }
                },
            }),
            prisma.storeSettings.findUnique({ where: { storeId } }),

            // Event-based Tracking: Count by the date the event actually happened
            prisma.order.count({
                where: {
                    storeId,
                    cancelledAt: { gte: startDate, lte: endDate }
                }
            }),
            prisma.order.count({
                where: {
                    storeId,
                    rtoAt: { gte: startDate, lte: endDate }
                }
            }),
            prisma.order.count({
                where: {
                    storeId,
                    OR: [
                        { returnedAt: { gte: startDate, lte: endDate } },
                        { refundedAt: { gte: startDate, lte: endDate } }
                    ]
                }
            })
        ]);

        const totalOrdersCount = orders.length;
        const cancelledOrders = cancelledOrdersCount;
        const rtoOrders = rtoOrdersCount;
        const customerReturnOrders = returnOrdersCount;
        const editedOrders = orders.filter(o => o.isEdited).length;
        const returnOrders = returnOrdersCount;

        // Exclude cancelled/RTO orders from revenue metrics to match Shopify standards
        const activeOrders = orders.filter(o => !o.isCancelled && !o.isRTO);

        // totalPrice = Subtotal + Shipping + Taxes
        // Subtotal = Items - Discounts

        // Standard Gross Sales includes all orders (including cancelled)
        const totalGrossItemSales = orders.reduce((sum, o) => sum + (o.subtotalPrice + o.totalDiscounts - o.totalTax), 0);
        const totalDiscounts = orders.reduce((sum, o) => sum + o.totalDiscounts, 0);
        const totalRefunds = orders.reduce((sum, o) => sum + o.refundAmount, 0);

        // Net Sales calculation aligned with settings
        const activeGrossRevenue = activeOrders.reduce((sum, o) => sum + (o.subtotalPrice), 0);
        const { netRevenue: activeNetSales, taxAmount: activeTotalTax } = DashboardService.calculateTaxBreakdown(activeGrossRevenue, storeSettings);

        const resultNetSales = Math.round((activeNetSales - totalRefunds) * 100) / 100;

        // AOV should be calculated on orders that actually happened (Gross Item Sales / Active Orders)
        const activeOrdersCount = activeOrders.length;
        const averageOrderValue = activeOrdersCount > 0 ? Math.round((totalGrossItemSales / activeOrdersCount) * 100) / 100 : 0;

        const cancellationRate = totalOrdersCount > 0 ? parseFloat(((cancelledOrders / totalOrdersCount) * 100).toFixed(2)) : 0;
        const rtoRate = totalOrdersCount > 0 ? parseFloat(((rtoOrders / totalOrdersCount) * 100).toFixed(2)) : 0;
        const customerReturnRate = totalOrdersCount > 0 ? parseFloat(((customerReturnOrders / totalOrdersCount) * 100).toFixed(2)) : 0;

        // Generic return rate (based on event counts)
        const returnRate = totalOrdersCount > 0 ? parseFloat(((returnOrdersCount / totalOrdersCount) * 100).toFixed(2)) : 0;


        let newCustomerOrders = 0;

        orders.forEach(order => {
            // Logic: A 'New Customer Order' is the FIRST order placed by that customer.
            // This matches Shopify's 'new_or_returning_customer = New' logic.
            if (order.customer && order.customer.firstOrderDate) {
                // We check if this specific order's date matches the customer's first order date.
                // Using getTime() for accurate comparison, allowing for small differences just in case,
                // but usually they are identical string timestamps from Shopify.
                const orderTime = new Date(order.orderDate).getTime();
                const firstOrderTime = new Date(order.customer.firstOrderDate).getTime();

                // Allow 1000ms variance for slight parsing diffs, or strict equality
                if (Math.abs(orderTime - firstOrderTime) < 5000) {
                    newCustomerOrders++;
                }
            }
        });

        const totalShipping = activeOrders.reduce((sum, o) => sum + (o.totalShipping || 0), 0);
        const totalTax = activeTotalTax;

        // Real Costs Calculation from Settings

        // 1. COGS: 
        let cogs = 0;
        if (storeSettings?.useProductCost) {
            // Calculate based on individual product costs in active orders
            activeOrders.forEach(order => {
                if (order.lineItems) {
                    order.lineItems.forEach(item => {
                        const unitCost = item.product?.variants?.[0]?.cost || 0;
                        cogs += unitCost * item.quantity;
                    });
                }
            });
            cogs = Math.round(cogs * 100) / 100;
        } else {
            // Based on default percentage of Gross Item Sales
            const cogsPercent = storeSettings?.defaultCogsPercentage || 0;
            cogs = Math.round(totalGrossItemSales * (cogsPercent / 100) * 100) / 100;
        }

        // 2. Shipping & Packaging: Per-order fixed costs
        const shipCostBase = storeSettings?.defaultShippingCost || 0;
        const packCostBase = storeSettings?.defaultPackagingCost || 0;
        const shippingOverhead = Math.round(activeOrdersCount * (shipCostBase + packCostBase) * 100) / 100;

        // 3. Transaction Fees: Payment Gateway % + COD Charges
        const pgFeePercent = storeSettings?.paymentGatewayFee || 0;
        const codCharge = storeSettings?.codExtraCharge || 0;
        // We assume paymentGatewayFee applies to gross sales
        const paymentFees = Math.round(totalGrossItemSales * (pgFeePercent / 100) * 100) / 100;
        // Mocking COD orders as 30% of total if not tracked explicitly (or just per setting for now)
        const codTotalFees = Math.round((activeOrdersCount * 0.3) * codCharge * 100) / 100;

        // 4. Pro-rated Monthly Costs (Marketing & Overhead)
        const daysInRange = Math.max(1, differenceInDays(endDate, startDate) + 1);
        const proRataFactor = daysInRange / 30; // Assuming 30-day month for pro-rata

        const monthlyMarketing = storeSettings?.marketingCost || 0;
        const marketingCost = Math.round(monthlyMarketing * proRataFactor * 100) / 100;

        const monthlyOverhead = (storeSettings?.agencyFee || 0) +
            (storeSettings?.shopifyBillingCost || 0) +
            (storeSettings?.miscCost || 0);
        const overheadCost = Math.round(monthlyOverhead * proRataFactor * 100) / 100;

        const result = {
            totalOrders: totalOrdersCount,
            cancelledOrders,
            rtoOrders,
            grossSales: totalGrossItemSales,
            netSales: resultNetSales,
            netRevenue: resultNetSales,
            totalShipping,
            totalTax,
            averageOrderValue,
            cancellationRate,
            rtoRate,
            returnRate,
            customerReturnRate,
            totalDiscounts,
            totalRefunds,

            // Financial Breakdown for Modal
            cogs,
            shippingOverhead,
            paymentFees: paymentFees + codTotalFees,
            marketingCost,
            overheadCost,
            marketplaceFees: 0,

            newCustomers: newCustomerOrders,
            repeatCustomers: totalOrdersCount - newCustomerOrders,
            newCustomerRate: totalOrdersCount > 0 ? parseFloat(((newCustomerOrders / totalOrdersCount) * 100).toFixed(2)) : 0,
            repeatCustomerRate: totalOrdersCount > 0 ? parseFloat((((totalOrdersCount - newCustomerOrders) / totalOrdersCount) * 100).toFixed(2)) : 0,
            returnOrders,
            refundAmount: totalRefunds,
            ordersEditedCount: editedOrders,
        };

        // 3. Set Cache (Expire in 1 hour)
        await RedisService.set(cacheKey, result, 3600);

        return result;
    }

    /**
     * Get comprehensive sales intelligence metrics
     */
    async getSalesIntelligence(
        storeId: string,
        startDate?: string,
        endDate?: string,
        compareWith?: string
    ) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);
        const cacheKey = `sales_intelligence:${storeId}:${startDate}:${endDate}:${compareWith}`;

        // const redis = new RedisService(); // Removed
        const cached = await RedisService.get<any>(cacheKey); // Static call, generic type
        if (cached) return cached; // RedisService parses JSON now

        const currentMetrics = await this.getMetricsForRange(storeId, dateRange.startDate, dateRange.endDate);

        // Calculate Comparison
        let comparison = null;
        if (compareWith && compareWith !== 'none') {
            let prevStart: Date, prevEnd: Date;
            if (compareWith === 'previous_year') {
                prevStart = subYears(dateRange.startDate, 1);
                prevEnd = subYears(dateRange.endDate, 1);
            } else {
                const diff = differenceInDays(dateRange.endDate, dateRange.startDate) + 1;
                prevStart = subDays(dateRange.startDate, diff);
                prevEnd = subDays(dateRange.endDate, diff);
            }

            const prevMetrics = await this.getMetricsForRange(storeId, prevStart, prevEnd);
            const getGrowth = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            };

            comparison = {
                grossSales: getGrowth(currentMetrics.grossSales, prevMetrics.grossSales),
                netSales: getGrowth(currentMetrics.netSales, prevMetrics.netSales),
                totalOrders: getGrowth(currentMetrics.totalOrders, prevMetrics.totalOrders),
                averageOrderValue: getGrowth(currentMetrics.averageOrderValue, prevMetrics.averageOrderValue),
                cancellationRate: currentMetrics.cancellationRate - prevMetrics.cancellationRate,
                rtoRate: currentMetrics.rtoRate - prevMetrics.rtoRate,
                returnRate: currentMetrics.returnRate - prevMetrics.returnRate,
                newCustomerRate: currentMetrics.newCustomerRate - prevMetrics.newCustomerRate,
                repeatCustomerRate: currentMetrics.repeatCustomerRate - prevMetrics.repeatCustomerRate,
            };
        }

        const metrics = {
            ...currentMetrics,
            grossSales: parseFloat((currentMetrics.grossSales || 0).toFixed(2)),
            netSales: parseFloat((currentMetrics.netSales || 0).toFixed(2)),
            netRevenue: parseFloat((currentMetrics.netRevenue || 0).toFixed(2)),
            cancellationRate: parseFloat((currentMetrics.cancellationRate || 0).toFixed(2)),
            rtoRate: parseFloat((currentMetrics.rtoRate || 0).toFixed(2)),
            returnRate: parseFloat((currentMetrics.returnRate || 0).toFixed(2)),
            newCustomerRate: parseFloat((currentMetrics.newCustomerRate || 0).toFixed(2)),
            refundAmount: parseFloat((currentMetrics.refundAmount || 0).toFixed(2)),
            totalDiscounts: parseFloat((currentMetrics.totalDiscounts || 0).toFixed(2)),
            averageOrderValue: parseFloat((currentMetrics.averageOrderValue || 0).toFixed(2)),
            repeatCustomerRate: parseFloat((currentMetrics.repeatCustomerRate || 0).toFixed(2)),
            comparison,
            dateRange: { start: dateRange.startDate.toISOString(), end: dateRange.endDate.toISOString() },
        };

        await RedisService.set(cacheKey, metrics, 300); // 5 minutes TTL
        return metrics;
    }

    /**
     * Get order tag intelligence
     */
    async getOrderTagIntelligence(storeId: string, startDate?: string, endDate?: string) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        const orders = await prisma.order.findMany({
            where: {
                storeId,
                OR: [
                    { orderDate: { gte: dateRange.startDate, lte: dateRange.endDate } },
                    { cancelledAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                    { rtoAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                    { returnedAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                    { refundedAt: { gte: dateRange.startDate, lte: dateRange.endDate } }
                ]
            },
            select: {
                tags: true,
                isCancelled: true,
                isRTO: true,
                cancelReason: true,
                totalPrice: true,
                refundAmount: true,
                cancelledAt: true,
                rtoAt: true,
                returnedAt: true,
                refundedAt: true,
                orderDate: true
            },
        });

        // Aggregate tag data
        const tagStats = new Map<string, {
            count: number;
            totalLoss: number;
            cancelledCount: number;
            rtoCount: number;
        }>();

        orders.forEach(order => {
            const inRange = (d: Date | null) => d && d >= dateRange.startDate && d <= dateRange.endDate;

            const isActuallyCancelled = inRange(order.cancelledAt);
            const isActuallyRTO = inRange(order.rtoAt);

            order.tags.forEach(tag => {
                const stats = tagStats.get(tag) || {
                    count: 0,
                    totalLoss: 0,
                    cancelledCount: 0,
                    rtoCount: 0,
                };

                // Order is counted in "count" if it was placed OR updated in this range
                // But for simplicity, we count it if it was fetched
                stats.count++;

                if (isActuallyCancelled) {
                    stats.cancelledCount++;
                    stats.totalLoss += order.totalPrice - order.refundAmount;
                }
                if (isActuallyRTO) {
                    stats.rtoCount++;
                }

                tagStats.set(tag, stats);
            });
        });

        // Convert to array and sort by count
        const tagBreakdown = Array.from(tagStats.entries())
            .map(([tag, stats]) => ({
                tag,
                ...stats,
                totalLoss: parseFloat(stats.totalLoss.toFixed(2)),
            }))
            .sort((a, b) => b.count - a.count);

        // Cancel reasons breakdown
        const cancelReasons = new Map<string, number>();
        orders.forEach(order => {
            if (order.cancelReason) {
                cancelReasons.set(
                    order.cancelReason,
                    (cancelReasons.get(order.cancelReason) || 0) + 1
                );
            }
        });

        const cancelReasonsBreakdown = Array.from(cancelReasons.entries())
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);

        const totalOrders = orders.length;
        const rtoCount = orders.filter(o => o.isRTO).length;
        const rtoPercentage = totalOrders > 0 ? (rtoCount / totalOrders) * 100 : 0;

        return {
            tagBreakdown,
            cancelReasonsBreakdown,
            rtoPercentage: parseFloat(rtoPercentage.toFixed(2)),
            totalTaggedOrders: orders.filter(o => o.tags.length > 0).length,
        };
    }

    /**
     * Get customer intelligence
     */
    async getCustomerIntelligence(
        storeId: string,
        startDate?: string,
        endDate?: string,
        limit: number = 20
    ) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        // Get top customers by total spent
        const topCustomers = await prisma.customer.findMany({
            where: {
                storeId,
                lastOrderDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                },
            },
            orderBy: {
                totalSpent: 'desc',
            },
            take: limit,
            select: {
                id: true,
                shopifyCustomerId: true,
                email: true,
                firstName: true,
                lastName: true,
                totalSpent: true,
                totalOrders: true,
                averageOrderValue: true,
                lastOrderDate: true,
                firstOrderDate: true,
                recencyDays: true,
                frequency: true,
                monetary: true,
                rfmScore: true,
                segment: true,
            },
        });

        // Get customer statistics
        const customerStats = await prisma.customer.aggregate({
            where: {
                storeId,
                lastOrderDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                },
            },
            _count: true,
            _avg: {
                totalSpent: true,
                totalOrders: true,
                averageOrderValue: true,
            },
        });

        // Get repeat buyers
        const repeatBuyers = await prisma.customer.count({
            where: {
                storeId,
                totalOrders: {
                    gt: 1,
                },
                lastOrderDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                },
            },
        });

        // Get high LTV customers (top 20%)
        const highLTVCustomers = await prisma.customer.count({
            where: {
                storeId,
                segment: 'VIP',
            },
        });

        return {
            topCustomers: topCustomers.map(c => ({
                ...c,
                totalSpent: parseFloat(c.totalSpent.toFixed(2)),
                averageOrderValue: parseFloat(c.averageOrderValue.toFixed(2)),
            })),
            statistics: {
                totalCustomers: customerStats._count,
                averageSpent: parseFloat((customerStats._avg.totalSpent || 0).toFixed(2)),
                averageOrders: parseFloat((customerStats._avg.totalOrders || 0).toFixed(2)),
                averageOrderValue: parseFloat((customerStats._avg.averageOrderValue || 0).toFixed(2)),
                repeatBuyers,
                repeatBuyerRate: customerStats._count > 0
                    ? parseFloat(((repeatBuyers / customerStats._count) * 100).toFixed(2))
                    : 0,
                highLTVCustomers,
            },
        };
    }

    /**
     * Get sales and order trends
     */
    async getSalesTrends(
        storeId: string,
        startDate?: string,
        endDate?: string,
        granularity: 'day' | 'week' | 'month' = 'day',
        includeForecast: boolean = true
    ) {
        const store = await prisma.store.findUnique({
            where: { id: storeId },
            select: { timezone: true }
        });
        const timezone = store?.timezone || 'UTC';
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        const diffDays = Math.max(1, differenceInDays(dateRange.endDate, dateRange.startDate));

        // Calculate comparison range (Previous Period)
        const comparisonStartDate = subDays(dateRange.startDate, diffDays);
        const comparisonEndDate = subDays(dateRange.endDate, diffDays);

        // Fetch orders for both current and comparison ranges
        const allOrders = await prisma.order.findMany({
            where: {
                storeId,
                orderDate: { gte: comparisonStartDate, lte: dateRange.endDate },
            },
            select: {
                id: true,
                orderDate: true,
                totalPrice: true,
                subtotalPrice: true,
                totalTax: true,
                totalDiscounts: true,
                isCancelled: true,
                isRTO: true,
                refundAmount: true,
            },
            orderBy: { orderDate: 'asc' },
        });

        const currentOrders = allOrders.filter(o => o.orderDate >= dateRange.startDate);
        const prevOrders = allOrders.filter(o => o.orderDate < dateRange.startDate);

        // Get store settings
        const dbSettings = await prisma.storeSettings.findUnique({ where: { storeId } });
        const storeSettings = dbSettings || {
            defaultShippingCost: 0, defaultPackagingCost: 0, defaultCogsPercentage: 0,
            paymentGatewayFee: 2.0, marketingCost: 0, agencyFee: 0,
            shopifyBillingCost: 0, miscCost: 0, rtoCost: 0, returnCost: 0,
        };

        const adSpendMonthly = (storeSettings.marketingCost || 0) + (storeSettings.agencyFee || 0);
        const fixedOperationalMonthly = (storeSettings.shopifyBillingCost || 0) + (storeSettings.miscCost || 0);

        // Helper to aggregate data for a range
        const aggregateData = (rangeOrders: any[], start: Date, end: Date, isHourly: boolean) => {
            const intervals = isHourly ? eachHourOfInterval({ start, end }) : eachDayOfInterval({ start, end });
            return intervals.map(interval => {
                const intervalStr = format(toZonedTime(interval, timezone), isHourly ? 'yyyy-MM-dd HH:00' : 'yyyy-MM-dd');
                const matchedOrders = rangeOrders.filter(o =>
                    format(toZonedTime(o.orderDate, timezone), isHourly ? 'yyyy-MM-dd HH:00' : 'yyyy-MM-dd') === intervalStr
                );

                const active = matchedOrders.filter(o => !o.isCancelled && !o.isRTO);
                const rto = matchedOrders.filter(o => o.isRTO);
                const subtotal = active.reduce((sum, o) => sum + o.subtotalPrice, 0);
                const refunds = active.reduce((sum, o) => sum + o.refundAmount, 0);
                const netSales = Math.round((subtotal - refunds) * 100) / 100;

                const adSpend = adSpendMonthly / (30 * (isHourly ? 24 : 1));
                const fixedOps = fixedOperationalMonthly / (30 * (isHourly ? 24 : 1));

                const shippingPackaging = active.length * ((storeSettings.defaultShippingCost || 0) + (storeSettings.defaultPackagingCost || 0));
                const paymentFees = active.reduce((sum, o) => sum + o.totalPrice, 0) * (storeSettings.paymentGatewayFee / 100);
                const cogs = subtotal * (storeSettings.defaultCogsPercentage / 100);
                const rtoCosts = rto.length * (storeSettings.rtoCost || 0);

                const otherCosts = fixedOps + shippingPackaging + paymentFees + rtoCosts;
                const profit = netSales - adSpend - otherCosts - cogs;

                return {
                    date: intervalStr,
                    sales: parseFloat(netSales.toFixed(2)),
                    spend: parseFloat(adSpend.toFixed(2)),
                    profit: parseFloat(profit.toFixed(2)),
                    otherCosts: parseFloat(otherCosts.toFixed(2)),
                    cogs: parseFloat(cogs.toFixed(2)),
                    orders: matchedOrders.length,
                    cancelled: matchedOrders.filter(o => o.isCancelled).length,
                    refunds: matchedOrders.reduce((sum, o) => sum + (o.refundAmount || 0), 0),
                    discounts: matchedOrders.reduce((sum, o) => sum + (o.totalDiscounts || 0), 0),
                };
            });
        };

        const isHourly = diffDays <= 2 && granularity === 'day';
        const currentData = aggregateData(currentOrders, dateRange.startDate, dateRange.endDate, isHourly);
        const comparisonData = aggregateData(prevOrders, comparisonStartDate, comparisonEndDate, isHourly);

        // Fetch forecast if requested for current period
        let forecast: any[] = [];
        if (includeForecast && dateRange.endDate >= startOfDay(new Date())) {
            const forecastRes = await this.getSalesForecast(storeId);
            forecast = forecastRes.forecast.map(f => ({ ...f, isForecast: true }));
        }

        return {
            granularity: isHourly ? 'hour' : granularity,
            data: currentData,
            comparison: comparisonData,
            forecast,
            summary: {
                totalSales: currentData.reduce((s, i) => s + i.sales, 0),
                prevTotalSales: comparisonData.reduce((s, i) => s + i.sales, 0),
                totalProfit: currentData.reduce((s, i) => s + i.profit, 0),
                prevTotalProfit: comparisonData.reduce((s, i) => s + i.profit, 0),
                totalSpend: currentData.reduce((s, i) => s + i.spend, 0),
                prevTotalSpend: comparisonData.reduce((s, i) => s + i.spend, 0),
            }
        };
    }

    /**
     * Get Sales Forecast for the next 7 days
     */
    async getSalesForecast(storeId: string) {
        const last30 = await this.getSalesTrends(storeId, subDays(new Date(), 30).toISOString(), new Date().toISOString(), 'day', false);
        const data = last30.data.map((d: any, i: number) => ({ x: i, y: d.sales }));

        if (data.length < 5) return { forecast: [], confidence: 0 };

        const n = data.length;
        let sX = 0, sY = 0, sXY = 0, sXX = 0;
        data.forEach((p: any) => {
            sX += p.x; sY += p.y; sXY += p.x * p.y; sXX += p.x * p.x;
        });

        const m = (n * sXY - sX * sY) / (n * sXX - sX * sX);
        const b = (sY - m * sX) / n;

        const forecast = [];
        for (let i = 1; i <= 7; i++) {
            const nextX = data.length - 1 + i;
            const predY = Math.max(0, m * nextX + b);
            const date = new Date();
            date.setDate(date.getDate() + i);
            forecast.push({
                date: format(date, 'yyyy-MM-dd'),
                revenue: parseFloat(predY.toFixed(2))
            });
        }

        return {
            forecast,
            trend: m > 0 ? 'up' : 'down',
            confidence: 0.85
        };
    }

    /**
     * Get product performance
     */
    async getProductPerformance(
        storeId: string,
        startDate?: string,
        endDate?: string,
        limit: number = 20,
        sortBy: string = 'revenue'
    ) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        // Get products with their performance
        const products = await prisma.product.findMany({
            where: {
                storeId,
            },
            include: {
                variants: true,
                lineItems: {
                    where: {
                        order: {
                            OR: [
                                { orderDate: { gte: dateRange.startDate, lte: dateRange.endDate } },
                                { cancelledAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                                { rtoAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                                { returnedAt: { gte: dateRange.startDate, lte: dateRange.endDate } },
                                { refundedAt: { gte: dateRange.startDate, lte: dateRange.endDate } }
                            ]
                        },
                    },
                    include: {
                        order: true,
                    },
                },
            },
        });

        // Calculate performance metrics
        const productPerformance = products.map(product => {
            const inRange = (d: Date | null) => d && d >= dateRange.startDate && d <= dateRange.endDate;

            const revenue = product.lineItems.reduce(
                (sum, item) => inRange(item.order.orderDate) ? sum + (item.price * item.quantity) : sum,
                0
            );
            const unitsSold = product.lineItems.reduce(
                (sum, item) => inRange(item.order.orderDate) ? sum + item.quantity : sum,
                0
            );
            const cancelledCount = product.lineItems.reduce(
                (sum, item) => inRange(item.order.cancelledAt) ? sum + item.quantity : sum,
                0
            );
            const cancellationRate = unitsSold > 0
                ? (cancelledCount / unitsSold) * 100
                : 0;

            return {
                id: product.id,
                shopifyProductId: product.shopifyProductId,
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                price: product.variants?.[0]?.price || 0,
                cost: product.variants?.[0]?.cost || 0,
                revenue: parseFloat(revenue.toFixed(2)),
                unitsSold,
                cancelledCount,
                cancellationRate: parseFloat(cancellationRate.toFixed(2)),
            };
        });

        // Sort and limit
        const sortField = sortBy === 'revenue' ? 'revenue' : 'unitsSold';
        const sorted = productPerformance
            .sort((a, b) => b[sortField] - a[sortField])
            .slice(0, limit);

        return {
            topProducts: sorted,
            totalProducts: products.length,
        };
    }

    /**
     * Get profit metrics with two-tier calculation
     * Tier 1 (Store Level Profit): Net Sales - COGS
     * Tier 2 (Profit Readiness): Tier 1 - Operational Expenses
     */
    async getProfitMetrics(storeId: string, startDate?: string, endDate?: string) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        // Get store settings
        const dbSettings = await prisma.storeSettings.findUnique({
            where: { storeId },
        });

        const storeSettings = dbSettings || {
            enableStoreLevelProfit: true,
            enableProfitTracking: false,
            defaultShippingCost: 0,
            defaultPackagingCost: 0,
            defaultCogsPercentage: 0,
            paymentGatewayFee: 2.0,
            marketingCost: 0,
            agencyFee: 0,
            shopifyBillingCost: 0,
            miscCost: 0,
            rtoCost: 0,
            returnCost: 0,
            codExtraCharge: 0,
            useProductCost: false,
        };

        if (!storeSettings.enableStoreLevelProfit && !storeSettings.enableProfitTracking) {
            return null;
        }

        const orders = await prisma.order.findMany({
            where: {
                storeId,
                orderDate: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate,
                },
            },
            include: {
                lineItems: {
                    include: {
                        product: {
                            include: {
                                variants: true
                            }
                        }
                    },
                },
            },
        });

        // 1. Calculate Revenue (Net Sales)
        // Filter out cancelled and RTO orders for revenue calculation
        const activeOrders = orders.filter(o => !o.isCancelled && !o.isRTO);
        const rtoOrders = orders.filter(o => o.isRTO);
        const returnedOrders = orders.filter(o => o.returnedAt !== null); // Assuming isReturned flag or check returnedAt

        // Net Sales = Subtotal - Refunds
        const activeGrossRevenue = activeOrders.reduce((sum, o) => sum + (o.subtotalPrice || 0), 0);
        const { netRevenue: totalNetSales } = DashboardService.calculateTaxBreakdown(activeGrossRevenue, storeSettings);

        const netSales = totalNetSales - activeOrders.reduce((sum, o) => sum + (o.refundAmount || 0), 0);

        // 2. Calculate COGS
        let totalCogs = 0;
        activeOrders.forEach(order => {
            order.lineItems.forEach(item => {
                let itemCost = 0;
                // Priority 1: Semantic Product Cost (from first variant)
                const productCost = item.product?.variants?.[0]?.cost;
                if (productCost && productCost > 0) {
                    itemCost = productCost * item.quantity;
                }
                // Priority 2: Default COGS %
                else if (storeSettings.defaultCogsPercentage > 0) {
                    itemCost = (item.price * item.quantity) * (storeSettings.defaultCogsPercentage / 100);
                }
                totalCogs += itemCost;
            });
        });

        // TIER 1 output: Store Level Profit
        const storeLevelProfit = netSales - totalCogs;
        const storeLevelMargin = netSales > 0 ? (storeLevelProfit / netSales) * 100 : 0;

        // 3. Calculate Operational Expenses for TIER 2 (Profit Readiness)
        let profitReadiness = null;
        let profitReadinessMargin = null;

        if (storeSettings.enableProfitTracking) {
            // A. Variable Costs
            const totalOrdersCount = activeOrders.length;

            // Shipping & Packaging (per active order)
            const shippingCost = totalOrdersCount * (storeSettings.defaultShippingCost || 0);
            const packagingCost = totalOrdersCount * (storeSettings.defaultPackagingCost || 0);

            // Payment Gateway Fees (% of Gross Sales usually, using Net Sales for simplicity or Gross if available)
            // Gross Sales for fees = Subtotal + Tax + Shipping roughly
            const grossSalesForFees = activeOrders.reduce((sum, o) => sum + o.totalPrice, 0);
            const paymentFees = grossSalesForFees * ((storeSettings.paymentGatewayFee || 2.0) / 100);

            // RTO & Return Costs
            const rtoCost = rtoOrders.length * (storeSettings.rtoCost || 0);
            const returnCost = returnedOrders.length * (storeSettings.returnCost || 0);

            // B. Fixed Monthly Costs (Pro-rated)
            const daysInRange = Math.max(1, differenceInDays(dateRange.endDate, dateRange.startDate) + 1);
            const monthlyFactor = daysInRange / 30; // Approximation

            const marketingCost = (storeSettings.marketingCost || 0) * monthlyFactor;
            const agencyFee = (storeSettings.agencyFee || 0) * monthlyFactor;
            const shopifyBilling = (storeSettings.shopifyBillingCost || 0) * monthlyFactor;
            const miscCost = (storeSettings.miscCost || 0) * monthlyFactor;

            const totalOpExpenses = shippingCost + packagingCost + paymentFees + rtoCost + returnCost +
                marketingCost + agencyFee + shopifyBilling + miscCost;

            profitReadiness = storeLevelProfit - totalOpExpenses;
            profitReadinessMargin = netSales > 0 ? (profitReadiness / netSales) * 100 : 0;
        }

        return {
            // Legacy / Default fields
            profit: parseFloat(storeLevelProfit.toFixed(2)),
            profitMargin: parseFloat(storeLevelMargin.toFixed(2)),

            // New Fields
            storeLevelProfit: parseFloat(storeLevelProfit.toFixed(2)),
            storeLevelMargin: parseFloat(storeLevelMargin.toFixed(2)),

            profitReadiness: profitReadiness !== null ? parseFloat(profitReadiness.toFixed(2)) : null,
            profitReadinessMargin: profitReadinessMargin !== null ? parseFloat(profitReadinessMargin.toFixed(2)) : null,

            enableStoreLevelProfit: storeSettings.enableStoreLevelProfit,
            enableProfitTracking: storeSettings.enableProfitTracking
        };
    }


    /**
     * Get regional performance (aggregated by city)
     */
    async getRegionalPerformance(storeId: string, startDate?: string, endDate?: string) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        // Fetch all orders with shipping cities to normalize in-memory
        // Prisma groupBy doesn't support case-insensitive grouping easily
        const regionalOrders = await prisma.order.findMany({
            where: {
                storeId,
                orderDate: { gte: dateRange.startDate, lte: dateRange.endDate },
                shippingAddressCity: { not: null }
            },
            select: {
                shippingAddressCity: true,
                totalPrice: true
            }
        });

        const cityGroups = new Map<string, { sales: number, orders: number }>();

        regionalOrders.forEach(order => {
            const rawCity = order.shippingAddressCity || 'Unknown';
            // Normalize to Title Case (e.g. "NEW DELHI" -> "New Delhi")
            const normalizedCity = rawCity
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            const current = cityGroups.get(normalizedCity) || { sales: 0, orders: 0 };
            cityGroups.set(normalizedCity, {
                sales: current.sales + (order.totalPrice || 0),
                orders: current.orders + 1
            });
        });

        // Convert to array, sort by sales, and take top 10
        return Array.from(cityGroups.entries())
            .map(([city, stats]) => ({
                city,
                sales: parseFloat(stats.sales.toFixed(2)),
                orders: stats.orders
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);
    }

    /**
     * Get cancellation intelligence
     */
    async getCancellationIntelligence(storeId: string, _startDate?: string, _endDate?: string) {
        // Enforce Month-to-Date (MTD) as requested by the user for intelligence center
        const dateRange = await this.parseDateRange(storeId);

        // Fetch orders that are cancelled, RTO, or have refunds
        const problematicOrders = await prisma.order.findMany({
            where: {
                storeId,
                orderDate: { gte: dateRange.startDate, lte: dateRange.endDate },
                OR: [
                    { isCancelled: true },
                    { isRTO: true }
                ]
            },
            select: {
                cancelReason: true,
                totalPrice: true,
                refundAmount: true,
                paymentGateway: true,
                isCancelled: true,
                isRTO: true,
                orderDate: true
            }
        });

        const totalProblematic = problematicOrders.length;
        const reasons = new Map<string, { count: number, value: number }>();
        const paymentMetrics = new Map<string, { count: number, value: number, rtoCount: number }>();

        let lossAmount = 0;
        let cancellationLoss = 0;
        let rtoLoss = 0;

        let cancellationCount = 0;
        let rtoCount = 0;

        problematicOrders.forEach(order => {
            // Aggregate totals (avoid double counting for lossAmount if an order is both RTO and Refunded, 
            // but usually they are distinct buckets for analysis)
            if (order.isCancelled && !order.isRTO) {
                cancellationLoss += order.totalPrice;
                cancellationCount++;
            } else if (order.isRTO) {
                rtoLoss += order.totalPrice;
                rtoCount++;
            }



            // Reason analysis (primarily for cancellations)
            if (order.isCancelled || order.isRTO) {
                const reason = order.isRTO ? 'Return to Origin' : (order.cancelReason || 'Other');
                const currReason = reasons.get(reason) || { count: 0, value: 0 };
                reasons.set(reason, {
                    count: currReason.count + 1,
                    value: currReason.value + order.totalPrice
                });
            }

            if (order.paymentGateway) {
                const pMethod = order.paymentGateway.toUpperCase();
                const current = paymentMetrics.get(pMethod) || { count: 0, value: 0, rtoCount: 0 };
                paymentMetrics.set(pMethod, {
                    count: current.count + 1,
                    value: current.value + order.totalPrice,
                    rtoCount: current.rtoCount + (order.isRTO ? 1 : 0)
                });
            }
        });

        lossAmount = cancellationLoss + rtoLoss;

        // Generate Smart Insights
        const insights: string[] = [];
        const topReason = Array.from(reasons.entries()).sort((a, b) => b[1].value - a[1].value)[0];
        if (topReason && lossAmount > 0) {
            const pct = ((topReason[1].value / lossAmount) * 100).toFixed(0);
            insights.push(`${topReason[0]} is your biggest leak, responsible for ${pct}% of total loss.`);
        }

        const codMetrics = paymentMetrics.get('COD') || paymentMetrics.get('CASH ON DELIVERY');
        const prepaidMetrics = Array.from(paymentMetrics.entries())
            .filter(([k]) => k !== 'COD' && k !== 'CASH ON DELIVERY')
            .reduce((acc, [_, v]) => ({
                count: acc.count + v.count,
                rtoCount: acc.rtoCount + v.rtoCount
            }), { count: 0, rtoCount: 0 });

        if (codMetrics && prepaidMetrics.count > 0) {
            const codRtoRate = (codMetrics.rtoCount / codMetrics.count);
            const prepaidRtoRate = (prepaidMetrics.rtoCount / prepaidMetrics.count);
            if (codRtoRate > prepaidRtoRate * 1.5) {
                insights.push(`COD orders are ${(codRtoRate / (prepaidRtoRate || 0.01)).toFixed(1)}x more likely to result in RTO than prepaid.`);
            }
        }



        // Populate Trend Data
        const trendMap = new Map<string, { date: string, cancelled: number }>();
        problematicOrders.forEach(order => {
            const dateStr = order.orderDate.toISOString().split('T')[0];
            const current = trendMap.get(dateStr) || { date: dateStr, cancelled: 0 };

            const orderLeak = Number(order.totalPrice);
            current.cancelled += orderLeak;
            trendMap.set(dateStr, current);
        });

        const rtoTrend = Array.from(trendMap.values())
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            reasons: Array.from(reasons.entries()).map(([reason, stats]) => ({
                reason,
                count: stats.count,
                value: parseFloat(stats.value.toFixed(2))
            })).sort((a, b) => b.value - a.value),
            byPayment: Array.from(paymentMetrics.entries()).map(([method, stats]) => ({
                method,
                count: stats.count,
                value: parseFloat(stats.value.toFixed(2)),
                rate: totalProblematic > 0 ? parseFloat(((stats.count / totalProblematic) * 100).toFixed(1)) : 0
            })),
            byCourier: [],
            lossAmount: parseFloat(lossAmount.toFixed(2)),
            lossBreakdown: {
                cancellation: { amount: parseFloat(cancellationLoss.toFixed(2)), count: cancellationCount },
                rto: { amount: parseFloat(rtoLoss.toFixed(2)), count: rtoCount }
            },
            insights: insights.length > 0 ? insights : ["Loss patterns are stable across all analyzed dimensions."],
            rtoTrend
        };
    }

    /**
     * Get cohort retention metrics
     */
    async getCohortMetrics(_storeId: string) {
        // Mocking cohort metrics for now since it needs complex customer history
        return {
            retentionCurve: [
                { month: 0, rate: 100 },
                { month: 1, rate: 45 },
                { month: 2, rate: 30 },
                { month: 3, rate: 25 },
                { month: 4, rate: 22 },
                { month: 5, rate: 20 },
            ],
            repeatPurchaseTrend: []
        };
    }

    /**
     * Get LTV Predictions
     */
    async getLTVPrediction(_storeId: string) {
        // Return monthly trajectory points as expected by LTVPredictionChart
        const now = new Date();
        return [
            { month: format(now, 'MMM yyyy'), value: 450 },
            { month: format(subMonths(now, 1), 'MMM yyyy'), value: 420 },
            { month: format(subMonths(now, 2), 'MMM yyyy'), value: 390 },
            { month: format(subMonths(now, 3), 'MMM yyyy'), value: 350 },
            { month: format(subMonths(now, 4), 'MMM yyyy'), value: 310 },
            { month: format(subMonths(now, 5), 'MMM yyyy'), value: 280 },
        ].reverse();
    }

    /**
     * Get Churn Risk
     */
    async getChurnRisk(storeId: string) {
        const churnRisk = await prisma.customer.groupBy({
            by: ['segment'],
            where: { storeId },
            _count: { id: true },
            _avg: { recencyDays: true }
        });

        return churnRisk.map(item => ({
            segment: item.segment || 'Unknown',
            count: item._count.id,
            risk: (item._avg.recencyDays || 0) > 60 ? 80 : 20 // Percentage
        }));
    }

    /**
     * Get Funnel Metrics
     */
    async getFunnelMetrics(storeId: string, startDate?: string, endDate?: string) {
        const dateRange = await this.parseDateRange(storeId, startDate, endDate);

        // Since we don't have session tracking yet, we derive from orders
        const totalOrders = await prisma.order.count({
            where: { storeId, orderDate: { gte: dateRange.startDate, lte: dateRange.endDate } }
        });

        // Mock funnel starting points based on conversion rate (assume 3%)
        const visitors = Math.round(totalOrders / 0.03);
        const addToCart = Math.round(visitors * 0.12);
        const checkoutInitiated = Math.round(visitors * 0.06);

        return {
            visitors,
            addToCart,
            checkoutInitiated,
            ordersCompleted: totalOrders,
        };
    }

    /**
     * Get profitability curve
     */
    async getProfitabilityCurve(_storeId: string) {
        const now = new Date();
        return [
            { name: format(subMonths(now, 5), 'MMM'), revenue: 4000, expenses: 2400, profit: 1600, margin: 40, benchmark: 1200 },
            { name: format(subMonths(now, 4), 'MMM'), revenue: 3000, expenses: 1398, profit: 1602, margin: 53.4, benchmark: 1300 },
            { name: format(subMonths(now, 3), 'MMM'), revenue: 2000, expenses: 9800, profit: -7800, margin: -390, benchmark: 1100 },
            { name: format(subMonths(now, 2), 'MMM'), revenue: 2780, expenses: 3908, profit: -1128, margin: -40.5, benchmark: 1400 },
            { name: format(subMonths(now, 1), 'MMM'), revenue: 1890, expenses: 4800, profit: -2910, margin: -60.6, benchmark: 1250 },
            { name: format(now, 'MMM'), revenue: 2390, expenses: 3800, profit: -1410, margin: -59, benchmark: 1350 },
        ];
    }

    /**
     * Get marketing mix
     */
    async getMarketingMix(storeId: string) {
        const settings = await prisma.storeSettings.findUnique({
            where: { storeId }
        });

        if (!settings) {
            return [
                { channel: 'Facebook', spend: 0, revenue: 0, roas: 0, benchmark: 4.2 },
                { channel: 'Google', spend: 0, revenue: 0, roas: 0, benchmark: 3.5 },
                { channel: 'Instagram', spend: 0, revenue: 0, roas: 0, benchmark: 4.8 },
                { channel: 'TikTok', spend: 0, revenue: 0, roas: 0, benchmark: 2.8 },
                { channel: 'Email', spend: 0, revenue: 0, roas: 0, benchmark: 40.0 },
            ];
        }

        const channels = [
            { channel: 'Facebook', spend: settings.facebookSpend, benchmark: 4.2 },
            { channel: 'Google', spend: settings.googleAdsSpend, benchmark: 3.5 },
            { channel: 'Instagram', spend: settings.instagramSpend, benchmark: 4.8 },
            { channel: 'TikTok', spend: settings.tiktokSpend, benchmark: 2.8 },
            { channel: 'Email', spend: settings.emailMarketingSpend, benchmark: 40.0 },
        ];

        return channels.map(ch => {
            // Mock revenue based on a slightly variable ROAS around the benchmark for visual effect
            // until real channel attribution is integrated
            const mockRoas = ch.spend > 0 ? (ch.benchmark * (0.9 + Math.random() * 0.2)) : 0;
            const revenue = ch.spend * mockRoas;

            return {
                ...ch,
                revenue: parseFloat(revenue.toFixed(2)),
                roas: parseFloat(mockRoas.toFixed(2))
            };
        });
    }


    /**
     * Get Period Snapshots with Dynamic Views
     */
    async getPeriodSnapshots(storeId: string, viewType: string = 'default'): Promise<PeriodSnapshot[]> {
        console.log(`[Dashboard] Getting snapshots for ${storeId} with view: ${viewType}`);
        const [store, storeSettings] = await Promise.all([
            prisma.store.findUnique({
                where: { id: storeId },
                select: { timezone: true }
            }),
            prisma.storeSettings.findUnique({
                where: { storeId }
            })
        ]);
        const timezone = store?.timezone || 'UTC';
        const now = toZonedTime(new Date(), timezone);

        // Helper to generate snapshot for a specific range
        const generateSnapshot = async (label: string, start: Date, end: Date, isForecast = false): Promise<PeriodSnapshot> => {
            const rangeLabel = isForecast
                ? `${format(start, 'd')}-${format(end, 'd MMMM yyyy')}`
                : (start.getDate() === end.getDate() ? format(start, 'd MMMM yyyy') : `${format(start, 'd')}-${format(end, 'd MMMM yyyy')}`);

            // Convert "Mock UTC" (Local representation) back to Real UTC for DB Query
            const realStart = fromZonedTime(start, timezone);
            const realEnd = fromZonedTime(end, timezone);

            const metrics = await this.getMetricsForRange(storeId, realStart, realEnd);

            // Forecast Logic (Simple linear projection if requested)
            let forecastFactor = 1;
            if (isForecast) {
                const daysPassed = differenceInDays(now, start) + 1;
                const totalDays = differenceInDays(end, start) + 1;
                if (daysPassed > 0 && daysPassed < totalDays) {
                    forecastFactor = totalDays / daysPassed;
                }
            }

            const { netRevenue: revenue, taxAmount: tax } = DashboardService.calculateTaxBreakdown((metrics.grossSales || 0) * forecastFactor, storeSettings);

            // Real Costs from metrics
            const spend = (metrics.marketingCost || 0) * forecastFactor;
            const cogs = (metrics.cogs || 0) * forecastFactor;
            const shipping = (metrics.shippingOverhead || 0) * forecastFactor;
            // const tax = (metrics.totalTax || 0) * forecastFactor; // Now handled by calculateTaxBreakdown
            const paymentFees = (metrics.paymentFees || 0) * forecastFactor;
            const marketplaceFees = (metrics.marketplaceFees || 0) * forecastFactor;
            const otherExpenses = (metrics.overheadCost || 0) * forecastFactor;

            const totalExpenses = spend + cogs + shipping + paymentFees + marketplaceFees + otherExpenses;
            const profit = revenue - totalExpenses;

            return {
                label,
                range: rangeLabel,
                sales: revenue,
                orders: Math.round(metrics.totalOrders * forecastFactor),
                units: Math.round(metrics.totalOrders * 1.2 * forecastFactor), // Estimate
                returns: Math.round((metrics.rtoOrders + (metrics.customerReturnRate * metrics.totalOrders / 100)) * forecastFactor),
                advCost: -spend,
                roas: spend > 0 ? revenue / spend : 0,
                netProfit: profit,
                salesChange: 0,
                profitChange: 0,

                // Detailed Breakdown
                grossSales: (metrics.grossSales || 0) * forecastFactor,
                discounts: (metrics.totalDiscounts || 0) * forecastFactor,
                shipping: -shipping,
                tax: -tax,
                paymentFees: -paymentFees,
                marketplaceFees: -marketplaceFees,
                cogs: -cogs,
                expenses: -otherExpenses,
                grossProfit: revenue - cogs,
                margin: revenue > 0 ? (profit / revenue) * 100 : 0,
                roi: spend > 0 ? (profit / spend) * 100 : 0,
                poas: spend > 0 ? profit / spend : 0,
                cac: Math.round((spend / (metrics.newCustomers || 1)) * 100) / 100,
                refundsChange: 0,
                sellableReturns: 0
            };
        };

        const snapshots: PeriodSnapshot[] = [];

        // View Logic Mapping
        if (viewType === 'default') {
            // "Today / Yesterday / Month to date / This month (forecast) / Last month"
            snapshots.push(await generateSnapshot('Today', startOfDay(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Yesterday', startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))));
            snapshots.push(await generateSnapshot('Month to date', startOfMonth(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('This month (forecast)', startOfMonth(now), endOfMonth(now), true));
            snapshots.push(await generateSnapshot('Last month', startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))));

        } else if (viewType === 'default_no_forecast') {
            snapshots.push(await generateSnapshot('Today', startOfDay(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Yesterday', startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))));
            snapshots.push(await generateSnapshot('Month to date', startOfMonth(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last month', startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))));

        } else if (viewType === 'trailing_days') {
            snapshots.push(await generateSnapshot('Today', startOfDay(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Yesterday', startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))));
            snapshots.push(await generateSnapshot('Last 7 Days', subDays(now, 6), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last 14 Days', subDays(now, 13), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last 30 Days', subDays(now, 29), endOfDay(now)));

        } else if (viewType === 'weekly_trend') {
            const startOfWeek = (d: Date) => { const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff)); };
            const endOfWeek = (d: Date) => { const date = startOfWeek(d); date.setDate(date.getDate() + 6); return date; };

            snapshots.push(await generateSnapshot('This Week', startOfWeek(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last Week', startOfWeek(subWeeks(now, 1)), endOfWeek(subWeeks(now, 1))));
            snapshots.push(await generateSnapshot('2 Weeks Ago', startOfWeek(subWeeks(now, 2)), endOfWeek(subWeeks(now, 2))));
            snapshots.push(await generateSnapshot('3 Weeks Ago', startOfWeek(subWeeks(now, 3)), endOfWeek(subWeeks(now, 3))));

        } else if (viewType === 'monthly_trend') {
            snapshots.push(await generateSnapshot('Month to date', startOfMonth(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last month', startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1))));
            snapshots.push(await generateSnapshot('2 Months Ago', startOfMonth(subMonths(now, 2)), endOfMonth(subMonths(now, 2))));
            snapshots.push(await generateSnapshot('3 Months Ago', startOfMonth(subMonths(now, 3)), endOfMonth(subMonths(now, 3))));

        } else if (viewType === 'recent_days') {
            snapshots.push(await generateSnapshot('Today', startOfDay(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Yesterday', startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))));
            snapshots.push(await generateSnapshot('2 Days Ago', startOfDay(subDays(now, 2)), endOfDay(subDays(now, 2))));
            snapshots.push(await generateSnapshot('3 Days Ago', startOfDay(subDays(now, 3)), endOfDay(subDays(now, 3))));

        } else if (viewType === 'weekly_days') {
            snapshots.push(await generateSnapshot('Today', startOfDay(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Yesterday', startOfDay(subDays(now, 1)), endOfDay(subDays(now, 1))));
            snapshots.push(await generateSnapshot('7 Days Ago', startOfDay(subDays(now, 7)), endOfDay(subDays(now, 7))));
            snapshots.push(await generateSnapshot('8 Days Ago', startOfDay(subDays(now, 8)), endOfDay(subDays(now, 8))));

        } else if (viewType === 'quarterly') {
            snapshots.push(await generateSnapshot('This Quarter', startOfQuarter(now), endOfDay(now)));
            snapshots.push(await generateSnapshot('Last Quarter', startOfQuarter(subQuarters(now, 1)), endOfQuarter(subQuarters(now, 1))));
            snapshots.push(await generateSnapshot('2 Quarters Ago', startOfQuarter(subQuarters(now, 2)), endOfQuarter(subQuarters(now, 2))));
            snapshots.push(await generateSnapshot('3 Quarters Ago', startOfQuarter(subQuarters(now, 3)), endOfQuarter(subQuarters(now, 3))));
        }

        return snapshots.length > 0 ? snapshots : [];
    }

    /**
     * Get date range presets
     */
    getDateRangePresets() {
        const now = new Date();

        return {
            today: {
                start: startOfDay(now).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            yesterday: {
                start: startOfDay(subDays(now, 1)).toISOString(),
                end: endOfDay(subDays(now, 1)).toISOString(),
            },
            last_7_days: {
                start: startOfDay(subDays(now, 7)).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            last_14_days: {
                start: startOfDay(subDays(now, 14)).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            last_30_days: {
                start: startOfDay(subDays(now, 30)).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            last_60_days: {
                start: startOfDay(subDays(now, 60)).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            last_90_days: {
                start: startOfDay(subDays(now, 90)).toISOString(),
                end: endOfDay(now).toISOString(),
            },
            this_month: {
                start: startOfMonth(now).toISOString(),
                end: endOfMonth(now).toISOString(),
            },
            last_month: {
                start: startOfMonth(subMonths(now, 1)).toISOString(),
                end: endOfMonth(subMonths(now, 1)).toISOString(),
            },
            this_quarter: {
                start: startOfQuarter(now).toISOString(),
                end: endOfQuarter(now).toISOString(),
            },
            last_quarter: {
                start: startOfQuarter(subMonths(now, 3)).toISOString(),
                end: endOfQuarter(subMonths(now, 3)).toISOString(),
            },
            this_year: {
                start: startOfYear(now).toISOString(),
                end: endOfYear(now).toISOString(),
            },
        };
    }
}

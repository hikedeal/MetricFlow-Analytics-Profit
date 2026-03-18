import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../services/dashboard.service';

const prisma = new PrismaClient();

export class OrdersController {
    static buildWhereClause(query: any, storeId: string) {
        const {
            financial_status,
            fulfillment_status,
            query: search_query,
            startDate,
            endDate,
            risk,
            profit_type,
            status,
            payment_gateway,
            tags,
            min_profit,
            max_profit,
            min_value,
            max_value,
            customer_type
        } = query;

        const where: any = {
            storeId
        };

        const andConditions: any[] = [];

        if (financial_status) {
            where.financialStatus = financial_status;
        }
        if (fulfillment_status) {
            where.fulfillmentStatus = fulfillment_status;
        }
        if (search_query) {
            andConditions.push({
                OR: [
                    { orderNumber: { contains: search_query as string, mode: 'insensitive' } },
                    { orderName: { contains: search_query as string, mode: 'insensitive' } },
                    { customerEmail: { contains: search_query as string, mode: 'insensitive' } },
                ]
            });
        }

        if (startDate || endDate) {
            const s = startDate ? new Date(startDate as string) : new Date(0);
            const e = endDate ? new Date(endDate as string) : new Date();

            if (startDate) s.setHours(0, 0, 0, 0);
            if (endDate) e.setHours(23, 59, 59, 999);

            andConditions.push({
                OR: [
                    { orderDate: { gte: s, lte: e } },
                    { cancelledAt: { gte: s, lte: e } },
                    { rtoAt: { gte: s, lte: e } },
                    { returnedAt: { gte: s, lte: e } },
                    { refundedAt: { gte: s, lte: e } }
                ]
            });
        }

        // New Filters (Risk, Profit, Cancelled)
        if (risk === 'high') {
            where.isFraud = true;
        }

        // High Profit filter - only positive profit
        if (profit_type === 'profit') {
            where.netAmount = { gt: 0 };
        }

        if (status === 'cancelled') {
            andConditions.push({
                OR: [
                    { isCancelled: true },
                    { financialStatus: 'voided' },
                    { financialStatus: 'refunded' }
                ]
            });
        } else if (status === 'rto') {
            where.isRTO = true;
        } else if (status === 'returned') {
            where.isReturned = true;
        }

        // Payment Gateway Filter
        if (payment_gateway) {
            where.paymentGateway = { contains: payment_gateway as string, mode: 'insensitive' };
        }

        // Tags Filter (comma-separated)
        if (tags) {
            const tagArray = (tags as string).split(',').map(t => t.trim());
            andConditions.push({
                tags: {
                    hasSome: tagArray
                }
            });
        }

        // Profit Range Filter
        if (min_profit !== undefined || max_profit !== undefined) {
            const profitFilter: any = {};
            if (min_profit !== undefined) profitFilter.gte = Number(min_profit);
            if (max_profit !== undefined) profitFilter.lte = Number(max_profit);
            where.netAmount = profitFilter;
        }

        // Order Value Range Filter
        if (min_value !== undefined || max_value !== undefined) {
            const valueFilter: any = {};
            if (min_value !== undefined) valueFilter.gte = Number(min_value);
            if (max_value !== undefined) valueFilter.lte = Number(max_value);
            where.totalPrice = valueFilter;
        }

        // Customer Type Filter
        if (customer_type) {
            where.customer = {
                is: customer_type === 'new'
                    ? { firstOrderDate: { equals: null } }
                    : { firstOrderDate: { not: null } }
            };
        }

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        return where;
    }

    static async getOrders(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const {
                page = 1,
                limit = 20,
                sort_by = 'date',
                sort_order = 'desc',
                profit_type
            } = req.query;

            const pageNum = Number(page);
            const limitNum = Number(limit);

            const where = OrdersController.buildWhereClause(req.query, storeId);

            // Determine sort order - Dynamic sorting based on sort_by parameter
            let orderBy: any;
            const sortDirection = sort_order === 'asc' ? 'asc' : 'desc';

            switch (sort_by) {
                case 'value':
                    orderBy = { totalPrice: sortDirection };
                    break;
                case 'profit':
                    orderBy = { netAmount: sortDirection };
                    break;
                case 'customer':
                    orderBy = { customerEmail: sortDirection };
                    break;
                case 'date':
                default:
                    // High Profit tab defaults to profit sorting if no explicit sort_by
                    if (profit_type === 'profit' && sort_by === 'date') {
                        orderBy = { netAmount: 'desc' as const };
                    } else {
                        orderBy = { orderDate: sortDirection };
                    }
                    break;
            }

            const [orders, total, storeSettings] = await Promise.all([
                prisma.order.findMany({
                    where,
                    orderBy,
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
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
                        },
                    }
                }),
                prisma.order.count({ where }),
                prisma.storeSettings.findUnique({ where: { storeId } })
            ]);

            return res.json({
                data: orders.map(o => {
                    const { taxAmount: totalTax, netRevenue: netRevenueBase } = DashboardService.calculateTaxBreakdown(o.subtotalPrice, storeSettings);

                    // On-the-fly profit calculation for each order
                    let totalProductCost = 0;
                    o.lineItems.forEach(item => {
                        let itemCost = 0;
                        if (storeSettings?.useProductCost) {
                            itemCost = (item.product?.variants?.[0]?.cost || 0) * item.quantity;
                        }
                        if (itemCost === 0 && storeSettings?.defaultCogsPercentage) {
                            itemCost = (item.price * item.quantity) * (storeSettings.defaultCogsPercentage / 100);
                        }
                        totalProductCost += itemCost;
                    });

                    // Pro-rate other costs for this order if enabled
                    let otherCosts = 0;
                    if (storeSettings?.enableProfitTracking) {
                        otherCosts += (storeSettings.defaultShippingCost || 0);
                        otherCosts += (storeSettings.defaultPackagingCost || 0);
                        otherCosts += (netRevenueBase * (storeSettings.paymentGatewayFee || 0) / 100);

                        if (o.isRTO) otherCosts += (storeSettings.rtoCost || 0);
                        if (o.isReturned) otherCosts += (storeSettings.returnCost || 0);
                    }

                    const profitEstimate = netRevenueBase - o.refundAmount - totalProductCost - otherCosts;

                    return {
                        ...o,
                        customer: o.customer ? {
                            id: o.customer.id,
                            name: `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() || 'Unknown Customer',
                            email: o.customer.email,
                            total_spent: o.customer.totalSpent,
                            orders_count: o.customer.totalOrders,
                        } : null,
                        financial_status: o.financialStatus,
                        fulfillment_status: o.fulfillmentStatus,
                        total_price: o.totalPrice,
                        total_tax: totalTax,
                        created_at: o.orderDate.toISOString(),
                        order_number: o.orderName || o.orderNumber,
                        profit_estimate: parseFloat(profitEstimate.toFixed(2)),
                        profit_status: profitEstimate >= 0 ? 'profit' : 'loss',
                        risk_score: o.isFraud ? 100 : 0,
                        risk_factors: [],
                        tags: o.tags || [],
                        items: o.lineItems.map(item => {
                            let itemUnitCost = 0;
                            if (storeSettings?.useProductCost) {
                                itemUnitCost = (item.product?.variants?.[0]?.cost || 0);
                            }
                            if (itemUnitCost === 0 && storeSettings?.defaultCogsPercentage) {
                                itemUnitCost = (item.price * (storeSettings.defaultCogsPercentage / 100));
                            }

                            return {
                                name: item.title,
                                quantity: item.quantity,
                                sku: item.sku,
                                price: item.price,
                                unit_cost: parseFloat(itemUnitCost.toFixed(2)),
                                total_cost: parseFloat((itemUnitCost * item.quantity).toFixed(2))
                            };
                        })
                    };
                }),
                meta: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total,
                    total_pages: Math.ceil(total / limitNum)
                }
            });
        } catch (error) {
            console.error('Get orders error:', error);
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }
    }

    static async getOrderDetails(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;

            const [order, storeSettings] = await Promise.all([
                prisma.order.findFirst({
                    where: { id, storeId },
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
                        },
                    }
                }),
                prisma.storeSettings.findUnique({ where: { storeId } })
            ]);

            if (!order) return res.status(404).json({ error: 'Order not found' });

            const { taxAmount: totalTax, netRevenue: netRevenueBase } = DashboardService.calculateTaxBreakdown(order.subtotalPrice, storeSettings);

            // On-the-fly profit calculation
            let totalProductCost = 0;
            order.lineItems.forEach(item => {
                let itemCost = 0;
                if (storeSettings?.useProductCost) {
                    itemCost = (item.product?.variants?.[0]?.cost || 0) * item.quantity;
                }
                if (itemCost === 0 && storeSettings?.defaultCogsPercentage) {
                    itemCost = (item.price * item.quantity) * (storeSettings.defaultCogsPercentage / 100);
                }
                totalProductCost += itemCost;
            });

            let otherCosts = 0;
            if (storeSettings?.enableProfitTracking) {
                otherCosts += (storeSettings.defaultShippingCost || 0);
                otherCosts += (storeSettings.defaultPackagingCost || 0);
                otherCosts += (netRevenueBase * (storeSettings.paymentGatewayFee || 0) / 100);

                if (order.isRTO) otherCosts += (storeSettings.rtoCost || 0);
                if (order.isReturned) otherCosts += (storeSettings.returnCost || 0);
            }

            const profitEstimate = netRevenueBase - order.refundAmount - totalProductCost - otherCosts;

            return res.json({
                ...order,
                financial_status: order.financialStatus,
                fulfillment_status: order.fulfillmentStatus,
                total_price: order.totalPrice,
                total_tax: totalTax,
                created_at: order.orderDate.toISOString(),
                order_number: order.orderName || order.orderNumber,
                profit_estimate: parseFloat(profitEstimate.toFixed(2)),
                profit_status: profitEstimate >= 0 ? 'profit' : 'loss',
                risk_score: order.isFraud ? 100 : 0,
                risk_factors: [],
                payment_gateway_names: order.paymentGateway ? [order.paymentGateway] : [],
                items: order.lineItems.map(item => {
                    let itemUnitCost = 0;
                    if (storeSettings?.useProductCost) {
                        itemUnitCost = (item.product?.variants?.[0]?.cost || 0);
                    }
                    if (itemUnitCost === 0 && storeSettings?.defaultCogsPercentage) {
                        itemUnitCost = (item.price * (storeSettings.defaultCogsPercentage / 100));
                    }

                    return {
                        name: item.title,
                        quantity: item.quantity,
                        sku: item.sku,
                        price: item.price,
                        unit_cost: parseFloat(itemUnitCost.toFixed(2)),
                        total_cost: parseFloat((itemUnitCost * item.quantity).toFixed(2))
                    };
                })
            });
        } catch (error) {
            console.error('Get order details error:', error);
            return res.status(500).json({ error: 'Failed to fetch order details' });
        }
    }
    static async getTags(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;

            const orders = await prisma.order.findMany({
                where: { storeId },
                select: { tags: true }
            });

            const uniqueTags = new Set<string>();
            orders.forEach(order => {
                order.tags.forEach(tag => uniqueTags.add(tag));
            });

            return res.json(Array.from(uniqueTags).sort());
        } catch (error) {
            console.error('Get tags error:', error);
            return res.status(500).json({ error: 'Failed to fetch tags' });
        }
    }

    static async getStats(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const where: any = {
                storeId,
                AND: []
            };

            if (startDate || endDate) {
                const s = startDate ? new Date(startDate as string) : new Date(0);
                const e = endDate ? new Date(endDate as string) : new Date();

                if (startDate) s.setHours(0, 0, 0, 0);
                if (endDate) e.setHours(23, 59, 59, 999);

                where.AND.push({
                    OR: [
                        { orderDate: { gte: s, lte: e } },
                        { cancelledAt: { gte: s, lte: e } },
                        { rtoAt: { gte: s, lte: e } },
                        { returnedAt: { gte: s, lte: e } },
                        { refundedAt: { gte: s, lte: e } }
                    ]
                });
            }

            const [
                total,
                highRisk,
                lossMaking,
                highProfit,
                cancelled,
                rto,
                returned
            ] = await Promise.all([
                prisma.order.count({ where }),
                prisma.order.count({ where: { ...where, isFraud: true } }),
                prisma.order.count({ where: { ...where, netAmount: { lt: 0 } } }),
                prisma.order.count({ where: { ...where, netAmount: { gt: 0 } } }),
                prisma.order.count({
                    where: {
                        ...where,
                        AND: [
                            ...(where.AND || []),
                            {
                                OR: [
                                    { isCancelled: true },
                                    { financialStatus: 'voided' },
                                    { financialStatus: 'refunded' }
                                ]
                            }
                        ]
                    }
                }),
                prisma.order.count({ where: { ...where, isRTO: true } }),
                prisma.order.count({ where: { ...where, isReturned: true } })
            ]);

            return res.json({
                total,
                highRisk,
                lossMaking,
                highProfit,
                cancelled,
                rto,
                returned
            });
        } catch (error) {
            console.error('Get order stats error:', error);
            return res.status(500).json({ error: 'Failed to fetch order stats' });
        }
    }

    static async markAsRisky(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;

            const order = await prisma.order.findFirst({
                where: { id, storeId }
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Add "High Risk" tag to existing tags (don't replace)
            const existingTags = order.tags || [];
            const updatedTags = existingTags.includes('High Risk')
                ? existingTags
                : [...existingTags, 'High Risk'];

            // Update order to be fraudulent/high risk
            const updatedOrder = await prisma.order.update({
                where: { id },
                data: {
                    isFraud: true,
                    tags: updatedTags
                }
            });

            return res.json({
                success: true,
                message: 'Order marked as high risk',
                data: updatedOrder
            });
        } catch (error) {
            console.error('Mark as risky error:', error);
            return res.status(500).json({ error: 'Failed to mark order as risky' });
        }
    }

    static async updateTags(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;
            const { tags } = req.body;

            if (!Array.isArray(tags)) {
                return res.status(400).json({ error: 'Tags must be an array' });
            }

            const order = await prisma.order.findFirst({
                where: { id, storeId }
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Automatically sync isFraud flag based on "High Risk" tag presence
            const hasHighRiskTag = tags.includes('High Risk');

            // Update order tags and isFraud flag
            const updatedOrder = await prisma.order.update({
                where: { id },
                data: {
                    tags: tags,
                    isFraud: hasHighRiskTag
                }
            });

            return res.json({
                success: true,
                message: 'Tags updated successfully',
                data: updatedOrder
            });
        } catch (error) {
            console.error('Update tags error:', error);
            return res.status(500).json({ error: 'Failed to update tags' });
        }
    }

    static async bulkMarkAsRisky(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { orderIds, filters } = req.body;

            let where: any;
            if (orderIds && Array.isArray(orderIds)) {
                where = { id: { in: orderIds }, storeId };
            } else if (filters) {
                where = OrdersController.buildWhereClause(filters, storeId);
            } else {
                return res.status(400).json({ error: 'orderIds or filters required' });
            }

            const orders = await prisma.order.findMany({
                where,
                select: { id: true, tags: true }
            });

            const updates = orders.map(order => {
                const tags = order.tags || [];
                const updatedTags = tags.includes('High Risk') ? tags : [...tags, 'High Risk'];
                return prisma.order.update({
                    where: { id: order.id },
                    data: {
                        isFraud: true,
                        tags: updatedTags
                    }
                });
            });

            await prisma.$transaction(updates);

            return res.json({ success: true, count: orders.length });
        } catch (error) {
            console.error('Bulk mark as risky error:', error);
            return res.status(500).json({ error: 'Failed to bulk mark orders as risky' });
        }
    }

    static async bulkAddTags(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { orderIds, filters, tags: newTags } = req.body;

            if (!Array.isArray(newTags)) {
                return res.status(400).json({ error: 'Tags must be an array' });
            }

            let where: any;
            if (orderIds && Array.isArray(orderIds)) {
                where = { id: { in: orderIds }, storeId };
            } else if (filters) {
                where = OrdersController.buildWhereClause(filters, storeId);
            } else {
                return res.status(400).json({ error: 'orderIds or filters required' });
            }

            const orders = await prisma.order.findMany({
                where,
                select: { id: true, tags: true }
            });

            const updates = orders.map(order => {
                const existingTags = order.tags || [];
                const mergedTags = [...new Set([...existingTags, ...newTags])];
                const hasHighRiskTag = mergedTags.includes('High Risk');

                return prisma.order.update({
                    where: { id: order.id },
                    data: {
                        tags: mergedTags,
                        isFraud: hasHighRiskTag
                    }
                });
            });

            await prisma.$transaction(updates);

            return res.json({ success: true, count: orders.length });
        } catch (error) {
            console.error('Bulk add tags error:', error);
            return res.status(500).json({ error: 'Failed to bulk add tags' });
        }
    }

}

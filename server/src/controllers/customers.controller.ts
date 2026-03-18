import { Request, Response } from 'express'; // Restarting final
import { PrismaClient } from '@prisma/client';
import { ShopifyService } from '../services/shopify.service';
import { DashboardService } from '../services/dashboard.service';
import { CustomerService } from '../services/customer.service';

const prisma = new PrismaClient();

export class CustomersController {
    static buildWhereClause(query: any, storeId: string) {
        const {
            segment,
            query: search_query,
            startDate,
            endDate,
            risk,
            status,
            minSpent,
            maxSpent,
            minOrders,
            maxOrders,
            minAov,
            maxAov,
            country,
            dormantDays
        } = query;

        const where: any = {
            storeId,
        };

        // Range Filters: LTV (totalSpent)
        if (minSpent || maxSpent) {
            where.totalSpent = {
                ...(minSpent && { gte: parseFloat(minSpent as string) }),
                ...(maxSpent && { lte: parseFloat(maxSpent as string) }),
            };
        }

        // Range Filters: Order Count
        if (minOrders || maxOrders) {
            where.totalOrders = {
                ...(minOrders && { gte: parseInt(minOrders as string) }),
                ...(maxOrders && { lte: parseInt(maxOrders as string) }),
            };
        }

        // Range Filters: AOV
        if (minAov || maxAov) {
            where.averageOrderValue = {
                ...(minAov && { gte: parseFloat(minAov as string) }),
                ...(maxAov && { lte: parseFloat(maxAov as string) }),
            };
        }

        // Location Filter
        if (country) {
            where.orders = {
                some: {
                    shippingAddressCountry: { contains: country as string, mode: 'insensitive' }
                }
            };
        }

        // Enhanced Segmentation Mapping
        if (segment === 'vip') {
            where.OR = [
                { segment: 'VIP' },
                { tags: { contains: 'VIP', mode: 'insensitive' } }
            ];
        } else if (segment === 'repeat') {
            where.totalOrders = { gt: 1 };
        } else if (segment === 'dormant' || status === 'dormant' || dormantDays) {
            const days = parseInt((dormantDays as string) || '30');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            where.lastOrderDate = { lt: cutoffDate };
        }

        if (risk === 'high') {
            where.OR = [
                { segment: 'At-Risk' },
                { tags: { contains: 'High Risk', mode: 'insensitive' } }
            ];
        }

        if (search_query) {
            if (where.OR) {
                // If OR already exists, we need to wrap it in AND
                const searchQuery = [
                    { firstName: { contains: search_query as string, mode: 'insensitive' } },
                    { lastName: { contains: search_query as string, mode: 'insensitive' } },
                    { email: { contains: search_query as string, mode: 'insensitive' } },
                ];
                where.AND = [
                    { OR: where.OR },
                    { OR: searchQuery }
                ];
                delete where.OR;
            } else {
                where.OR = [
                    { firstName: { contains: search_query as string, mode: 'insensitive' } },
                    { lastName: { contains: search_query as string, mode: 'insensitive' } },
                    { email: { contains: search_query as string, mode: 'insensitive' } },
                ];
            }
        }

        // Proper Date Filtering: Filter customers who were ACTIVE (had an order) in the range
        // CRITICAL FIX: Skip this for 'dormant' segment as it's a paradox (dormant = no orders in range)
        if ((startDate || endDate) && segment && segment !== 'dormant') {
            where.orders = {
                ...where.orders,
                some: {
                    ...(where.orders?.some || {}),
                    orderDate: {
                        ...(startDate && { gte: new Date(startDate as string) }),
                        ...(endDate && { lte: new Date(endDate as string) }),
                    }
                }
            };
        }

        return where;
    }

    static async getCustomers(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const {
                page = 1,
                limit = 20
            } = req.query;

            const pageNum = Number(page);
            const limitNum = Number(limit);

            const where = CustomersController.buildWhereClause(req.query, storeId);

            console.log('[Debug] Customers query where:', JSON.stringify(where, null, 2));

            const [customers, total, storeSettings] = await Promise.all([
                prisma.customer.findMany({
                    where,
                    orderBy: { totalSpent: 'desc' },
                    include: {
                        orders: { take: 1 },
                        store: { select: { shopifyDomain: true } }
                    },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                }),
                prisma.customer.count({ where }),
                prisma.storeSettings.findUnique({ where: { storeId } })
            ]);

            console.log(`[Debug] Found ${customers.length} customers out of ${total} total matching filters`);

            return res.json({
                data: customers.map((c: any) => CustomerService.enrichCustomer(c, storeSettings, (c.store?.shopifyDomain || (req as any).user?.shopifyDomain))),
                meta: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total,
                    total_pages: Math.ceil(total / limitNum)
                }
            });
        } catch (error) {
            console.error('Get customers error:', error);
            return res.status(500).json({ error: 'Failed to fetch customers' });
        }
    }

    static async getCustomerDetails(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;

            const [customer, firstOrder, store, storeSettings] = await Promise.all([
                prisma.customer.findFirst({
                    where: { id, storeId },
                    include: {
                        orders: {
                            take: 5,
                            orderBy: { orderDate: 'desc' },
                        }
                    }
                }),
                prisma.order.findFirst({
                    where: { customerId: id, storeId },
                    orderBy: { orderDate: 'asc' },
                    select: { orderNumber: true, orderDate: true }
                }),
                prisma.store.findUnique({
                    where: { id: storeId },
                    select: { shopifyDomain: true, accessToken: true }
                }),
                prisma.storeSettings.findUnique({ where: { storeId } })
            ]);

            if (!customer) return res.status(404).json({ error: 'Customer not found' });

            let lastOrder = customer.orders[0];
            let firstOrderData = firstOrder;

            // FALLBACK: If first/last order missing locally, fetch from Shopify immediately
            if ((!firstOrderData || !lastOrder) && store) {
                try {
                    console.log(`[Fallback] Fetching orders for customer ${customer.shopifyCustomerId} from ${store.shopifyDomain}`);
                    const shopifyOrders = await ShopifyService.fetchCustomerOrders(
                        store.shopifyDomain,
                        store.accessToken,
                        customer.shopifyCustomerId
                    );

                    console.log(`[Fallback] Found ${shopifyOrders?.length || 0} orders on Shopify`);

                    if (shopifyOrders && shopifyOrders.length > 0) {
                        const first = shopifyOrders[shopifyOrders.length - 1];
                        const last = shopifyOrders[0];

                        if (!firstOrderData) {
                            firstOrderData = {
                                orderNumber: first.order_number?.toString(),
                                orderDate: new Date(first.created_at)
                            } as any;
                        }

                        if (!lastOrder) {
                            lastOrder = {
                                orderNumber: last.order_number?.toString(),
                                orderDate: new Date(last.created_at)
                            } as any;
                        }

                        // Also update LTV/Orders if they are 0 or less than what Shopify says
                        // OR if LTV is 0 but orders exist (data recovery)
                        const needsUpdate = (customer.totalOrders < shopifyOrders.length) || (customer.totalSpent === 0 && shopifyOrders.length > 0);

                        if (needsUpdate) {
                            const newTotalOrders = shopifyOrders.length;
                            const newTotalSpent = shopifyOrders.reduce((acc: number, o: any) => acc + parseFloat(o.total_price || '0'), 0);
                            const newAov = newTotalOrders > 0 ? newTotalSpent / newTotalOrders : 0;

                            (customer as any).totalOrders = newTotalOrders;
                            (customer as any).totalSpent = newTotalSpent;
                            (customer as any).averageOrderValue = newAov;

                            // PERSIST the fix!
                            await prisma.customer.update({
                                where: { id: customer.id },
                                data: {
                                    totalOrders: newTotalOrders,
                                    totalSpent: newTotalSpent,
                                    averageOrderValue: newAov
                                }
                            });
                        }

                        console.log(`[Fallback] Success! First: #${firstOrderData?.orderNumber}, Last: #${lastOrder?.orderNumber}`);
                    }
                } catch (e) {
                    console.error('Fallback Shopify fetch failed:', e);
                }
            }

            const enriched = CustomerService.enrichCustomer(customer, storeSettings, store?.shopifyDomain || '');

            return res.json({
                ...enriched,
                last_order_number: lastOrder?.orderNumber,
                first_order_date: firstOrderData?.orderDate?.toISOString(),
                first_order_number: firstOrderData?.orderNumber,
                recent_orders: customer.orders.map(o => ({
                    id: o.id,
                    order_number: o.orderNumber,
                    total_price: o.totalPrice,
                    financial_status: o.financialStatus,
                    created_at: o.orderDate.toISOString(),
                }))
            });
        } catch (error) {
            console.error('Get customer details error:', error);
            return res.status(500).json({ error: 'Failed to fetch customer details' });
        }
    }

    static async updateTags(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;
            const { tags } = req.body;

            const [customer, store, storeSettings] = await Promise.all([
                prisma.customer.findUnique({
                    where: { id, storeId }
                }),
                prisma.store.findUnique({
                    where: { id: storeId }
                }),
                prisma.storeSettings.findUnique({
                    where: { storeId }
                })
            ]);

            if (!customer) return res.status(404).json({ error: 'Customer not found' });
            if (!store) return res.status(404).json({ error: 'Store not found' });

            // Update Shopify
            await (ShopifyService as any).updateCustomerTags(
                store.shopifyDomain,
                store.accessToken,
                customer.shopifyCustomerId,
                tags.join(', ')
            );

            // Update Local DB
            const updatedCustomer = await (prisma.customer as any).update({
                where: { id },
                data: { tags: tags.join(', ') }
            });

            // Return mapped object for consistency
            const tagList = tags;
            const isVIP = tagList.includes('VIP');
            const isHighRisk = tagList.includes('High Risk');

            let segmentDisplay = updatedCustomer.segment || 'Regular';
            if (isVIP) segmentDisplay = 'VIP Customer';

            const { netRevenue: totalNetSpent } = DashboardService.calculateTaxBreakdown(updatedCustomer.totalSpent, storeSettings);

            return res.json({
                ...updatedCustomer,
                name: `${updatedCustomer.firstName || ''} ${updatedCustomer.lastName || ''}`.trim() || 'Unknown Customer',
                total_orders: updatedCustomer.totalOrders,
                total_spend: parseFloat(totalNetSpent.toFixed(2)),
                tags: tagList,
                risk_level: isHighRisk ? 'High' : (updatedCustomer.segment === 'At-Risk' ? 'High' : updatedCustomer.segment === 'Lost' ? 'Medium' : 'Low'),
                segment: segmentDisplay,
            });
        } catch (error) {
            console.error('Update tags error:', error);
            return res.status(500).json({ error: 'Failed to update tags' });
        }
    }
}

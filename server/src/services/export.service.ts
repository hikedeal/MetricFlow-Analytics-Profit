import prisma from '../config/prisma';
import { Parser } from 'json2csv';
import { DashboardService } from './dashboard.service';

export class ExportService {
    /**
     * Generic helper to convert JSON data to CSV string
     */
    private convertToCSV(data: any[], fields?: string[]): string {
        try {
            const parser = new Parser({ fields });
            return parser.parse(data);
        } catch (err) {
            console.error('Error generating CSV:', err);
            throw new Error('Failed to generate CSV data');
        }
    }

    /**
     * Export Orders to CSV
     */
    async exportOrders(storeId: string, query: any) {
        const { OrdersController } = require('../controllers/orders.controller');
        const whereClause = OrdersController.buildWhereClause(query, storeId);

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                customer: true,
            },
            orderBy: { orderDate: 'desc' },
        });

        // Map data to flat CSV structure
        const flatData = orders.map(order => ({
            'Order Name': order.orderName,
            'Order Number': order.orderNumber,
            'Date': order.orderDate.toISOString().split('T')[0],
            'Customer Name': order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'N/A',
            'Customer Email': order.customerEmail || 'N/A',
            'Total Price': order.totalPrice,
            'Net Amount': order.netAmount,
            'Financial Status': order.financialStatus,
            'Fulfillment Status': order.fulfillmentStatus || 'unfulfilled',
            'Cancelled': order.isCancelled ? 'Yes' : 'No',
            'RTO': order.isRTO ? 'Yes' : 'No',
            'Currency': order.currency,
        }));

        const fields = [
            'Order Name', 'Order Number', 'Date', 'Customer Name', 'Customer Email',
            'Total Price', 'Net Amount', 'Financial Status', 'Fulfillment Status',
            'Cancelled', 'RTO', 'Currency'
        ];

        return this.convertToCSV(flatData, fields);
    }

    /**
     * Export Customers to CSV
     */
    async exportCustomers(storeId: string, query: any) {
        const { CustomersController } = require('../controllers/customers.controller');
        const whereClause = CustomersController.buildWhereClause(query, storeId);

        const customers = await prisma.customer.findMany({
            where: whereClause,
            orderBy: { totalSpent: 'desc' },
        });

        const flatData = customers.map(customer => ({
            'Customer': `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Guest',
            'Email': customer.email || 'N/A',
            'Phone': customer.phone || 'N/A',
            'Segment': customer.segment || 'Regular',
            'Risk Level': customer.segment === 'At-Risk' ? 'High' : 'Low',
            'Orders': customer.totalOrders,
            'Lifetime Value': customer.totalSpent,
            'AOV': customer.averageOrderValue,
            'Last Order Date': customer.lastOrderDate ? customer.lastOrderDate.toISOString().split('T')[0] : 'No orders',
            'Address 1': customer.address1 || '',
            'Address 2': customer.address2 || '',
            'City': customer.city || '',
            'Province': customer.province || '',
            'Zip Code': customer.zip || '',
            'Country': customer.country || '',
        }));

        const fields = [
            'Customer', 'Email', 'Phone', 'Segment', 'Risk Level', 'Orders',
            'Lifetime Value', 'AOV', 'Last Order Date',
            'Address 1', 'Address 2', 'City', 'Province', 'Zip Code', 'Country'
        ];

        return this.convertToCSV(flatData, fields);
    }

    /**
     * Export Products to CSV
     */
    async exportProducts(storeId: string, query: any) {
        const { ProductsController } = require('../controllers/products.controller');
        const whereClause = ProductsController.buildWhereClause(query, storeId);
        const { startDate, endDate, ids } = query;

        // Explicit ID filtering for bulk exports
        if (ids) {
            const productIds = (ids as string).split(',');
            whereClause.id = { in: productIds };
        }

        const lineItemWhere: any = {};
        if (startDate || endDate) {
            lineItemWhere.order = { orderDate: {} };
            if (startDate) lineItemWhere.order.orderDate.gte = new Date(startDate as string);
            if (endDate) lineItemWhere.order.orderDate.lte = new Date(endDate as string);
        }

        const [products, settings] = await Promise.all([
            prisma.product.findMany({
                where: whereClause,
                include: {
                    variants: true,
                    lineItems: {
                        where: lineItemWhere,
                        include: { order: true }
                    }
                },
                orderBy: { totalRevenue: 'desc' },
            }),
            prisma.storeSettings.findUnique({
                where: { storeId },
                select: {
                    useProductCost: true,
                    defaultCogsPercentage: true,
                    taxIncluded: true,
                    taxRate: true
                }
            })
        ]);

        const flatData = products.map(product => {
            const isRangeFiltered = !!(startDate || endDate);
            const unitsSold = isRangeFiltered ? product.lineItems.reduce((acc: number, li: any) => acc + li.quantity, 0) : product.totalSold;
            const totalRevenue = isRangeFiltered ? product.lineItems.reduce((acc: number, li: any) => acc + (li.quantity * li.price), 0) : product.totalRevenue;

            const primaryVariant = product.variants?.[0];
            const price = primaryVariant?.price || 0;
            const cost = primaryVariant?.cost || 0;

            let costPerUnit = 0;
            if (settings?.useProductCost && cost) {
                costPerUnit = cost;
            } else {
                const cogsPercent = settings?.defaultCogsPercentage || 0;
                costPerUnit = (Number(price) * cogsPercent) / 100;
            }
            const totalCost = unitsSold * costPerUnit;
            const { netRevenue } = DashboardService.calculateTaxBreakdown(totalRevenue, settings);
            const estimatedProfit = netRevenue - totalCost;
            const profitMargin = netRevenue > 0 ? (estimatedProfit / netRevenue) * 100 : 0;

            return {
                'Product': product.title,
                'Type': product.productType || 'N/A',
                'Vendor': product.vendor || 'N/A',
                'Price': price,
                'Inventory': product.variants?.reduce((sum: number, v: any) => sum + (v.inventoryQuantity || 0), 0) || 0,
                'Sold': unitsSold,
                'Revenue': parseFloat(totalRevenue.toFixed(2)),
                'Net Revenue': parseFloat(netRevenue.toFixed(2)),
                'Total Cost': parseFloat(totalCost.toFixed(2)),
                'Estimated Profit': parseFloat(estimatedProfit.toFixed(2)),
                'Profit Margin (%)': parseFloat(profitMargin.toFixed(2)),
            };
        });

        const fields = [
            'Product', 'Type', 'Vendor', 'Price', 'Inventory', 'Sold', 'Revenue',
            'Net Revenue', 'Total Cost', 'Estimated Profit', 'Profit Margin (%)'
        ];

        return this.convertToCSV(flatData, fields);
    }

    /**
     * Export Executive Summary (Daily Breakdown)
     */
    async exportExecutiveSummary(storeId: string, startDate: string, endDate: string) {
        const dashboardService = new DashboardService();
        const trends = await dashboardService.getSalesTrends(storeId, startDate, endDate, 'day', false);

        const flatData = trends.data.map((day: any) => {
            const grossSales = day.sales + day.refunds; // Approximation based on Net + Refunds
            return {
                'Date': day.date,
                'Net Sales': day.sales,
                'Gross Sales': parseFloat(grossSales.toFixed(2)),
                'Total Orders': day.orders,
                'Average Order Value': day.orders > 0 ? parseFloat((day.sales / day.orders).toFixed(2)) : 0,
                'Spend': day.spend,
                'ROAS': day.spend > 0 ? parseFloat((day.sales / day.spend).toFixed(2)) : 0,
                'COGS': day.cogs,
                'Operational Costs': day.otherCosts,
                'Net Profit': day.profit,
                'Profit Margin (%)': day.sales > 0 ? parseFloat(((day.profit / day.sales) * 100).toFixed(2)) : 0,
                'Cancelled Orders': day.cancelled,
                'Refunded Amount': day.refunds,
            };
        });

        const fields = [
            'Date', 'Gross Sales', 'Net Sales', 'Total Orders', 'Average Order Value',
            'Spend', 'ROAS', 'COGS', 'Operational Costs', 'Net Profit', 'Profit Margin (%)',
            'Cancelled Orders', 'Refunded Amount'
        ];

        return this.convertToCSV(flatData, fields);
    }

    /**
     * Export by generic criteria (used by Segment Builder)
     */
    async exportByCriteria(_storeId: string, type: 'order' | 'customer' | 'product', where: any) {
        if (type === 'order') {
            const orders = await prisma.order.findMany({
                where,
                include: { customer: true },
                orderBy: { orderDate: 'desc' }
            });

            const flatData = orders.map(order => ({
                'Order Name': order.orderName,
                'Order Number': order.orderNumber,
                'Date': order.orderDate.toISOString().split('T')[0],
                'Customer Name': order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'N/A',
                'Customer Email': order.customerEmail || 'N/A',
                'Total Price': order.totalPrice,
                'Net Amount': order.netAmount,
                'Financial Status': order.financialStatus,
                'Fulfillment Status': order.fulfillmentStatus || 'unfulfilled',
                'Cancelled': order.isCancelled ? 'Yes' : 'No',
                'RTO': order.isRTO ? 'Yes' : 'No',
                'Currency': order.currency,
            }));

            const fields = [
                'Order Name', 'Order Number', 'Date', 'Customer Name', 'Customer Email',
                'Total Price', 'Net Amount', 'Financial Status', 'Fulfillment Status',
                'Cancelled', 'RTO', 'Currency'
            ];
            return this.convertToCSV(flatData, fields);

        } else if (type === 'customer') {
            const customers = await prisma.customer.findMany({
                where,
                orderBy: { totalSpent: 'desc' }
            });

            const flatData = customers.map(customer => ({
                'Customer': `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Guest',
                'Email': customer.email || 'N/A',
                'Phone': customer.phone || 'N/A',
                'Segment': customer.segment || 'Regular',
                'Risk Level': customer.segment === 'At-Risk' ? 'High' : 'Low',
                'Orders': customer.totalOrders,
                'Lifetime Value': customer.totalSpent,
                'AOV': customer.averageOrderValue,
                'Last Order Date': customer.lastOrderDate ? customer.lastOrderDate.toISOString().split('T')[0] : 'No orders',
                'Address 1': customer.address1 || '',
                'Address 2': customer.address2 || '',
                'City': customer.city || '',
                'Province': customer.province || '',
                'Zip Code': customer.zip || '',
                'Country': customer.country || '',
            }));

            const fields = [
                'Customer', 'Email', 'Phone', 'Segment', 'Risk Level', 'Orders',
                'Lifetime Value', 'AOV', 'Last Order Date',
                'Address 1', 'Address 2', 'City', 'Province', 'Zip Code', 'Country'
            ];
            return this.convertToCSV(flatData, fields);

        } else if (type === 'product') {
            const products = await prisma.product.findMany({
                where,
                include: { variants: true },
                orderBy: { totalRevenue: 'desc' }
            });

            const flatData = products.map(product => {
                const primaryVariant = product.variants?.[0];
                const totalInventory = product.variants?.reduce((sum: number, v: any) => sum + (v.inventoryQuantity || 0), 0) || 0;

                return {
                    'Product': product.title,
                    'Type': product.productType || 'N/A',
                    'Vendor': product.vendor || 'N/A',
                    'Price': primaryVariant?.price || 0,
                    'Inventory': totalInventory,
                    'Sold': product.totalSold,
                    'Revenue': product.totalRevenue,
                };
            });

            const fields = [
                'Product', 'Type', 'Vendor', 'Price', 'Inventory', 'Sold', 'Revenue'
            ];
            return this.convertToCSV(flatData, fields);
        }

        throw new Error('Invalid export type');
    }
}

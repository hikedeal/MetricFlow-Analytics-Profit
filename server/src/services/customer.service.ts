import { DashboardService } from './dashboard.service';

export class CustomerService {
    /**
     * Map raw database customer to a rich object for the UI
     */
    static enrichCustomer(customer: any, storeSettings: any, shopifyDomain: string) {
        const tagList = (customer.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        const isVIP = tagList.includes('VIP');
        const isHighRisk = tagList.includes('High Risk');

        let segmentDisplay = customer.segment || 'Regular';
        if (isVIP) segmentDisplay = 'VIP Customer';
        else if (customer.segment === 'VIP') segmentDisplay = 'VIP Customer';
        else if (customer.segment === 'Loyal') segmentDisplay = 'Loyal Customer';

        const { netRevenue: totalNetSpent } = DashboardService.calculateTaxBreakdown(customer.totalSpent, storeSettings);
        const netAov = customer.totalOrders > 0 ? totalNetSpent / customer.totalOrders : 0;

        return {
            ...customer,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer',
            total_orders: customer.totalOrders,
            total_spend: parseFloat(totalNetSpent.toFixed(2)),
            average_order_value: parseFloat(netAov.toFixed(2)),
            last_order_date: customer.lastOrderDate?.toISOString(),
            last_order_number: customer.lastOrderName || customer.orders?.[0]?.orderNumber,
            first_order_date: customer.firstOrderDate?.toISOString(),
            first_order_number: customer.firstOrderName || customer.orders?.[customer.orders?.length - 1]?.orderNumber,
            tags: tagList,
            shopify_domain: shopifyDomain,
            risk_level: isHighRisk ? 'High' : (customer.segment === 'At-Risk' ? 'High' : customer.segment === 'Lost' ? 'Medium' : 'Low'),
            marketing_status: customer.segment === 'Lost' ? 'Dormant' : customer.segment === 'At-Risk' ? 'At Risk' : 'Active',
            segment: segmentDisplay,
            average_order_gap_days: customer.avgOrderGapDays,
            next_purchase_date: customer.nextPurchaseDate?.toISOString(),
            purchase_probability: customer.purchaseProbability,
        };
    }
}

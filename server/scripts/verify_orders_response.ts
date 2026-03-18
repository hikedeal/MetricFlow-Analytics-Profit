import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOrdersMapping() {
    try {
        const order = await prisma.order.findFirst({
            include: { customer: true, lineItems: true }
        });

        if (!order) {
            console.log('No orders found to test mapping.');
            return;
        }

        console.log('Original Order:', order.orderNumber);

        // Simulate Controller Mapping
        const mappedOrder = {
            ...order,
            customer: order.customer ? {
                id: order.customer.id,
                name: `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || 'Unknown Customer',
                email: order.customer.email,
                total_spent: order.customer.totalSpent,
                orders_count: order.customer.totalOrders,
            } : null,
            financial_status: order.financialStatus,
            fulfillment_status: order.fulfillmentStatus,
            total_price: order.totalPrice,
            created_at: order.orderDate.toISOString(),
            // Frontend Compatibility Fields
            profit_estimate: order.netAmount || 0,
            profit_status: 'profit',
            risk_score: order.isFraud ? 100 : 0,
            risk_factors: [],
            payment_gateway_names: order.paymentGateway ? [order.paymentGateway] : [],
        };

        console.log('Mapped Order Keys:', Object.keys(mappedOrder));
        console.log('Profit Estimate:', mappedOrder.profit_estimate);
        console.log('Risk Score:', mappedOrder.risk_score);
        console.log('Tags:', (mappedOrder as any).tags); // Tags exist on Prisma model

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrdersMapping();

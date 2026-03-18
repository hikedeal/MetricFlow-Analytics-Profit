import { PrismaClient } from '@prisma/client';
import { DashboardService } from './src/services/dashboard.service';

const prisma = new PrismaClient();

async function main() {
    const store = await prisma.store.findFirst({
        where: { shopifyDomain: 'jaibros1.myshopify.com' }
    });

    if (!store) {
        console.log('Store not found');
        return;
    }

    console.log('--- Setting up test data ---');
    // 1. Create an old order (10 days ago) without RTO
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Clean up any previous test order
    await prisma.order.deleteMany({
        where: { orderName: '#TEST-EVENT-1' }
    });

    const testOrder = await prisma.order.create({
        data: {
            storeId: store.id,
            shopifyOrderId: 'TEST_ORDER_999',
            orderNumber: '999',
            orderName: '#TEST-EVENT-1',
            totalPrice: 1000,
            subtotalPrice: 1000,
            totalDiscounts: 0,
            totalTax: 0,
            totalShipping: 0,
            netAmount: 1000,
            currency: 'INR',
            financialStatus: 'paid',
            orderDate: tenDaysAgo,
            rtoAt: today, // Simulated event date is TODAY
            isRTO: true,
            tags: ['RTO']
        }
    });

    console.log(`Created test order ${testOrder.orderName} with orderDate: ${tenDaysAgo.toISOString()} and rtoAt: ${today.toISOString()}`);

    const service = new DashboardService();

    // Query for TODAY
    console.log(`\n--- Querying Dashboard for TODAY (${todayStr}) ---`);
    const metrics = await service.getSalesIntelligence(store.id, todayStr, todayStr);

    console.log('Total Orders (placed today):', metrics.totalOrders); // Should be 0 if no other orders
    console.log('RTO Orders (happened today):', metrics.rtoOrders); // Should be 1 (our test order)

    if (metrics.rtoOrders >= 1) {
        console.log('✅ Success: RTO order placed 10 days ago tracked in TODAY\'s dashboard.');
    } else {
        console.log('❌ Failure: RTO order not tracked.');
    }

    // Cleanup
    await prisma.order.delete({ where: { id: testOrder.id } });
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

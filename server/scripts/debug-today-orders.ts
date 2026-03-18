import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
    // Hardcoded date for "Today" based on user context: 2026-02-06
    // Assuming store might be in UTC or IST, let's grab widely.
    const start = new Date('2026-02-06T00:00:00Z');
    const end = new Date('2026-02-06T23:59:59Z');

    console.log(`Checking orders between ${start.toISOString()} and ${end.toISOString()}...`);

    const orders = await prisma.order.findMany({
        where: {
            orderDate: { gte: start, lte: end }
        },
        include: { customer: true },
        orderBy: { orderDate: 'desc' }
    });

    console.log(`\nTotal Orders Found in DB for Today: ${orders.length}`);

    let newCustomerCount = 0;

    for (const order of orders) {
        console.log(`[Order: ${order.orderNumber}] Date: ${order.orderDate.toISOString()}`);
        if (!order.customer) {
            console.log(`   ❌ Customer: NULL`);
            continue;
        }

        const orderTime = new Date(order.orderDate).getTime();
        const firstOrderTime = order.customer.firstOrderDate ? new Date(order.customer.firstOrderDate).getTime() : 0;

        console.log(`   Customer: ${order.customer.firstName} ${order.customer.lastName}`);
        console.log(`   Cust.FirstOrderDate: ${order.customer.firstOrderDate ? order.customer.firstOrderDate.toISOString() : 'NULL'}`);

        if (firstOrderTime) {
            const diff = Math.abs(orderTime - firstOrderTime);
            console.log(`   Diff: ${diff}ms`);

            // The Logic currently in use:
            if (diff < 5000) {
                console.log(`   ✅ Counted as NEW CUSTOMER`);
                newCustomerCount++;
            } else {
                console.log(`   ⚠️ Counted as REPEAT (Diff > 5000ms)`);
            }
        } else {
            console.log(`   ❌ NOT COUNTED (Missing FirstOrderDate)`);
        }
        console.log('---');
    }

    console.log(`\nTotal New Customers Logic would return: ${newCustomerCount}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

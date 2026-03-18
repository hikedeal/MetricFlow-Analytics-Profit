import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get last 20 orders with customer info
    const orders = await prisma.order.findMany({
        take: 20,
        orderBy: { orderDate: 'desc' },
        include: { customer: true }
    });

    console.log(`Found ${orders.length} orders. Analyzing...`);

    let newCustomerCount = 0;

    orders.forEach(order => {
        console.log(`Order: ${order.orderNumber} | Date: ${order.orderDate.toISOString()}`);

        if (order.customer) {
            console.log(`   Customer: ${order.customer.firstName} ${order.customer.lastName}`);
            console.log(`   FirstOrderDate: ${order.customer.firstOrderDate ? order.customer.firstOrderDate.toISOString() : 'NULL'}`);

            if (order.customer.firstOrderDate) {
                const orderTime = new Date(order.orderDate).getTime();
                const firstOrderTime = new Date(order.customer.firstOrderDate).getTime();
                const diff = Math.abs(orderTime - firstOrderTime);

                console.log(`   Diff: ${diff}ms`);

                if (diff < 5000) {
                    console.log(`   ✅ MATCHED (New Customer)`);
                    newCustomerCount++;
                } else {
                    console.log(`   ❌ NO MATCH (Repeat Customer)`);
                }
            } else {
                console.log(`   ⚠️ NO FIRST ORDER DATE`);
            }
        } else {
            console.log(`   ⚠️ NO CUSTOMER ATTACHED`);
        }
        console.log('---');
    });

    console.log(`Total New Customers identified in sample: ${newCustomerCount}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

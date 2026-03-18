import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const storeId = '256a3cda-b84c-49e1-a5bd-93458408fcab';
    // Today Feb 6 in IST (Asia/Kolkata)
    // 00:00 IST = 18:30 UTC of previous day
    // 23:59 IST = 18:29 UTC of current day
    const startOfTodayIST = new Date('2026-02-05T18:30:00Z');
    const endOfTodayIST = new Date('2026-02-06T18:30:00Z');

    const orders = await prisma.order.findMany({
        where: {
            storeId,
            orderDate: {
                gte: startOfTodayIST,
                lte: endOfTodayIST
            }
        },
        include: { customer: true }
    });

    console.log(`Checking Window: ${startOfTodayIST.toISOString()} to ${endOfTodayIST.toISOString()}`);
    console.log(`Total Orders in IST Today: ${orders.length}`);

    let newCust = 0;
    let nullCust = 0;
    let missingDate = 0;

    let grossSales = 0;
    const activeOrders = orders.filter(o => !o.isCancelled);
    console.log(`Active Orders: ${activeOrders.length}`);

    activeOrders.forEach(o => {
        grossSales += (o.totalPrice || 0);
        if (!o.customer) {
            nullCust++;
            return;
        }
        if (!o.customer.firstOrderDate) {
            missingDate++;
            return;
        }

        const orderTime = new Date(o.orderDate).getTime();
        const firstOrderTime = new Date(o.customer.firstOrderDate).getTime();
        const diff = Math.abs(orderTime - firstOrderTime);

        if (diff < 5000) {
            newCust++;
        }
    });

    console.log(`Gross Sales (Active): ₹${(grossSales / 100000).toFixed(2)}L`);
    console.log(`New Customers identified (from Active Orders): ${newCust}`);
    console.log(`Orders missing customer: ${nullCust}`);
    console.log(`Customers missing firstOrderDate: ${missingDate}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

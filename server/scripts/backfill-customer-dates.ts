import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillFirstOrderDates() {
    console.log('Starting backfill of Customer.firstOrderDate...');

    // 1. Get all customers
    const customers = await prisma.customer.findMany({
        select: { id: true, firstName: true }
    });
    console.log(`Found ${customers.length} customers.`);

    let updatedCount = 0;

    // 2. Process in chunks or one by one (safe for small scale)
    for (const customer of customers) {
        // Find earliest order
        const firstOrder = await prisma.order.findFirst({
            where: { customerId: customer.id },
            orderBy: { orderDate: 'asc' },
            select: { orderDate: true }
        });

        if (firstOrder) {
            await prisma.customer.update({
                where: { id: customer.id },
                data: { firstOrderDate: firstOrder.orderDate }
            });
            updatedCount++;
            if (updatedCount % 10 === 0) process.stdout.write('.');
        }
    }

    console.log(`\nBackfill complete. Updated ${updatedCount} customers.`);
}

backfillFirstOrderDates()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

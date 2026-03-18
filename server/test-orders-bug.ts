import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debug() {
    try {
        const store = await prisma.store.findFirst();
        if (!store) {
            console.log('No store found');
            return;
        }

        const storeId = store.id;
        const query = {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
        };

        console.log('Testing with storeId:', storeId);
        console.log('Query:', JSON.stringify(query));

        // Manually build where clause like in OrdersController
        const { startDate, endDate } = query;
        const where: any = { storeId };
        const andConditions: any[] = [];

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

        if (andConditions.length > 0) {
            where.AND = andConditions;
        }

        console.log('Generated Where:', JSON.stringify(where, null, 2));

        const orders = await prisma.order.findMany({
            where,
            take: 1,
            include: {
                customer: true,
                lineItems: {
                    include: {
                        product: true
                    }
                }
            }
        });

        console.log('Found', orders.length, 'orders');
        console.log('Success!');

    } catch (error) {
        console.error('DEBUG ERROR:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debug();

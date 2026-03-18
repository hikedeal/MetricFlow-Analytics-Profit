import { DashboardService } from '../src/services/dashboard.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const service = new DashboardService();
    // Use jaibros1.myshopify.com store ID
    const store = await prisma.store.findFirst({ where: { shopifyDomain: 'jaibros1.myshopify.com' } });
    if (!store) {
        console.log('Store not found');
        return;
    }

    // Today in IST
    const start = '2026-02-06';
    const end = '2026-02-06';

    const result = await service.getSalesIntelligence(store.id, start, end);
    console.log('--- Sales Intelligence Result ---');
    console.log('Cancelled Orders:', result.cancelledOrders);
    console.log('RTO Orders:', result.rtoOrders);
    console.log('Return Orders:', result.returnOrders);
    console.log('New Customers:', result.newCustomers);
    console.log('Total Orders:', result.totalOrders);
    console.log('---');
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

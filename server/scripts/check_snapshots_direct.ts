import { DashboardService } from '../src/services/dashboard.service';
import prisma from '../src/config/prisma';

async function checkSnapshots() {
    try {
        const store = await prisma.store.findFirst();
        if (!store) {
            console.log('No store found');
            return;
        }
        console.log(`Checking snapshots for store: ${store.shopifyDomain} (${store.id})`);

        const service = new DashboardService();
        const snapshots = await service.getPeriodSnapshots(store.id);

        console.log('Snapshots generated:', snapshots.length);
        console.log(JSON.stringify(snapshots, null, 2));

    } catch (error) {
        console.error('Error fetching snapshots:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkSnapshots();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking recent sync jobs...\n');

    const recentJobs = await prisma.syncJob.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { store: { select: { shopifyDomain: true } } }
    });

    for (const job of recentJobs) {
        const duration = job.completedAt
            ? Math.round((job.completedAt.getTime() - job.createdAt.getTime()) / 1000)
            : 'N/A';

        console.log(`[${job.status.toUpperCase()}] ${job.jobType} - ${job.store.shopifyDomain}`);
        console.log(`  Created: ${job.createdAt.toISOString()}`);
        console.log(`  Completed: ${job.completedAt?.toISOString() || 'Not completed'}`);
        console.log(`  Duration: ${duration}s`);
        if (job.errorMessage) {
            console.log(`  ❌ Error: ${job.errorMessage}`);
        }
        console.log('---');
    }
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

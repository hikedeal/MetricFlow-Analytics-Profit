import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Stores ---');
    const stores = await prisma.store.findMany();
    console.table(stores.map(s => ({
        shopifyDomain: s.shopifyDomain,
        isActive: s.isActive,
        shopifyApiKey: s.shopifyApiKey,
        installedAt: s.installedAt
    })));

    console.log('--- App Registry ---');
    const registry = await prisma.appRegistry.findMany();
    console.table(registry);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log('Stores found:', stores.length);
    stores.forEach(store => {
        console.log(`Store: ${store.shopifyDomain}`);
        console.log(`ID: ${store.id}`);
        console.log(`Scopes: ${store.scope}`);
        console.log(`Updated At: ${store.updatedAt}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());


import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const stores = await prisma.store.findMany();
    console.log('Stores found:', stores.length);
    stores.forEach(s => {
        console.log(`Store ID: ${s.id}, Shop: ${s.shopifyDomain}, Currency: ${s.currency}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

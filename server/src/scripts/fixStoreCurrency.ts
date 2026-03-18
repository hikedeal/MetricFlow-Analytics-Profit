
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const store = await prisma.store.findFirst({
        where: { shopifyDomain: 'hikedeal-2.myshopify.com' }
    });

    if (store) {
        await prisma.store.update({
            where: { id: store.id },
            data: { currency: 'INR' } // Manually fixing to INR
        });
        console.log(`Updated store ${store.shopifyDomain} currency to USD`);
    } else {
        console.log('Store not found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

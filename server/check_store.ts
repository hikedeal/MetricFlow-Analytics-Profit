import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStore() {
    const stores = await prisma.store.findMany();
    console.log('Stores:', JSON.stringify(stores, null, 2));
    process.exit(0);
}

checkStore();

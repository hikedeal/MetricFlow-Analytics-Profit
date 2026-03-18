import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const nullCount = await prisma.customer.count({
        where: { firstOrderDate: null }
    });
    console.log(`Customers with NULL firstOrderDate: ${nullCount}`);
}

main()
    .catch(console.error)
    .finally(async () => await prisma.$disconnect());

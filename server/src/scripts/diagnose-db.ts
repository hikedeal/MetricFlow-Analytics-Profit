import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- Database Diagnosis ---');
  try {
    const storeCount = await prisma.store.count();
    console.log(`Stores in DB: ${storeCount}`);

    const stores = await prisma.store.findMany({
      take: 5,
      select: { shop: true, id: true, isActive: true }
    });
    console.log('Active Stores:', stores);

    const settingsCount = await prisma.storeSettings.count();
    console.log(`Settings records: ${settingsCount}`);

    // Check specific table columns
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'StoreSettings'
    `;
    console.log('StoreSettings Columns found:', (columns as any[]).map(c => c.column_name).join(', '));

  } catch (error) {
    console.error('Diagnosis Failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();

import prisma from './src/config/prisma';

async function testConnection() {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);

    try {
        await prisma.$connect();
        console.log('✅ Database connection successful!');

        const storeCount = await prisma.store.count();
        console.log('Store count:', storeCount);
    } catch (error) {
        console.error('❌ Database connection failed:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();

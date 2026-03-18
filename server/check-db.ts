
import prisma from './src/config/prisma';

async function checkData() {
    try {
        const storeCount = await prisma.store.count();
        const orderCount = await prisma.order.count();
        const settingsCount = await prisma.storeSettings.count();
        const productCount = await prisma.product.count();

        console.log('--- Database Stats ---');
        console.log('Stores:', storeCount);
        console.log('Orders:', orderCount);
        console.log('StoreSettings:', settingsCount);
        console.log('Products:', productCount);

        if (productCount > 0) {
            // Calculate COGS for all items in orders
            const lineItems = await prisma.orderLineItem.findMany({
                include: { product: true },
                take: 20
            });

            console.log('\n--- Top 20 Line Items ---');
            console.table(lineItems.map(item => ({
                orderId: item.orderId,
                title: item.title,
                quantity: item.quantity,
                price: item.price,
                cost: item.product?.cost || 'N/A'
            })));

            let calculatedCOGS = 0;
            const allItems = await prisma.orderLineItem.findMany({ include: { product: true } });
            allItems.forEach((item: any) => {
                const cost = item.product?.cost || 0;
                calculatedCOGS += cost * item.quantity;
            });
            console.log(`\nReal Total COGS (from DB costs): ₹${calculatedCOGS}`);
        }

        if (storeCount > 0) {
            const stores = await prisma.store.findMany({ take: 5 });
            for (const store of stores) {
                const count = await prisma.order.count({ where: { storeId: store.id } });
                console.log(`\nStore ID: ${store.id}, Order Count: ${count}`);

                if (count > 0) {
                    const orders = await prisma.order.findMany({
                        where: { storeId: store.id },
                        take: 10,
                        orderBy: { orderDate: 'desc' },
                        select: {
                            shopifyOrderId: true,
                            orderDate: true,
                            totalPrice: true,
                            totalDiscounts: true,
                            refundAmount: true,
                            totalTax: true,
                            tags: true
                        }
                    });
                    console.log(`\n--- Top 10 Orders for ${store.id} ---`);
                    console.table(orders);
                }
            }
        }
    } catch (error) {
        console.error('Error checking data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkData();

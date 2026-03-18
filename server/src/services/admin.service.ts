import prisma from '../config/prisma';
import { logger } from '../config/logger';

export class AdminService {
    /**
     * Get global platform statistics
     */
    static async getGlobalStats() {
        const totalStores = await prisma.store.count();
        const activeStores = await prisma.store.count({ where: { isActive: true } });

        // Aggregated revenue across all stores
        const revenueResult = await prisma.order.aggregate({
            _sum: { totalPrice: true }
        });
        const totalRevenueManaged = revenueResult._sum.totalPrice || 0;

        const totalOrders = await prisma.order.count();
        const totalCustomers = await prisma.customer.count();
        const totalProducts = await prisma.product.count();

        return {
            totalStores,
            activeStores,
            inactiveStores: totalStores - activeStores,
            totalRevenueManaged,
            totalOrders,
            totalCustomers,
            totalProducts
        };
    }

    /**
     * List all stores with metadata
     */
    static async getAllStores() {
        return await prisma.store.findMany({
            select: {
                id: true,
                storeName: true,
                shopifyDomain: true,
                email: true,
                isActive: true,
                installedAt: true,
                lastSyncAt: true,
                _count: {
                    select: {
                        orders: true,
                        customers: true,
                        products: true
                    }
                }
            },
            orderBy: { installedAt: 'desc' }
        });
    }

    /**
     * Generate a full data dump for a specific store
     * This fulfills the user's request for "ek file banke show ho"
     */
    static async generateStoreDataDump(storeId: string) {
        try {
            const store = await prisma.store.findUnique({
                where: { id: storeId },
                include: { settings: true }
            });

            if (!store) throw new Error('Store not found');

            const orders = await prisma.order.findMany({
                where: { storeId },
                take: 50, // Limit to 50 recent to keep size manageable for view
                orderBy: { orderDate: 'desc' },
                include: { lineItems: true }
            });

            const customers = await prisma.customer.findMany({
                where: { storeId },
                take: 50,
                orderBy: { totalSpent: 'desc' }
            });

            const products = await prisma.product.findMany({
                where: { storeId },
                take: 100
            });

            const syncHistory = await prisma.syncJob.findMany({
                where: { storeId },
                take: 10,
                orderBy: { createdAt: 'desc' }
            });

            return {
                meta: {
                    generatedAt: new Date(),
                    store: {
                        name: store.storeName,
                        domain: store.shopifyDomain,
                        email: store.email
                    }
                },
                settings: store.settings,
                stats: {
                    totalOrders: await prisma.order.count({ where: { storeId } }),
                    totalCustomers: await prisma.customer.count({ where: { storeId } }),
                    totalProducts: await prisma.product.count({ where: { storeId } })
                },
                data: {
                    recentOrders: orders,
                    topCustomers: customers,
                    products: products,
                    recentSyncs: syncHistory
                }
            };
        } catch (error) {
            logger.error(`Error generating dump for store ${storeId}:`, error);
            throw error;
        }
    }
}

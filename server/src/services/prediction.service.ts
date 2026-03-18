import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { differenceInDays, addDays } from 'date-fns';

export class PredictionService {
    /**
     * Analyze purchase patterns for all customers of a store
     */
    static async analyze(storeId: string) {
        logger.info(`Starting Purchase Prediction Analysis for store: ${storeId}`);

        try {
            const batchSize = 100; // Smaller batch size to be safe
            let skip = 0;
            let hasMore = true;
            let totalProcessed = 0;

            while (hasMore) {
                const customers = await prisma.customer.findMany({
                    where: { storeId },
                    include: {
                        orders: {
                            where: { isCancelled: false },
                            orderBy: { orderDate: 'asc' },
                            select: { orderDate: true }
                        }
                    },
                    take: batchSize,
                    skip: skip,
                    orderBy: { id: 'asc' }
                });

                if (customers.length === 0) {
                    hasMore = false;
                    break;
                }

                const now = new Date();

                for (const customer of customers) {
                    const orders = customer.orders;

                    if (orders.length < 2) {
                        await prisma.customer.update({
                            where: { id: customer.id },
                            data: {
                                avgOrderGapDays: null,
                                nextPurchaseDate: null,
                                purchaseProbability: orders.length === 1 ? 20 : 0
                            }
                        });
                        continue;
                    }

                    const gaps: number[] = [];
                    for (let i = 1; i < orders.length; i++) {
                        const gap = differenceInDays(orders[i].orderDate, orders[i - 1].orderDate);
                        gaps.push(gap);
                    }

                    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                    const lastOrderDate = orders[orders.length - 1].orderDate;
                    const nextDate = addDays(lastOrderDate, Math.round(avgGap));

                    const daysSinceLast = differenceInDays(now, lastOrderDate);

                    let probability = 0;
                    if (daysSinceLast === 0) {
                        probability = 95;
                    } else {
                        const ratio = daysSinceLast / avgGap;
                        if (ratio <= 1) {
                            probability = 90 - (ratio * 40);
                        } else if (ratio <= 2) {
                            probability = 50 - ((ratio - 1) * 40);
                        } else {
                            probability = 10 - Math.min(10, (ratio - 2) * 2);
                        }
                    }

                    await prisma.customer.update({
                        where: { id: customer.id },
                        data: {
                            avgOrderGapDays: parseFloat(avgGap.toFixed(2)),
                            nextPurchaseDate: nextDate,
                            purchaseProbability: Math.max(0, Math.min(100, Math.round(probability)))
                        }
                    });
                }

                totalProcessed += customers.length;
                skip += batchSize;

                if (customers.length < batchSize) {
                    hasMore = false;
                }
            }

            logger.info(`Prediction Analysis completed for ${totalProcessed} customers in store ${storeId}.`);
        } catch (error) {
            logger.error('Prediction Analysis failed:', error);
        }
    }
}

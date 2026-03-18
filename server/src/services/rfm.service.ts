import prisma from '../config/prisma';
import { logger } from '../config/logger';
import { differenceInDays } from 'date-fns';

export class RFMService {
    /**
     * Perform RFM Analysis for a store
     * R: Recency (Days since last order)
     * F: Frequency (Total orders)
     * M: Monetary (Total spent)
     */
    static async analyze(storeId: string) {
        logger.info(`Starting RFM Analysis for store: ${storeId}`);

        try {
            const customers = await prisma.customer.findMany({
                where: { storeId },
                include: { orders: { orderBy: { orderDate: 'desc' }, take: 1 } }
            });

            const now = new Date();

            for (const customer of customers) {
                const lastOrder = customer.orders[0];
                const recency = lastOrder ? differenceInDays(now, lastOrder.orderDate) : 365;
                const frequency = customer.totalOrders;
                const monetary = customer.totalSpent;

                // Simple scoring logic (1-5 for each category)
                const recencyScore = recency < 30 ? 5 : recency < 90 ? 4 : recency < 180 ? 3 : recency < 270 ? 2 : 1;
                const frequencyScore = frequency > 10 ? 5 : frequency > 5 ? 4 : frequency > 2 ? 3 : frequency > 1 ? 2 : 1;
                const monetaryScore = monetary > 1000 ? 5 : monetary > 500 ? 4 : monetary > 200 ? 3 : monetary > 50 ? 2 : 1;

                const avgScore = (recencyScore + frequencyScore + monetaryScore) / 3;
                let segment = 'Regular';

                if (avgScore >= 4.5) segment = 'VIP';
                else if (avgScore >= 3.5) segment = 'Loyal';
                else if (recencyScore <= 1.5) segment = 'At-Risk';
                else if (avgScore <= 1.5) segment = 'Lost';

                await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                        recencyDays: recency,
                        frequency,
                        monetary,
                        rfmScore: Math.round(avgScore * 10), // Store as integer out of 50
                        segment
                    }
                });
            }

            logger.info(`RFM Analysis completed for ${customers.length} customers.`);
        } catch (error) {
            logger.error('RFM Analysis failed:', error);
        }
    }
}

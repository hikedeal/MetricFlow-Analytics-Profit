import prisma from '../config/prisma';

export class AlertService {
    /**
     * Get active alerts for a store
     * Fetch unread and undismissed alerts
     */
    async getAlerts(storeId: string) {
        return await prisma.alert.findMany({
            where: {
                storeId,
                isRead: false,
                isDismissed: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Mark alerts as read
     */
    async markAsRead(storeId: string, alertIds?: string[]) {
        const whereClause: any = { storeId };

        if (alertIds && alertIds.length > 0) {
            whereClause.id = { in: alertIds };
        }

        return await prisma.alert.updateMany({
            where: whereClause,
            data: {
                isRead: true,
            },
        });
    }

    /**
     * Dismiss an individual alert
     */
    async dismissAlert(storeId: string, alertId: string) {
        return await prisma.alert.updateMany({
            where: {
                id: alertId,
                storeId,
            },
            data: {
                isDismissed: true,
            },
        });
    }

    /**
     * Create a notification (Internal use)
     */
    async createAlert(data: {
        storeId: string;
        alertType: string;
        severity: 'info' | 'warning' | 'critical';
        title: string;
        message: string;
        metadata?: any;
    }) {
        return await prisma.alert.create({
            data: {
                ...data,
                isRead: false,
                isDismissed: false,
            },
        });
    }
}

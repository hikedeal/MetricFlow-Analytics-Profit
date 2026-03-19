import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initial defaults if no DB record exists
const DEFAULT_SETTINGS = {
    enableStoreLevelProfit: false,
    enableProfitTracking: true,
    defaultShippingCost: 0,
    defaultPackagingCost: 0,
    defaultCogsPercentage: 0,
    useProductCost: false,
    codExtraCharge: 0,
    paymentGatewayFee: 2.0,
    returnCost: 0,
    rtoCost: 0,
    marketingCost: 0,
    agencyFee: 0,
    shopifyBillingCost: 0,
    miscCost: 0,
    cancelledTags: [],
    rtoTags: [],
    returnTags: [],
    editedTags: [],
    enableAlerts: true,
    cancellationThreshold: 10,
    refundThreshold: 5,
    alertCancellationSpike: true,
    alertSalesDrop: true,
    alertRefundSpike: true,
    alertInventoryLow: true,
    syncFrequency: 'manual',
    vipThreshold: 1000,
    churnDays: 90,
    multiCurrency: false,
    taxIncluded: true,
    taxRate: 18,
    enableScheduledReports: false,
    reportFrequency: 'weekly',
    autoExport: false,
    theme: 'light',
    defaultDateRange: 'last_30_days',
};

import { RedisService } from '../services/redis.service';

export class SettingsController {
    static async getSettings(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;

            const [settings, store] = await Promise.all([
                prisma.storeSettings.findUnique({ where: { storeId } }),
                prisma.store.findUnique({ where: { id: storeId }, select: { currency: true } })
            ]);

            if (!settings) {
                return res.json({
                    ...DEFAULT_SETTINGS,
                    storeId,
                    currency: store?.currency || 'USD'
                });
            }

            return res.json({
                ...settings,
                currency: store?.currency || 'USD',
                refreshFreq: settings.syncFrequency // Backwards compatibility for frontend
            });
        } catch (error) {
            console.error('Get settings error:', error);
            return res.status(500).json({ error: 'Failed to fetch settings' });
        }
    }

    static async updateSettings(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const updateData = req.body;

            // 1. Separate Store-level fields from Settings-level fields
            const { currency, ...settingsData } = updateData;

            // 2. Update Store Currency if provided
            if (currency) {
                await prisma.store.update({
                    where: { id: storeId },
                    data: { currency }
                });
            }

            // 3. Map frontend fields to DB schema
            // frontend 'refreshFreq' -> DB 'syncFrequency'
            if (settingsData.refreshFreq) {
                settingsData.syncFrequency = settingsData.refreshFreq;
            } else if (settingsData.syncFrequency) {
                settingsData.refreshFreq = settingsData.syncFrequency;
            }

            // 4. Sanitize: Remove fields that don't belong via strict picking or try-catch approach.
            // Since explicit picking is verbose, we'll strip known non-schema fields.
            // Note: Prisma throws if unknown fields are passed.
            const validFields: any = {};
            const schemaFields = [
                'enableStoreLevelProfit', 'enableProfitTracking', 'defaultShippingCost', 'defaultPackagingCost', 'defaultCogsPercentage', 'codExtraCharge',
                'paymentGatewayFee', 'returnCost', 'rtoCost', 'marketingCost', 'agencyFee',
                'shopifyBillingCost', 'miscCost', 'useProductCost', 'cancelledTags', 'rtoTags', 'returnTags', 'editedTags',
                'enableAlerts', 'cancellationThreshold', 'refundThreshold', 'alertCancellationSpike',
                'alertSalesDrop', 'alertRefundSpike', 'alertInventoryLow', 'syncFrequency', 'vipThreshold',
                'churnDays', 'multiCurrency', 'taxIncluded', 'taxRate', 'enableScheduledReports',
                'reportFrequency', 'reportEmail', 'autoExport', 'theme', 'defaultDateRange',
                'facebookSpend', 'googleAdsSpend', 'instagramSpend', 'tiktokSpend', 'emailMarketingSpend',
                'alertRoas', 'alertMargin', 'roasThreshold', 'marginThreshold'
            ];

            console.log(`[SettingsUpdate] Store: ${storeId}, Received keys: ${Object.keys(settingsData).join(', ')}`);
            
            schemaFields.forEach(field => {
                if (settingsData[field] !== undefined) {
                    validFields[field] = settingsData[field];
                }
            });

            console.log(`[SettingsUpdate] Valid fields: ${Object.keys(validFields).join(', ')}`);

            // 5. Update StoreSettings
            const settings = await prisma.storeSettings.upsert({
                where: { storeId },
                update: validFields,
                create: {
                    storeId,
                    ...validFields,
                    // Ensure required defaults if missing
                    cancelledTags: validFields.cancelledTags || [],
                    rtoTags: validFields.rtoTags || [],
                    returnTags: validFields.returnTags || [],
                    editedTags: validFields.editedTags || [],
                }
            });

            // 6. Invalidate Dashboard Cache
            console.log(`[SettingsUpdate] Success for ${storeId}, flushing cache...`);
            // We flush all dashboard metrics for this store to ensure cost settings are reflected immediately
            await RedisService.flushPattern(`dashboard:*:${storeId}:*`);
            await RedisService.flushPattern(`sales_intelligence:${storeId}:*`);

            return res.json({
                ...settings,
                currency: currency || 'USD',
                refreshFreq: settings.syncFrequency
            });
        } catch (error) {
            console.error('Update settings error:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
    }
}

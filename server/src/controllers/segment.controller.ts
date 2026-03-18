import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { ExportService } from '../services/export.service';
import { CustomerService } from '../services/customer.service';

interface Filter {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'sw' | 'ew';
    value: any;
}

export class SegmentController {
    private exportService: ExportService;

    constructor() {
        this.exportService = new ExportService();
    }

    /**
     * Build Prisma Where Clause from generic filters
     */
    private buildWhereClause(storeId: string, filters: Filter[], _type: 'order' | 'customer' | 'product') {
        const where: any = { storeId };

        if (!filters || !Array.isArray(filters)) return where;

        for (const filter of filters) {
            const { field, operator, value } = filter;
            if (value === undefined || value === '') continue;

            // Handle type-specific field mapping or validation if needed
            // For now, assume frontend sends valid Prisma field names

            let prismaOp: any;
            let typedValue = value;

            // Type coercion based on field names (naive approach, can be enhanced with schema introspection or config)
            const isNumberField = ['totalPrice', 'subtotalPrice', 'totalSpent', 'totalOrders', 'averageOrderValue', 'price', 'cost', 'inventoryQuantity', 'recencyDays', 'rfmScore', 'frequency', 'monetary', 'totalSold', 'totalRevenue'].includes(field);
            const isDateField = ['createdAt', 'updatedAt', 'orderDate', 'lastOrderDate', 'firstOrderDate'].includes(field);
            const isBooleanField = ['isCancelled', 'isRTO', 'isReturned'].includes(field);

            if (isNumberField) typedValue = Number(value);
            if (isBooleanField) typedValue = value === 'true' || value === true;
            if (isDateField) typedValue = new Date(value);

            switch (operator) {
                case 'equals':
                    if (typeof typedValue === 'string') {
                        prismaOp = { equals: typedValue, mode: 'insensitive' };
                    } else {
                        prismaOp = typedValue;
                    }
                    break;
                case 'notEquals':
                    prismaOp = { not: typedValue };
                    break;
                case 'contains':
                    prismaOp = { contains: String(value), mode: 'insensitive' };
                    break;
                case 'sw': // startsWith
                    prismaOp = { startsWith: String(value), mode: 'insensitive' };
                    break;
                case 'ew': // endsWith
                    prismaOp = { endsWith: String(value), mode: 'insensitive' };
                    break;
                case 'gt':
                    prismaOp = { gt: typedValue };
                    break;
                case 'lt':
                    prismaOp = { lt: typedValue };
                    break;
                case 'gte':
                    prismaOp = { gte: typedValue };
                    break;
                case 'lte':
                    prismaOp = { lte: typedValue };
                    break;
                case 'in':
                    const list = String(value).split(',').map(v => v.trim());
                    prismaOp = { in: list };
                    break;
                default:
                    continue;
            }

            // Handle Collection filtering for Products
            if (field === 'collection' && _type === 'product') {
                where.collections = {
                    some: {
                        collection: {
                            title: prismaOp
                        }
                    }
                };
                continue;
            }

            // Handle Variant-level filtering for Products (SKU, Price, Cost, Inventory)
            const variantFields = ['sku', 'price', 'compareAtPrice', 'cost', 'inventoryQuantity'];
            if (_type === 'product' && variantFields.includes(field)) {
                where.variants = {
                    some: {
                        [field]: prismaOp
                    }
                };
                continue;
            }

            // Handle nested fields (e.g., customer.firstName for orders)
            if (field.includes('.')) {
                const [relation, nestedField] = field.split('.');
                if (!where[relation]) where[relation] = {};
                where[relation][nestedField] = prismaOp;
            } else {
                where[field] = prismaOp;
            }
        }

        return where;
    }

    /**
     * Query Segment (JSON result)
     */
    querySegment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user || { storeId: req.body.storeId }; // Allow body for testing if needed
            const { type, filters, page = 1, limit = 50 } = req.body;

            const where = this.buildWhereClause(storeId, filters, type);
            const skip = (page - 1) * limit;

            let data;
            let total;

            if (type === 'order') {
                [data, total] = await Promise.all([
                    prisma.order.findMany({ where, skip, take: limit, orderBy: { orderDate: 'desc' }, include: { customer: true } }),
                    prisma.order.count({ where })
                ]);
            } else if (type === 'customer') {
                const [customers, totalCount, store, settings] = await Promise.all([
                    prisma.customer.findMany({ where, skip, take: limit, orderBy: { totalSpent: 'desc' } }),
                    prisma.customer.count({ where }),
                    prisma.store.findUnique({ where: { id: storeId }, select: { shopifyDomain: true } }),
                    prisma.storeSettings.findUnique({ where: { storeId } })
                ]);
                const enriched = customers.map(c => CustomerService.enrichCustomer(c, settings, store?.shopifyDomain || ''));
                res.json({ data: enriched, total: totalCount, page, pages: Math.ceil(totalCount / limit) });
                return;
            } else if (type === 'product') {
                const [products, totalCount] = await Promise.all([
                    prisma.product.findMany({
                        where,
                        skip,
                        take: limit,
                        orderBy: { totalRevenue: 'desc' },
                        include: { variants: true }
                    }),
                    prisma.product.count({ where })
                ]);

                const enriched = products.map(p => {
                    const totalInventory = p.variants.reduce((sum, v) => sum + (v.inventoryQuantity || 0), 0);
                    const prices = p.variants.map(v => v.price || 0);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const skus = p.variants.map(v => v.sku).filter(Boolean);

                    return {
                        ...p,
                        sku: skus.length > 0 ? skus[0] : null,
                        price: minPrice,
                        inventoryQuantity: totalInventory
                    };
                });

                res.json({ data: enriched, total: totalCount, page, pages: Math.ceil(totalCount / limit) });
                return;
            } else {
                res.status(400).json({ error: 'Invalid segment type' });
                return;
            }

            res.json({ data, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('[SegmentController] Query error:', error);
            next(error);
        }
    };

    /**
     * Export Segment (CSV file)
     */
    exportSegment = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = (req as any).user!;
            const { type, filters } = req.body;

            const where = this.buildWhereClause(storeId, filters, type);
            // Reuse ExportService with custom 'manual' method or enhanced existing ones
            // Since ExportService methods define their own lookups, we might need a generic 'exportByWhere' or update existing ones.
            // For flexibility, let's implement a 'exportGeneric' in ExportService or just use prisma here and convert.
            // Better to keep logic in Service.

            const csvData = await this.exportService.exportByCriteria(storeId, type, where);

            const filename = `${type}_segment_export_${new Date().toISOString().split('T')[0]}.csv`;

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.status(200).send(csvData);

        } catch (error) {
            console.error('[SegmentController] Export error:', error);
            next(error);
        }
    };
}

export default new SegmentController();

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ShopifyService } from '../services/shopify.service';
import { DashboardService } from '../services/dashboard.service';

const prisma = new PrismaClient();

export class ProductsController {
    static buildWhereClause(query: any, storeId: string) {
        const { filter, query: search_query, productType, vendor, inventoryStatus, minInventory, maxInventory } = query;

        const where: any = {
            storeId,
        };

        if (productType) {
            where.productType = productType as string;
        }

        if (vendor) {
            where.vendor = vendor as string;
        }

        // Inventory Filters
        if (inventoryStatus) {
            if (inventoryStatus === 'out_of_stock') {
                where.variants = { every: { inventoryQuantity: 0 } };
            } else if (inventoryStatus === 'low_stock') {
                where.variants = { some: { inventoryQuantity: { gt: 0, lte: 10 } } };
            } else if (inventoryStatus === 'in_stock') {
                where.variants = { some: { inventoryQuantity: { gt: 0 } } };
            }
        }

        if (minInventory !== undefined || maxInventory !== undefined) {
            where.variants = {
                ...where.variants,
                some: {
                    ...(where.variants?.some || {}),
                    inventoryQuantity: {
                        ...(where.variants?.some?.inventoryQuantity || {}),
                        ...(minInventory !== undefined && { gte: Number(minInventory) }),
                        ...(maxInventory !== undefined && { lte: Number(maxInventory) }),
                    }
                }
            };
        }

        if (filter && typeof filter === 'string') {
            switch (filter) {
                case 'high_cancellation':
                    where.cancellationRate = { gt: 0 };
                    break;
                case 'low_inventory':
                    where.variants = { some: { inventoryQuantity: { gt: 0, lte: 10 } } };
                    break;
                case 'out_of_stock':
                    where.variants = { every: { inventoryQuantity: 0 } };
                    break;
            }
        }

        if (search_query) {
            where.OR = [
                { title: { contains: search_query as string, mode: 'insensitive' } },
                { vendor: { contains: search_query as string, mode: 'insensitive' } },
                { productType: { contains: search_query as string, mode: 'insensitive' } },
            ];
        }

        return where;
    }

    static async getProducts(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { page = 1, limit = 20, filter, startDate, endDate } = req.query;

            console.log('[getProducts] Query Params:', req.query);

            const pageNum = Number(page);
            const limitNum = Number(limit);

            const where = ProductsController.buildWhereClause(req.query, storeId);

            let orderBy: any = { totalRevenue: 'desc' };

            if (filter && typeof filter === 'string') {
                switch (filter) {
                    case 'top_selling':
                        // If date range is provided, sorting is handled after fetching and calculating period-specific sales
                        if (!startDate && !endDate) {
                            orderBy = { totalSold: 'desc' };
                        }
                        break;
                    case 'profitable':
                        if (!startDate && !endDate) {
                            orderBy = { totalRevenue: 'desc' };
                        }
                        break;
                    case 'high_cancellation':
                        orderBy = { cancellationRate: 'desc' };
                        where.cancellationRate = { gt: 0 };
                        break;
                    case 'fast_growing':
                        if (!startDate && !endDate) {
                            orderBy = { totalSold: 'desc' };
                        }
                        break;
                }
            }

            let products: any[] = [];
            let total = 0;

            const lineItemWhere: any = {};
            if (startDate || endDate) {
                lineItemWhere.order = {
                    orderDate: {}
                };
                if (startDate) lineItemWhere.order.orderDate.gte = new Date(startDate as string);
                if (endDate) lineItemWhere.order.orderDate.lte = new Date(endDate as string);
            }

            if (filter === 'top_collections') {
                const allProducts = await prisma.product.findMany({
                    where,
                    include: {
                        lineItems: {
                            where: lineItemWhere,
                            select: {
                                quantity: true,
                                price: true
                            }
                        }
                    }
                });

                // Calculate Revenue per Collection for the period
                const isRangeFiltered = !!(startDate || endDate);
                const collectionRevenue = new Map<string, number>();
                allProducts.forEach(p => {
                    const type = p.productType || 'Uncategorized';
                    const revenue = isRangeFiltered
                        ? p.lineItems.reduce((acc, li) => acc + (li.quantity * li.price), 0)
                        : p.totalRevenue;
                    collectionRevenue.set(type, (collectionRevenue.get(type) || 0) + (revenue || 0));
                });

                // Sort Products by Collection Revenue
                allProducts.sort((a, b) => {
                    const typeA = a.productType || 'Uncategorized';
                    const typeB = b.productType || 'Uncategorized';

                    const revA = collectionRevenue.get(typeA) || 0;
                    const revB = collectionRevenue.get(typeB) || 0;

                    if (revA !== revB) {
                        return revB - revA;
                        // For same collection, sort by product revenue
                    }
                    const prodRevA = isRangeFiltered ? a.lineItems.reduce((acc, li) => acc + (li.quantity * li.price), 0) : a.totalRevenue;
                    const prodRevB = isRangeFiltered ? b.lineItems.reduce((acc, li) => acc + (li.quantity * li.price), 0) : b.totalRevenue;
                    return (prodRevB || 0) - (prodRevA || 0);
                });

                total = allProducts.length;

                const startIndex = (pageNum - 1) * limitNum;
                const pagedProducts = allProducts.slice(startIndex, startIndex + limitNum);
                const pagedIds = pagedProducts.map(p => p.id);

                const unorderedProducts = await prisma.product.findMany({
                    where: { id: { in: pagedIds } },
                    include: {
                        lineItems: {
                            where: lineItemWhere,
                            include: {
                                order: true
                            }
                        },
                    }
                });

                products = pagedIds.map(id => unorderedProducts.find(p => p.id === id)).filter(Boolean);

            } else {
                // Standard Query Path
                [products, total] = await Promise.all([
                    prisma.product.findMany({
                        where,
                        orderBy,
                        skip: (pageNum - 1) * limitNum,
                        take: limitNum,
                        include: {
                            variants: true,
                            lineItems: {
                                where: lineItemWhere, // Apply range filter to line items
                                include: {
                                    order: true
                                }
                            },
                        }
                    }),
                    prisma.product.count({ where })
                ]);
            }

            // Fetch Store Settings
            const settings = await prisma.storeSettings.findUnique({
                where: { storeId },
                select: {
                    useProductCost: true,
                    defaultCogsPercentage: true,
                    taxIncluded: true,
                    taxRate: true
                }
            });

            console.log('[getProducts] Final Where Clause:', JSON.stringify(where, null, 2));

            const mappedProducts = products.map(p => {
                const isRangeFiltered = !!(startDate || endDate);
                const unitsSold = isRangeFiltered ? p.lineItems.reduce((acc: number, li: any) => acc + li.quantity, 0) : p.totalSold;
                const totalRevenue = isRangeFiltered ? p.lineItems.reduce((acc: number, li: any) => acc + (li.quantity * li.price), 0) : p.totalRevenue;
                const totalCancelled = isRangeFiltered ? p.lineItems.filter((li: any) => li.order?.isCancelled).reduce((acc: number, li: any) => acc + li.quantity, 0) : p.totalCancelled;

                // --- DYNAMIC PROFIT CALCULATION ---
                // For multi-variant, we'll use the first variant as representative for single-value UI fields
                const primaryVariant = p.variants?.[0];
                const price = primaryVariant?.price || 0;
                const cost = primaryVariant?.cost || 0;
                const totalInventory = p.variants?.reduce((sum: number, v: any) => sum + (v.inventoryQuantity || 0), 0) || 0;

                let costPerUnit = 0;
                if (settings?.useProductCost && cost) {
                    costPerUnit = cost;
                } else {
                    const cogsPercent = settings?.defaultCogsPercentage || 0;
                    costPerUnit = (Number(price) * cogsPercent) / 100;
                }
                const totalCost = unitsSold * costPerUnit;

                // --- TAX CALCULATION ---
                const { taxAmount, taxRate: appliedTaxRate, netRevenue } = DashboardService.calculateTaxBreakdown(totalRevenue, settings);
                const estimatedProfit = netRevenue - totalCost;
                const profitMargin = netRevenue > 0 ? (estimatedProfit / netRevenue) * 100 : 0;
                // -----------------------

                const cancellationRate = p.cancellationRate;

                let status = 'Stable';
                if (profitMargin > 20) status = 'Profitable';
                else if (profitMargin < 0) status = 'Loss Making';
                else if (profitMargin < 10) status = 'Low Margin';

                let growthStatus = 'Stable';
                if (unitsSold > 50) growthStatus = 'Fast Growing';

                let inventoryRisk = 'Safe';
                if (totalInventory === 0) inventoryRisk = 'Out of Stock';
                else if (totalInventory <= 10) inventoryRisk = 'Low Stock';

                const cities = new Map<string, number>();
                p.lineItems.forEach((li: any) => {
                    if (li.order?.shippingAddressCity) {
                        cities.set(li.order.shippingAddressCity, (cities.get(li.order.shippingAddressCity) || 0) + li.quantity);
                    }
                });
                const topCities = Array.from(cities.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([city]) => city);

                return {
                    ...p,
                    name: p.title,
                    units_sold: unitsSold,
                    total_revenue: totalRevenue,
                    total_cost: parseFloat(totalCost.toFixed(2)),
                    unit_cost: parseFloat(costPerUnit.toFixed(2)),
                    tax_amount: parseFloat(taxAmount.toFixed(2)),
                    tax_rate: appliedTaxRate,
                    discount_amount: 0,
                    estimated_profit: parseFloat(estimatedProfit.toFixed(2)),
                    profit_margin: parseFloat(profitMargin.toFixed(2)),
                    cancellation_count: totalCancelled,
                    return_count: 0,
                    cancellation_rate: parseFloat(cancellationRate.toFixed(2)),
                    rto_rate: 0,
                    net_revenue: parseFloat(netRevenue.toFixed(2)),
                    inventory_available: totalInventory,
                    sku: primaryVariant?.sku || 'N/A',
                    price: price,
                    status,
                    growth_status: growthStatus,
                    inventory_risk: inventoryRisk,
                    discount_dependency: 'Low',
                    top_cities: topCities,
                    repeat_purchase_rate: 0
                };
            });

            // Post-map sorting for range filters
            if (startDate || endDate) {
                if (filter === 'top_selling' || filter === 'fast_growing') {
                    mappedProducts.sort((a, b) => b.units_sold - a.units_sold);
                } else if (filter === 'profitable') {
                    mappedProducts.sort((a, b) => b.total_revenue - a.total_revenue);
                } else if (filter === 'loss') {
                    mappedProducts.sort((a, b) => a.estimated_profit - b.estimated_profit);
                } else if (filter === 'high_cancellation') {
                    mappedProducts.sort((a, b) => b.cancellation_count - a.cancellation_count);
                }
            }

            return res.json({
                data: mappedProducts,
                meta: {
                    current_page: pageNum,
                    per_page: limitNum,
                    total,
                    total_pages: Math.ceil(total / limitNum)
                }
            });
        } catch (error) {
            console.error('Get products error:', error);
            return res.status(500).json({ error: 'Failed to fetch products' });
        }
    }

    static async getProductDetails(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;

            const product = await prisma.product.findFirst({
                where: { id, storeId },
                include: {
                    variants: true,
                    lineItems: {
                        take: 10,
                        orderBy: { createdAt: 'desc' },
                    }
                }
            });

            if (!product) return res.status(404).json({ error: 'Product not found' });

            const primaryVariant = product.variants?.[0];
            return res.json({
                ...product,
                name: product.title,
                units_sold: product.totalSold,
                total_revenue: product.totalRevenue,
                price: primaryVariant?.price || 0,
                sku: primaryVariant?.sku || 'N/A'
            });
        } catch (error) {
            console.error('Get product details error:', error);
            return res.status(500).json({ error: 'Failed to fetch product details' });
        }
    }

    static async updateInventory(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { id } = req.params;
            const { quantity } = req.body;

            const product = await prisma.product.findFirst({
                where: { id, storeId },
                include: {
                    store: true,
                    variants: true
                }
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }

            const store = product.store;

            // For single-variant update, we'll update the first variant by default
            // In a real app, the frontend would pass the variantId
            const primaryVariant = product.variants?.[0];

            if (!primaryVariant) {
                return res.status(404).json({ error: 'No variants found for this product' });
            }

            let inventoryItemId = primaryVariant.inventoryItemId;
            let shopifyVariantId = primaryVariant.shopifyVariantId;

            // Self-healing: If IDs are missing, fetch from Shopify
            if (!inventoryItemId || !shopifyVariantId) {
                try {
                    console.log(`[Self-Heal] Missing IDs for variant ${primaryVariant.id}. Fetching from Shopify...`);
                    const shopifyProduct = await ShopifyService.fetchProduct(store.shopifyDomain, store.accessToken, product.shopifyProductId);
                    const v = shopifyProduct?.variants?.[0];

                    if (v) {
                        const newInventoryItemId = v.inventory_item_id?.toString();
                        const newShopifyVariantId = v.id?.toString();

                        if (newInventoryItemId && newShopifyVariantId) {
                            await prisma.productVariant.update({
                                where: { id: primaryVariant.id },
                                data: {
                                    inventoryItemId: newInventoryItemId,
                                    shopifyVariantId: newShopifyVariantId
                                }
                            });
                            // Update local variables for downstream use
                            inventoryItemId = newInventoryItemId;
                            shopifyVariantId = newShopifyVariantId;
                            console.log(`[Self-Heal] Restored IDs: Variant=${newShopifyVariantId}, InventoryItem=${newInventoryItemId}`);
                        }
                    }
                } catch (err) {
                    console.error('[Self-Heal] Failed to fetch product details:', err);
                }
            }

            if (!inventoryItemId) {
                return res.status(400).json({ error: 'Product or Inventory Item ID not found. Please sync products.' });
            }

            let locationId = store.primaryLocationId;

            // Fetch location if not stored
            if (!locationId) {
                const { ShopifyService } = require('../services/shopify.service');
                const locations = await ShopifyService.fetchLocations(store.shopifyDomain, store.accessToken);
                if (locations && locations.length > 0) {
                    locationId = locations[0].id.toString();
                    await prisma.store.update({
                        where: { id: store.id },
                        data: { primaryLocationId: locationId }
                    });
                } else {
                    return res.status(400).json({ error: 'No active locations found in Shopify' });
                }
            }

            console.log(`[UpdateInventory] details: InventoryItem=${inventoryItemId}, Location=${locationId}, Qty=${quantity}`);

            // Update in Shopify via GraphQL
            const { shopify } = require('../config/shopify');
            const client = new shopify.clients.Graphql({
                session: {
                    shop: store.shopifyDomain,
                    accessToken: store.accessToken,
                } as any,
            });

            const mutation = `
                mutation inventorySet($input: InventorySetQuantitiesInput!) {
                  inventorySetQuantities(input: $input) {
                    userErrors {
                      field
                      message
                    }
                  }
                }
            `;

            const response: any = await client.query({
                data: {
                    query: mutation,
                    variables: {
                        input: {
                            name: "available",
                            reason: "correction",
                            ignoreCompareQuantity: true, // Force update without checking previous quantity
                            quantities: [
                                {
                                    inventoryItemId: `gid://shopify/InventoryItem/${inventoryItemId}`,
                                    locationId: `gid://shopify/Location/${locationId}`,
                                    quantity: parseInt(quantity)
                                }
                            ]
                        }
                    },
                },
            });

            console.log('[UpdateInventory] Shopify Response:', JSON.stringify(response.body));

            const userErrors = response.body.data?.inventorySetQuantities?.userErrors;
            if (userErrors && userErrors.length > 0) {
                console.error('[UpdateInventory] UserErrors:', userErrors);
                return res.status(400).json({ error: userErrors[0].message });
            }

            // Update locally
            await prisma.productVariant.update({
                where: { id: primaryVariant.id },
                data: { inventoryQuantity: parseInt(quantity) }
            });

            return res.json({ success: true, newQuantity: quantity });
        } catch (error: any) {
            console.error('Update inventory error:', error);
            return res.status(500).json({ error: `Failed to update inventory: ${error.message}` });
        }
    }

    static async bulkUpdateInventory(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { productIds, quantity } = req.body;

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({ error: 'No products selected' });
            }

            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, storeId },
                include: {
                    store: true,
                    variants: true
                }
            });

            if (products.length === 0) return res.status(404).json({ error: 'No valid products found' });

            const store = products[0].store;
            let locationId = store.primaryLocationId;

            if (!locationId) {
                const { ShopifyService } = require('../services/shopify.service');
                const locations = await ShopifyService.fetchLocations(store.shopifyDomain, store.accessToken);
                if (locations && locations.length > 0) {
                    locationId = locations[0].id.toString();
                    await prisma.store.update({
                        where: { id: store.id },
                        data: { primaryLocationId: locationId }
                    });
                } else {
                    return res.status(400).json({ error: 'No active locations found in Shopify' });
                }
            }

            const { shopify } = require('../config/shopify');
            const client = new shopify.clients.Graphql({
                session: {
                    shop: store.shopifyDomain,
                    accessToken: store.accessToken,
                } as any,
            });

            const mutation = `
                mutation inventorySet($input: InventorySetQuantitiesInput!) {
                  inventorySetQuantities(input: $input) {
                    userErrors {
                      field
                      message
                    }
                  }
                }
            `;

            const quantities = products
                .flatMap(p => p.variants)
                .filter(v => v.inventoryItemId)
                .map(v => ({
                    inventoryItemId: `gid://shopify/InventoryItem/${v.inventoryItemId}`,
                    locationId: `gid://shopify/Location/${locationId}`,
                    quantity: parseInt(quantity)
                }));

            if (quantities.length === 0) return res.status(400).json({ error: 'None of the selected products have inventory tracking' });

            const response: any = await client.query({
                data: {
                    query: mutation,
                    variables: {
                        input: {
                            name: "available",
                            reason: "correction",
                            quantities: quantities
                        }
                    },
                },
            });

            const userErrors = response.body.data?.inventorySetQuantities?.userErrors;
            if (userErrors && userErrors.length > 0) {
                return res.status(400).json({ error: userErrors[0].message });
            }

            // Update locally in bulk
            await prisma.productVariant.updateMany({
                where: { productId: { in: products.map(p => p.id) } },
                data: { inventoryQuantity: parseInt(quantity) }
            });

            return res.json({ success: true, updatedCount: quantities.length });
        } catch (error) {
            console.error('Bulk update inventory error:', error);
            return res.status(500).json({ error: 'Failed to bulk update inventory' });
        }
    }


    static async getCollections(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const lineItemWhere: any = {};
            if (startDate || endDate) {
                lineItemWhere.order = {
                    orderDate: {}
                };
                if (startDate) lineItemWhere.order.orderDate.gte = new Date(startDate as string);
                if (endDate) lineItemWhere.order.orderDate.lte = new Date(endDate as string);
            }

            const [products, settings] = await Promise.all([
                prisma.product.findMany({
                    where: { storeId },
                    include: {
                        variants: true,
                        lineItems: {
                            where: lineItemWhere,
                            select: {
                                quantity: true,
                                price: true
                            }
                        }
                    }
                }),
                prisma.storeSettings.findUnique({
                    where: { storeId },
                    select: {
                        useProductCost: true,
                        defaultCogsPercentage: true,
                        taxIncluded: true,
                        taxRate: true
                    }
                })
            ]);

            const collectionsMap = new Map<string, {
                name: string;
                totalRevenue: number;
                totalCost: number;
                totalSold: number;
                productCount: number;
                totalPrice: number;
            }>();

            const isRangeSelected = !!(startDate || endDate);
            const queryName = (req.query.query as string)?.toLowerCase();

            products.forEach(p => {
                const type = p.productType || 'Uncategorized';

                // Filter by collection name (product type) if query is present
                if (queryName && !type.toLowerCase().includes(queryName)) {
                    return;
                }

                if (!collectionsMap.has(type)) {
                    collectionsMap.set(type, {
                        name: type,
                        totalRevenue: 0,
                        totalCost: 0,
                        totalSold: 0,
                        productCount: 0,
                        totalPrice: 0
                    });
                }
                const stats = collectionsMap.get(type)!;

                const revenue = isRangeSelected
                    ? p.lineItems.reduce((acc, li) => acc + (li.quantity * li.price), 0)
                    : p.totalRevenue;

                const units = isRangeSelected
                    ? p.lineItems.reduce((acc, li) => acc + li.quantity, 0)
                    : p.totalSold;

                // --- DYNAMIC PROFIT CALCULATION ---
                // For collections, we use the first variant of each product as a representative for price/cost
                const primaryVariant = p.variants?.[0];
                const price = primaryVariant?.price || 0;
                const costPerProduct = primaryVariant?.cost || 0;

                let costPerUnit = 0;
                if (settings?.useProductCost && costPerProduct) {
                    costPerUnit = costPerProduct;
                } else {
                    const cogsPercent = settings?.defaultCogsPercentage || 0;
                    costPerUnit = (Number(price) * cogsPercent) / 100;
                }
                const cost = units * costPerUnit;
                // ---------------------------------

                stats.totalRevenue += (revenue || 0);
                stats.totalCost += (cost || 0);
                stats.totalSold += (units || 0);
                stats.productCount += 1;
                stats.totalPrice += Number(price);
            });

            const collections = Array.from(collectionsMap.values())
                .map(c => {
                    const profit = (c.totalRevenue || 0) - (c.totalCost || 0);
                    const margin = c.totalRevenue > 0 ? (profit / c.totalRevenue) * 100 : 0;

                    return {
                        name: c.name,
                        totalRevenue: c.totalRevenue,
                        estimatedProfit: parseFloat(profit.toFixed(2)),
                        profitMargin: parseFloat(margin.toFixed(2)),
                        itemsSold: c.totalSold,
                        productCount: c.productCount,
                        avgPrice: c.productCount > 0 ? (c.totalPrice / c.productCount) : 0
                    };
                })
                .filter(c => !isRangeSelected || c.itemsSold > 0) // Hide empty collections for the period if range selected
                .sort((a, b) => b.totalRevenue - a.totalRevenue);

            return res.json({ data: collections });
        } catch (error) {
            console.error('Get collections error:', error);
            return res.status(500).json({ error: 'Failed to fetch collections' });
        }
    }
    static async getProductsSummary(req: Request, res: Response) {
        try {
            const { storeId } = (req as any).user!;
            const { startDate, endDate } = req.query;

            const now = new Date();
            const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(now.getDate() - 30));
            const end = endDate ? new Date(endDate as string) : now;

            // Calculate previous period for comparison
            const durationMs = end.getTime() - start.getTime();
            const prevEnd = new Date(end.getTime() - durationMs);

            const [products, storeSettings, recentOrders, salesSinceEnd, salesSincePrevEnd] = await Promise.all([
                prisma.product.findMany({
                    where: { storeId },
                    select: {
                        id: true,
                        title: true,
                        productType: true,
                        variants: true,
                        totalRevenue: true,
                        cancellationRate: true,
                        lineItems: {
                            where: {
                                order: {
                                    orderDate: { gte: start, lte: end }
                                }
                            },
                            select: {
                                quantity: true,
                                price: true
                            }
                        }
                    }
                }),
                prisma.storeSettings.findUnique({
                    where: { storeId }
                }),
                prisma.order.findMany({
                    where: {
                        storeId,
                        orderDate: { gte: start, lte: end }
                    },
                    select: {
                        totalPrice: true,
                        tags: true,
                        isCancelled: true,
                        isRTO: true
                    }
                }),
                // Approximation: Stock at T = Current Stock + Sales from T to Now
                prisma.orderLineItem.groupBy({
                    by: ['productId'],
                    where: {
                        storeId,
                        order: {
                            orderDate: { gt: end },
                            isCancelled: false,
                            isRTO: false
                        }
                    },
                    _sum: { quantity: true }
                }),
                prisma.orderLineItem.groupBy({
                    by: ['productId'],
                    where: {
                        storeId,
                        order: {
                            orderDate: { gt: prevEnd },
                            isCancelled: false,
                            isRTO: false
                        }
                    },
                    _sum: { quantity: true }
                })
            ]);

            const totalProducts = products.length;

            // Map sales for easy lookup
            const endSalesMap = new Map(salesSinceEnd.map(s => [s.productId, s._sum.quantity || 0]));
            const prevEndSalesMap = new Map(salesSincePrevEnd.map(s => [s.productId, s._sum.quantity || 0]));

            // Helper to determine health category
            const getHealthCategory = (qty: number) => {
                if (qty <= 0) return 'oos';
                if (qty <= 10) return 'low';
                return 'healthy';
            };

            const currentPeriodHealth = { healthy: 0, low: 0, oos: 0 };
            const prevPeriodHealth = { healthy: 0, low: 0, oos: 0 };

            products.forEach(p => {
                const soldSinceEnd = endSalesMap.get(p.id) || 0;
                const soldSincePrevEnd = prevEndSalesMap.get(p.id) || 0;

                const totalInventory = p.variants?.reduce((sum: number, v: any) => sum + (v.inventoryQuantity || 0), 0) || 0;
                const stockAtEnd = totalInventory + soldSinceEnd;
                const stockAtPrevEnd = totalInventory + soldSincePrevEnd;

                currentPeriodHealth[getHealthCategory(stockAtEnd)]++;
                prevPeriodHealth[getHealthCategory(stockAtPrevEnd)]++;
            });

            // Calculate Growth/Change
            const getGrowth = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return parseFloat(((curr - prev) / prev * 100).toFixed(1));
            };

            // 1. Inventory Health Result
            const inventoryHealth = [
                { name: 'Healthy', value: currentPeriodHealth.healthy, prevValue: prevPeriodHealth.healthy, color: '#10b981', growth: getGrowth(currentPeriodHealth.healthy, prevPeriodHealth.healthy) },
                { name: 'Low Stock', value: currentPeriodHealth.low, prevValue: prevPeriodHealth.low, color: '#f59e0b', growth: getGrowth(currentPeriodHealth.low, prevPeriodHealth.low) },
                { name: 'Out of Stock', value: currentPeriodHealth.oos, prevValue: prevPeriodHealth.oos, color: '#ef4444', growth: getGrowth(currentPeriodHealth.oos, prevPeriodHealth.oos) },
            ];

            // 2. Top Collections (Product Types) - Recalculate based on range
            const collectionRevenueMap = new Map<string, number>();
            const isRangeSelected = !!(startDate || endDate);

            products.forEach(p => {
                const type = p.productType || 'Uncategorized';
                const revenue = isRangeSelected
                    ? p.lineItems.reduce((acc, li) => acc + (li.quantity * li.price), 0)
                    : p.totalRevenue;
                collectionRevenueMap.set(type, (collectionRevenueMap.get(type) || 0) + revenue);
            });

            const topCollections = Array.from(collectionRevenueMap.entries())
                .map(([name, revenue]) => ({ name, revenue }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3);

            // 3. RTO and Cancellation Logic
            const rtoTags = storeSettings?.rtoTags || [];
            const cancelledTags = storeSettings?.cancelledTags || [];

            const checkTags = (orderTags: string[], matchTags: string[]) =>
                orderTags.some(tag => matchTags.includes(tag));

            let totalRtoAmount = 0;
            let totalCancelledAmount = 0;

            recentOrders.forEach(order => {
                const isRTO = order.isRTO || checkTags(order.tags, rtoTags);
                const isCancelled = order.isCancelled || checkTags(order.tags, cancelledTags);

                if (isRTO) totalRtoAmount += order.totalPrice;
                if (isCancelled) totalCancelledAmount += order.totalPrice;
            });

            return res.json({
                inventoryHealth,
                topCollections,
                totalRtoAmount: Math.round(totalRtoAmount),
                totalCancelledAmount: Math.round(totalCancelledAmount),
                totalProducts
            });
        } catch (error) {
            console.error('Get products summary error:', error);
            return res.status(500).json({ error: 'Failed to fetch product summary' });
        }
    }
}

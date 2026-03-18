import prisma from '../config/prisma';
import { ShopifyService } from './shopify.service';
import { logger } from '../config/logger';
import { RedisService } from './redis.service';
import { shopify } from '../config/shopify';
import { v4 as uuidv4 } from 'uuid';
import { RFMService } from './rfm.service';
import { PredictionService } from './prediction.service';

export class SyncService {
    /**
     * Start a full sync for a store
     * CRITICAL: This logic is confirmed stable and authorized by the user. 
     * DO NOT CHANGE this logic or the flow below without explicit, forceful re-authorization.
     */
    static async fullSync(storeId: string) {
        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store) throw new Error('Store not found');

        const syncJob = await prisma.syncJob.create({
            data: {
                storeId,
                jobType: 'full',
                status: 'running',
            }
        });

        try {
            logger.info(`Starting Metadata, Collection, Product, and Customer sync sequentially for ${store.shopifyDomain}`);
            await this.syncShopMetadata(store);
            await this.syncCollections(store);
            await this.syncProducts(store, true);
            await this.syncCustomers(store);

            try {
                logger.info(`Prioritizing RECENT orders (Last 30 days) for ${store.shopifyDomain}`);
                await this.syncRecentOrders(store);

                logger.info(`Fetching updates to existing orders for ${store.shopifyDomain}`);
                await this.syncUpdatedOrders(store);

                // Gap Detection: If local count < 95% of Shopify count, start from scratch
                const localCount = await prisma.order.count({ where: { storeId: store.id } });
                const { orders: shopifyCount } = await ShopifyService.fetchCounts(store.shopifyDomain, store.accessToken);

                const forceBackfill = localCount < (shopifyCount * 0.95);
                if (forceBackfill) {
                    logger.info(`Gap detected for ${store.shopifyDomain} (Local: ${localCount}, Shopify: ${shopifyCount}). Forcing historical backfill.`);
                }

                await this.syncOrders(store, forceBackfill);
            } catch (err) {
                logger.error(`Order sync step failed for ${store.shopifyDomain}:`, err);
            }

            logger.info(`Updating Product Performance Metrics for ${store.shopifyDomain}`);
            try {
                await SyncService.updateProductMetrics(store.id);
            } catch (err) {
                logger.error(`Product metrics update failed for ${store.shopifyDomain}:`, err);
            }

            logger.info(`Updating Customer Intelligence Metrics for ${store.shopifyDomain}`);
            try {
                await SyncService.updateCustomerMetrics(store.id);
                // Also trigger RFM and Prediction analysis
                await RFMService.analyze(store.id);
                await PredictionService.analyze(store.id);
            } catch (err) {
                logger.error(`Customer metrics update failed for ${store.shopifyDomain}:`, err);
            }

            await prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                }
            });

            await prisma.store.update({
                where: { id: storeId },
                data: { lastSyncAt: new Date() }
            });

            // CRITICAL: Invalidate Dashboard Cache so UI reflects new data immediately
            try {
                logger.info(`Flushing dashboard cache for store ${storeId}`);
                await RedisService.flushPattern(`*:${storeId}:*`);
            } catch (e) {
                logger.warn('Failed to flush cache after sync:', e);
            }

            logger.info(`Full sync completed for ${store.shopifyDomain}`);
        } catch (error) {
            logger.error(`Full sync failed for ${store.shopifyDomain}:`, error);
            await prisma.syncJob.update({
                where: { id: syncJob.id },
                data: {
                    status: 'failed',
                    errorMessage: (error as Error).message,
                }
            });
        }
    }

    /**
     * Sync Products - Level 3 Optimized
     */
    private static async syncProducts(store: any, forceFull: boolean = false) {
        logger.info(`[SyncService] Starting syncProducts for ${store.shopifyDomain} (ForceFull: ${forceFull})`);

        // If we are doing a full sync, GraphQL is much better as it includes collection mappings
        if (forceFull) {
            return this.syncProductsGraphQL(store);
        }

        // LEVEL 3 Optimization: Resume from latest ID
        const latestProduct = await prisma.product.findFirst({
            where: { storeId: store.id },
            orderBy: { shopifyProductId: 'desc' },
            select: { shopifyProductId: true }
        });

        let sinceId = latestProduct?.shopifyProductId || '0';
        let hasMore = true;
        let count = 0;

        while (hasMore) {
            const { products } = await ShopifyService.fetchProducts(store.shopifyDomain, store.accessToken, sinceId);

            if (!products || products.length === 0) {
                hasMore = false;
                break;
            }

            // LEVEL 3: Use Raw SQL Bulk Upsert
            await this.bulkUpsertProducts(store.id, products);

            count += products.length;
            sinceId = products[products.length - 1].id.toString();

            if (products.length < 250) hasMore = false;
        }
        logger.info(`Synced ${count} products for ${store.shopifyDomain}`);
    }

    /**
     * GraphQL Product Sync - Captures collections in a single pass
     */
    private static async syncProductsGraphQL(store: any) {
        let cursor = null;
        let hasMore = true;
        let count = 0;

        while (hasMore) {
            const { products, pageInfo } = await ShopifyService.fetchProductsGraphQL(
                store.shopifyDomain,
                store.accessToken,
                cursor
            );

            if (!products || products.length === 0) {
                hasMore = false;
                break;
            }

            // Bulk upsert products
            await this.bulkUpsertProducts(store.id, products);

            // Fetch internal IDs for associations
            const shopifyProductIds = products.map((p: any) => p.id);
            const localProducts = await prisma.product.findMany({
                where: { storeId: store.id, shopifyProductId: { in: shopifyProductIds } },
                select: { id: true, shopifyProductId: true }
            });
            const productMap = new Map(localProducts.map(p => [p.shopifyProductId, p.id]));

            const shopifyCollectionIds = Array.from(new Set(products.flatMap((p: any) => p.collections.map((c: any) => c.id))));
            const localCollections = await prisma.collection.findMany({
                where: { storeId: store.id, shopifyCollectionId: { in: shopifyCollectionIds as string[] } },
                select: { id: true, shopifyCollectionId: true }
            });
            const collectionMap = new Map(localCollections.map(c => [c.shopifyCollectionId, c.id]));

            // Prepare memberships
            const memberships: any[] = [];
            products.forEach((p: any) => {
                const productId = productMap.get(p.id);
                if (!productId) return;

                p.collections.forEach((c: any) => {
                    const collectionId = collectionMap.get(c.id);
                    if (collectionId) {
                        memberships.push({ productId, collectionId });
                    }
                });
            });

            // Bulk insert memberships
            if (memberships.length > 0) {
                // Delete existing for these products to ensure fresh state
                await prisma.productCollection.deleteMany({
                    where: { productId: { in: Array.from(productMap.values()) } }
                });
                await prisma.productCollection.createMany({
                    data: memberships,
                    skipDuplicates: true
                });
            }

            count += products.length;
            cursor = pageInfo.endCursor;
            hasMore = pageInfo.hasNextPage;
        }
        logger.info(`Synced ${count} products via GraphQL for ${store.shopifyDomain}`);
    }

    private static async syncCollections(store: any) {
        logger.info(`Syncing collections for ${store.shopifyDomain}`);
        try {
            const collections = await ShopifyService.fetchCollections(store.shopifyDomain, store.accessToken);

            if (collections.length === 0) return;

            const values = collections.map(c => `(
                '${uuidv4()}',
                '${store.id}',
                '${c.id}',
                '${c.title.replace(/'/g, "''")}',
                ${c.handle ? `'${c.handle.replace(/'/g, "''")}'` : 'NULL'},
                NOW(),
                NOW()
            )`).join(',');

            await prisma.$executeRawUnsafe(`
                INSERT INTO "Collection" (
                    "id", "storeId", "shopifyCollectionId", "title", "handle", "createdAt", "updatedAt"
                )
                VALUES ${values}
                ON CONFLICT ("storeId", "shopifyCollectionId")
                DO UPDATE SET
                    "title" = EXCLUDED."title",
                    "handle" = EXCLUDED."handle",
                    "updatedAt" = NOW();
            `);

            logger.info(`Synced ${collections.length} collections for ${store.shopifyDomain}`);
        } catch (error) {
            logger.error(`Failed to sync collections for ${store.shopifyDomain}:`, error);
        }
    }

    private static async bulkUpsertProducts(storeId: string, products: any[]) {
        if (products.length === 0) return;

        const productValues = products.map(p => {
            return `(
                '${uuidv4()}',
                '${storeId}', 
                '${p.id}', 
                '${p.title.replace(/'/g, "''")}', 
                ${p.vendor ? `'${p.vendor.replace(/'/g, "''")}'` : 'NULL'}, 
                ${p.product_type ? `'${p.product_type.replace(/'/g, "''")}'` : 'NULL'}, 
                NOW(), 
                NOW()
            )`;
        }).join(',');

        // 1. Upsert Products
        await prisma.$executeRawUnsafe(`
            INSERT INTO "Product" (
                "id", "storeId", "shopifyProductId", "title", "vendor", "productType", "createdAt", "updatedAt"
            )
            VALUES ${productValues}
            ON CONFLICT ("storeId", "shopifyProductId") 
            DO UPDATE SET
                "title" = EXCLUDED."title",
                "vendor" = EXCLUDED."vendor",
                "productType" = EXCLUDED."productType",
                "updatedAt" = NOW();
        `);

        // 2. Fetch internal Product IDs for Variant mapping
        const shopifyProductIds = products.map(p => p.id);
        const localProducts = await prisma.product.findMany({
            where: { storeId, shopifyProductId: { in: shopifyProductIds } },
            select: { id: true, shopifyProductId: true }
        });
        const productMap = new Map(localProducts.map(p => [p.shopifyProductId, p.id]));

        // 3. Prepare Variant Values
        const variantValues: string[] = [];
        products.forEach(p => {
            const internalProductId = productMap.get(p.id);
            if (!internalProductId) return;

            p.variants.forEach((v: any) => {
                variantValues.push(`(
                    '${uuidv4()}',
                    '${storeId}',
                    '${internalProductId}',
                    '${v.id}',
                    ${v.inventory_item_id ? `'${v.inventory_item_id}'` : 'NULL'},
                    ${v.sku ? `'${v.sku.replace(/'/g, "''")}'` : 'NULL'},
                    ${v.title ? `'${v.title.replace(/'/g, "''")}'` : 'NULL'},
                    ${parseFloat(v.price || '0')},
                    ${v.compare_at_price ? parseFloat(v.compare_at_price) : 'NULL'},
                    ${(v.unit_cost === undefined || v.unit_cost === null) ? 'NULL' : v.unit_cost},
                    ${v.inventory_quantity || 0},
                    NOW(),
                    NOW()
                )`);
            });
        });

        if (variantValues.length > 0) {
            // 4. Upsert Variants
            await prisma.$executeRawUnsafe(`
                INSERT INTO "ProductVariant" (
                    "id", "storeId", "productId", "shopifyVariantId", "inventoryItemId", "sku", "title", 
                    "price", "compareAtPrice", "cost", "inventoryQuantity", "createdAt", "updatedAt"
                )
                VALUES ${variantValues.join(',')}
                ON CONFLICT ("storeId", "shopifyVariantId")
                DO UPDATE SET
                    "inventoryItemId" = EXCLUDED."inventoryItemId",
                    "sku" = EXCLUDED."sku",
                    "title" = EXCLUDED."title",
                    "price" = EXCLUDED."price",
                    "compareAtPrice" = EXCLUDED."compareAtPrice",
                    "cost" = EXCLUDED."cost",
                    "inventoryQuantity" = EXCLUDED."inventoryQuantity",
                    "updatedAt" = NOW();
            `);
        }
    }

    /**
     * Sync Customers - Level 3 Optimized
     */
    private static async syncCustomers(store: any) {
        // LEVEL 3 Optimization: Resume from latest ID
        // Note: shopifyCustomerId is a String in DB, so sorting it normally is lexicographical ('9' > '10').
        // We need to cast to BIGINT for correct numeric sorting to get the true latest ID.
        // Fetch all customers using GraphQL cursors

        let cursor: string | null = null;
        let hasMore = true;
        let count = 0;

        while (hasMore) {
            const { customers, pageInfo } = await ShopifyService.fetchCustomersGraphQL(store.shopifyDomain, store.accessToken, cursor);

            if (customers.length === 0) {
                hasMore = false;
                break;
            }

            // LEVEL 3: Use Raw SQL Bulk Upsert
            await this.bulkUpsertCustomers(store.id, customers);

            count += customers.length;
            cursor = pageInfo.endCursor;
            hasMore = pageInfo.hasNextPage;
        }
        logger.info(`Synced ${count} customers for ${store.shopifyDomain}`);
    }

    private static async bulkUpsertCustomers(storeId: string, customers: any[]) {
        if (customers.length === 0) return;

        const values = customers.map(c => {
            const addr = c.default_address || {};
            return `(
            '${uuidv4()}',
            '${storeId}', 
            '${c.id}', 
            ${c.email ? `'${c.email.replace(/'/g, "''")}'` : 'NULL'}, 
            ${c.first_name ? `'${c.first_name.replace(/'/g, "''")}'` : 'NULL'}, 
            ${c.last_name ? `'${c.last_name.replace(/'/g, "''")}'` : 'NULL'}, 
            ${c.phone ? `'${c.phone.replace(/'/g, "''")}'` : 'NULL'}, 
            ${parseFloat(c.total_spent || '0')}, 
            ${c.orders_count || 0}, 
            NOW(), 
            NOW(),
            ${c.first_order_date ? `'${c.first_order_date}'` : 'NULL'},
            ${addr.city ? `'${addr.city.replace(/'/g, "''")}'` : 'NULL'},
            ${addr.province ? `'${addr.province.replace(/'/g, "''")}'` : 'NULL'},
            ${addr.zip ? `'${addr.zip.replace(/'/g, "''")}'` : 'NULL'},
            ${addr.country ? `'${addr.country.replace(/'/g, "''")}'` : 'NULL'},
            ${addr.address1 ? `'${addr.address1.replace(/'/g, "''")}'` : 'NULL'},
            ${addr.address2 ? `'${addr.address2.replace(/'/g, "''")}'` : 'NULL'},
            ${c.last_order_date ? `'${c.last_order_date}'` : 'NULL'},
            ${c.first_order_name ? `'${c.first_order_name.replace(/'/g, "''")}'` : 'NULL'},
            ${c.last_order_name ? `'${c.last_order_name.replace(/'/g, "''")}'` : 'NULL'}
        )`}).join(',');

        await prisma.$executeRawUnsafe(`
            INSERT INTO "Customer" (
                "id", "storeId", "shopifyCustomerId", "email", "firstName", "lastName", 
                "phone", "totalSpent", "totalOrders", "createdAt", "updatedAt", "firstOrderDate",
                "city", "province", "zip", "country", "address1", "address2",
                "lastOrderDate", "firstOrderName", "lastOrderName"
            )
            VALUES ${values}
            ON CONFLICT ("storeId", "shopifyCustomerId") 
            DO UPDATE SET
                "email" = EXCLUDED."email",
                "firstName" = EXCLUDED."firstName",
                "lastName" = EXCLUDED."lastName",
                "phone" = EXCLUDED."phone",
                "totalSpent" = EXCLUDED."totalSpent",
                "totalOrders" = EXCLUDED."totalOrders",
                "updatedAt" = NOW(),
                "firstOrderDate" = COALESCE(EXCLUDED."firstOrderDate", "Customer"."firstOrderDate"),
                "city" = EXCLUDED."city",
                "province" = EXCLUDED."province",
                "zip" = EXCLUDED."zip",
                "country" = EXCLUDED."country",
                "address1" = EXCLUDED."address1",
                "address2" = EXCLUDED."address2",
                "lastOrderDate" = COALESCE(EXCLUDED."lastOrderDate", "Customer"."lastOrderDate"),
                "firstOrderName" = COALESCE(EXCLUDED."firstOrderName", "Customer"."firstOrderName"),
                "lastOrderName" = COALESCE(EXCLUDED."lastOrderName", "Customer"."lastOrderName");
        `);
    }

    /**
     * Sync Recent Orders (Last 30 Days) - High Priority
     */
    private static async syncRecentOrders(store: any) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // We don't use since_id here, we use created_at_min to get the most recent chunk
        // Shopify REST API allows fetching by created_at_min
        const client = new shopify.clients.Rest({
            session: {
                shop: store.shopifyDomain,
                accessToken: store.accessToken,
                state: '',
                isOnline: false,
            } as any,
        });

        let hasMore = true;
        let lastId = null;

        while (hasMore) {
            const query: any = {
                status: 'any',
                limit: '250',
                created_at_min: thirtyDaysAgo.toISOString(),
            };
            if (lastId) {
                query.since_id = lastId;
            } else {
                query.order = 'created_at asc';
            }

            const response = await client.get({
                path: 'orders',
                query,
            });

            const orders = (response.body as any).orders;
            if (!orders || orders.length === 0) {
                hasMore = false;
                break;
            }

            await this.processOrderBatch(store, orders);

            if (orders.length < 250) {
                hasMore = false;
            } else {
                lastId = orders[orders.length - 1].id.toString();
            }
        }
        logger.info(`Recent sync completed for ${store.shopifyDomain}`);
    }

    /**
     * Common method to process a batch of orders (Upsert orders + line items)
     */
    private static async processOrderBatch(store: any, orders: any[]) {
        if (orders.length === 0) return;

        // 1. Resolve Products & Customers in Bulk
        const [shopifyProductIds, storeSettings] = await Promise.all([
            Promise.resolve(Array.from(new Set(orders.flatMap((o: any) => o.line_items.map((li: any) => li.product_id?.toString())).filter(Boolean)))),
            prisma.storeSettings.findUnique({ where: { storeId: store.id } })
        ]);

        const rtoTagList = Array.from(new Set([...(storeSettings?.rtoTags || []), 'rto', 'RTO']));
        const returnTagList = Array.from(new Set([...(storeSettings?.returnTags || []), 'return', 'returned', 'customer return']));
        const cancelledTagList = Array.from(new Set([...(storeSettings?.cancelledTags || []), 'cancelled', 'canceled']));

        const checkTags = (orderTags: string[], matchTags: string[]) => {
            const tags = (orderTags || []).map(t => t.toLowerCase());
            return matchTags.some(m => tags.includes(m.toLowerCase()));
        };

        // CRITICAL FIX: Extract customers from orders and upsert them FIRST
        const validCustomers = orders
            .map((o: any) => o.customer)
            .filter((c: any) => c && c.id);

        const uniqueCustomers = Array.from(new Map(validCustomers.map((c: any) => [c.id, c])).values());

        if (uniqueCustomers.length > 0) {
            await this.bulkUpsertCustomers(store.id, uniqueCustomers);
        }

        const shopifyCustomerIds = Array.from(new Set(uniqueCustomers.map((c: any) => c.id.toString())));

        const [localProducts, localCustomers] = await Promise.all([
            prisma.product.findMany({
                where: { storeId: store.id, shopifyProductId: { in: shopifyProductIds as string[] } },
                select: { id: true, shopifyProductId: true }
            }),
            prisma.customer.findMany({
                where: { storeId: store.id, shopifyCustomerId: { in: shopifyCustomerIds as string[] } },
                select: { id: true, shopifyCustomerId: true }
            })
        ]);

        const productMap = new Map(localProducts.map(p => [p.shopifyProductId, p.id]));
        const customerMap = new Map(localCustomers.map(c => [c.shopifyCustomerId, c.id]));

        // 2. Prepare Order Raw SQL
        const orderValues = orders.map((o: any) => {
            const customerId = o.customer ? customerMap.get(o.customer.id.toString()) : null;
            const refundAmount = o.refunds ? o.refunds.reduce((sum: number, r: any) => {
                return sum + r.refund_line_items.reduce((lSum: number, li: any) => lSum + parseFloat(li.subtotal || '0'), 0);
            }, 0) : 0;

            const latestRefundDate = o.refunds && o.refunds.length > 0
                ? new Date(Math.max(...o.refunds.map((r: any) => new Date(r.created_at).getTime()))).toISOString()
                : null;

            const shipping = o.shipping_address ? {
                city: o.shipping_address.city?.replace(/'/g, "''") || null,
                country: o.shipping_address.country?.replace(/'/g, "''") || null,
            } : { city: null, country: null };

            const oTags = (o.tags || "").split(',').map((t: string) => t.trim());
            const isRTO = o.isRTO || checkTags(oTags, rtoTagList);
            const isCancelled = o.cancelled_at !== null || checkTags(oTags, cancelledTagList);
            const isReturned = refundAmount > 0 || checkTags(oTags, returnTagList);

            // For timestamps, we use Shopify's updated_at as a proxy for the event date if it just happened
            // or if we're seeing the tag for the first time.
            const eventDate = new Date(o.updated_at).toISOString();

            return `(
                '${uuidv4()}', '${store.id}', '${o.id}', '${o.order_number}', 
                '${o.name.replace(/'/g, "''")}', ${parseFloat(o.total_price)}, ${parseFloat(o.subtotal_price)},
                ${parseFloat(o.total_discounts)}, ${parseFloat(o.total_tax)}, ${parseFloat(o.total_shipping_price || '0')},
                ${parseFloat(o.total_price) - refundAmount}, '${o.currency}', '${o.financial_status}',
                ${o.fulfillment_status ? `'${o.fulfillment_status}'` : 'NULL'}, ${o.email ? `'${o.email.replace(/'/g, "''")}'` : 'NULL'},
                ${customerId ? `'${customerId}'` : 'NULL'}, ${isCancelled}, 
                ${o.cancelled_at ? `'${new Date(o.cancelled_at).toISOString()}'` : 'NULL'},
                '${new Date(o.created_at).toISOString()}', NOW(), NOW(),
                ${shipping.city ? `'${shipping.city}'` : 'NULL'}, ${shipping.country ? `'${shipping.country}'` : 'NULL'},
                ${isRTO}, ${isRTO ? `'${eventDate}'` : 'NULL'}, 
                ${isReturned}, ${isReturned ? `'${latestRefundDate || eventDate}'` : 'NULL'},
                ${refundAmount}, ${latestRefundDate ? `'${latestRefundDate}'` : 'NULL'}
            )`;
        }).join(',');

        // 3. Level-3 Bulk Order Upsert
        await prisma.$executeRawUnsafe(`
            INSERT INTO "Order" (
                "id", "storeId", "shopifyOrderId", "orderNumber", "orderName", "totalPrice", "subtotalPrice",
                "totalDiscounts", "totalTax", "totalShipping", "netAmount", "currency", "financialStatus",
                "fulfillmentStatus", "customerEmail", "customerId", "isCancelled", "cancelledAt",
                "orderDate", "createdAt", "updatedAt", "shippingAddressCity", "shippingAddressCountry",
                "isRTO", "rtoAt", "isReturned", "returnedAt", "refundAmount", "refundedAt"
            )
            VALUES ${orderValues}
            ON CONFLICT ("storeId", "shopifyOrderId") 
            DO UPDATE SET
                "financialStatus" = EXCLUDED."financialStatus",
                "fulfillmentStatus" = EXCLUDED."fulfillmentStatus",
                "totalPrice" = EXCLUDED."totalPrice",
                "netAmount" = EXCLUDED."netAmount",
                "customerId" = EXCLUDED."customerId",
                "customerEmail" = EXCLUDED."customerEmail",
                "shippingAddressCity" = EXCLUDED."shippingAddressCity",
                "shippingAddressCountry" = EXCLUDED."shippingAddressCountry",
                "isCancelled" = EXCLUDED."isCancelled",
                "cancelledAt" = COALESCE("Order"."cancelledAt", EXCLUDED."cancelledAt"),
                "isRTO" = EXCLUDED."isRTO",
                "rtoAt" = COALESCE("Order"."rtoAt", EXCLUDED."rtoAt"),
                "isReturned" = EXCLUDED."isReturned",
                "returnedAt" = COALESCE("Order"."returnedAt", EXCLUDED."returnedAt"),
                "refundAmount" = EXCLUDED."refundAmount",
                "refundedAt" = EXCLUDED."refundedAt",
                "updatedAt" = NOW();
        `);

        // 4. Update Customer First Order Dates
        // This ensures that new customers are correctly flagged for the dashboard
        if (localCustomers.length > 0) {
            await prisma.$executeRawUnsafe(`
                UPDATE "Customer" 
                SET "firstOrderDate" = sub.min_date
                FROM (
                    SELECT "customerId", MIN("orderDate") as min_date
                    FROM "Order"
                    WHERE "storeId" = '${store.id}' 
                    AND "customerId" IN (${localCustomers.map(c => `'${c.id}'`).join(',')})
                    GROUP BY "customerId"
                ) sub
                WHERE "Customer"."id" = sub."customerId"
                AND ("Customer"."firstOrderDate" IS NULL OR "Customer"."firstOrderDate" > sub.min_date);
            `);
        }

        // 5. Batch Sync Line Items
        const shopifyOrderIds = orders.map((o: any) => o.id.toString());
        const savedOrders = await prisma.order.findMany({
            where: { storeId: store.id, shopifyOrderId: { in: shopifyOrderIds } },
            select: { id: true, shopifyOrderId: true }
        });
        const internalOrderMap = new Map(savedOrders.map((so: any) => [so.shopifyOrderId, so.id]));

        const lineItemsData: any[] = [];
        for (const o of orders) {
            const internalOrderId = internalOrderMap.get(o.id.toString())!;
            for (const item of o.line_items) {
                lineItemsData.push({
                    orderId: internalOrderId,
                    storeId: store.id,
                    productId: item.product_id ? productMap.get(item.product_id.toString()) : null,
                    shopifyProductId: item.product_id?.toString(),
                    shopifyVariantId: item.variant_id?.toString(),
                    title: item.title,
                    variantTitle: item.variant_title,
                    sku: item.sku,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    totalDiscount: parseFloat(item.total_discount || '0'),
                });
            }
        }

        await prisma.orderLineItem.deleteMany({
            where: { orderId: { in: Array.from(internalOrderMap.values()) } }
        });
        await prisma.orderLineItem.createMany({ data: lineItemsData });
    }

    /**
     * Sync Orders modified in the last 48 hours - Captures status changes (Tags, Refunds)
     */
    private static async syncUpdatedOrders(store: any) {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        const client = new shopify.clients.Rest({
            session: {
                shop: store.shopifyDomain,
                accessToken: store.accessToken,
                state: '',
                isOnline: false,
            } as any,
        });

        let hasMore = true;
        let lastId = null;

        while (hasMore) {
            const query: any = {
                status: 'any',
                limit: '250',
                updated_at_min: fortyEightHoursAgo.toISOString(),
            };
            if (lastId) query.since_id = lastId;

            const response = await client.get({
                path: 'orders',
                query,
            });

            const orders = (response.body as any).orders;
            if (!orders || orders.length === 0) {
                hasMore = false;
                break;
            }

            await this.processOrderBatch(store, orders);

            if (orders.length < 250) {
                hasMore = false;
            } else {
                lastId = orders[orders.length - 1].id.toString();
            }
        }
        logger.info(`Updated orders sync completed for ${store.shopifyDomain}`);
    }

    /**
     * Sync Orders - Level 3 Optimized
     */
    /**
     * Sync Orders using GraphQL for maximum speed - optimized for historical backfill
     */
    private static async syncOrdersGraphQL(store: any) {
        let cursor = null;
        let hasMore = true;
        let count = 0;

        // Note: GraphQL for orders doesn't support 'since_id' in the same way.
        // For 'sinceId' resumption, REST is better. For massive backfill, GraphQL is better.
        // We use GraphQL when forceFromStart is true.

        while (hasMore) {
            const startTime = Date.now();
            const { orders, pageInfo } = await ShopifyService.fetchOrdersGraphQL(
                store.shopifyDomain,
                store.accessToken,
                cursor
            );

            if (!orders || orders.length === 0) {
                hasMore = false;
                break;
            }

            await this.processOrderBatch(store, orders);

            count += orders.length;
            cursor = pageInfo.endCursor;
            hasMore = pageInfo.hasNextPage;

            const duration = Date.now() - startTime;
            logger.info(`[GraphQL] Batch of ${orders.length} orders synced in ${duration}ms (${(orders.length / (duration / 1000)).toFixed(1)} orders/sec)`);
        }
        logger.info(`Synced ${count} orders via GraphQL for ${store.shopifyDomain}`);
    }

    /**
     * Sync Orders - Level 3 Optimized
     */
    private static async syncOrders(store: any, forceFromStart: boolean = false) {
        // If we're doing a massive backfill, GraphQL is 3-5x faster
        if (forceFromStart) {
            return this.syncOrdersGraphQL(store);
        }

        // LEVEL 3 Optimization: Resume from latest ID unless forced
        let sinceId = '0';

        const latestOrder = await prisma.order.findFirst({
            where: { storeId: store.id },
            orderBy: { shopifyOrderId: 'desc' },
            select: { shopifyOrderId: true }
        });
        sinceId = latestOrder?.shopifyOrderId || '0';

        let hasMore = true;
        let count = 0;

        let fetchPromise = ShopifyService.fetchOrders(store.shopifyDomain, store.accessToken, sinceId);

        while (hasMore) {
            logger.info(`Waiting for batch for ${store.shopifyDomain} (since_id: ${sinceId})`);
            const { orders } = await fetchPromise;

            if (!orders || orders.length === 0) {
                hasMore = false;
                break;
            }

            // Start fetching the NEXT batch immediately in the background
            if (orders.length === 250) {
                const nextSinceId = orders[orders.length - 1].id.toString();
                fetchPromise = ShopifyService.fetchOrders(store.shopifyDomain, store.accessToken, nextSinceId);
            } else {
                hasMore = false;
            }

            const startTime = Date.now();
            await this.processOrderBatch(store, orders);
            const duration = Date.now() - startTime;

            count += orders.length;
            logger.info(`Batch of ${orders.length} orders processed in ${duration}ms (${(orders.length / (duration / 1000)).toFixed(1)} orders/sec)`);

            sinceId = orders[orders.length - 1].id.toString();
        }
        logger.info(`Synced ${count} orders for ${store.shopifyDomain}`);
    }

    /**
     * Sync shop metadata (name, currency, timezone)
     */
    private static async syncShopMetadata(store: any) {
        try {
            const shopInfo = await ShopifyService.fetchShopInfo(store.shopifyDomain, store.accessToken);
            await prisma.store.update({
                where: { id: store.id },
                data: {
                    storeName: shopInfo.name,
                    email: shopInfo.email,
                    currency: shopInfo.currency,
                    timezone: shopInfo.iana_timezone || shopInfo.timezone,
                }
            });
            logger.info(`Synced metadata for ${store.shopifyDomain}`);
        } catch (error) {
            logger.error(`Failed to sync metadata for ${store.shopifyDomain}:`, error);
        }
    }

    /**
     * Update product performance metrics based on synced orders
     */
    private static async updateProductMetrics(storeId: string) {
        logger.info(`Updating metrics for all products for store ${storeId} using optimized SQL`);

        try {
            // High-performance aggregation and update in a single DB pass
            await prisma.$executeRaw`
                UPDATE "Product" p
                SET 
                    "totalSold" = CAST(COALESCE(sub.units_sold, 0) AS INTEGER),
                    "totalRevenue" = CAST(COALESCE(sub.revenue, 0) AS DOUBLE PRECISION),
                    "totalCancelled" = CAST(COALESCE(sub.cancelled_units, 0) AS INTEGER),
                    "cancellationRate" = CAST(
                        CASE 
                            WHEN COALESCE(sub.units_sold, 0) > 0 
                            THEN (COALESCE(sub.cancelled_units, 0)::FLOAT / sub.units_sold::FLOAT) * 100 
                            ELSE 0 
                        END AS DOUBLE PRECISION
                    )
                FROM (
                    SELECT 
                        li."productId",
                        SUM(li.quantity) as units_sold,
                        SUM((li.price * li.quantity) - li."totalDiscount") as revenue,
                        SUM(CASE WHEN o."isCancelled" = true OR o."isRTO" = true THEN li.quantity ELSE 0 END) as cancelled_units
                    FROM "OrderLineItem" li
                    JOIN "Order" o ON li."orderId" = o.id
                    WHERE li."storeId" = ${storeId} AND li."productId" IS NOT NULL
                    GROUP BY li."productId"
                ) sub
                WHERE p.id = sub."productId" AND p."storeId" = ${storeId};
            `;

            logger.info(`Successfully updated metrics for all products in store ${storeId}`);
        } catch (error) {
            logger.error(`Failed to update product metrics for store ${storeId}:`, error);
            throw error;
        }
    }

    /**
     * Update customer intelligence metrics based on synced orders
     */
    private static async updateCustomerMetrics(storeId: string) {
        logger.info(`Recalculating intelligence metrics for all customers in store ${storeId}`);

        try {
            // High-performance aggregation for customers
            await prisma.$executeRaw`
                UPDATE "Customer" c
                SET 
                    "totalSpent" = CAST(COALESCE(sub.total_spent, 0) AS DOUBLE PRECISION),
                    "totalOrders" = CAST(COALESCE(sub.total_orders, 0) AS INTEGER),
                    "averageOrderValue" = CAST(
                        CASE 
                            WHEN COALESCE(sub.total_orders, 0) > 0 
                            THEN COALESCE(sub.total_spent, 0) / sub.total_orders 
                            ELSE 0 
                        END AS DOUBLE PRECISION
                    ),
                    "lastOrderDate" = sub.max_date,
                    "firstOrderDate" = sub.min_date,
                    "updatedAt" = NOW()
                FROM (
                    SELECT 
                        "customerId",
                        SUM("totalPrice") as total_spent,
                        COUNT(id) as total_orders,
                        MAX("orderDate") as max_date,
                        MIN("orderDate") as min_date
                    FROM "Order"
                    WHERE "storeId" = ${storeId} AND "customerId" IS NOT NULL
                    GROUP BY "customerId"
                ) sub
                WHERE c.id = sub."customerId" AND c."storeId" = ${storeId};
            `;

            logger.info(`Successfully updated metrics for all customers in store ${storeId}`);
        } catch (error) {
            logger.error(`Failed to update customer metrics for store ${storeId}:`, error);
            throw error;
        }
    }
}

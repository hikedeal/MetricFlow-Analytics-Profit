import prisma from '../config/prisma';
import { logger } from '../config/logger';

export class WebhookService {
    /**
     * Process an order creation or update from Shopify
     */
    static async processOrder(storeId: string, orderData: any) {
        try {
            const storeSettings = await prisma.storeSettings.findUnique({ where: { storeId } });

            const rtoTagList = Array.from(new Set([...(storeSettings?.rtoTags || []), 'rto', 'RTO']));
            const returnTagList = Array.from(new Set([...(storeSettings?.returnTags || []), 'return', 'returned', 'customer return']));
            const cancelledTagList = Array.from(new Set([...(storeSettings?.cancelledTags || []), 'cancelled', 'canceled']));

            const checkTags = (orderTags: string[], matchTags: string[]) => {
                const tags = (orderTags || []).map(t => t.toLowerCase());
                return matchTags.some(m => tags.includes(m.toLowerCase()));
            };

            const oTags = (orderData.tags || "").split(',').map((t: string) => t.trim());

            const refundAmount = orderData.refunds ? orderData.refunds.reduce((sum: number, r: any) => {
                return sum + r.refund_line_items.reduce((lSum: number, li: any) => lSum + parseFloat(li.subtotal || '0'), 0);
            }, 0) : 0;

            const latestRefundDate = orderData.refunds && orderData.refunds.length > 0
                ? new Date(Math.max(...orderData.refunds.map((r: any) => new Date(r.created_at).getTime()))).toISOString()
                : null;

            const isRTO = checkTags(oTags, rtoTagList);
            const isCancelled = orderData.cancelled_at !== null || checkTags(oTags, cancelledTagList);
            const isReturned = refundAmount > 0 || checkTags(oTags, returnTagList);
            const eventDate = new Date(orderData.updated_at).toISOString();

            // Find or update basic order info
            const existingOrder = await prisma.order.findUnique({
                where: { storeId_shopifyOrderId: { storeId, shopifyOrderId: orderData.id.toString() } }
            });

            const data = {
                financialStatus: orderData.financial_status,
                fulfillmentStatus: orderData.fulfillment_status,
                tags: oTags,
                totalPrice: parseFloat(orderData.total_price),
                totalDiscounts: parseFloat(orderData.total_discounts),
                totalTax: parseFloat(orderData.total_tax),
                isCancelled,
                cancelledAt: existingOrder?.cancelledAt || (orderData.cancelled_at ? new Date(orderData.cancelled_at) : null),
                isRTO,
                rtoAt: existingOrder?.rtoAt || (isRTO ? new Date(eventDate) : null),
                isReturned,
                returnedAt: existingOrder?.returnedAt || (isReturned ? new Date(latestRefundDate || eventDate) : null),
                refundAmount,
                refundedAt: latestRefundDate ? new Date(latestRefundDate) : existingOrder?.refundedAt,
                updatedAt: new Date()
            };

            await prisma.order.upsert({
                where: {
                    storeId_shopifyOrderId: {
                        storeId,
                        shopifyOrderId: orderData.id.toString()
                    }
                },
                update: data,
                create: {
                    ...data,
                    storeId,
                    shopifyOrderId: orderData.id.toString(),
                    orderNumber: orderData.order_number.toString(),
                    orderName: orderData.name,
                    subtotalPrice: parseFloat(orderData.subtotal_price),
                    totalShipping: parseFloat(orderData.total_shipping_price || '0'),
                    netAmount: parseFloat(orderData.total_price) - refundAmount,
                    currency: orderData.currency,
                    customerEmail: orderData.email,
                    orderDate: new Date(orderData.created_at),
                    processedAt: orderData.processed_at ? new Date(orderData.processed_at) : null,
                    cancelReason: orderData.cancel_reason,
                }
            });

            logger.info(`Webhook sync successful for Order: ${orderData.name} (${orderData.id})`);
        } catch (error) {
            logger.error(`Failed to process order webhook ${orderData.id}:`, error);
        }
    }

    /**
     * Process a product creation or update from Shopify
     */
    static async processProduct(storeId: string, productData: any) {
        try {
            // 1. Upsert Product
            const product = await prisma.product.upsert({
                where: {
                    storeId_shopifyProductId: {
                        storeId,
                        shopifyProductId: productData.id.toString()
                    }
                },
                update: {
                    title: productData.title,
                    vendor: productData.vendor,
                    productType: productData.product_type,
                },
                create: {
                    storeId,
                    shopifyProductId: productData.id.toString(),
                    title: productData.title,
                    vendor: productData.vendor,
                    productType: productData.product_type,
                }
            });

            // 2. Upsert Variants
            if (productData.variants && Array.isArray(productData.variants)) {
                for (const variantData of productData.variants) {
                    await prisma.productVariant.upsert({
                        where: {
                            storeId_shopifyVariantId: {
                                storeId,
                                shopifyVariantId: variantData.id.toString()
                            }
                        },
                        update: {
                            title: variantData.title,
                            sku: variantData.sku,
                            price: parseFloat(variantData.price || '0'),
                            cost: parseFloat(variantData.compare_at_price || '0'), // Fallback if cost not in webhook
                            inventoryQuantity: variantData.inventory_quantity || 0,
                            inventoryItemId: variantData.inventory_item_id?.toString(),
                        },
                        create: {
                            storeId,
                            productId: product.id,
                            shopifyVariantId: variantData.id.toString(),
                            title: variantData.title,
                            sku: variantData.sku,
                            price: parseFloat(variantData.price || '0'),
                            cost: parseFloat(variantData.compare_at_price || '0'),
                            inventoryQuantity: variantData.inventory_quantity || 0,
                            inventoryItemId: variantData.inventory_item_id?.toString(),
                        }
                    });
                }
            }

            logger.info(`Automated sync successful for Product: ${productData.id}`);
        } catch (error) {
            logger.error(`Failed to process product webhook ${productData.id}:`, error);
        }
    }

    /**
     * Delete a product
     */
    static async deleteProduct(storeId: string, productId: string) {
        try {
            await prisma.product.delete({
                where: {
                    storeId_shopifyProductId: {
                        storeId,
                        shopifyProductId: productId.toString()
                    }
                }
            });
            logger.info(`Automated deletion successful for Product: ${productId}`);
        } catch (error) {
            logger.error(`Failed to delete product ${productId}:`, error);
        }
    }

    /**
     * Process a refund
     */
    static async processRefund(storeId: string, refundData: any) {
        try {
            const orderId = refundData.order_id.toString();

            // For simplicity, we trigger a re-sync of the specific order to ensure complex refund math is correct
            // But for real-time feel, we can also update directly
            const order = await prisma.order.findUnique({
                where: { storeId_shopifyOrderId: { storeId, shopifyOrderId: orderId } }
            });

            if (order) {
                const totalRefunded = refundData.refund_line_items.reduce((sum: number, li: any) => sum + parseFloat(li.subtotal || '0'), 0);
                const now = new Date();

                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        refundAmount: { increment: totalRefunded },
                        netAmount: { decrement: totalRefunded },
                        financialStatus: 'partially_refunded',
                        refundedAt: now,
                        returnedAt: order.returnedAt || now,
                        isReturned: true,
                        updatedAt: now
                    }
                });
            }
            logger.info(`Processed refund for Order: ${orderId}`);
        } catch (error) {
            logger.error(`Failed to process refund webhook:`, error);
        }
    }

    /**
     * Process a customer update from Shopify
     */
    static async processCustomer(storeId: string, customerData: any) {
        try {
            await prisma.customer.upsert({
                where: {
                    storeId_shopifyCustomerId: {
                        storeId,
                        shopifyCustomerId: customerData.id.toString()
                    }
                },
                update: {
                    email: customerData.email,
                    firstName: customerData.first_name,
                    lastName: customerData.last_name,
                    phone: customerData.phone,
                    totalSpent: parseFloat(customerData.total_spent || '0'),
                    totalOrders: customerData.orders_count,
                },
                create: {
                    storeId,
                    shopifyCustomerId: customerData.id.toString(),
                    email: customerData.email,
                    firstName: customerData.first_name,
                    lastName: customerData.last_name,
                    phone: customerData.phone,
                    totalSpent: parseFloat(customerData.total_spent || '0'),
                    totalOrders: customerData.orders_count,
                }
            });
            logger.info(`Automated sync successful for Customer: ${customerData.id}`);
        } catch (error) {
            logger.error(`Failed to process customer webhook ${customerData.id}:`, error);
        }
    }
    /**
     * Centralized Webhook Processing Logic
     * Used by both the Worker (Async) and Controller (Sync Fallback)
     */
    static async processWebhook(storeId: string, topic: string, payload: any) {
        try {
            switch (topic) {
                case 'orders/create':
                case 'orders/updated':
                case 'orders/cancelled':
                    await WebhookService.processOrder(storeId, payload);
                    break;
                case 'products/create':
                case 'products/update':
                    await WebhookService.processProduct(storeId, payload);
                    break;
                case 'products/delete':
                    await WebhookService.deleteProduct(storeId, payload.id);
                    break;
                case 'refunds/create':
                    await WebhookService.processRefund(storeId, payload);
                    break;
                case 'customers/create':
                case 'customers/update':
                    await WebhookService.processCustomer(storeId, payload);
                    break;
                case 'app/uninstalled':
                    await prisma.store.update({
                        where: { id: storeId },
                        data: { isActive: false, uninstalledAt: new Date() }
                    });
                    logger.info(`[Webhook] Store uninstalled: ${storeId}`);
                    break;
                default:
                    logger.warn(`[Webhook] Unhandled webhook topic: ${topic}`);
            }
        } catch (error) {
            logger.error(`[Webhook] Failed to process ${topic}:`, error);
            throw error;
        }
    }
}

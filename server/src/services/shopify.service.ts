import { shopify } from '../config/shopify';
import { logger } from '../config/logger';
import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ family: 4 });
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ShopifyService {
    /**
     * Internal helper to execute Shopify API calls with exponential backoff for 429s.
     */
    private static async executeWithRetry<T>(
        operation: () => Promise<T>,
        shop: string,
        context: string,
        retryCount = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Check for 429 errors from both axios and Shopify SDK
            const isRateLimit =
                error?.response?.status === 429 ||
                error?.response?.code === 429 ||
                error?.message?.includes('429') ||
                error?.message?.includes('throttling');

            if (isRateLimit && retryCount < 5) {
                const waitTime = (retryCount + 1) * 2000 + Math.random() * 1000;
                logger.warn(`Rate limited for ${shop} (${context}). Retrying in ${Math.round(waitTime)}ms... (Attempt ${retryCount + 1}/5)`);
                await sleep(waitTime);
                return this.executeWithRetry(operation, shop, context, retryCount + 1);
            }

            logger.error(`Shopify API error for ${shop} [${context}]:`, error);
            throw error;
        }
    }

    /**
     * Fetch orders from Shopify REST API
     */
    static async fetchOrders(shop: string, accessToken: string, sinceId?: string): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const query: any = {
                status: 'any',
                limit: '250',
            };

            if (sinceId && sinceId !== '0') {
                query.since_id = sinceId;
            } else {
                query.order = 'created_at asc';
            }

            const response = await client.get({
                path: 'orders',
                query,
            });

            return response.body as any;
        }, shop, 'fetchOrders');
    }

    /**
     * Fetch products from Shopify REST API
     */
    static async fetchProducts(shop: string, accessToken: string, sinceId?: string): Promise<{ products: any[] }> {
        return this.executeWithRetry(async () => {
            const url = `https://${shop}/admin/api/2024-01/products.json`;
            const params: any = {
                limit: 250,
                published_status: 'any'
            };
            if (sinceId && sinceId !== '0') {
                params.since_id = sinceId;
            }

            const response = await axios.get(url, {
                headers: {
                    'X-Shopify-Access-Token': accessToken
                },
                params,
                httpsAgent: agent,
                timeout: 30000
            });

            const products = response.data.products;
            logger.info(`Shopify API returned ${products?.length || 0} products for ${shop}`);

            return { products };
        }, shop, 'fetchProducts');
    }

    /**
     * Fetch collections from Shopify REST API
     */
    static async fetchCollections(shop: string, accessToken: string): Promise<any[]> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            // Fetch custom collections
            const customResponse = await client.get({ path: 'custom_collections', query: { limit: '250' } });
            // Fetch smart collections
            const smartResponse = await client.get({ path: 'smart_collections', query: { limit: '250' } });

            const custom = (customResponse.body as any).custom_collections || [];
            const smart = (smartResponse.body as any).smart_collections || [];

            return [...custom, ...smart];
        }, shop, 'fetchCollections');
    }

    /**
     * Fetch single product from Shopify REST API
     */
    static async fetchProduct(shop: string, accessToken: string, productId: string): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: `products/${productId}`,
            });

            return (response.body as any).product;
        }, shop, `fetchProduct:${productId}`);
    }

    /**
     * Fetch customers from Shopify REST API
     */
    static async fetchCustomers(shop: string, accessToken: string, sinceId?: string): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: 'customers',
                query: {
                    limit: '250',
                    since_id: sinceId,
                } as any,
            });

            return response.body as any;
        }, shop, 'fetchCustomers');
    }

    /**
     * Fetch customers using GraphQL for richer data (order dates)
     */
    static async fetchCustomersGraphQL(shop: string, accessToken: string, cursor: string | null = null, limit: number = 250): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Graphql({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const query = `
                query getCustomers($first: Int!, $after: String) {
                    customers(first: $first, after: $after) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                firstName
                                lastName
                                email
                                phone
                                numberOfOrders
                                amountSpent {
                                    amount
                                }
                                defaultAddress {
                                    address1
                                    address2
                                    city
                                    province
                                    zip
                                    country
                                }
                                lastOrder {
                                    name
                                    createdAt
                                }
                            }
                        }
                    }
                }
            `;

            const response: any = await client.request(query, {
                variables: {
                    first: limit,
                    after: cursor
                }
            });

            if (response.errors) {
                const errorMsg = response.errors[0]?.message || 'Unknown GraphQL error';
                logger.error(`Shopify GraphQL error for ${shop}: ${errorMsg}`, JSON.stringify(response.errors, null, 2));
                console.error(`Shopify GraphQL error: ${errorMsg}`);
                throw new Error(`Shopify GraphQL error: ${errorMsg}`);
            }

            const data = response.data;
            if (!data || !data.customers) {
                logger.error(`No data returned from Shopify GraphQL for ${shop}. Response:`, JSON.stringify(response, null, 2));
                return { customers: [], pageInfo: { hasNextPage: false } };
            }

            const edges = data.customers.edges;
            const customers = edges.map((edge: any) => {
                const node = edge.node;
                return {
                    id: node.id.split('/').pop(),
                    first_name: node.firstName,
                    last_name: node.lastName,
                    email: node.email,
                    phone: node.phone,
                    orders_count: parseInt(node.numberOfOrders || '0'),
                    total_spent: node.amountSpent?.amount, // GraphQL returns object for amountSpent
                    default_address: node.defaultAddress,
                    last_order_date: node.lastOrder?.createdAt,
                    last_order_name: node.lastOrder?.name
                };
            });

            return {
                customers,
                pageInfo: data.customers.pageInfo
            };
        }, shop, 'fetchCustomersGraphQL');
    }

    /**
     * Fetch shop info from Shopify REST API
     */
    static async fetchShopInfo(shop: string, accessToken: string) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: 'shop',
            });

            return (response.body as any).shop;
        } catch (error) {
            logger.error(`Shopify fetchShopInfo error for ${shop}:`, error);
            throw error;
        }
    }

    /**
     * Fetch counts from Shopify REST API
     */
    static async fetchCounts(shop: string, accessToken: string) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const [orderRes]: any[] = await Promise.all([
                client.get({ path: 'orders/count', query: { status: 'any' } })
            ]);

            return {
                orders: orderRes.body.count,
                products: 0,
                customers: 0,
                storageChecked: true, // Marker for health check
            };
        } catch (error) {
            logger.error(`Shopify fetchCounts error for ${shop}:`, error);
            throw error;
        }
    }

    /**
     * Fetch locations from Shopify REST API
     */
    static async fetchLocations(shop: string, accessToken: string) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: 'locations',
            });

            return (response.body as any).locations;
        } catch (error) {
            logger.error(`Shopify fetchLocations error for ${shop}:`, error);
            throw error;
        }
    }
    /**
     * Fetch inventory items from Shopify REST API
     */
    static async fetchInventoryItems(shop: string, accessToken: string, ids: string[]): Promise<any[]> {
        return this.executeWithRetry(async () => {
            const url = `https://${shop}/admin/api/2024-01/inventory_items.json`;

            const response = await axios.get(url, {
                headers: {
                    'X-Shopify-Access-Token': accessToken
                },
                params: {
                    ids: ids.join(',')
                },
                httpsAgent: agent,
                timeout: 30000
            });

            const inventoryItems = response.data.inventory_items;
            return inventoryItems;
        }, shop, 'fetchInventoryItems');
    }

    /**
     * Fetch orders for a specific customer from Shopify REST API
     */
    static async fetchCustomerOrders(shop: string, accessToken: string, shopifyCustomerId: string) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.get({
                path: `customers/${shopifyCustomerId}/orders`,
                query: {
                    status: 'any',
                    limit: '250',
                } as any,
            });

            return (response.body as any).orders;
        } catch (error) {
            logger.error(`Shopify fetchCustomerOrders error for ${shop} (Customer: ${shopifyCustomerId}):`, error);
            throw error;
        }
    }

    /**
     * High Speed GraphQL Order Fetch
     */
    static async fetchOrdersGraphQL(shop: string, accessToken: string, cursor: string | null = null, limit: number = 250): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Graphql({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const query = `
                query getOrders($first: Int!, $after: String) {
                    orders(first: $first, after: $after, reverse: false) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                name
                                orderNumber
                                createdAt
                                totalPriceSet {
                                    presentmentMoney {
                                        amount
                                        currencyCode
                                    }
                                }
                                subtotalPriceSet {
                                    presentmentMoney {
                                        amount
                                    }
                                }
                                totalDiscountsSet {
                                    presentmentMoney {
                                        amount
                                    }
                                }
                                totalTaxSet {
                                    presentmentMoney {
                                        amount
                                    }
                                }
                                totalShippingPriceSet {
                                    presentmentMoney {
                                        amount
                                    }
                                }
                                financialStatus
                                fulfillmentStatus
                                email
                                tags
                                cancelledAt
                                customer {
                                    id
                                    firstName
                                    lastName
                                    email
                                }
                                lineItems(first: 250) {
                                    edges {
                                        node {
                                            id
                                            title
                                            quantity
                                            sku
                                            variantTitle
                                            discountAllocations {
                                                allocatedAmount {
                                                    amount
                                                }
                                            }
                                            originalUnitPriceSet {
                                                presentmentMoney {
                                                    amount
                                                }
                                            }
                                            product {
                                                id
                                            }
                                            variant {
                                                id
                                                inventoryItem {
                                                    id
                                                }
                                            }
                                        }
                                    }
                                }
                                refunds {
                                    id
                                    createdAt
                                    refundLineItems(first: 250) {
                                        edges {
                                            node {
                                                subtotalSet {
                                                    presentmentMoney {
                                                        amount
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                shippingAddress {
                                    city
                                    country
                                }
                            }
                        }
                    }
                }
            `;

            const response: any = await client.request(query, {
                variables: {
                    first: limit,
                    after: cursor
                }
            });

            // Reformat to match REST structure as closely as possible for easier ingestion
            const edges = response.data.orders.edges;
            const orders = edges.map((edge: any) => {
                const node = edge.node;
                return {
                    id: node.id.split('/').pop(),
                    name: node.name,
                    order_number: node.orderNumber,
                    created_at: node.createdAt,
                    total_price: node.totalPriceSet.presentmentMoney.amount,
                    subtotal_price: node.subtotalPriceSet.presentmentMoney.amount,
                    total_discounts: node.totalDiscountsSet.presentmentMoney.amount,
                    total_tax: node.totalTaxSet.presentmentMoney.amount,
                    total_shipping_price: node.totalShippingPriceSet.presentmentMoney.amount,
                    currency: node.totalPriceSet.presentmentMoney.currencyCode,
                    financial_status: node.financialStatus.toLowerCase(),
                    fulfillment_status: node.fulfillmentStatus?.toLowerCase() || null,
                    email: node.email,
                    tags: (node.tags || []).join(', '),
                    cancelled_at: node.cancelledAt,
                    customer: node.customer ? {
                        id: node.customer.id.split('/').pop(),
                        first_name: node.customer.firstName,
                        last_name: node.customer.lastName,
                        email: node.customer.email
                    } : null,
                    line_items: node.lineItems.edges.map((le: any) => {
                        const li = le.node;
                        const totalDiscount = li.discountAllocations.reduce((acc: number, d: any) => acc + parseFloat(d.allocatedAmount.amount), 0);
                        return {
                            id: li.id.split('/').pop(),
                            title: li.title,
                            quantity: li.quantity,
                            sku: li.sku,
                            variant_title: li.variantTitle,
                            price: li.originalUnitPriceSet.presentmentMoney.amount,
                            total_discount: totalDiscount.toString(),
                            product_id: li.product?.id.split('/').pop() || null,
                            variant_id: li.variant?.id.split('/').pop() || null,
                            inventory_item_id: li.variant?.inventoryItem?.id.split('/').pop() || null
                        };
                    }),
                    refunds: node.refunds.map((r: any) => ({
                        id: r.id.split('/').pop(),
                        created_at: r.createdAt,
                        refund_line_items: r.refundLineItems.edges.map((re: any) => ({
                            subtotal: re.node.subtotalSet.presentmentMoney.amount
                        }))
                    })),
                    shipping_address: node.shippingAddress ? {
                        city: node.shippingAddress.city,
                        country: node.shippingAddress.country
                    } : null,
                    updated_at: node.createdAt // Using createdAt as updated_at proxy for full sync
                };
            });

            return {
                orders,
                pageInfo: response.data.orders.pageInfo
            };
        }, shop, 'fetchOrdersGraphQL');
    }

    /**
     * Fetch products with collections using GraphQL for maximum efficiency
     */
    static async fetchProductsGraphQL(shop: string, accessToken: string, cursor: string | null = null, limit: number = 250): Promise<any> {
        return this.executeWithRetry(async () => {
            const client = new shopify.clients.Graphql({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const query = `
                query getProducts($first: Int!, $after: String) {
                    products(first: $first, after: $after) {
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                        edges {
                            node {
                                id
                                title
                                vendor
                                productType
                                updatedAt
                                createdAt
                                collections(first: 50) {
                                    edges {
                                        node {
                                            id
                                            title
                                        }
                                    }
                                }
                                variants(first: 100) {
                                    edges {
                                        node {
                                            id
                                            sku
                                            price
                                            compareAtPrice
                                            inventoryQuantity
                                            inventoryItem {
                                                id
                                                unitCost {
                                                    amount
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const response: any = await client.request(query, {
                variables: {
                    first: limit,
                    after: cursor
                }
            });

            const edges = response.data.products.edges;
            const products = edges.map((edge: any) => {
                const node = edge.node;
                return {
                    id: node.id.split('/').pop(),
                    title: node.title,
                    vendor: node.vendor,
                    product_type: node.productType,
                    collections: node.collections.edges.map((ce: any) => ({
                        id: ce.node.id.split('/').pop(),
                        title: ce.node.title
                    })),
                    variants: node.variants.edges.map((ve: any) => {
                        const v = ve.node;
                        return {
                            id: v.id.split('/').pop(),
                            sku: v.sku,
                            price: v.price,
                            compare_at_price: v.compareAtPrice,
                            inventory_quantity: v.inventoryQuantity,
                            inventory_item_id: v.inventoryItem?.id.split('/').pop() || null,
                            unit_cost: v.inventoryItem?.unitCost?.amount ? parseFloat(v.inventoryItem.unitCost.amount) : null
                        };
                    })
                };
            });

            return {
                products,
                pageInfo: response.data.products.pageInfo
            };
        }, shop, 'fetchProductsGraphQL');
    }

    /**
     * Update customer tags in Shopify
     */
    static async updateCustomerTags(shop: string, accessToken: string, shopifyCustomerId: string, tags: string) {
        try {
            const client = new shopify.clients.Rest({
                session: {
                    shop,
                    accessToken,
                    state: '',
                    isOnline: false,
                } as any,
            });

            const response = await client.put({
                path: `customers/${shopifyCustomerId}`,
                data: {
                    customer: {
                        id: shopifyCustomerId,
                        tags: tags
                    }
                }
            });

            return (response.body as any).customer;
        } catch (error) {
            logger.error(`Shopify updateCustomerTags error for ${shop} (Customer: ${shopifyCustomerId}):`, error);
            throw error;
        }
    }
}

import { Card, Text, Tabs, Button, InlineStack, BlockStack, Pagination, Filters, Select, Tooltip, Icon } from '@shopify/polaris';
import api from '../services/api';
import { useState, useCallback } from 'react';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OrderDrawer } from '../components/orders/OrderDrawer';
import { useOrders, useOrderStats } from '../hooks/useOrders';
import { RefreshIcon, ExportIcon, InfoIcon } from '@shopify/polaris-icons';
import { triggerExport } from '../utils/export';
import { subDays } from 'date-fns';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { BulkTagModal } from '../components/orders/BulkTagModal';

export function OrdersPage() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
    const [isBulkSelectAll, setIsBulkSelectAll] = useState(false);

    // Initialize with last 30 days
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        preset: 'last_30_days',
        startDate: subDays(now, 30).toISOString(),
        endDate: now.toISOString(),
    });

    const handleDateRangeChange = (
        preset: string,
        start: Date,
        end: Date,
    ) => {
        setDateRange({
            preset,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        });
    };

    // Mapped tabs to API params
    const tabs = [
        { id: 'all', content: 'All Orders', panelID: 'all-orders' },
        { id: 'risk', content: 'High Risk', panelID: 'risk-orders' },
        { id: 'profit', content: 'High Profit', panelID: 'profit-orders' },
        { id: 'cancelled', content: 'Cancelled', panelID: 'cancelled-orders' },
        { id: 'rto', content: 'RTO', panelID: 'rto-orders' },
        { id: 'returned', content: 'Return', panelID: 'returned-orders' },
    ];

    const [queryValue, setQueryValue] = useState('');
    const [financialStatus, setFinancialStatus] = useState<string[]>([]);
    const [fulfillmentStatus, setFulfillmentStatus] = useState<string[]>([]);
    const [paymentGateway, setPaymentGateway] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [minProfit, setMinProfit] = useState('');
    const [maxProfit, setMaxProfit] = useState('');
    const [minValue, setMinValue] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [customerType, setCustomerType] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');

    const filters = [
        {
            key: 'financialStatus',
            label: 'Financial status',
            filter: (
                <Select
                    label="Financial status"
                    labelHidden
                    options={[
                        { label: 'All', value: '' },
                        { label: 'Paid', value: 'paid' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Refunded', value: 'refunded' },
                    ]}
                    value={financialStatus[0] || ''}
                    onChange={(val: string) => setFinancialStatus(val ? [val] : [])}
                />
            ),
        },
        {
            key: 'fulfillmentStatus',
            label: 'Fulfillment status',
            filter: (
                <Select
                    label="Fulfillment status"
                    labelHidden
                    options={[
                        { label: 'All', value: '' },
                        { label: 'Fulfilled', value: 'fulfilled' },
                        { label: 'Unfulfilled', value: 'unfulfilled' },
                        { label: 'Partially fulfilled', value: 'partial' },
                    ]}
                    value={fulfillmentStatus[0] || ''}
                    onChange={(val: string) => setFulfillmentStatus(val ? [val] : [])}
                />
            ),
        },
        {
            key: 'paymentGateway',
            label: 'Payment method',
            filter: (
                <Select
                    label="Payment method"
                    labelHidden
                    options={[
                        { label: 'All', value: '' },
                        { label: 'COD', value: 'cod' },
                        { label: 'Prepaid', value: 'prepaid' },
                        { label: 'Razorpay', value: 'razorpay' },
                        { label: 'PayPal', value: 'paypal' },
                    ]}
                    value={paymentGateway[0] || ''}
                    onChange={(val: string) => setPaymentGateway(val ? [val] : [])}
                />
            ),
        },
        {
            key: 'customerType',
            label: 'Customer type',
            filter: (
                <Select
                    label="Customer type"
                    labelHidden
                    options={[
                        { label: 'All', value: '' },
                        { label: 'New Customer', value: 'new' },
                        { label: 'Returning Customer', value: 'returning' },
                    ]}
                    value={customerType[0] || ''}
                    onChange={(val: string) => setCustomerType(val ? [val] : [])}
                />
            ),
        },
        {
            key: 'sortBy',
            label: 'Sort by',
            filter: (
                <Select
                    label="Sort by"
                    labelHidden
                    options={[
                        { label: 'Date (Newest)', value: 'date-desc' },
                        { label: 'Date (Oldest)', value: 'date-asc' },
                        { label: 'Value (High to Low)', value: 'value-desc' },
                        { label: 'Value (Low to High)', value: 'value-asc' },
                        { label: 'Profit (High to Low)', value: 'profit-desc' },
                        { label: 'Profit (Low to High)', value: 'profit-asc' },
                        { label: 'Customer (A-Z)', value: 'customer-asc' },
                        { label: 'Customer (Z-A)', value: 'customer-desc' },
                    ]}
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(val: string) => {
                        const [by, order] = val.split('-');
                        setSortBy(by);
                        setSortOrder(order);
                    }}
                />
            ),
        },
    ];

    const getParams = () => {
        const params: any = {
            page,
            limit: 20,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            sort_by: sortBy,
            sort_order: sortOrder
        };
        if (selectedTab === 1) params.risk = 'high';
        if (selectedTab === 2) params.profit_type = 'profit';
        if (selectedTab === 3) params.status = 'cancelled';
        if (selectedTab === 4) params.status = 'rto';
        if (selectedTab === 5) params.status = 'returned';
        if (queryValue) params.query = queryValue;
        if (financialStatus.length) params.financial_status = financialStatus[0];
        if (fulfillmentStatus.length) params.fulfillment_status = fulfillmentStatus[0];
        if (paymentGateway.length) params.payment_gateway = paymentGateway[0];
        if (selectedTags.length) params.tags = selectedTags.join(',');
        if (minProfit) params.min_profit = minProfit;
        if (maxProfit) params.max_profit = maxProfit;
        if (minValue) params.min_value = minValue;
        if (maxValue) params.max_value = maxValue;
        if (customerType.length) params.customer_type = customerType[0];
        return params;
    };

    const clearAllFilters = () => {
        setQueryValue('');
        setFinancialStatus([]);
        setFulfillmentStatus([]);
        setPaymentGateway([]);
        setSelectedTags([]);
        setMinProfit('');
        setMaxProfit('');
        setMinValue('');
        setMaxValue('');
        setCustomerType([]);
        setSortBy('date');
        setSortOrder('desc');
        setPage(1);
    };

    // Build appliedFilters array for Polaris Filters component
    const appliedFilters: any[] = [];

    if (financialStatus.length) {
        appliedFilters.push({
            key: 'financialStatus',
            label: `Financial: ${financialStatus[0]}`,
            onRemove: () => setFinancialStatus([])
        });
    }

    if (fulfillmentStatus.length) {
        appliedFilters.push({
            key: 'fulfillmentStatus',
            label: `Fulfillment: ${fulfillmentStatus[0]}`,
            onRemove: () => setFulfillmentStatus([])
        });
    }

    if (paymentGateway.length) {
        appliedFilters.push({
            key: 'paymentGateway',
            label: `Payment: ${paymentGateway[0]}`,
            onRemove: () => setPaymentGateway([])
        });
    }

    if (customerType.length) {
        appliedFilters.push({
            key: 'customerType',
            label: `Customer: ${customerType[0] === 'new' ? 'New' : 'Returning'}`,
            onRemove: () => setCustomerType([])
        });
    }

    if (sortBy !== 'date' || sortOrder !== 'desc') {
        const sortLabel = `${sortBy}-${sortOrder}`;
        const sortOption = [
            { value: 'date-desc', label: 'Date (Newest)' },
            { value: 'date-asc', label: 'Date (Oldest)' },
            { value: 'value-desc', label: 'Value (High to Low)' },
            { value: 'value-asc', label: 'Value (Low to High)' },
            { value: 'profit-desc', label: 'Profit (High to Low)' },
            { value: 'profit-asc', label: 'Profit (Low to High)' },
            { value: 'customer-asc', label: 'Customer (A-Z)' },
            { value: 'customer-desc', label: 'Customer (Z-A)' },
        ].find(opt => opt.value === sortLabel);

        appliedFilters.push({
            key: 'sortBy',
            label: `Sort: ${sortOption?.label || sortLabel}`,
            onRemove: () => {
                setSortBy('date');
                setSortOrder('desc');
            }
        });
    }

    const { data, isLoading, refetch } = useOrders(getParams());
    const { data: stats } = useOrderStats({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });

    const handleTabChange = useCallback(
        (selectedTabIndex: number) => {
            setSelectedTab(selectedTabIndex);
            setPage(1);
        },
        [],
    );

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/sync');
            // Background sync started, we can refetch after a small delay to see partial results
            // or just allow the user to refresh manually.
            await new Promise(r => setTimeout(r, 2000));
            refetch();
        } catch (error) {
            console.error('Sync trigger failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = () => {
        const filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
        const params = getParams();
        // Remove pagination for export
        delete params.page;
        delete params.limit;

        triggerExport('/export/orders', filename, params);
    };

    const handleBulkExport = (selectedIds: string[], selectAll: boolean) => {
        const filename = `orders_bulk_export_${new Date().toISOString().split('T')[0]}.csv`;
        const params = selectAll ? getParams() : { orderIds: selectedIds };
        triggerExport('/export/orders', filename, params);
    };

    const handleBulkAddTags = (selectedIds: string[], selectAll: boolean) => {
        setBulkSelectedIds(selectedIds);
        setIsBulkSelectAll(selectAll);
        setIsBulkTagModalOpen(true);
    };

    const performBulkAddTags = async (tags: string[]) => {
        try {
            const payload = isBulkSelectAll
                ? { filters: getParams(), tags }
                : { orderIds: bulkSelectedIds, tags };

            await api.post('/orders/bulk/tags', payload);
            setIsBulkTagModalOpen(false);
            refetch();
        } catch (error) {
            console.error('Bulk tag failed:', error);
        }
    };

    const handleBulkMarkAsRisky = async (selectedIds: string[], selectAll: boolean) => {
        try {
            const payload = selectAll
                ? { filters: getParams() }
                : { orderIds: selectedIds };

            await api.post('/orders/bulk/risk', payload);
            refetch();
        } catch (error) {
            console.error('Bulk mark as risky failed:', error);
        }
    };

    return (
        <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px' }}>
            <OrderDrawer
                order={selectedOrder}
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onUpdate={refetch}
            />

            <BulkTagModal
                open={isBulkTagModalOpen}
                onClose={() => setIsBulkTagModalOpen(false)}
                onConfirm={performBulkAddTags}
                selectedCount={isBulkSelectAll ? 'All' : bulkSelectedIds.length}
            />

            <BlockStack gap="600">
                {/* Header matching dashboard */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
                }}>
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                            <Tooltip content="Centralized hub for managing all your orders, tracking risks, and monitoring profitability.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="h1" variant="heading2xl" tone="inherit">Order Intelligence</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="p" variant="bodyLg" tone="inherit">Smart order management with profit & risk tracking</Text>
                        </BlockStack>
                        <InlineStack gap="300">
                            <DateRangePicker
                                value={{
                                    preset: dateRange.preset,
                                    start: new Date(dateRange.startDate),
                                    end: new Date(dateRange.endDate)
                                }}
                                onChange={handleDateRangeChange}
                            />
                            <Button
                                variant="secondary"
                                icon={RefreshIcon}
                                loading={syncing}
                                onClick={handleSync}
                            >
                                Sync Orders
                            </Button>
                            <Button
                                variant="primary"
                                tone="success"
                                icon={ExportIcon}
                                onClick={handleExport}
                            >
                                Export Orders
                            </Button>
                        </InlineStack>
                    </InlineStack>
                </div>

                {/* Orders Summary Bar - Consolidated View */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    <Card>
                        <Tooltip content="Total orders placed in the selected period.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">All Orders</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg">{stats?.total || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders flagged as high risk based on fraud analysis or customer history.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="critical">High Risk</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="critical">
                                    {stats?.highRisk || 0}
                                </Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders where the cost exceeds the revenue, resulting in a net loss.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">Loss Making</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="caution">{stats?.lossMaking || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders with significantly high profit margins.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">High Profit</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="success">{stats?.highProfit || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders cancelled by the customer or system before fulfillment.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">Cancelled</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="caution">{stats?.cancelled || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders returned to origin (undeliverable) after shipping.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">RTO Orders</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="caution">{stats?.rto || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                    <Card>
                        <Tooltip content="Orders successfully delivered but later returned by the customer.">
                            <BlockStack gap="100">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" variant="bodySm" tone="subdued">Returns</Text>
                                    <Icon source={InfoIcon} tone="subdued" />
                                </InlineStack>
                                <Text as="p" variant="headingLg" tone="caution">{stats?.returned || 0}</Text>
                            </BlockStack>
                        </Tooltip>
                    </Card>
                </div>

                <Card padding="0">
                    <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
                            <Filters
                                queryValue={queryValue}
                                filters={filters as any}
                                appliedFilters={appliedFilters}
                                onQueryChange={setQueryValue}
                                onQueryClear={() => setQueryValue('')}
                                onClearAll={clearAllFilters}
                            />
                        </div>
                        <OrdersTable
                            orders={data?.data || []}
                            loading={isLoading}
                            totalCount={data?.meta?.total || 0}
                            onRowClick={setSelectedOrder}
                            onBulkExport={handleBulkExport}
                            onBulkAddTags={handleBulkAddTags}
                            onBulkMarkAsRisky={handleBulkMarkAsRisky}
                        />
                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                hasPrevious={page > 1}
                                hasNext={data?.meta?.total_pages > page}
                                onPrevious={() => setPage(p => p - 1)}
                                onNext={() => setPage(p => p + 1)}
                            />
                        </div>
                    </Tabs>
                </Card>
            </BlockStack>
        </div>
    );
}

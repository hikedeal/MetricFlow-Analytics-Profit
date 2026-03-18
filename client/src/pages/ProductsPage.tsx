import { Card, Text, Tabs, Button, InlineStack, BlockStack, Pagination, Filters, Layout, Icon, Badge, InlineGrid, Modal, TextField, Banner, Tooltip, ChoiceList } from '@shopify/polaris';
import { useState, useCallback } from 'react';
import { ProductsTable } from '../components/products/ProductsTable';
import { ProductDrawer } from '../components/products/ProductDrawer';
import { useProducts } from '../hooks/useProducts';
import { useProductSummary } from '../hooks/useProductSummary';
import { useCollections } from '../hooks/useCollections';
import { CollectionsTable } from '../components/products/CollectionsTable';
import { RefreshIcon, ExportIcon, AlertCircleIcon, StarIcon, InfoIcon, SearchIcon } from '@shopify/polaris-icons';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { triggerExport } from '../utils/export';
import { subDays } from 'date-fns';
import { DateRangePicker } from '../components/common/DateRangePicker';
import api from '../services/api';

import { CollectionData } from '../components/products/CollectionsTable';
import { CollectionDetailsModal } from '../components/products/CollectionDetailsModal';

export function ProductsPage() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [selectedCollection, setSelectedCollection] = useState<CollectionData | null>(null);
    const [syncing, setSyncing] = useState(false);

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
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
    const [bulkQuantity, setBulkQuantity] = useState('0');
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [bulkSuccess, setBulkSuccess] = useState(false);

    // Tabs for product filters
    const tabs = [
        { id: 'all', content: 'All Products', panelID: 'all-products' },
        { id: 'top_selling', content: '🔥 Top Selling', panelID: 'top-selling' },
        { id: 'profitable', content: '💰 Profitable', panelID: 'profitable' },
        { id: 'loss', content: '📉 Loss Making', panelID: 'loss-products' },
        { id: 'high_cancellation', content: '⚠️ High Cancellation', panelID: 'high-cancel' },
        { id: 'low_inventory', content: '📦 Low Stock', panelID: 'low-inventory' },
        { id: 'out_of_stock', content: '📦 Out of Stock', panelID: 'out-of-stock' },
        { id: 'fast_growing', content: '📈 Fast Growing', panelID: 'fast-growing' },
        { id: 'top_collections', content: '🏆 Top Collections', panelID: 'top-collections' },
    ];

    const [queryValue, setQueryValue] = useState('');
    const [productType, setProductType] = useState('');
    const [vendor, setVendor] = useState('');
    const [inventoryStatus, setInventoryStatus] = useState('');
    const [minInventory, setMinInventory] = useState('');
    const [maxInventory, setMaxInventory] = useState('');
    const canUpdateInventory = selectedTab === 5 || selectedTab === 6;

    const getParams = () => {
        const params: any = {
            page,
            limit: 20,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        };
        if (selectedTab === 1) params.filter = 'top_selling';
        if (selectedTab === 2) params.filter = 'profitable';
        if (selectedTab === 3) params.filter = 'loss';
        if (selectedTab === 4) params.filter = 'high_cancellation';
        if (selectedTab === 5) params.filter = 'low_inventory';
        if (selectedTab === 6) params.filter = 'out_of_stock';
        if (selectedTab === 7) params.filter = 'fast_growing';
        if (selectedTab === 8) params.filter = 'top_collections';
        if (queryValue) params.query = queryValue;
        if (productType) params.productType = productType;
        if (vendor) params.vendor = vendor;
        if (inventoryStatus) params.inventoryStatus = inventoryStatus;
        if (minInventory) params.minInventory = minInventory;
        if (maxInventory) params.maxInventory = maxInventory;
        return params;
    };

    const { data, isLoading, refetch } = useProducts(getParams());
    const { data: summaryData, isLoading: isSummaryLoading } = useProductSummary({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
    });
    const { data: collections, isLoading: isCollectionsLoading } = useCollections();

    const inventoryHealthData = summaryData?.inventoryHealth || [
        { name: 'Healthy', value: 0, color: '#10b981' },
        { name: 'Low Stock', value: 0, color: '#f59e0b' },
        { name: 'Out of Stock', value: 0, color: '#ef4444' },
    ];

    const handleTabChange = useCallback(
        (selectedTabIndex: number) => {
            setSelectedTab(selectedTabIndex);
            setPage(1);
        },
        [],
    );

    const handleSync = async () => {
        try {
            setSyncing(true);
            await api.post('/sync');
            refetch();
        } catch (error) {
            console.error('Failed to sync products:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = (format: 'csv' | 'excel') => {
        const filename = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
        const params = getParams();
        // Remove pagination for export
        delete params.page;
        delete params.limit;

        triggerExport('/export/products', filename, params);
    };

    const handleBulkUpdate = async () => {
        try {
            setIsBulkUpdating(true);
            setBulkError(null);
            await api.post('/products/bulk-inventory', {
                productIds: bulkSelectedIds,
                quantity: parseInt(bulkQuantity)
            });
            setBulkSuccess(true);
            setTimeout(() => {
                setBulkModalOpen(false);
                setBulkSuccess(false);
                refetch();
            }, 2000);
        } catch (err: any) {
            setBulkError(err.response?.data?.error || 'Failed to bulk update inventory');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleBulkExport = (selectedIds: string[], format: 'csv' | 'excel') => {
        const filename = `products_export_${new Date().toISOString().split('T')[0]}.${format}`;
        triggerExport('/export/products', filename, {
            ...getParams(), // Include current filters
            ids: selectedIds.join(','), // Send selected IDs
        });
    };

    const handleCollectionClick = (collectionName: string) => {
        const collection = collections?.find((c: CollectionData) => c.name === collectionName);
        if (collection) {
            setSelectedCollection(collection);
        }
    };

    const getDateLabel = () => {
        if (dateRange.preset === 'today') return 'Today';
        if (dateRange.preset === 'yesterday') return 'Yesterday';
        if (dateRange.preset === 'last_7_days') return 'Last 7 Days';
        if (dateRange.preset === 'last_30_days') return 'Last 30 Days';
        if (dateRange.preset === 'this_month') return 'This Month';
        if (dateRange.preset === 'last_month') return 'Last Month';
        if (dateRange.preset === 'custom') {
            const start = new Date(dateRange.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const end = new Date(dateRange.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `${start} - ${end}`;
        }
        return 'Selected Period';
    };

    const dateLabel = getDateLabel();

    return (
        <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px' }}>
            <ProductDrawer
                product={selectedProduct}
                open={!!selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onUpdate={() => refetch()}
                canUpdateInventory={canUpdateInventory}
            />

            <CollectionDetailsModal
                collection={selectedCollection}
                onClose={() => setSelectedCollection(null)}
                dateRange={dateRange}
                onRowClick={setSelectedProduct}
                onBulkExport={handleBulkExport}
            />

            <BlockStack gap="600">
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(79, 172, 254, 0.3)'
                }}>
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                            <Tooltip content="Comprehensive view of your product catalog performance, profit margins, and inventory status.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="h1" variant="heading2xl" tone="inherit">Product Intelligence</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="p" variant="bodyLg" tone="inherit">Profit tracking, cancellation analysis & inventory insights</Text>
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
                                Sync Products
                            </Button>
                            <div style={{ position: 'relative' }}>
                                <Button
                                    variant="primary"
                                    tone="success"
                                    icon={ExportIcon}
                                    onClick={() => handleExport('csv')}
                                >
                                    Export CSV
                                </Button>
                            </div>
                            <Button
                                variant="primary"
                                icon={ExportIcon}
                                onClick={() => handleExport('excel')}
                            >
                                Export Excel
                            </Button>
                        </InlineStack>
                    </InlineStack>
                </div>

                {/* Product Insights Section */}
                <Layout>
                    <Layout.Section variant="oneThird">
                        <Card>
                            <BlockStack gap="400">
                                <Tooltip content="Current stock status: Out of Stock (0), Low Stock (1-10), Healthy (>10).">
                                    <InlineStack gap="100" blockAlign="center">
                                        <Text as="h2" variant="headingMd">Inventory Health</Text>
                                        <Icon source={InfoIcon} tone="subdued" />
                                    </InlineStack>
                                </Tooltip>
                                <div style={{ width: '100%', height: 220, position: 'relative' }}>
                                    {isSummaryLoading ? (
                                        <Text as="p">Loading...</Text>
                                    ) : (
                                        <>
                                            <div style={{
                                                position: 'absolute',
                                                top: '46%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                textAlign: 'center',
                                                pointerEvents: 'none'
                                            }}>
                                                <Text as="p" variant="heading2xl">
                                                    {summaryData?.totalProducts || 0}
                                                </Text>
                                                <Text as="p" variant="bodyXs" tone="subdued">
                                                    Products
                                                </Text>
                                            </div>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={inventoryHealthData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={85}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {inventoryHealthData.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip />
                                                    <Legend
                                                        verticalAlign="bottom"
                                                        height={48}
                                                        formatter={(value: any, entry: any) => {
                                                            const growth = entry.payload.growth;
                                                            const isPositiveBetter = value === 'Healthy';
                                                            const isGood = isPositiveBetter ? growth >= 0 : growth <= 0;

                                                            return (
                                                                <span style={{ color: '#6d7175', fontSize: '11px', fontWeight: 500 }}>
                                                                    {value}: <span style={{ color: '#202223' }}>{entry.payload.value}</span>
                                                                    {growth !== 0 && (
                                                                        <span style={{
                                                                            marginLeft: '6px',
                                                                            color: isGood ? '#10b981' : '#ef4444',
                                                                            fontWeight: 'bold'
                                                                        }}>
                                                                            {growth > 0 ? '↑' : '↓'}{Math.abs(growth)}%
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </>
                                    )}
                                </div>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                    <Layout.Section variant="oneHalf">
                        <BlockStack gap="400">
                            <InlineGrid columns={2} gap="400">
                                <Card>
                                    <BlockStack gap="100">
                                        <InlineStack gap="200" align="start" blockAlign="center">
                                            <Icon source={StarIcon} tone="success" />
                                            <Tooltip content="Total value of orders that were returned to origin (RTO) or returned by customers in the selected period.">
                                                <InlineStack gap="100" blockAlign="center">
                                                    <Text as="p" variant="bodySm" tone="subdued">Total RTO ({dateLabel})</Text>
                                                    <Icon source={InfoIcon} tone="subdued" />
                                                </InlineStack>
                                            </Tooltip>
                                        </InlineStack>
                                        <Text as="p" variant="heading2xl">₹ {((summaryData?.totalRtoAmount || 0) / 1000).toFixed(1)}K</Text>
                                        <Text as="p" variant="bodyXs" tone="subdued">Based on order tags/status</Text>
                                    </BlockStack>
                                </Card>
                                <Card>
                                    <BlockStack gap="100">
                                        <InlineStack gap="200" align="start" blockAlign="center">
                                            <Icon source={AlertCircleIcon} tone="critical" />
                                            <Tooltip content="Total revenue lost due to orders being cancelled before fulfillment or during transit.">
                                                <InlineStack gap="100" blockAlign="center">
                                                    <Text as="p" variant="bodySm" tone="subdued">Total Cancelled ({dateLabel})</Text>
                                                    <Icon source={InfoIcon} tone="subdued" />
                                                </InlineStack>
                                            </Tooltip>
                                        </InlineStack>
                                        <Text as="p" variant="heading2xl">₹ {((summaryData?.totalCancelledAmount || 0) / 1000).toFixed(1)}K</Text>
                                        <Text as="p" variant="bodyXs" tone="critical">Potential lost revenue</Text>
                                    </BlockStack>
                                </Card>
                            </InlineGrid>
                            <Card>
                                <BlockStack gap="200">
                                    <Tooltip content="Highest performing collections based on total net revenue generated.">
                                        <InlineStack gap="100" blockAlign="center">
                                            <Text as="h3" variant="headingSm">Top 3 Collections</Text>
                                            <Icon source={InfoIcon} tone="subdued" />
                                        </InlineStack>
                                    </Tooltip>
                                    <BlockStack gap="100">
                                        {summaryData?.topCollections?.map((col: any, idx: number) => (
                                            <InlineStack key={idx} gap="400" align="space-between">
                                                <Text as="p" variant="bodyMd">{col.name}</Text>
                                                <Badge tone="success">{`₹${(col.revenue || 0).toLocaleString()}`}</Badge>
                                            </InlineStack>
                                        )) || <Text as="p">No data</Text>}
                                    </BlockStack>
                                </BlockStack>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                </Layout>

                {/* Main Table */}
                <Card padding="0">
                    <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
                        {selectedTab === 8 ? (
                            <>
                                <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
                                    <TextField
                                        label="Search Collections"
                                        value={queryValue}
                                        onChange={setQueryValue}
                                        autoComplete="off"
                                        placeholder="Search by collection name"
                                        clearButton
                                        onClearButtonClick={() => setQueryValue('')}
                                        prefix={<Icon source={SearchIcon} />}
                                    />
                                </div>
                                <CollectionsTable
                                    collections={collections?.filter((c: any) =>
                                        !queryValue || c.name.toLowerCase().includes(queryValue.toLowerCase())
                                    ) || []}
                                    loading={isCollectionsLoading}
                                    onRowClick={handleCollectionClick}
                                />
                            </>
                        ) : (
                            <>
                                <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
                                    <Filters
                                        queryValue={queryValue}
                                        filters={[
                                            {
                                                key: 'productType',
                                                label: 'Product type',
                                                filter: (
                                                    <TextField
                                                        label="Product type"
                                                        value={productType}
                                                        onChange={setProductType}
                                                        autoComplete="off"
                                                        labelHidden
                                                    />
                                                ),
                                                shortcut: true,
                                            },
                                            {
                                                key: 'vendor',
                                                label: 'Vendor',
                                                filter: (
                                                    <TextField
                                                        label="Vendor"
                                                        value={vendor}
                                                        onChange={setVendor}
                                                        autoComplete="off"
                                                        labelHidden
                                                    />
                                                ),
                                                shortcut: true,
                                            },
                                            {
                                                key: 'inventoryStatus',
                                                label: 'Inventory Status',
                                                filter: (
                                                    <ChoiceList
                                                        title="Inventory Status"
                                                        titleHidden
                                                        choices={[
                                                            { label: 'In Stock', value: 'in_stock' },
                                                            { label: 'Low Stock', value: 'low_stock' },
                                                            { label: 'Out of Stock', value: 'out_of_stock' },
                                                        ]}
                                                        selected={inventoryStatus ? [inventoryStatus] : []}
                                                        onChange={(value) => setInventoryStatus(value[0])}
                                                    />
                                                ),
                                                shortcut: true,
                                            },
                                            {
                                                key: 'inventoryRange',
                                                label: 'Inventory Quantity',
                                                filter: (
                                                    <InlineStack gap="300" align="start">
                                                        <TextField
                                                            label="Min"
                                                            type="number"
                                                            value={minInventory}
                                                            onChange={setMinInventory}
                                                            autoComplete="off"
                                                            placeholder="0"
                                                        />
                                                        <TextField
                                                            label="Max"
                                                            type="number"
                                                            value={maxInventory}
                                                            onChange={setMaxInventory}
                                                            autoComplete="off"
                                                            placeholder="100"
                                                        />
                                                    </InlineStack>
                                                ),
                                                shortcut: true,
                                            }
                                        ]}
                                        appliedFilters={[
                                            ...(productType ? [{
                                                key: 'productType',
                                                label: `Product type: ${productType}`,
                                                onRemove: () => setProductType(''),
                                            }] : []),
                                            ...(vendor ? [{
                                                key: 'vendor',
                                                label: `Vendor: ${vendor}`,
                                                onRemove: () => setVendor(''),
                                            }] : []),
                                            ...(inventoryStatus ? [{
                                                key: 'inventoryStatus',
                                                label: `Status: ${inventoryStatus.replace('_', ' ')}`,
                                                onRemove: () => setInventoryStatus(''),
                                            }] : []),
                                            ...((minInventory || maxInventory) ? [{
                                                key: 'inventoryRange',
                                                label: `Qty: ${minInventory || '0'} - ${maxInventory || '∞'}`,
                                                onRemove: () => { setMinInventory(''); setMaxInventory(''); },
                                            }] : []),
                                        ]}
                                        onQueryChange={setQueryValue}
                                        onQueryClear={() => setQueryValue('')}
                                        onClearAll={() => {
                                            setQueryValue('');
                                            setProductType('');
                                            setVendor('');
                                            setInventoryStatus('');
                                            setMinInventory('');
                                            setMaxInventory('');
                                        }}
                                    />
                                </div>
                                <ProductsTable
                                    products={data?.data || []}
                                    loading={isLoading}
                                    onRowClick={setSelectedProduct}
                                    onBulkInventoryUpdate={(ids) => {
                                        setBulkSelectedIds(ids);
                                        setBulkModalOpen(true);
                                    }}
                                    canUpdateInventory={canUpdateInventory}
                                    onBulkExport={handleBulkExport}
                                />
                                <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                                    <Pagination
                                        hasPrevious={page > 1}
                                        hasNext={data?.meta?.total_pages > page}
                                        onPrevious={() => setPage(p => p - 1)}
                                        onNext={() => setPage(p => p + 1)}
                                    />
                                </div>
                            </>
                        )}
                    </Tabs>
                </Card>
            </BlockStack>

            <Modal
                open={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                title="Bulk Update Inventory"
                primaryAction={{
                    content: 'Update Inventory',
                    onAction: handleBulkUpdate,
                    loading: isBulkUpdating,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setBulkModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        {bulkSuccess && <Banner tone="success" title="Inventory updated successfully for all selected products" />}
                        {bulkError && <Banner tone="critical" title={bulkError} />}
                        <Text as="p">Update stock for {bulkSelectedIds.length} selected products.</Text>
                        <TextField
                            label="New Inventory Level"
                            type="number"
                            value={bulkQuantity}
                            onChange={setBulkQuantity}
                            autoComplete="off"
                        />
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </div>
    );
}

import { useState, useCallback } from 'react';
import {
    Layout,
    Card,
    Tabs,
    BlockStack,
    InlineStack,
    TextField,
    Select,
    Button,
    IndexTable,
    useIndexResourceState,
    Text,
    Box,
    Icon,
    Tooltip,
    Badge,
    EmptySearchResult
} from '@shopify/polaris';
import { ExportIcon, XIcon, PlusIcon, FilterIcon, InfoIcon } from '@shopify/polaris-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { triggerExport } from '../utils/export';
import { CustomerDrawer } from '../components/customers/CustomerDrawer';

// --- Types ---
type SegmentType = 'order' | 'customer' | 'product';

interface Filter {
    id: string;
    field: string;
    operator: string;
    value: string;
}

// --- Constants ---
const SEGMENT_TYPES = [
    { id: 'order', content: 'Orders' },
    { id: 'customer', content: 'Customers' },
    { id: 'product', content: 'Products' },
];

const OPERATORS = [
    { label: 'Equals', value: 'equals' },
    { label: 'Not Equals', value: 'notEquals' },
    { label: 'Contains', value: 'contains' },
    { label: 'Greater Than', value: 'gt' },
    { label: 'Less Than', value: 'lt' },
    { label: 'Starts With', value: 'sw' },
    { label: 'Ends With', value: 'ew' },
    { label: 'In List (comma separated)', value: 'in' },
];

const FIELDS: Record<SegmentType, { label: string; value: string }[]> = {
    order: [
        { label: 'Order Name', value: 'orderName' },
        { label: 'Total Price', value: 'totalPrice' },
        { label: 'Financial Status', value: 'financialStatus' },
        { label: 'Fulfillment Status', value: 'fulfillmentStatus' },
        { label: 'Tags', value: 'tags' }, // Contains
        { label: 'Created At', value: 'createdAt' },
        { label: 'Is Cancelled', value: 'isCancelled' },
        { label: 'Customer Email', value: 'customerEmail' },
    ],
    customer: [
        { label: 'First Name', value: 'firstName' },
        { label: 'Last Name', value: 'lastName' },
        { label: 'Email', value: 'email' },
        { label: 'Phone', value: 'phone' },
        { label: 'Total Spent', value: 'totalSpent' },
        { label: 'Total Orders', value: 'totalOrders' },
        { label: 'Average Order Value', value: 'averageOrderValue' },
        { label: 'Recency (Days)', value: 'recencyDays' },
        { label: 'RFM Score (1-50)', value: 'rfmScore' },
        { label: 'Segment', value: 'segment' },
        { label: 'Tags', value: 'tags' },
        { label: 'Last Order Date', value: 'lastOrderDate' },
    ],
    product: [
        { label: 'Title', value: 'title' },
        { label: 'SKU', value: 'sku' },
        { label: 'Collection', value: 'collection' },
        { label: 'Product Type', value: 'productType' },
        { label: 'Vendor', value: 'vendor' },
        { label: 'Price', value: 'price' },
        { label: 'Inventory Quantity', value: 'inventoryQuantity' },
        { label: 'Total Sold', value: 'totalSold' },
        { label: 'Total Revenue', value: 'totalRevenue' },
    ],
};

export default function SegmentsPage() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [filters, setFilters] = useState<Filter[]>([
        { id: '1', field: '', operator: 'equals', value: '' }
    ]);
    const [page, setPage] = useState(1);

    const currentType = SEGMENT_TYPES[selectedTab].id as SegmentType;

    // --- Queries ---
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['segment', currentType, filters, page],
        queryFn: async () => {
            const validFilters = filters.filter(f => f.field && f.value !== '');
            const response = await api.post('/segments/query', {
                type: currentType,
                filters: validFilters,
                page,
                limit: 20
            });
            return response.data;
        },
    });

    const resourceName = {
        singular: currentType,
        plural: `${currentType}s`,
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(data?.data || []);

    // --- Handlers ---
    const handleTabChange = useCallback((selectedTabIndex: number) => {
        setSelectedTab(selectedTabIndex);
        setFilters([{ id: Date.now().toString(), field: '', operator: 'equals', value: '' }]);
        setPage(1);
    }, []);

    const addFilter = () => {
        setFilters([...filters, { id: Date.now().toString(), field: '', operator: 'equals', value: '' }]);
    };

    const removeFilter = (id: string) => {
        if (filters.length === 1) {
            setFilters([{ id: Date.now().toString(), field: '', operator: 'equals', value: '' }]);
            return;
        }
        setFilters(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id: string, key: keyof Filter, value: string) => {
        setFilters(filters.map(f => f.id === id ? { ...f, [key]: value } : f));
    };

    const handleExport = () => {
        const validFilters = filters.filter(f => f.field && f.value !== '');
        triggerExport('/segments/export', `${currentType}_segment_export.csv`, {
            type: currentType,
            filters: validFilters
        }, 'POST');
    };

    // --- Render Helpers ---
    const getBadgeHelper = (status: string, type: 'financial' | 'fulfillment' | 'risk') => {
        const lower = status?.toLowerCase() || '';
        if (type === 'financial') {
            if (lower === 'paid') return <Badge tone="success">Paid</Badge>;
            if (lower === 'pending') return <Badge tone="attention">Pending</Badge>;
            if (lower === 'refunded') return <Badge tone="info">Refunded</Badge>;
            if (lower === 'voided') return <Badge tone="critical">Voided</Badge>;
            return <Badge>{status}</Badge>;
        }
        if (type === 'fulfillment') {
            if (lower === 'fulfilled') return <Badge tone="success">Fulfilled</Badge>;
            if (lower === 'unfulfilled') return <Badge tone="attention">Unfulfilled</Badge>;
            return <Badge>{status}</Badge>;
        }
        return <Badge>{status}</Badge>;
    };

    const rowMarkup = data?.data?.map(
        (item: any, index: number) => {
            if (currentType === 'order') {
                return (
                    <IndexTable.Row
                        id={item.id}
                        key={item.id}
                        selected={selectedResources.includes(item.id)}
                        position={index}
                    >
                        <IndexTable.Cell><Text variant="bodyMd" fontWeight="bold" as="span">{item.orderName}</Text></IndexTable.Cell>
                        <IndexTable.Cell>{new Date(item.orderDate).toLocaleDateString()}</IndexTable.Cell>
                        <IndexTable.Cell>{item.customerEmail || '-'}</IndexTable.Cell>
                        <IndexTable.Cell>{getBadgeHelper(item.financialStatus, 'financial')}</IndexTable.Cell>
                        <IndexTable.Cell>{getBadgeHelper(item.fulfillmentStatus, 'fulfillment')}</IndexTable.Cell>
                        <IndexTable.Cell>
                            <Text as="span" numeric>
                                {(item.totalPrice || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </Text>
                        </IndexTable.Cell>
                    </IndexTable.Row>
                );
            } else if (currentType === 'customer') {
                return (
                    <IndexTable.Row
                        id={item.id}
                        key={item.id}
                        selected={selectedResources.includes(item.id)}
                        position={index}
                        onClick={() => setSelectedCustomer(item)}
                    >
                        <IndexTable.Cell>
                            <div style={{ cursor: 'pointer' }}>
                                <Text variant="bodyMd" fontWeight="bold" as="span">{item.name || `${item.firstName} ${item.lastName}`}</Text>
                            </div>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{item.email}</IndexTable.Cell>
                        <IndexTable.Cell>{item.totalOrders}</IndexTable.Cell>
                        <IndexTable.Cell>{(item.totalSpent || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</IndexTable.Cell>
                        <IndexTable.Cell>
                            <Badge tone={
                                item.segment === 'VIP' ? 'success' :
                                    item.segment === 'Loyal' ? 'info' :
                                        item.segment === 'At-Risk' ? 'attention' :
                                            item.segment === 'Lost' ? 'critical' : 'info'
                            }>
                                {item.segment || 'Regular'}
                            </Badge>
                        </IndexTable.Cell>
                    </IndexTable.Row>
                );
            } else {
                return (
                    <IndexTable.Row
                        id={item.id}
                        key={item.id}
                        selected={selectedResources.includes(item.id)}
                        position={index}
                    >
                        <IndexTable.Cell>
                            <BlockStack gap="050">
                                <Text variant="bodyMd" fontWeight="bold" as="span">{item.title}</Text>
                                <Text variant="bodySm" tone="subdued" as="span">{item.sku || 'No SKU'}</Text>
                            </BlockStack>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{item.productType}</IndexTable.Cell>
                        <IndexTable.Cell>{item.vendor}</IndexTable.Cell>
                        <IndexTable.Cell>{(item.price || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</IndexTable.Cell>
                        <IndexTable.Cell>
                            <Badge tone={item.inventoryQuantity < 10 ? 'critical' : item.inventoryQuantity < 50 ? 'attention' : 'success'}>
                                {`${item.inventoryQuantity} in stock`}
                            </Badge>
                        </IndexTable.Cell>
                        <IndexTable.Cell>{item.totalSold}</IndexTable.Cell>
                        <IndexTable.Cell>{(item.totalRevenue || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</IndexTable.Cell>
                    </IndexTable.Row>
                );
            }
        },
    );

    const headers = () => {
        if (currentType === 'order') {
            return [
                { title: 'Order' },
                { title: 'Date' },
                { title: 'Customer' },
                { title: 'Payment' },
                { title: 'Fulfillment' },
                { title: 'Total', alignment: 'end' as const },
            ];
        }
        if (currentType === 'customer') {
            return [
                { title: 'Name' },
                { title: 'Email' },
                { title: 'Orders' },
                { title: 'Spent' },
                { title: 'Segment' },
            ];
        }
        return [
            { title: 'Product' },
            { title: 'Type' },
            { title: 'Vendor' },
            { title: 'Price' },
            { title: 'Inventory' },
            { title: 'Sold' },
            { title: 'Revenue' },
        ] as any; // Type override for Polaris NonEmptyArray
    };

    return (
        <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px' }}>
            <BlockStack gap="600">
                {/* Gradient Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
                }}>
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                            <Tooltip content="Build custom segments and export data for deeper analysis.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="h1" variant="heading2xl" tone="inherit">Advanced Segmentation</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="p" variant="bodyLg" tone="inherit">Create custom filters and export data across your store.</Text>
                        </BlockStack>
                        <InlineStack gap="300">
                            <Button
                                variant="primary"
                                tone="success"
                                icon={ExportIcon}
                                onClick={handleExport}
                                loading={isLoading}
                            >
                                Export Segment
                            </Button>
                        </InlineStack>
                    </InlineStack>
                </div>

                {/* Stats Cards (Mocked for now - could be aggregated from data) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h3" variant="headingSm" tone="subdued">Total Records Found</Text>
                            <Text as="p" variant="headingXl">{data?.total || 0}</Text>
                        </BlockStack>
                    </Card>
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h3" variant="headingSm" tone="subdued">Current Segment</Text>
                            <Text as="p" variant="headingMd" fontWeight="bold">{SEGMENT_TYPES[selectedTab].content}</Text>
                        </BlockStack>
                    </Card>
                    <Card>
                        <BlockStack gap="200">
                            <Text as="h3" variant="headingSm" tone="subdued">Active Filters</Text>
                            <Text as="p" variant="headingXl">{filters.filter(f => f.field).length}</Text>
                        </BlockStack>
                    </Card>
                </div>

                <Layout>
                    <Layout.Section>
                        <Card padding="0">
                            <Tabs tabs={SEGMENT_TYPES} selected={selectedTab} onSelect={handleTabChange}>
                                <Box padding="400" borderBlockEndWidth="025" borderColor="border">
                                    <BlockStack gap="400">
                                        <Text as="h2" variant="headingSm">Filter Logic</Text>
                                        {filters.map((filter) => (
                                            <InlineStack key={filter.id} gap="300" align="start">
                                                <div style={{ width: '250px' }}>
                                                    <Select
                                                        label=""
                                                        labelHidden
                                                        options={[{ label: 'Select Field', value: '' }, ...FIELDS[currentType]]}
                                                        value={filter.field}
                                                        onChange={(val) => updateFilter(filter.id, 'field', val)}
                                                    />
                                                </div>
                                                <div style={{ width: '180px' }}>
                                                    <Select
                                                        label=""
                                                        labelHidden
                                                        options={OPERATORS}
                                                        value={filter.operator}
                                                        onChange={(val) => updateFilter(filter.id, 'operator', val)}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <TextField
                                                        label=""
                                                        labelHidden
                                                        value={filter.value}
                                                        onChange={(val) => updateFilter(filter.id, 'value', val)}
                                                        autoComplete="off"
                                                        placeholder="Value..."
                                                    />
                                                </div>
                                                <Button icon={XIcon} onClick={() => removeFilter(filter.id)} accessibilityLabel="Remove filter" />
                                            </InlineStack>
                                        ))}

                                        <InlineStack align="space-between">
                                            <Button icon={PlusIcon} onClick={addFilter} variant="plain">Add condition</Button>
                                            <Button
                                                variant="primary"
                                                onClick={() => refetch()}
                                                loading={isFetching}
                                                icon={FilterIcon}
                                            >
                                                Apply Filters
                                            </Button>
                                        </InlineStack>
                                    </BlockStack>
                                </Box>

                                {/* Index Table */}
                                <IndexTable
                                    resourceName={resourceName}
                                    itemCount={data?.data?.length || 0}
                                    selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
                                    onSelectionChange={handleSelectionChange}
                                    headings={headers()}
                                    loading={isLoading}
                                    pagination={{
                                        hasNext: page < (data?.pages || 1),
                                        hasPrevious: page > 1,
                                        onNext: () => setPage(p => p + 1),
                                        onPrevious: () => setPage(p => p - 1),
                                    }}
                                >
                                    {rowMarkup}
                                </IndexTable>
                                {(!data?.data || data.data.length === 0) && !isLoading && (
                                    <EmptySearchResult
                                        title="No results found"
                                        description="Try changing the filters or search criteria."
                                        withIllustration
                                    />
                                )}
                            </Tabs>
                        </Card>
                    </Layout.Section>
                </Layout>
            </BlockStack>

            <CustomerDrawer
                customer={selectedCustomer}
                open={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)}
                onUpdate={refetch}
            />
        </div>
    );
}

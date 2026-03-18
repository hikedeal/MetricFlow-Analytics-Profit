import { Card, Text, Button, InlineStack, BlockStack, Pagination, Layout, Tabs, Filters, ChoiceList, TextField } from '@shopify/polaris';
import { useState, useMemo, useCallback } from 'react';
import { CustomersTable } from '../components/customers/CustomersTable';
import { CustomerDrawer } from '../components/customers/CustomerDrawer';
import { useCustomers } from '../hooks/useCustomers';
import api from '../services/api';
import { RefreshIcon, ExportIcon, InfoIcon } from '@shopify/polaris-icons';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Tooltip, Icon } from '@shopify/polaris';
import { triggerExport } from '../utils/export';
import { subDays } from 'date-fns';
import { DateRangePicker } from '../components/common/DateRangePicker';

export function CustomersPage() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [page, setPage] = useState(1);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [syncing, setSyncing] = useState(false);

    // Filter State
    const [queryValue, setQueryValue] = useState('');
    const [minSpent, setMinSpent] = useState<string | undefined>(undefined);
    const [maxSpent, setMaxSpent] = useState<string | undefined>(undefined);
    const [minOrders, setMinOrders] = useState<string | undefined>(undefined);
    const [maxOrders, setMaxOrders] = useState<string | undefined>(undefined);
    const [minAov, setMinAov] = useState<string | undefined>(undefined);
    const [maxAov, setMaxAov] = useState<string | undefined>(undefined);
    const [selectedRisk, setSelectedRisk] = useState<string[]>([]);
    const [dormantDays, setDormantDays] = useState<string | undefined>(undefined);

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
        setPage(1);
    };

    const tabs = [
        { id: 'all', content: 'All Customers', panelID: 'all-customers' },
        { id: 'vip', content: '⭐ VIP Customers', panelID: 'vip-customers' },
        { id: 'repeat', content: 'Repeat Buyers', panelID: 'repeat-customers' },
        { id: 'risk', content: '⚠️ High Risk', panelID: 'risk-customers' },
        { id: 'dormant', content: '💤 Dormant', panelID: 'dormant-customers' },
    ];

    const getParams = useMemo(() => {
        const params: any = {
            page,
            limit: 20,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        };
        if (selectedTab === 1) params.segment = 'vip';
        if (selectedTab === 2) params.segment = 'repeat';
        if (selectedTab === 3) params.risk = 'high';
        if (selectedTab === 4) {
            params.segment = 'dormant';
            params.dormantDays = dormantDays || '30';
        }

        if (queryValue) params.query = queryValue;
        if (minSpent) params.minSpent = minSpent;
        if (maxSpent) params.maxSpent = maxSpent;
        if (minOrders) params.minOrders = minOrders;
        if (maxOrders) params.maxOrders = maxOrders;
        if (minAov) params.minAov = minAov;
        if (maxAov) params.maxAov = maxAov;
        if (selectedRisk.length > 0) params.risk = selectedRisk[0];
        if (dormantDays) params.dormantDays = dormantDays;

        return params;
    }, [page, selectedTab, dateRange, queryValue, minSpent, maxSpent, minOrders, maxOrders, minAov, maxAov, selectedRisk, dormantDays]);

    const { data, isLoading, refetch } = useCustomers(getParams);

    // Mock trend data
    const trendData = [
        { name: 'Mon', new: 40, repeat: 24 },
        { name: 'Tue', new: 30, repeat: 13 },
        { name: 'Wed', new: 20, repeat: 98 },
        { name: 'Thu', new: 27, repeat: 39 },
        { name: 'Fri', new: 18, repeat: 48 },
        { name: 'Sat', new: 23, repeat: 38 },
        { name: 'Sun', nameDays: 'Sun', new: 34, repeat: 43 },
    ];

    const handleSync = async () => {
        setSyncing(true);
        try {
            await api.post('/sync/sync');
            await new Promise(r => setTimeout(r, 2000));
            refetch();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncing(false);
        }
    };

    const handleExport = () => {
        const filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        const params = { ...getParams };
        delete params.page;
        delete params.limit;
        triggerExport('/export/customers', filename, params);
    };

    const handleBulkExport = (segment: string) => {
        const filename = `${segment}_customers_${new Date().toISOString().split('T')[0]}.csv`;
        const params: any = {};
        if (segment === 'vip') params.segment = 'vip';
        if (segment === 'high') params.risk = 'high';
        triggerExport('/export/customers', filename, params);
    };

    // Filter Definitions
    const filters = [
        {
            key: 'totalSpent',
            label: 'Total Spent (LTV)',
            filter: (
                <InlineStack gap="200">
                    <TextField
                        label="Min"
                        labelHidden
                        type="number"
                        value={minSpent || ''}
                        onChange={setMinSpent}
                        prefix="₹"
                        autoComplete="off"
                        placeholder="Min"
                    />
                    <TextField
                        label="Max"
                        labelHidden
                        type="number"
                        value={maxSpent || ''}
                        onChange={setMaxSpent}
                        prefix="₹"
                        autoComplete="off"
                        placeholder="Max"
                    />
                </InlineStack>
            ),
        },
        {
            key: 'orders',
            label: 'Order Count',
            filter: (
                <InlineStack gap="200">
                    <TextField
                        label="Min Orders"
                        labelHidden
                        type="number"
                        value={minOrders || ''}
                        onChange={setMinOrders}
                        autoComplete="off"
                        placeholder="Min"
                    />
                    <TextField
                        label="Max Orders"
                        labelHidden
                        type="number"
                        value={maxOrders || ''}
                        onChange={setMaxOrders}
                        autoComplete="off"
                        placeholder="Max"
                    />
                </InlineStack>
            ),
        },
        {
            key: 'aov',
            label: 'Avg Order Value',
            filter: (
                <InlineStack gap="200">
                    <TextField
                        label="Min AOV"
                        labelHidden
                        type="number"
                        value={minAov || ''}
                        onChange={setMinAov}
                        prefix="₹"
                        autoComplete="off"
                        placeholder="Min"
                    />
                    <TextField
                        label="Max AOV"
                        labelHidden
                        type="number"
                        value={maxAov || ''}
                        onChange={setMaxAov}
                        prefix="₹"
                        autoComplete="off"
                        placeholder="Max"
                    />
                </InlineStack>
            ),
        },
        {
            key: 'risk',
            label: 'Risk Level',
            filter: (
                <ChoiceList
                    title="Risk Level"
                    titleHidden
                    choices={[
                        { label: 'High Risk', value: 'high' },
                        { label: 'Medium Risk', value: 'medium' },
                        { label: 'Low Risk', value: 'low' },
                    ]}
                    selected={selectedRisk}
                    onChange={setSelectedRisk}
                />
            ),
        },
        {
            key: 'dormant',
            label: 'Dormant For',
            filter: (
                <TextField
                    label="Days since last order"
                    labelHidden
                    type="number"
                    value={dormantDays || ''}
                    onChange={setDormantDays}
                    suffix="days"
                    autoComplete="off"
                    placeholder="30"
                />
            ),
        }
    ];

    const handleClearAll = useCallback(() => {
        setQueryValue('');
        setMinSpent(undefined);
        setMaxSpent(undefined);
        setMinOrders(undefined);
        setMaxOrders(undefined);
        setMinAov(undefined);
        setMaxAov(undefined);
        setSelectedRisk([]);
        setDormantDays(undefined);
    }, []);

    const handleRemoveFilter = (key: string) => {
        if (key === 'totalSpent') { setMinSpent(undefined); setMaxSpent(undefined); }
        if (key === 'orders') { setMinOrders(undefined); setMaxOrders(undefined); }
        if (key === 'aov') { setMinAov(undefined); setMaxAov(undefined); }
        if (key === 'risk') { setSelectedRisk([]); }
        if (key === 'dormant') { setDormantDays(undefined); }
    };

    return (
        <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px' }}>
            <CustomerDrawer
                customer={selectedCustomer}
                open={selectedCustomer !== null}
                onClose={() => setSelectedCustomer(null)}
                onUpdate={refetch}
            />

            <BlockStack gap="600">
                {/* Header Section */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
                }}>
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="200">
                            <Tooltip content="Centralized database of your customer segments, behavioral patterns, and performance metrics.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="h1" variant="heading2xl" tone="inherit">Customer Hub</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="p" variant="bodyLg" tone="inherit">Performance marketing & segmentation engine</Text>
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
                                Sync
                            </Button>
                            <Button
                                variant="primary"
                                tone="success"
                                icon={ExportIcon}
                                onClick={handleExport}
                            >
                                Export
                            </Button>
                        </InlineStack>
                    </InlineStack>
                </div>

                {/* Insights Section */}
                <Layout>
                    <Layout.Section variant="oneThird">
                        <BlockStack gap="400">
                            <Card>
                                <Tooltip content="Average Lifetime Value: The total revenue expected from a customer over their entire relationship with your store.">
                                    <BlockStack gap="100">
                                        <InlineStack gap="100" blockAlign="center">
                                            <Text as="p" variant="bodySm" tone="subdued">Average LTV</Text>
                                            <Icon source={InfoIcon} tone="subdued" />
                                        </InlineStack>
                                        <Text as="p" variant="heading2xl">₹ 4,820</Text>
                                        <Text as="p" variant="bodyXs" tone="success">↑ 8% from last month</Text>
                                    </BlockStack>
                                </Tooltip>
                            </Card>
                            <Card>
                                <Tooltip content="The percentage of customers who have made more than one purchase at your store.">
                                    <BlockStack gap="100">
                                        <InlineStack gap="100" blockAlign="center">
                                            <Text as="p" variant="bodySm" tone="subdued">Retention Rate</Text>
                                            <Icon source={InfoIcon} tone="subdued" />
                                        </InlineStack>
                                        <Text as="p" variant="heading2xl">24.5%</Text>
                                        <Text as="p" variant="bodyXs" tone="success">↑ 2.1% improvement</Text>
                                    </BlockStack>
                                </Tooltip>
                            </Card>
                        </BlockStack>
                    </Layout.Section>
                    <Layout.Section variant="oneHalf">
                        <Card>
                            <BlockStack gap="400">
                                <Tooltip content="Daily trend of new customer sign-ups vs. return visits and purchases.">
                                    <InlineStack gap="100" blockAlign="center">
                                        <Text as="h2" variant="headingMd">Customer Acquisition Trend</Text>
                                        <Icon source={InfoIcon} tone="subdued" />
                                    </InlineStack>
                                </Tooltip>
                                <div style={{ width: '100%', height: 180 }}>
                                    <ResponsiveContainer>
                                        <AreaChart data={trendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                            <RechartsTooltip />
                                            <Area type="monotone" dataKey="new" stroke="#8884d8" fill="#8884d8" fillOpacity={0.1} name="New Customers" />
                                            <Area type="monotone" dataKey="repeat" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.1} name="Repeat Customers" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>

                {/* Main Table Card */}
                <Card padding="0">
                    <Tabs tabs={tabs} selected={selectedTab} onSelect={(idx) => { setSelectedTab(idx); setPage(1); }}>
                        <div style={{ padding: '16px', borderBottom: '1px solid #e1e3e5' }}>
                            <Filters
                                queryValue={queryValue}
                                queryPlaceholder="Search customers by name, email, or ID..."
                                onQueryChange={(val) => { setQueryValue(val); setPage(1); }}
                                onQueryClear={() => setQueryValue('')}
                                filters={filters}
                                appliedFilters={[
                                    ...(minSpent || maxSpent ? [{
                                        key: 'totalSpent',
                                        label: `LTV: ₹${minSpent || 0} - ₹${maxSpent || '∞'}`,
                                        onRemove: () => handleRemoveFilter('totalSpent'),
                                    }] : []),
                                    ...(minOrders || maxOrders ? [{
                                        key: 'orders',
                                        label: `Orders: ${minOrders || 0} - ${maxOrders || '∞'}`,
                                        onRemove: () => handleRemoveFilter('orders'),
                                    }] : []),
                                    ...(minAov || maxAov ? [{
                                        key: 'aov',
                                        label: `AOV: ₹${minAov || 0} - ₹${maxAov || '∞'}`,
                                        onRemove: () => handleRemoveFilter('aov'),
                                    }] : []),
                                    ...(selectedRisk.length > 0 ? [{
                                        key: 'risk',
                                        label: `Risk: ${selectedRisk.join(', ')}`,
                                        onRemove: () => handleRemoveFilter('risk'),
                                    }] : []),
                                    ...(dormantDays ? [{
                                        key: 'dormant',
                                        label: `Dormant: > ${dormantDays} days`,
                                        onRemove: () => handleRemoveFilter('dormant'),
                                    }] : []),
                                ]}
                                onClearAll={handleClearAll}
                            />
                        </div>

                        <CustomersTable
                            customers={data?.data || []}
                            loading={isLoading}
                            onRowClick={setSelectedCustomer}
                            onExport={handleBulkExport}
                        />

                        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', borderTop: '1px solid #e1e3e5' }}>
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

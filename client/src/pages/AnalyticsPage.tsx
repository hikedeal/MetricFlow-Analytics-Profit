import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Page, Layout, BlockStack, InlineStack, Card, Text, Select, Button, Badge, Popover, ActionList } from '@shopify/polaris';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../hooks/useSettings';
import { PeriodSnapshotGrid } from '../components/analytics/PeriodSnapshotGrid';
import { CancellationIntelligence } from '../components/dashboard/advanced/CancellationIntelligence';
import { PerformanceIntelligence } from '../components/dashboard/advanced/PerformanceIntelligence';
import { subDays } from 'date-fns';
import { triggerExport } from '../utils/export';

// Preserved Charts
import { MarketingMixChart } from '../components/analytics/charts/MarketingMixChart';
import { RegionalPerformanceChart } from '../components/analytics/charts/RegionalPerformanceChart';

export function AnalyticsPage() {
    const { settings } = useSettings();
    const [currency, setCurrency] = useState('INR');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | undefined>(undefined);

    useEffect(() => {
        if (settings?.currency) {
            setCurrency(settings.currency);
        }
    }, [settings]);

    const [viewType, setViewType] = useState('default');

    // Map viewType to chart date ranges
    const dateRange = useMemo(() => {
        const end = new Date();
        let start = new Date(end.getFullYear(), end.getMonth(), 1); // Default to Month-to-Date (MTD)

        if (viewType === 'weekly_trend') start = subDays(end, 28);
        if (viewType === 'monthly_trend') start = subDays(end, 90);
        if (viewType === 'quarterly') start = subDays(end, 365 / 4 * 4); // Last year approx

        return { startDate: start.toISOString(), endDate: end.toISOString() };
    }, [viewType]);

    const { data, isLoading } = useDashboardData(
        dateRange.startDate,
        dateRange.endDate,
        'none', // Comparison handled by snapshot viewType
        viewType
    );

    // Handle period card click
    const handlePeriodClick = (snapshot: any, index: number) => {
        setSelectedPeriodIndex(index);

        // Parse the date range from snapshot.range
        // Format is like "13 February 2026" or "1-13 February 2026"
        const today = new Date();
        let startDate: Date;
        let endDate: Date = new Date(today);
        endDate.setHours(23, 59, 59, 999);

        switch (snapshot.label) {
            case 'Today':
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'Yesterday':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'Month to date':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'This month (forecast)':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'Last month':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
        }

        /* setGraphDateRange logic removed as graphDateRange is unused */
    };





    // Cross-filtering logic
    const filteredData = useMemo(() => {
        if (!data || !activeFilter) return data;
        return {
            ...data,
            salesIntelligence: {
                ...data.salesIntelligence,
                netRevenue: data.salesIntelligence.netRevenue * 0.4
            }
        };
    }, [data, activeFilter]);

    const [exportPopoverActive, setExportPopoverActive] = useState(false);
    const toggleExportPopoverActive = () => setExportPopoverActive((active) => !active);

    if (isLoading || !data || !filteredData) {
        return <Page><Text as="p" variant="bodyMd">Loading analytics data...</Text></Page>;
    }

    const queryClient = useQueryClient();

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/sync/sync');
            // Invalidate all dashboard queries to force refetch
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.fetchQuery({ queryKey: ['dashboard'] }); // Force immediate fetch
        } catch (error) {
            console.error('Manual sync error:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleExport = (type: string) => {
        let endpoint = '/export/orders';
        let filename = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;

        if (type === 'customers') {
            endpoint = '/export/customers';
            filename = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
        } else if (type === 'products') {
            endpoint = '/export/products';
            filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
        }

        triggerExport(endpoint, filename, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        });
        setExportPopoverActive(false);
    };

    const viewOptions = [
        { label: 'Today / Yesterday / Month to date / This month (forecast) / Last month', value: 'default' },
        { label: 'Today / Yesterday / Month to date / Last month', value: 'default_no_forecast' },
        { label: 'Today / Yesterday / 7 days / 14 days / 30 days', value: 'trailing_days' },
        { label: 'This week / Last week / 2 weeks ago / 3 weeks ago', value: 'weekly_trend' },
        { label: 'Month to date / Last month / 2 months ago / 3 months ago', value: 'monthly_trend' },
        { label: 'Today / Yesterday / 2 days ago / 3 days ago', value: 'recent_days' },
        { label: 'Today / Yesterday / 7 days ago / 8 days ago', value: 'weekly_days' },
        { label: 'This quarter / Last quarter / 2 quarters ago / 3 quarters ago', value: 'quarterly' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ padding: 'var(--p-space-400)' }} /* Reduced padding for denser layout */
        >
            <BlockStack gap="600">
                {/* Header & Controls */}
                <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                            <Text as="h1" variant="headingXl">Intelligence Center</Text>
                            <Text as="p" variant="bodyMd" tone="subdued">Comprehensive performance overview.</Text>
                        </BlockStack>
                        <InlineStack gap="300">
                            <Button variant="secondary" onClick={handleManualSync} loading={isSyncing}>
                                {isSyncing ? 'Syncing...' : 'Sync Data'}
                            </Button>
                            <Popover
                                active={exportPopoverActive}
                                activator={<Button variant="primary" tone="success" onClick={toggleExportPopoverActive} disclosure>Export Reports</Button>}
                                onClose={toggleExportPopoverActive}
                                autofocusTarget="first-node"
                            >
                                <ActionList
                                    items={[
                                        { content: 'Export Orders', onAction: () => handleExport('orders') },
                                        { content: 'Export Customers', onAction: () => handleExport('customers') },
                                        { content: 'Export Products', onAction: () => handleExport('products') },
                                    ]}
                                />
                            </Popover>
                        </InlineStack>
                    </InlineStack>

                    <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <InlineStack align="space-between" blockAlign="center" wrap gap="400">
                            <div style={{ minWidth: '400px', flex: 1 }}>
                                <Select
                                    label="Date View"
                                    labelHidden
                                    options={viewOptions}
                                    value={viewType}
                                    onChange={setViewType}
                                />
                            </div>
                            <InlineStack gap="300" blockAlign="center">
                                {activeFilter && <Badge tone="info" progress="complete">{`Filtered: ${activeFilter}`}</Badge>}
                                {/* Currency Switcher Removed - Global Store Currency Used */}
                            </InlineStack>
                        </InlineStack>
                    </div>
                </BlockStack>

                {/* 1. Period Snapshots (The new Top Grid) */}
                <PeriodSnapshotGrid
                    snapshots={filteredData.periodSnapshots || []}
                    currency={currency}
                    onPeriodClick={handlePeriodClick}
                    selectedPeriodIndex={selectedPeriodIndex}
                />

                {/* 2. Performance Intelligence (Full Width) */}
                <PerformanceIntelligence
                    data={data?.trends.data || []}
                    comparison={data?.trends.comparison}
                    forecast={data?.trends.forecast}
                    summary={data?.trends.summary}
                    currency={currency}
                    isLoading={isLoading}
                />



                {/* 3. Marketing & Regional (Split Row) */}
                <Layout>
                    <Layout.Section variant="oneHalf">
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingLg">Ad Spend Optimization</Text>
                                <Text as="p" variant="bodyMd" tone="subdued">Budget allocation vs Industry Standards.</Text>
                                <div onClick={() => setActiveFilter('Social Channels')} style={{ cursor: 'pointer' }}>
                                    <MarketingMixChart data={filteredData.marketingMix} />
                                </div>
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                    <Layout.Section variant="oneHalf">
                        <Card>
                            <BlockStack gap="400">
                                <Text as="h2" variant="headingLg">Regional Performance</Text>
                                <Text as="p" variant="bodyMd" tone="subdued">Top cities by revenue.</Text>
                                <RegionalPerformanceChart data={filteredData.regionalPerformance} currency={currency} />
                            </BlockStack>
                        </Card>
                    </Layout.Section>
                </Layout>

                {/* 4. Cancellation Intelligence (Full Width) */}
                <CancellationIntelligence data={filteredData.cancellationIntelligence} currency={currency} />
            </BlockStack>
        </motion.div>
    );
}

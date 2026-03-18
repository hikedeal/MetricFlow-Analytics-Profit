import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { motion } from 'framer-motion';
import { Layout, Text, BlockStack, InlineStack, Button, Divider, Tabs, Popover, ActionList, Tooltip, Icon } from '@shopify/polaris';
import { subDays } from 'date-fns';
import { InfoIcon } from '@shopify/polaris-icons';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../hooks/useSettings'; // Import useSettings
import { SalesMetricsCards } from '../components/dashboard/SalesMetricsCards';
import { SalesTrendChart } from '../components/dashboard/SalesTrendChart';
import { OrderTagsBreakdown } from '../components/dashboard/OrderTagsBreakdown';
import { TopCustomers } from '../components/dashboard/TopCustomers';
import { TopProducts } from '../components/dashboard/TopProducts';
import { ProfitMetrics } from '../components/dashboard/ProfitMetrics';
import { AlertsPanel } from '../components/dashboard/AlertsPanel';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { CurrencySwitcher } from '../components/common/CurrencySwitcher';
import { triggerExport } from '../utils/export';

// Advanced Modules
import { CancellationIntelligence } from '../components/dashboard/advanced/CancellationIntelligence';
import { MarketingMetrics } from '../components/dashboard/advanced/MarketingMetrics';
import { FunnelAnalysis } from '../components/dashboard/advanced/FunnelAnalysis';
import { CohortRetention } from '../components/dashboard/advanced/CohortRetention';
import { InventoryRisk } from '../components/dashboard/advanced/InventoryRisk';
import { SmartAlerts } from '../components/dashboard/advanced/SmartAlerts';
import { DailySnapshot } from '../components/dashboard/advanced/DailySnapshot';
import { GrowthOpportunities } from '../components/dashboard/advanced/GrowthOpportunities';
import { PaymentInsights } from '../components/dashboard/advanced/PaymentInsights';
import { RefundIntelligence } from '../components/dashboard/advanced/RefundIntelligence';
import { CustomerInsights } from '../components/dashboard/advanced/CustomerInsights';
import { NotificationBell } from '../components/dashboard/NotificationBell';

export function DashboardPage() {
    const { settings, loading: settingsLoading, exchangeRates } = useSettings(); // Use hook
    const [currency, setCurrency] = useState('USD');
    const [selectedMetric, setSelectedMetric] = useState<string>('sales');
    const [selectedTab, setSelectedTab] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync currency from settings once loaded
    useEffect(() => {
        if (!settingsLoading && settings?.currency) {
            setCurrency(settings.currency);
        }
    }, [settings, settingsLoading]);

    // Initialize with last 30 days
    const now = new Date();
    const [dateRange, setDateRange] = useState({
        preset: 'last_30_days',
        startDate: subDays(now, 30).toISOString(),
        endDate: now.toISOString(),
        compareEnabled: false,
        compareType: 'previous_period',
    });

    const { data, isLoading } = useDashboardData(
        dateRange.startDate,
        dateRange.endDate,
        dateRange.compareEnabled ? dateRange.compareType : 'none'
    );

    const handleDateRangeChange = (
        preset: string,
        start: Date,
        end: Date,
        compare: { enabled: boolean; type: string }
    ) => {
        setDateRange({
            preset,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            compareEnabled: compare.enabled,
            compareType: compare.type,
        });
    };

    const [exportPopoverActive, setExportPopoverActive] = useState(false);
    const toggleExportPopoverActive = () => setExportPopoverActive((active) => !active);

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

    const handleDownloadReport = (period: 'weekly' | 'monthly') => {
        const endDate = new Date();
        const startDate = new Date();

        if (period === 'weekly') {
            startDate.setDate(endDate.getDate() - 7);
        } else {
            startDate.setDate(endDate.getDate() - 30);
        }

        triggerExport('/export/summary', `executive_summary_${period}_${endDate.toISOString().split('T')[0]}.csv`, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });
    };

    const handleMetricClick = (metric: string) => {
        setSelectedMetric(metric);
        // If in overview, scroll to chart
        if (selectedTab === 0) {
            setTimeout(() => {
                document.getElementById('sales-trend-chart')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    };

    const queryClient = useQueryClient();

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await api.post('/sync/sync');

            // Invalidate all dashboard queries to force immediate refetch
            await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            await queryClient.fetchQuery({ queryKey: ['dashboard'] });

        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const tabs = [
        { id: 'overview', content: 'Overview', panelID: 'overview-panel' },
        { id: 'operations', content: 'Operations Intelligence', panelID: 'operations-panel' },
        { id: 'growth', content: 'Growth & Marketing', panelID: 'growth-panel' },
        { id: 'reports', content: 'Deep Insights & Reports', panelID: 'reports-panel' },
    ];

    if (isLoading || !data) {
        return (
            <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Loading Dashboard...</Text>
                    {/* Placeholder loading state could be better but sufficient for now */}
                </BlockStack>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ padding: 'var(--p-space-800) var(--p-space-600)' }}
        >
            <BlockStack gap="800">
                {/* Premium Header */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    style={{
                        background: 'var(--primary-gradient)',
                        borderRadius: '24px',
                        padding: 'var(--p-space-1000) var(--p-space-800)',
                        color: 'white',
                        boxShadow: '0 20px 50px rgba(99, 102, 241, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Decorative Background Elements */}
                    <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(50px)' }} />
                    <div style={{ position: 'absolute', bottom: '-50px', left: '10%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(30px)' }} />

                    <BlockStack gap="600">
                        <InlineStack align="space-between" blockAlign="center" wrap>
                            <BlockStack gap="300">
                                <Tooltip content="Your complete business command center. Monitor real-time sales, orders, and growth metrics.">
                                    <InlineStack gap="100" blockAlign="center">
                                        <Text as="h1" variant="heading3xl" tone="inherit">
                                            Performance Intelligence
                                        </Text>
                                        <Icon source={InfoIcon} tone="inherit" />
                                    </InlineStack>
                                </Tooltip>
                                <Text as="p" variant="bodyLg" tone="inherit" fontWeight="medium">
                                    Everything you need to scale your Shopify store in one place.
                                </Text>
                            </BlockStack>

                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                style={{ textAlign: 'right', minWidth: '180px', background: 'rgba(255,255,255,0.15)', padding: '16px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                            >
                                <Tooltip content="The last time your store's data was successfully synced with Shopify.">
                                    <div style={{ textAlign: 'right' }}>
                                        <InlineStack gap="100" align="end" blockAlign="center">
                                            <Text as="p" variant="bodySm" tone="inherit">
                                                Last Global Sync
                                            </Text>
                                            <Icon source={InfoIcon} tone="inherit" />
                                        </InlineStack>
                                        <Text as="p" variant="headingLg" tone="inherit">
                                            {new Date().toLocaleTimeString()}
                                        </Text>
                                    </div>
                                </Tooltip>
                            </motion.div>
                        </InlineStack>

                        <Divider borderColor="transparent" />

                        {/* Controls Bar */}
                        <InlineStack align="space-between" blockAlign="center" wrap gap="400">
                            <InlineStack gap="400" blockAlign="center" wrap>
                                <DateRangePicker
                                    value={{
                                        preset: dateRange.preset,
                                        start: new Date(dateRange.startDate),
                                        end: new Date(dateRange.endDate)
                                    }}
                                    compareValue={{
                                        enabled: dateRange.compareEnabled,
                                        type: dateRange.compareType
                                    }}
                                    onChange={handleDateRangeChange}
                                />
                                <CurrencySwitcher
                                    currency={currency}
                                    onChange={setCurrency}
                                />
                            </InlineStack>

                            <InlineStack gap="300" wrap>
                                <NotificationBell />
                                <Popover
                                    active={exportPopoverActive}
                                    activator={
                                        <Button onClick={toggleExportPopoverActive} variant="secondary" disclosure>
                                            Export Center
                                        </Button>
                                    }
                                    onClose={toggleExportPopoverActive}
                                >
                                    <ActionList
                                        items={[
                                            {
                                                content: 'Automated Orders CSV',
                                                onAction: () => handleExport('orders'),
                                            },
                                            {
                                                content: 'Customer Intelligence List',
                                                onAction: () => handleExport('customers'),
                                            },
                                            {
                                                content: 'Product Performance Report',
                                                onAction: () => handleExport('products'),
                                            },
                                        ]}
                                    />
                                </Popover>
                                <Button
                                    variant="primary"
                                    onClick={handleManualSync}
                                    tone="success"
                                    loading={isSyncing}
                                    disabled={isSyncing}
                                >
                                    {isSyncing ? 'Syncing Real-time...' : 'Sync Store Data'}
                                </Button>
                            </InlineStack>
                        </InlineStack>
                    </BlockStack>
                </motion.div>

                {/* Key Metrics - Always Visible with Glass Effect */}
                <motion.div
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    style={{ padding: '32px' }}
                >
                    <SalesMetricsCards
                        data={data.salesIntelligence}
                        profitData={data.profitMetrics}
                        isLoading={false}
                        currency={currency}
                        baseCurrency={data.storeCurrency}
                        showProfit={settings?.enableStoreLevelProfit || settings?.enableProfitTracking}
                        exchangeRates={exchangeRates}
                        onMetricClick={handleMetricClick}
                    />
                </motion.div>


                {/* Main Content Tabs */}
                <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                    {/* Tab 0: OVERVIEW */}
                    {selectedTab === 0 && (
                        <div style={{ marginTop: '24px' }}>
                            <BlockStack gap="600">
                                {/* Alerts & Daily Snapshot */}
                                <Layout>
                                    <Layout.Section variant="oneHalf">
                                        <DailySnapshot
                                            data={data.dailySnapshot}
                                            currency={currency}
                                            baseCurrency={data.storeCurrency}
                                            exchangeRates={exchangeRates}
                                        />
                                    </Layout.Section>
                                    <Layout.Section variant="oneHalf">
                                        <SmartAlerts alerts={data.smartAlerts} />
                                    </Layout.Section>
                                </Layout>

                                {/* Trend Chart */}
                                <div id="sales-trend-chart" style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                                }}>
                                    <BlockStack gap="400">
                                        <Tooltip content="Visual representation of your sales and order volume over the selected date range.">
                                            <InlineStack gap="100" blockAlign="center">
                                                <Text as="h2" variant="headingXl">Sales & Orders Trend</Text>
                                                <Icon source={InfoIcon} tone="subdued" />
                                            </InlineStack>
                                        </Tooltip>
                                        <SalesTrendChart
                                            data={data.trends.data}
                                            isLoading={false}
                                            selectedMetric={selectedMetric}
                                            currency={currency}
                                            baseCurrency={data.storeCurrency}
                                            exchangeRates={exchangeRates}
                                        />
                                    </BlockStack>
                                </div>

                                {/* Top Lists */}
                                <Layout>
                                    <Layout.Section variant="oneHalf">
                                        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                            <BlockStack gap="400">
                                                <Tooltip content="Best-selling products by volume and revenue.">
                                                    <InlineStack gap="100" blockAlign="center">
                                                        <Text as="h2" variant="headingXl">Top Products</Text>
                                                        <Icon source={InfoIcon} tone="subdued" />
                                                    </InlineStack>
                                                </Tooltip>
                                                <TopProducts
                                                    data={data.productPerformance.topProducts}
                                                    isLoading={false}
                                                    currency={currency}
                                                    baseCurrency={data.storeCurrency}
                                                    exchangeRates={exchangeRates}
                                                />
                                            </BlockStack>
                                        </div>
                                    </Layout.Section>
                                    <Layout.Section variant="oneHalf">
                                        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                            <BlockStack gap="400">
                                                <Tooltip content="Customers with the highest total spend (Lifetime Value).">
                                                    <InlineStack gap="100" blockAlign="center">
                                                        <Text as="h2" variant="headingXl">Top Customers</Text>
                                                        <Icon source={InfoIcon} tone="subdued" />
                                                    </InlineStack>
                                                </Tooltip>
                                                <TopCustomers
                                                    data={data.customerIntelligence.topCustomers}
                                                    isLoading={false}
                                                    currency={currency}
                                                    baseCurrency={data.storeCurrency}
                                                    exchangeRates={exchangeRates}
                                                />
                                            </BlockStack>
                                        </div>
                                    </Layout.Section>
                                </Layout>
                            </BlockStack>
                        </div>
                    )}

                    {/* Tab 1: OPERATIONS */}
                    {selectedTab === 1 && (
                        <div style={{ marginTop: '24px' }}>
                            <BlockStack gap="600">
                                <Text as="h2" variant="headingXl">Operations Intelligence</Text>
                                <AlertsPanel salesIntelligence={data.salesIntelligence} orderTags={data.orderTags} />

                                <CancellationIntelligence data={data.cancellationIntelligence} currency={currency} />

                                <Layout>
                                    <Layout.Section variant="oneThird">
                                        <InventoryRisk data={data.inventoryRisks} currency={currency} />
                                    </Layout.Section>
                                    <Layout.Section variant="oneThird">
                                        <PaymentInsights />
                                    </Layout.Section>
                                    <Layout.Section variant="oneThird">
                                        <RefundIntelligence />
                                    </Layout.Section>
                                </Layout>
                            </BlockStack>
                        </div>
                    )}

                    {/* Tab 2: GROWTH */}
                    {selectedTab === 2 && (
                        <div style={{ marginTop: '24px' }}>
                            <BlockStack gap="600">
                                <Text as="h2" variant="headingXl">Growth & Marketing</Text>
                                <Layout>
                                    <Layout.Section variant="oneHalf">
                                        <MarketingMetrics data={data.marketingMetrics} currency={currency} />
                                    </Layout.Section>
                                    <Layout.Section variant="oneHalf">
                                        <BlockStack gap="400">
                                            <GrowthOpportunities data={data.growthOpportunities} />
                                            <FunnelAnalysis data={data.funnelMetrics} />
                                        </BlockStack>
                                    </Layout.Section>
                                </Layout>
                                <Layout>
                                    <Layout.Section variant="oneHalf">
                                        <CohortRetention data={data.cohortMetrics} />
                                    </Layout.Section>
                                    <Layout.Section variant="oneHalf">
                                        {data.customerIntelligence.ltv && (
                                            <CustomerInsights data={data.customerIntelligence.ltv} currency={currency} />
                                        )}
                                    </Layout.Section>
                                </Layout>
                            </BlockStack>
                        </div>
                    )}

                    {/* Tab 3: REPORTS */}
                    {selectedTab === 3 && (
                        <div style={{ marginTop: '24px' }}>
                            <BlockStack gap="600">
                                <Text as="h2" variant="headingXl">Detailed Reports</Text>
                                <Layout>
                                    <Layout.Section variant="oneHalf">
                                        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                            <BlockStack gap="400">
                                                <Text as="h2" variant="headingXl">Order Tag Analysis</Text>
                                                <OrderTagsBreakdown data={data.orderTags} isLoading={false} currency={currency} />
                                            </BlockStack>
                                        </div>
                                    </Layout.Section>
                                    {settings?.enableProfitTracking && (
                                        <Layout.Section variant="oneHalf">
                                            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                                <BlockStack gap="400">
                                                    <Text as="h2" variant="headingXl">Profitability Matrix</Text>
                                                    <ProfitMetrics
                                                        data={data.profitMetrics}
                                                        isLoading={false}
                                                        currency={currency}
                                                        baseCurrency={data.storeCurrency}
                                                        exchangeRates={exchangeRates}
                                                    />
                                                </BlockStack>
                                            </div>
                                        </Layout.Section>
                                    )}
                                </Layout>
                                <div style={{ background: 'white', padding: '32px', borderRadius: '16px', textAlign: 'center' }}>
                                    <BlockStack gap="400">
                                        <Text as="h2" variant="headingLg">Executive Summary</Text>
                                        <Text as="p" variant="bodyMd" tone="subdued">Download comprehensive automated reports for stakeholders.</Text>
                                        <InlineStack align="center" gap="400">
                                            <Button size="large" onClick={() => handleDownloadReport('weekly')}>Download Weekly Report</Button>
                                            <Button size="large" variant="primary" onClick={() => handleDownloadReport('monthly')}>Download Monthly Report</Button>
                                        </InlineStack>
                                    </BlockStack>
                                </div>
                            </BlockStack>
                        </div>
                    )}
                </Tabs>
            </BlockStack>
        </motion.div>
    );
}

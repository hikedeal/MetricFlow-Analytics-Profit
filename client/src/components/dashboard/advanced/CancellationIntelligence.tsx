import { BlockStack, Text, InlineStack, Grid, Icon, Badge, Card, Tooltip } from '@shopify/polaris';
import {
    ChartVerticalIcon,
    AlertBubbleIcon,
    InfoIcon
} from '@shopify/polaris-icons';
import { formatCurrency } from '../../../utils/currency';
import { CancellationMetrics } from '../../../hooks/useDashboardData';

interface Props {
    data: CancellationMetrics;
    currency?: string;
    isLoading?: boolean;
}

const BRAND_COLORS = ['#4f46e5', '#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export function CancellationIntelligence({ data, currency, isLoading }: Props) {
    if (isLoading || !data) return null;

    // Prepare Reasoning Data
    const rawData = (data.reasons || []).sort((a, b) => b.value - a.value);
    const matrixData = rawData.map((item, index) => ({
        name: item.reason,
        frequency: item.count,
        impact: item.value,
        share: (item.value / (data.lossAmount || 1)) * 100,
        color: BRAND_COLORS[index % BRAND_COLORS.length]
    }));

    return (
        <BlockStack gap="600">
            {/* Pure White Header Section */}
            <div style={{ padding: '24px 8px', borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                <BlockStack gap="200">
                    <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="400" blockAlign="center">
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <Icon source={ChartVerticalIcon} tone="base" />
                            </div>
                            <BlockStack gap="050">
                                <Text as="h2" variant="headingLg" fontWeight="bold">Loss Mitigation Intelligence</Text>
                                <Text as="p" variant="bodyMd" tone="subdued">Strategic analysis of revenue leakage and cancellation patterns.</Text>
                            </BlockStack>
                        </InlineStack>
                        <InlineStack gap="200">
                            <Badge tone="success">Active Tracking</Badge>
                            <Badge tone="info">Month-to-Date</Badge>
                        </InlineStack>
                    </InlineStack>
                </BlockStack>
            </div>

            {/* Performance Snapshot Cards */}
            <div style={{ padding: '0 8px' }}>
                <Grid>
                    <Grid.Cell columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                        <Card padding="600">
                            <BlockStack gap="400">
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" fontWeight="bold" tone="subdued">TOTAL LOSS VALUE</Text>
                                    <Tooltip content="Total revenue leakage from cancellations and RTO for the current month.">
                                        <Icon source={AlertBubbleIcon} tone="critical" />
                                    </Tooltip>
                                </InlineStack>
                                <BlockStack gap="100">
                                    <Text as="p" variant="heading2xl" fontWeight="bold">{formatCurrency(data.lossAmount, currency || 'INR')}</Text>
                                    <Text as="p" variant="bodySm" tone="critical">Requires attention</Text>
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </Grid.Cell>

                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                        <Card padding="600">
                            <InlineStack gap="800" align="start">
                                {[
                                    { label: 'Cancellations', val: data.lossBreakdown?.cancellation.amount, count: data.lossBreakdown?.cancellation.count, color: '#4f46e5', tooltip: 'Orders cancelled before fulfillment or during the transit phase.' },
                                    { label: 'RTO (Returned)', val: data.lossBreakdown?.rto.amount, count: data.lossBreakdown?.rto.count, color: '#f59e0b', tooltip: 'Return to Origin - orders that could not be delivered and were sent back to the warehouse.' }
                                ].map((item, i) => (
                                    <div key={i} style={{ flex: 1 }}>
                                        <BlockStack gap="400">
                                            <InlineStack gap="200" align="center">
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color }}></div>
                                                <Tooltip content={item.tooltip}>
                                                    <InlineStack gap="100" blockAlign="center">
                                                        <Text as="p" variant="bodySm" tone="subdued" fontWeight="bold">{item.label}</Text>
                                                        <Icon source={InfoIcon} tone="subdued" />
                                                    </InlineStack>
                                                </Tooltip>
                                            </InlineStack>
                                            <BlockStack gap="100">
                                                <Text as="p" variant="headingLg" fontWeight="bold">{formatCurrency(item.val || 0, currency || 'INR')}</Text>
                                                <Text as="p" variant="bodySm" tone="subdued">{item.count} orders</Text>
                                            </BlockStack>
                                        </BlockStack>
                                    </div>
                                ))}
                            </InlineStack>
                        </Card>
                    </Grid.Cell>
                </Grid>
            </div>

            {/* DETAILED RECOVERY LIST */}
            <div style={{ padding: '0 8px' }}>
                <Card padding="600">
                    <BlockStack gap="600">
                        <Text as="h3" variant="headingMd" fontWeight="bold">Revenue Recovery Prioritization</Text>
                        <Grid>
                            {matrixData.map((item, i) => (
                                <Grid.Cell key={i} columnSpan={{ xs: 6, sm: 2, md: 2, lg: 2, xl: 2 }}>
                                    <div style={{ padding: '20px', borderRadius: '16px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                        <BlockStack gap="300">
                                            <InlineStack align="space-between" blockAlign="center">
                                                <Tooltip content={`Primary reason for ${item.name} loss occurrence.`}>
                                                    <InlineStack gap="100" blockAlign="center">
                                                        <Text as="p" variant="bodyMd" fontWeight="bold">{item.name}</Text>
                                                        <Icon source={InfoIcon} tone="subdued" />
                                                    </InlineStack>
                                                </Tooltip>
                                                <Badge tone={i < 2 ? 'critical' : 'attention'}>{item.frequency + ' cases'}</Badge>
                                            </InlineStack>
                                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ width: `${item.share}%`, height: '100%', background: item.color, borderRadius: '3px' }}></div>
                                            </div>
                                            <InlineStack align="space-between">
                                                <Text as="p" variant="bodyXs" tone="subdued">Total Impact</Text>
                                                <Text as="p" variant="bodySm" fontWeight="bold">{formatCurrency(item.impact, currency || 'INR')}</Text>
                                            </InlineStack>
                                        </BlockStack>
                                    </div>
                                </Grid.Cell>
                            ))}
                        </Grid>
                    </BlockStack>
                </Card>
            </div>
        </BlockStack>
    );
}

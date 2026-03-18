import { useState } from 'react';
import { BlockStack, Text, TextField, RangeSlider, Grid, Tooltip, Icon, InlineStack } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import { formatCurrency } from '../../../utils/currency';
import { MarketingMetrics as MarketingMetricsType } from '../../../hooks/useDashboardData';

interface Props {
    data: MarketingMetricsType;
    currency?: string;
}

export function MarketingMetrics({ data, currency }: Props) {
    const [adSpend, setAdSpend] = useState<number>(data.adSpend);
    const [cac, setCac] = useState<number>(data.cac);

    // Simple simulation logic
    const simulatedRevenue = (adSpend / cac) * 85; // Mock AOV of 85
    const simulatedROAS = simulatedRevenue / adSpend;
    const profit = simulatedRevenue - adSpend - (simulatedRevenue * 0.4); // 40% COGS

    const handleAdSpendChange = (value: number | [number, number]) => {
        setAdSpend(typeof value === 'number' ? value : value[0]);
    };

    const handleCacChange = (value: number | [number, number]) => {
        setCac(typeof value === 'number' ? value : value[0]);
    };

    return (
        <BlockStack gap="600">
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderRadius: '16px', padding: '24px', color: 'white' }}>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingLg" tone="inherit">Marketing Simulator</Text>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div>
                            <Tooltip content="Estimated Return on Ad Spend based on simulated budget and CAC.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" tone="inherit" variant="bodyMd">Projected ROAS</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="h3" tone="inherit" variant="heading2xl">{simulatedROAS.toFixed(2)}x</Text>
                        </div>
                        <div>
                            <Tooltip content="Net profit after Ad Spend and estimated 40% COGS.">
                                <InlineStack gap="100" blockAlign="center">
                                    <Text as="p" tone="inherit" variant="bodyMd">Projected Profit</Text>
                                    <Icon source={InfoIcon} tone="inherit" />
                                </InlineStack>
                            </Tooltip>
                            <Text as="h3" tone="inherit" variant="heading2xl">{formatCurrency(profit, currency || 'USD')}</Text>
                        </div>
                    </div>
                </BlockStack>
            </div>

            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <BlockStack gap="400">
                    <Text as="h3" variant="headingMd">Simulation Inputs</Text>
                    <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <BlockStack gap="200">
                                <Text as="p" variant="bodyMd">Monthly Ad Spend Budget ({currency === 'INR' ? '₹' : '$'})</Text>
                                <RangeSlider
                                    label="Ad Spend Range"
                                    labelHidden
                                    output
                                    min={500}
                                    max={50000}
                                    step={100}
                                    value={adSpend}
                                    onChange={handleAdSpendChange}
                                />
                                <TextField
                                    label="Ad Spend Amount"
                                    type="number"
                                    value={adSpend.toString()}
                                    onChange={(val) => setAdSpend(Number(val))}
                                    autoComplete="off"
                                    prefix={currency === 'INR' ? '₹' : '$'}
                                />
                            </BlockStack>
                        </Grid.Cell>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                            <BlockStack gap="200">
                                <Text as="p" variant="bodyMd">Estimated CAC ({currency === 'INR' ? '₹' : '$'})</Text>
                                <RangeSlider
                                    label="CAC Range"
                                    labelHidden
                                    output
                                    min={10}
                                    max={2000}
                                    step={10}
                                    value={cac}
                                    onChange={handleCacChange}
                                />
                                <TextField
                                    label="Customer Acquisition Cost"
                                    type="number"
                                    value={cac.toString()}
                                    onChange={(val) => setCac(Number(val))}
                                    autoComplete="off"
                                    prefix={currency === 'INR' ? '₹' : '$'}
                                />
                            </BlockStack>
                        </Grid.Cell>
                    </Grid>
                </BlockStack>
            </div>
        </BlockStack>
    );
}

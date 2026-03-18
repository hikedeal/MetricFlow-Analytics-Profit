
import React, { useState, useMemo } from 'react';
import { Card, Text, BlockStack, InlineStack, Badge, Button, ButtonGroup, Box, Tooltip, Icon } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { formatCurrency, getCurrencySymbol } from '../../../utils/currency';

interface PerformanceIntelligenceProps {
    data: any[];
    comparison?: any[];
    forecast?: any[];
    summary?: any;
    currency: string;
    isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb',
                backdropFilter: 'blur(10px)',
                minWidth: '220px'
            }}>
                <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" fontWeight="bold" tone="subdued">{label}</Text>
                    {payload.map((entry: any, index: number) => (
                        <InlineStack key={index} align="space-between" blockAlign="center">
                            <InlineStack gap="100" blockAlign="center">
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: entry.color }} />
                                <Text as="span" variant="bodySm">{entry.payload.isForecast ? `[PRED] ${entry.name}` : entry.name}:</Text>
                            </InlineStack>
                            <Text as="span" variant="bodySm" fontWeight="bold">
                                {entry.name.includes('ROAS') || entry.name.includes('Rate')
                                    ? entry.value.toFixed(2) + 'x'
                                    : entry.name.includes('Customers')
                                        ? entry.value
                                        : formatCurrency(entry.value, currency)}
                            </Text>
                        </InlineStack>
                    ))}
                </BlockStack>
            </div>
        );
    }
    return null;
};

export const PerformanceIntelligence: React.FC<PerformanceIntelligenceProps> = ({
    data,
    forecast,
    summary,
    currency
}) => {
    const [view, setView] = useState<'profitability' | 'efficiency' | 'acquisition'>('profitability');

    const processedData = useMemo(() => {
        const historical = (data || []).map(point => ({
            ...point,
            roas: point.sales / (point.spend || 1),
            newCust: Math.floor(point.orders * 0.7),
            retCust: Math.floor(point.orders * 0.3),
        }));

        if (forecast && forecast.length > 0) {
            const predictive = forecast.map(f => ({
                date: f.date,
                sales: f.revenue,
                profit: f.revenue * 0.3,
                spend: 0,
                otherCosts: 0,
                cogs: 0,
                isForecast: true
            }));
            return [...historical, ...predictive];
        }

        return historical;
    }, [data, forecast]);

    const healthScore = useMemo(() => {
        if (!summary) return 0;
        const profitMargin = summary.totalSales > 0 ? (summary.totalProfit / summary.totalSales) * 100 : 0;
        const mer = summary.totalSpend > 0 ? summary.totalSales / summary.totalSpend : 0;
        const marginScore = Math.min(100, (profitMargin / 30) * 100);
        const merScore = Math.min(100, (mer / 5) * 100);
        return Math.round((marginScore * 0.6) + (merScore * 0.4));
    }, [summary]);

    const calculateDelta = (curr: number, prev: number) => {
        if (!prev) return null;
        const delta = ((curr - prev) / prev) * 100;
        return {
            value: `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`,
            isPositive: delta > 0
        };
    };

    const kpis = useMemo(() => {
        if (!summary) return [];
        const cmP = summary.totalSales > 0 ? (summary.totalProfit / summary.totalSales) * 100 : 0;
        const prevCmP = summary.prevTotalSales > 0 ? (summary.prevTotalProfit / summary.prevTotalSales) * 100 : 0;
        const mer = summary.totalSpend > 0 ? summary.totalSales / summary.totalSpend : 0;
        const prevMer = summary.prevTotalSpend > 0 ? summary.prevTotalSales / summary.prevTotalSpend : 0;

        return [
            { label: 'Total Net Sales', value: formatCurrency(summary.totalSales, currency), delta: calculateDelta(summary.totalSales, summary.prevTotalSales), color: '#6366f1', tooltip: 'Net revenue after discounts and returns.' },
            { label: 'Contribution Margin %', value: `${cmP.toFixed(1)}%`, delta: calculateDelta(cmP, prevCmP), color: '#10b981', tooltip: 'Profitability after COGS and direct marketing costs.' },
            { label: 'Total Ad Spend', value: formatCurrency(summary.totalSpend, currency), delta: calculateDelta(summary.totalSpend, summary.prevTotalSpend), color: '#f43f5e', tooltip: 'Total marketing investment across integrated platforms.' },
            { label: 'MER (Blended ROAS)', value: `${mer.toFixed(2)}x`, delta: calculateDelta(mer, prevMer), color: '#f59e0b', tooltip: 'Marketing Efficiency Ratio - Total Sales divided by Total Ad Spend.' }
        ];
    }, [summary, currency]);

    const renderChart = () => {
        if (view === 'profitability') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(str) => {
                                if (!str) return '';
                                return str.length > 10 ? str.split(' ')[1] : format(new Date(str), 'MMM dd');
                            }}
                        />
                        <YAxis
                            stroke="#94a3b8"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => formatCurrency(val || 0, currency).replace(getCurrencySymbol(currency), '')}
                        />
                        <RechartsTooltip content={<CustomTooltip currency={currency} />} />
                        <Legend iconType="circle" />
                        <Area name="Ad Spend" stackId="1" type="monotone" dataKey="spend" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.6} />
                        <Area name="Other Costs" stackId="1" type="monotone" dataKey="otherCosts" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.4} />
                        <Area name="COGS" stackId="1" type="monotone" dataKey="cogs" stroke="#000" fill="#000" fillOpacity={0.2} />
                        <Area name="Contribution Margin" stackId="1" type="monotone" dataKey="profit" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Line
                            name="Sales (Historical)"
                            type="monotone"
                            dataKey={(p) => p.isForecast ? null : p.sales}
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#6366f1' }}
                        />
                        <Line
                            name="Sales (Predicted)"
                            type="monotone"
                            dataKey={(p) => p.isForecast || (processedData.length > 0 && p === processedData[Math.max(0, processedData.findIndex(item => item.isForecast) - 1)]) ? p.sales : null}
                            stroke="#6366f1"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            );
        }

        if (view === 'efficiency') {
            return (
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={processedData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}x`} />
                        <RechartsTooltip content={<CustomTooltip currency={currency} />} />
                        <Area name="Marketing ROAS" type="monotone" dataKey="roas" stroke="#f59e0b" strokeWidth={3} fill="#f59e0b" fillOpacity={0.1} />
                        <Line type="monotone" dataKey="roas" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        <Line name="Break-even MER" type="monotone" dataKey={() => 3} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                    <Legend iconType="circle" />
                    <Bar name="New Customers" dataKey="newCust" stackId="a" fill="#3b82f6" />
                    <Bar name="Returning Customers" dataKey="retCust" stackId="a" fill="#8b5cf6" />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <Card>
            <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                        <InlineStack gap="300" blockAlign="center">
                            <Text as="h2" variant="headingLg">Performance Marketing Intelligence</Text>
                            <div style={{
                                background: healthScore > 70 ? '#10b98120' : healthScore > 40 ? '#f59e0b20' : '#ef444420',
                                color: healthScore > 70 ? '#10b981' : healthScore > 40 ? '#f59e0b' : '#ef4444',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                border: '1px solid currentColor'
                            }}>
                                Health Score: {healthScore}/100
                            </div>
                        </InlineStack>
                        <Text as="p" variant="bodyMd" tone="subdued">Comparative analysis & predictive forecasting (Enterprise Suite).</Text>
                    </BlockStack>
                    <ButtonGroup variant="segmented">
                        <Button pressed={view === 'profitability'} onClick={() => setView('profitability')}>Profitability</Button>
                        <Button pressed={view === 'efficiency'} onClick={() => setView('efficiency')}>Efficiency</Button>
                        <Button pressed={view === 'acquisition'} onClick={() => setView('acquisition')}>Acquisition</Button>
                    </ButtonGroup>
                </InlineStack>

                <Box paddingBlockStart="400">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                        {kpis.map((kpi, i) => (
                            <Box key={i} padding="400" background="bg-surface-secondary" borderRadius="300" borderStyle="solid" borderWidth="025" borderColor="border">
                                <BlockStack gap="100">
                                    <Tooltip content={kpi.tooltip}>
                                        <InlineStack gap="100" blockAlign="center">
                                            <Text as="p" variant="bodySm" tone="subdued" fontWeight="bold">{kpi.label}</Text>
                                            <Icon source={InfoIcon} tone="subdued" />
                                        </InlineStack>
                                    </Tooltip>
                                    <InlineStack align="space-between" blockAlign="center">
                                        <div style={{ color: kpi.color }}>
                                            <Text as="h3" variant="headingMd">{kpi.value}</Text>
                                        </div>
                                        {kpi.delta && (
                                            <Badge tone={kpi.delta.isPositive ? 'success' : 'attention'} progress="complete">
                                                {`${kpi.delta.value} vs Prev`}
                                            </Badge>
                                        )}
                                    </InlineStack>
                                </BlockStack>
                            </Box>
                        ))}
                    </div>
                    {renderChart()}
                </Box>

                <InlineStack gap="400">
                    <Badge tone={healthScore > 70 ? 'success' : 'attention'} progress="complete">
                        {healthScore > 70 ? 'Strategic Health: Excellent' : 'Action Required: Review Strategy'}
                    </Badge>
                    <Badge tone="info" progress="partiallyComplete">
                        Fortune Prediction: Enabled (7-Day Outlook)
                    </Badge>
                    {processedData.some(p => p.isForecast) && (
                        <Badge tone="warning">Predictive Mode Active</Badge>
                    )}
                </InlineStack>
            </BlockStack>
        </Card>
    );
};

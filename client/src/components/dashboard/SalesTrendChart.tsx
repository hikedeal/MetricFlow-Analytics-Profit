import { Text, Badge, InlineStack, BlockStack } from '@shopify/polaris';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { TrendPoint } from '../../hooks/useDashboardData';
import { convertCurrency, formatCurrency, getCurrencySymbol } from '../../utils/currency';

interface Props {
    data?: TrendPoint[];
    isLoading: boolean;
    selectedMetric?: string;
    currency?: string;
    baseCurrency?: string;
    exchangeRates?: Record<string, number> | null;
}

const METRIC_CONFIG: Record<string, { dataKey: string; label: string; color: string; gradient: string[] }> = {
    sales: { dataKey: 'sales', label: 'Net Sales', color: '#667eea', gradient: ['#667eea', '#764ba2'] },
    grossSales: { dataKey: 'sales', label: 'Gross Sales', color: '#667eea', gradient: ['#667eea', '#764ba2'] },
    netSales: { dataKey: 'sales', label: 'Net Sales', color: '#667eea', gradient: ['#667eea', '#764ba2'] },
    totalOrders: { dataKey: 'orders', label: 'Total Orders', color: '#10b981', gradient: ['#10b981', '#059669'] },
    aov: { dataKey: 'sales', label: 'AOV', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
    cancellationRate: { dataKey: 'cancelled', label: 'Cancelled Orders', color: '#ef4444', gradient: ['#ef4444', '#dc2626'] },
    rtoRate: { dataKey: 'cancelled', label: 'RTO Orders', color: '#dc2626', gradient: ['#dc2626', '#b91c1c'] },
    returnRate: { dataKey: 'refunds', label: 'Returns', color: '#f97316', gradient: ['#f97316', '#ea580c'] },
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, isMonetary, currency }: any) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        const metricLabel = payload[0].name;

        return (
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
                border: 'none',
                minWidth: '200px'
            }}>
                <BlockStack gap="200">
                    <Text as="p" variant="bodyMd" tone="text-inverse" fontWeight="semibold">
                        {label}
                    </Text>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <Text as="p" variant="headingLg" tone="text-inverse">
                            {isMonetary ? formatCurrency(value, currency || 'USD') : value.toLocaleString()}
                        </Text>
                        <Text as="p" variant="bodySm" tone="text-inverse">
                            {metricLabel}
                        </Text>
                    </div>
                </BlockStack>
            </div>
        );
    }
    return null;
};

// Custom Dot Component for hover effect
const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;

    if (payload.highlight) {
        return (
            <circle
                cx={cx}
                cy={cy}
                r={6}
                fill="#667eea"
                stroke="#fff"
                strokeWidth={3}
                style={{ filter: 'drop-shadow(0 4px 6px rgba(102, 126, 234, 0.4))' }}
            />
        );
    }
    return null;
};

export function SalesTrendChart({ data, isLoading, selectedMetric = 'sales', currency = 'USD', baseCurrency = 'USD', exchangeRates }: Props) {
    if (isLoading || !data) {
        return (
            <div style={{
                height: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderRadius: '16px'
            }}>
                <BlockStack gap="300" align="center">
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid #667eea',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <Text as="p" variant="bodyLg" tone="subdued">Loading chart data...</Text>
                </BlockStack>
            </div>
        );
    }

    const config = METRIC_CONFIG[selectedMetric] || METRIC_CONFIG.sales;
    const isMonetary = ['sales', 'grossSales', 'netSales', 'aov', 'refunds', 'discounts'].includes(selectedMetric) || selectedMetric === 'sales';

    // Convert data for chart
    const chartData = (data || []).filter(Boolean).map(point => ({
        ...point,
        sales: convertCurrency(point.sales || 0, baseCurrency, currency, exchangeRates || undefined),
        refunds: convertCurrency(point.refunds || 0, baseCurrency, currency, exchangeRates || undefined),
    }));

    // Calculate stats for header
    const totalValue = chartData.reduce((sum, point) => sum + (point[config.dataKey as keyof typeof point] as number || 0), 0);
    const avgValue = totalValue / chartData.length;
    const maxValue = Math.max(...chartData.map(point => point[config.dataKey as keyof typeof point] as number || 0));

    return (
        <div>
            {/* Enhanced Header with Stats */}
            <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '20px 24px',
                borderRadius: '16px 16px 0 0',
                marginBottom: '0'
            }}>
                <InlineStack align="space-between" blockAlign="center" wrap={false}>
                    <BlockStack gap="200">
                        <Text as="h3" variant="headingMd" tone="text-inverse">
                            {config.label} Trend
                        </Text>
                        <InlineStack gap="400">
                            <div>
                                <Text as="p" variant="bodySm" tone="text-inverse">Average</Text>
                                <Text as="p" variant="headingSm" tone="text-inverse" fontWeight="semibold">
                                    {isMonetary ? formatCurrency(avgValue, currency) : Math.round(avgValue).toLocaleString()}
                                </Text>
                            </div>
                            <div>
                                <Text as="p" variant="bodySm" tone="text-inverse">Peak</Text>
                                <Text as="p" variant="headingSm" tone="text-inverse" fontWeight="semibold">
                                    {isMonetary ? formatCurrency(maxValue, currency) : maxValue.toLocaleString()}
                                </Text>
                            </div>
                        </InlineStack>
                    </BlockStack>
                    <Badge tone="info">Click metric cards to switch view</Badge>
                </InlineStack>
            </div>

            {/* Enhanced Chart */}
            <div style={{
                width: '100%',
                height: 420,
                padding: '24px',
                background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
                borderRadius: '0 0 16px 16px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
                <ResponsiveContainer>
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id={`colorGradient${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={config.gradient[0]} stopOpacity={0.8} />
                                <stop offset="50%" stopColor={config.gradient[1]} stopOpacity={0.4} />
                                <stop offset="100%" stopColor={config.gradient[1]} stopOpacity={0.1} />
                            </linearGradient>
                            <filter id="shadow">
                                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.2" />
                            </filter>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#e5e7eb"
                            strokeOpacity={0.5}
                        />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(str) => {
                                // If it's an hourly string like "2026-02-13 09:00"
                                if (str.includes(' ') && str.includes(':')) {
                                    const parts = str.split(' ');
                                    return parts[1]; // Returns "09:00"
                                }
                                const date = new Date(str);
                                return format(date, 'MMM dd');
                            }}
                            stroke="#9ca3af"
                            style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                fill: '#6b7280'
                            }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                fill: '#6b7280'
                            }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
                            tickFormatter={(value: number) => {
                                if (isMonetary) {
                                    return formatCurrency(value, currency || 'USD').replace(getCurrencySymbol(currency || 'USD'), '');
                                }
                                return value.toLocaleString();
                            }}
                        />
                        <Tooltip
                            content={<CustomTooltip isMonetary={isMonetary} currency={currency} />}
                            cursor={{
                                stroke: config.color,
                                strokeWidth: 2,
                                strokeDasharray: '5 5',
                                strokeOpacity: 0.5
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey={config.dataKey}
                            stroke={config.color}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill={`url(#colorGradient${selectedMetric})`}
                            name={config.label}
                            dot={<CustomDot />}
                            activeDot={{
                                r: 8,
                                fill: config.color,
                                stroke: '#fff',
                                strokeWidth: 3,
                                filter: 'url(#shadow)'
                            }}
                            animationDuration={800}
                            animationEasing="ease-in-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

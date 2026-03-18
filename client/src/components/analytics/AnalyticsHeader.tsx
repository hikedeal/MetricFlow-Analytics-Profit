import { BlockStack, InlineStack, Text, Icon, Badge } from '@shopify/polaris';
import { ArrowUpIcon, ArrowDownIcon, CashDollarIcon, CartIcon, PersonIcon, ChartVerticalIcon } from '@shopify/polaris-icons';
import { formatCurrency } from '../../utils/currency';

interface KPIProps {
    label: string;
    value: string;
    change?: number;
    icon: any;
    trend?: 'positive' | 'negative' | 'neutral';
}

function KPICard({ label, value, change, icon, trend, volatility, forecasting }: KPIProps & { volatility?: number, forecasting?: string }) {
    const isPositive = trend === 'positive';
    const isNegative = trend === 'negative';

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #e1e3e5',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            flex: 1,
            minWidth: '240px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Sparkline Decorator (Placeholder style using gradient) */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40px',
                background: `linear-gradient(to top, ${isPositive ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)'}, transparent)`,
                borderBottom: `2px solid ${isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6d7175'}`,
                opacity: 0.3
            }} />

            <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="center">
                    <div style={{
                        background: '#f4f6f8',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Icon source={icon} tone="base" />
                    </div>
                    <InlineStack gap="200" blockAlign="center">
                        {volatility !== undefined && (
                            <Badge tone={volatility > 20 ? 'critical' : 'info'}>
                                {`${volatility}% Vol`}
                            </Badge>
                        )}
                        {change !== undefined && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: isPositive ? '#10b981' : isNegative ? '#ef4444' : '#6d7175'
                            }}>
                                <Icon source={isPositive ? ArrowUpIcon : ArrowDownIcon} tone={isPositive ? 'success' : isNegative ? 'critical' : 'base'} />
                                <Text as="span" variant="bodySm" fontWeight="bold">
                                    {Math.abs(change)}%
                                </Text>
                            </div>
                        )}
                    </InlineStack>
                </InlineStack>

                <BlockStack gap="100">
                    <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                        {label}
                    </Text>
                    <Text as="h2" variant="headingLg" fontWeight="bold">
                        {value}
                    </Text>
                    {forecasting && (
                        <Text as="p" variant="bodyXs" tone="magic">
                            EOM Forecast: <span style={{ fontWeight: 'bold' }}>{forecasting}</span>
                        </Text>
                    )}
                </BlockStack>
            </BlockStack>
        </div>
    );
}

interface Props {
    data: {
        totalRevenue: number;
        totalOrders: number;
        totalCustomers: number;
        conversionRate: number;
        revenueChange?: number;
        orderChange?: number;
        customerChange?: number;
        conversionChange?: number;
        forecasting?: {
            predictedRevenue: number;
            predictedOrders: number;
        }
    };
    currency: string;
}

export function AnalyticsHeader({ data, currency }: Props) {
    return (
        <InlineStack gap="400" wrap={true}>
            <KPICard
                label="Total Revenue"
                value={formatCurrency(data.totalRevenue, currency)}
                change={data.revenueChange}
                icon={CashDollarIcon}
                trend={data.revenueChange && data.revenueChange > 0 ? 'positive' : 'negative'}
                volatility={12}
                forecasting={data.forecasting ? formatCurrency(data.forecasting.predictedRevenue, currency) : undefined}
            />
            <KPICard
                label="Total Orders"
                value={data.totalOrders.toLocaleString()}
                change={data.orderChange}
                icon={CartIcon}
                trend={data.orderChange && data.orderChange > 0 ? 'positive' : 'negative'}
                volatility={8}
                forecasting={data.forecasting ? data.forecasting.predictedOrders.toLocaleString() : undefined}
            />
            <KPICard
                label="Total Customers"
                value={data.totalCustomers.toLocaleString()}
                change={data.customerChange}
                icon={PersonIcon}
                trend={data.customerChange && data.customerChange > 0 ? 'positive' : 'negative'}
            />
            <KPICard
                label="Conversion Rate"
                value={`${data.conversionRate}%`}
                change={data.conversionChange}
                icon={ChartVerticalIcon}
                trend={data.conversionChange && data.conversionChange > 0 ? 'positive' : 'negative'}
                volatility={24}
            />
        </InlineStack>
    );
}

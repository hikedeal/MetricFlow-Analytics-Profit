import { BlockStack, InlineGrid, Text, Icon, Tooltip, InlineStack } from '@shopify/polaris';
import { ArrowUpIcon, ArrowDownIcon, InfoIcon } from '@shopify/polaris-icons';
import { convertCurrency, formatCurrency } from '../../utils/currency';

interface SalesIntelligenceData {
    grossSales: number;
    netSales: number;
    netRevenue: number;
    totalOrders: number;
    cancelledOrders: number;
    rtoOrders: number;
    cancellationRate: number;
    rtoRate?: number;
    returnRate?: number;
    newCustomerRate?: number;
    newCustomers?: number;
    repeatCustomers?: number;
    returnOrders?: number;
    refundAmount: number;
    totalDiscounts: number;
    averageOrderValue: number;
    ordersEditedCount: number;
    repeatCustomerRate: number;
    comparison?: {
        grossSales: number;
        netSales: number;
        totalOrders: number;
        averageOrderValue: number;
        cancellationRate: number;
        rtoRate: number;
        returnRate: number;
        newCustomerRate: number;
        repeatCustomerRate: number;
    };
}

interface ProfitMetrics {
    profit: number;
    profitMargin: number;
    storeLevelProfit?: number | null;
    storeLevelMargin?: number | null;
    profitReadiness?: number | null;
    profitReadinessMargin?: number | null;
    enableStoreLevelProfit?: boolean;
    enableProfitTracking?: boolean;
}

interface Props {
    data?: SalesIntelligenceData;
    profitData?: ProfitMetrics;
    isLoading: boolean;
    currency?: string;
    baseCurrency?: string;
    showProfit?: boolean;
    exchangeRates?: Record<string, number> | null;
    onMetricClick?: (metric: string) => void;
}

export function SalesMetricsCards({ data, profitData, isLoading, currency = 'USD', baseCurrency = 'USD', showProfit = true, onMetricClick, exchangeRates }: Props) {
    if (isLoading || !data) {
        return <Text as="p" variant="bodyMd">Loading metrics...</Text>;
    }

    const c = data.comparison;

    const convert = (val: number) => convertCurrency(val, baseCurrency, currency, exchangeRates || undefined);

    // Convert currency values
    const grossSales = convert(data.grossSales);
    const totalSales = convert(data.netRevenue);
    const aov = convert(data.averageOrderValue);

    // Get both profit values if available
    const storeLevelProfit = (profitData?.storeLevelProfit !== undefined && profitData?.storeLevelProfit !== null)
        ? convert(profitData.storeLevelProfit) : null;
    const profitReadiness = (profitData?.profitReadiness !== undefined && profitData?.profitReadiness !== null)
        ? convert(profitData.profitReadiness) : null;

    // Legacy profit field for backward compatibility
    const profit = profitData ? convert(profitData.profit) : 0;

    return (
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }} gap="400">
            <MetricCard
                label="Gross Sales"
                value={formatCurrency(grossSales, currency)}
                comparison={c?.grossSales}
                onClick={() => onMetricClick?.('grossSales')}
                tooltip="Total sales revenue before any deductions (discounts, returns, etc)."
            />
            <MetricCard
                label="Total Sales"
                value={formatCurrency(totalSales, currency)}
                comparison={c?.netSales}
                onClick={() => onMetricClick?.('netSales')}
                tooltip="Net sales after deducting discounts and returns. The actual revenue realized."
            />
            <MetricCard
                label="Total Orders"
                value={data.totalOrders.toString()}
                comparison={c?.totalOrders}
                onClick={() => onMetricClick?.('totalOrders')}
                tooltip="Total count of orders placed in the selected period."
            />
            <MetricCard
                label="AOV"
                value={formatCurrency(aov, currency)}
                comparison={c?.averageOrderValue}
                onClick={() => onMetricClick?.('aov')}
                tooltip="Average Order Value: Total Sales divided by number of orders."
            />

            {/* Percentage Rates */}
            <MetricCard
                label="Cancellation Rate"
                value={`${data.cancellationRate}%`}
                status={data.cancellationRate > 10 ? 'critical' : 'success'}
                comparison={c?.cancellationRate}
                inverseTrend
                onClick={() => onMetricClick?.('cancellationRate')}
                tooltip="Percentage of orders cancelled before fulfillment."
            />
            <MetricCard
                label="RTO Rate"
                value={`${data.rtoRate || 0}%`}
                status={(data.rtoRate || 0) > 5 ? 'critical' : 'success'}
                comparison={c?.rtoRate}
                inverseTrend
                onClick={() => onMetricClick?.('rtoRate')}
                tooltip="Return to Origin Rate: Percentage of orders returned to the warehouse as undeliverable."
            />
            <MetricCard
                label="Return Rate"
                value={`${data.returnRate || 0}%`}
                status={(data.returnRate || 0) > 5 ? 'warning' : 'success'}
                comparison={c?.returnRate}
                inverseTrend
                onClick={() => onMetricClick?.('returnRate')}
                tooltip="Percentage of delivered orders that were returned by customers."
            />

            {/* Raw Counts (New) */}
            <MetricCard
                label="Cancelled Count"
                value={(data.cancelledOrders || 0).toString()}
                status={(data.cancelledOrders || 0) > 0 ? 'critical' : 'success'}
                tooltip="Total number of cancelled orders."
            />
            <MetricCard
                label="RTO Count"
                value={(data.rtoOrders || 0).toString()}
                status={(data.rtoOrders || 0) > 0 ? 'critical' : 'success'}
                tooltip="Total number of RTO (Return to Origin) orders."
            />
            <MetricCard
                label="Return Count"
                value={(data.returnOrders || 0).toString()}
                status={(data.returnOrders || 0) > 0 ? 'warning' : 'success'}
                tooltip="Total number of customer-returned orders."
            />

            <MetricCard
                label="New Customer Rate"
                value={`${data.newCustomerRate || 0}%`}
                status="success"
                comparison={c?.newCustomerRate}
                tooltip="Percentage of total orders from first-time customers."
            />
            <MetricCard
                label="New Customers"
                value={(data.newCustomers || 0).toString()}
                status="success"
                tooltip="Count of unique customers who made their first purchase."
            />
            <MetricCard
                label="Repeat Customer Rate"
                value={`${data.repeatCustomerRate}%`}
                comparison={c?.repeatCustomerRate}
                tooltip="Percentage of customers who have purchased more than once."
            />
            <MetricCard
                label="Repeat Customers"
                value={(data.repeatCustomers || 0).toString()}
                status="success"
                tooltip="Count of unique customers who made a repeat purchase."
            />

            {/* Show Store Level Profit if enabled */}
            {storeLevelProfit !== null && (
                <MetricCard
                    label="Store Level Profit"
                    value={formatCurrency(storeLevelProfit, currency)}
                    status={storeLevelProfit > 0 ? 'success' : 'critical'}
                    onClick={() => onMetricClick?.('storeLevelProfit')}
                    tooltip="Total profit after deducting all costs (marketing, COGS, shipping, etc.)."
                />
            )}

            {/* Show Profit Readiness if enabled */}
            {profitReadiness !== null && (
                <MetricCard
                    label="Profit Readiness"
                    value={formatCurrency(profitReadiness, currency)}
                    status={profitReadiness > 0 ? 'success' : 'critical'}
                    onClick={() => onMetricClick?.('profitReadiness')}
                    tooltip="Estimated profit potential based on current margins and spend."
                />
            )}

            {/* Legacy profit card */}
            {showProfit && storeLevelProfit === null && profitReadiness === null && (
                <MetricCard
                    label="Profit"
                    value={formatCurrency(profit, currency)}
                    status={profit > 0 ? 'success' : 'critical'}
                    onClick={() => onMetricClick?.('profit')}
                    tooltip="Gross Profit: Total Sales minus Cost of Goods Sold (COGS)."
                />
            )}
        </InlineGrid>
    );
}

function MetricCard({
    label,
    value,
    status,
    comparison,
    inverseTrend,
    onClick,
    tooltip
}: {
    label: string;
    value: string;
    status?: 'success' | 'warning' | 'critical';
    comparison?: number;
    inverseTrend?: boolean;
    onClick?: () => void;
    tooltip?: string;
}) {
    let trendColor: 'success' | 'critical' | 'subdued' = 'subdued';

    if (comparison !== undefined && comparison !== null) {
        const rounded = Math.round(comparison * 10) / 10;
        const isPositive = rounded > 0;
        const isZero = rounded === 0;

        if (!isZero) {
            if (inverseTrend) {
                trendColor = isPositive ? 'critical' : 'success';
            } else {
                trendColor = isPositive ? 'success' : 'critical';
            }
        }
    }

    return (
        <div
            style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e1e3e5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
            }}
            onClick={onClick}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {/* Status indicator bar */}
            {status && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    background: status === 'success' ? '#10b981' : status === 'critical' ? '#ef4444' : '#f59e0b'
                }} />
            )}

            <BlockStack gap="200">
                <InlineStack gap="100" blockAlign="center" align="space-between">
                    <Text as="h3" variant="bodySm" tone="subdued" fontWeight="medium">
                        {label.toUpperCase()}
                    </Text>
                    {tooltip && (
                        <Tooltip content={tooltip}>
                            <Icon source={InfoIcon} tone="subdued" />
                        </Tooltip>
                    )}
                </InlineStack>
                <div style={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    <Text
                        as="p"
                        variant="heading2xl"
                        tone={status === 'success' || status === 'critical' ? status : undefined}
                        fontWeight="bold"
                    >
                        {value}
                    </Text>
                </div>
                {comparison !== undefined && comparison !== null && comparison !== 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginTop: '4px',
                        padding: '6px 10px',
                        background: trendColor === 'success' ? '#ecfdf5' : trendColor === 'critical' ? '#fef2f2' : '#f9fafb',
                        borderRadius: '6px',
                        border: `1px solid ${trendColor === 'success' ? '#a7f3d0' : trendColor === 'critical' ? '#fecaca' : '#e5e7eb'}`,
                        width: 'fit-content'
                    }}>
                        <div style={{ width: '16px', marginRight: '4px', display: 'flex', alignItems: 'center' }}>
                            {comparison > 0 ? <Icon source={ArrowUpIcon} tone={trendColor} /> : <Icon source={ArrowDownIcon} tone={trendColor} />}
                        </div>
                        <Text as="span" variant="bodyMd" tone={trendColor} fontWeight="semibold">
                            {Math.abs(comparison).toFixed(1)}%
                        </Text>
                        <Text as="span" variant="bodyXs" tone="subdued">
                            &nbsp;vs previous
                        </Text>
                    </div>
                )}
            </BlockStack>

            {/* Click indicator - now inside flow but at bottom */}
            {onClick && (
                <div style={{
                    marginTop: '12px',
                    textAlign: 'right',
                    fontSize: '10px',
                    color: '#9ca3af',
                    fontWeight: 500,
                    fontStyle: 'italic'
                }}>
                    Click to view
                </div>
            )}
        </div>
    );
}

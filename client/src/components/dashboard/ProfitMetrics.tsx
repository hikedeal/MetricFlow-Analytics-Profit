import { BlockStack, Text, InlineStack, Divider, Icon } from '@shopify/polaris';
import { ArrowDownIcon } from '@shopify/polaris-icons';
import { convertCurrency, formatCurrency } from '../../utils/currency';

interface Props {
    data?: {
        profit: number;
        profitMargin: number;
        totalSales: number;
        totalTaxes: number;
        totalProductCost: number;
        marketingCost: number;
        totalDeliveryCost: number;
        totalPackagingCost: number;
        shopifyBillingCost: number;
        miscellaneousCost: number;
        totalExpenses: number;
        cancellationLoss?: number; // Optional if not in main profit object
    }
    exchangeRates?: Record<string, number> | null;
    isLoading: boolean;
    currency?: string;
    baseCurrency?: string;
}

export function ProfitMetrics({ data, isLoading, currency = 'USD', baseCurrency = 'USD', exchangeRates }: Props) {
    if (isLoading || !data) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading profit data...</div>;
    }

    // Convert currency using real-time rates if available
    const convert = (val: number) => convertCurrency(val, baseCurrency, currency, exchangeRates || undefined);

    const profit = convert(data.profit);
    const totalSales = convert(data.totalSales);
    const totalExpenses = convert(data.totalExpenses);
    const shopifyFees = convert(data.shopifyBillingCost);
    const productCost = convert(data.totalProductCost);
    const marketingCost = convert(data.marketingCost);
    const cancellationLoss = convert(data.cancellationLoss || 0);

    return (
        <BlockStack gap="500">
            {/* Main Profit Card */}
            <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '16px',
                padding: '24px',
                color: 'white',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <BlockStack gap="100">
                    <Text as="p" variant="bodyMd" fontWeight="medium" tone="inherit">
                        Net Profit
                    </Text>
                    <Text as="h2" variant="heading2xl" fontWeight="bold" tone="inherit">
                        {formatCurrency(profit, currency)}
                    </Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                        <Text as="span" variant="bodySm" tone="inherit">
                            Revenue: {formatCurrency(totalSales, currency)}
                        </Text>
                    </div>
                </BlockStack>

                <div style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    textAlign: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <Text as="p" variant="bodyXs" tone="subdued">Margin</Text>
                    <Text as="p" variant="headingLg" tone={data.profitMargin > 20 ? 'success' : 'critical'}>
                        {data.profitMargin}%
                    </Text>
                </div>
            </div>

            <Divider />

            {/* Analysis Section */}
            <BlockStack gap="400">
                <Text as="h3" variant="headingSm" tone="subdued">
                    Expense Breakdown
                </Text>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <ExpenseItem label="Product Costs (COGS)" value={productCost} currency={currency} />
                    <ExpenseItem label="Marketing Spend" value={marketingCost} currency={currency} />
                    <ExpenseItem label="Shopify & Gateway Fees" value={shopifyFees} currency={currency} />
                    <ExpenseItem label="Total Expenses" value={totalExpenses} currency={currency} bold />
                </div>

                {cancellationLoss > 0 && (
                    <>
                        <Divider />
                        <div style={{
                            background: '#fef2f2',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid #fee2e2'
                        }}>
                            <InlineStack align="space-between" blockAlign="center">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        background: '#fee2e2',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Icon source={ArrowDownIcon} />
                                    </div>
                                    <BlockStack gap="050">
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">Cancellation Loss</Text>
                                        <Text as="p" variant="bodyXs" tone="subdued">Revenue lost from cancelled orders</Text>
                                    </BlockStack>
                                </div>
                                <Text as="p" variant="headingMd" tone="critical">
                                    {formatCurrency(cancellationLoss, currency)}
                                </Text>
                            </InlineStack>
                        </div>
                    </>
                )}
            </BlockStack>
        </BlockStack>
    );
}

function ExpenseItem({ label, value, currency, bold = false }: { label: string; value: number; currency: string; bold?: boolean }) {
    return (
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f1f2f4' }}>
            <Text as="p" variant="bodySm" tone="subdued">{label}</Text>
            <Text as="p" variant="bodyMd" fontWeight={bold ? 'bold' : 'medium'}>
                {formatCurrency(value, currency)}
            </Text>
        </div>
    );
}

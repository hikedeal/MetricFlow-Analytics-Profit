import { BlockStack, Text, InlineStack, Badge, Divider, Tooltip } from '@shopify/polaris';
import { convertCurrency, formatCurrency } from '../../utils/currency';

interface Props {
    data?: any[];
    isLoading: boolean;
    currency?: string;
    baseCurrency?: string;
    exchangeRates?: Record<string, number> | null;
}

export function TopProducts({ data, isLoading, currency = 'USD', baseCurrency = 'USD', exchangeRates }: Props) {
    if (isLoading || !data) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading product insights...</div>;
    }

    if (data.length === 0) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No product data available.</div>;
    }

    // Convert revenue logic
    const convert = (val: number) => convertCurrency(val, baseCurrency, currency, exchangeRates || undefined);

    // Sort by converted revenue desc just in case
    // Note: If converting, relative order stays same unless rates fluctuate wildly between items (impossible here).
    const processedData = (data || []).filter(Boolean).map(p => ({
        ...p,
        revenue: convert(p.revenue || 0)
    })).sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

    const maxRevenue = processedData[0]?.revenue || 1;

    return (
        <BlockStack gap="0">
            {processedData.map((product, index) => {
                const revenuePercent = (product.revenue / maxRevenue) * 100;

                return (
                    <div key={product.id || product.title}>
                        <div style={{
                            padding: '16px 0',
                            transition: 'background-color 0.2s',
                        }}>
                            <InlineStack align="space-between" blockAlign="center">
                                {/* Product Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                                    {/* Rank / Image Placeholder */}
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '8px',
                                        background: '#f3f4f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        color: '#9ca3af',
                                        flexShrink: 0
                                    }}>
                                        #{index + 1}
                                    </div>

                                    <BlockStack gap="050">
                                        <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <Tooltip content={product.title}>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                    {product.title}
                                                </Text>
                                            </Tooltip>
                                        </div>
                                        <InlineStack gap="200">
                                            <Badge tone="info">{`${product.unitsSold} sold`}</Badge>
                                            {product.cancellationRate > 5 && (
                                                <Badge tone="critical">{`${product.cancellationRate}% Cancel Rate`}</Badge>
                                            )}
                                        </InlineStack>
                                    </BlockStack>
                                </div>

                                {/* Revenue Stats */}
                                <div style={{ width: '140px', textAlign: 'right' }}>
                                    <Text as="p" variant="bodyMd" fontWeight="bold">
                                        {formatCurrency(product.revenue, currency || 'USD')}
                                    </Text>
                                    {/* Revenue Bar */}
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: '#f3f4f6',
                                        borderRadius: '3px',
                                        marginTop: '6px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        justifyContent: 'flex-end'
                                    }}>
                                        <div style={{
                                            width: `${revenuePercent}%`,
                                            height: '100%',
                                            background: '#6366f1',
                                            borderRadius: '3px'
                                        }} />
                                    </div>
                                </div>
                            </InlineStack>
                        </div>
                        {index < processedData.length - 1 && <Divider />}
                    </div>
                );
            })}
        </BlockStack>
    );
}

import { BlockStack, Text, InlineStack, Icon, Tooltip } from '@shopify/polaris';
import { ClockIcon, ArrowUpIcon, ArrowDownIcon, InfoIcon } from '@shopify/polaris-icons';
import { convertCurrency, formatCurrency } from '../../../utils/currency';

interface Props {
    data: { yesterdaySales: number; orderChange: number; profitChange: number };
    currency?: string;
    baseCurrency?: string;
    exchangeRates?: Record<string, number> | null;
}

export function DailySnapshot({ data, currency = 'USD', baseCurrency = 'USD', exchangeRates }: Props) {
    if (!data) return null;

    const convert = (val: number) => convertCurrency(val, baseCurrency, currency, exchangeRates || undefined);
    const yesterdaySales = convert(data.yesterdaySales);

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="400">
                <InlineStack gap="200" align="start" blockAlign="center">
                    <Icon source={ClockIcon} tone="base" />
                    <Tooltip content="Summary of your store's performance over the last 24 hours compared to previous averages.">
                        <InlineStack gap="100" blockAlign="center">
                            <Text as="h3" variant="headingMd">Daily Business Snapshot</Text>
                            <Icon source={InfoIcon} tone="subdued" />
                        </InlineStack>
                    </Tooltip>
                </InlineStack>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">Yesterday's Sales</Text>
                        <Text as="p" variant="headingLg">{formatCurrency(yesterdaySales, currency)}</Text>
                    </BlockStack>
                    <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">Orders vs Avg</Text>
                        <InlineStack gap="100" blockAlign="center">
                            <Icon source={data.orderChange > 0 ? ArrowUpIcon : ArrowDownIcon} tone={data.orderChange > 0 ? 'success' : 'critical'} />
                            <Text as="p" variant="bodyMd" tone={data.orderChange > 0 ? 'success' : 'critical'}>{Math.abs(data.orderChange)}%</Text>
                        </InlineStack>
                    </BlockStack>
                </div>
            </BlockStack>
        </div>
    );
}

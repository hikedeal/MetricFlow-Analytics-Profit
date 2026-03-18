import { BlockStack, Text, InlineStack, Tooltip, Icon } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import { formatCurrency } from '../../../utils/currency';

interface Props {
    data: { predicted: number; churnRate: number };
    currency?: string;
}

export function CustomerInsights({ data, currency }: Props) {
    if (!data) return null;
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="400">
                <Text as="h3" variant="headingMd">LTV Intelligence</Text>
                <InlineStack align="space-between">
                    <BlockStack gap="100">
                        <Tooltip content="Estimated Lifetime Value of your customers based on purchase history and frequency.">
                            <InlineStack gap="100" blockAlign="center">
                                <Text as="p" variant="bodyMd" tone="subdued">Predicted LTV</Text>
                                <Icon source={InfoIcon} tone="subdued" />
                            </InlineStack>
                        </Tooltip>
                        <Text as="p" variant="headingLg">{formatCurrency(data.predicted, currency || 'USD')}</Text>
                    </BlockStack>
                    <BlockStack gap="100">
                        <Tooltip content="Probability of customers becoming inactive within the next 30 days.">
                            <InlineStack gap="100" blockAlign="center">
                                <Text as="p" variant="bodyMd" tone="subdued">Churn Risk</Text>
                                <Icon source={InfoIcon} tone="subdued" />
                            </InlineStack>
                        </Tooltip>
                        <Text as="p" variant="headingLg" tone={data.churnRate > 10 ? 'critical' : 'success'}>{data.churnRate}%</Text>
                    </BlockStack>
                </InlineStack>
            </BlockStack>
        </div>
    );
}

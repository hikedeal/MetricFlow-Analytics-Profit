import { BlockStack, Text, InlineStack, ProgressBar, Badge, Tooltip, Icon } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import { formatCurrency } from '../../../utils/currency';
import { InventoryRisks } from '../../../hooks/useDashboardData';

interface Props {
    data: InventoryRisks;
    currency?: string;
}

export function InventoryRisk({ data, currency }: Props) {
    if (!data) return null;

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', height: '100%' }}>
            <BlockStack gap="400">
                <InlineStack align="space-between">
                    <Tooltip content="Inventory items currently out of stock, causing revenue leakage.">
                        <InlineStack gap="100" blockAlign="center">
                            <Text as="h3" variant="headingMd">Inventory Risk</Text>
                            <Icon source={InfoIcon} tone="subdued" />
                        </InlineStack>
                    </Tooltip>
                    <Badge tone="critical">{`${data.outOfStock} items OOS`}</Badge>
                </InlineStack>

                <BlockStack gap="400">
                    {data.lowStock.map((item, i) => (
                        <div key={i}>
                            <InlineStack align="space-between" blockAlign="center">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">{item.title}</Text>
                                <Text as="p" variant="bodySm" tone="critical">{item.stock} left</Text>
                            </InlineStack>
                            <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                                <ProgressBar progress={(item.stock / 20) * 100} tone="critical" size="small" />
                            </div>
                            <Text as="p" variant="bodyXs" tone="subdued">
                                Revenue Risk: {formatCurrency(item.revenueRisk, currency || 'USD')}
                            </Text>
                        </div>
                    ))}
                </BlockStack>
            </BlockStack>
        </div>
    );
}

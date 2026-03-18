import { BlockStack, Text, InlineStack, Divider, Tooltip, Icon } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';

export function PaymentInsights() {
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="400">
                <Tooltip content="Analysis of payment methods and their impact on cancellation rates and business risk.">
                    <InlineStack gap="100" blockAlign="center">
                        <Text as="h3" variant="headingMd">Payment Intelligence</Text>
                        <Icon source={InfoIcon} tone="subdued" />
                    </InlineStack>
                </Tooltip>
                <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">Prepaid Orders</Text>
                    <Text as="p" variant="bodyMd" fontWeight="bold">65%</Text>
                </InlineStack>
                <Divider />
                <InlineStack align="space-between">
                    <Text as="p" variant="bodyMd">COD Orders</Text>
                    <Text as="p" variant="bodyMd" fontWeight="bold">35%</Text>
                </InlineStack>
                <Text as="p" variant="bodyXs" tone="subdued">COD Cancellation Rate: 12.5% (High Risk)</Text>
            </BlockStack>
        </div>
    );
}

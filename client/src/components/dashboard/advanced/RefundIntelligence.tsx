import { BlockStack, Text } from '@shopify/polaris';

export function RefundIntelligence() {
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Refund Insights</Text>
                <Text as="p" variant="bodyMd">Top Reason: "Size Issue"</Text>
                <Text as="p" variant="bodyMd">Refund Rate: 2.1%</Text>
            </BlockStack>
        </div>
    );
}

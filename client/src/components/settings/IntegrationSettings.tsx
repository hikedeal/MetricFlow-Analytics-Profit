import { BlockStack, Card, Text, Button, InlineStack, Badge } from '@shopify/polaris';

export function IntegrationSettings() {
    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Ad Platforms</Text>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <InlineStack gap="400" blockAlign="center">
                            <div style={{ width: '40px', height: '40px', background: '#1877F2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>f</div>
                            <BlockStack gap="050">
                                <InlineStack gap="200" align="start">
                                    <Text as="p" variant="bodyMd" fontWeight="bold">Meta Ads</Text>
                                    <Badge tone="info">Coming Soon</Badge>
                                </InlineStack>
                                <Text as="p" variant="bodySm" tone="subdued">Connect to sync ad spend and ROAS</Text>
                            </BlockStack>
                        </InlineStack>
                        <Button disabled>Connect</Button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <InlineStack gap="400" blockAlign="center">
                            <div style={{ width: '40px', height: '40px', background: '#EA4335', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>G</div>
                            <BlockStack gap="050">
                                <InlineStack gap="200" align="start">
                                    <Text as="p" variant="bodyMd" fontWeight="bold">Google Ads</Text>
                                    <Badge tone="info">Coming Soon</Badge>
                                </InlineStack>
                                <Text as="p" variant="bodySm" tone="subdued">Sync Performance Max and Search campaigns</Text>
                            </BlockStack>
                        </InlineStack>
                        <Button disabled>Connect</Button>
                    </div>
                </BlockStack>
            </Card>

            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Analytics Tools</Text>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <InlineStack gap="400" blockAlign="center">
                            <BlockStack gap="050">
                                <Text as="p" variant="bodyMd" fontWeight="bold">Google Analytics 4</Text>
                                <Text as="p" variant="bodySm" tone="subdued">Enhanced eCommerce tracking</Text>
                            </BlockStack>
                        </InlineStack>
                        <Badge>Coming Soon</Badge>
                    </div>
                </BlockStack>
            </Card>
        </BlockStack>
    );
}

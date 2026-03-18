import { BlockStack, Text, Button, InlineStack, Icon, Tooltip } from '@shopify/polaris';
import { StarIcon, InfoIcon } from '@shopify/polaris-icons';

export function GrowthOpportunities({ data }: { data: any[] }) {
    if (!data) return null;
    return (
        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '24px', borderRadius: '16px', color: 'white' }}>
            <BlockStack gap="400">
                <InlineStack gap="200" blockAlign="center">
                    <Icon source={StarIcon} tone="inherit" />
                    <Tooltip content="AI-driven suggestions to improve your store's performance and conversion rate.">
                        <InlineStack gap="100" blockAlign="center">
                            <Text as="h3" variant="headingMd" tone="inherit">Growth Opportunities</Text>
                            <Icon source={InfoIcon} tone="inherit" />
                        </InlineStack>
                    </Tooltip>
                </InlineStack>
                {data.map((opp, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                        <InlineStack align="space-between">
                            <BlockStack gap="050">
                                <Text as="p" variant="bodyMd" fontWeight="bold" tone="inherit">{opp.title}</Text>
                                <Text as="p" variant="bodySm" tone="inherit">Potential: {opp.potential}</Text>
                            </BlockStack>
                            <Button variant="plain" size="slim">View</Button>
                        </InlineStack>
                    </div>
                ))}
            </BlockStack>
        </div>
    );
}

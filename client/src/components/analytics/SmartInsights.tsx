import { BlockStack, InlineStack, Text, Card, Icon, Badge, Button, Box } from '@shopify/polaris';
import { MagicIcon, ArrowRightIcon } from '@shopify/polaris-icons';
import { SmartInsight } from '../../hooks/useDashboardData';

interface Props {
    insights: SmartInsight[];
}

export function SmartInsights({ insights }: Props) {
    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                        <div style={{
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex'
                        }}>
                            <Icon source={MagicIcon} />
                        </div>
                        <Text as="h2" variant="headingLg">AI Smart Insights</Text>
                    </InlineStack>
                    <Badge tone="magic">Beta</Badge>
                </InlineStack>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    {insights?.map((insight) => (
                        <div key={insight.id} style={{
                            background: '#f9fafb',
                            borderRadius: '12px',
                            padding: '16px',
                            border: '1px solid #e1e3e5',
                            transition: 'transform 0.2s ease',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <BlockStack gap="300">
                                <InlineStack align="space-between">
                                    <Badge tone={insight.type === 'positive' ? 'success' : insight.type === 'negative' ? 'critical' : 'info'}>
                                        {insight.type.toUpperCase()}
                                    </Badge>
                                    <Text as="span" variant="bodySm" fontWeight="bold" tone={insight.type === 'positive' ? 'success' : insight.type === 'negative' ? 'critical' : 'subdued'}>
                                        {insight.impact}
                                    </Text>
                                </InlineStack>

                                <BlockStack gap="100">
                                    <Text as="h3" variant="headingMd" fontWeight="bold">{insight.title}</Text>
                                    <Text as="p" variant="bodyMd" tone="subdued">{insight.description}</Text>
                                </BlockStack>

                                {insight.action && (
                                    <Box paddingBlockStart="200">
                                        <Button variant="plain" icon={ArrowRightIcon} textAlign="left">
                                            {insight.action}
                                        </Button>
                                    </Box>
                                )}
                            </BlockStack>
                        </div>
                    ))}
                </div>
            </BlockStack>
        </Card>
    );
}

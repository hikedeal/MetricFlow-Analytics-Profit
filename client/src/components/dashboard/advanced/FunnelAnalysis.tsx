import { BlockStack, Text, Tooltip, Icon, InlineStack } from '@shopify/polaris';
import { InfoIcon } from '@shopify/polaris-icons';
import { FunnelMetrics } from '../../../hooks/useDashboardData';

interface Props {
    data: FunnelMetrics;
    isLoading?: boolean;
}

export function FunnelAnalysis({ data, isLoading }: Props) {
    if (isLoading || !data) return null;

    const stages = [
        { label: 'Site Visitors', count: data.visitors, color: '#6366f1', width: '100%' },
        { label: 'Added to Cart', count: data.addToCart, color: '#8b5cf6', width: '70%' },
        { label: 'Checkout Started', count: data.checkoutInitiated, color: '#ec4899', width: '40%' },
        { label: 'Orders Completed', count: data.ordersCompleted, color: '#10b981', width: '20%' }
    ];

    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="500">
                <Tooltip content="Visual representation of the customer journey from site visit to completed order.">
                    <InlineStack gap="100" blockAlign="center">
                        <Text as="h3" variant="headingMd">Conversion Funnel</Text>
                        <Icon source={InfoIcon} tone="subdued" />
                    </InlineStack>
                </Tooltip>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {stages.map((stage, i) => {
                        const dropOff = i > 0 ? ((1 - (stage.count / stages[i - 1].count)) * 100).toFixed(1) + '%' : '0%';

                        return (
                            <div key={i} style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
                                <div style={{
                                    width: stage.width,
                                    background: stage.color,
                                    margin: '0 auto',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    color: 'white',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    clipPath: 'polygon(2% 0, 98% 0, 95% 100%, 5% 100%)', // Funnel shape effect
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                }}>
                                    <Text as="span" variant="bodyMd" fontWeight="bold" tone="inherit">{stage.label}</Text>
                                    <Text as="span" variant="headingMd" tone="inherit">{stage.count.toLocaleString()}</Text>
                                </div>
                                {i > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        right: -80,
                                        top: '20%',
                                        background: '#fee2e2',
                                        color: '#ef4444',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '12px',
                                        fontWeight: 'bold'
                                    }}>
                                        ↓ {dropOff}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </BlockStack>
        </div>
    );
}

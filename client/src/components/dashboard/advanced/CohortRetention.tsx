import { BlockStack, Text } from '@shopify/polaris';
import { CohortMetrics } from '../../../hooks/useDashboardData';

export function CohortRetention({ data }: { data: CohortMetrics }) {
    if (!data) return null;
    return (
        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <BlockStack gap="400">
                <Text as="h3" variant="headingMd">Customer Retention</Text>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'end', height: '150px' }}>
                    {data?.retentionCurve?.map((m, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '100%', background: '#6366f1', height: `${m.rate}%`, borderRadius: '4px 4px 0 0', opacity: 1 - (i * 0.2) }}></div>
                            <Text as="p" variant="bodyXs">M{m.month}</Text>
                        </div>
                    ))}
                </div>
            </BlockStack>
        </div>
    );
}

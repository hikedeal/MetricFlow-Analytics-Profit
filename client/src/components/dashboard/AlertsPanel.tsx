import { Banner, BlockStack } from '@shopify/polaris';

interface Props {
    salesIntelligence?: any;
    orderTags?: any;
}

export function AlertsPanel({ salesIntelligence, orderTags }: Props) {
    if (!salesIntelligence || !orderTags) return null;

    const alerts = [];

    if (salesIntelligence.cancellationRate > 10) {
        alerts.push({
            status: 'critical',
            title: 'High Cancellation Rate Detected',
            message: `Cancellation rate is currently ${salesIntelligence.cancellationRate}%. This is above the recommended threshold.`,
        });
    }

    if (orderTags.rtoPercentage > 5) {
        alerts.push({
            status: 'warning',
            title: 'Increasing RTO Rate',
            message: `RTO (Return to Origin) rate is ${orderTags.rtoPercentage}%. Check your shipping partners or address validation.`,
        });
    }

    if (alerts.length === 0) return null;

    return (
        <BlockStack gap="300">
            {alerts.map((alert, idx) => (
                <Banner key={idx} tone={alert.status as any} title={alert.title}>
                    <p>{alert.message}</p>
                </Banner>
            ))}
        </BlockStack>
    );
}

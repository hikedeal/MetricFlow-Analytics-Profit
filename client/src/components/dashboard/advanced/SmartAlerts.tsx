import { useNavigate } from 'react-router-dom';
import { BlockStack, Text, InlineStack, Icon, Button } from '@shopify/polaris';
import { AlertCircleIcon, InfoIcon, CheckCircleIcon } from '@shopify/polaris-icons';
import { SmartAlert } from '../../../hooks/useDashboardData';

interface Props {
    alerts: SmartAlert[];
}

export function SmartAlerts({ alerts }: Props) {
    const navigate = useNavigate();

    if (!alerts || alerts.length === 0) return null;

    const handleAction = (alert: SmartAlert) => {
        if (alert.metric === 'cancellation') {
            navigate('/orders'); // Ideally filter by cancellation
        } else if (alert.metric === 'inventory') {
            navigate('/products');
        } else if (alert.metric === 'roas') {
            navigate('/analytics');
        } else if (alert.message.toLowerCase().includes('customer')) {
            navigate('/customers');
        } else {
            // Default fallback
            navigate('/analytics');
        }
    };

    return (
        <BlockStack gap="300">
            {alerts.map((alert) => (
                <div key={alert.id} style={{
                    padding: '16px',
                    borderRadius: '12px',
                    borderLeft: `4px solid ${alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#10b981'}`,
                    background: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                    <InlineStack align="space-between" blockAlign="center">
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{
                                color: alert.type === 'critical' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : '#10b981',
                                background: alert.type === 'critical' ? '#fee2e2' : alert.type === 'warning' ? '#fef3c7' : '#d1fae5',
                                padding: '8px',
                                borderRadius: '8px'
                            }}>
                                <Icon source={alert.type === 'critical' ? AlertCircleIcon : alert.type === 'warning' ? InfoIcon : CheckCircleIcon} tone="inherit" />
                            </div>
                            <BlockStack gap="050">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {alert.message}
                                </Text>
                                {alert.change && (
                                    <Text as="p" variant="bodyXs" tone={alert.change > 0 && alert.type !== 'critical' ? 'success' : 'critical'}>
                                        {alert.change > 0 ? '+' : ''}{alert.change}% change detected
                                    </Text>
                                )}
                            </BlockStack>
                        </div>
                        <Button variant="plain" size="slim" onClick={() => handleAction(alert)}>Action</Button>
                    </InlineStack>
                </div>
            ))}
        </BlockStack>
    );
}

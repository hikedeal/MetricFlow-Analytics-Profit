import { Button, Popover, Text, Box, BlockStack, InlineStack } from '@shopify/polaris';
import { NotificationIcon } from '@shopify/polaris-icons';
import { useState, useCallback } from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
    const [active, setActive] = useState(false);
    const queryClient = useQueryClient();
    const { data } = useDashboardData();

    // Get alerts from dashboard data
    const alerts = data?.alerts || [];

    const toggleActive = useCallback(() => setActive((active) => !active), []);

    // Mutation to mark all as read
    const markAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.post('/alerts/read');
        },
        onSuccess: () => {
            // Refetch dashboard data to clear the bell badge
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const handleMarkAllRead = () => {
        markAsReadMutation.mutate();
    };

    const activator = (
        <div style={{ position: 'relative' }}>
            <Button
                onClick={toggleActive}
                icon={NotificationIcon}
                variant="secondary"
                accessibilityLabel="Notifications"
            />
            {alerts.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#D82C0D',
                    color: 'white',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    {alerts.length}
                </div>
            )}
        </div>
    );

    return (
        <Popover
            active={active}
            activator={activator}
            onClose={toggleActive}
            ariaHaspopup={false}
            preferredAlignment="right"
        >
            <Box padding="400" minWidth="320px" maxWidth="400px">
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h3" variant="headingSm">Notifications</Text>
                        {alerts.length > 0 && (
                            <Button
                                variant="plain"
                                size="micro"
                                onClick={handleMarkAllRead}
                                loading={markAsReadMutation.isPending}
                            >
                                Mark all read
                            </Button>
                        )}
                    </InlineStack>

                    <BlockStack gap="300">
                        {alerts.length === 0 ? (
                            <div style={{ padding: '32px', textAlign: 'center' }}>
                                <Text as="p" variant="bodyMd" tone="subdued">No new notifications</Text>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: alert.severity === 'critical' ? '#FFF4F4' : '#FFFBF2',
                                    borderLeft: `3px solid ${alert.severity === 'critical' ? '#D82C0D' : '#FFC453'}`
                                }}>
                                    <BlockStack gap="100">
                                        <InlineStack align="space-between">
                                            <Text as="p" fontWeight="bold" variant="bodySm">{alert.title}</Text>
                                            <Text as="span" variant="bodyXs" tone="subdued">
                                                {formatDistanceToNow(new Date(alert.createdAt || Date.now()), { addSuffix: true })}
                                            </Text>
                                        </InlineStack>
                                        <Text as="p" variant="bodySm">{alert.message}</Text>
                                    </BlockStack>
                                </div>
                            ))
                        )}
                    </BlockStack>
                </BlockStack>
            </Box>
        </Popover>
    );
}

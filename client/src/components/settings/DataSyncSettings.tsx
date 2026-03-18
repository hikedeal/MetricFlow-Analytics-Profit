import { BlockStack, Card, Text, Button, InlineStack, Banner, Select, Spinner } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function DataSyncSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();
    const [syncFreq, setSyncFreq] = useState('manual');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!loading) {
            setSyncFreq(settings.syncFrequency || 'manual');
        }
    }, [settings, loading]);

    const handleSave = async () => {
        await saveSettings({
            syncFrequency: syncFreq,
            // Also update refreshFreq for consistency if they are mapped similarly in backend
            refreshFreq: syncFreq
        });
    };

    const handleSync = () => {
        setIsSyncing(true);
        // Simulate sync
        setTimeout(() => {
            setIsSyncing(false);
        }, 3000);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">Data Synchronization</Text>
                        <Text as="p" variant="bodySm" tone="subdued">Last synced: Just now</Text>
                    </InlineStack>

                    <Banner title="Sync Status: Healthy" tone="success">
                        <p>All orders and customers are up to date.</p>
                    </Banner>

                    <InlineStack align="start" gap="400" blockAlign="center">
                        <Button icon={RefreshIcon} onClick={handleSync} loading={isSyncing}>Sync Now</Button>
                        <div style={{ width: '300px' }}>
                            <Select
                                label="Automatic Sync Frequency"
                                labelInline
                                options={[
                                    { label: 'Real-time (Push)', value: 'realtime' },
                                    { label: 'Every 5 Minutes', value: '5min' },
                                    { label: 'Every 15 Minutes', value: '15min' },
                                    { label: 'Hourly', value: '1hour' },
                                    { label: 'Daily', value: 'daily' },
                                    { label: 'Manual Only', value: 'manual' },
                                ]}
                                value={syncFreq}
                                onChange={setSyncFreq}
                            />
                        </div>
                    </InlineStack>
                </BlockStack>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack>
    );
}

import { BlockStack, Card, Select, TextField, FormLayout, Text, InlineStack, Checkbox, Button, Spinner } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function GeneralSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();

    // Local state
    const [dashboardRange, setDashboardRange] = useState('last_30_days');
    const [currency, setCurrency] = useState('USD');
    const [refreshFreq, setRefreshFreq] = useState('manual');
    const [taxIncluded, setTaxIncluded] = useState(true);
    const [taxRate, setTaxRate] = useState('0');

    // Sync with backend data
    useEffect(() => {
        if (!loading) {
            setDashboardRange(settings.defaultDateRange || 'last_30_days');
            setCurrency((settings as any).currency || 'USD');
            setRefreshFreq(settings.syncFrequency || 'manual');
            setTaxIncluded(settings.taxIncluded);
            setTaxRate(settings.taxRate.toString());
        }
    }, [settings, loading]);

    const handleSave = async () => {
        await saveSettings({
            defaultDateRange: dashboardRange,
            taxIncluded,
            taxRate: parseFloat(taxRate) || 0,
            currency,
            syncFrequency: refreshFreq
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Dashboard Preferences</Text>
                    <FormLayout>
                        <Select
                            label="Default Date Range"
                            options={[
                                { label: 'Last 7 Days', value: 'last_7_days' },
                                { label: 'Last 30 Days', value: 'last_30_days' },
                                { label: 'This Month', value: 'this_month' },
                            ]}
                            value={dashboardRange}
                            onChange={setDashboardRange}
                        />
                        {/* Currency option removed as per request */}
                        <Select
                            label="Auto Refresh Frequency"
                            options={[
                                { label: 'Real-time (Push)', value: 'realtime' },
                                { label: 'Every 5 Minutes', value: '5min' },
                                { label: 'Every 15 Minutes', value: '15min' },
                                { label: 'Every Hour', value: '1hour' },
                                { label: 'Manual Only', value: 'manual' },
                            ]}
                            value={refreshFreq}
                            onChange={setRefreshFreq}
                        />
                    </FormLayout>
                </BlockStack>
            </Card>

            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Currency & Tax Configuration</Text>
                    <BlockStack gap="400">
                        <InlineStack align="space-between">
                            <Text as="p" variant="bodyMd">Prices Include Tax (GST/VAT)</Text>
                            <Checkbox label="Tax Included" labelHidden checked={taxIncluded} onChange={() => setTaxIncluded(!taxIncluded)} />
                        </InlineStack>
                        {!taxIncluded && (
                            <TextField
                                label="Default Tax Rate (%)"
                                type="number"
                                autoComplete="off"
                                placeholder="18"
                                value={taxRate}
                                onChange={setTaxRate}
                            />
                        )}
                    </BlockStack>
                </BlockStack>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack>
    );
}

import { BlockStack, Card, Text, InlineStack, Checkbox, TextField, Button, Spinner } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function NotificationSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();

    const [enableAlerts, setEnableAlerts] = useState(true);

    // Alert Types
    const [alertCancel, setAlertCancel] = useState(true);
    const [alertRefund, setAlertRefund] = useState(true);
    const [alertSales, setAlertSales] = useState(true);
    const [alertInventory, setAlertInventory] = useState(true);

    // Thresholds
    const [cancelThreshold, setCancelThreshold] = useState('10');
    const [refundThreshold, setRefundThreshold] = useState('5');

    // New Advanced Alerts
    const [alertRoas, setAlertRoas] = useState(false);
    const [alertMargin, setAlertMargin] = useState(false);
    const [roasThreshold, setRoasThreshold] = useState('2.5');
    const [marginThreshold, setMarginThreshold] = useState('15');

    useEffect(() => {
        if (!loading) {
            setEnableAlerts(settings.enableAlerts);
            setAlertCancel(settings.alertCancellationSpike);
            setAlertRefund(settings.alertRefundSpike);
            setAlertSales(settings.alertSalesDrop);
            setAlertInventory(settings.alertInventoryLow);
            setCancelThreshold(settings.cancellationThreshold.toString());
            setRefundThreshold(settings.refundThreshold.toString());

            // Initialize new alerts (fallback to false if undefined)
            setAlertRoas((settings as any).alertRoas || false);
            setAlertMargin((settings as any).alertMargin || false);
            setRoasThreshold(((settings as any).roasThreshold || 2.5).toString());
            setMarginThreshold(((settings as any).marginThreshold || 15).toString());
        }
    }, [settings, loading]);

    const handleSave = () => {
        saveSettings({
            enableAlerts,
            alertCancellationSpike: alertCancel,
            alertRefundSpike: alertRefund,
            alertSalesDrop: alertSales,
            alertInventoryLow: alertInventory,
            cancellationThreshold: parseFloat(cancelThreshold) || 10,
            refundThreshold: parseFloat(refundThreshold) || 5,

            // Save new alerts
            alertRoas,
            alertMargin,
            roasThreshold: parseFloat(roasThreshold) || 2.5,
            marginThreshold: parseFloat(marginThreshold) || 15
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">Smart Alerts</Text>
                        <Checkbox label="Enable" labelHidden checked={enableAlerts} onChange={() => setEnableAlerts(!enableAlerts)} />
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Receive instant notifications when critical metrics deviate from the norm.
                    </Text>

                    {enableAlerts && (
                        <BlockStack gap="400">
                            <BlockStack gap="200">
                                <Checkbox
                                    label="Spike in Cancellations"
                                    checked={alertCancel}
                                    onChange={() => setAlertCancel(!alertCancel)}
                                    helpText="Trigger when cancellation rate exceeds threshold"
                                />
                                {alertCancel && (
                                    <div style={{ marginLeft: '28px', maxWidth: '300px' }}>
                                        <TextField
                                            label="Threshold (%)"
                                            type="number"
                                            value={cancelThreshold}
                                            onChange={setCancelThreshold}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}
                            </BlockStack>

                            <BlockStack gap="200">
                                <Checkbox
                                    label="Spike in Refunds/Returns"
                                    checked={alertRefund}
                                    onChange={() => setAlertRefund(!alertRefund)}
                                    helpText="Trigger when return rate exceeds threshold"
                                />
                                {alertRefund && (
                                    <div style={{ marginLeft: '28px', maxWidth: '300px' }}>
                                        <TextField
                                            label="Threshold (%)"
                                            type="number"
                                            value={refundThreshold}
                                            onChange={setRefundThreshold}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}
                            </BlockStack>

                            <BlockStack gap="200">
                                <Checkbox
                                    label="ROAS Critical Drop"
                                    checked={alertRoas}
                                    onChange={() => setAlertRoas(!alertRoas)}
                                    helpText="Trigger when ROAS falls below expected value"
                                />
                                {alertRoas && (
                                    <div style={{ marginLeft: '28px', maxWidth: '300px' }}>
                                        <TextField
                                            label="Min ROAS (e.g., 2.5)"
                                            type="number"
                                            value={roasThreshold}
                                            onChange={setRoasThreshold}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}
                            </BlockStack>

                            <BlockStack gap="200">
                                <Checkbox
                                    label="Low Profit Margin Alert"
                                    checked={alertMargin}
                                    onChange={() => setAlertMargin(!alertMargin)}
                                    helpText="Trigger when net margin drops below percentage"
                                />
                                {alertMargin && (
                                    <div style={{ marginLeft: '28px', maxWidth: '300px' }}>
                                        <TextField
                                            label="Margin Threshold (%)"
                                            type="number"
                                            value={marginThreshold}
                                            onChange={setMarginThreshold}
                                            autoComplete="off"
                                        />
                                    </div>
                                )}
                            </BlockStack>

                            <Checkbox
                                label="Significant Drop in Sales"
                                checked={alertSales}
                                onChange={() => setAlertSales(!alertSales)}
                                helpText="Trigger if hourly sales drop by >50% vs avg"
                            />

                            <Checkbox
                                label="Inventory Stock Low"
                                checked={alertInventory}
                                onChange={() => setAlertInventory(!alertInventory)}
                                helpText="Trigger when hero products have <5 units"
                            />
                        </BlockStack>
                    )}
                </BlockStack>
            </Card >

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack >
    );
}

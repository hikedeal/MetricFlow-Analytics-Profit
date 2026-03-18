import { BlockStack, Card, Text, TextField, Checkbox, Button, FormLayout, Spinner, Box } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

export function IntelligenceSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();

    const [vipSpend, setVipSpend] = useState('1000');
    const [churnDays, setChurnDays] = useState('90');
    const [emailReports, setEmailReports] = useState(false);
    const [autoExport, setAutoExport] = useState(false);

    useEffect(() => {
        if (!loading) {
            setVipSpend(settings.vipThreshold.toString());
            setChurnDays(settings.churnDays.toString());
            setEmailReports(settings.enableScheduledReports);
            setAutoExport(settings.autoExport);
        }
    }, [settings, loading]);

    const handleSave = () => {
        saveSettings({
            vipThreshold: parseFloat(vipSpend) || 1000,
            churnDays: parseInt(churnDays) || 90,
            enableScheduledReports: emailReports,
            autoExport
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Customer Intelligence & Retention</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Define the logic used to segment your customers and predict churn risks throughout the analytics dashboard.
                    </Text>
                    <FormLayout>
                        <FormLayout.Group>
                            <TextField
                                label="VIP Customer Threshold"
                                type="number"
                                prefix="₹"
                                value={vipSpend}
                                onChange={setVipSpend}
                                autoComplete="off"
                                helpText="Customers who spend more than this are marked VIP"
                            />
                            <TextField
                                label="Churn Risk Days"
                                type="number"
                                suffix="Days"
                                value={churnDays}
                                onChange={setChurnDays}
                                autoComplete="off"
                                helpText="Customers inactive for this long are marked At-Risk"
                            />
                        </FormLayout.Group>
                    </FormLayout>
                </BlockStack>
            </Card>

            <Card>
                <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Automated Intelligence Reports</Text>
                    <BlockStack gap="200">
                        <Checkbox
                            label="Enable Weekly Email Reports"
                            checked={emailReports}
                            onChange={() => setEmailReports(!emailReports)}
                            helpText="Receive a PDF summary every Monday"
                        />
                        <Checkbox
                            label="Auto-Export Monthly Data (CSV)"
                            checked={autoExport}
                            onChange={() => setAutoExport(!autoExport)}
                            helpText="Automatically download CSV on the 1st of each month"
                        />
                    </BlockStack>
                </BlockStack>
            </Card>

            <Box
                padding="400"
                background="bg-surface-secondary"
                borderRadius="200"
                borderWidth="025"
                borderColor="border"
            >
                <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">🧠 How Intelligence works</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Our intelligence engine uses these parameters to drive your retention strategy:
                    </Text>
                    <Box paddingInlineStart="400">
                        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6d7175' }}>
                            <li><strong>RFM Scoring:</strong> Automatically groups customers by Recency, Frequency, and Monetary value.</li>
                            <li><strong>VIP Status:</strong> Highlights your top-spending customers for exclusive loyalty campaigns.</li>
                            <li><strong>Churn Risk:</strong> Identifies customers who haven't purchased within your defined window so you can win them back.</li>
                        </ul>
                    </Box>
                    <Text as="p" variant="bodySm" tone="subdued">
                        <strong>Insight:</strong> These settings directly impact the "Customer Analytics" tab on your main dashboard.
                    </Text>
                </BlockStack>
            </Box>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack>
    );
}

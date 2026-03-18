import { BlockStack, Card, TextField, Text, InlineStack, Divider, Button, FormLayout, Spinner, Checkbox, Box } from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useSettings } from '../../hooks/useSettings';

const cleanInput = (val: string) => {
    if (val === '') return val;
    // Remove leading zeros unless it's just "0" or "0.x"
    if (val.startsWith('0') && val.length > 1 && val[1] !== '.') {
        return val.substring(1);
    }
    return val;
};

export function ProfitSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();

    const [enableStoreLevelProfit, setEnableStoreLevelProfit] = useState(false);
    const [enableProfit, setEnableProfit] = useState(false);
    const [useProductCost, setUseProductCost] = useState(false);
    const [defaultCogsPercentage, setDefaultCogsPercentage] = useState('0');
    const [taxRate, setTaxRate] = useState('18');
    const [taxIncluded, setTaxIncluded] = useState(true);

    // Operational
    const [shippingCost, setShippingCost] = useState('0');
    const [packagingCost, setPackagingCost] = useState('0');
    const [returnCost, setReturnCost] = useState('0');
    const [rtoCost, setRtoCost] = useState('0');

    // Transaction
    const [codFee, setCodFee] = useState('0');
    const [gatewayFee, setGatewayFee] = useState('2.0'); // Percentage

    // Marketing & Overhead
    const [marketingCost, setMarketingCost] = useState('0'); // Fixed monthly
    const [agencyFee, setAgencyFee] = useState('0');
    const [shopifyBilling, setShopifyBilling] = useState('0');
    const [miscCost, setMiscCost] = useState('0');

    // Marketing Channels
    const [facebookSpend, setFacebookSpend] = useState('0');
    const [googleAdsSpend, setGoogleAdsSpend] = useState('0');
    const [instagramSpend, setInstagramSpend] = useState('0');
    const [tiktokSpend, setTiktokSpend] = useState('0');
    const [emailMarketingSpend, setEmailMarketingSpend] = useState('0');


    useEffect(() => {
        if (!loading && settings) {
            setEnableStoreLevelProfit(settings.enableStoreLevelProfit);
            setEnableProfit(settings.enableProfitTracking);
            setUseProductCost(settings.useProductCost);
            setShippingCost(settings.defaultShippingCost?.toString() || '0');
            setPackagingCost(settings.defaultPackagingCost?.toString() || '0');
            setReturnCost(settings.returnCost?.toString() || '0');
            setRtoCost(settings.rtoCost?.toString() || '0');
            setCodFee(settings.codExtraCharge?.toString() || '0');
            setGatewayFee(settings.paymentGatewayFee?.toString() || '2.0');
            setMarketingCost(settings.marketingCost?.toString() || '0');
            setAgencyFee(settings.agencyFee?.toString() || '0');
            setShopifyBilling(settings.shopifyBillingCost?.toString() || '0');
            setMiscCost(settings.miscCost?.toString() || '0');
            setDefaultCogsPercentage(settings.defaultCogsPercentage?.toString() || '0');
            setTaxRate(settings.taxRate?.toString() || '18');
            setTaxIncluded(settings.taxIncluded ?? true);

            // Channel Spends
            setFacebookSpend(settings.facebookSpend?.toString() || '0');
            setGoogleAdsSpend(settings.googleAdsSpend?.toString() || '0');
            setInstagramSpend(settings.instagramSpend?.toString() || '0');
            setTiktokSpend(settings.tiktokSpend?.toString() || '0');
            setEmailMarketingSpend(settings.emailMarketingSpend?.toString() || '0');

        }
    }, [settings, loading]);

    const handleSave = async () => {
        await saveSettings({
            enableStoreLevelProfit: enableStoreLevelProfit,
            enableProfitTracking: enableProfit,
            useProductCost: useProductCost,
            defaultShippingCost: parseFloat(shippingCost) || 0,
            defaultPackagingCost: parseFloat(packagingCost) || 0,
            returnCost: parseFloat(returnCost) || 0,
            rtoCost: parseFloat(rtoCost) || 0,
            codExtraCharge: parseFloat(codFee) || 0,
            paymentGatewayFee: parseFloat(gatewayFee) || 0,
            marketingCost: parseFloat(marketingCost) || 0,
            agencyFee: parseFloat(agencyFee) || 0,
            shopifyBillingCost: parseFloat(shopifyBilling) || 0,
            miscCost: parseFloat(miscCost) || 0,
            defaultCogsPercentage: parseFloat(defaultCogsPercentage) || 0,
            taxRate: parseFloat(taxRate) || 0,
            taxIncluded: taxIncluded,

            // Channel Spends
            facebookSpend: parseFloat(facebookSpend) || 0,
            googleAdsSpend: parseFloat(googleAdsSpend) || 0,
            instagramSpend: parseFloat(instagramSpend) || 0,
            tiktokSpend: parseFloat(tiktokSpend) || 0,
            emailMarketingSpend: parseFloat(emailMarketingSpend) || 0
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            {/* Store Level Profit Card */}
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">Enable Store Level Profit</Text>
                        <Checkbox
                            label="Enable"
                            labelHidden
                            checked={enableStoreLevelProfit}
                            onChange={() => setEnableStoreLevelProfit(!enableStoreLevelProfit)}
                        />
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Calculate basic profit: Net Sales - Cost of Goods Sold (COGS). This shows your gross profit margin.
                    </Text>
                    <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Formula:</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                            Gross Profit = Net Sales - COGS
                        </Text>
                    </Box>
                    <FormLayout>
                        <Checkbox
                            label="Use Product-Specific Cost"
                            checked={useProductCost}
                            onChange={() => setUseProductCost(!useProductCost)}
                            helpText="Enable this to use the 'Unit Cost' defined for each product in your Shopify Admin."
                        />
                        <TextField
                            label="Default COGS Percentage"
                            type="number"
                            suffix="%"
                            autoComplete="off"
                            value={defaultCogsPercentage}
                            onChange={(val) => setDefaultCogsPercentage(cleanInput(val))}
                            helpText="If product-specific cost is missing, we use this percentage of the product price as COGS."
                        />
                        <Divider />
                        <Text as="h3" variant="headingSm">Tax Configuration</Text>
                        <FormLayout.Group>
                            <TextField
                                label="Tax Rate"
                                type="number"
                                suffix="%"
                                autoComplete="off"
                                value={taxRate}
                                onChange={(val) => setTaxRate(cleanInput(val))}
                                helpText="Default tax rate applied to your sales (e.g. 18% for GST)"
                            />
                            <Box paddingBlockStart="400">
                                <Checkbox
                                    label="Prices include Tax"
                                    checked={taxIncluded}
                                    onChange={() => setTaxIncluded(!taxIncluded)}
                                    helpText="Enable if your product prices displayed to customers already include this tax."
                                />
                            </Box>
                        </FormLayout.Group>
                    </FormLayout>
                </BlockStack>
            </Card>

            {/* Profit Readiness Card */}
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">Enable Profit Readiness Tracking</Text>
                        <Checkbox
                            label="Enable"
                            labelHidden
                            checked={enableProfit}
                            onChange={() => setEnableProfit(!enableProfit)}
                        />
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Advanced profit calculation: Deduct all operational expenses (Shipping, Marketing, Agency, etc.) from Net Sales and COGS to get your true net profit. Can be enabled independently or alongside Store Level Profit.
                    </Text>
                    <Box paddingBlockStart="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Formula:</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                            Net Profit = Gross Profit - (Shipping + Marketing + Agency Fees + Other Expenses)
                        </Text>
                    </Box>
                </BlockStack>
            </Card>

            {enableProfit && (
                <>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Operational Costs (Per Order)</Text>
                            <FormLayout>
                                <FormLayout.Group>
                                    <TextField
                                        label="Avg. Shipping Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={shippingCost}
                                        onChange={(val) => setShippingCost(cleanInput(val))}
                                        helpText="Used if actual shipping cost is missing from Shopify"
                                    />
                                    <TextField
                                        label="Avg. Packaging Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={packagingCost}
                                        onChange={(val) => setPackagingCost(cleanInput(val))}
                                        helpText="Cost of box, tape, inserts, etc."
                                    />
                                </FormLayout.Group>
                                <Divider />
                                <FormLayout.Group>
                                    <TextField
                                        label="Return Processing Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={returnCost}
                                        onChange={(val) => setReturnCost(cleanInput(val))}
                                        helpText="Cost to process a successful return (reverse logistics)"
                                    />
                                    <TextField
                                        label="RTO Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={rtoCost}
                                        onChange={(val) => setRtoCost(cleanInput(val))}
                                        helpText="Cost incurred when order is returned to origin undelivered"
                                    />
                                </FormLayout.Group>
                            </FormLayout>
                        </BlockStack>
                    </Card>

                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Transaction Fees</Text>
                            <FormLayout>
                                <FormLayout.Group>
                                    <TextField
                                        label="COD Handling Fee"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={codFee}
                                        onChange={(val) => setCodFee(cleanInput(val))}
                                        helpText="Extra charge by courier for COD collection"
                                    />
                                    <TextField
                                        label="Payment Gateway Fee"
                                        type="number"
                                        suffix="%"
                                        autoComplete="off"
                                        value={gatewayFee}
                                        onChange={(val) => setGatewayFee(cleanInput(val))}
                                        helpText="Average 2% for Razorpay/Stripe"
                                    />
                                </FormLayout.Group>
                            </FormLayout>
                        </BlockStack>
                    </Card>

                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">Marketing & Overhead (Monthly Fixed)</Text>
                            <FormLayout>
                                <FormLayout.Group>
                                    <TextField
                                        label="Offline Marketing Spend"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={marketingCost}
                                        onChange={(val) => setMarketingCost(cleanInput(val))}
                                        helpText="Influencer marketing, billboards, etc."
                                    />
                                </FormLayout.Group>
                                <Divider />
                                <Text as="h3" variant="headingSm">Ad Channel Spend (Monthly)</Text>
                                <FormLayout.Group>
                                    <TextField
                                        label="Facebook Ads"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={facebookSpend}
                                        onChange={(val) => setFacebookSpend(cleanInput(val))}
                                    />
                                    <TextField
                                        label="Google Ads"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={googleAdsSpend}
                                        onChange={(val) => setGoogleAdsSpend(cleanInput(val))}
                                    />
                                </FormLayout.Group>
                                <FormLayout.Group>
                                    <TextField
                                        label="Instagram Ads"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={instagramSpend}
                                        onChange={(val) => setInstagramSpend(cleanInput(val))}
                                    />
                                    <TextField
                                        label="TikTok Ads"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={tiktokSpend}
                                        onChange={(val) => setTiktokSpend(cleanInput(val))}
                                    />
                                </FormLayout.Group>
                                <FormLayout.Group>
                                    <TextField
                                        label="Email Marketing"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={emailMarketingSpend}
                                        onChange={(val) => setEmailMarketingSpend(cleanInput(val))}
                                    />
                                    <Box />
                                </FormLayout.Group>
                                <Divider />
                                <FormLayout.Group>
                                    <TextField
                                        label="Agency / Software Fees"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={agencyFee}
                                        onChange={(val) => setAgencyFee(cleanInput(val))}
                                        helpText="Total monthly spend on tools & team"
                                    />

                                </FormLayout.Group>
                                <FormLayout.Group>
                                    <TextField
                                        label="Shopify Billing Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={shopifyBilling}
                                        onChange={(val) => setShopifyBilling(cleanInput(val))}
                                        helpText="Monthly Shopify subscription/app fees"
                                    />
                                    <TextField
                                        label="Miscellaneous Cost"
                                        type="number"
                                        prefix="₹"
                                        autoComplete="off"
                                        value={miscCost}
                                        onChange={(val) => setMiscCost(cleanInput(val))}
                                        helpText="Any other fixed overhead costs"
                                    />
                                </FormLayout.Group>
                            </FormLayout>
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
                            <Text as="h3" variant="headingSm">📊 How your Profit is calculated</Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                                We use a multi-layer formula to give you a precise "Bottom Line" margin:
                            </Text>
                            <Box paddingInlineStart="400">
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6d7175' }}>
                                    <li><strong>Gross Profit:</strong> Net Sales minus Product COGS (Cost of Goods).</li>
                                    <li><strong>Operational Profit:</strong> Gross Profit minus Shipping and Packaging costs.</li>
                                    <li><strong>Net Profit:</strong> Operational Profit minus Marketing, Software fees, and Payment Gateway fees.</li>
                                </ul>
                            </Box>
                            <Text as="p" variant="bodySm" tone="subdued">
                                <strong>Tip:</strong> Keep these costs updated monthly to ensure your Dashboard reflects the absolute truth of your business health.
                            </Text>
                        </BlockStack>
                    </Box>
                </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack>
    );
}

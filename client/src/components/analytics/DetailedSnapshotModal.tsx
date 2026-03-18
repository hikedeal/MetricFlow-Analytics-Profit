import { Modal, Text, BlockStack, InlineStack, Divider } from '@shopify/polaris';
import { formatCurrency } from '../../utils/currency';
import { PeriodSnapshot } from '../../hooks/useDashboardData';

interface Props {
    open: boolean;
    onClose: () => void;
    snapshot: PeriodSnapshot;
    currency: string;
}

export function DetailedSnapshotModal({ open, onClose, snapshot, currency }: Props) {

    const Row = ({ label, value, isBold = false, indent = false }: { label: string, value: number | string, isBold?: boolean, indent?: boolean }) => (
        <InlineStack align="space-between">
            <Text as="p" variant={isBold ? "bodyMd" : "bodySm"} fontWeight={isBold ? "bold" : "regular"} tone={indent ? "subdued" : "base"}>
                {indent ? `  ${label}` : label}
            </Text>
            <Text as="p" variant={isBold ? "bodyMd" : "bodySm"} fontWeight={isBold ? "bold" : "regular"}>
                {typeof value === 'number' ? formatCurrency(value, currency) : value}
            </Text>
        </InlineStack>
    );

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`${snapshot.label}`}
            size="small"
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p" variant="bodySm" tone="subdued">{snapshot.range}</Text>

                    {/* Revenue Section */}
                    <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                        <BlockStack gap="200">
                            <InlineStack align="space-between">
                                <Text as="h3" variant="headingSm">Sales</Text>
                                <Text as="h3" variant="headingSm">{formatCurrency(snapshot.sales, currency)}</Text>
                            </InlineStack>
                            <Divider />
                            <InlineStack align="space-between">
                                <Text as="p" variant="bodyXs" tone="subdued">Orders</Text>
                                <Text as="p" variant="bodyXs">{snapshot.orders}</Text>
                            </InlineStack>
                            <InlineStack align="space-between">
                                <Text as="p" variant="bodyXs" tone="subdued">Units sold</Text>
                                <Text as="p" variant="bodyXs">{snapshot.units}</Text>
                            </InlineStack>
                        </BlockStack>
                    </div>

                    {/* Cost Breakdown */}
                    <BlockStack gap="200">
                        <Row label="Returns" value={snapshot.returns} />
                        <Row label="Advertising cost" value={snapshot.advCost} />
                        <Row label="Shipping costs" value={snapshot.shipping} />
                        <Row label="Payment fees" value={snapshot.paymentFees} />
                        <Row label="Marketplace fees" value={snapshot.marketplaceFees} />
                        <Row label="Cost of goods" value={snapshot.cogs} />
                        <Row label="Tax" value={snapshot.tax} />
                    </BlockStack>

                    <Divider />

                    {/* Profitability */}
                    <BlockStack gap="200">
                        <Row label="Gross profit" value={snapshot.grossProfit} isBold />
                        <Row label="Expenses" value={snapshot.expenses} />
                        <div style={{ background: '#f0fdf4', padding: '8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
                            <Row label="Net profit" value={snapshot.netProfit} isBold />
                        </div>
                    </BlockStack>



                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

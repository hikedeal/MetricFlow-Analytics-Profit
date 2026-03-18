import { IndexTable, Card, Text, Badge, InlineStack, useIndexResourceState, Tooltip, Icon, Button } from '@shopify/polaris';
import { AlertCircleIcon } from '@shopify/polaris-icons';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

interface Order {
    id: string;
    order_number: string;
    created_at: string;
    customer: {
        name: string;
        email: string;
        city: string;
        orders_count: number;
    } | null;
    financial_status: string;
    fulfillment_status: string;
    total_price: number;
    currency: string;
    profit_estimate: number;
    profit_status: 'profit' | 'low_profit' | 'loss';
    risk_score: number;
    risk_factors: string[];
    tags: string[];
    payment_gateway_names: string[];
}

interface OrdersTableProps {
    orders: Order[];
    loading: boolean;
    totalCount: number;
    onRowClick: (order: Order) => void;
    onBulkExport: (selectedIds: string[], selectAll: boolean) => void;
    onBulkAddTags: (selectedIds: string[], selectAll: boolean) => void;
    onBulkMarkAsRisky: (selectedIds: string[], selectAll: boolean) => void;
}

export function OrdersTable({
    orders,
    loading,
    totalCount,
    onRowClick,
    onBulkExport,
    onBulkAddTags,
    onBulkMarkAsRisky
}: OrdersTableProps) {
    const resourceName = {
        singular: 'order',
        plural: 'orders',
    };

    const {
        selectedResources,
        allResourcesSelected,
        handleSelectionChange,
        clearSelection
    } = useIndexResourceState(orders as any);

    const [isAllMatchingSelected, setIsAllMatchingSelected] = useState(false);

    // Reset All Matching when selection changes or page changes
    useEffect(() => {
        if (!allResourcesSelected) {
            setIsAllMatchingSelected(false);
        }
    }, [allResourcesSelected, orders]);

    const rowMarkup = orders.map(
        (order, index) => {
            const { id, order_number, created_at, customer, total_price, currency, profit_status, risk_score, profit_estimate } = order;

            let profitTone: 'success' | 'attention' | 'critical' = 'success';
            let profitLabel = 'Profit';
            if (profit_status === 'loss') {
                profitTone = 'critical';
                profitLabel = 'Loss';
            } else if (profit_status === 'low_profit') {
                profitTone = 'attention';
                profitLabel = 'Low Margin';
            }

            // Risk Logic
            let riskTone: 'success' | 'attention' | 'critical' = 'success';
            if (risk_score > 70) riskTone = 'critical';
            else if (risk_score > 30) riskTone = 'attention';

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
                    onClick={() => onRowClick(order)}
                >
                    <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="bold" as="span">{order_number}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        {format(new Date(created_at), 'MMM dd, HH:mm')}
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <div style={{ minWidth: '150px' }}>
                            <Text variant="bodyMd" fontWeight="semibold" as="span">{customer?.name || 'Guest'}</Text>
                            <Text variant="bodySm" tone="subdued" as="p">{customer?.city || 'N/A'}</Text>
                        </div>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">{currency} {total_price.toFixed(2)}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="200" align="start" blockAlign="center">
                            <Badge tone={profitTone as any} progress={profit_status === 'profit' ? 'complete' : 'incomplete'}>
                                {profitLabel}
                            </Badge>
                            <Text variant="bodySm" tone={profitTone as any} as="span">
                                ({currency} {profit_estimate})
                            </Text>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge tone={order.financial_status === 'paid' ? 'success' : 'attention'}>
                            {order.financial_status}
                        </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge progress="partiallyComplete" tone={order.fulfillment_status === 'fulfilled' ? 'success' : 'attention'}>
                            {order.fulfillment_status}
                        </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100">
                            {order.risk_score > 50 && (
                                <Tooltip content={`Risk Score: ${risk_score}`}>
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                </Tooltip>
                            )}
                            <Badge tone={riskTone as any}>{`${risk_score}/100`}</Badge>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100" wrap>
                            {order.tags.slice(0, 2).map(tag => (
                                <Badge key={tag}>{tag}</Badge>
                            ))}
                            {order.tags.length > 2 && <Badge>{(order.tags.length - 2).toString()}</Badge>}
                        </InlineStack>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        },
    );

    const promotedBulkActions = [
        {
            content: 'Export Orders',
            onAction: () => onBulkExport(selectedResources, isAllMatchingSelected),
        },
    ];

    const bulkActions = [
        {
            content: 'Add Tags',
            onAction: () => onBulkAddTags(selectedResources, isAllMatchingSelected),
        },
        {
            content: 'Mark as High Risk',
            onAction: () => onBulkMarkAsRisky(selectedResources, isAllMatchingSelected),
        },
    ];

    return (
        <Card padding="0">
            {allResourcesSelected && !isAllMatchingSelected && totalCount > orders.length && (
                <div style={{ padding: '12px 16px', background: '#f1f2f3', borderBottom: '1px solid #e1e3e5' }}>
                    <InlineStack align="center" gap="200">
                        <Text as="span">All {orders.length} orders on this page are selected.</Text>
                        <Button variant="plain" onClick={() => setIsAllMatchingSelected(true)}>
                            Select all {totalCount.toString()} orders
                        </Button>
                    </InlineStack>
                </div>
            )}
            {isAllMatchingSelected && (
                <div style={{ padding: '12px 16px', background: '#f1f2f3', borderBottom: '1px solid #e1e3e5' }}>
                    <InlineStack align="center" gap="200">
                        <Text as="span">All {totalCount} orders are selected.</Text>
                        <Button variant="plain" onClick={() => {
                            clearSelection();
                            setIsAllMatchingSelected(false);
                        }}>
                            Clear selection
                        </Button>
                    </InlineStack>
                </div>
            )}
            <IndexTable
                resourceName={resourceName}
                itemCount={orders.length}
                selectedItemsCount={
                    isAllMatchingSelected ? 'All' : (allResourcesSelected ? 'All' : selectedResources.length)
                }
                onSelectionChange={handleSelectionChange}
                promotedBulkActions={promotedBulkActions as any}
                bulkActions={bulkActions as any}
                headings={[
                    { title: 'Order ID' },
                    { title: 'Date' },
                    { title: 'Customer' },
                    { title: 'Amount' },
                    { title: 'Profit Estimate' },
                    { title: 'Payment' },
                    { title: 'Fulfillment' },
                    { title: 'Risk Score' },
                    { title: 'Tags' },
                ]}
                loading={loading}
            >
                {rowMarkup}
            </IndexTable>
        </Card>
    );
}

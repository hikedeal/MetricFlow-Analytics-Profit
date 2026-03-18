import { IndexTable, Card, Text, Badge, InlineStack, useIndexResourceState, Tooltip, Icon } from '@shopify/polaris';
import { AlertCircleIcon, StarFilledIcon } from '@shopify/polaris-icons';
import { format, parseISO } from 'date-fns';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    total_orders: number;
    total_spend: number;
    average_order_value: number;
    last_order_date: string;
    cancellation_count: number;
    return_count: number;
    segment: string;
    risk_level: string;
    risk_factors: string[];
    profit_contribution: number;
    marketing_status: string;
}

interface CustomersTableProps {
    customers: Customer[];
    loading: boolean;
    onRowClick: (customer: Customer) => void;
    onExport: (segment: string) => void;
}

export function CustomersTable({ customers, loading, onRowClick, onExport }: CustomersTableProps) {
    const resourceName = {
        singular: 'customer',
        plural: 'customers',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(customers as any);

    const rowMarkup = customers.map(
        (customer, index) => {
            const { id, name, email, total_orders, total_spend, average_order_value, last_order_date, segment, risk_level, marketing_status, cancellation_count } = customer;

            // Segment Badge Logic
            let segmentTone: any = 'info';
            if (segment === 'VIP Customer') {
                segmentTone = 'success';
            } else if (segment === 'Loyal Customer') {
                segmentTone = 'success';
            } else if (segment === 'Repeat Buyer') {
                segmentTone = 'info';
            }

            // Risk Badge Logic
            let riskTone: any = 'success';
            if (risk_level === 'High') riskTone = 'critical';
            else if (risk_level === 'Medium') riskTone = 'attention';

            // Marketing Status Color
            if (marketing_status === 'Dormant') {
                // Potential future use for status indicators
            }

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
                    onClick={() => onRowClick(customer)}
                >
                    <IndexTable.Cell>
                        <div style={{ minWidth: '180px' }}>
                            <InlineStack gap="200" blockAlign="center">
                                {segment === 'VIP Customer' && <Icon source={StarFilledIcon} tone="success" />}
                                <div>
                                    <Text variant="bodyMd" fontWeight="bold" as="span">{name || 'Guest'}</Text>
                                    <Text variant="bodySm" tone="subdued" as="p">{email || 'N/A'}</Text>
                                </div>
                            </InlineStack>
                        </div>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodySm" as="span">{customer.city || 'N/A'}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge tone={segmentTone as any}>{segment}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100">
                            {risk_level === 'High' && (
                                <Tooltip content={`${cancellation_count} cancellations`}>
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                </Tooltip>
                            )}
                            <Badge tone={riskTone as any}>{`${risk_level} Risk`}</Badge>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">{total_orders || 0}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="semibold" as="span">₹{(total_spend || 0).toLocaleString()}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">₹{(average_order_value || 0).toLocaleString()}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <div>
                            <Text variant="bodySm" as="span">
                                {last_order_date ? format(parseISO(last_order_date), 'MMM dd, yyyy') : 'No orders'}
                            </Text>
                            {marketing_status && marketing_status !== 'Active' && (
                                <Text variant="bodySm" as="p" tone={marketing_status === 'Dormant' ? 'critical' : 'caution'}>
                                    {marketing_status}
                                </Text>
                            )}
                        </div>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        },
    );

    return (
        <Card padding="0">
            <IndexTable
                resourceName={resourceName}
                itemCount={customers.length}
                selectedItemsCount={
                    allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                bulkActions={[
                    { content: 'Export VIP List', onAction: () => onExport('vip') },
                    { content: 'Export High Risk', onAction: () => onExport('high') },
                ]}
                headings={[
                    { title: 'Customer' },
                    { title: 'Location' },
                    { title: 'Segment' },
                    { title: 'Risk Level' },
                    { title: 'Orders' },
                    { title: 'Lifetime Value' },
                    { title: 'AOV' },
                    { title: 'Last Order' },
                ]}
                loading={loading}
            >
                {rowMarkup}
            </IndexTable>
        </Card>
    );
}

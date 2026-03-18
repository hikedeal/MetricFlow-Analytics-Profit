import { IndexTable, Card, Text, Badge, InlineStack, useIndexResourceState, Tooltip, Icon } from '@shopify/polaris';
import { AlertCircleIcon, CheckCircleIcon, ArrowUpIcon, ArrowDownIcon } from '@shopify/polaris-icons';

interface Product {
    id: string;
    name: string;
    sku: string;
    units_sold: number;
    total_revenue: number;
    discount_amount: number;
    estimated_profit: number;
    profit_margin: number;
    cancellation_count: number;
    return_count: number;
    cancellation_rate: number;
    rto_rate: number;
    net_revenue: number;
    inventory_available: number;
    status: string;
    growth_status: string;
    inventory_risk: string;
    discount_dependency: string;
}

interface ProductsTableProps {
    products: Product[];
    loading: boolean;
    onRowClick: (product: Product) => void;
    onBulkInventoryUpdate?: (selectedIds: string[]) => void;
    canUpdateInventory?: boolean;
    onBulkExport?: (selectedIds: string[], format: 'csv' | 'excel') => void;
}

export function ProductsTable({ products, loading, onRowClick, onBulkInventoryUpdate, canUpdateInventory, onBulkExport }: ProductsTableProps) {
    const resourceName = {
        singular: 'product',
        plural: 'products',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(products as any);

    const rowMarkup = products.map(
        (product, index) => {
            const {
                id, name, sku, units_sold, total_revenue, discount_amount,
                estimated_profit, profit_margin, cancellation_count, return_count,
                net_revenue, inventory_available, status, growth_status, inventory_risk
            } = product;

            // Profit Status Badge
            let profitTone: any = 'success';
            if (status === 'Loss Making') profitTone = 'critical';
            else if (status === 'Low Margin') profitTone = 'attention';

            // Growth Badge
            let growthIcon = null;
            let growthTone: any = 'info';
            if (growth_status === 'Fast Growing') {
                growthIcon = ArrowUpIcon;
                growthTone = 'success';
            } else if (growth_status === 'Declining') {
                growthIcon = ArrowDownIcon;
                growthTone = 'critical';
            }

            // Inventory Risk
            let inventoryTone: any = 'success';
            if (inventory_risk === 'Out of Stock') inventoryTone = 'critical';
            else if (inventory_risk === 'Low Stock') inventoryTone = 'attention';

            return (
                <IndexTable.Row
                    id={id}
                    key={id}
                    selected={selectedResources.includes(id)}
                    position={index}
                    onClick={() => onRowClick(product)}
                >
                    <IndexTable.Cell>
                        <div style={{ minWidth: '200px' }}>
                            <Text variant="bodyMd" fontWeight="bold" as="span">{name || 'Unknown Product'}</Text>
                            <Text variant="bodySm" tone="subdued" as="p">{sku || 'N/A'}</Text>
                        </div>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">{units_sold}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" fontWeight="semibold" as="span">₹{(total_revenue || 0).toLocaleString()}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodySm" tone="subdued" as="span">₹{(discount_amount || 0).toLocaleString()}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="200" blockAlign="center">
                            <Badge tone={profitTone as any}>
                                {`${estimated_profit >= 0 ? '+' : ''}₹${Math.round(estimated_profit || 0).toLocaleString()}`}
                            </Badge>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100" blockAlign="center">
                            {profit_margin >= 20 && <Icon source={CheckCircleIcon} tone="success" />}
                            {profit_margin < 0 && <Icon source={AlertCircleIcon} tone="critical" />}
                            <Text
                                variant="bodyMd"
                                fontWeight="semibold"
                                as="span"
                                tone={profit_margin < 0 ? 'critical' : profit_margin < 10 ? 'caution' : 'success'}
                            >
                                {`${(profit_margin || 0).toFixed(1)}%`}
                            </Text>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100">
                            {cancellation_count > 10 && (
                                <Tooltip content={`${product.cancellation_rate}% cancellation rate`}>
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                </Tooltip>
                            )}
                            <Badge tone={cancellation_count > 10 ? 'critical' : 'info'}>
                                {(cancellation_count || 0).toString()}
                            </Badge>
                        </InlineStack>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Badge tone={return_count > 5 ? 'attention' : 'info'}>
                            {(return_count || 0).toString()}
                        </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <Text variant="bodyMd" as="span">₹{(net_revenue || 0).toLocaleString()}</Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                        <InlineStack gap="100">
                            <Badge tone={inventoryTone as any}>
                                {`${inventory_available || 0} units`}
                            </Badge>
                            {growth_status !== 'Stable' && growthIcon && (
                                <Tooltip content={growth_status}>
                                    <Icon source={growthIcon} tone={growthTone as any} />
                                </Tooltip>
                            )}
                        </InlineStack>
                    </IndexTable.Cell>
                </IndexTable.Row>
            );
        },
    );

    return (
        <Card padding="0">
            <IndexTable
                resourceName={resourceName}
                itemCount={products.length}
                selectedItemsCount={
                    allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                bulkActions={[
                    { content: 'Export as CSV', onAction: () => onBulkExport?.(selectedResources, 'csv') },
                    { content: 'Export as Excel', onAction: () => onBulkExport?.(selectedResources, 'excel') },
                    ...(canUpdateInventory ? [{ content: 'Update Inventory', onAction: () => onBulkInventoryUpdate?.(selectedResources) }] : []),
                ]}
                headings={[
                    { title: 'Product' },
                    { title: 'Units Sold' },
                    { title: 'Revenue' },
                    { title: 'Discount' },
                    { title: 'Profit' },
                    { title: 'Margin %' },
                    { title: 'Cancellations' },
                    { title: 'Returns' },
                    { title: 'Net Revenue' },
                    { title: 'Inventory' },
                ]}
                loading={loading}
            >
                {rowMarkup}
            </IndexTable>
        </Card>
    );
}

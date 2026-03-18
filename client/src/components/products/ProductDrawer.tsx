import { BlockStack, Button, Card, Divider, InlineStack, Text, Badge, Icon, TextField, Banner, Box } from '@shopify/polaris';
import { XIcon, ProductIcon, AlertCircleIcon, ChartVerticalIcon, LocationIcon, RefreshIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import api from '../../services/api';

interface ProductDrawerProps {
    product: any;
    open: boolean;
    onClose: () => void;
    onUpdate?: () => void;
    canUpdateInventory?: boolean;
}

export function ProductDrawer({ product, open, onClose, onUpdate, canUpdateInventory }: ProductDrawerProps) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [newQuantity, setNewQuantity] = useState(product?.inventory_available?.toString() || '0');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!open || !product) return null;

    const handleUpdateInventory = async () => {
        try {
            setIsUpdating(true);
            setError(null);
            await api.post(`/products/${product.id}/inventory`, {
                quantity: parseInt(newQuantity)
            });
            setSuccess(true);
            setEditMode(false);
            if (onUpdate) onUpdate();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to update inventory');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 9998,
                    display: open ? 'block' : 'none',
                }}
                onClick={onClose}
            />
            {/* Drawer Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: open ? 0 : '-550px',
                    bottom: 0,
                    width: '550px',
                    background: 'white',
                    zIndex: 9999,
                    transition: 'right 0.3s ease-in-out',
                    boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e1e3e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <BlockStack gap="200">
                        <Text as="h2" variant="headingLg">{product?.name || product?.title || 'Unknown Product'}</Text>
                        <InlineStack gap="200">
                            <Badge tone={product.status === 'Profitable' ? 'success' : product.status === 'Loss Making' ? 'critical' : 'attention'}>
                                {product.status}
                            </Badge>
                            {product.growth_status !== 'Stable' && (
                                <Badge tone={product.growth_status === 'Fast Growing' ? 'success' : 'critical'}>
                                    {product.growth_status}
                                </Badge>
                            )}
                        </InlineStack>
                    </BlockStack>
                    <Button icon={XIcon} onClick={onClose} variant="plain" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <BlockStack gap="500">
                        {success && <Banner tone="success" title="Inventory updated successfully" />}
                        {error && <Banner tone="critical" title={error} />}

                        {/* Profit Intelligence */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={ChartVerticalIcon} />
                                    <Text as="h3" variant="headingSm">Profit Intelligence</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Total Revenue</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">₹{product.total_revenue.toLocaleString()}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Total Tax ({product.tax_rate || 0}%)</Text>
                                    <Text as="p" variant="bodyMd">₹{product.tax_amount?.toLocaleString() || 0}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Box>
                                        <Text as="p" variant="bodyMd" tone="critical">Cost per item</Text>
                                        <Text as="p" variant="bodyXs" tone="subdued">(Unit Cost: ₹{product.unit_cost})</Text>
                                    </Box>
                                    <Text as="p" variant="bodyMd" tone="critical">-₹{product.total_cost?.toLocaleString() || 0}</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="headingMd" fontWeight="bold" tone="success">Net Profit</Text>
                                    <Text as="p" variant="headingMd" fontWeight="bold" tone="success">₹{product.estimated_profit?.toLocaleString() || 0}</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Discount Dependency</Text>
                                    <Badge tone={product.discount_dependency === 'High' ? 'attention' : 'success'}>
                                        {product.discount_dependency}
                                    </Badge>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Cancellation & RTO Analysis */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                    <Text as="h3" variant="headingSm">Cancellation & RTO Analysis</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Units Sold</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">{product.units_sold}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Cancellations</Text>
                                    <Badge tone={product.cancellation_count > 10 ? 'critical' : 'info'}>
                                        {`${product.cancellation_count} (${product.cancellation_rate.toFixed(1)}%)`}
                                    </Badge>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Returns/RTO</Text>
                                    <Badge tone={product.return_count > 5 ? 'attention' : 'info'}>
                                        {`${product.return_count} (${product.rto_rate.toFixed(1)}%)`}
                                    </Badge>
                                </InlineStack>
                                {(product.cancellation_rate > 10 || product.rto_rate > 5) && (
                                    <div style={{
                                        padding: '12px',
                                        background: '#fef2f2',
                                        borderRadius: '8px',
                                        marginTop: '8px'
                                    }}>
                                        <Text as="p" variant="bodySm" tone="critical" fontWeight="semibold">
                                            ⚠️ High cancellation/return rate detected
                                        </Text>
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Review product quality, description accuracy, or pricing strategy.
                                        </Text>
                                    </div>
                                )}
                            </BlockStack>
                        </Card>

                        {/* Inventory Risk */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={ProductIcon} />
                                    <Text as="h3" variant="headingSm">Inventory Status</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Available Stock</Text>
                                    <Badge tone={
                                        product.inventory_risk === 'Out of Stock' ? 'critical' :
                                            product.inventory_risk === 'Low Stock' ? 'attention' : 'success'
                                    }>
                                        {`${product.inventory_available} units`}
                                    </Badge>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Inventory Status</Text>
                                    <Badge tone={
                                        product.inventory_risk === 'Out of Stock' ? 'critical' :
                                            product.inventory_risk === 'Low Stock' ? 'attention' : 'success'
                                    }>
                                        {product.inventory_risk}
                                    </Badge>
                                </InlineStack>

                                {editMode ? (
                                    <div style={{ padding: '12px', background: '#f4f6f8', borderRadius: '8px', marginTop: '8px' }}>
                                        <BlockStack gap="300">
                                            <TextField
                                                label="Number of units in stock"
                                                type="number"
                                                value={newQuantity}
                                                onChange={setNewQuantity}
                                                autoComplete="off"
                                            />
                                            <InlineStack gap="200">
                                                <Button
                                                    variant="primary"
                                                    onClick={handleUpdateInventory}
                                                    loading={isUpdating}
                                                >
                                                    Save Changes
                                                </Button>
                                                <Button onClick={() => setEditMode(false)} disabled={isUpdating}>Cancel</Button>
                                            </InlineStack>
                                        </BlockStack>
                                    </div>
                                ) : (
                                    canUpdateInventory && product.inventory_risk !== 'Safe' && (
                                        <div style={{
                                            padding: '12px',
                                            background: product.inventory_risk === 'Out of Stock' ? '#fef2f2' : '#fffbeb',
                                            borderRadius: '8px',
                                            marginTop: '8px'
                                        }}>
                                            <Text as="p" variant="bodySm" fontWeight="semibold" tone={product.inventory_risk === 'Out of Stock' ? 'critical' : 'caution'}>
                                                {product.inventory_risk === 'Out of Stock' ? '🔴 Out of Stock' : '⚠️ Low Stock Alert'}
                                            </Text>
                                            <Text as="p" variant="bodySm" tone="subdued">
                                                {product.inventory_risk === 'Out of Stock'
                                                    ? 'Restock immediately to avoid revenue loss.'
                                                    : 'Consider restocking soon to prevent stockouts.'}
                                            </Text>
                                        </div>
                                    )
                                )}
                            </BlockStack>
                        </Card>

                        {/* Top Cities */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={LocationIcon} />
                                    <Text as="h3" variant="headingSm">Top Buying Cities</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack gap="200" wrap>
                                    {product.top_cities.map((city: string) => (
                                        <Badge key={city}>{city}</Badge>
                                    ))}
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Repeat Purchase Rate</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                                        {product.repeat_purchase_rate}%
                                    </Text>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '20px', borderTop: '1px solid #e1e3e5' }}>
                    <BlockStack gap="300">
                        {canUpdateInventory && (
                            <Button
                                fullWidth
                                variant="primary"
                                icon={RefreshIcon}
                                onClick={() => {
                                    if (!editMode) {
                                        setNewQuantity(product.inventory_available.toString());
                                        setEditMode(true);
                                    } else {
                                        handleUpdateInventory();
                                    }
                                }}
                                loading={isUpdating && !editMode}
                            >
                                Update Inventory
                            </Button>
                        )}
                    </BlockStack>
                </div>
            </div>
        </>
    );
}

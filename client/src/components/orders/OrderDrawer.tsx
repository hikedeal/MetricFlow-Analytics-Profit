import { BlockStack, Button, Card, Divider, InlineStack, Text, Badge, Icon, Modal, TextField } from '@shopify/polaris';
import { XIcon, PersonIcon, AlertCircleIcon, BankIcon, DeleteIcon } from '@shopify/polaris-icons';
import { useState } from 'react';
import api from '../../services/api';

interface OrderDrawerProps {
    order: any;
    open: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function OrderDrawer({ order, open, onClose, onUpdate }: OrderDrawerProps) {
    const [marking, setMarking] = useState(false);
    const [showTagModal, setShowTagModal] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [savingTags, setSavingTags] = useState(false);

    if (!open || !order) return null;

    const handleMarkAsRisky = async () => {
        setMarking(true);
        try {
            await api.put(`/orders/${order.id}/risk`);
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error('Failed to mark order as risky:', error);
        } finally {
            setMarking(false);
        }
    };

    const handleOpenTagModal = () => {
        setTags(order.tags || []);
        setNewTag('');
        setShowTagModal(true);
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleSaveTags = async () => {
        setSavingTags(true);
        try {
            await api.put(`/orders/${order.id}/tags`, { tags });
            onUpdate?.();
            setShowTagModal(false);
        } catch (error) {
            console.error('Failed to update tags:', error);
        } finally {
            setSavingTags(false);
        }
    };

    // Calculate tax percentage
    const taxPercentage = order.total_price > 0
        ? ((order.total_tax || 0) / order.total_price * 100).toFixed(2)
        : '0.00';

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
                    zIndex: 500,
                    display: open ? 'block' : 'none',
                }}
                onClick={onClose}
            />
            {/* Drawer Panel */}
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    right: open ? 0 : '-500px',
                    bottom: 0,
                    width: '450px',
                    background: 'white',
                    zIndex: 510,
                    transition: 'right 0.3s ease-in-out',
                    boxShadow: '-5px 0 15px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e1e3e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <BlockStack gap="200">
                        <Text as="h2" variant="headingLg">{order.order_number}</Text>
                        <InlineStack gap="200">
                            <Badge tone={order.financial_status === 'paid' ? 'success' : 'attention'}>{order.financial_status}</Badge>
                            <Badge tone={order.fulfillment_status === 'fulfilled' ? 'success' : 'warning'}>{order.fulfillment_status}</Badge>
                        </InlineStack>
                    </BlockStack>
                    <Button icon={XIcon} onClick={onClose} variant="plain" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <BlockStack gap="500">
                        {/* Profit Section */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={BankIcon} />
                                    <Text as="h3" variant="headingSm">Profitability Analysis</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Order Revenue</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="bold">{order.currency} {order.total_price}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd" tone="subdued">Total Tax ({taxPercentage}%)</Text>
                                    <Text as="p" variant="bodyMd">{order.currency} {(order.total_tax || 0).toFixed(2)}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd" tone="critical">Cost per item</Text>
                                    <Text as="p" variant="bodyMd" tone="critical">-{order.currency} {(order.total_price - order.profit_estimate).toFixed(2)}</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="headingMd" tone={order.profit_estimate > 0 ? 'success' : 'critical'}>Net Profit</Text>
                                    <Text as="p" variant="headingMd" tone={order.profit_estimate > 0 ? 'success' : 'critical'}>
                                        {order.currency} {order.profit_estimate}
                                    </Text>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Risk Section */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                    <Text as="h3" variant="headingSm">Risk Intelligence</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Risk Score</Text>
                                    <Badge tone={order.risk_score > 50 ? 'critical' : 'success'}>{`${order.risk_score}/100`}</Badge>
                                </InlineStack>
                                {order.risk_factors && order.risk_factors.length > 0 && (
                                    <BlockStack gap="200">
                                        <Text as="p" variant="bodySm" tone="subdued">Detected Risks:</Text>
                                        <InlineStack gap="200" wrap>
                                            {order.risk_factors.map((risk: string) => (
                                                <Badge key={risk} tone="critical">{risk}</Badge>
                                            ))}
                                        </InlineStack>
                                    </BlockStack>
                                )}
                            </BlockStack>
                        </Card>

                        {/* Customer Section */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={PersonIcon} />
                                    <Text as="h3" variant="headingSm">Customer Profile</Text>
                                </InlineStack>
                                <Divider />
                                <Text as="p" variant="headingMd">{order.customer?.name || 'Guest'}</Text>
                                {order.customer ? (
                                    <>
                                        <Text as="p" variant="bodySm" tone="subdued">{order.customer.email}</Text>
                                        <Text as="p" variant="bodySm">{order.customer.city || 'N/A'}, {order.customer.state || ''}</Text>
                                        <div style={{ marginTop: '10px' }}>
                                            <InlineStack align="space-between">
                                                <Text as="span" variant="bodySm" tone="subdued">Lifetime Spend</Text>
                                                <Text as="span" variant="bodySm" fontWeight="bold">{order.currency} {order.customer.total_spent || 0}</Text>
                                            </InlineStack>
                                            <InlineStack align="space-between">
                                                <Text as="span" variant="bodySm" tone="subdued">Total Orders</Text>
                                                <Text as="span" variant="bodySm" fontWeight="bold">{order.customer.orders_count || 0}</Text>
                                            </InlineStack>
                                        </div>
                                    </>
                                ) : (
                                    <Text as="p" variant="bodySm" tone="subdued">No customer information available for this order.</Text>
                                )}
                            </BlockStack>
                        </Card>

                        {/* Ordered Items Section */}
                        <Card>
                            <BlockStack gap="300">
                                <Text as="h3" variant="headingSm">Ordered Items ({order.items?.length || 0})</Text>
                                <Divider />
                                <BlockStack gap="400">
                                    {order.items?.map((item: any, index: number) => (
                                        <BlockStack gap="200" key={index}>
                                            <InlineStack align="space-between">
                                                <div style={{ maxWidth: '70%' }}>
                                                    <Text as="p" variant="bodyMd" fontWeight="bold">{item.name}</Text>
                                                    <Text as="p" variant="bodySm" tone="subdued">SKU: {item.sku || 'N/A'}</Text>
                                                </div>
                                                <Text as="p" variant="bodyMd" fontWeight="bold">× {item.quantity}</Text>
                                            </InlineStack>
                                            <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                                                <InlineStack gap="400">
                                                    <BlockStack gap="050">
                                                        <Text as="p" variant="bodyXs" tone="subdued">Selling Price</Text>
                                                        <Text as="p" variant="bodySm" fontWeight="bold">{order.currency} {item.price}</Text>
                                                    </BlockStack>
                                                    <BlockStack gap="050">
                                                        <Text as="p" variant="bodyXs" tone="subdued">Cost per item</Text>
                                                        <Text as="p" variant="bodySm">{order.currency} {item.unit_cost}</Text>
                                                    </BlockStack>
                                                    <BlockStack gap="050">
                                                        <Text as="p" variant="bodyXs" tone="subdued">Item Total Cost</Text>
                                                        <Text as="p" variant="bodySm" fontWeight="bold" tone="critical">
                                                            {order.currency} {item.total_cost}
                                                        </Text>
                                                    </BlockStack>
                                                </InlineStack>
                                            </div>
                                            {index < order.items.length - 1 && <Divider />}
                                        </BlockStack>
                                    ))}
                                </BlockStack>
                            </BlockStack>
                        </Card>

                        {/* Tags */}
                        <Card>
                            <BlockStack gap="300">
                                <Text as="h3" variant="headingSm">Tags</Text>
                                <InlineStack gap="200" wrap>
                                    {order.tags.map((tag: string) => (
                                        <Badge key={tag} tone="info">{tag}</Badge>
                                    ))}
                                    <Button size="micro" variant="plain" onClick={handleOpenTagModal}>Manage Tags</Button>
                                </InlineStack>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #e1e3e5' }}>
                    <Button
                        fullWidth
                        variant="primary"
                        tone="critical"
                        onClick={handleMarkAsRisky}
                        loading={marking}
                    >
                        Mark as Risky
                    </Button>
                </div>
            </div>

            {/* Tag Management Modal */}
            <Modal
                open={showTagModal}
                onClose={() => setShowTagModal(false)}
                title="Manage Tags"
                primaryAction={{
                    content: 'Save',
                    onAction: handleSaveTags,
                    loading: savingTags
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        onAction: () => setShowTagModal(false)
                    }
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="400">
                        <TextField
                            label="Add new tag"
                            value={newTag}
                            onChange={setNewTag}
                            placeholder="Enter tag name"
                            autoComplete="off"
                            connectedRight={
                                <Button onClick={handleAddTag} disabled={!newTag.trim()}>
                                    Add
                                </Button>
                            }
                        />

                        {tags.length > 0 && (
                            <BlockStack gap="200">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Current Tags</Text>
                                <InlineStack gap="200" wrap>
                                    {tags.map((tag) => (
                                        <div key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                            <Badge tone="info">{tag}</Badge>
                                            <Button
                                                icon={DeleteIcon}
                                                size="micro"
                                                variant="plain"
                                                tone="critical"
                                                onClick={() => handleRemoveTag(tag)}
                                            />
                                        </div>
                                    ))}
                                </InlineStack>
                            </BlockStack>
                        )}
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </>
    );
}

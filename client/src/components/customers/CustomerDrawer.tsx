import { BlockStack, Button, Card, Divider, InlineStack, Text, Badge, Icon, TextField, Tag } from '@shopify/polaris';
import { XIcon, PersonIcon, AlertCircleIcon, StarFilledIcon, ChartVerticalIcon, SearchIcon, ExternalIcon } from '@shopify/polaris-icons';
import { format, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import api from '../../services/api';

interface CustomerDrawerProps {
    customer: any;
    open: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function CustomerDrawer({ customer: initialCustomer, open, onClose, onUpdate }: CustomerDrawerProps) {
    const [customer, setCustomer] = useState(initialCustomer);
    const [newTag, setNewTag] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setCustomer(initialCustomer);
    }, [initialCustomer]);

    if (!open || !customer) return null;

    const handleUpdateTags = async (updatedTags: string[]) => {
        setLoading(true);
        try {
            const response = await api.post(`/customers/${customer.id}/tags`, { tags: updatedTags });
            setCustomer(response.data);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Failed to update tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const addTag = () => {
        if (newTag && !customer.tags.includes(newTag)) {
            const updated = [...customer.tags, newTag];
            handleUpdateTags(updated);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        const updated = customer.tags.filter((t: string) => t !== tagToRemove);
        handleUpdateTags(updated);
    };

    const toggleSpecialTag = (tag: string) => {
        const updated = customer.tags.includes(tag)
            ? customer.tags.filter((t: string) => t !== tag)
            : [...customer.tags, tag];
        handleUpdateTags(updated);
    };

    const openShopifyAdmin = () => {
        if (customer.shopify_domain && customer.shopifyCustomerId) {
            const domain = customer.shopify_domain;
            const id = customer.shopifyCustomerId;
            window.open(`https://${domain}/admin/customers/${id}`, '_blank');
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
                    width: '500px',
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
                        <InlineStack gap="200" blockAlign="center">
                            {(customer.segment === 'VIP Customer' || customer.tags?.includes('VIP')) && <Icon source={StarFilledIcon} tone="success" />}
                            <Text as="h2" variant="headingLg">{customer?.name || 'Guest'}</Text>
                        </InlineStack>
                        <InlineStack gap="200">
                            <Badge tone={(customer.segment === 'VIP Customer' || customer.tags?.includes('VIP')) ? 'success' : 'info'}>{customer.segment}</Badge>
                            <Badge tone={customer.risk_level === 'High' ? 'critical' : customer.risk_level === 'Medium' ? 'attention' : 'success'}>
                                {`${customer.risk_level} Risk`}
                            </Badge>
                        </InlineStack>
                    </BlockStack>
                    <Button icon={XIcon} onClick={onClose} variant="plain" />
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    <BlockStack gap="500">
                        {/* Tags Management */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={SearchIcon} />
                                    <Text as="h3" variant="headingSm">Customer Tags</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack gap="200" wrap>
                                    {(customer.tags || []).map((tag: string) => (
                                        <Tag key={tag} onRemove={() => removeTag(tag)}>{tag}</Tag>
                                    ))}
                                    {(!customer.tags || customer.tags.length === 0) && (
                                        <Text as="p" variant="bodySm" tone="subdued">No tags applied</Text>
                                    )}
                                </InlineStack>
                                <InlineStack gap="200">
                                    <div style={{ flex: 1 }}>
                                        <TextField
                                            label="Add tag"
                                            labelHidden
                                            value={newTag}
                                            onChange={setNewTag}
                                            placeholder="Add tag..."
                                            autoComplete="off"
                                            onBlur={addTag}
                                            disabled={loading}
                                        />
                                    </div>
                                    <Button onClick={addTag} loading={loading}>Add</Button>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Customer Value Intelligence */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={ChartVerticalIcon} />
                                    <Text as="h3" variant="headingSm">Customer Value Intelligence</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Lifetime Value (LTV)</Text>
                                    <Text as="p" variant="headingMd" fontWeight="bold" tone="success">
                                        ₹{(customer.total_spend ?? customer.totalSpent ?? 0).toLocaleString()}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Total Orders</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">{customer.total_orders || 0}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Average Order Value</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="semibold">₹{(customer.average_order_value || 0).toLocaleString()}</Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodyMd">Profit Contribution</Text>
                                    <Text as="p" variant="bodyMd" fontWeight="bold" tone="success">₹{(customer.profit_contribution || 0).toLocaleString()}</Text>
                                </InlineStack>
                                <Divider />
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">First Order</Text>
                                    <Text as="p" variant="bodySm">
                                        {customer.first_order_number ? (customer.first_order_number.startsWith('#') ? customer.first_order_number : `#${customer.first_order_number}`) : ''}
                                        {customer.first_order_date ? ` (${format(parseISO(customer.first_order_date), 'MMM dd, yyyy')})` : 'N/A'}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Last Order</Text>
                                    <Text as="p" variant="bodySm">
                                        {customer.last_order_number ? (customer.last_order_number.startsWith('#') ? customer.last_order_number : `#${customer.last_order_number}`) : ''}
                                        {customer.last_order_date ? ` (${format(parseISO(customer.last_order_date), 'MMM dd, yyyy')})` : 'N/A'}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Next Purchase Probability</Text>
                                    <Badge tone={
                                        (customer.purchase_probability || 0) > 70 ? 'success' :
                                            (customer.purchase_probability || 0) > 40 ? 'attention' : 'critical'
                                    }>
                                        {customer.purchase_probability != null ? `${customer.purchase_probability}%` : 'N/A'}
                                    </Badge>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Predicted Next Purchase</Text>
                                    <Text as="p" variant="bodySm" fontWeight="semibold">
                                        {customer.next_purchase_date ? format(parseISO(customer.next_purchase_date), 'MMM dd, yyyy') : 'Insufficient data'}
                                    </Text>
                                </InlineStack>
                                <InlineStack align="space-between">
                                    <Text as="p" variant="bodySm" tone="subdued">Average Order Gap</Text>
                                    <Text as="p" variant="bodySm">{customer.average_order_gap_days ? `${customer.average_order_gap_days} days` : 'N/A'}</Text>
                                </InlineStack>
                            </BlockStack>
                        </Card>

                        {/* Risk Intelligence */}
                        {(customer.risk_level !== 'Low' || customer.tags?.includes('High Risk')) && (
                            <Card>
                                <BlockStack gap="300">
                                    <InlineStack gap="200" align="start">
                                        <Icon source={AlertCircleIcon} tone="critical" />
                                        <Text as="h3" variant="headingSm">Risk Intelligence</Text>
                                    </InlineStack>
                                    <Divider />
                                    <InlineStack align="space-between">
                                        <Text as="p" variant="bodyMd">Cancellation Count</Text>
                                        <Badge tone={customer.cancellation_count > 2 ? 'critical' : 'attention'}>{(customer.cancellation_count || 0).toString()}</Badge>
                                    </InlineStack>
                                    <InlineStack align="space-between">
                                        <Text as="p" variant="bodyMd">Return Count</Text>
                                        <Badge tone={customer.return_count > 1 ? 'critical' : 'info'}>{(customer.return_count || 0).toString()}</Badge>
                                    </InlineStack>
                                    {(customer.risk_factors && customer.risk_factors.length > 0) || customer.tags?.includes('High Risk') && (
                                        <BlockStack gap="200">
                                            <Text as="p" variant="bodySm" tone="subdued">Risk Factors:</Text>
                                            <InlineStack gap="200" wrap>
                                                {customer.risk_factors?.map((risk: string) => (
                                                    <Badge key={risk} tone="critical">{risk}</Badge>
                                                ))}
                                                {customer.tags?.includes('High Risk') && <Badge tone="critical">Marked as High Risk</Badge>}
                                            </InlineStack>
                                        </BlockStack>
                                    )}
                                </BlockStack>
                            </Card>
                        )}

                        {/* Contact Info */}
                        <Card>
                            <BlockStack gap="300">
                                <InlineStack gap="200" align="start">
                                    <Icon source={PersonIcon} />
                                    <Text as="h3" variant="headingSm">Contact Information</Text>
                                </InlineStack>
                                <Divider />
                                <Text as="p" variant="bodyMd">{customer.email}</Text>
                                <Text as="p" variant="bodyMd">{customer.phone}</Text>
                                <Text as="p" variant="bodySm" tone="subdued">{customer.city}, {customer.state}</Text>
                            </BlockStack>
                        </Card>
                    </BlockStack>
                </div>

                {/* Footer Actions */}
                <div style={{ padding: '20px', borderTop: '1px solid #e1e3e5' }}>
                    <BlockStack gap="300">
                        <InlineStack gap="300" wrap={false}>
                            <Button
                                fullWidth
                                variant="secondary"
                                icon={customer.tags?.includes('VIP') ? undefined : StarFilledIcon}
                                tone={customer.tags?.includes('VIP') ? 'critical' : 'success'}
                                onClick={() => toggleSpecialTag('VIP')}
                                loading={loading}
                            >
                                {customer.tags?.includes('VIP') ? 'Remove VIP Status' : 'Mark as VIP Customer'}
                            </Button>
                            <Button
                                fullWidth
                                variant="secondary"
                                tone={customer.tags?.includes('High Risk') ? 'success' : 'critical'}
                                icon={AlertCircleIcon}
                                onClick={() => toggleSpecialTag('High Risk')}
                                loading={loading}
                            >
                                {customer.tags?.includes('High Risk') ? 'Safe Customer' : 'Mark as High Risk'}
                            </Button>
                        </InlineStack>
                        <InlineStack align="space-between">
                            <Button variant="tertiary" onClick={onClose}>Close</Button>
                            <Button
                                variant="tertiary"
                                icon={ExternalIcon}
                                onClick={openShopifyAdmin}
                            >
                                View Full History
                            </Button>
                        </InlineStack>
                    </BlockStack>
                </div>
            </div>
        </>
    );
}

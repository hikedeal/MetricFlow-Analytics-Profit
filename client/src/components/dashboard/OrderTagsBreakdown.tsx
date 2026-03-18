import { BlockStack, Text, InlineStack, Badge, Divider, Icon } from '@shopify/polaris';
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from '@shopify/polaris-icons';
import { formatCurrency } from '../../utils/currency';

interface Props {
    data?: {
        tagBreakdown: any[];
        rtoPercentage: number;
        totalTaggedOrders: number;
    };
    isLoading: boolean;
    currency?: string;
}

// ... existing getTagConfig ...
const getTagConfig = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('fraud') || lower.includes('risk') || lower.includes('blacklist')) {
        return { color: '#ef4444', bg: '#fef2f2', icon: AlertCircleIcon, label: 'Critical' };
    }
    if (lower.includes('vip') || lower.includes('loyal')) {
        return { color: '#10b981', bg: '#ecfdf5', icon: CheckCircleIcon, label: 'Positive' };
    }
    if (lower.includes('return') || lower.includes('cancel')) {
        return { color: '#f59e0b', bg: '#fffbeb', icon: InfoIcon, label: 'Warning' };
    }
    return { color: '#6366f1', bg: '#eef2ff', icon: InfoIcon, label: 'Info' };
};

export function OrderTagsBreakdown({ data, isLoading, currency }: Props) {
    if (isLoading || !data) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading tag insights...</div>;
    }

    const { tagBreakdown } = data;
    const sortedTags = [...tagBreakdown].sort((a, b) => b.count - a.count).slice(0, 5);

    if (sortedTags.length === 0) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No tagged orders detected.</div>;
    }

    return (
        <BlockStack gap="400">
            {sortedTags.map((tag, index) => {
                const config = getTagConfig(tag.tag);
                const percent = (tag.count / data.totalTaggedOrders) * 100;

                return (
                    <div key={tag.tag}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Icon Box */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: config.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: config.color,
                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                            }}>
                                <Icon source={config.icon} tone="inherit" />
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <InlineStack align="space-between" blockAlign="center">
                                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                                        {tag.tag}
                                    </Text>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Text as="span" variant="bodySm" fontWeight="bold">
                                            {tag.count}
                                        </Text>
                                        <Badge tone={config.label === 'Critical' ? 'critical' : config.label === 'Warning' ? 'warning' : config.label === 'Positive' ? 'success' : 'info'}>
                                            {config.label}
                                        </Badge>
                                    </div>
                                </InlineStack>

                                {/* Progress Bar */}
                                <div style={{
                                    marginTop: '8px',
                                    width: '100%',
                                    height: '6px',
                                    background: '#f3f4f6',
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${percent}%`,
                                        height: '100%',
                                        background: config.color,
                                        borderRadius: '3px',
                                        transition: 'width 0.5s ease-out'
                                    }} />
                                </div>

                                <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <Text as="span" variant="bodyXs" tone="subdued">
                                        {percent.toFixed(1)}% of tagged orders
                                    </Text>
                                    {tag.totalLoss > 0 && (
                                        <Text as="span" variant="bodyXs" tone="critical">
                                            Potential Loss: {formatCurrency(tag.totalLoss, currency || 'USD')}
                                        </Text>
                                    )}
                                </div>
                            </div>
                        </div>
                        {index < sortedTags.length - 1 && (
                            <div style={{ margin: '16px 0 16px 56px' }}>
                                <Divider />
                            </div>
                        )}
                    </div>
                );
            })}
        </BlockStack>
    );
}

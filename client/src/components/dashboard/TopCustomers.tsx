import { BlockStack, Text, InlineStack, Badge, Divider } from '@shopify/polaris';
import { convertCurrency, formatCurrency } from '../../utils/currency';

interface Props {
    data?: any[];
    isLoading: boolean;
    currency?: string;
    baseCurrency?: string;
    exchangeRates?: Record<string, number> | null;
}

export function TopCustomers({ data, isLoading, currency = 'USD', baseCurrency = 'USD', exchangeRates }: Props) {
    if (isLoading || !data) {
        return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Loading customer insights...</div>;
    }

    if (data.length === 0) {
        return <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No customer data available yet.</div>
    }

    // Convert currency helper
    const convert = (val: number) => convertCurrency(val, baseCurrency, currency, exchangeRates || undefined);

    // Find max spent for progress bars
    // Need to convert values first to ensure comparing apples to apples if rates involved (though simple scalar)
    const processedData = (data || []).filter(Boolean).map(c => {
        const rawSpent = typeof c?.totalSpent === 'number' ? c.totalSpent : parseFloat(c?.totalSpent || '0') || 0;
        return {
            ...c,
            totalSpent: convert(rawSpent)
        };
    });

    const maxSpent = Math.max(...processedData.map(c => c.totalSpent));

    return (
        <BlockStack gap="050">
            {processedData.map((customer, index) => {
                const spent = customer.totalSpent;
                const progress = maxSpent > 0 ? (spent / maxSpent) * 100 : 0;
                const name = `${customer.firstName || ''} ${customer.lastName || 'Guest'}`.trim();
                const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                return (
                    <div key={customer.id || index}>
                        <div style={{
                            padding: '16px 0',
                            transition: 'background-color 0.2s',
                            cursor: 'pointer'
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <InlineStack align="space-between" blockAlign="center">
                                {/* Customer Info */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: index < 3 ? 'white' : '#4b5563',
                                        fontWeight: 'bold',
                                        boxShadow: index < 3 ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
                                    }}>
                                        {initials}
                                    </div>
                                    <BlockStack gap="050">
                                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                                            {name}
                                        </Text>
                                        <Text as="p" variant="bodyXs" tone="subdued">
                                            {customer.totalOrders} orders
                                        </Text>
                                    </BlockStack>
                                </div>

                                {/* Spend & Segment */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '120px', textAlign: 'right' }}>
                                        <Text as="p" variant="bodyMd" fontWeight="bold">
                                            {formatCurrency(spent, currency || 'USD')}
                                        </Text>
                                        <div style={{
                                            width: '100%',
                                            height: '4px',
                                            background: '#f3f4f6',
                                            borderRadius: '2px',
                                            marginTop: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                background: '#10b981',
                                                borderRadius: '2px'
                                            }} />
                                        </div>
                                    </div>
                                    <div style={{ width: '80px', textAlign: 'right' }}>
                                        <Badge tone={customer.segment === 'VIP' ? 'success' : 'info'}>
                                            {customer.segment || 'New'}
                                        </Badge>
                                    </div>
                                </div>
                            </InlineStack>
                        </div>
                        {index < data.length - 1 && <Divider />}
                    </div>
                );
            })}
        </BlockStack>
    );
}

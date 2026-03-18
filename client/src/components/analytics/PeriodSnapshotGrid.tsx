import { BlockStack, Text, InlineStack } from '@shopify/polaris';
import { formatCurrency } from '../../utils/currency';
import { PeriodSnapshot } from '../../hooks/useDashboardData';
import { useState } from 'react';
import { DetailedSnapshotModal } from './DetailedSnapshotModal';

interface Props {
    snapshots: PeriodSnapshot[];
    currency: string;
    onPeriodClick?: (snapshot: PeriodSnapshot, index: number) => void;
    selectedPeriodIndex?: number;
}

export function PeriodSnapshotGrid({ snapshots, currency, onPeriodClick, selectedPeriodIndex }: Props) {
    // Defines colors for cards based on index/type
    const getColors = (index: number) => {
        // First two (Today, Yesterday) -> Green
        if (index < 2) return { bg: '#458b54', text: 'white', label: 'white' };
        // Middle two (MTD, Forecast) -> Teal
        if (index < 4) return { bg: '#358a98', text: 'white', label: 'white' };
        // Last one (Last Month) -> Blue
        return { bg: '#2b7db5', text: 'white', label: 'white' };
    };

    const [selectedSnapshot, setSelectedSnapshot] = useState<PeriodSnapshot | null>(null);

    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {(!snapshots || snapshots.length === 0) ? (
                    <div style={{ padding: '20px', textAlign: 'center', gridColumn: '1 / -1', background: '#f9fafb', borderRadius: '8px' }}>
                        <Text as="p" variant="bodyMd" tone="subdued">No snapshot data available.</Text>
                    </div>
                ) : (
                    snapshots.map((snap, index) => {
                        const colors = getColors(index);
                        const isSelected = selectedPeriodIndex === index;
                        return (
                            <div
                                key={index}
                                onClick={() => onPeriodClick?.(snap, index)}
                                style={{
                                    background: 'white',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    boxShadow: isSelected ? '0 4px 12px rgba(102, 126, 234, 0.4)' : '0 1px 3px rgba(0,0,0,0.1)',
                                    border: isSelected ? '2px solid #667eea' : '1px solid #e1e3e5',
                                    cursor: 'pointer',
                                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Header */}
                                <div style={{ background: colors.bg, padding: '12px 16px', color: colors.text }}>
                                    <BlockStack gap="050">
                                        <Text as="h3" variant="headingSm" tone="inherit">{snap.label}</Text>
                                        <Text as="p" variant="bodyXs" tone="inherit" fontWeight="regular">{snap.range}</Text>
                                    </BlockStack>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '16px' }}>
                                    <BlockStack gap="400">
                                        <BlockStack gap="100">
                                            <InlineStack gap="200" align="start">
                                                <Text as="p" variant="bodySm" tone="subdued">Sales</Text>
                                                {snap.salesChange !== 0 && (
                                                    <span style={{ fontSize: '11px', color: snap.salesChange > 0 ? '#16a34a' : '#ea580c', fontWeight: 600 }}>
                                                        {snap.salesChange > 0 ? '+' : ''}{snap.salesChange}%
                                                    </span>
                                                )}
                                            </InlineStack>
                                            <Text as="p" variant="headingLg">{formatCurrency(snap.sales, currency)}</Text>
                                        </BlockStack>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px' }}>
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodyXs" tone="subdued">Orders / Units</Text>
                                                <Text as="p" variant="bodyMd">{snap.orders} / {snap.units}</Text>
                                            </BlockStack>
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodyXs" tone="subdued">Returns</Text>
                                                <Text as="p" variant="bodyMd">{snap.returns}</Text>
                                            </BlockStack>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginTop: '8px' }}>
                                                <BlockStack gap="050">
                                                    <Text as="p" variant="bodyXs" tone="subdued">Adv. cost</Text>
                                                    <Text as="p" variant="bodyMd">{formatCurrency(snap.advCost, currency)}</Text>
                                                </BlockStack>
                                            </div>
                                        </div>

                                        <BlockStack gap="100">
                                            <InlineStack gap="200" align="start">
                                                <Text as="p" variant="bodySm" tone="subdued">Net profit</Text>
                                                {snap.profitChange !== 0 && (
                                                    <span style={{ fontSize: '11px', color: snap.profitChange > 0 ? '#16a34a' : '#ea580c', fontWeight: 600 }}>
                                                        {snap.profitChange > 0 ? '+' : ''}{snap.profitChange}%
                                                    </span>
                                                )}
                                            </InlineStack>
                                            <Text as="p" variant="headingMd">{formatCurrency(snap.netProfit, currency)}</Text>
                                        </BlockStack>
                                    </BlockStack>
                                </div>

                                {/* Footer Link */}
                                <div
                                    style={{ padding: '8px 16px', borderTop: '1px solid #f1f2f3', textAlign: 'center', cursor: 'pointer' }}
                                    onClick={() => setSelectedSnapshot(snap)}
                                >
                                    <Text as="p" variant="bodySm" tone="base" fontWeight="medium" alignment="center">
                                        <span style={{ color: '#2563eb' }}>More</span>
                                    </Text>
                                </div>
                            </div >
                        );
                    })
                )}
            </div >

            {
                selectedSnapshot && (
                    <DetailedSnapshotModal
                        open={!!selectedSnapshot}
                        onClose={() => setSelectedSnapshot(null)}
                        snapshot={selectedSnapshot}
                        currency={currency}
                    />
                )
            }
        </>
    );
}

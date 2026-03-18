import { Modal, Text, BlockStack, InlineGrid, Card, Box, Pagination } from '@shopify/polaris';
import { ProductsTable } from './ProductsTable';
import { useProducts } from '../../hooks/useProducts';
import { useState } from 'react';
import { CollectionData } from './CollectionsTable';

interface CollectionDetailsModalProps {
    collection: CollectionData | null;
    onClose: () => void;
    dateRange: { startDate: string; endDate: string };
    onRowClick: (product: any) => void;
    onBulkExport: (selectedIds: string[], format: 'csv' | 'excel') => void;
}

export function CollectionDetailsModal({ collection, onClose, dateRange, onRowClick, onBulkExport }: CollectionDetailsModalProps) {
    const [page, setPage] = useState(1);

    // Fetch products for this specific collection (productType)
    const { data, isLoading } = useProducts({
        page,
        limit: 20,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        productType: collection?.name || '',
    });

    if (!collection) return null;

    return (
        <Modal
            open={!!collection}
            onClose={onClose}
            title={collection.name}
            size="large"
        >
            <Modal.Section>
                <BlockStack gap="400">
                    {/* Summary Cards */}
                    <InlineGrid columns={3} gap="400">
                        <Card>
                            <BlockStack gap="200">
                                <Text as="p" variant="bodySm" tone="subdued">Total Revenue</Text>
                                <Text as="h3" variant="headingLg">₹{collection.totalRevenue.toLocaleString()}</Text>
                            </BlockStack>
                        </Card>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="p" variant="bodySm" tone="subdued">Items Sold</Text>
                                <Text as="h3" variant="headingLg">{collection.itemsSold.toLocaleString()}</Text>
                            </BlockStack>
                        </Card>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="p" variant="bodySm" tone="subdued">Product Count</Text>
                                <Text as="h3" variant="headingLg">{collection.productCount}</Text>
                            </BlockStack>
                        </Card>
                    </InlineGrid>

                    <Box paddingBlockStart="400">
                        <Text as="h3" variant="headingMd">Products in this Collection</Text>
                    </Box>

                    {/* Product List */}
                    <ProductsTable
                        products={data?.data || []}
                        loading={isLoading}
                        onRowClick={onRowClick}
                        onBulkInventoryUpdate={() => { }}
                        canUpdateInventory={false}
                        onBulkExport={onBulkExport}
                    />

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <Pagination
                            hasPrevious={page > 1}
                            hasNext={data?.meta?.total_pages > page}
                            onPrevious={() => setPage(p => p - 1)}
                            onNext={() => setPage(p => p + 1)}
                        />
                    </div>
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

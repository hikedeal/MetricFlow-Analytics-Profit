import { IndexTable, Card, Text, Badge, useIndexResourceState } from '@shopify/polaris';

export interface CollectionData {
    name: string;
    totalRevenue: number;
    itemsSold: number;
    productCount: number;
    avgPrice: number;
}

interface CollectionsTableProps {
    collections: CollectionData[];
    loading: boolean;
    onRowClick: (collectionName: string) => void;
}

export function CollectionsTable({ collections, loading, onRowClick }: CollectionsTableProps) {
    const resourceName = {
        singular: 'collection',
        plural: 'collections',
    };

    const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(collections as any);

    const rowMarkup = collections.map(
        ({ name, totalRevenue, itemsSold, productCount, avgPrice }, index) => (
            <IndexTable.Row
                id={name}
                key={name}
                selected={selectedResources.includes(name)}
                position={index}
                onClick={() => onRowClick(name)}
            >
                <IndexTable.Cell>
                    <Text variant="bodyMd" fontWeight="bold" as="span">{name}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">₹{totalRevenue.toLocaleString()}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">{itemsSold.toLocaleString()}</Text>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Badge tone="info">{`${productCount} Products`}</Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                    <Text variant="bodyMd" as="span">₹{avgPrice.toFixed(2)}</Text>
                </IndexTable.Cell>
            </IndexTable.Row>
        ),
    );

    return (
        <Card padding="0">
            <IndexTable
                resourceName={resourceName}
                itemCount={collections.length}
                selectedItemsCount={
                    allResourcesSelected ? 'All' : selectedResources.length
                }
                onSelectionChange={handleSelectionChange}
                headings={[
                    { title: 'Collection Name' },
                    { title: 'Total Revenue' },
                    { title: 'Items Sold' },
                    { title: 'Product Count' },
                    { title: 'Avg. Price' },
                ]}
                loading={loading}
                selectable={false}
            >
                {rowMarkup}
            </IndexTable>
        </Card>
    );
}

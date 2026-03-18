import { BlockStack, Card, Text, TextField, FormLayout, Button, Spinner, Badge, InlineStack, Box } from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../hooks/useSettings';
import api from '../../services/api';

export function OrderTagSettings() {
    const { settings, saveSettings, loading, saving } = useSettings();

    const [cancelledTags, setCancelledTags] = useState('');
    const [rtoTags, setRtoTags] = useState('');
    const [returnTags, setReturnTags] = useState('');
    const [editedTags, setEditedTags] = useState('');

    const [shopifyTags, setShopifyTags] = useState<string[]>([]);
    const [fetchingTags, setFetchingTags] = useState(false);

    const fetchShopifyTags = useCallback(async () => {
        try {
            setFetchingTags(true);
            const response = await api.get('/orders/tags');
            setShopifyTags(response.data);
        } catch (error) {
            console.error('Error fetching shopify tags:', error);
        } finally {
            setFetchingTags(false);
        }
    }, []);

    useEffect(() => {
        if (!loading) {
            setCancelledTags(settings.cancelledTags ? settings.cancelledTags.join(', ') : '');
            setRtoTags(settings.rtoTags ? settings.rtoTags.join(', ') : '');
            setReturnTags(settings.returnTags ? settings.returnTags.join(', ') : '');
            setEditedTags(settings.editedTags ? settings.editedTags.join(', ') : '');
            fetchShopifyTags();
        }
    }, [settings, loading, fetchShopifyTags]);

    const handleTagAppend = (tag: string, category: 'cancelled' | 'rto' | 'return' | 'edited') => {
        const currentVal = category === 'cancelled' ? cancelledTags : category === 'rto' ? rtoTags : category === 'return' ? returnTags : editedTags;
        const setVal = category === 'cancelled' ? setCancelledTags : category === 'rto' ? setRtoTags : category === 'return' ? setReturnTags : setEditedTags;

        const tags = currentVal.split(',').map(t => t.trim()).filter(Boolean);
        if (!tags.includes(tag)) {
            const newVal = tags.length > 0 ? `${currentVal}, ${tag}` : tag;
            setVal(newVal);
        }
    };

    const handleSave = () => {
        const parseTags = (str: string) => str.split(',').map(t => t.trim()).filter(Boolean);

        saveSettings({
            cancelledTags: parseTags(cancelledTags),
            rtoTags: parseTags(rtoTags),
            returnTags: parseTags(returnTags),
            editedTags: parseTags(editedTags)
        });
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><Spinner size="large" /></div>;

    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between">
                        <Text as="h2" variant="headingMd">Order Classification by Tags</Text>
                        <Button
                            icon={RefreshIcon}
                            onClick={fetchShopifyTags}
                            loading={fetchingTags}
                            variant="tertiary"
                        >
                            Refresh Shopify Tags
                        </Button>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Map your Shopify order tags to standard statuses. Use commas to separate multiple tags.
                    </Text>
                    <FormLayout>
                        <Box>
                            <BlockStack gap="200">
                                <TextField
                                    label="Cancelled Order Tags"
                                    value={cancelledTags}
                                    onChange={setCancelledTags}
                                    autoComplete="off"
                                    placeholder="Cancelled, Cancel, Void"
                                    helpText="Orders with these tags will be counted as cancellations."
                                />
                                <TagSuggestions
                                    tags={shopifyTags}
                                    onSelect={(tag) => handleTagAppend(tag, 'cancelled')}
                                    loading={fetchingTags}
                                />
                            </BlockStack>
                        </Box>

                        <Box>
                            <BlockStack gap="200">
                                <TextField
                                    label="RTO (Return to Origin) Tags"
                                    value={rtoTags}
                                    onChange={setRtoTags}
                                    autoComplete="off"
                                    placeholder="RTO, Undelivered, Return"
                                    helpText="Orders with these tags will be marked as RTO."
                                />
                                <TagSuggestions
                                    tags={shopifyTags}
                                    onSelect={(tag) => handleTagAppend(tag, 'rto')}
                                    loading={fetchingTags}
                                />
                            </BlockStack>
                        </Box>

                        <Box>
                            <BlockStack gap="200">
                                <TextField
                                    label="Customer Return Tags"
                                    value={returnTags}
                                    onChange={setReturnTags}
                                    autoComplete="off"
                                    placeholder="Return, Refunded, CustomerReturn"
                                    helpText="Orders with these tags will be marked as Customer Returns (different from RTO)."
                                />
                                <TagSuggestions
                                    tags={shopifyTags}
                                    onSelect={(tag) => handleTagAppend(tag, 'return')}
                                    loading={fetchingTags}
                                />
                            </BlockStack>
                        </Box>

                        <Box>
                            <BlockStack gap="200">
                                <TextField
                                    label="Edited Order Tags"
                                    value={editedTags}
                                    onChange={setEditedTags}
                                    autoComplete="off"
                                    placeholder="Edited, Modified"
                                    helpText="Track orders that were modified after placement."
                                />
                                <TagSuggestions
                                    tags={shopifyTags}
                                    onSelect={(tag) => handleTagAppend(tag, 'edited')}
                                    loading={fetchingTags}
                                />
                            </BlockStack>
                        </Box>
                    </FormLayout>

                    <Box
                        padding="400"
                        background="bg-surface-secondary"
                        borderRadius="200"
                        borderWidth="025"
                        borderColor="border"
                    >
                        <BlockStack gap="200">
                            <Text as="h3" variant="headingSm">💡 How to use this classification</Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                                These mappings help the app organize your orders in the analytics dashboard:
                            </Text>
                            <Box paddingInlineStart="400">
                                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#6d7175' }}>
                                    <li><strong>Cancelled:</strong> Orders stopped before fulfillment.</li>
                                    <li><strong>RTO (Return to Origin):</strong> Courier returns due to failed delivery.</li>
                                    <li><strong>Customer Returns:</strong> Items returned by customers after delivery.</li>
                                    <li><strong>Edited:</strong> Orders where items or quantities were changed.</li>
                                </ul>
                            </Box>
                            <Text as="p" variant="bodySm" tone="subdued">
                                <strong>Pro Tip:</strong> Click the suggestions above to instantly add tags from your real Shopify data.
                            </Text>
                        </BlockStack>
                    </Box>
                </BlockStack>
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" loading={saving} onClick={handleSave}>Apply Changes</Button>
            </div>
        </BlockStack>
    );
}

function TagSuggestions({ tags, onSelect, loading }: { tags: string[], onSelect: (tag: string) => void, loading: boolean }) {
    if (loading) return <Text as="p" variant="bodyXs" tone="subdued">Loading available tags...</Text>;
    if (tags.length === 0) return null;

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            <Text as="span" variant="bodyXs" tone="subdued">Available in Shopify: </Text>
            {tags.map(tag => (
                <div key={tag} onClick={() => onSelect(tag)} style={{ cursor: 'pointer' }}>
                    <Badge tone="info">{tag}</Badge>
                </div>
            ))}
        </div>
    );
}

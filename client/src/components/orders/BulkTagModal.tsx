import { Modal, TextField, Text, BlockStack } from '@shopify/polaris';
import { useState } from 'react';

interface BulkTagModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (tags: string[]) => void;
    selectedCount: number | 'All';
}

export function BulkTagModal({ open, onClose, onConfirm, selectedCount }: BulkTagModalProps) {
    const [tagInput, setTagInput] = useState('');

    const handleConfirm = () => {
        const tags = tagInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
        if (tags.length > 0) {
            onConfirm(tags);
            setTagInput('');
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Add tags to ${selectedCount === 'All' ? 'all matching' : selectedCount} orders`}
            primaryAction={{
                content: 'Add Tags',
                onAction: handleConfirm,
                disabled: !tagInput.trim()
            }}
            secondaryActions={[{
                content: 'Cancel',
                onAction: onClose
            }]}
        >
            <Modal.Section>
                <BlockStack gap="400">
                    <Text as="p">
                        Enter tags separated by commas to add them to the selected orders.
                    </Text>
                    <TextField
                        label="Tags"
                        value={tagInput}
                        onChange={setTagInput}
                        placeholder="e.g. VIP, Wholesale, Urgent"
                        autoComplete="off"
                    />
                </BlockStack>
            </Modal.Section>
        </Modal>
    );
}

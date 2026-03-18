import { BlockStack, Card, Text, Button, InlineStack, Avatar, Badge, ResourceList, ResourceItem } from '@shopify/polaris';

export function TeamSettings() {
    const users = [
        { id: '1', name: 'Arnav Kumar', email: 'admin@store.com', role: 'Admin', status: 'active' },
        { id: '2', name: 'Marketing Team', email: 'marketing@store.com', role: 'Marketing', status: 'active' },
        { id: '3', name: 'Finance User', email: 'finance@store.com', role: 'Finance', status: 'pending' },
    ];

    return (
        <BlockStack gap="500">
            <InlineStack align="space-between">
                <Text as="h2" variant="headingLg">Team Management</Text>
                <Button variant="primary">Invite User</Button>
            </InlineStack>

            <Card>
                <ResourceList
                    resourceName={{ singular: 'user', plural: 'users' }}
                    items={users}
                    renderItem={(item) => {
                        const { id, name, email, role, status } = item;
                        return (
                            <ResourceItem
                                id={id}
                                url="#"
                                media={
                                    <Avatar customer size="md" name={name} />
                                }
                                accessibilityLabel={`View details for ${name}`}
                            >
                                <InlineStack align="space-between" blockAlign="center">
                                    <div style={{ width: '200px' }}>
                                        <Text variant="bodyMd" fontWeight="bold" as="h3">
                                            {name}
                                        </Text>
                                        <Text as="p" variant="bodyMd" tone="subdued">{email}</Text>
                                    </div>
                                    <Badge tone={role === 'Admin' ? 'critical' : 'info'}>{role}</Badge>
                                    <Badge tone={status === 'active' ? 'success' : 'attention'}>{status}</Badge>
                                </InlineStack>
                            </ResourceItem>
                        );
                    }}
                />
            </Card>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => setTimeout(() => { }, 1000)}>Save Team Settings</Button>
            </div>
        </BlockStack>
    );
}

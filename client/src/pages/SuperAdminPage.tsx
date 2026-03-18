import { useState, useEffect } from 'react';
import { Page, Card, Text, BlockStack, Button, TextField, Badge, Banner } from '@shopify/polaris';
import { ImportIcon, RefreshIcon, LockIcon } from '@shopify/polaris-icons';
import api from '../services/api';

interface GlobalStats {
    totalStores: number;
    activeStores: number;
    inactiveStores: number;
    totalRevenueManaged: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
}

interface Store {
    id: string;
    storeName: string;
    shopifyDomain: string;
    email: string;
    isActive: boolean;
    installedAt: string;
    lastSyncAt: string | null;
    _count: {
        orders: number;
        customers: number;
        products: number;
    };
}

export function SuperAdminPage() {
    const [adminKey, setAdminKey] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        const storedKey = localStorage.getItem('adminKey');
        if (storedKey) {
            setAdminKey(storedKey);
            verifyKey(storedKey);
        }
    }, []);

    const verifyKey = async (key: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/admin/stats', {
                headers: { 'x-admin-key': key }
            });
            if (response.data.success) {
                setStats(response.data.data);
                setIsAuthenticated(true);
                localStorage.setItem('adminKey', key);
                fetchStores(key);
            }
        } catch (err) {
            setError('Invalid Admin Key');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const fetchStores = async (key: string) => {
        try {
            const response = await api.get('/admin/stores', {
                headers: { 'x-admin-key': key }
            });
            if (response.data.success) {
                setStores(response.data.data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDownloadDump = async (storeId: string) => {
        try {
            const response = await api.get(`/admin/stores/${storeId}/dump`, {
                headers: { 'x-admin-key': adminKey },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `store_dump_${storeId}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Failed to download dump', err);
            alert('Failed to generate dump. Check console.');
        }
    };

    if (!isAuthenticated) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f6f7' }}>
                <div style={{ width: '400px' }}>
                    <Card>
                        <BlockStack gap="400">
                            <div style={{ textAlign: 'center' }}>
                                <Text as="h2" variant="headingLg">Super Admin Access</Text>
                                <Text as="p" tone="subdued">Enter your secret key to access the backend.</Text>
                            </div>

                            <TextField
                                label="Admin Key"
                                type="password"
                                value={adminKey}
                                onChange={setAdminKey}
                                autoComplete="off"
                                prefix={<LockIcon />}
                            />

                            {error && (
                                <Banner tone="critical">
                                    <p>{error}</p>
                                </Banner>
                            )}

                            <Button variant="primary" onClick={() => verifyKey(adminKey)} loading={loading} fullWidth>
                                Access Backend
                            </Button>
                        </BlockStack>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <Page
            title="Super Admin Backend"
            subtitle="Global Overview & Data Management"
            fullWidth
            primaryAction={
                <Button icon={RefreshIcon} onClick={() => { verifyKey(adminKey); }}>Refresh Data</Button>
            }
            secondaryActions={[
                {
                    content: 'Logout',
                    onAction: () => {
                        localStorage.removeItem('adminKey');
                        setIsAuthenticated(false);
                        setAdminKey('');
                    }
                }
            ]}
        >
            <BlockStack gap="500">
                {/* Global Stats */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingXs" tone="subdued">Active Stores</Text>
                                <Text as="p" variant="headingXl">{stats.activeStores} <span style={{ fontSize: '14px', color: '#6d7175' }}>/ {stats.totalStores}</span></Text>
                            </BlockStack>
                        </Card>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingXs" tone="subdued">Total Revenue Managed</Text>
                                <Text as="p" variant="headingXl">${stats.totalRevenueManaged.toLocaleString()}</Text>
                            </BlockStack>
                        </Card>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingXs" tone="subdued">Total Orders</Text>
                                <Text as="p" variant="headingXl">{stats.totalOrders.toLocaleString()}</Text>
                            </BlockStack>
                        </Card>
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingXs" tone="subdued">Total Customers</Text>
                                <Text as="p" variant="headingXl">{stats.totalCustomers.toLocaleString()}</Text>
                            </BlockStack>
                        </Card>
                    </div>
                )}

                <Card>
                    <BlockStack gap="400">
                        <Text as="h2" variant="headingMd">All Users (Stores)</Text>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e1e3e5' }}>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Store Name</th>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Domain</th>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Status</th>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Data Count</th>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Installed At</th>
                                        <th style={{ padding: '12px', color: '#6d7175' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stores.map(store => (
                                        <tr key={store.id} style={{ borderBottom: '1px solid #f1f2f3' }}>
                                            <td style={{ padding: '16px 12px', fontWeight: 600 }}>{store.storeName || 'N/A'}</td>
                                            <td style={{ padding: '16px 12px' }}>{store.shopifyDomain}</td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <Badge tone={store.isActive ? 'success' : 'critical'}>
                                                    {store.isActive ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <div style={{ fontSize: '12px', color: '#6d7175' }}>
                                                    {store._count.orders} Orders<br />
                                                    {store._count.customers} Customers
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                {new Date(store.installedAt).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '16px 12px' }}>
                                                <Button size="slim" icon={ImportIcon} onClick={() => handleDownloadDump(store.id)}>
                                                    Download Dump
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </BlockStack>
                </Card>
            </BlockStack>
        </Page>
    );
}

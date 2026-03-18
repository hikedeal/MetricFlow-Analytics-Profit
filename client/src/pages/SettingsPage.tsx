import { Layout, BlockStack, Text, ActionList } from '@shopify/polaris';
import { useState } from 'react';
import {
    SettingsIcon,
    BankIcon,
    NoteIcon,
    NotificationIcon,
    DatabaseIcon,
    ChartVerticalIcon,
    AppsIcon
} from '@shopify/polaris-icons';

import { GeneralSettings } from '../components/settings/GeneralSettings';
import { ProfitSettings } from '../components/settings/ProfitSettings';
import { OrderTagSettings } from '../components/settings/OrderTagSettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { DataSyncSettings } from '../components/settings/DataSyncSettings';
import { IntelligenceSettings } from '../components/settings/IntelligenceSettings';
import { IntegrationSettings } from '../components/settings/IntegrationSettings';

export function SettingsPage() {
    const [activeSection, setActiveSection] = useState('general');

    const sections = [
        { id: 'general', label: 'General & Preferences', icon: SettingsIcon, component: GeneralSettings },
        { id: 'profit', label: 'Profit & Costs', icon: BankIcon, component: ProfitSettings },
        { id: 'tags', label: 'Order Tags', icon: NoteIcon, component: OrderTagSettings },
        { id: 'notifications', label: 'Alerts & Notifications', icon: NotificationIcon, component: NotificationSettings },
        { id: 'sync', label: 'Data Sync', icon: DatabaseIcon, component: DataSyncSettings },
        // Team settings removed as per request
        { id: 'intelligence', label: 'Intelligence & Reports', icon: ChartVerticalIcon, component: IntelligenceSettings },
        { id: 'integrations', label: 'Integrations', icon: AppsIcon, component: IntegrationSettings },
    ];

    const ActiveComponent = sections.find(s => s.id === activeSection)?.component || GeneralSettings;

    return (
        <div style={{ background: '#f6f6f7', minHeight: '100vh', padding: '24px' }}>
            <BlockStack gap="600">
                {/* Premium Header - Matching Dashboard */}
                <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                    padding: '32px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
                }}>
                    <BlockStack gap="200">
                        <Text as="h1" variant="heading2xl" tone="inherit">
                            Settings & Configuration
                        </Text>
                        <Text as="p" variant="bodyLg" tone="inherit">
                            Manage your app preferences, integrations, and operational parameters
                        </Text>
                    </BlockStack>
                </div>

                <Layout>
                    <Layout.Section variant="oneThird">
                        <div style={{
                            background: 'white',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            padding: '8px 0'
                        }}>
                            <ActionList
                                actionRole="menuitem"
                                items={sections.map(section => ({
                                    content: section.label,
                                    icon: section.icon,
                                    active: activeSection === section.id,
                                    onAction: () => setActiveSection(section.id),
                                }))}
                            />
                        </div>
                    </Layout.Section>

                    <Layout.Section>
                        <ActiveComponent />
                    </Layout.Section>
                </Layout>
            </BlockStack>
        </div>
    );
}

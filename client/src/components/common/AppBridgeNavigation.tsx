import React from 'react';
import { NavigationMenu } from '@shopify/app-bridge-react';

export const AppBridgeNavigation: React.FC = () => {
    return (
        <NavigationMenu
            navigationLinks={[
                {
                    label: 'Dashboard',
                    destination: '/dashboard',
                },
                {
                    label: 'Segments',
                    destination: '/segments',
                },
                {
                    label: 'Orders',
                    destination: '/orders',
                },
                {
                    label: 'Customers',
                    destination: '/customers',
                },
                {
                    label: 'Products',
                    destination: '/products',
                },
                {
                    label: 'Analytics',
                    destination: '/analytics',
                },
                {
                    label: 'Settings',
                    destination: '/settings',
                },
            ]}
        />
    );
};

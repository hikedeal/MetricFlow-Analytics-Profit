import { useState, useCallback } from 'react';
import { Frame, Toast } from '@shopify/polaris';
import { Outlet } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';

export function DashboardLayout() {
    const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
    const { toastMsg, isToastError, clearToast } = useSettings();
    const toggleMobileNavigationActive = useCallback(
        () => setMobileNavigationActive((active) => !active),
        [],
    );

    const toastMarkup = toastMsg ? (
        <Toast content={toastMsg} error={isToastError} onDismiss={clearToast} />
    ) : null;

    return (
        <Frame
            showMobileNavigation={mobileNavigationActive}
            onNavigationDismiss={toggleMobileNavigationActive}
        >
            <Outlet />
            {toastMarkup}
        </Frame>
    );
}

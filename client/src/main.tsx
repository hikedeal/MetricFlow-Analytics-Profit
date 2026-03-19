import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@shopify/polaris/build/esm/styles.css';

import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

console.log('main.tsx loaded');

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    let host = urlParams.get('host');
    let shop = urlParams.get('shop');

    // Persist host and shop to session storage for reloads where they might be missing from URL
    if (host) {
        sessionStorage.setItem('shopify_host', host);
    } else {
        host = sessionStorage.getItem('shopify_host') || '';
    }

    if (shop) {
        sessionStorage.setItem('shopify_shop', shop);
    } else {
        shop = sessionStorage.getItem('shopify_shop') || '';
    }

    let apiKey = import.meta.env.VITE_SHOPIFY_API_KEY || '7cd6858cd34ee26392bc69168246e7f8';

    // Fetch dynamic config removed because we are using a single client ID.

    const appBridgeConfig = {
        apiKey: apiKey,
        host: host,
        forceRedirect: true,
    };



    try {
        const rootElement = document.getElementById('root');
        if (!rootElement) throw new Error('Root element not found');

        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <React.StrictMode>
                <AppBridgeProvider config={appBridgeConfig}>
                    <ErrorBoundary>
                        <SettingsProvider>
                            <App />
                        </SettingsProvider>
                    </ErrorBoundary>
                </AppBridgeProvider>
            </React.StrictMode>
        );
    } catch (error) {
        console.error('Failed to mount React app:', error);
        document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>Error</h1><pre>${error}</pre></div>`;
    }
}

init();

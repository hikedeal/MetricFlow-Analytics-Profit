import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes.tsx';
import { CommandPalette } from './components/common/CommandPalette';
import { AppBridgeNavigation } from './components/common/AppBridgeNavigation';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes
        },
    },
});

function App() {
    return (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                <AppProvider i18n={enTranslations}>
                    <AppBridgeNavigation />
                    <CommandPalette />
                    <AppRoutes />
                </AppProvider>
            </QueryClientProvider>
        </BrowserRouter>
    );
}

export default App;

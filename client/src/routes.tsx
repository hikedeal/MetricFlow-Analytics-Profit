import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { OrdersPage } from './pages/OrdersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import SegmentsPage from './pages/SegmentsPage';

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="segments" element={<SegmentsPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
            {/* Super Admin Route - Outside Dashboard Layout */}
            <Route path="/admin" element={<SuperAdminPage />} />
            {/* Catch-all - Redirect to Dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

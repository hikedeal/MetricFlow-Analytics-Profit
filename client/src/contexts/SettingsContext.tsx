import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';

export interface StoreSettings {
    enableStoreLevelProfit: boolean;
    enableProfitTracking: boolean;
    defaultShippingCost: number;
    defaultPackagingCost: number;
    defaultCogsPercentage: number;
    useProductCost: boolean;
    codExtraCharge: number;
    paymentGatewayFee: number;
    returnCost: number;
    rtoCost: number;
    marketingCost: number;
    agencyFee: number;
    shopifyBillingCost: number;
    miscCost: number;
    cancelledTags: string[];
    rtoTags: string[];
    returnTags: string[];
    editedTags: string[];
    enableAlerts: boolean;
    cancellationThreshold: number;
    refundThreshold: number;
    alertCancellationSpike: boolean;
    alertSalesDrop: boolean;
    alertRefundSpike: boolean;
    alertInventoryLow: boolean;
    syncFrequency: string;
    vipThreshold: number;
    churnDays: number;
    multiCurrency: boolean;
    taxIncluded: boolean;
    taxRate: number;
    enableScheduledReports: boolean;
    reportFrequency: string;
    autoExport: boolean;
    theme: string;
    defaultDateRange: string;
    currency: string;
    refreshFreq: string;
    [key: string]: any;
}

const DEFAULT_SETTINGS: StoreSettings = {
    enableStoreLevelProfit: false,
    enableProfitTracking: true,
    defaultShippingCost: 0,
    defaultPackagingCost: 0,
    defaultCogsPercentage: 0,
    useProductCost: false,
    codExtraCharge: 0,
    paymentGatewayFee: 2.0,
    returnCost: 0,
    rtoCost: 0,
    marketingCost: 0,
    agencyFee: 0,
    shopifyBillingCost: 0,
    miscCost: 0,
    cancelledTags: [],
    rtoTags: [],
    returnTags: [],
    editedTags: [],
    enableAlerts: true,
    cancellationThreshold: 10,
    refundThreshold: 5,
    alertCancellationSpike: true,
    alertSalesDrop: true,
    alertRefundSpike: true,
    alertInventoryLow: true,
    syncFrequency: 'manual',
    vipThreshold: 1000,
    churnDays: 90,
    multiCurrency: false,
    taxIncluded: true,
    taxRate: 0,
    enableScheduledReports: false,
    reportFrequency: 'weekly',
    autoExport: false,
    theme: 'light',
    defaultDateRange: 'last_30_days',
    currency: 'USD',
    refreshFreq: 'manual'
};

interface SettingsContextType {
    settings: StoreSettings;
    loading: boolean;
    saving: boolean;
    saveSettings: (newSettings: Partial<StoreSettings>) => Promise<boolean>;
    refetch: () => Promise<void>;
    showToast: (message: string, error?: boolean) => void;
    toastMsg: string | null;
    isToastError: boolean;
    clearToast: () => void;
    exchangeRates: Record<string, number> | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [isError, setIsError] = useState(false);

    const [exchangeRates, setExchangeRates] = useState<Record<string, number> | null>(null);

    const showToast = useCallback((message: string, error: boolean = false) => {
        setToastMsg(message);
        setIsError(error);
    }, []);

    const clearToast = useCallback(() => {
        setToastMsg(null);
        setIsError(false);
    }, []);

    const fetchRates = useCallback(async () => {
        try {
            const response = await api.get('/dashboard/currency-rates?base=USD');
            if (response.data.success) {
                setExchangeRates(response.data.data.rates);
            }
        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
        }
    }, []);

    const fetchSettings = useCallback(async () => {
        try {
            const response = await api.get('/settings');
            setSettings({ ...DEFAULT_SETTINGS, ...response.data });
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchRates();
    }, [fetchSettings, fetchRates]);

    const saveSettings = async (newSettings: Partial<StoreSettings>) => {
        const originalSettings = { ...settings };
        try {
            setSaving(true);
            const updated = { ...settings, ...newSettings };

            // Optimistic update
            setSettings(updated);

            await api.post('/settings', updated);
            showToast('Settings saved successfully');
            return true;
        } catch (err) {
            console.error('Failed to save settings:', err);
            // Revert on error
            setSettings(originalSettings);
            showToast('Failed to save settings', true);
            return false;
        } finally {
            setSaving(false);
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            loading,
            saving,
            saveSettings,
            refetch: fetchSettings,
            showToast,
            toastMsg,
            isToastError: isError,
            clearToast,
            exchangeRates
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
}

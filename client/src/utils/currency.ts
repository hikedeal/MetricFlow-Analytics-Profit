// Basic exchange rates (mock values - in production these would come from an API)
const EXCHANGE_RATES: Record<string, number> = {
    'USD': 1,
    'INR': 83.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'AED': 3.67,
    'AUD': 1.52,
    'CAD': 1.36
};

const SYMBOLS: Record<string, string> = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'AED': 'AED ',
    'AUD': 'A$',
    'CAD': 'C$'
};

export function convertCurrency(amount: number, from: string, to: string, exchangeRates?: Record<string, number>): number {
    if (from === to) return amount;

    const rates = exchangeRates || EXCHANGE_RATES;
    const fromRate = rates[from] || 1;
    const toRate = rates[to] || 1;

    // Convert to USD first (base), then to target
    const inUSD = amount / fromRate;
    return inUSD * toRate;
}

export function getCurrencySymbol(currency: string): string {
    return SYMBOLS[currency] || currency;
}

export function formatCurrency(amount: number, currency: string): string {
    const symbol = SYMBOLS[currency] || currency;
    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;
    const sign = isNegative ? '-' : '';

    // For INR: use K, L (Lakh) and Cr (Crore) intelligently
    if (currency === 'INR') {
        if (absAmount >= 10000000) { // 1 Crore or more
            return `${sign}${symbol}${(absAmount / 10000000).toFixed(2)}Cr`;
        }
        if (absAmount >= 100000) { // 1 Lakh or more
            return `${sign}${symbol}${(absAmount / 100000).toFixed(2)}L`;
        }
        if (absAmount >= 1000) { // 1 Thousand or more
            return `${sign}${symbol}${(absAmount / 1000).toFixed(2)}K`;
        }
        // Less than 1000, show full amount
        return `${sign}${symbol}${absAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // For International: use K, M, B
    if (absAmount >= 1000000000) {
        return `${sign}${symbol}${(absAmount / 1000000000).toFixed(2)}B`;
    }
    if (absAmount >= 1000000) {
        return `${sign}${symbol}${(absAmount / 1000000).toFixed(2)}M`;
    }
    if (absAmount >= 1000) {
        return `${sign}${symbol}${(absAmount / 1000).toFixed(2)}K`;
    }

    return `${sign}${symbol}${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

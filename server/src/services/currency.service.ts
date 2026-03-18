import axios from 'axios';

interface ExchangeRates {
    date: string;
    base: string;
    rates: Record<string, number>;
}

// Simple in-memory cache
let cachedRates: ExchangeRates | null = null;
let lastFetchTime = 0;
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 Hour

export class CurrencyService {
    static async getExchangeRates(base: string = 'USD'): Promise<ExchangeRates> {
        const now = Date.now();

        // Return cached rates if valid
        if (cachedRates && (now - lastFetchTime < CACHE_DURATION_MS) && cachedRates.base === base) {
            return cachedRates;
        }

        try {
            console.log(`Fetching live exchange rates for ${base}...`);
            // Using a free open API for exchange rates
            const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${base}`);

            cachedRates = {
                date: response.data.date,
                base: response.data.base,
                rates: response.data.rates
            };
            lastFetchTime = now;

            return cachedRates;
        } catch (error) {
            console.error('Failed to fetch exchange rates:', error);
            // Fallback to cache if available even if expired, or throw
            if (cachedRates) return cachedRates;

            // Critical fallback if API fails completely
            return {
                date: new Date().toISOString().split('T')[0],
                base: 'USD',
                rates: {
                    USD: 1,
                    EUR: 0.92,
                    GBP: 0.79,
                    INR: 83.5,
                    CAD: 1.36,
                    AUD: 1.52,
                    // safe fallback
                }
            };
        }
    }
}

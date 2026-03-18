import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    // Determine which shop we are in to use the correct token
    const urlParams = new URLSearchParams(window.location.search);
    const shop = urlParams.get('shop') || sessionStorage.getItem('shopify_shop') || '';

    // Key is shop-specific to avoid leaks between stores on localhost
    const tokenKey = shop ? `adynic_token_${shop}` : 'adynic_token';
    const token = localStorage.getItem(tokenKey);

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Also include shop in headers for backend convenience
    if (shop) {
        config.params = { ...config.params, shop };
    }

    return config;
});


// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // In Shopify apps, 401 usually means session is expired.
            // For now, don't redirect to a non-existent /login.
            console.error('Unauthorized request (401)');
        }
        return Promise.reject(error);
    }
);

export default api;

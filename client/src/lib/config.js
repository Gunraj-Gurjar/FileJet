/**
 * Global Configuration for FileJet Client.
 *
 * Centralizes URL management to prevent hydration mismatches and
 * duplication across components.
 */

const isProd = process.env.NODE_ENV === 'production';
const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
const PRODUCTION_SERVER_URL = 'https://filejet.onrender.com';

function cleanUrl(url) {
    return url ? url.replace(/\/+$/, '') : url;
}

/**
 * Signaling Server URL
 * Priority:
 * 1. NEXT_PUBLIC_SERVER_URL environment variable
 * 2. Production Render URL
 * 3. Local development URL (port 3001)
 */
export const getServerUrl = () => {
    if (process.env.NEXT_PUBLIC_SERVER_URL) return cleanUrl(process.env.NEXT_PUBLIC_SERVER_URL);

    if (isProd || isVercel) {
        return PRODUCTION_SERVER_URL;
    }

    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3001`;
    }

    return 'http://localhost:3001';
};

/**
 * Application Base URL
 * Used for generating share links.
 */
export const getAppUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return cleanUrl(process.env.NEXT_PUBLIC_APP_URL);

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return 'http://localhost:3000';
};

export const SERVER_URL = getServerUrl();
export const APP_URL = getAppUrl();

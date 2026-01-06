import axios from 'axios';

// Detect environment based on the browser's current URL
// If we are on localhost, we assume the backend is at port 5000
// If we are on Vercel (or any other domain), we use relative path '/api' to use the same domain
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let apiUrl = import.meta.env.VITE_API_URL;
// Safety check: Prevent using localhost API URL when running in production (e.g. Vercel)
// This handles cases where VITE_API_URL might be incorrectly set to localhost in production settings
if (!isLocalhost && apiUrl && (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1'))) {
    console.warn('Detected localhost API URL in production. Falling back to relative path.');
    apiUrl = null;
}

const defaultUrl = isLocalhost ? 'http://localhost:5000/api' : '/api';

// VITE_API_URL can override this if set, otherwise use the detected default
const baseURL = apiUrl || defaultUrl;

const api = axios.create({
    baseURL: baseURL
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const userStr = localStorage.getItem('voucher_user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                // Check if userData has token directly or nested
                const token = userData.token;
                if (token) {
                    config.headers['Authorization'] = 'Bearer ' + token;
                }
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;

import axios from 'axios';

// Use relative path in production (Vercel) to avoid Mixed Content / CORS issues
// In development, strict localhost:5000 is needed unless proxy is set
const isProduction = import.meta.env.PROD; 
const baseURL = import.meta.env.VITE_API_URL || (isProduction ? '/api' : 'http://localhost:5000/api');

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

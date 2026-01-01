import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';

// Detect if we're running on localhost (development) or production
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Backend URL - Use environment variable (Railway) or detect based on hostname
const VITE_API_URL = (import.meta.env as any).VITE_API_URL;
const BACKEND_URL = VITE_API_URL || 
  (isLocalhost
    ? 'http://localhost:5000'  // Development: local backend
    : 'https://inventory-management-backend-production-5631.up.railway.app');  // Production: Railway backend

// Use proxy only if:
// 1. Running on localhost AND
// 2. VITE_API_URL is NOT set (meaning we want to use local backend)
// Otherwise, use direct backend URL
const useProxy = isLocalhost && !VITE_API_URL;
const API_BASE_URL = useProxy
  ? '/api'  // Vite proxy will forward to local backend
  : `${BACKEND_URL}/api`;  // Direct URL to backend (Railway or local)

// Log API configuration
if (useProxy) {
  console.log('[API] Development mode - Using proxy to local backend');
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Proxy target:', BACKEND_URL);
} else if (VITE_API_URL) {
  console.log('[API] Using Railway backend (VITE_API_URL set)');
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Backend URL:', BACKEND_URL);
} else {
  console.log('[API] Production mode - Using Railway backend');
  console.log('[API] Base URL:', API_BASE_URL);
  console.log('[API] Backend URL:', BACKEND_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if ((isLocalhost || VITE_API_URL) && config.baseURL && config.url) {
      const fullUrl = config.baseURL + config.url;
      console.log('[API] Request:', config.method?.toUpperCase(), fullUrl);
    }
    
    return config;
  },
  (error: AxiosError): Promise<AxiosError> => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear tokens and redirect to login
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;


import axios from 'axios';
import { readToken, writeToken } from './token.js';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

apiClient.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const path = error.config?.url?.split('?')[0];
    const credentialsRequest = /\/auth\/(login|signup)\/?$/.test(path);
    const token = readToken();
    // An older request can finish after a new login.
    if (error.response?.status === 401 && !credentialsRequest &&
        (!token || error.config?.headers?.Authorization === `Bearer ${token}`)) {
      writeToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default apiClient;

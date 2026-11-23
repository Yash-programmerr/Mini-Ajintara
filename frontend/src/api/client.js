import axios from 'axios';
import toast from 'react-hot-toast';
import { readToken, writeToken } from './token.js';

export const unreachableMessage = 'Server is waking up or unreachable, please retry';

export function apiBaseURL(value, production) {
  const url = value?.trim();
  if (!url && production) {
    throw new Error('VITE_API_URL is required. Set the backend URL including /api and redeploy the frontend.');
  }
  return url || '/api';
}

function waitToRetry(signal) {
  return new Promise((resolve, reject) => {
    function cancel() {
      clearTimeout(timer);
      reject(new axios.CanceledError());
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, 1000);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
}

function unanswered(error) {
  return Boolean(error.request) && !error.response && !axios.isCancel(error);
}

async function sendWithRetry(send, request, token) {
  try {
    return await send(request);
  } catch (error) {
    if (request.method !== 'get' || !unanswered(error)) throw error;
    await waitToRetry(request.signal);
    // The original GET belongs to the session that issued it.
    if (request.signal?.aborted || readToken() !== token) throw new axios.CanceledError();
    return send(request);
  }
}

export function createApiClient(baseURL, notifySlow = () => toast('Server waking up…')) {
  const client = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 90_000,
  });
  let showedSlowNotice = false;

  client.interceptors.request.use((config) => {
    const token = readToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const send = axios.getAdapter(config.adapter, config);
    config.adapter = async (request) => {
      // Keep one timer across both attempts. Concurrent slow requests share the first notice.
      const timer = !showedSlowNotice && setTimeout(() => {
        if (showedSlowNotice || request.signal?.aborted) return;
        showedSlowNotice = true;
        notifySlow();
      }, 4000);
      try {
        return await sendWithRetry(send, request, token);
      } finally {
        clearTimeout(timer);
      }
    };
    return config;
  });

  client.interceptors.response.use(undefined, (error) => {
    if (unanswered(error)) error.message = unreachableMessage;
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
  });
  return client;
}

export function apiErrorMessage(error) {
  if (unanswered(error)) return unreachableMessage;
  const info = error.response?.data?.error;
  const details = (info?.details ?? []).map((item) =>
    typeof item === 'string' ? item : item?.date || item?.message).filter(Boolean);
  return [info?.message || 'The request failed. Please try again.', ...details].join(' ');
}

export default createApiClient(apiBaseURL(import.meta.env.VITE_API_URL, import.meta.env.PROD));

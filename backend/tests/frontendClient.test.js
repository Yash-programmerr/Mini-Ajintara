import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiBaseURL, apiErrorMessage, createApiClient, unreachableMessage } from '../../frontend/src/api/client.js';
import { writeToken } from '../../frontend/src/api/token.js';
import { queryClient } from '../../frontend/src/lib/queryClient.js';

function networkError(config) {
  return Object.assign(new Error('Network Error'), { config, code: 'ERR_NETWORK', request: {} });
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  queryClient.clear();
  writeToken(null);
  vi.useRealTimers();
});

it('requires the API URL in production and keeps the local fallback', () => {
  expect(() => apiBaseURL(' ', true)).toThrow(/VITE_API_URL.*\/api/);
  expect(apiBaseURL(undefined, false)).toBe('/api');
  expect(apiBaseURL('https://ajintara-api.onrender.com', true)).toBe('https://ajintara-api.onrender.com/api');
  expect(apiBaseURL('https://example.test/', true)).toBe('https://example.test/api');
  expect(apiBaseURL(' https://example.test/api ', true)).toBe('https://example.test/api');
});

it('makes at most two GET attempts through Query and reports a friendly connection error', async () => {
  const client = createApiClient('/api');
  const adapter = vi.fn(async (config) => { throw networkError(config); });
  const request = queryClient.fetchQuery({
    queryKey: ['cold-start'], queryFn: ({ signal }) => client.get('/health', { adapter, signal }),
  }).catch((error) => error);
  await vi.advanceTimersByTimeAsync(999);
  expect(adapter).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(adapter).toHaveBeenCalledTimes(2);
  const error = await request;
  expect(error.message).toBe(unreachableMessage);
  expect(apiErrorMessage(error)).toBe(unreachableMessage);
});

it('returns the response from a successful retry', async () => {
  const client = createApiClient('/api');
  const adapter = vi.fn().mockRejectedValueOnce(networkError({}))
    .mockImplementationOnce(async (config) => ({ status: 200, config, data: { ok: true } }));
  const request = client.get('/health', { adapter });
  await vi.advanceTimersByTimeAsync(1000);
  expect((await request).data).toEqual({ ok: true });
  expect(adapter).toHaveBeenCalledTimes(2);
});

it.each(['post', 'patch', 'put', 'delete'])('never repeats an unanswered %s', async (method) => {
  const adapter = vi.fn(async (config) => { throw networkError(config); });
  const error = await createApiClient('/api').request({ method, url: '/auth/login', adapter }).catch((e) => e);
  await vi.advanceTimersByTimeAsync(30_000);
  expect(adapter).toHaveBeenCalledOnce();
  expect(apiErrorMessage(error)).toBe(unreachableMessage);
});

it('preserves an HTTP error and its details without retrying', async () => {
  const adapter = vi.fn(async (config) => {
    throw Object.assign(networkError(config), {
      response: { status: 409, data: { error: { message: 'Rooms are booked.', details: ['2026-12-01'] } } },
    });
  });
  const error = await createApiClient('/api').get('/inventory', { adapter }).catch((e) => e);
  expect(apiErrorMessage(error)).toBe('Rooms are booked. 2026-12-01');
  expect(adapter).toHaveBeenCalledOnce();
});

it.each(['abort', 'changed session'])('cancels a delayed retry on %s', async (cause) => {
  const adapter = vi.fn(async (config) => { throw networkError(config); });
  const controller = new AbortController();
  const request = createApiClient('/api').get('/auth/me', { adapter, signal: controller.signal }).catch((e) => e);
  await vi.advanceTimersByTimeAsync(100);
  if (cause === 'abort') controller.abort();
  else writeToken('another-session');
  await vi.advanceTimersByTimeAsync(10_000);
  expect((await request).code).toBe('ERR_CANCELED');
  expect(adapter).toHaveBeenCalledOnce();
});

it('shows the first slow-request notice only once across concurrent requests', async () => {
  const notify = vi.fn();
  const client = createApiClient('/api', notify);
  const adapter = (config) => new Promise((resolve) => {
    setTimeout(() => resolve({ status: 200, config, data: {} }), 6000);
  });
  const fast = () => client.get('/fast', { adapter: async (config) => ({ status: 200, config, data: {} }) });
  await fast();
  await vi.advanceTimersByTimeAsync(5000);
  expect(notify).not.toHaveBeenCalled();
  const requests = [client.get('/one', { adapter }), client.get('/two', { adapter })];
  await vi.advanceTimersByTimeAsync(3999);
  expect(notify).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(notify).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(2000);
  await Promise.all(requests);
  const later = client.get('/later', { adapter });
  await vi.advanceTimersByTimeAsync(6000);
  await later;
  expect(notify).toHaveBeenCalledOnce();
});

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { frontendOrigins } from '../src/config/origins.js';

const api = fileURLToPath(new URL('../src/server.js', import.meta.url));
const testSecret = 'test-only-signing-secret-over-32-characters';

function boot(overrides) {
  const { status, stdout, stderr, error } = spawnSync(process.execPath, [api], {
    env: {
      ...process.env, NODE_ENV: 'production', FRONTEND_URL: 'https://demo.example',
      MONGO_URI: 'mongodb://127.0.0.1:1/boot_test', JWT_SECRET: testSecret, ...overrides,
    },
    encoding: 'utf8', timeout: 10000, windowsHide: true,
  });
  expect(error).toBeUndefined();
  expect(status).toBe(1);
  return stdout + stderr;
}

it('canonicalizes explicit production origins to match browser Origin headers', () => {
  expect(frontendOrigins('https://Demo.Example:443, https://partners.example:8443', true))
    .toEqual(['https://demo.example', 'https://partners.example:8443']);
  expect(frontendOrigins('http://localhost:5173', false)).toEqual(['http://localhost:5173']);
});

it.each([
  'http://demo.example', 'https://demo.example/', 'https://demo.example/app', 'https://localhost:5173',
  'https://LOCALHOST.', 'https://127.0.0.2', 'https://[::1]', 'https://*.example',
  'https://user:password@demo.example', 'https://demo.example?foo', 'https://demo.example#test',
  'https://ok.example,', 'https://ok.example,http://bad.example',
])('rejects invalid production FRONTEND_URL %s', (value) => {
  expect(() => frontendOrigins(value, true)).toThrow();
});

it.each([
  [{ JWT_SECRET: '' }, /JWT_SECRET is required/],
  [{ JWT_SECRET: 'too-short' }, /at least 32 characters/],
  [{ FRONTEND_URL: '' }, /FRONTEND_URL is required in production/],
  [{ FRONTEND_URL: 'https://localhost:5173' }, /Production requires HTTPS/],
])('exits before connecting for invalid production settings', (overrides, message) => {
  const log = boot(overrides);
  expect(log).toMatch(message);
  expect(log).not.toContain(testSecret);
});

it('reports a malformed MongoDB connection without printing the URI or secrets', () => {
  const malformed = 'mongodb://demo:connection-test-marker@[invalid/db';
  const log = boot({ MONGO_URI: malformed });
  expect(log).toContain('MongoDB connection failed');
  for (const sensitive of [malformed, 'connection-test-marker', testSecret]) {
    expect(log).not.toContain(sensitive);
  }
});

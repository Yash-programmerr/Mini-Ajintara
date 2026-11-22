import request from 'supertest';
import { expect, it, vi } from 'vitest';

it('limits login attempts per IP before body validation', async () => {
  vi.stubEnv('AUTH_RATE_LIMIT_MAX', '1');
  try {
    const { default: app } = await import('../src/app.js');
    const login = () => request(app).post('/api/auth/login').send({});
    expect((await login()).status).toBe(400);
    const limited = await login();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
  } finally {
    vi.unstubAllEnvs();
  }
});

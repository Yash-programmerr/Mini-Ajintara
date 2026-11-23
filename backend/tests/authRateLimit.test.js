import request from 'supertest';
import { expect, it, vi } from 'vitest';

it('limits forwarded clients independently behind one proxy, before body validation', async () => {
  vi.stubEnv('AUTH_RATE_LIMIT_MAX', '1');
  try {
    const { default: app } = await import('../src/app.js');
    const auth = await import('../src/services/auth.js');
    const accepted = vi.spyOn(auth, 'login').mockResolvedValue({ user: { id: 'fixture' }, token: 'fixture' });
    const login = (forwarded, body = {}) => request(app).post('/api/auth/login')
      .set('X-Forwarded-For', forwarded).send(body);
    expect(app.get('trust proxy')).toBe(1);
    const firstClient = '203.0.113.10';
    expect((await login(firstClient)).status).toBe(400);
    const limited = await login('198.51.100.20, ' + firstClient);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    await login('203.0.113.11', { email: 'demo@example.test', password: 'test-password' }).expect(200);
    expect(accepted).toHaveBeenCalledOnce();
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  }
});

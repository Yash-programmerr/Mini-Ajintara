import request from 'supertest';
import { beforeAll, expect, it, vi } from 'vitest';

let app;
beforeAll(async () => {
  vi.stubEnv('FRONTEND_URL', 'https://booking.example, https://Partners.example:443');
  try {
    ({ default: app } = await import('../src/app.js'));
  } finally {
    vi.unstubAllEnvs();
  }
});

const preflight = (origin) => request(app).options('/api/partner/properties/123')
  .set('Origin', origin).set('Access-Control-Request-Method', 'PATCH')
  .set('Access-Control-Request-Headers', 'authorization,content-type');

it.each(['https://booking.example', 'https://Partners.example:443'])(
  'permits bearer-token preflight from %s without credentials', async (origin) => {
    const { headers } = await preflight(origin).expect(204);
    expect(headers['access-control-allow-origin']).toBe(origin);
    expect(headers['access-control-allow-credentials']).toBeUndefined();
    expect(headers['access-control-allow-headers'].toLowerCase().split(/\s*,\s*/))
      .toEqual(expect.arrayContaining(['authorization', 'content-type']));
    expect(headers['access-control-allow-methods'].split(/\s*,\s*/))
      .toEqual(expect.arrayContaining(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']));
  },
);

it.each(['https://booking.example.evil.test', 'http://booking.example', 'https://partners.example', 'null'])(
  'withholds CORS permission from %s', async (origin) => {
    expect((await preflight(origin)).headers['access-control-allow-origin']).toBeUndefined();
    const { headers } = await request(app).get('/api/health').set('Origin', origin);
    expect(headers['access-control-allow-origin']).toBeUndefined();
    expect(headers['access-control-allow-credentials']).toBeUndefined();
  },
);

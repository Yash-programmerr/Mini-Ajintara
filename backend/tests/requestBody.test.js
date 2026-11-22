import { expect, it } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

it('returns the error envelope for an oversized JSON body', async () => {
  const result = await request(app).post('/api/auth').send({ text: 'x'.repeat(10240) });
  expect(result.status).toBe(413);
  expect(result.body).toEqual({
    error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the size limit' },
  });
});

it('returns a validation error for malformed JSON', async () => {
  const result = await request(app).post('/api/auth').type('json').send('{');
  expect(result.status).toBe(400);
  expect(result.body).toEqual({
    error: { code: 'INVALID_JSON', message: 'Request body contains invalid JSON' },
  });
});

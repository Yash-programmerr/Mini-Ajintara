import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([[0, 'disconnected'], [1, 'connected'], [2, 'connecting'], [3, 'disconnecting']])(
    'reports the cached Mongoose state %i without a database connection', async (state, name) => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(state);
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok', time: expect.any(String), uptimeSeconds: expect.any(Number), db: name,
    });
    expect(new Date(response.body.time).toISOString()).toBe(response.body.time);
    expect(Number.isInteger(response.body.uptimeSeconds)).toBe(true);
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

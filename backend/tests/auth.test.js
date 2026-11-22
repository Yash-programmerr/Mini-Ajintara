import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { BCRYPT_COST } from '../src/config/auth.js';
import { env } from '../src/config/env.js';

const account = { name: 'Yash', email: 'yash@example.com', password: 'test-password' };
const credentials = { email: account.email, password: account.password };
let client = 0;
const post = (path, body) => request(app).post('/api/auth/' + path)
  .set('X-Forwarded-For', '192.0.2.' + client).send(body);
const signup = (fields = {}) => post('signup', { ...account, ...fields });
const get = (path, token) => request(app).get('/api/' + path).set('Authorization', 'bEaReR ' + token);
const secret = env.JWT_SECRET;

describe.skipIf(!process.env.TEST_REPLICA_URI)('authentication and roles', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_REPLICA_URI, { dbName: 'auth_test_' + randomUUID() });
    await User.init();
  });
  beforeEach(() => { client += 1; });
  afterEach(async () => {
    vi.restoreAllMocks();
    await User.deleteMany({});
  });
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it('creates a guest, hashes the password and signs only the subject', async () => {
    const result = await signup();
    expect(result.status).toBe(201);
    expect(result.text).not.toContain('passwordHash');
    expect(result.body.user.role).toBe('guest');
    const { sub, iat, exp, ...other } = jwt.verify(result.body.token, secret);
    expect(sub).toBe(result.body.user.id);
    expect(exp).toBeGreaterThan(iat);
    expect(other).toEqual({});
    const stored = await User.findById(sub).select('+passwordHash');
    expect(stored.passwordHash).toMatch(/^\$2/);
    expect(stored.passwordHash).not.toBe(account.password);
    expect((await User.findById(sub)).passwordHash).toBeUndefined();
  });

  it.each([
    ['admin role', { role: 'admin' }], ['extra field', { isBlocked: true }],
    ['short password', { password: '1234567' }], ['invalid email', { email: 'yash' }],
  ])('rejects signup with %s', async (_label, fields) => {
    expect((await signup(fields)).status).toBe(400);
  });

  it('normalizes emails for uniqueness and login', async () => {
    await signup({ email: '  Yash@Example.COM ' });
    const duplicate = await signup();
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('EMAIL_TAKEN');
    const result = await post('login', credentials);
    expect(result.status).toBe(200);
    expect(result.text).not.toContain('passwordHash');
    const me = await get('auth/me', result.body.token);
    expect(me.status).toBe(200);
    expect(me.body.user).toEqual(result.body.user);
  });

  it('uses bcrypt for an unknown email and returns identical credential errors', async () => {
    await signup();
    const wrong = await post('login', { ...credentials, password: 'incorrect' });
    const compare = vi.spyOn(bcrypt, 'compare');
    const unknown = await post('login', { ...credentials, email: 'unknown@example.com' });
    expect(compare).toHaveBeenCalledOnce();
    const [password, hash] = compare.mock.calls[0];
    expect(password).toBe(account.password);
    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    expect(wrong.status).toBe(unknown.status);
    expect(wrong.body).toEqual(unknown.body);
  });

  it('checks the password before blocked status and rechecks blocks on issued tokens', async () => {
    const { token, user } = (await signup()).body;
    await User.updateOne({ _id: user.id }, { isBlocked: true });
    const wrong = await post('login', { ...credentials, password: 'incorrect' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    for (const result of [await post('login', credentials), await get('auth/me', token)]) {
      expect(result.status).toBe(403);
      expect(result.body.error.code).toBe('BLOCKED');
    }
  });

  it('requires an authorization header', async () => {
    const result = await request(app).get('/api/auth/me');
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('AUTH_REQUIRED');
  });

  it.each([
    ['garbage', 'garbage'],
    ['expired', jwt.sign({ sub: '000000000000000000000001' }, secret, { expiresIn: -1 })],
    ['wrong signature', jwt.sign({ sub: '000000000000000000000001' }, randomUUID())],
    ['unsigned', jwt.sign({ sub: '000000000000000000000001' }, null, { algorithm: 'none' })],
  ])('rejects a %s token', async (_label, token) => {
    const result = await get('auth/me', token);
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('TOKEN_INVALID');
  });

  it('requires the user to still exist', async () => {
    const { token, user } = (await signup()).body;
    await User.deleteOne({ _id: user.id });
    const result = await get('auth/me', token);
    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('enforces current database roles even if a signed token claims admin', async () => {
    const { token, user } = (await signup()).body;
    const claimed = jwt.sign({ sub: user.id, role: 'admin' }, secret);
    for (const path of ['partner/properties', 'admin/dashboard']) {
      for (const credential of [token, claimed]) {
        const result = await get(path, credential);
        expect(result.status).toBe(403);
        expect(result.body.error.code).toBe('FORBIDDEN');
      }
    }
    await User.updateOne({ _id: user.id }, { role: 'partner' });
    expect((await get('partner/properties', token)).status).toBe(501);
    await User.updateOne({ _id: user.id }, { role: 'admin' });
    expect((await get('admin/dashboard', token)).status).toBe(501);
  });
});

import mongoose from 'mongoose';
import { afterEach, expect, it, vi } from 'vitest';
import { connectDB } from '../src/config/db.js';

afterEach(() => vi.restoreAllMocks());

it.each([
  [
    'a standalone server',
    () => Promise.resolve({ isWritablePrimary: true }),
    'must be a replica set',
  ],
  ['a failed topology check', () => Promise.reject(new Error('hello failed')), 'hello failed'],
])('disconnects and rejects startup for %s', async (_label, command, cause) => {
  vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  const disconnect = vi.spyOn(mongoose, 'disconnect').mockResolvedValue();
  vi.spyOn(mongoose, 'connection', 'get').mockReturnValue({
    db: { admin: () => ({ command }) },
  });
  await expect(connectDB()).rejects.toMatchObject({
    cause: { message: expect.stringContaining(cause) },
  });
  expect(disconnect).toHaveBeenCalledOnce();
});

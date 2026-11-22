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

it('uses a bounded connection timeout and logs only the connected host and database', async () => {
  const connect = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(mongoose, 'connection', 'get').mockReturnValue({
    host: 'db.example', name: 'ajintara', db: { admin: () => ({ command: async () => ({ setName: 'rs0' }) }) },
  });
  await connectDB();
  expect(connect).toHaveBeenCalledWith(expect.any(String), { serverSelectionTimeoutMS: 10000 });
  expect(log.mock.calls).toEqual([['[db] connected to db.example/ajintara']]);
});

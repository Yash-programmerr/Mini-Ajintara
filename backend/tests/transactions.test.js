import mongoose from 'mongoose';
import { afterAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { connectDB, disconnectDB } from '../src/config/db.js';

afterAll(disconnectDB);

it.skipIf(!process.env.TEST_REPLICA_URI)(
  'commits and rolls back on a real replica set',
  async () => {
    await connectDB();
    const collection = await mongoose.connection.db.createCollection('probe_' + randomUUID());
    try {
      await mongoose.connection.transaction(async (session) => {
        await collection.insertOne({ outcome: 'committed' }, { session });
      });
      await expect(
        mongoose.connection.transaction(async (session) => {
          await collection.insertOne({ outcome: 'aborted' }, { session });
          throw new Error('intentional rollback');
        }),
      ).rejects.toThrow('intentional rollback');
      expect(await collection.distinct('outcome')).toEqual(['committed']);
    } finally {
      await collection.drop();
    }
  },
  30000,
);

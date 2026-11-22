import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll } from 'vitest';

export function useDisposableReplica(prefix) {
  const dbName = prefix + '_' + randomUUID();
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_REPLICA_URI, { dbName });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  }, 30000);
  afterAll(async () => {
    try {
      if (mongoose.connection.name === dbName && mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
      }
    } finally {
      await mongoose.disconnect();
    }
  });
}

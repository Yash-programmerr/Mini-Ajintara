import mongoose from 'mongoose';
import { env } from './env.js';

export class DatabaseStartupError extends Error {}

export async function connectDB() {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  } catch {
    // MongoDB driver errors can contain credentials from a malformed URI.
    throw new DatabaseStartupError('MongoDB connection failed. Check MONGO_URI, database credentials and network access.');
  }

  const { host, name } = mongoose.connection;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) {
      throw new Error('MongoDB must be a replica set for booking transactions.');
    }
    console.log(`[db] connected to ${host}/${name}`);
  } catch (error) {
    await disconnectDB();
    throw new DatabaseStartupError('Unable to confirm the required MongoDB replica set.', { cause: error });
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

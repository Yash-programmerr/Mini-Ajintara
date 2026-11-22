import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const { host, name } = mongoose.connection;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!hello.setName) {
      throw new Error('MongoDB must be a replica set for booking transactions.');
    }
    console.log(`[db] connected to ${host}/${name} | replica set: ${hello.setName}`);
  } catch (error) {
    await disconnectDB();
    throw new Error('Unable to confirm the required MongoDB replica set.', { cause: error });
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}

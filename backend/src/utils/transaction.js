import mongoose from 'mongoose';

export async function withTransaction(fn) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(fn);
  } finally {
    await session.endSession();
  }
}

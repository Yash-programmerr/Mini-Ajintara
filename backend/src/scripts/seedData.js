import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { seedDemoData } from '../services/demoSeed.js';

async function seed() {
  // Parse through the driver so credentials and URI options never reach the log.
  const { dbName, srvHost, hosts } = new mongoose.mongo.MongoClient(env.MONGO_URI).options;
  const hostnames = srvHost ? [srvHost] : hosts.map(({ host }) => host);
  const target = srvHost || hosts.map((host) => host.toString()).join(',');
  console.log(`Seed target: ${target} / ${dbName}`);
  if (hostnames.some((host) => !['localhost', '127.0.0.1'].includes(host)) && !process.argv.includes('--yes')) {
    console.error('A remote seed target requires --yes.');
    process.exitCode = 1;
    return;
  }
  await connectDB();
  const summary = await seedDemoData({ reset: process.argv.includes('--reset') });
  console.log(JSON.stringify(summary, null, 2));
}

try {
  await seed();
} catch {
  console.error('Demo seed failed. Check the account settings, replica-set connection and inventory window.');
  process.exitCode = 1;
} finally {
  await disconnectDB();
}

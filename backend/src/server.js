import { once } from 'node:events';
import app from './app.js';
import { connectDB, DatabaseStartupError, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

import { startInventoryExtendJob } from './jobs/inventoryExtend.js';
import Inventory from './models/Inventory.js';
import Property from './models/Property.js';
import RoomType from './models/RoomType.js';
import User from './models/User.js';

let server;
let inventoryJob;
let shuttingDown = false;

async function start() {
  await connectDB();
  // Requests and overlapping extension jobs rely on the unique indexes.
  await Promise.all([User.init(), Property.init(), RoomType.init(), Inventory.init()]);
  inventoryJob = await startInventoryExtendJob();

  if (shuttingDown) return;
  server = app.listen(env.PORT, '0.0.0.0');
  await once(server, 'listening');
  console.log(`[server] listening on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[server] ${signal} received, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    console.error('[server] shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    const drained = server && new Promise((resolve) => server.close(resolve));
    await inventoryJob?.stop();
    await drained;
    await disconnectDB();
    clearTimeout(forceExit);
    console.log('[server] shutdown complete');
    process.exit(0);
  } catch {
    console.error('[server] failed to close the server or database connection');
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', () => {
  console.error('[process] unhandled promise rejection');
});

start().catch((error) => {
  if (shuttingDown) return;
  const message = error instanceof DatabaseStartupError ? error.message : 'Check database indexes, inventory initialization and PORT.';
  console.error(`[server] failed to start. ${message}`);
  process.exit(1);
});

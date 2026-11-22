import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
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

  server = app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
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

  await inventoryJob?.stop();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await disconnectDB();
  clearTimeout(forceExit);
  console.log('[server] shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[process] Unhandled promise rejection:', reason);
});

start().catch((error) => {
  console.error('[server] failed to start:', error);
  process.exit(1);
});

import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';

import User from './models/User.js';

let server;
let shuttingDown = false;

async function start() {
  await connectDB();
  // The first signups also need the unique email index to serialize duplicates.
  await User.init();

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

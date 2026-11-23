import cron from 'node-cron';
import { TIMEZONE } from '../config/booking.js';
import { extendInventoryWindow } from '../services/inventory.js';

async function extendAndLog() {
  let added;
  try {
    added = await extendInventoryWindow();
  } catch {
    // Cron logs thrown errors, including any driver diagnostics attached to them.
    throw new Error('Inventory extension failed. Check the database connection and nightly inventory indexes.');
  }
  console.log(`[inventory] added ${added} nightly inventory documents`);
}

export async function startInventoryExtendJob() {
  const task = cron.schedule('5 0 * * *', extendAndLog, { timezone: TIMEZONE, noOverlap: true });
  await extendAndLog();
  return task;
}

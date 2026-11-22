import cron from 'node-cron';
import { TIMEZONE } from '../config/booking.js';
import { extendInventoryWindow } from '../services/inventory.js';

async function extendAndLog() {
  const added = await extendInventoryWindow();
  console.log(`[inventory] added ${added} nightly inventory documents`);
}

export async function startInventoryExtendJob() {
  const task = cron.schedule('5 0 * * *', extendAndLog, { timezone: TIMEZONE, noOverlap: true });
  await extendAndLog();
  return task;
}

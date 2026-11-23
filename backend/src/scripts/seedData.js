import { seedDemoData } from '../services/demoSeed.js';
import { databaseCommand } from './databaseCommand.js';

await databaseCommand({ write: true }, async ({ log }) => {
  const summary = await seedDemoData({ reset: process.argv.includes('--reset') });
  log(JSON.stringify(summary, null, 2));
});

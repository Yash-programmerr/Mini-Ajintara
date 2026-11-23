import { databaseCommand } from './databaseCommand.js';

await databaseCommand({}, async ({ db, replicaSet, log }) => {
  log('Replica set: ' + (replicaSet ? 'yes' : 'no'));
  for (const name of ['users', 'properties', 'roomtypes', 'inventories']) {
    const count = await db.collection(name).countDocuments({});
    log(name + ': ' + count);
  }
});

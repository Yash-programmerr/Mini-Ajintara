import mongoose from 'mongoose';
import { loadScriptEnv } from '../config/scriptEnv.js';
import { formatScriptError, redact } from '../utils/redact.js';

export function checkTarget(options, write, confirmed, log) {
  const { srvHost, hosts, dbName } = options;
  const names = srvHost ? [srvHost] : hosts.map(({ host }) => host);
  const target = srvHost || hosts.map(host => host.toString()).join(',');
  log('Database target: ' + target + ' / ' + dbName);
  if (write && !confirmed && names.some(host => !['localhost', '127.0.0.1'].includes(host))) {
    throw new Error('A remote seed target requires --yes.');
  }
}

export async function databaseCommand({ write = false, admin = false }, run) {
  const log = message => console.log(redact(message));
  try {
    const { uri, account } = loadScriptEnv(admin);
    const client = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    try {
      checkTarget(client.options, write, process.argv.includes('--yes'), log);
      await client.connect();
      const db = client.db();
      const hello = await db.admin().command({ hello: 1 });
      if (write) {
        if (!hello.setName) throw new Error('MongoDB must be a replica set for seeding');
        mongoose.connection.setClient(client);
      }
      await run({ db, replicaSet: Boolean(hello.setName), account, log });
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error(formatScriptError(error));
    process.exitCode = 1;
  }
}

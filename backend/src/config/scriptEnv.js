import dns from 'node:dns';
import { isIP } from 'node:net';
import dotenv from 'dotenv';
import { z } from 'zod';
import { signupBody } from '../validators/auth.js';

export function parseDnsServers(value) {
  if (!value?.trim()) return [];
  const servers = value.split(',').map(entry => entry.trim());
  if (servers.some(server => !isIP(server))) throw new Error('DNS_SERVERS must contain comma-separated IP addresses');
  return servers;
}

export function loadScriptEnv(admin = false) {
  dotenv.config({ quiet: true });
  const servers = parseDnsServers(process.env.DNS_SERVERS);
  if (servers.length) {
    dns.setServers(servers);
    console.log('DNS override active for this command.');
  }
  const uri = z.string().trim().min(1).safeParse(process.env.MONGO_URI);
  if (!uri.success) throw new Error('MONGO_URI is required');
  if (!admin) return { uri: uri.data };
  const account = signupBody.omit({ role: true }).safeParse({
    name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
  });
  if (!account.success) {
    const fields = account.error.issues.map(issue => 'ADMIN_' + String(issue.path[0]).toUpperCase());
    throw new Error('Missing or invalid ' + fields.join(', '));
  }
  return { uri: uri.data, account: account.data };
}

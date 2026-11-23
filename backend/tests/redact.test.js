import { expect, it } from 'vitest';
import { formatScriptError, redact } from '../src/utils/redact.js';

const marker = (field) => 'fixture-' + field;
const env = Object.fromEntries(['ADMIN_PASSWORD', 'SEED_PASSWORD', 'JWT_SECRET'].map(key => [key, marker(key)]));
env.MONGO_URI = 'mongodb+srv://' + 'user:encoded%21@host.invalid/demo';

it.each(['mongodb', 'mongodb+srv'])('masks credentials in unrelated %s URLs', scheme => {
  expect(redact(scheme + '://user:pass@host.invalid/db', env)).toBe(scheme + '://***@host.invalid/db');
});

it('removes the full configured URI and standalone secrets from mixed text', () => {
  const pieces = [...Object.values(env), 'encoded!', 'encoded%21'];
  expect(redact(pieces.join(' '), env)).toBe(pieces.map(() => '***').join(' '));
});

it('retains safe DNS diagnostics', () => {
  const message = 'querySrv ECONNREFUSED _mongodb._tcp.host.invalid';
  expect(redact(message, {})).toBe(message);
});

it('prints redacted stacks only in debug mode', () => {
  const error = new TypeError(env.ADMIN_PASSWORD);
  expect(formatScriptError(error, env)).toBe('TypeError: ***');
  const debug = formatScriptError(error, { ...env, DEBUG_SEED: '1' });
  expect(debug).toContain('at ');
  expect(debug).not.toContain(env.ADMIN_PASSWORD);
});

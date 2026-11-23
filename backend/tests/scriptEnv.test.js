import { expect, it } from 'vitest';
import { parseDnsServers } from '../src/config/scriptEnv.js';

it.each([
  [undefined, []], ['', []], ['   ', []],
  ['192.0.2.1,192.0.2.2', ['192.0.2.1', '192.0.2.2']],
  [' 192.0.2.1 , 2001:db8::1 ', ['192.0.2.1', '2001:db8::1']],
])('parses DNS settings %s', (input, expected) => expect(parseDnsServers(input)).toEqual(expected));

it.each(['host.invalid', '300.1.1.1', ',192.0.2.1', '192.0.2.1,', '192.0.2.1,,::1'])(
  'rejects invalid DNS settings %s', input => expect(() => parseDnsServers(input)).toThrow('DNS_SERVERS'));

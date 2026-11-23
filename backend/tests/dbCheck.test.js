import { expect, it, vi } from 'vitest';
import { databaseCommand } from '../src/scripts/databaseCommand.js';

vi.mock('../src/scripts/databaseCommand.js', () => ({ databaseCommand: vi.fn() }));

it('checks the four collections using only countDocuments', async () => {
  const names = [];
  const log = vi.fn();
  const db = { collection(name) {
    names.push(name);
    return { countDocuments: async () => 0 };
  } };
  databaseCommand.mockImplementation(async (options, run) => {
    expect(options.write).toBeFalsy();
    await run({ db, replicaSet: true, log });
  });
  await import('../src/scripts/dbCheck.js');
  expect(names).toEqual(['users', 'properties', 'roomtypes', 'inventories']);
  expect(log.mock.calls.flat()).toEqual(['Replica set: yes', ...names.map(name => name + ': 0')]);
});

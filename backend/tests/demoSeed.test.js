import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import { demoRateRanges } from '../src/scripts/demoRates.js';
import { demoCatalog, seedAccounts } from '../src/scripts/demoCatalog.js';
import Inventory from '../src/models/Inventory.js';
import Property from '../src/models/Property.js';
import RoomType from '../src/models/RoomType.js';
import User from '../src/models/User.js';
import { checkTarget } from '../src/scripts/databaseCommand.js';
import { signup } from '../src/services/auth.js';
import { seedDemoData } from '../src/services/demoSeed.js';
import { createRoomTypeWithInventory } from '../src/services/inventory.js';
import { createProperty } from '../src/services/property.js';
import { useDisposableReplica } from './helpers/replica.js';
import { addDays } from '../src/utils/time.js';

const scriptPath = fileURLToPath(new URL('../src/scripts/seedData.js', import.meta.url));
const exec = promisify(execFile);
const password = 'only-for-seed-tests';
const emails = seedAccounts.map(({ email }) => email);
const expected = {
  properties: 14, cities: { Goa: 4, Jaipur: 4, Mumbai: 3, Manali: 3 },
  statuses: { approved: 11, pending: 2, rejected: 1 }, emails,
};

function runSeed(uri, flags = []) {
  return exec(process.execPath, [scriptPath, ...flags], {
    env: { ...process.env, MONGO_URI: uri, SEED_PASSWORD: password },
  });
}

it('groups weekend nights, rounds half up in rupees and uses the holiday rate on overlapping weekends', () => {
  // The instant is already Friday, 18 December in India.
  const ranges = demoRateRanges(123000, new Date('2026-12-17T18:30:00Z'));
  expect(ranges[0]).toEqual({ from: '2026-12-18', to: '2026-12-19', pricePaise: 141500 });
  expect(ranges[1]).toEqual({ from: '2026-12-24', to: '2027-01-01', pricePaise: 172200 });
  expect(ranges[2]).toEqual({ from: '2027-01-02', to: '2027-01-02', pricePaise: 141500 });
  expect(ranges.at(-1).to).toBe('2027-02-13');
});

it('clips holiday rates to the generated inventory window', () => {
  const ranges = demoRateRanges(10000, new Date('2027-01-01T04:30:00Z'));
  const holiday = ranges.filter(({ pricePaise }) => pricePaise === 14000);
  expect(holiday).toEqual([
    { from: '2027-01-01', to: '2027-01-01', pricePaise: 14000 },
    { from: '2027-12-24', to: '2027-12-31', pricePaise: 14000 },
  ]);
});

it('prints the remote host and database before requiring confirmation', () => {
  const options = new mongoose.mongo.MongoClient('mongodb://seed.example.test:27017/demo').options;
  const messages = [];
  expect(() => checkTarget(options, true, false, line => messages.push(line))).toThrow('--yes');
  expect(messages).toEqual(['Database target: seed.example.test:27017 / demo']);
});

describe.skipIf(!process.env.TEST_REPLICA_URI)('demo seed CLI on a disposable replica', () => {
  useDisposableReplica('demo_seed');

  it('seeds twice without duplicates and resets only seed-owned listings', async () => {
    // Preserve the replica options and credentials, replacing just the database name.
    const dbName = mongoose.connection.name;
    const uri = process.env.TEST_REPLICA_URI.replace(
      /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?/, (_, authority) => authority + '/' + dbName);
    const again = async (flags) => {
      const { stdout } = await runSeed(uri, ['--yes', ...flags]);
      expect(stdout).not.toContain(password);
      expect(JSON.parse(stdout.slice(stdout.indexOf('{')))).toEqual(expected);
    };
    await again([]);
    const propertyIds = async () => (await Property.distinct('_id')).map(String).sort();
    const before = await propertyIds();
    const users = await User.find().sort('email');
    await again([]);
    expect(await propertyIds()).toEqual(before);
    expect(await User.countDocuments()).toBe(3);
    expect(await RoomType.countDocuments()).toBe(31);
    expect(await Inventory.countDocuments()).toBe(31 * 365);
    expect(await Property.countDocuments({ partnerId: users[1]._id })).toBe(8);
    expect(await Property.countDocuments({ partnerId: users[2]._id })).toBe(6);
    expect(await RoomType.exists({ basePricePaise: { $gt: 750000 } })).toBeTruthy();
    const lastRoom = await RoomType.findOne({ name: 'Last Room Suite' });
    expect(lastRoom).toMatchObject({ basePricePaise: 750000, totalRooms: 1 });
    const firstNight = await Inventory.findOne({ roomTypeId: lastRoom._id }).sort('date');
    const ranges = demoRateRanges(750000, new Date(firstNight.date + 'T00:00:00Z'));
    for (const { from, pricePaise } of ranges) {
      expect(await Inventory.findOne({ roomTypeId: lastRoom._id, date: from })).toMatchObject({ pricePaise });
    }

    const { user } = await signup({ email: 'owner@example.org', name: 'Another Owner', role: 'partner', password });
    const other = await createProperty(user.id, demoCatalog[0].property);
    const room = await createRoomTypeWithInventory(other, demoCatalog[0].rooms[0], new Date('2026-11-22T04:00:00Z'));
    const futureDate = addDays(firstNight.date, 400);
    const future = new Date(futureDate + 'T00:00:00Z');
    expect(await seedDemoData({ password, now: future })).toEqual(expected);
    expect(await Inventory.countDocuments({ roomTypeId: lastRoom.id, date: { $gte: futureDate } })).toBe(365);
    expect(await Inventory.countDocuments({ roomTypeId: room.id })).toBe(365);
    await again(['--reset']);
    expect(await Property.exists({ _id: { $in: before } })).toBeNull();
    expect(await User.exists({ _id: user.id })).toBeTruthy();
    expect(await Property.exists({ _id: other.id })).toBeTruthy();
    expect(await RoomType.exists({ _id: room.id })).toBeTruthy();
    expect(await Inventory.countDocuments({ roomTypeId: room.id })).toBe(365);
    expect(await RoomType.countDocuments({ propertyId: { $in: before } })).toBe(0);
    expect(await Inventory.countDocuments({ propertyId: { $in: before } })).toBe(0);
    expect(await User.countDocuments({ _id: { $in: users.map(({ _id }) => _id) } })).toBe(3);
  }, 120000);
});

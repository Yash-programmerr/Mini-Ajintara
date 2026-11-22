import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/app.js';
import { env } from '../src/config/env.js';
import Inventory from '../src/models/Inventory.js';
import User from '../src/models/User.js';
import { createRoomTypeWithInventory } from '../src/services/inventory.js';
import { createProperty } from '../src/services/property.js';
import { addDays } from '../src/utils/time.js';
import { withTransaction } from '../src/utils/transaction.js';
import { useDisposableReplica } from './helpers/replica.js';

const now = new Date('2028-02-27T18:35:00Z');
const today = '2028-02-28';
const day = (offset) => addDays(today, offset);

describe.skipIf(!process.env.TEST_REPLICA_URI)('partner inventory API', () => {
  useDisposableReplica('inventory_http_test');
  let path, authorization, room;
  const put = (fields) => request(app).put(path).set('Authorization', authorization).send(fields);
  const get = (from, to) => request(app).get(path).set('Authorization', authorization).query({ from, to });
  beforeAll(async () => {
    const partner = await User.create({ name: 'Owner', email: 'owner@example.test', passwordHash: 'fixture', role: 'partner' });
    authorization = 'Bearer ' + jwt.sign({ sub: partner.id }, env.JWT_SECRET);
    const property = await createProperty(partner.id, {
      name: 'Garden Inn', city: 'Goa', address: '15 Palm Road', description: 'A small garden inn near the beach.',
      amenities: ['Wifi'], images: ['https://example.test/garden.jpg'],
    });
    room = await createRoomTypeWithInventory(property, { name: 'Garden Suite', basePricePaise: 750000, totalRooms: 5, maxGuests: 4 }, now);
    path = `/api/partner/room-types/${room.id}/inventory`;
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('edits inclusive dates independently and returns sorted inventory with availability', async () => {
    await put({ from: day(1), to: day(3), pricePaise: 800000 }).expect(200, { updatedDays: 3 });
    await put({ from: day(2), to: day(2), totalRooms: 2 }).expect(200, { updatedDays: 1 });
    const { body } = await get(today, day(4)).expect(200);
    expect(body.inventory).toEqual([0, 1, 2, 3, 4].map((i) => ({
      date: day(i), pricePaise: i > 0 && i < 4 ? 800000 : 750000, booked: 0,
      totalRooms: i === 2 ? 2 : 5, availableRooms: i === 2 ? 2 : 5,
    })));
  });

  it('accepts today and the final bookable night', async () => {
    for (const date of [today, day(364)]) {
      await put({ from: date, to: date, totalRooms: 5 }).expect(200, { updatedDays: 1 });
    }
  });

  it('returns the booked date and rolls back both fields on every night of the range', async () => {
    const from = day(10), to = day(12), blocked = day(11);
    await withTransaction((session) => Inventory.updateOne({ roomTypeId: room.id, date: blocked },
      { $set: { booked: 3 } }, { session }));
    const before = (await get(from, to).expect(200)).body;
    const conflict = await put({ from, to, totalRooms: 2, pricePaise: 125000 }).expect(409);
    expect(conflict.body.error).toMatchObject({ code: 'ROOMS_ALREADY_BOOKED', details: [blocked] });
    expect((await get(from, to).expect(200)).body).toEqual(before);
    await put({ from, to, totalRooms: 3 }).expect(200, { updatedDays: 3 });
    expect((await get(blocked, blocked).expect(200)).body.inventory[0]).toMatchObject({ booked: 3, availableRooms: 0 });
  });

  it('aborts a price-only edit with missing nights and limits conflict details to ten dates', async () => {
    const from = day(20), to = day(32);
    await withTransaction((session) => Inventory.deleteMany({
      roomTypeId: room.id, date: { $gt: from, $lt: to },
    }, { session }));
    const conflict = await put({ from, to, pricePaise: 100 }).expect(409);
    expect(conflict.body.error.details).toEqual(Array.from({ length: 10 }, (_, i) => day(i + 21)));
    const { body } = await get(from, to).expect(200);
    expect(body.inventory.map((row) => row.pricePaise)).toEqual([750000, 750000]);
  });

  it.each([
    ['past', { from: day(-1), to: today }, 'OUT_OF_WINDOW'],
    ['reversed', { from: day(2), to: today }, 'INVALID_RANGE'],
    ['beyond the window', { to: day(365) }, 'OUT_OF_WINDOW'],
    ['over 366 days', { to: day(366) }, 'INVALID_RANGE'],
    ['zero price', { pricePaise: 0 }, 'VALIDATION_ERROR'],
    ['fractional price', { pricePaise: 100.2 }, 'VALIDATION_ERROR'],
    ['no changes', { pricePaise: undefined }, 'VALIDATION_ERROR'],
    ['an instant', { from: '2028-02-28T00:00:00Z' }, 'VALIDATION_ERROR'],
  ])('rejects %s', async (_label, changes, code) => {
    const result = await put({ from: today, to: today, pricePaise: 100, ...changes }).expect(400);
    expect(result.body.error.code).toBe(code);
  });

  it('rejects an empty body and caps GET ranges at 366 inclusive nights', async () => {
    await put({}).expect(400);
    await get(today, day(365)).expect(200);
    const invalid = await get(today, day(366)).expect(400);
    expect(invalid.body.error.code).toBe('INVALID_RANGE');
  });
});

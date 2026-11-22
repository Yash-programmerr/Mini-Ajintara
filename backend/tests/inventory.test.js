import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Inventory from '../src/models/Inventory.js';
import RoomType from '../src/models/RoomType.js';
import {
  buildInventoryDocs, createRoomTypeWithInventory, extendInventoryWindow, getInventoryRange, updateInventoryRange,
} from '../src/services/inventory.js';
import { addDays } from '../src/utils/time.js';
import { withTransaction } from '../src/utils/transaction.js';
import { useDisposableReplica } from './helpers/replica.js';

const now = new Date('2028-02-27T18:35:00Z');
const today = '2028-02-28';
const property = { _id: new mongoose.Types.ObjectId() };
const fields = { name: 'Garden Room', basePricePaise: 750000, totalRooms: 5, maxGuests: 4 };

it('builds consecutive IST calendar nights across leap day from immutable room defaults', () => {
  const room = Object.freeze({ _id: 'suite', propertyId: 'hotel', ...fields });
  const docs = buildInventoryDocs(room, today, 3);
  expect(docs).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'].map((date) => ({
    roomTypeId: 'suite', propertyId: 'hotel', date, pricePaise: 750000, totalRooms: 5, booked: 0,
  })));
  expect(buildInventoryDocs(room, today, 0)).toEqual([]);
});

it('rejects fractional amounts and inventory outside room capacity', async () => {
  const doc = new Inventory({
    roomTypeId: new mongoose.Types.ObjectId(), propertyId: property._id,
    date: today, totalRooms: 2, booked: 3, pricePaise: 123.45,
  });
  await expect(doc.validate()).rejects.toMatchObject({ errors: {
    booked: expect.anything(), pricePaise: expect.anything(),
  } });
});

describe.skipIf(!process.env.TEST_REPLICA_URI)('inventory transactions', () => {
  useDisposableReplica('inventory_test');
  afterEach(async () => {
    vi.restoreAllMocks();
    await withTransaction(async (session) => {
      await Inventory.deleteMany({ propertyId: property._id }, { session });
      await RoomType.deleteMany({ propertyId: property._id }, { session });
    });
  });

  it('creates exactly 365 ordered nights with the room defaults', async () => {
    const room = await createRoomTypeWithInventory(property, fields, now);
    const docs = await Inventory.find({ roomTypeId: room.id }).sort({ date: 1 })
      .select('roomTypeId propertyId date pricePaise totalRooms booked -_id').lean();
    expect(docs).toEqual(buildInventoryDocs(room, today, 365));
  });

  it('rolls back the room type when insertion of nightly inventory fails', async () => {
    vi.spyOn(Inventory, 'insertMany').mockRejectedValueOnce(new Error('Inventory insertion failed'));
    await expect(createRoomTypeWithInventory(property, fields, now)).rejects.toThrow('Inventory insertion failed');
    expect(await RoomType.countDocuments()).toBe(0);
    expect(await Inventory.countDocuments()).toBe(0);
  });

  it('extends each room by ten nights, even with competing jobs, and retains overrides', async () => {
    const first = await createRoomTypeWithInventory(property, fields, now);
    const second = await createRoomTypeWithInventory(property, { ...fields, basePricePaise: 1400000 }, now);
    const later = new Date('2028-03-08T18:35:00Z');
    const specialNight = addDays(today, 14);
    await updateInventoryRange(first, { from: specialNight, to: specialNight, pricePaise: 99999 }, now);
    const added = await Promise.all([extendInventoryWindow(later), extendInventoryWindow(later)]);
    expect(added[0] + added[1]).toBe(20);
    expect(await extendInventoryWindow(later)).toBe(0);
    expect(await getInventoryRange(first.id, specialNight, specialNight)).toMatchObject([{ pricePaise: 99999 }]);
    for (const room of [first, second]) {
      const newNights = await getInventoryRange(room.id, addDays(today, 365), addDays(today, 374));
      expect(newNights).toHaveLength(10);
      for (const night of newNights) expect(night.pricePaise).toBe(room.basePricePaise);
      expect(await Inventory.countDocuments({ roomTypeId: room.id })).toBe(375);
    }
  });
});

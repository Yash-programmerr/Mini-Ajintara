import { INVENTORY_DAYS } from '../config/booking.js';
import Inventory from '../models/Inventory.js';
import RoomType from '../models/RoomType.js';
import { addDays, todayIST } from '../utils/time.js';
import { withTransaction } from '../utils/transaction.js';

function inclusiveDays(from, to) {
  return (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
}

export function buildInventoryDocs(roomType, fromDate, dayCount) {
  return Array.from({ length: dayCount }, (_, index) => ({
    roomTypeId: roomType._id,
    propertyId: roomType.propertyId,
    date: addDays(fromDate, index),
    pricePaise: roomType.basePricePaise,
    totalRooms: roomType.totalRooms,
    booked: 0,
  }));
}

export function createRoomTypeWithInventory(property, data, now = new Date()) {
  const from = todayIST(now);
  return withTransaction(async (session) => {
    const [room] = await RoomType.create([{ ...data, propertyId: property._id }], { session });
    await Inventory.insertMany(buildInventoryDocs(room, from, INVENTORY_DAYS), { session });
    return room;
  });
}

async function insertMissingDates(docs) {
  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { roomTypeId: doc.roomTypeId, date: doc.date },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));
  const write = () => withTransaction((session) => Inventory.bulkWrite(operations, { session }));
  try {
    return (await write()).upsertedCount;
  } catch (error) {
    // A competing job can commit the same unique keys during an upsert. A fresh
    // transaction then matches those nights without changing partner overrides.
    if (error.code !== 11000) throw error;
    return (await write()).upsertedCount;
  }
}

export async function extendInventoryWindow(now = new Date()) {
  const today = todayIST(now);
  const end = addDays(today, INVENTORY_DAYS - 1);
  const latest = await Inventory.aggregate([
    { $sort: { roomTypeId: 1, date: 1 } },
    { $group: { _id: '$roomTypeId', date: { $last: '$date' } } },
  ]);
  const lastDate = new Map(latest.map((row) => [String(row._id), row.date]));
  let inserted = 0;
  for await (const room of RoomType.find().lean().cursor()) {
    const last = lastDate.get(String(room._id));
    if (last >= end) continue;
    const from = last && last >= today ? addDays(last, 1) : today;
    inserted += await insertMissingDates(buildInventoryDocs(room, from, inclusiveDays(from, end)));
  }
  return inserted;
}

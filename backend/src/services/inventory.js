import { INVENTORY_DAYS } from '../config/booking.js';
import Inventory from '../models/Inventory.js';
import RoomType from '../models/RoomType.js';
import { AppError } from '../utils/AppError.js';
import { addDays, isValidDateString, todayIST } from '../utils/time.js';
import { withTransaction } from '../utils/transaction.js';

function inclusiveDays(from, to) {
  return (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
}

function rangeLength(from, to) {
  if (!isValidDateString(from) || !isValidDateString(to) || from > to || inclusiveDays(from, to) > 366) {
    throw new AppError(400, 'INVALID_RANGE', 'Choose a date range of 1 to 366 consecutive nights');
  }
  return inclusiveDays(from, to);
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

export async function extendInventoryWindow(now = new Date(), propertyIds) {
  const today = todayIST(now);
  const end = addDays(today, INVENTORY_DAYS - 1);
  const scope = propertyIds ? { propertyId: { $in: propertyIds } } : {};
  const latest = await Inventory.aggregate([
    ...(propertyIds ? [{ $match: scope }] : []),
    { $sort: { roomTypeId: 1, date: 1 } },
    { $group: { _id: '$roomTypeId', date: { $last: '$date' } } },
  ]);
  const lastDate = new Map(latest.map((row) => [String(row._id), row.date]));
  let inserted = 0;
  for await (const room of RoomType.find(scope).lean().cursor()) {
    const last = lastDate.get(String(room._id));
    if (last >= end) continue;
    const from = last && last >= today ? addDays(last, 1) : today;
    inserted += await insertMissingDates(buildInventoryDocs(room, from, inclusiveDays(from, end)));
  }
  return inserted;
}

export async function getInventoryRange(roomTypeId, from, to) {
  rangeLength(from, to);
  const nights = await Inventory.find({ roomTypeId, date: { $gte: from, $lte: to } })
    .select('date pricePaise totalRooms booked -_id').sort({ date: 1 }).lean();
  return nights.map((night) => ({ ...night, availableRooms: night.totalRooms - night.booked }));
}

export function updateInventoryRange(roomType, { from, to, pricePaise, totalRooms }, now = new Date()) {
  const days = rangeLength(from, to);
  const today = todayIST(now);
  if (from < today || to > addDays(today, INVENTORY_DAYS - 1)) {
    throw new AppError(400, 'OUT_OF_WINDOW', `Choose dates within the ${INVENTORY_DAYS}-night bookable window`);
  }
  const filter = { roomTypeId: roomType._id, date: { $gte: from, $lte: to } };
  const fields = {};
  if (pricePaise !== undefined) fields.pricePaise = pricePaise;
  if (totalRooms !== undefined) {
    filter.booked = { $lte: totalRooms };
    fields.totalRooms = totalRooms;
  }
  if (!Object.keys(fields).length) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Provide a nightly price or room count');
  }
  return withTransaction(async (session) => {
    const { matchedCount } = await Inventory.updateMany(filter, { $set: fields }, { session, runValidators: true });
    if (matchedCount < days) {
      // The same predicate still matches the successful writes since booked is
      // unchanged. Its complement also identifies missing inventory nights.
      const matched = new Set(await Inventory.distinct('date', filter).session(session));
      const conflicts = [];
      for (let i = 0; i < days && conflicts.length < 10; i++) {
        const date = addDays(from, i);
        if (!matched.has(date)) conflicts.push(date);
      }
      throw new AppError(409, 'ROOMS_ALREADY_BOOKED',
        'The listed nights have more bookings than the requested capacity or are missing inventory.', conflicts);
    }
    return { updatedDays: matchedCount };
  });
}

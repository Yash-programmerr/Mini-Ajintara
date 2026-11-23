import Inventory from '../models/Inventory.js';
import Property from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import User from '../models/User.js';
import { createAccount } from './account.js';
import { createRoomTypeWithInventory, extendInventoryWindow, updateInventoryRange } from './inventory.js';
import { createProperty, reviewProperty } from './property.js';
import { withTransaction } from '../utils/transaction.js';
import { signupBody } from '../validators/auth.js';
import { demoCatalog, rejectReason, seedAccounts } from '../scripts/demoCatalog.js';
import { demoRateRanges } from '../scripts/demoRates.js';

async function seedAccount(account, password) {
  let user = await User.findOne({ email: account.email });
  if (!user) {
    const input = signupBody.parse({ ...account, password });
    try {
      user = await createAccount(input);
    } catch (error) {
      if (error.code !== 'EMAIL_TAKEN') throw error;
      user = await User.findOne({ email: account.email });
    }
  }
  if (user?.role !== account.role) throw new Error('A seed email already has a different role.');
  return user;
}

async function resetPartnerListings(partnerIds) {
  await withTransaction(async (session) => {
    const owners = { partnerId: { $in: partnerIds } };
    const ids = await Property.distinct('_id', owners).session(session);
    const children = { propertyId: { $in: ids } };
    await Inventory.deleteMany(children, { session });
    await RoomType.deleteMany(children, { session });
    await Property.deleteMany(owners, { session });
  });
}

async function seedListing(partnerId, listing, now) {
  const { property: data, rooms, status } = listing;
  let property = await Property.findOne({ partnerId, name: data.name });
  property ??= await createProperty(partnerId, data);
  const existingRooms = await RoomType.find({ propertyId: property.id });
  for (const fields of rooms) {
    const roomType = existingRooms.find(({ name }) => name === fields.name)
      ?? await createRoomTypeWithInventory(property, fields, now);
    if (property.status === 'approved' || (property.status === 'pending' && status === 'approved')) {
      for (const range of demoRateRanges(roomType.basePricePaise, now)) {
        await updateInventoryRange(roomType, range, now);
      }
    }
  }
  if (property.status === 'pending' && status !== 'pending') {
    await reviewProperty(property.id, status === 'approved' ? 'approve' : 'reject', status === 'rejected' ? rejectReason : undefined);
  }
}

export async function seedDemoData({ password = process.env.SEED_PASSWORD || 'Demo@12345', reset = false, now = new Date() } = {}) {
  await Promise.all([User.init(), Property.init(), RoomType.init(), Inventory.init()]);
  const users = [];
  for (const account of seedAccounts) users.push(await seedAccount(account, password));
  const partnerIds = users.filter(({ role }) => role === 'partner').map(({ id }) => id);
  if (reset) {
    await resetPartnerListings(partnerIds);
  } else {
    // The CLI may run after downtime, before the server's daily extension has caught up.
    const existing = await Property.distinct('_id', { partnerId: { $in: partnerIds } });
    if (existing.length) await extendInventoryWindow(now, existing);
  }
  for (const listing of demoCatalog) await seedListing(users[listing.partner].id, listing, now);

  const properties = await Property.find({ partnerId: { $in: partnerIds } }).select('city status');
  const cities = {}, statuses = {};
  for (const { city, status } of properties) {
    cities[city] = (cities[city] ?? 0) + 1;
    statuses[status] = (statuses[status] ?? 0) + 1;
  }
  return { properties: properties.length, cities, statuses, emails: users.map(({ email }) => email) };
}

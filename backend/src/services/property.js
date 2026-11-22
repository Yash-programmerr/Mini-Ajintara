import Property, { normalizeCityKey } from '../models/Property.js';
import RoomType from '../models/RoomType.js';
import { AppError } from '../utils/AppError.js';
import { reviewBody } from '../validators/property.js';

const missingProperty = () => new AppError(404, 'NOT_FOUND', 'Property not found');
const missingRoomType = () => new AppError(404, 'NOT_FOUND', 'Room type not found');

export async function findOwnedProperty(id, partnerId) {
  const property = await Property.findOne({ _id: id, partnerId });
  if (!property) throw missingProperty();
  return property;
}

export async function findOwnedRoomType(id, partnerId) {
  const room = await RoomType.findById(id);
  if (!room || !await Property.exists({ _id: room.propertyId, partnerId })) throw missingRoomType();
  return room;
}

export function createProperty(partnerId, data) {
  return Property.create({ ...data, partnerId, cityKey: normalizeCityKey(data.city), status: 'pending' });
}

export async function updateProperty(id, partnerId, data) {
  const fields = { ...data };
  if (data.city !== undefined) fields.cityKey = normalizeCityKey(data.city);
  // Read the review status at write time so a simultaneous review and edit stay ordered.
  // $literal also keeps field values beginning with '$' as user-entered text.
  const updates = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { $literal: value }]));
  const rejected = { $eq: ['$status', 'rejected'] };
  const property = await Property.findOneAndUpdate({ _id: id, partnerId }, [{ $set: {
    ...updates,
    status: { $cond: [rejected, 'pending', '$status'] },
    rejectReason: { $cond: [rejected, null, '$rejectReason'] },
  } }], { returnDocument: 'after', updatePipeline: true });
  if (!property) throw missingProperty();
  return property;
}

async function withRoomTypes(properties) {
  if (!properties.length) return [];
  const rooms = await RoomType.find({ propertyId: { $in: properties.map((p) => p._id) } }).sort({ _id: 1 });
  const roomsByProperty = new Map(properties.map((p) => [p.id, []]));
  for (const room of rooms) roomsByProperty.get(room.propertyId.toString()).push(room);
  return properties.map((p) => ({ ...p.toJSON(), roomTypes: roomsByProperty.get(p.id) ?? [] }));
}

export async function listOwnedProperties(partnerId) {
  return withRoomTypes(await Property.find({ partnerId }).sort({ createdAt: -1, _id: -1 }));
}

export async function getOwnedProperty(id, partnerId) {
  const [property] = await withRoomTypes([await findOwnedProperty(id, partnerId)]);
  return property;
}

export async function getAdminProperty(id) {
  const property = await Property.findById(id).populate('partnerId', 'name email');
  if (!property) throw missingProperty();
  const [result] = await withRoomTypes([property]);
  return result;
}

export async function listAdminProperties({ status, page, limit }) {
  const [items, total] = await Promise.all([
    Property.find({ status }).sort({ createdAt: 1, _id: 1 }).skip((page - 1) * limit)
      .limit(limit).populate('partnerId', 'name email'),
    Property.countDocuments({ status }),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function reviewProperty(id, action, reason) {
  const parsed = reviewBody.safeParse({ action, reason });
  if (!parsed.success) throw new AppError(400, 'VALIDATION_ERROR', 'Supply a valid action and rejection reason');
  const status = action === 'approve' ? 'approved' : 'rejected';
  const property = await Property.findOneAndUpdate({ _id: id, status: 'pending' }, {
    $set: { status, rejectReason: status === 'rejected' ? parsed.data.reason : null },
  }, { returnDocument: 'after', runValidators: true });
  if (property) return property;
  if (!await Property.exists({ _id: id })) throw missingProperty();
  throw new AppError(409, 'NOT_PENDING', 'This property has already been reviewed');
}

export async function updateOwnedRoomType(id, partnerId, data) {
  const room = await findOwnedRoomType(id, partnerId);
  const updated = await RoomType.findOneAndUpdate({ _id: id, propertyId: room.propertyId }, { $set: data },
    { returnDocument: 'after', runValidators: true });
  if (!updated) throw missingRoomType();
  return updated;
}

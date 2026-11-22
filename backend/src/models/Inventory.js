import mongoose from 'mongoose';
import { isValidDateString } from '../utils/time.js';
import { integerField, publicId } from './fields.js';

const inventorySchema = new mongoose.Schema({
  roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'RoomType', required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  date: { type: String, required: true, validate: isValidDateString },
  pricePaise: integerField(100, 10000000),
  totalRooms: integerField(1, 500),
  booked: { ...integerField(0, 500), default: 0 },
}, { toJSON: publicId });

inventorySchema.pre('validate', function () {
  if (this.booked > this.totalRooms) this.invalidate('booked', 'Bookings exceed total rooms');
});
inventorySchema.index({ roomTypeId: 1, date: 1 }, { unique: true });
inventorySchema.index({ propertyId: 1, date: 1 });

export default mongoose.model('Inventory', inventorySchema);

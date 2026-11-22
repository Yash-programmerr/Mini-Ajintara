import mongoose from 'mongoose';
import { integerField, publicId } from './fields.js';

const roomTypeSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
  name: { type: String, trim: true, required: true, minlength: 2, maxlength: 60 },
  basePricePaise: integerField(100, 10000000),
  totalRooms: integerField(1, 500),
  maxGuests: integerField(1, 20),
}, { timestamps: true, toJSON: publicId });

export default mongoose.model('RoomType', roomTypeSchema);

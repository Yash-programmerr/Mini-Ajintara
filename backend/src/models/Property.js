import mongoose from 'mongoose';
import { publicId } from './fields.js';

export const normalizeCityKey = (city) => city.trim().toLowerCase().replace(/\s+/gu, ' ');

const propertySchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, trim: true, required: true, minlength: 3, maxlength: 100 },
  city: { type: String, trim: true, required: true, minlength: 2, maxlength: 60 },
  cityKey: { type: String, required: true },
  address: { type: String, trim: true, required: true, minlength: 5, maxlength: 200 },
  description: { type: String, trim: true, required: true, minlength: 10, maxlength: 2000 },
  amenities: [{ type: String, trim: true }],
  images: { type: [String], required: true, validate: (urls) => urls.length >= 1 && urls.length <= 10 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', required: true },
  rejectReason: { type: String, default: null },
}, { timestamps: true, toJSON: publicId });

propertySchema.pre('validate', function () {
  if (this.city) this.cityKey = normalizeCityKey(this.city);
});
propertySchema.index({ cityKey: 1, status: 1 });

export default mongoose.model('Property', propertySchema);

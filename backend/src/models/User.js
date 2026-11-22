import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, required: true },
  email: { type: String, trim: true, lowercase: true, required: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['guest', 'partner', 'admin'], default: 'guest' },
  isBlocked: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, json) {
      json.id = doc.id;
      delete json._id;
      delete json.__v;
      delete json.passwordHash;
      return json;
    },
  },
});

export default mongoose.model('User', userSchema);

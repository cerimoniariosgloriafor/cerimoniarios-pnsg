import { Schema, model } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  fullName: { type: String },
  email: { type: String },
  phone: { type: String },
  birthDate: { type: Date },
  address: { type: String },
  profession: { type: String },
  sacraments: [{ type: String }],
  preferredCommunity: { type: String },
  otherPastorals: [{ type: String }],
  note: { type: String },
  order: { type: Number, default: 0 },
  role: { type: String, enum: ['servo','admin'], default: 'servo' },
  passwordHash: { type: String, select: false },
  mustChangePassword: { type: Boolean, default: false }
}, { timestamps: true });

export default model('User', UserSchema);

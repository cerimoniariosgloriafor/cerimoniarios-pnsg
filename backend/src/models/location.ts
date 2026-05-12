import { Schema, model } from 'mongoose';

const LocationSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true });

export default model('Location', LocationSchema);

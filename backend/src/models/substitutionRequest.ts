import { Schema, model, Types, models } from 'mongoose';

const SubstitutionRequestSchema = new Schema({
  eventId: { type: Types.ObjectId, ref: 'AgendaEvent', required: true },
  targetEventId: { type: Types.ObjectId, ref: 'AgendaEvent' },
  originalUserId: { type: Types.ObjectId, ref: 'User', required: true },
  substituteUserId: { type: Types.ObjectId, ref: 'User' },
  requestType: { type: String, enum: ['HELP', 'DIRECT', 'SWAP'], default: 'HELP' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'OPEN', 'AWAITING_SUBSTITUTE'], default: 'PENDING' },
  reason: { type: String },
  requestedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const SubstitutionRequestModel = (models && (models.SubstitutionRequest as any)) || model('SubstitutionRequest', SubstitutionRequestSchema);
export default SubstitutionRequestModel;

import { Schema, model, Types } from 'mongoose';

const AuditLogSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  logType: { type: String, required: true, enum: ['login', 'session_restored', 'create', 'update', 'delete'] },
  collectionName: { type: String },
  documentId: { type: Types.ObjectId },
  oldValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
}, { timestamps: true });

export default model('AuditLog', AuditLogSchema);

import { Schema, model, Types, models } from 'mongoose';

const AgendaEventUserSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User' },
  roles: [{ type: String }], // e.g. 'M.C', 'C.A', 'C.L'
  checkedInAt: { type: Date }
}, { _id: false });

const ChecklistItemSchema = new Schema({
  role: { type: String, required: true },
  task: { type: String, required: true },
  status: { type: String, enum: ['Sim', 'Nao', 'N/A'], default: 'N/A' },
  updatedBy: { type: Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date }
}, { _id: false });

const OccurrenceSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true },
  note: { type: String }
}, { _id: false, timestamps: true });

const AgendaEventSchema = new Schema({
  date: { type: Date, required: true },
  templateId: { type: Types.ObjectId, ref: 'ShiftTemplate' },
  title: { type: String },
  color: { type: String, enum: ['verde', 'branco', 'roxo', 'vermelho'] },
  priestName: { type: String, required: true },
  locationId: { type: Types.ObjectId, ref: 'Location' },
  time: { start: { type: String } },
  users: [AgendaEventUserSchema],
  createdBy: { type: Types.ObjectId, ref: 'User' },
  checklist: [ChecklistItemSchema],
  acolyteCount: { type: Number, default: 0 },
  occurrences: [OccurrenceSchema]
}, { timestamps: true });

const AgendaEventModel = (models && (models.AgendaEvent as any)) || model('AgendaEvent', AgendaEventSchema);
export default AgendaEventModel;

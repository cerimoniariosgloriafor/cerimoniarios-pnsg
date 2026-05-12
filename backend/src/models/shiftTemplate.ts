import { Schema, model, Types } from 'mongoose';

const RecurrenceSchema = new Schema({
  type: { type: String, enum: ['single','weekly','monthlyByWeekday','monthlyByMonthday'], required: true },
  weekly: {
    interval: { type: Number, default: 1 },
    weekdays: [{ type: Number }] // 1=Monday .. 7=Sunday
  },
  monthlyByWeekday: {
    weekOfMonth: { type: Number }, // 1..5
    weekday: { type: Number } // 1..7
  },
  monthlyByMonthday: {
    dayOfMonth: { type: Number } // 1..31
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date }
}, { _id: false });

const ShiftTemplateSchema = new Schema({
  title: { type: String, required: true },
  locationId: { type: Types.ObjectId, ref: 'Location' },
  time: {
    start: { type: String }
  },
  users: [{ type: Types.ObjectId, ref: 'User' }],
  recurrence: { type: RecurrenceSchema, required: true },
  exceptions: [{ type: Date }],
  isDominicalForRotation: { type: Boolean, default: false },
  createdBy: { type: Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default model('ShiftTemplate', ShiftTemplateSchema);
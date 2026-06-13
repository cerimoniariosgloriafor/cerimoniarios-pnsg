import mongoose from 'mongoose';

const roleFunctionSchema = new mongoose.Schema({
  role: { type: String, required: true },
  task: { type: String, required: true }
}, {
  timestamps: true
});

export default mongoose.models.RoleFunction || mongoose.model('RoleFunction', roleFunctionSchema);

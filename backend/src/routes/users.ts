import { Router } from 'express';
import User from '../models/user';
import bcrypt from 'bcryptjs';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name, fullName, birthDate, address, profession, sacraments, preferredCommunity, otherPastorals, note, email, phone, password, mustChangePassword, role } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'invalid email' });
    if (phone && !/^[0-9+\-()\s]{6,}$/.test(phone)) return res.status(400).json({ error: 'invalid phone' });

    const roleVal = role === 'admin' ? 'admin' : 'servo';
    // determine order: append to end
    const maxOrderDoc = await User.findOne().sort({ order: -1 }).limit(1);
    const nextOrder = (maxOrderDoc && typeof (maxOrderDoc as any).order === 'number') ? ((maxOrderDoc as any).order + 1) : 1;
    const u = new User({ name, fullName, birthDate: birthDate || undefined, address, profession, sacraments: sacraments || [], preferredCommunity, otherPastorals: otherPastorals || [], note, email, phone, role: roleVal, order: nextOrder });
    const mustChange = typeof mustChangePassword === 'boolean' ? mustChangePassword : (password ? false : true);
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      (u as any).passwordHash = hash;
      (u as any).mustChangePassword = mustChange;
    } else {
      (u as any).mustChangePassword = mustChange;
    }

    await u.save();
    const obj = u.toObject();
    delete obj.passwordHash;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: 'failed to create user' });
  }
});

// reorder endpoint: accept array of ids in desired order
router.post('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    // update each user with its index+1
    const ops = ids.map((id: string, idx: number) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: idx + 1 } } } }));
    await User.bulkWrite(ops as any);
    res.json({ success: true });
  } catch (err) {
    console.error('reorder error', err);
    res.status(500).json({ error: 'failed to reorder users' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await User.find().sort({ order: 1, name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch users' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json(user);
  } catch (err) {
    console.error('users GET by id error', err);
    res.status(500).json({ error: 'failed to fetch user', details: (err as any)?.message });
  }
});

router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, fullName, birthDate, address, profession, sacraments, preferredCommunity, otherPastorals, note, email, phone, password, mustChangePassword, role } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'email or phone required' });
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'invalid email' });
    if (phone && !/^[0-9+\-()\s]{6,}$/.test(phone)) return res.status(400).json({ error: 'invalid phone' });

    const update: any = { name, fullName, birthDate: birthDate || undefined, address, profession, sacraments: sacraments || [], preferredCommunity, otherPastorals: otherPastorals || [], note, email, phone };
    // if role provided, validate and include
    if (typeof role === 'string') {
      update.role = role === 'admin' ? 'admin' : 'servo';
    }
    if (typeof mustChangePassword === 'boolean') update.mustChangePassword = mustChangePassword;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      update.passwordHash = hash;
      if (typeof mustChangePassword !== 'boolean') update.mustChangePassword = false;
    }

    const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'user not found' });
    const obj = updated.toObject(); delete obj.passwordHash; res.json(obj);
  } catch (err) {
    console.error('users POST (update) error', err);
    res.status(500).json({ error: 'failed to update user', details: (err as any)?.message });
  }
});

router.post('/:id/toggle-archive', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'user not found' });
    (user as any).archived = !(user as any).archived;
    await user.save();
    res.json({ success: true, archived: (user as any).archived });
  } catch (err) {
    console.error('toggle archive error', err);
    res.status(500).json({ error: 'failed to toggle archive', details: (err as any)?.message });
  }
});

router.post('/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'user not found' });

    let suspendedUntil = null;
    if (typeof days === 'number' && days > 0) {
      suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + days);
      // set to end of day to cover the entire last day
      suspendedUntil.setHours(23, 59, 59, 999);
    } else if (days === 0 || days === null) {
      // Clear suspension
      suspendedUntil = null;
    } else {
      return res.status(400).json({ error: 'Invalid days parameter' });
    }

    (user as any).suspendedUntil = suspendedUntil;
    await user.save();

    // If suspended, remove from upcoming events within the suspension period
    if (suspendedUntil) {
      const AgendaEvent = require('../models/agendaEvent').default;
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Find all events between now and suspendedUntil where this user is assigned
      await AgendaEvent.updateMany(
        { 
          date: { $gte: now, $lte: suspendedUntil },
          'users.userId': user._id
        },
        { 
          $pull: { users: { userId: user._id } } 
        }
      );
    }

    res.json({ success: true, suspendedUntil: (user as any).suspendedUntil });
  } catch (err) {
    console.error('suspend user error', err);
    res.status(500).json({ error: 'failed to suspend user', details: (err as any)?.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'user not found' });
    res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error('users DELETE error', err);
    res.status(500).json({ error: 'failed to delete user', details: (err as any)?.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const confirmQuery = (req.query?.confirm || '').toString().toLowerCase();
    const headerConfirm = (req.header('x-confirm-delete') || '').toString().toLowerCase();
    if (confirmQuery !== 'yes' && headerConfirm !== 'true') {
      return res.status(400).json({ error: "confirmation required: provide ?confirm=yes or header 'X-Confirm-Delete: true'" });
    }

    const result = await User.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('users DELETE all error', err);
    res.status(500).json({ error: 'failed to delete users', details: (err as any)?.message });
  }
});

export default router;

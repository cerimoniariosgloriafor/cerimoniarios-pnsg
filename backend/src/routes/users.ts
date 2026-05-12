import { Router } from 'express';
import User from '../models/user';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const u = new User(req.body);
    await u.save();
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'failed to create user' });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await User.find();
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
    const updated = await User.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'user not found' });
    res.json(updated);
  } catch (err) {
    console.error('users POST (update) error', err);
    res.status(500).json({ error: 'failed to update user', details: (err as any)?.message });
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

import { Router } from 'express';
import RoleFunction from '../models/roleFunction';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const functions = await RoleFunction.find().sort({ role: 1, position: 1 });
    res.json(functions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role functions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { role, task } = req.body;
    const count = await RoleFunction.countDocuments({ role });
    const rf = new RoleFunction({ role, task, position: count });
    await rf.save();
    res.status(201).json(rf);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create role function' });
  }
});

router.put('/reorder', async (req, res) => {
  try {
    const { role, orderedIds } = req.body;

    if (!role || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'Invalid payload for reordering.' });
    }

    const promises = orderedIds.map((id, index) =>
      RoleFunction.updateOne({ _id: id, role }, { $set: { position: index } })
    );

    await Promise.all(promises);

    res.json({ success: true, message: `Reordered tasks for role ${role}.` });
  } catch (err) {
    console.error('Failed to reorder tasks', err);
    res.status(500).json({ error: 'Failed to reorder role functions' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const rf = await RoleFunction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(rf);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update role function' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await RoleFunction.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete role function' });
  }
});

export default router;

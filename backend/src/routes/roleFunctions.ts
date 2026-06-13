import { Router } from 'express';
import RoleFunction from '../models/roleFunction';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const functions = await RoleFunction.find().sort({ role: 1, createdAt: 1 });
    res.json(functions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch role functions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const rf = new RoleFunction(req.body);
    await rf.save();
    res.status(201).json(rf);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create role function' });
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

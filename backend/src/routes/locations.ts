import { Router } from 'express';
import Location from '../models/location';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const loc = new Location(req.body);
    await loc.save();
    res.json(loc);
  } catch (err) {
    res.status(500).json({ error: 'failed to create location' });
  }
});

router.post('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Location.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'location not found' });
    res.json(updated);
  } catch (err) {
    console.error('locations POST (update) error', err);
    res.status(500).json({ error: 'failed to update location', details: (err as any)?.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const list = await Location.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch locations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loc = await Location.findById(id);
    if (!loc) return res.status(404).json({ error: 'location not found' });
    res.json(loc);
  } catch (err) {
    console.error('locations GET by id error', err);
    res.status(500).json({ error: 'failed to fetch location', details: (err as any)?.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const confirmQuery = (req.query?.confirm || '').toString().toLowerCase();
    const headerConfirm = (req.header('x-confirm-delete') || '').toString().toLowerCase();
    if (confirmQuery !== 'yes' && headerConfirm !== 'true') {
      return res.status(400).json({ error: "confirmation required: provide ?confirm=yes or header 'X-Confirm-Delete: true'" });
    }

    const result = await Location.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('locations DELETE all error', err);
    res.status(500).json({ error: 'failed to delete locations', details: (err as any)?.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Location.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'location not found' });
    res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error('locations DELETE error', err);
    res.status(500).json({ error: 'failed to delete location', details: (err as any)?.message });
  }
});

export default router;

import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;

    const body = req.body;
    if (!body.title || !body.recurrence || !body.recurrence.type || !body.recurrence.startDate) {
      return res.status(400).json({ error: 'title, recurrence.type and recurrence.startDate required' });
    }

    if (body.recurrence.startDate) body.recurrence.startDate = new Date(body.recurrence.startDate);
    if (body.recurrence.endDate) body.recurrence.endDate = new Date(body.recurrence.endDate);

    const t = new ShiftTemplate(body);
    await t.save();
    res.json(t);
  } catch (err) {
    console.error('shiftTemplates POST error', err);
    res.status(500).json({ error: 'failed to create template', details: (err as any)?.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;

    const list = await ShiftTemplate.find().populate('locationId').populate('users');
    res.json(list);
  } catch (err) {
    console.error('shiftTemplates GET error', err);
    res.status(500).json({ error: 'failed to fetch templates', details: (err as any)?.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;
    const t = await ShiftTemplate.findById(req.params.id).populate('locationId').populate('users');
    if (!t) return res.status(404).json({ error: 'template not found' });
    res.json(t);
  } catch (err) {
    console.error('shiftTemplates GET by id error', err);
    res.status(500).json({ error: 'failed to fetch template', details: (err as any)?.message });
  }
});

router.post('/:id', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;
    if (req.body.recurrence?.startDate) req.body.recurrence.startDate = new Date(req.body.recurrence.startDate);
    if (req.body.recurrence?.endDate) req.body.recurrence.endDate = new Date(req.body.recurrence.endDate);
    const updated = await ShiftTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'template not found' });
    res.json(updated);
  } catch (err) {
    console.error('shiftTemplates POST (update) error', err);
    res.status(500).json({ error: 'failed to update template', details: (err as any)?.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shifttemplate').default;
    const deleted = await ShiftTemplate.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'template not found' });
    res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error('shiftTemplates DELETE error', err);
    res.status(500).json({ error: 'failed to delete template', details: (err as any)?.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const confirmQuery = (req.query?.confirm || '').toString().toLowerCase();
    const headerConfirm = (req.header('x-confirm-delete') || '').toString().toLowerCase();
    if (confirmQuery !== 'yes' && headerConfirm !== 'true') {
      return res.status(400).json({ error: "confirmation required: provide ?confirm=yes or header 'X-Confirm-Delete: true'" });
    }
    const ShiftTemplate = require('../models/shifttemplate').default;
    const result = await ShiftTemplate.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('shiftTemplates DELETE all error', err);
    res.status(500).json({ error: 'failed to delete templates', details: (err as any)?.message });
  }
});

export default router;

import { Router } from 'express';
import { expandTemplateOccurrences } from '../utils/rruleHelper';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;

    const body = req.body || {};
    if (!body.recurrence || !body.recurrence.type) {
      return res.status(400).json({ error: 'recurrence.type required' });
    }

    if (!body.recurrence.startDate) {
      body.recurrence.startDate = new Date();
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

// New bulk import endpoint: accept an array of template payloads and create them one-by-one
router.post('/bulk', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'expected an array of templates' });

    const results: Array<any> = [];

    for (let i = 0; i < items.length; i++) {
      const raw = items[i] || {};
      try {
        // basic validation
        if (!raw.recurrence || !raw.recurrence.type) {
          results.push({ index: i, success: false, error: 'recurrence.type required' });
          continue;
        }

        const payload = { ...raw };
        // normalize dates
        if (!payload.recurrence.startDate) payload.recurrence.startDate = new Date();
        if (payload.recurrence.startDate) payload.recurrence.startDate = new Date(payload.recurrence.startDate);
        if (payload.recurrence.endDate) payload.recurrence.endDate = new Date(payload.recurrence.endDate);

        const doc = new ShiftTemplate(payload);
        await doc.save();
        results.push({ index: i, success: true, id: doc._id });
      } catch (errItem) {
        console.error('bulk create error item', i, errItem);
        results.push({ index: i, success: false, error: (errItem as any)?.message || String(errItem) });
      }
    }

    res.json({ results, count: results.filter(r => r.success).length });
  } catch (err) {
    console.error('shiftTemplates BULK POST error', err);
    res.status(500).json({ error: 'failed to import templates', details: (err as any)?.message });
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

// move occurrences route here (before the ':id' param route) to avoid collisions with 'occurrences' string
router.get('/occurrences', async (req, res) => {
  try {
    const ShiftTemplate = require('../models/shiftTemplate').default;
    const dateStr = (req.query.date || '').toString();
    if (!dateStr) return res.status(400).json({ error: 'date query required (YYYY-MM-DD)' });
    // parse YYYY-MM-DD into a local date to avoid timezone shifts (new Date("YYYY-MM-DD") parses as UTC)
    const parts = dateStr.split('-').map(p => parseInt(p, 10));
    if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid date' });
    const d = new Date(parts[0], parts[1] - 1, parts[2]);

    const start = new Date(d);
    start.setHours(0,0,0,0);
    const end = new Date(d);
    end.setHours(23,59,59,999);

    const list = await ShiftTemplate.find().populate('locationId').populate('users');
    const results: any[] = [];
    for (const t of list) {
      const occ = expandTemplateOccurrences(t.toObject ? t.toObject() : t, start, end);
      if (occ && occ.length) {
        results.push({ template: t, occurrences: occ });
      }
    }

    res.json(results);
  } catch (err) {
    console.error('shiftTemplates occurrences error', err);
    res.status(500).json({ error: 'failed to compute occurrences', details: (err as any)?.message });
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
    const ShiftTemplate = require('../models/shiftTemplate').default;
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
    const ShiftTemplate = require('../models/shiftTemplate').default;
    const result = await ShiftTemplate.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('shiftTemplates DELETE all error', err);
    res.status(500).json({ error: 'failed to delete templates', details: (err as any)?.message });
  }
});

export default router;

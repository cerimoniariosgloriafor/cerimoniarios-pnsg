import { Router } from 'express';
const router = Router();

// Helper to check for suspended users
async function checkSuspendedUsers(users: any[], eventDate: Date) {
  if (!users || !users.length) return null;
  const User = require('../models/user').default;
  const userIds = users.map(u => u.userId);
  const foundUsers = await User.find({ _id: { $in: userIds } });
  
  for (const user of foundUsers) {
    if (user.suspendedUntil && new Date(user.suspendedUntil) >= eventDate) {
      return user.name; // Return the name of the suspended user
    }
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const body = req.body || {};
    if (!body.date) return res.status(400).json({ error: 'date required' });
    if (!body.priestName) return res.status(400).json({ error: 'priestName required' });

    // parse date as local if string YYYY-MM-DD
    if (typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      const parts = body.date.split('-').map((p: string) => parseInt(p, 10));
      body.date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else if (body.date) {
      body.date = new Date(body.date);
    }
    // ensure the stored date is normalized to local midnight to avoid UTC shifts
    if (body.date && body.date instanceof Date && !isNaN(body.date.getTime())) {
      body.date.setHours(0,0,0,0);
    }

    // Check for suspended users
    if (body.users) {
      const suspendedName = await checkSuspendedUsers(body.users, body.date);
      if (suspendedName) {
        return res.status(400).json({ error: `Usuário ${suspendedName} está suspenso e não pode ser escalado nesta data.` });
      }
    }

    if (body.color === '') {
      body.color = undefined;
    }

    const ev = new AgendaEvent(body);
    await ev.save();
    const populated = await AgendaEvent.findById(ev._id).populate('locationId').populate('users.userId');
    res.json(populated || ev);
  } catch (err) {
    console.error('agendaEvents POST error', err);
    res.status(500).json({ error: 'failed to create event', details: (err as any)?.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const dateStr = (req.query.date || '').toString();
    const startDateStr = (req.query.startDate || '').toString();

    if (dateStr) {
      const parts = dateStr.split('-').map((p: string) => parseInt(p, 10));
      if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid date' });
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      const list = await AgendaEvent.find({ date: { $gte: start, $lte: end } }).populate('locationId').populate('users.userId');
      return res.json(list);
    }
    
    if (startDateStr) {
      const parts = startDateStr.split('-').map((p: string) => parseInt(p, 10));
      if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid startDate' });
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const start = new Date(d); start.setHours(0,0,0,0);
      const list = await AgendaEvent.find({ date: { $gte: start } }).sort({ date: 1, 'time.start': 1 }).populate('locationId').populate('users.userId');
      return res.json(list);
    }
    const listAll = await AgendaEvent.find().populate('locationId').populate('users.userId');
    res.json(listAll);
  } catch (err) {
    console.error('agendaEvents GET error', err);
    res.status(500).json({ error: 'failed to fetch events', details: (err as any)?.message });
  }
});

// get by id
router.get('/:id', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const ev = await AgendaEvent.findById(req.params.id).populate('locationId').populate('users.userId');
    if (!ev) return res.status(404).json({ error: 'event not found' });
    res.json(ev);
  } catch (err) {
    console.error('agendaEvents GET by id error', err);
    res.status(500).json({ error: 'failed to fetch event', details: (err as any)?.message });
  }
});

// update by id
router.post('/:id', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const body = req.body || {};
    if (body.date && typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      const parts = body.date.split('-').map((p: string) => parseInt(p, 10));
      body.date = new Date(parts[0], parts[1] - 1, parts[2]);
    } else if (body.date) {
      body.date = new Date(body.date);
    }
    // normalize to local midnight so updates don't introduce a time component that shifts day
    if (body.date && body.date instanceof Date && !isNaN(body.date.getTime())) {
      body.date.setHours(0,0,0,0);
    }

    // Check for suspended users
    if (body.users && body.date) {
      const suspendedName = await checkSuspendedUsers(body.users, body.date);
      if (suspendedName) {
        return res.status(400).json({ error: `Usuário ${suspendedName} está suspenso e não pode ser escalado nesta data.` });
      }
    }

    if (body.color === '') {
      body.$unset = { color: 1 };
      delete body.color;
    }

    const updated = await AgendaEvent.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'event not found' });
    const populated = await AgendaEvent.findById(updated._id).populate('locationId').populate('users.userId');
    res.json(populated || updated);
  } catch (err) {
    console.error('agendaEvents POST (update) error', err);
    res.status(500).json({ error: 'failed to update event', details: (err as any)?.message });
  }
});

// delete by id
router.delete('/:id', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const deleted = await AgendaEvent.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'event not found' });
    res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error('agendaEvents DELETE error', err);
    res.status(500).json({ error: 'failed to delete event', details: (err as any)?.message });
  }
});

// checkin by id
router.post('/:id/checkin', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const event = await AgendaEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'event not found' });

    const userEntry = event.users.find((u: any) => String(u.userId) === String(userId));
    if (!userEntry) return res.status(400).json({ error: 'user not assigned to this event' });

    userEntry.checkedInAt = new Date();
    await event.save();
    
    res.json({ success: true, checkedInAt: userEntry.checkedInAt });
  } catch (err) {
    console.error('agendaEvents checkin error', err);
    res.status(500).json({ error: 'failed to checkin', details: (err as any)?.message });
  }
});

router.post('/:id/cancel-checkin', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const event = await AgendaEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'event not found' });

    const userEntry = event.users.find((u: any) => String(u.userId) === String(userId));
    if (!userEntry) return res.status(400).json({ error: 'user not assigned to this event' });

    userEntry.checkedInAt = null;
    await event.save();
    
    res.json({ success: true, checkedInAt: null });
  } catch (err) {
    console.error('agendaEvents cancel checkin error', err);
    res.status(500).json({ error: 'failed to cancel checkin', details: (err as any)?.message });
  }
});

export default router;

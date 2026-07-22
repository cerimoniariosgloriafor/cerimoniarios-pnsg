import { Router } from 'express';
import { expandTemplateOccurrences } from '../utils/rruleHelper';
const router = Router();

// Helper to check for unavailable users
async function checkUnavailableUsers(users: any[], eventDate: Date) {
  if (!users || !users.length) return null;
  const User = require('../models/user').default;
  const userIds = users.map(u => u.userId);
  const foundUsers = await User.find({ _id: { $in: userIds } });
  
  for (const user of foundUsers) {
    if (user.suspendedUntil && new Date(user.suspendedUntil) >= eventDate) {
      return { name: user.name, reason: 'suspenso' };
    }
    if (user.unavailableUntil && new Date(user.unavailableUntil) >= eventDate) {
      return { name: user.name, reason: 'indisponível' };
    }
  }
  return null;
}

function normalizeLocalDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parts = value.split('-').map((p: string) => parseInt(p, 10));
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function hasDuplicateAgendaEvent(AgendaEvent: any, params: { date: Date; locationId?: any; timeStart?: string; ignoreId?: string }) {
  const { date, locationId, timeStart, ignoreId } = params;
  if (!date || !locationId || !timeStart) return false;
  const { start, end } = getDayRange(date);
  const query: any = {
    locationId,
    'time.start': timeStart,
    date: { $gte: start, $lte: end }
  };
  if (ignoreId) {
    query._id = { $ne: ignoreId };
  }
  const existing = await AgendaEvent.findOne(query);
  return !!existing;
}

router.post('/', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const body = req.body || {};
    if (!body.date) return res.status(400).json({ error: 'date required' });
    if (!body.priestName) return res.status(400).json({ error: 'priestName required' });

    const generateRecurringCount = Math.max(0, parseInt(String(body.generateRecurringCount || 0), 10) || 0);
    const templateId = body.templateId;
    let templateDoc: any = null;
    const normalizedDate = normalizeLocalDate(body.date);
    if (!normalizedDate) return res.status(400).json({ error: 'date required' });
    body.date = normalizedDate;

    const timeStart = body.time?.start || '';
    if (!timeStart) return res.status(400).json({ error: 'time.start required' });

    if (generateRecurringCount > 0) {
      if (!templateId) {
        return res.status(400).json({ error: 'templateId required to generate recurring events' });
      }

      const ShiftTemplate = require('../models/shiftTemplate').default;
      templateDoc = await ShiftTemplate.findById(templateId).populate('locationId').populate('users');
      if (!templateDoc) {
        return res.status(404).json({ error: 'template not found' });
      }
    }

    if (await hasDuplicateAgendaEvent(AgendaEvent, { date: body.date, locationId: body.locationId, timeStart })) {
      return res.status(400).json({ error: 'Já existe um evento cadastrado para este local e horário.' });
    }

    // Check for unavailable users
    if (body.users) {
      const unavailableUser = await checkUnavailableUsers(body.users, body.date);
      if (unavailableUser) {
        return res.status(400).json({ error: `Usuário ${unavailableUser.name} está ${unavailableUser.reason} e não pode ser escalado nesta data.` });
      }
    }

    if (body.color === '') {
      body.color = undefined;
    }

    const ev = new AgendaEvent(body);
    await ev.save();

    let generated: any[] = [];
    if (generateRecurringCount > 0) {
      const startRange = new Date(body.date);
      startRange.setDate(startRange.getDate() + 1);
      const endRange = new Date(body.date);
      endRange.setFullYear(endRange.getFullYear() + 5);

      const occurrences = expandTemplateOccurrences(templateDoc.toObject ? templateDoc.toObject() : templateDoc, startRange, endRange);
      const futureDates = occurrences.slice(0, generateRecurringCount);

      for (const futureDate of futureDates) {
        const futureDoc = new AgendaEvent({
          ...body,
          date: futureDate,
          createdAt: undefined,
          updatedAt: undefined
        });

        const duplicate = await hasDuplicateAgendaEvent(AgendaEvent, {
          date: futureDate,
          locationId: body.locationId,
          timeStart,
        });

        if (duplicate) {
          generated.push({ date: futureDate, skipped: true, reason: 'duplicate' });
          continue;
        }

        await futureDoc.save();
        generated.push({ date: futureDate, skipped: false, id: futureDoc._id });
      }
    }

    const populated = await AgendaEvent.findById(ev._id).populate('locationId').populate('users.userId');
    res.json({
      event: populated || ev,
      generatedCount: generated.filter(item => !item.skipped).length,
      skippedCount: generated.filter(item => item.skipped).length,
    });
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
    const endDateStr = (req.query.endDate || '').toString();
    const locationId = (req.query.locationId || '').toString();

    const baseQuery: any = {};
    if (locationId) {
      baseQuery.locationId = locationId;
    }

    if (dateStr) {
      const parts = dateStr.split('-').map((p: string) => parseInt(p, 10));
      if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid date' });
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const start = new Date(d); start.setHours(0,0,0,0);
      const end = new Date(d); end.setHours(23,59,59,999);
      const list = await AgendaEvent.find({ ...baseQuery, date: { $gte: start, $lte: end } }).sort({ date: 1, 'time.start': 1 }).populate('locationId').populate('users.userId');
      return res.json(list);
    }
    
    if (startDateStr || endDateStr) {
      const dateQuery: any = {};
      if (startDateStr) {
      const parts = startDateStr.split('-').map((p: string) => parseInt(p, 10));
      if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid startDate' });
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const start = new Date(d); start.setHours(0,0,0,0);
        dateQuery.$gte = start;
      }
      if (endDateStr) {
        const parts = endDateStr.split('-').map((p: string) => parseInt(p, 10));
        if (parts.length < 3 || parts.some(p => isNaN(p))) return res.status(400).json({ error: 'invalid endDate' });
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const end = new Date(d); end.setHours(23,59,59,999);
        dateQuery.$lte = end;
      }
      const list = await AgendaEvent.find({ ...baseQuery, date: dateQuery }).sort({ date: 1, 'time.start': 1 }).populate('locationId').populate('users.userId');
      return res.json(list);
    }
    const listAll = await AgendaEvent.find(baseQuery).sort({ date: 1, 'time.start': 1 }).populate('locationId').populate('users.userId');
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
    const ev = await AgendaEvent.findById(req.params.id)
      .populate('locationId')
      .populate('users.userId')
      .populate('occurrences.userId');
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
    const normalizedDate = normalizeLocalDate(body.date);
    if (!normalizedDate) return res.status(400).json({ error: 'date required' });
    body.date = normalizedDate;

    const timeStart = body.time?.start || '';
    if (!timeStart) return res.status(400).json({ error: 'time.start required' });

    if (await hasDuplicateAgendaEvent(AgendaEvent, { date: body.date, locationId: body.locationId, timeStart, ignoreId: req.params.id })) {
      return res.status(400).json({ error: 'Já existe um evento cadastrado para este local e horário.' });
    }

    // Check for unavailable users
    if (body.users && body.date) {
      const unavailableUser = await checkUnavailableUsers(body.users, body.date);
      if (unavailableUser) {
        return res.status(400).json({ error: `Usuário ${unavailableUser.name} está ${unavailableUser.reason} e não pode ser escalado nesta data.` });
      }
    }

    if (body.color === '') {
      body.$unset = { color: 1 };
      delete body.color;
    }

    const updated = await AgendaEvent.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: 'event not found' });
    const populated = await AgendaEvent.findById(updated._id)
      .populate('locationId')
      .populate('users.userId')
      .populate('occurrences.userId');
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
    userEntry.checkInBy = 'user';
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
    userEntry.checkInBy = undefined;
    await event.save();
    
    res.json({ success: true, checkedInAt: null });
  } catch (err) {
    console.error('agendaEvents cancel checkin error', err);
    res.status(500).json({ error: 'failed to cancel checkin', details: (err as any)?.message });
  }
});

router.put('/:id/checklist-status', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const { role, task, status, userId } = req.body;

    if (!role || !task || !status || !userId) {
      return res.status(400).json({ error: 'Role, task, status, and userId are required.' });
    }

    const event = await AgendaEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Find the checklist item and update its status
    let itemFound = false;
    for (const item of event.checklist) {
      if (item.role === role && item.task === task) {
        item.status = status;
        item.updatedBy = userId;
        item.updatedAt = new Date();
        itemFound = true;
        break;
      }
    }

    if (!itemFound) {
        // If the item doesn't exist, add it
        event.checklist.push({ role, task, status, updatedBy: userId, updatedAt: new Date() });
    }

    await event.save();
    res.json({ success: true, message: 'Checklist item updated successfully.' });
  } catch (err) {
    console.error('Failed to update checklist item status', err);
    res.status(500).json({ error: 'Failed to update checklist item status', details: (err as any)?.message });
  }
});

router.post('/:id/manual-check-in', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const event = await AgendaEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'event not found' });

    const userEntry = event.users.find((u: any) => String(u.userId) === String(userId));
    if (!userEntry) return res.status(400).json({ error: 'user not assigned to this event' });

    userEntry.checkedInAt = new Date();
    userEntry.checkInBy = 'admin';
    await event.save();
    
    const populated = await AgendaEvent.findById(event._id)
      .populate('locationId')
      .populate('users.userId')
      .populate('occurrences.userId');
    res.json(populated || event);
  } catch (err) {
    console.error('agendaEvents manual checkin error', err);
    res.status(500).json({ error: 'failed to manual checkin', details: (err as any)?.message });
  }
});

export default router;

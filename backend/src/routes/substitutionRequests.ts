import { Router } from 'express';
import SubstitutionRequest from '../models/substitutionRequest';
import AgendaEvent from '../models/agendaEvent';

const router = Router();

// Get all active substitution requests (PENDING or OPEN)
router.get('/', async (req, res) => {
  try {
    const requests = await SubstitutionRequest.find({
      status: { $in: ['PENDING', 'OPEN'] }
    }).populate('eventId').populate('originalUserId').populate('substituteUserId');
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { eventId, originalUserId, substituteUserId, reason } = req.body;
    const status = substituteUserId ? 'PENDING' : 'OPEN';
    const request = new SubstitutionRequest({
      eventId,
      originalUserId,
      substituteUserId: substituteUserId || undefined,
      status,
      reason
    });
    await request.save();
    res.status(201).json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin approves a request, or a user takes an OPEN request
router.post('/:id/approve', async (req, res) => {
  try {
    const { substituteUserId } = req.body; // Can be provided if someone is taking an OPEN request
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    if (request.status === 'OPEN' && substituteUserId) {
        request.substituteUserId = substituteUserId;
    }
    
    // We update the agenda event
    const event = await AgendaEvent.findById(request.eventId);
    if (event) {
      const userIndex = event.users.findIndex((u: any) => String(u.userId) === String(request.originalUserId));
      if (userIndex > -1) {
        // Keep the roles, just change the userId
        event.users[userIndex].userId = request.substituteUserId;
        await event.save();
      }
    }

    request.status = 'APPROVED';
    await request.save();
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin rejects a request
router.post('/:id/reject', async (req, res) => {
  try {
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    
    request.status = 'REJECTED';
    await request.save();
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

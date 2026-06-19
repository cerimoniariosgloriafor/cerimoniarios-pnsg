import { Router } from 'express';
import SubstitutionRequest from '../models/substitutionRequest';
import AgendaEvent from '../models/agendaEvent';
import User from '../models/user';

const router = Router();

// Get active substitution requests by default, or all requests for a specific event when requested
router.get('/', async (req, res) => {
  try {
    const eventId = (req.query.eventId || '').toString();
    const includeAll = String(req.query.all || '') === 'true';

    const query: any = {};
    if (eventId) {
      query.eventId = eventId;
    }
    if (!includeAll) {
      query.status = { $in: ['PENDING', 'OPEN'] };
    }

    const requests = await SubstitutionRequest.find(query)
      .sort({ createdAt: 1 })
      .populate('eventId')
      .populate('originalUserId')
      .populate('substituteUserId');
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

// A user volunteers to take an OPEN request (needs admin approval)
router.post('/:id/volunteer', async (req, res) => {
  try {
    const { substituteUserId } = req.body;
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'OPEN') return res.status(400).json({ error: 'Request is not OPEN' });

    request.substituteUserId = substituteUserId;
    request.status = 'PENDING';
    await request.save();
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin approves a request
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

    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const msg = request.substituteUserId 
        ? 'Sua solicitação de substituição foi APROVADA.' 
        : 'Seu pedido de ajuda foi APROVADO.';
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }
    
    if (request.substituteUserId) {
      const substituteUser = await User.findById(request.substituteUserId);
      if (substituteUser) {
        (substituteUser as any).notifications.push({ message: `Sua substituição para o irmão ${originalUser?.name || ''} foi APROVADA.` });
        await substituteUser.save();
      }
    }

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

    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const msg = request.substituteUserId 
        ? 'Sua solicitação de substituição foi RECUSADA.' 
        : 'Seu pedido de ajuda foi RECUSADO/CANCELADO.';
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }

    if (request.substituteUserId) {
      const substituteUser = await User.findById(request.substituteUserId);
      if (substituteUser) {
        (substituteUser as any).notifications.push({ message: `Sua substituição para o irmão ${originalUser?.name || ''} foi RECUSADA.` });
        await substituteUser.save();
      }
    }

    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

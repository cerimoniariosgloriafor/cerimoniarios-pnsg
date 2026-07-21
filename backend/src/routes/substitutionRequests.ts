import { Router } from 'express';
import SubstitutionRequest from '../models/substitutionRequest';
import AgendaEvent from '../models/agendaEvent';
import User from '../models/user';

const router = Router();

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function parseEventStart(event: any) {
  if (!event || !event.date) return null;
  const start = new Date(event.date);
  const [hours, minutes] = String(event.time?.start || '00:00').split(':').map((v: string) => parseInt(v, 10));
  start.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return start;
}

async function hasConflictWithinTwoHours(userId: string, targetEvent: any, ignoreEventIds: string[] = []) {
  if (!userId || !targetEvent) return false;
  const targetStart = parseEventStart(targetEvent);
  if (!targetStart) return false;

  const query: any = { 'users.userId': userId };
  if (ignoreEventIds.length > 0) {
    query._id = { $nin: ignoreEventIds };
  }

  const events = await AgendaEvent.find(query).populate('users.userId');
  return events.some((event: any) => {
    const eventStart = parseEventStart(event);
    if (!eventStart) return false;
    return Math.abs(eventStart.getTime() - targetStart.getTime()) < TWO_HOURS_MS;
  });
}

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
      query.status = { $in: ['PENDING', 'OPEN', 'AWAITING_SUBSTITUTE'] };
    }

    const requests = await SubstitutionRequest.find(query)
      .sort({ createdAt: 1 })
      .populate({ path: 'eventId', populate: { path: 'locationId' } })
      .populate({ path: 'targetEventId', populate: { path: 'locationId' } })
      .populate('originalUserId')
      .populate('substituteUserId');
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { eventId, targetEventId, originalUserId, substituteUserId, reason } = req.body;
    const requestType = String(req.body.requestType || '').toUpperCase();
    const normalizedType = requestType === 'DIRECT' || requestType === 'SWAP' || requestType === 'HELP'
      ? requestType
      : (substituteUserId ? 'DIRECT' : 'HELP');
    const status = normalizedType === 'HELP' ? 'OPEN' : 'AWAITING_SUBSTITUTE';

    if (normalizedType === 'SWAP') {
      if (!targetEventId) return res.status(400).json({ error: 'targetEventId required for swap requests' });
      if (!substituteUserId) return res.status(400).json({ error: 'substituteUserId required for swap requests' });

      const sourceEvent = await AgendaEvent.findById(eventId).populate('users.userId');
      const swapEvent = await AgendaEvent.findById(targetEventId).populate('users.userId');
      if (!sourceEvent) return res.status(404).json({ error: 'event not found' });
      if (!swapEvent) return res.status(404).json({ error: 'target event not found' });
      if (String(sourceEvent._id) === String(swapEvent._id)) {
        return res.status(400).json({ error: 'Você não pode trocar uma escala com ela mesma.' });
      }

      const sourceHasUser = (sourceEvent.users || []).some((u: any) => String(u.userId?._id || u.userId) === String(originalUserId));
      const targetHasUser = (swapEvent.users || []).some((u: any) => String(u.userId?._id || u.userId) === String(substituteUserId));
      if (!sourceHasUser) return res.status(400).json({ error: 'Você precisa estar escalado na escala de origem.' });
      if (!targetHasUser) return res.status(400).json({ error: 'O outro cerimoniário precisa estar escalado na escala de destino.' });

      const sourceStart = parseEventStart(sourceEvent);
      const targetStart = parseEventStart(swapEvent);
      if (!sourceStart || !targetStart) {
        return res.status(400).json({ error: 'Não foi possível calcular os horários das escalas para a troca.' });
      }

      const requesterConflict = await hasConflictWithinTwoHours(String(originalUserId), swapEvent, [String(sourceEvent._id), String(swapEvent._id)]);
      if (requesterConflict) {
        return res.status(400).json({ error: 'Você já tem outra escala com menos de 2 horas de diferença para essa troca.' });
      }

      const substituteConflict = await hasConflictWithinTwoHours(String(substituteUserId), sourceEvent, [String(sourceEvent._id), String(swapEvent._id)]);
      if (substituteConflict) {
        return res.status(400).json({ error: 'O outro cerimoniário já tem outra escala com menos de 2 horas de diferença para essa troca.' });
      }
    }

    const request = new SubstitutionRequest({
      eventId,
      targetEventId: normalizedType === 'SWAP' ? targetEventId : undefined,
      originalUserId,
      substituteUserId: substituteUserId || undefined,
      requestType: normalizedType,
      status,
      reason
    });
    await request.save();

    if (substituteUserId && normalizedType !== 'HELP') {
      const originalUser = await User.findById(originalUserId);
      const substituteUser = await User.findById(substituteUserId);
      if (substituteUser) {
        const msg = normalizedType === 'SWAP'
          ? `${originalUser?.name || 'Um cerimoniário'} pediu troca de escala com você.`
          : `${originalUser?.name || 'Um cerimoniário'} pediu substituição com você.`;
        (substituteUser as any).notifications.push({ message: msg });
        await substituteUser.save();
      }
    }

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

// Substitute accepts a direct request
router.post('/:id/accept-substitute', async (req, res) => {
  try {
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'AWAITING_SUBSTITUTE') return res.status(400).json({ error: 'Request is not awaiting substitute confirmation' });

    // TODO: check if logged in user is the substituteUserId

    request.status = 'PENDING';
    await request.save();

    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const substituteUser = await User.findById(request.substituteUserId);
      const msg = request.requestType === 'SWAP'
        ? `${substituteUser?.name || 'O outro cerimoniário'} aceitou a troca de escala. Aguardando aprovação dos coordenadores.`
        : `${substituteUser?.name || 'O outro cerimoniário'} aceitou a substituição. Aguardando aprovação dos coordenadores.`;
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }

    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Substitute rejects a direct request
router.post('/:id/reject-substitute', async (req, res) => {
  try {
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });
    if (request.status !== 'AWAITING_SUBSTITUTE') return res.status(400).json({ error: 'Request is not awaiting substitute confirmation' });

    // TODO: check if logged in user is the substituteUserId

    request.status = 'REJECTED';
    await request.save();
    
    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const substituteUser = await User.findById(request.substituteUserId);
      const msg = request.requestType === 'SWAP'
        ? `${substituteUser?.name || 'O outro cerimoniário'} recusou a troca de escala.`
        : `${substituteUser?.name || 'O outro cerimoniário'} recusou a substituição.`;
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }
    
    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { userId } = req.body || {};
    const request = await SubstitutionRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    if (request.requestType === 'SWAP' && request.status === 'PENDING' && userId) {
      const originalId = String(request.originalUserId);
      const substituteId = String(request.substituteUserId);
      if (String(userId) === substituteId && String(userId) !== originalId) {
        return res.status(403).json({ error: 'Only the original requester can cancel an approved swap pending admin approval.' });
      }
    }

    request.status = 'REJECTED';
    await request.save();

    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const substituteUser = await User.findById(request.substituteUserId);
      const msg = request.requestType === 'SWAP'
        ? `${substituteUser?.name || 'O outro cerimoniário'} cancelou a troca de escala.`
        : `${substituteUser?.name || 'O outro cerimoniário'} cancelou a substituição.`;
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }

    if (request.substituteUserId) {
      const substituteUser = await User.findById(request.substituteUserId);
      if (substituteUser) {
        const msg = request.requestType === 'SWAP'
          ? `A troca de escala com ${originalUser?.name || ''} foi cancelada.`
          : `A substituição para ${originalUser?.name || ''} foi cancelada.`;
        (substituteUser as any).notifications.push({ message: msg });
        await substituteUser.save();
      }
    }

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

    if (request.requestType === 'SWAP') {
      const originalEvent = await AgendaEvent.findById(request.eventId);
      const targetEvent = await AgendaEvent.findById(request.targetEventId);
      if (!originalEvent) return res.status(404).json({ error: 'event not found' });
      if (!targetEvent) return res.status(404).json({ error: 'target event not found' });

      const originalUserIndex = originalEvent.users.findIndex((u: any) => String(u.userId) === String(request.originalUserId));
      const targetUserIndex = targetEvent.users.findIndex((u: any) => String(u.userId) === String(request.substituteUserId));
      if (originalUserIndex < 0) return res.status(400).json({ error: 'Usuário original não está mais escalado na escala de origem.' });
      if (targetUserIndex < 0) return res.status(400).json({ error: 'Usuário substituto não está mais escalado na escala de destino.' });

      const requesterConflict = await hasConflictWithinTwoHours(String(request.originalUserId), targetEvent, [String(originalEvent._id), String(targetEvent._id)]);
      if (requesterConflict) {
        return res.status(400).json({ error: 'A troca não pode ser aprovada porque a nova escala conflita com outra do solicitante em menos de 2 horas.' });
      }

      const substituteConflict = await hasConflictWithinTwoHours(String(request.substituteUserId), originalEvent, [String(originalEvent._id), String(targetEvent._id)]);
      if (substituteConflict) {
        return res.status(400).json({ error: 'A troca não pode ser aprovada porque a nova escala conflita com outra do outro cerimoniário em menos de 2 horas.' });
      }

      const originalUserIdValue = originalEvent.users[originalUserIndex].userId;
      originalEvent.users[originalUserIndex].userId = targetEvent.users[targetUserIndex].userId;
      targetEvent.users[targetUserIndex].userId = originalUserIdValue;
      await originalEvent.save();
      await targetEvent.save();
    } else {
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
    }

    request.status = 'APPROVED';
    await request.save();

    const originalUser = await User.findById(request.originalUserId);
    if (originalUser) {
      const msg = request.requestType === 'SWAP'
        ? 'Sua troca de escala foi APROVADA.'
        : request.substituteUserId
          ? 'Sua solicitação de substituição foi APROVADA.'
          : 'Seu pedido de ajuda foi APROVADO.';
      (originalUser as any).notifications.push({ message: msg });
      await originalUser.save();
    }
    
    if (request.substituteUserId) {
      const substituteUser = await User.findById(request.substituteUserId);
      if (substituteUser) {
        const msg = request.requestType === 'SWAP'
          ? `Sua troca de escala com ${originalUser?.name || ''} foi APROVADA.`
          : `Sua substituição para o ${originalUser?.name || ''} foi APROVADA.`;
        (substituteUser as any).notifications.push({ message: msg });
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
        (substituteUser as any).notifications.push({ message: `Sua substituição para o ${originalUser?.name || ''} foi RECUSADA.` });
        await substituteUser.save();
      }
    }

    res.json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

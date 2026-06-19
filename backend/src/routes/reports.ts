import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/masses', async (req, res) => {
  try {
    const AgendaEvent = require('../models/agendaEvent').default;
    const User = require('../models/user').default;
    const SubstitutionRequest = require('../models/substitutionRequest').default;

    const startDateStr = (req.query.startDate || '').toString();
    const endDateStr = (req.query.endDate || '').toString();

    let query: any = {};
    
    if (startDateStr || endDateStr) {
      query.date = {};
      if (startDateStr) {
        const parts = startDateStr.split('-').map((p: string) => parseInt(p, 10));
        const start = new Date(parts[0], parts[1] - 1, parts[2]);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDateStr) {
        const parts = endDateStr.split('-').map((p: string) => parseInt(p, 10));
        const end = new Date(parts[0], parts[1] - 1, parts[2]);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const events = await AgendaEvent.find(query).populate('users.userId');
    const allUsers = await User.find({ archived: { $ne: true } }).sort({ name: 1 });

    const reportData = new Map();

    allUsers.forEach((user: any) => {
      reportData.set(String(user._id), {
        userId: user._id,
        name: user.name,
        fullName: user.fullName || user.name,
        email: user.email,
        faltas: 0,
        servicos: 0,
        substituido: 0,
        substituto: 0,
        funcoesAssumidas: {} as Record<string, number>,
      });
    });

    const now = new Date();
    const eventIds = events.map((e: any) => e._id);
    
    const approvedSubstitutions = await SubstitutionRequest.find({
      eventId: { $in: eventIds },
      status: 'APPROVED'
    });

    approvedSubstitutions.forEach((req: any) => {
      const origId = String(req.originalUserId?._id || req.originalUserId);
      const subId = req.substituteUserId ? String(req.substituteUserId?._id || req.substituteUserId) : null;
      
      if (reportData.has(origId)) {
        reportData.get(origId).substituido += 1;
      }
      if (subId && reportData.has(subId)) {
        reportData.get(subId).substituto += 1;
      }
    });

    events.forEach((event: any) => {
      let eventDateTime = new Date(event.date);
      if (event.time && event.time.start) {
        const [hours, minutes] = event.time.start.split(':').map(Number);
        eventDateTime.setHours(hours, minutes, 0, 0);
      } else {
        eventDateTime.setHours(23, 59, 59, 999);
      }

      const isPast = eventDateTime < now;

      (event.users || []).forEach((u: any) => {
        const userIdStr = String(u.userId?._id || u.userId);
        
        // Initialize if not present (e.g., admin or archived user that was scheduled)
        if (!reportData.has(userIdStr)) {
           reportData.set(userIdStr, {
              userId: userIdStr,
              name: u.userId?.name || 'Desconhecido',
              fullName: u.userId?.fullName || u.userId?.name || 'Desconhecido',
              faltas: 0,
              servicos: 0,
              substituido: 0,
              substituto: 0,
              funcoesAssumidas: {} as Record<string, number>,
           });
        }

        const stats = reportData.get(userIdStr);

        if (u.checkedInAt) {
          stats.servicos += 1;
          (u.roles || []).forEach((role: string) => {
            stats.funcoesAssumidas[role] = (stats.funcoesAssumidas[role] || 0) + 1;
          });
        } else if (isPast) {
          stats.faltas += 1;
        }
      });
    });

    // Convert map to array and sort by name
    const result = Array.from(reportData.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      totalEvents: events.length,
      data: result
    });
  } catch (err) {
    console.error('masses report GET error', err);
    res.status(500).json({ error: 'failed to fetch report', details: (err as any)?.message });
  }
});

export default router;

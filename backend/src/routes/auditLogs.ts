import { Router } from 'express';
import AuditLog from '../models/auditLog';
import jwt from 'jsonwebtoken';
import User from '../models/user';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

// Middleware to verify access token
async function requireAuth(req: any, res: any, next: any) {
  const auth = req.header('authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'missing access token' });
  const token = m[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET) as any;
    req.userId = payload.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid access token' });
  }
}


// Middleware to verify access token and admin role
async function requireAdmin(req: any, res: any, next: any) {
  const auth = req.header('authorization') || '';
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ error: 'missing access token' });
  const token = m[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET) as any;
    req.userId = payload.uid;
    // Check for admin role
    if (payload.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden: admin access required' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid access token' });
  }
}

router.get('/', requireAdmin, async (req, res) => {
  try {
    const logs = await AuditLog.find().populate('user', 'name').sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'failed to fetch audit logs' });
  }
});

router.post('/access', requireAuth, async (req: any, res: any) => {
  try {
    const auditLog = new AuditLog({
      user: req.userId,
      logType: 'session_restored',
    });
    await auditLog.save();
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'failed to create audit log' });
  }
});

export default router;

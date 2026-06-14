import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), now: Date.now() });
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

function signAccess(user: any) {
  return jwt.sign({ uid: String(user._id), role: user.role }, JWT_SECRET, { expiresIn: '15m' });
}

// login with email or phone + password
router.post('/login', async (req, res) => {
  try {
    const { identity, password } = req.body; // identity = email or phone
    if (!identity || !password) return res.status(400).json({ error: 'Login e senha são obrigatórios' });
    const user = await User.findOne({ $or: [{ email: identity }, { phone: identity }] }).select('+passwordHash');
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });
    if ((user as any).archived) return res.status(403).json({ error: 'Usuário desativado não pode fazer login.' });
    if (!user.passwordHash) return res.status(401).json({ error: 'Nenhuma senha definida para o usuário' });
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const access = signAccess(user);

    const u = user.toObject(); delete (u as any).passwordHash; res.json({ user: u, accessToken: access, mustChangePassword: !!user.mustChangePassword });
  } catch (err) {
    console.error('auth login error', err);
    res.status(500).json({ error: 'login failed' });
  }
});

// logout - no cookie to clear in stateless flow
router.post('/logout', async (req, res) => {
  res.json({ success: true });
});

// middleware to verify access token
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

router.get('/me', requireAuth, async (req: any, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'user not found' });
    const u = user.toObject(); delete (u as any).passwordHash; res.json({ user: u });
  } catch (err) {
    console.error('auth me error', err);
    res.status(500).json({ error: 'failed' });
  }
});

// change password (user must be authenticated via access token)
router.post('/change-password', requireAuth, async (req: any, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'invalid new password' });
    const hash = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(req.userId, { passwordHash: hash, mustChangePassword: false }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'user not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('change-password error', err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;

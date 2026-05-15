import { Request, Response, NextFunction } from 'express';

export default function denyWrites(req: Request, res: Response, next: NextFunction) {
  const allowWrite = (process.env.ALLOW_WRITE ?? 'true').toString().toLowerCase();
  if (allowWrite === 'false') {
    const method = (req.method || '').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return res.status(403).json({ error: 'Writes are disabled by server configuration' });
    }
  }
  next();
}

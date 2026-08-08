import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

/* Verify the Bearer token and attach the requesting user to req.user */
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token missing.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(payload.id);

    if (!user) {
      return res.status(401).json({ message: 'User belonging to token no longer exists.' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

/* Restrict route to one or more roles */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}


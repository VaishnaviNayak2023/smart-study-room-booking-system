import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const rowToNotification = (r) => ({
  id: r.id,
  type: r.type,
  title: r.title,
  message: r.message,
  read: !!r.read,
  createdAt: r.created_at,
});

export async function createNotification({ userId, type = 'system', title, message }) {
  if (!userId || !title || !message) return null;
  const info = await db
    .prepare(
      'INSERT INTO notifications (user_id, type, title, message, `read`) VALUES (?, ?, ?, ?, 0)',
    )
    .run(userId, type, title, message);
  return info.lastInsertRowid;
}

/* GET /api/notifications */
router.get('/', authenticate, async (req, res) => {
  const rows = await db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id);
  const notifications = rows.map(rowToNotification);
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ notifications, unreadCount });
});

/* PATCH /api/notifications/:id/read */
router.patch('/:id/read', authenticate, async (req, res) => {
  const row = await db
    .prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ message: 'Notification not found.' });

  await db.prepare('UPDATE notifications SET `read` = 1 WHERE id = ?').run(row.id);
  const updated = await db.prepare('SELECT * FROM notifications WHERE id = ?').get(row.id);
  res.json({ notification: rowToNotification(updated) });
});

/* POST /api/notifications/read-all */
router.post('/read-all', authenticate, async (req, res) => {
  await db
    .prepare('UPDATE notifications SET `read` = 1 WHERE user_id = ? AND `read` = 0')
    .run(req.user.id);
  res.json({ message: 'All notifications marked as read.' });
});

export default router;

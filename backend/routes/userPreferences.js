import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const DEFAULT_NOTIFICATION_PREFS = {
  booking_confirmations: { email: true, push: true, in_app: true },
  reminders: { email: false, push: true, in_app: true },
  system_updates: { email: true, push: false, in_app: true },
};

const parsePrefs = (value) => {
  if (!value) return { ...DEFAULT_NOTIFICATION_PREFS };
  if (typeof value === 'object') return { ...DEFAULT_NOTIFICATION_PREFS, ...value };
  try {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(value) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
};

const rowToPreferences = (r) => ({
  theme: r?.theme || 'light',
  language: r?.language || 'en-US',
  profileVisibility: r ? !!r.profile_visibility : true,
  activityStatus: r ? !!r.activity_status : false,
  notificationPrefs: parsePrefs(r?.notification_prefs),
});

async function getOrCreate(userId) {
  let row = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  if (!row) {
    await db
      .prepare(
        'INSERT INTO user_preferences (user_id, theme, language, profile_visibility, activity_status, notification_prefs) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(userId, 'light', 'en-US', 1, 0, JSON.stringify(DEFAULT_NOTIFICATION_PREFS));
    row = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  }
  return row;
}

/* GET /api/user-preferences */
router.get('/', authenticate, async (req, res) => {
  const row = await getOrCreate(req.user.id);
  res.json({ preferences: rowToPreferences(row) });
});

/* PUT /api/user-preferences */
router.put('/', authenticate, async (req, res) => {
  const existing = await getOrCreate(req.user.id);
  const body = req.body || {};

  const theme = body.theme ?? existing.theme;
  const language = body.language ?? existing.language;
  const profileVisibility =
    body.profileVisibility !== undefined ? (body.profileVisibility ? 1 : 0) : existing.profile_visibility;
  const activityStatus =
    body.activityStatus !== undefined ? (body.activityStatus ? 1 : 0) : existing.activity_status;
  const notificationPrefs = body.notificationPrefs
    ? { ...DEFAULT_NOTIFICATION_PREFS, ...body.notificationPrefs }
    : parsePrefs(existing.notification_prefs);

  await db
    .prepare(
      'UPDATE user_preferences SET theme = ?, language = ?, profile_visibility = ?, activity_status = ?, notification_prefs = ? WHERE user_id = ?',
    )
    .run(
      theme,
      language,
      profileVisibility,
      activityStatus,
      JSON.stringify(notificationPrefs),
      req.user.id,
    );

  const row = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(req.user.id);
  res.json({ preferences: rowToPreferences(row) });
});

export default router;

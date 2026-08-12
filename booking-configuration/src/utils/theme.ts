export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'booking_theme_preference';

/** Normalize legacy values (e.g. system → auto). */
export function normalizeThemePreference(value?: string | null): ThemePreference {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'dark') return 'dark';
  if (v === 'light') return 'light';
  if (v === 'auto' || v === 'system') return 'auto';
  return 'auto';
}

/**
 * Auto schedule (local time):
 * - 00:00–17:59 → Light
 * - 18:00–23:59 → Dark
 */
export function resolveAutoTheme(now: Date = new Date()): ResolvedTheme {
  return now.getHours() >= 18 ? 'dark' : 'light';
}

export function resolveTheme(
  preference: ThemePreference,
  now: Date = new Date(),
): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return resolveAutoTheme(now);
}

/** Milliseconds until the next auto transition (6:00 PM or midnight). */
export function msUntilNextAutoTransition(now: Date = new Date()): number {
  const next = new Date(now);
  if (now.getHours() >= 18) {
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
  } else {
    next.setHours(18, 0, 0, 0);
  }
  const ms = next.getTime() - now.getTime();
  return Math.max(ms, 1000);
}

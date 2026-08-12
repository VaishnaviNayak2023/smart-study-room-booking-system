import { appConfig, getApiBaseUrl } from '@/config/app';

/**
 * Resolve a stored resource image path/URL for <img> / q-img.
 *
 * Uploaded files are stored as `/uploads/resources/...` on the API host.
 * In local Quasar dev, API calls often go through the `/api` proxy and
 * `VITE_API_URL` may be unset — so we rewrite upload paths to
 * `/api/uploads/...` (or absolute API host + `/uploads/...`) so images load
 * on both admin and user dashboards.
 */
export function resolveAssetUrl(path?: string | null): string {
  const value = String(path || '').trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const normalized = value.startsWith('/') ? value : `/${value}`;
  const uploadPath = normalized.startsWith('/api/uploads/')
    ? normalized.replace(/^\/api/, '')
    : normalized.startsWith('/uploads/')
      ? normalized
      : '';

  if (uploadPath) {
    const origin = (appConfig.apiUrl || '').replace(/\/$/, '');
    if (origin) {
      return `${origin}${uploadPath}`;
    }

    // Relative API mode (Vite proxies `/api` → backend).
    const apiBase = getApiBaseUrl(); // `/api` or `http://host:port/api`
    if (/^https?:\/\//i.test(apiBase)) {
      return `${apiBase.replace(/\/api\/?$/, '')}${uploadPath}`;
    }
    return `/api${uploadPath}`;
  }

  const origin = (appConfig.apiUrl || '').replace(/\/$/, '');
  if (!origin) return normalized;
  return `${origin}${normalized}`;
}

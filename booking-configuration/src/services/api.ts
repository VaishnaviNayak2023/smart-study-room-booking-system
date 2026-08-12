import axios from 'axios';
import { getApiBaseUrl } from '@/config/app';

const API_BASE = getApiBaseUrl();

/**
 * Centralized axios instance for the Booking Configuration frontend.
 *
 * - Uses a config-driven API base, defaulting to a relative `/api` path for local dev/proxy use.
 * - Attaches the JWT from localStorage on every request (when present).
 * - On 401 responses, clears the stale token and redirects to /login.
 */

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { API_BASE };
export const TOKEN_KEY = 'booking_token';
export const USER_KEY = 'booking_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): unknown {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: unknown): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function redirectToLogin(): void {
  const target = `${window.location.origin}${window.location.pathname}#/login`;
  if (window.location.href !== target) {
    window.location.assign(target);
  }
}

// Attach the bearer token to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response handler: clear auth + redirect on expired/invalid tokens.
api.interceptors.response.use(
  (response) => response,
(error: Error & { response?: { status?: number } }) => {
    if (error.response?.status === 401) {
      clearToken();
      if (!window.location.hash.startsWith('#/login')) {
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  },
);

export default api;


import { defineStore, acceptHMRUpdate } from 'pinia';
import { Dark } from 'quasar';
import api from '@/services/api';
import {
  THEME_STORAGE_KEY,
  msUntilNextAutoTransition,
  normalizeThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/utils/theme';

type PreferencesPayload = {
  theme?: string;
  language?: string;
  profileVisibility?: boolean;
  activityStatus?: boolean;
  notificationPrefs?: unknown;
};

let autoTimer: ReturnType<typeof setTimeout> | null = null;

function applyResolvedTheme(resolved: ResolvedTheme) {
  Dark.set(resolved === 'dark');
  document.documentElement.setAttribute('data-theme', resolved);
}

function readStoredPreference(): ThemePreference {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

function writeStoredPreference(preference: ThemePreference) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore quota errors */
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    initialized: false,
    preference: 'auto' as ThemePreference,
    resolved: 'light' as ResolvedTheme,
    syncing: false,
  }),

  getters: {
    isDark: (state) => state.resolved === 'dark',
    navbarIcon: (state): string => (state.resolved === 'dark' ? 'dark_mode' : 'light_mode'),
    navbarAriaLabel: (state): string =>
      state.resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
  },

  actions: {
    initFromStorage() {
      this.preference = readStoredPreference();
      this.applyCurrentPreference();
      this.initialized = true;
    },

    applyCurrentPreference(now?: Date) {
      this.resolved = resolveTheme(this.preference, now);
      applyResolvedTheme(this.resolved);
      this.scheduleAutoTransition();
    },

    scheduleAutoTransition() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
      if (this.preference !== 'auto') return;

      const delay = msUntilNextAutoTransition();
      autoTimer = setTimeout(() => {
        if (this.preference === 'auto') {
          this.applyCurrentPreference();
        }
      }, delay);
    },

    setPreference(preference: ThemePreference, options: { persist?: boolean; sync?: boolean } = {}) {
      const { persist = true, sync = true } = options;
      this.preference = normalizeThemePreference(preference);
      this.applyCurrentPreference();
      if (persist) writeStoredPreference(this.preference);
      if (sync) void this.syncToServer();
    },

    toggleResolved() {
      this.setPreference(this.resolved === 'dark' ? 'light' : 'dark');
    },

    async loadFromServer() {
      try {
        const { data } = await api.get<{ preferences: PreferencesPayload }>('/user-preferences');
        const pref = normalizeThemePreference(data.preferences?.theme);
        this.preference = pref;
        writeStoredPreference(pref);
        this.applyCurrentPreference();
      } catch {
        this.initFromStorage();
      }
    },

    async syncToServer() {
      if (this.syncing) return;
      this.syncing = true;
      try {
        await api.put('/user-preferences', { theme: this.preference });
      } catch {
        /* guest or offline — local preference still applies */
      } finally {
        this.syncing = false;
      }
    },

    reset() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
      this.preference = readStoredPreference();
      this.applyCurrentPreference();
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot));
}

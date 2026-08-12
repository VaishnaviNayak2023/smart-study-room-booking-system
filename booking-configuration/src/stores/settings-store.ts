import { defineStore, acceptHMRUpdate } from 'pinia';
import api from '@/services/api';
import {
  DEFAULT_CURRENCY,
  currencySymbol,
  formatCurrencyAmount,
  formatStoredAmount,
  parseCurrencyCode,
} from '@/utils/currency';

type SettingsPayload = {
  systemName?: string;
  currency?: string;
  currencyCode?: string;
  language?: string;
  maxHours?: number;
  advanceDays?: number;
  sameDay?: boolean;
  autoConfirm?: boolean;
  emailNotifications?: boolean;
};

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    loaded: false,
    loading: false,
    systemName: '',
    currencyLabel: 'INR (Rs.)',
    currencyCode: DEFAULT_CURRENCY,
  }),

  getters: {
    ratePrefix: (state) => currencySymbol(state.currencyCode),

    formatMoney:
      (state) =>
      (value: number, overrideCode?: string) =>
        formatCurrencyAmount(value, overrideCode || state.currencyCode),

    formatAmount:
      (state) =>
      (raw: string | number | undefined, overrideCode?: string) =>
        formatStoredAmount(raw, overrideCode || state.currencyCode),
  },

  actions: {
    applySettings(data: SettingsPayload | null | undefined) {
      if (!data) return;
      this.systemName = String(data.systemName || '').trim();
      this.currencyLabel = data.currency || 'INR (Rs.)';
      this.currencyCode = data.currencyCode || parseCurrencyCode(this.currencyLabel);
      this.loaded = true;
    },

    reset() {
      this.loaded = false;
      this.systemName = '';
      this.currencyLabel = 'INR (Rs.)';
      this.currencyCode = DEFAULT_CURRENCY;
    },

    async load() {
      this.loading = true;
      try {
        const { data } = await api.get<{ settings: SettingsPayload }>('/settings');
        this.applySettings(data.settings);
      } catch {
        this.currencyLabel = 'INR (Rs.)';
        this.currencyCode = DEFAULT_CURRENCY;
      } finally {
        this.loading = false;
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}

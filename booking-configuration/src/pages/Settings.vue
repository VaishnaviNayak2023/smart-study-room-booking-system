<template>
  <q-page class="portal-page settings-page">
    <div class="page-header">
      <div>
        <h1>System Settings</h1>
        <p>Configure enterprise routing logic and global system preferences.</p>
      </div>
      <div class="header-actions">
        <q-btn outline no-caps label="Discard Changes" class="ghost-btn" :disable="saving" @click="loadSettings" />
        <q-btn unelevated no-caps label="Save Configuration" class="primary-btn" :loading="saving" @click="saveSettings" />
      </div>
    </div>

    <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="32px" /> Loading settings…</div>
    <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="loadSettings" /></div>
    <div v-else class="settings-content">
      <q-banner v-if="currencyChanging" class="currency-banner q-mb-md" rounded dense>
        <template #avatar><q-icon name="currency_exchange" color="primary" /></template>
        Saving will convert all stored pricing rates and booking amounts from
        <strong>{{ parseCurrencyCode(loadedCurrency) }}</strong>
        to
        <strong>{{ parseCurrencyCode(settings.currency) }}</strong>
        using live exchange rates.
      </q-banner>

      <q-card flat bordered class="settings-card appearance-card">
        <q-card-section>
          <ThemeSelector
            :model-value="themeStore.preference"
            @update:model-value="onThemeChange"
          />
        </q-card-section>
      </q-card>

      <div class="settings-grid">
      <q-card flat bordered class="settings-card">
        <q-card-section>
          <div class="card-title"><q-icon name="hub" /> Booking & Routing Logic</div>
          <p class="card-sub">Control how new booking requests are validated and confirmed.</p>
          <q-separator class="q-my-md" />

          <div class="pref-row">
            <div>
              <div class="pref-title">Auto-Confirm Bookings</div>
              <div class="pref-sub">Requests bypass admin review when enabled.</div>
            </div>
            <q-toggle v-model="settings.autoConfirm" color="primary" />
          </div>

          <div class="pref-row">
            <div>
              <div class="pref-title">Allow Same-Day Bookings</div>
              <div class="pref-sub">Permit users to book resources on the same day.</div>
            </div>
            <q-toggle v-model="settings.sameDay" color="primary" />
          </div>

          <div class="pref-row">
            <div>
              <div class="pref-title">Send Email Notifications</div>
              <div class="pref-sub">Notify users by email about booking updates.</div>
            </div>
            <q-toggle v-model="settings.emailNotifications" color="primary" />
          </div>

          <q-separator class="q-my-md" />
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <div class="field-label">Max Booking Hours</div>
              <q-input v-model.number="settings.maxHours" type="number" min="1" outlined dense />
            </div>
            <div class="col-12 col-md-6">
              <div class="field-label">Advance Booking (days)</div>
              <q-input v-model.number="settings.advanceDays" type="number" min="0" outlined dense />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="settings-card">
        <q-card-section>
          <div class="card-title"><q-icon name="tune" /> Global Preferences</div>
          <p class="card-sub">System-wide defaults used across pricing and reporting.</p>
          <q-separator class="q-my-md" />

          <div class="field-block">
            <div class="field-label">System Name</div>
            <div class="field-hint">Displayed across the admin and user portals.</div>
            <q-input v-model="settings.systemName" outlined dense :rules="nameRules" />
          </div>

          <div class="field-block">
            <div class="field-label">System Currency</div>
            <div class="field-hint">
              Changing this converts stored pricing rates and booking amounts to the new currency.
            </div>
            <q-select
              v-model="settings.currency"
              :options="currencyOptions"
              outlined
              dense
              emit-value
              map-options
            />
          </div>

          <div class="field-block">
            <div class="field-label">System Language</div>
            <q-select v-model="settings.language" :options="languageOptions" outlined dense />
          </div>
        </q-card-section>
      </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Dialog, Notify } from 'quasar';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/stores/dashboard-events';
import { useSettingsStore } from '@/stores/settings-store';
import { useThemeStore } from '@/stores/theme-store';
import { CURRENCY_OPTIONS, parseCurrencyCode } from '@/utils/currency';
import ThemeSelector from '@/components/ThemeSelector.vue';
import type { ThemePreference } from '@/utils/theme';

type SettingsData = {
  systemName: string;
  currency: string;
  language: string;
  maxHours: number;
  advanceDays: number;
  sameDay: boolean;
  autoConfirm: boolean;
  emailNotifications: boolean;
};

type ConversionResult = {
  pricingUpdated?: number;
  bookingsUpdated?: number;
  rate?: number;
  source?: string;
  from?: string;
  to?: string;
};

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const loadedCurrency = ref('INR (Rs.)');
const settings = reactive<SettingsData>({
  systemName: '',
  currency: 'INR (Rs.)',
  language: 'English (US)',
  maxHours: 8,
  advanceDays: 30,
  sameDay: true,
  autoConfirm: false,
  emailNotifications: true,
});

const currencyOptions = CURRENCY_OPTIONS.map((item) => ({
  label: item.label,
  value: item.value,
}));
const languageOptions = ['English (US)', 'English (UK)', 'Spanish', 'French'];
const nameRules = [(v: string) => !!String(v || '').trim() || 'System name is required.'];

const currencyChanging = computed(
  () => parseCurrencyCode(loadedCurrency.value) !== parseCurrencyCode(settings.currency),
);

function onThemeChange(preference: ThemePreference) {
  themeStore.setPreference(preference);
}

async function loadSettings() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ settings: Partial<SettingsData> }>('/settings');
    if (data.settings) {
      Object.assign(settings, {
        systemName: data.settings.systemName || '',
        currency: data.settings.currency || 'INR (Rs.)',
        language: data.settings.language || 'English (US)',
        maxHours: Number(data.settings.maxHours) || 8,
        advanceDays: Number(data.settings.advanceDays) || 30,
        sameDay: data.settings.sameDay !== false,
        autoConfirm: !!data.settings.autoConfirm,
        emailNotifications: data.settings.emailNotifications !== false,
      });
      loadedCurrency.value = settings.currency;
      settingsStore.applySettings(data.settings);
    }
  } catch {
    error.value = 'Unable to load settings.';
  } finally {
    loading.value = false;
  }
}

function confirmCurrencyConversion(): Promise<boolean> {
  if (!currencyChanging.value) return Promise.resolve(true);
  const from = parseCurrencyCode(loadedCurrency.value);
  const to = parseCurrencyCode(settings.currency);
  return new Promise((resolve) => {
    Dialog.create({
      title: 'Convert stored amounts?',
      message: `All pricing rates and booking amounts will be converted from ${from} to ${to} using current exchange rates. Continue?`,
      cancel: { label: 'Cancel', flat: true, noCaps: true },
      ok: { label: 'Convert & Save', color: 'primary', unelevated: true, noCaps: true },
      persistent: true,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false))
      .onDismiss(() => resolve(false));
  });
}

async function saveSettings() {
  if (!String(settings.systemName || '').trim()) {
    Notify.create({ type: 'warning', message: 'System name is required.' });
    return;
  }

  const previousCode = parseCurrencyCode(loadedCurrency.value);
  const nextCode = parseCurrencyCode(settings.currency);
  const confirmed = await confirmCurrencyConversion();
  if (!confirmed) return;

  saving.value = true;
  try {
    const { data } = await api.put<{
      settings: Partial<SettingsData> & { currencyCode?: string };
      conversion?: ConversionResult | null;
    }>('/settings', { ...settings });

    settingsStore.applySettings(data.settings);
    await settingsStore.load();
    loadedCurrency.value = settings.currency;

    const conversion = data.conversion;
    if (conversion && previousCode !== nextCode) {
      const rateText =
        conversion.rate != null
          ? `1 ${conversion.from} ≈ ${Number(conversion.rate).toFixed(4)} ${conversion.to}`
          : `${previousCode} → ${nextCode}`;
      Notify.create({
        type: 'positive',
        timeout: 5000,
        message: `Currency converted (${rateText}). Updated ${conversion.pricingUpdated || 0} pricing configs and ${conversion.bookingsUpdated || 0} bookings.`,
      });
    } else {
      Notify.create({ type: 'positive', message: 'Settings saved successfully.' });
    }

    // Force every dashboard / pricing page to reload converted amounts.
    emitDashboardRefresh();
  } catch (err) {
    const ax = err as { response?: { data?: { message?: string } } };
    Notify.create({
      type: 'negative',
      message: ax.response?.data?.message || 'Failed to save settings.',
    });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; color: var(--portal-text); }
.page-header p { margin: 6px 0 0; color: var(--portal-muted); max-width: 560px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.primary-btn { background: var(--portal-primary); color: var(--portal-on-primary); border-radius: 10px; min-height: 40px; padding: 0 16px; }
.ghost-btn { border-radius: 10px; border-color: var(--portal-border); color: var(--portal-text-secondary); min-height: 40px; }
.settings-content { display: flex; flex-direction: column; }
.currency-banner { background: var(--portal-primary-soft); color: var(--portal-text); border: 1px solid var(--portal-border); }
.appearance-card { margin-bottom: 16px; }
.settings-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.settings-card { border-radius: 14px; border-color: var(--portal-border); }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: var(--portal-primary); }
.card-sub { margin: 6px 0 0; color: var(--portal-muted); font-size: 13px; }
.pref-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--portal-border-subtle); }
.pref-row:last-of-type { border-bottom: none; }
.pref-title { font-weight: 600; font-size: 14px; color: var(--portal-text); }
.pref-sub { color: var(--portal-muted); font-size: 12px; margin-top: 2px; }
.field-block { margin-bottom: 16px; }
.field-label { font-weight: 600; font-size: 13px; margin-bottom: 2px; color: var(--portal-text); }
.field-hint { color: var(--portal-muted); font-size: 12px; margin-bottom: 6px; }
@media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
</style>

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
    <div v-else class="settings-grid">
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
            <div class="field-hint">Used for all pricing rules and reporting.</div>
            <q-select v-model="settings.currency" :options="currencyOptions" outlined dense />
          </div>

          <div class="field-block">
            <div class="field-label">System Language</div>
            <q-select v-model="settings.language" :options="languageOptions" outlined dense />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/stores/dashboard-events';

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

const loading = ref(true);
const saving = ref(false);
const error = ref('');
const settings = reactive<SettingsData>({
  systemName: '',
  currency: 'USD ($)',
  language: 'English (US)',
  maxHours: 8,
  advanceDays: 30,
  sameDay: true,
  autoConfirm: false,
  emailNotifications: true,
});

const currencyOptions = ['USD ($)', 'EUR (€)', 'GBP (£)', 'INR (₹)'];
const languageOptions = ['English (US)', 'English (UK)', 'Spanish', 'French'];
const nameRules = [(v: string) => !!String(v || '').trim() || 'System name is required.'];

async function loadSettings() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ settings: Partial<SettingsData> }>('/settings');
    if (data.settings) {
      Object.assign(settings, {
        systemName: data.settings.systemName || '',
        currency: data.settings.currency || 'USD ($)',
        language: data.settings.language || 'English (US)',
        maxHours: Number(data.settings.maxHours) || 8,
        advanceDays: Number(data.settings.advanceDays) || 30,
        sameDay: data.settings.sameDay !== false,
        autoConfirm: !!data.settings.autoConfirm,
        emailNotifications: data.settings.emailNotifications !== false,
      });
    }
  } catch {
    error.value = 'Unable to load settings.';
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  if (!String(settings.systemName || '').trim()) {
    Notify.create({ type: 'warning', message: 'System name is required.' });
    return;
  }
  saving.value = true;
  try {
    await api.put('/settings', { ...settings });
    Notify.create({ type: 'positive', message: 'Settings saved successfully.' });
    emitDashboardRefresh();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to save settings.' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => { void loadSettings(); });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: #64748b; max-width: 560px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.primary-btn { background: #1e3a8a; color: #fff; border-radius: 10px; min-height: 40px; padding: 0 16px; }
.ghost-btn { border-radius: 10px; border-color: #e5e7eb; color: #374151; min-height: 40px; }
.settings-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
.settings-card { border-radius: 14px; border-color: #e5e7eb; }
.card-title { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #1e3a8a; }
.card-sub { margin: 6px 0 0; color: #64748b; font-size: 13px; }
.pref-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
.pref-row:last-of-type { border-bottom: none; }
.pref-title { font-weight: 600; font-size: 14px; }
.pref-sub { color: #64748b; font-size: 12px; margin-top: 2px; }
.field-block { margin-bottom: 16px; }
.field-label { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
.field-hint { color: #64748b; font-size: 12px; margin-bottom: 6px; }
@media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
</style>

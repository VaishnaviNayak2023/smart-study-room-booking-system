<template>
  <q-page class="portal-page settings-page">
    <div class="page-header">
      <h1>Settings</h1>
      <p>Manage your portal preferences and configurations.</p>
    </div>

    <div v-if="loading" class="portal-loading">
      <q-spinner color="primary" size="32px" />
      Loading preferences…
    </div>
    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadPreferences" />
    </div>
    <template v-else>
      <div class="settings-grid">
        <q-card flat bordered class="settings-card">
          <q-card-section>
            <div class="card-title">
              <div class="card-icon display"><q-icon name="palette" /></div>
              Display
            </div>

            <div class="field-label">Theme Preference</div>
            <div class="theme-group">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                type="button"
                class="theme-option"
                :class="{ active: form.theme === option.value }"
                @click="form.theme = option.value"
              >
                <q-icon :name="option.icon" size="18px" />
                {{ option.label }}
              </button>
            </div>

            <div class="field-label q-mt-md">Language</div>
            <q-select
              v-model="form.language"
              outlined
              dense
              :options="languageOptions"
              emit-value
              map-options
            />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="settings-card">
          <q-card-section>
            <div class="card-title">
              <div class="card-icon privacy"><q-icon name="shield" /></div>
              Privacy
            </div>

            <div class="toggle-row">
              <div>
                <div class="toggle-title">Profile Visibility</div>
                <div class="toggle-sub">Allow colleagues to find you.</div>
              </div>
              <q-toggle v-model="form.profileVisibility" color="primary" />
            </div>

            <div class="toggle-row">
              <div>
                <div class="toggle-title">Activity Status</div>
                <div class="toggle-sub">Show when you are online.</div>
              </div>
              <q-toggle v-model="form.activityStatus" color="primary" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <q-card flat bordered class="settings-card prefs-card">
        <q-card-section>
          <div class="card-title">
            <div class="card-icon notify"><q-icon name="notifications_active" /></div>
            Notification Preferences
          </div>

          <div class="prefs-table">
            <div class="prefs-head">
              <div>Event Type</div>
              <div>Email</div>
              <div>Push</div>
              <div>In-App</div>
            </div>
            <div v-for="row in preferenceRows" :key="row.key" class="prefs-row">
              <div>
                <div class="prefs-title">{{ row.label }}</div>
                <div class="prefs-sub">{{ row.description }}</div>
              </div>
              <q-checkbox v-model="form.notificationPrefs[row.key].email" color="primary" />
              <q-checkbox v-model="form.notificationPrefs[row.key].push" color="primary" />
              <q-checkbox v-model="form.notificationPrefs[row.key].in_app" color="primary" />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <div class="footer-actions">
        <q-btn flat no-caps label="Discard Changes" :disable="!dirty" @click="discard" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Save Preferences"
          class="save-btn"
          :loading="saving"
          :disable="!dirty"
          @click="save"
        />
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Notify, useQuasar } from 'quasar';
import api from '@/services/api';

type ChannelPrefs = { email: boolean; push: boolean; in_app: boolean };
type NotificationPrefs = {
  booking_confirmations: ChannelPrefs;
  reminders: ChannelPrefs;
  system_updates: ChannelPrefs;
};

type Preferences = {
  theme: string;
  language: string;
  profileVisibility: boolean;
  activityStatus: boolean;
  notificationPrefs: NotificationPrefs;
};

const $q = useQuasar();
const loading = ref(true);
const error = ref('');
const saving = ref(false);
const savedSnapshot = ref('');

const form = reactive<Preferences>({
  theme: 'light',
  language: 'en-US',
  profileVisibility: true,
  activityStatus: false,
  notificationPrefs: {
    booking_confirmations: { email: true, push: true, in_app: true },
    reminders: { email: false, push: true, in_app: true },
    system_updates: { email: true, push: false, in_app: true },
  },
});

const themeOptions = [
  { label: 'Light', value: 'light', icon: 'light_mode' },
  { label: 'Dark', value: 'dark', icon: 'dark_mode' },
  { label: 'System', value: 'system', icon: 'desktop_windows' },
];

const languageOptions = [
  { label: 'English (United States)', value: 'en-US' },
  { label: 'English (United Kingdom)', value: 'en-GB' },
];

const preferenceRows = [
  {
    key: 'booking_confirmations' as const,
    label: 'Booking Confirmations',
    description: 'When your room reservation is finalized',
  },
  {
    key: 'reminders' as const,
    label: 'Reminders',
    description: 'Upcoming bookings (15 mins prior)',
  },
  {
    key: 'system_updates' as const,
    label: 'System Updates',
    description: 'Maintenance and platform news',
  },
];

const dirty = computed(() => JSON.stringify(form) !== savedSnapshot.value);

function applyTheme(theme: string) {
  if (theme === 'dark') $q.dark.set(true);
  else if (theme === 'light') $q.dark.set(false);
  else $q.dark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function assignForm(preferences: Preferences) {
  form.theme = preferences.theme || 'light';
  form.language = preferences.language || 'en-US';
  form.profileVisibility = !!preferences.profileVisibility;
  form.activityStatus = !!preferences.activityStatus;
  form.notificationPrefs = {
    booking_confirmations: {
      email: !!preferences.notificationPrefs?.booking_confirmations?.email,
      push: !!preferences.notificationPrefs?.booking_confirmations?.push,
      in_app: !!preferences.notificationPrefs?.booking_confirmations?.in_app,
    },
    reminders: {
      email: !!preferences.notificationPrefs?.reminders?.email,
      push: !!preferences.notificationPrefs?.reminders?.push,
      in_app: !!preferences.notificationPrefs?.reminders?.in_app,
    },
    system_updates: {
      email: !!preferences.notificationPrefs?.system_updates?.email,
      push: !!preferences.notificationPrefs?.system_updates?.push,
      in_app: !!preferences.notificationPrefs?.system_updates?.in_app,
    },
  };
  savedSnapshot.value = JSON.stringify(form);
  applyTheme(form.theme);
}

async function loadPreferences() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ preferences: Preferences }>('/user-preferences');
    assignForm(data.preferences);
  } catch {
    error.value = 'Unable to load your preferences.';
  } finally {
    loading.value = false;
  }
}

function discard() {
  if (!savedSnapshot.value) return;
  assignForm(JSON.parse(savedSnapshot.value) as Preferences);
}

async function save() {
  saving.value = true;
  try {
    const { data } = await api.put<{ preferences: Preferences }>('/user-preferences', {
      theme: form.theme,
      language: form.language,
      profileVisibility: form.profileVisibility,
      activityStatus: form.activityStatus,
      notificationPrefs: form.notificationPrefs,
    });
    assignForm(data.preferences);
    Notify.create({ type: 'positive', message: 'Preferences saved.' });
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to save preferences.' });
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadPreferences();
});
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
}

.page-header p {
  margin: 6px 0 0;
  color: #64748b;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.settings-card {
  border-radius: 14px;
  border-color: #e5e7eb;
}

.prefs-card {
  margin-bottom: 20px;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 700;
}

.card-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon.display {
  background: #dbeafe;
  color: #1d4ed8;
}

.card-icon.privacy {
  background: #f3e8ff;
  color: #7c3aed;
}

.card-icon.notify {
  background: #dcfce7;
  color: #15803d;
}

.field-label {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.theme-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.theme-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #475569;
  cursor: pointer;
}

.theme-option.active {
  border-color: #1e3a8a;
  color: #1e3a8a;
  background: #eef2ff;
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.toggle-title {
  font-weight: 600;
}

.toggle-sub {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.prefs-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prefs-head,
.prefs-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(3, 80px);
  gap: 8px;
  align-items: center;
}

.prefs-head {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.prefs-row {
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.prefs-title {
  font-weight: 600;
}

.prefs-sub {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-btn {
  border-radius: 10px;
  min-height: 40px;
  background: #1e3a8a;
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .prefs-head,
  .prefs-row {
    grid-template-columns: minmax(0, 1fr) repeat(3, 56px);
  }

  .theme-group {
    grid-template-columns: 1fr;
  }
}
</style>

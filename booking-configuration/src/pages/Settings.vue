<template>
  <q-page class="settings-page">
    <div class="settings-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Settings</div>
          <div class="page-subtitle">Configure system-wide preferences.</div>
        </div>
      </div>

      <q-card flat bordered class="settings-card">
        <q-card-section>
          <div class="section-title">General Settings</div>

          <q-form @submit.prevent="saveSettings" class="q-gutter-md q-mt-md">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <div class="field-label">System Name</div>
                <q-input v-model="settings.systemName" outlined dense :rules="nameRules" />
              </div>

              <div class="col-12 col-md-6">
                <div class="field-label">Currency</div>
                <q-select
                  v-model="settings.currency"
                  :options="['USD ($)', 'EUR (€)', 'GBP (£)', 'INR (₹)']"
                  outlined
                  dense
                />
              </div>
            </div>

            <q-separator />

            <div class="section-title">Booking Preferences</div>

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <div class="field-label">Max Booking Hours</div>
                <q-input v-model="settings.maxHours" type="number" outlined dense />
              </div>

              <div class="col-12 col-md-6">
                <div class="field-label">Advance Booking (days)</div>
                <q-input v-model="settings.advanceDays" type="number" outlined dense />
              </div>

              <div class="col-12">
                <div class="row items-center justify-between q-py-sm">
                  <div>
                    <div class="pt-title">Allow Same-Day Bookings</div>
                    <div class="pt-sub">Permit users to book resources on the same day.</div>
                  </div>
                  <q-toggle v-model="settings.sameDay" color="primary" />
                </div>

                <div class="row items-center justify-between q-py-sm">
                  <div>
                    <div class="pt-title">Auto-Confirm Bookings</div>
                    <div class="pt-sub">Automatically confirm new bookings without review.</div>
                  </div>
                  <q-toggle v-model="settings.autoConfirm" color="primary" />
                </div>

                <div class="row items-center justify-between q-py-sm">
                  <div>
                    <div class="pt-title">Send Email Notifications</div>
                    <div class="pt-sub">Notify users by email about booking updates.</div>
                  </div>
                  <q-toggle v-model="settings.emailNotifications" color="primary" />
                </div>
              </div>
            </div>

            <div class="row justify-end q-mt-md">
              <q-btn
                type="submit"
                unelevated
                no-caps
                color="primary"
                label="Save Settings"
                class="save-btn"
              />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type SettingsData = {
  systemName: string;
  currency: string;
  maxHours: number | string;
  advanceDays: number | string;
  sameDay: boolean;
  autoConfirm: boolean;
  emailNotifications: boolean;
};

const settings = reactive<SettingsData>({
  systemName: '',
  currency: '',
  maxHours: '',
  advanceDays: '',
  sameDay: true,
  autoConfirm: false,
  emailNotifications: true,
});

const nameRules = [(v: string) => !!v || 'System name is required.'];

const loadSettings = async () => {
  try {
    const { data } = await api.get<{ settings: Partial<SettingsData> }>('/settings');
    if (data.settings) {
      Object.assign(settings, data.settings);
    }
  } catch (error) {
    console.error('Failed to load settings', error);
  }
};

async function saveSettings() {
  try {
    await api.put('/settings', settings);
    Notify.create({ type: 'positive', message: 'Settings saved successfully.' });
  } catch (error) {
    console.error('Save settings failed', error);
    Notify.create({ type: 'negative', message: 'Failed to save settings.' });
  }
}

onMounted(() => {
  void loadSettings();
});
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.settings-container {
  max-width: 900px;
  margin: 0 auto;
  padding-bottom: 30px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.page-subtitle {
  margin-top: 4px;
  color: #73798b;
  font-size: 11px;
}

.settings-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.section-title {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.field-label {
  margin-bottom: 4px;
  color: #454c60;
  font-size: 11px;
  font-weight: 500;
}

.pt-title {
  color: #111827;
  font-size: 12px;
  font-weight: 600;
}

.pt-sub {
  margin-top: 2px;
  color: #7c8293;
  font-size: 10px;
}

.save-btn {
  min-height: 36px;
  padding: 0 20px;
  border-radius: 6px;
}
</style>

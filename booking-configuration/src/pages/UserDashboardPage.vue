<template>
  <q-page class="portal-page dashboard-page">
    <div v-if="loading" class="portal-loading">
      <q-spinner color="primary" size="36px" />
      Loading dashboard…
    </div>

    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadDashboard" />
    </div>

    <template v-else>
      <div class="dashboard-header">
        <div>
          <h1 class="welcome-title">Welcome back{{ displayName ? `, ${displayName}` : '' }}.</h1>
          <p class="welcome-subtitle">Here is your workspace overview for today.</p>
        </div>
      </div>

      <div class="stats-grid">
        <q-card v-for="stat in statsCards" :key="stat.label" flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-header">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-icon"><q-icon :name="stat.icon" size="18px" /></div>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div v-if="stat.sub" class="stat-sub" :class="{ positive: stat.positive }">{{ stat.sub }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="main-grid">
        <div class="upcoming-col">
          <div class="section-title-row">
            <div class="section-title">Next Upcoming Booking</div>
            <q-badge v-if="upcoming" class="status-badge" :class="statusClass(upcoming.status)">
              <q-icon name="fiber_manual_record" size="8px" class="q-mr-xs" />
              {{ upcoming.status }}
            </q-badge>
          </div>

          <q-card v-if="upcoming" flat bordered class="upcoming-card">
            <div class="upcoming-media">
              <q-img v-if="upcoming.image" :src="resolveAssetUrl(upcoming.image)" :alt="upcoming.resource" fit="cover" />
              <div v-else class="upcoming-placeholder">
                <q-icon name="meeting_room" size="42px" />
              </div>
            </div>
            <q-card-section class="upcoming-body">
              <div class="upcoming-name">{{ upcoming.resource }}</div>
              <div class="upcoming-meta">
                <span v-if="upcoming.location">{{ upcoming.location }}</span>
                <span v-if="upcoming.capacity"> • Capacity: {{ upcoming.capacity }}</span>
              </div>
              <div class="upcoming-schedule">
                <div>
                  <div class="label">Date</div>
                  <div class="value">{{ formatDate(upcoming.date) }}</div>
                </div>
                <div>
                  <div class="label">Time</div>
                  <div class="value">{{ upcoming.startTime }} - {{ upcoming.endTime }}</div>
                </div>
              </div>
              <div class="upcoming-actions">
                <q-btn unelevated no-caps icon="edit" label="Modify" class="modify-btn" @click="openModify" />
                <q-btn outline no-caps label="Cancel" class="cancel-btn" @click="cancelOpen = true" />
              </div>
            </q-card-section>
          </q-card>

          <q-card v-else flat bordered class="upcoming-card empty-upcoming">
            <q-card-section>
              <div class="upcoming-name">No upcoming bookings</div>
              <div class="upcoming-meta">Browse rooms to reserve your next workspace.</div>
              <q-btn unelevated no-caps color="primary" label="Browse Rooms" class="q-mt-md" @click="goBrowse" />
            </q-card-section>
          </q-card>
        </div>

        <div class="actions-col">
          <div class="section-title">Quick Actions</div>
          <q-card
            v-for="action in quickActions"
            :key="action.title"
            flat
            bordered
            class="action-card"
            clickable
            @click="action.run()"
          >
            <q-card-section class="action-row">
              <div class="action-icon"><q-icon :name="action.icon" size="20px" /></div>
              <div>
                <div class="action-title">{{ action.title }}</div>
                <div class="action-desc">{{ action.description }}</div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <ModifyBookingDialog v-model="modifyOpen" :booking="upcoming" @saved="loadDashboard" />

    <ConfirmDialog
      v-model="cancelOpen"
      title="Cancel Booking"
      message="Are you sure you want to cancel this booking? This action cannot be undone."
      confirm-label="Cancel Booking"
      cancel-label="Go Back"
      icon="warning"
      variant="danger"
      :loading="cancelling"
      @confirm="confirmCancel"
    >
      <template v-if="upcoming" #details>
        <div class="cancel-details">
          <q-icon name="meeting_room" color="primary" />
          <div>
            <div class="cancel-details__title">{{ upcoming.resource }}</div>
            <div class="cancel-details__meta">{{ upcoming.datetime }}</div>
          </div>
        </div>
      </template>
    </ConfirmDialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import api from '@/services/api';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import ModifyBookingDialog from '@/components/user/ModifyBookingDialog.vue';
import { useStudyroomStore } from '@/stores/studyroom-store';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSettingsStore } from '@/stores/settings-store';
import { resolveAssetUrl } from '@/utils/assetUrl';

type UpcomingBooking = {
  id: string;
  resource: string;
  resourceId?: number | null;
  datetime: string;
  status: string;
  amount?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  notes?: string;
  location?: string;
  capacity?: number | null;
  image?: string;
};

type DashboardStats = {
  totalBookings: number;
  upcoming: number;
  completed: number;
  hoursBooked: number;
  totalSpent: number;
  nextIn: string;
};

const router = useRouter();
const studyroomStore = useStudyroomStore();
const dashboardEvents = useDashboardEvents();
const notificationsStore = useNotificationsStore();
const settingsStore = useSettingsStore();

const loading = ref(true);
const error = ref('');
const modifyOpen = ref(false);
const cancelOpen = ref(false);
const cancelling = ref(false);
const upcoming = ref<UpcomingBooking | null>(null);
const stats = ref<DashboardStats>({
  totalBookings: 0,
  upcoming: 0,
  completed: 0,
  hoursBooked: 0,
  totalSpent: 0,
  nextIn: '',
});

const displayName = computed(() => studyroomStore.currentUser?.name || '');

const statsCards = computed(() => [
  {
    label: 'Total Bookings',
    value: stats.value.totalBookings,
    icon: 'calendar_month',
    sub: '',
    positive: false,
  },
  {
    label: 'Upcoming',
    value: stats.value.upcoming,
    icon: 'event_available',
    sub: stats.value.nextIn || (stats.value.upcoming ? 'Scheduled' : 'None scheduled'),
    positive: false,
  },
  {
    label: 'Completed',
    value: stats.value.completed,
    icon: 'check_circle_outline',
    sub: 'Finished bookings',
    positive: false,
  },
  {
    label: 'Hours Booked',
    value: `${stats.value.hoursBooked}h`,
    icon: 'timer',
    sub: stats.value.totalSpent ? `Spent ${formatMoney(stats.value.totalSpent)}` : 'From your reservations',
    positive: true,
  },
]);

const quickActions = [
  {
    title: 'Book a Workspace',
    description: 'Find available desks or rooms.',
    icon: 'add_circle_outline',
    run: () => void router.push('/browse-rooms'),
  },
  {
    title: 'My Bookings',
    description: 'Manage your existing reservations.',
    icon: 'calendar_month',
    run: () => void router.push('/my-bookings'),
  },
  {
    title: 'Profile',
    description: 'Update your account details.',
    icon: 'person_outline',
    run: () => void router.push('/profile'),
  },
];

function formatMoney(value: number) {
  return settingsStore.formatMoney(value);
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'is-confirmed';
  if (s === 'pending') return 'is-pending';
  if (s === 'completed') return 'is-completed';
  return '';
}

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ stats: DashboardStats; upcoming: UpcomingBooking | null }>(
      '/dashboard/user',
    );
    stats.value = data.stats;
    upcoming.value = data.upcoming;
  } catch {
    error.value = 'Unable to load your dashboard right now.';
  } finally {
    loading.value = false;
  }
}

function openModify() {
  modifyOpen.value = true;
}

function goBrowse() {
  void router.push('/browse-rooms');
}

async function confirmCancel() {
  if (!upcoming.value) return;
  cancelling.value = true;
  try {
    await api.delete(`/bookings/${upcoming.value.id}`);
    Notify.create({ type: 'positive', message: 'Booking cancelled.' });
    cancelOpen.value = false;
    emitDashboardRefresh();
    await notificationsStore.refreshUnread();
    await loadDashboard();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to cancel booking.' });
  } finally {
    cancelling.value = false;
  }
}

let stopWatcher: (() => void) | undefined;

onMounted(() => {
  void loadDashboard();
  stopWatcher = watch(
    () => dashboardEvents.version,
    () => {
      void loadDashboard();
      void notificationsStore.refreshUnread();
    },
  );
});

onUnmounted(() => {
  stopWatcher?.();
});
</script>

<style scoped>
.dashboard-header {
  margin-bottom: 22px;
}

.welcome-title {
  margin: 0;
  font-size: clamp(24px, 3vw, 30px);
  font-weight: 700;
  color: var(--portal-text);
}

.welcome-subtitle {
  margin: 6px 0 0;
  color: var(--portal-muted);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 14px;
  border-color: var(--portal-border);
  background: var(--portal-card);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.stat-label {
  color: var(--portal-muted);
  font-size: 12px;
  font-weight: 600;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--portal-primary-soft);
  color: var(--portal-primary);
}

.stat-value {
  margin-top: 14px;
  font-size: 28px;
  font-weight: 700;
  color: var(--portal-text);
}

.stat-sub {
  margin-top: 6px;
  font-size: 12px;
  color: var(--portal-muted);
}

.stat-sub.positive {
  color: var(--portal-success);
}

.main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.9fr);
  gap: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--portal-text);
  margin-bottom: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

.status-badge {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 700;
}

.status-badge.is-confirmed {
  background: var(--portal-status-confirmed-bg);
  color: var(--portal-status-confirmed-text);
}

.status-badge.is-pending {
  background: var(--portal-status-pending-bg);
  color: var(--portal-status-pending-text);
}

.status-badge.is-completed {
  background: var(--portal-summary-bg);
  color: var(--portal-text-secondary);
}

.upcoming-card {
  border-radius: 14px;
  overflow: hidden;
  border-color: var(--portal-border);
}

.upcoming-media {
  height: 180px;
  background: var(--portal-image-bg);
}

.upcoming-media :deep(.q-img),
.upcoming-placeholder {
  height: 180px;
}

.upcoming-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--portal-primary);
  background: linear-gradient(135deg, #e0e7ff, #f8fafc);
}

.upcoming-body {
  padding: 18px 20px 20px;
}

.upcoming-name {
  font-size: 18px;
  font-weight: 700;
}

.upcoming-meta {
  margin-top: 4px;
  color: var(--portal-muted);
  font-size: 13px;
}

.upcoming-schedule {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
}

.upcoming-schedule .label {
  font-size: 11px;
  color: var(--portal-muted);
}

.upcoming-schedule .value {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 600;
}

.upcoming-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}

.modify-btn {
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  border-radius: 10px;
}

.cancel-btn {
  border-color: var(--portal-border);
  color: var(--portal-text-secondary);
  border-radius: 10px;
}

.action-card {
  border-radius: 12px;
  border-color: var(--portal-border);
  margin-bottom: 12px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--portal-primary-soft);
  color: var(--portal-primary);
}

.action-title {
  font-size: 14px;
  font-weight: 700;
}

.action-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--portal-muted);
}

.cancel-details {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--portal-border);
  background: var(--portal-muted-bg);
}

.cancel-details__title {
  font-weight: 700;
}

.cancel-details__meta {
  font-size: 12px;
  color: var(--portal-muted);
}

@media (max-width: 1000px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .upcoming-actions {
    flex-direction: column;
  }
}
</style>

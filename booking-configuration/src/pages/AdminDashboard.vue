<template>
  <q-page class="portal-page admin-dashboard">
    <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="36px" /> Loading dashboard…</div>
    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadDashboard" />
    </div>
    <template v-else>
      <div class="page-header">
        <div>
          <h1>System Overview</h1>
          <p>Real-time metrics and routing status.</p>
        </div>
      </div>

      <div class="stats-grid">
        <q-card v-for="stat in statCards" :key="stat.label" flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-top">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-icon"><q-icon :name="stat.icon" size="18px" /></div>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-sub" :class="{ positive: stat.positive }">{{ stat.sub }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="main-grid">
        <q-card flat bordered class="panel-card">
          <q-card-section>
            <div class="panel-header">
              <div class="panel-title">Recent Activity</div>
              <q-btn flat no-caps color="primary" label="View All" @click="goBookings" />
            </div>
            <div v-if="!bookings.length" class="portal-empty compact">No recent bookings.</div>
            <div v-else class="activity-list">
              <div v-for="row in bookings" :key="row.id" class="activity-row">
                <div class="activity-icon"><q-icon name="meeting_room" /></div>
                <div class="activity-body">
                  <div class="activity-title">{{ row.resource }}</div>
                  <div class="activity-sub">{{ row.user }}</div>
                </div>
                <div class="activity-meta">
                  <div>{{ formatDate(row.date) }}</div>
                  <div class="time">{{ row.startTime || row.time }} - {{ row.endTime || '' }}</div>
                </div>
                <span class="status-chip" :class="statusClass(row.status)">{{ row.status }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="panel-card">
          <q-card-section>
            <div class="panel-title">Routing Queue</div>
            <p class="panel-sub">Multi-admin approval pool distribution.</p>
            <div class="queue-list">
              <div class="queue-item">
                <div class="queue-avatar">P</div>
                <div class="queue-body">
                  <div class="queue-title">Pending Approvals</div>
                  <div class="queue-sub">Requires admin action</div>
                </div>
                <span class="queue-badge pending">{{ stats.pendingBookings }} Pending</span>
              </div>
              <div class="queue-item">
                <div class="queue-avatar confirmed">C</div>
                <div class="queue-body">
                  <div class="queue-title">Confirmed Bookings</div>
                  <div class="queue-sub">Active reservations</div>
                </div>
                <span class="queue-badge active">{{ stats.confirmedBookings }} Active</span>
              </div>
              <div class="queue-item">
                <div class="queue-avatar users">U</div>
                <div class="queue-body">
                  <div class="queue-title">Registered Users</div>
                  <div class="queue-sub">Portal accounts</div>
                </div>
                <span class="queue-badge active">{{ stats.totalUsers }} Users</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useDashboardEvents } from '@/stores/dashboard-events';

type DashboardStats = {
  totalResources: number;
  availableResources: number;
  totalBookings: number;
  todaysBookings: number;
  totalUsers: number;
  pendingBookings: number;
  confirmedBookings: number;
};

type BookingRow = {
  id: string;
  user: string;
  resource: string;
  date: string;
  time: string;
  startTime?: string;
  endTime?: string;
  status: string;
  location?: string;
};

const router = useRouter();
const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const stats = ref<DashboardStats>({
  totalResources: 0,
  availableResources: 0,
  totalBookings: 0,
  todaysBookings: 0,
  totalUsers: 0,
  pendingBookings: 0,
  confirmedBookings: 0,
});
const bookings = ref<BookingRow[]>([]);

const statCards = computed(() => [
  { label: 'Total Resources', value: stats.value.totalResources, icon: 'inventory_2', sub: `${stats.value.availableResources} available`, positive: true },
  { label: 'Total Bookings', value: stats.value.totalBookings, icon: 'calendar_month', sub: `${stats.value.todaysBookings} today`, positive: false },
  { label: 'Pending Approvals', value: stats.value.pendingBookings, icon: 'pending_actions', sub: 'Requires action', positive: false },
  { label: 'System Health', value: '100%', icon: 'monitor_heart', sub: `${stats.value.totalUsers} active users`, positive: true },
]);

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'is-confirmed';
  if (s === 'pending') return 'is-pending';
  if (s === 'cancelled') return 'is-cancelled';
  return 'is-completed';
}

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ stats: DashboardStats; bookings: BookingRow[] }>('/dashboard');
    stats.value = data.stats;
    bookings.value = data.bookings || [];
  } catch {
    error.value = 'Unable to load admin dashboard.';
  } finally {
    loading.value = false;
  }
}

function goBookings() { void router.push('/bookings'); }

let stopWatcher: (() => void) | undefined;
onMounted(() => {
  void loadDashboard();
  stopWatcher = watch(() => dashboardEvents.version, () => { void loadDashboard(); });
});
onUnmounted(() => { stopWatcher?.(); });
</script>

<style scoped>
.page-header { margin-bottom: 22px; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin-bottom: 20px; }
.stat-card { border-radius: 14px; border-color: #e5e7eb; }
.stat-top { display: flex; justify-content: space-between; align-items: flex-start; }
.stat-label { color: #64748b; font-size: 12px; font-weight: 600; }
.stat-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #eef2ff; color: #1e3a8a; }
.stat-value { margin-top: 14px; font-size: 28px; font-weight: 700; }
.stat-sub { margin-top: 6px; font-size: 12px; color: #64748b; }
.stat-sub.positive { color: #16a34a; }
.main-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr); gap: 16px; }
.panel-card { border-radius: 14px; border-color: #e5e7eb; }
.panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.panel-title { font-size: 16px; font-weight: 700; }
.panel-sub { margin: 4px 0 16px; color: #64748b; font-size: 13px; }
.activity-list, .queue-list { display: flex; flex-direction: column; gap: 12px; }
.activity-row, .queue-item { display: grid; grid-template-columns: auto 1fr auto auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
.activity-icon, .queue-avatar { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #eef2ff; color: #1e3a8a; font-weight: 700; }
.queue-avatar.confirmed { background: #dcfce7; color: #15803d; }
.queue-avatar.users { background: #ede9fe; color: #6d28d9; }
.activity-title, .queue-title { font-weight: 600; font-size: 14px; }
.activity-sub, .queue-sub { color: #64748b; font-size: 12px; margin-top: 2px; }
.activity-meta { text-align: right; font-size: 12px; color: #64748b; }
.activity-meta .time { margin-top: 2px; }
.status-chip, .queue-badge { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
.status-chip.is-confirmed, .queue-badge.active { background: #dcfce7; color: #15803d; }
.status-chip.is-pending, .queue-badge.pending { background: #e0e7ff; color: #3730a3; }
.status-chip.is-cancelled { background: #fee2e2; color: #b91c1c; }
.status-chip.is-completed { background: #f1f5f9; color: #475569; }
.portal-empty.compact { min-height: 120px; }
@media (max-width: 1000px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .main-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } .activity-row { grid-template-columns: 1fr; } }
</style>

<template>
  <q-page class="portal-page bookings-page">
    <div class="page-header">
      <div>
        <h1>Bookings Management</h1>
        <p>Review, route, and manage all facility and resource bookings across the organization.</p>
      </div>
    </div>

    <div class="view-tabs">
      <button class="tab" :class="{ active: viewTab === 'all' }" @click="viewTab = 'all'">All Requests</button>
      <button class="tab" :class="{ active: viewTab === 'action' }" @click="viewTab = 'action'">
        Requires Action
        <span v-if="stats.pending" class="badge">{{ stats.pending }}</span>
      </button>
    </div>

    <div class="stats-grid">
      <q-card flat bordered class="stat-card"><q-card-section><div class="stat-label">Pending Approval</div><div class="stat-value danger">{{ stats.pending }}</div></q-card-section></q-card>
      <q-card flat bordered class="stat-card"><q-card-section><div class="stat-label">Confirmed Today</div><div class="stat-value">{{ stats.confirmedToday }}</div></q-card-section></q-card>
      <q-card flat bordered class="stat-card"><q-card-section><div class="stat-label">Total</div><div class="stat-value">{{ stats.total }}</div></q-card-section></q-card>
      <q-card flat bordered class="stat-card"><q-card-section><div class="stat-label">Cancelled</div><div class="stat-value">{{ stats.cancelled }}</div></q-card-section></q-card>
    </div>

    <q-card flat bordered class="table-card">
      <q-card-section class="toolbar">
        <div class="toolbar-title">All Bookings</div>
        <div class="toolbar-actions">
          <q-select v-model="statusFilter" dense outlined :options="statusOptions" label="Status" style="min-width: 150px" />
          <q-select v-model="sortBy" dense outlined :options="sortOptions" emit-value map-options label="Sort by" style="min-width: 150px" />
        </div>
      </q-card-section>
      <q-separator />

      <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="32px" /> Loading bookings…</div>
      <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="loadBookings" /></div>
      <div v-else-if="!pagedRows.length" class="portal-empty">No bookings match the current filters.</div>
      <q-table v-else :rows="pagedRows" :columns="columns" row-key="id" flat hide-pagination :pagination="{ rowsPerPage: 0 }">
        <template #body-cell-status="{ row }">
          <q-td><span class="status-chip" :class="statusClass(row.status)">{{ row.status }}</span></q-td>
        </template>
        <template #body-cell-schedule="{ row }">
          <q-td>
            <div class="schedule-date">{{ formatDate(row.date) }}</div>
            <div class="schedule-time">{{ row.startTime }} - {{ row.endTime }}</div>
          </q-td>
        </template>
        <template #body-cell-actions="{ row }">
          <q-td align="right">
            <div class="action-group">
              <q-btn v-if="row.status === 'Pending'" unelevated no-caps size="sm" color="positive" icon="check" label="Approve" @click="updateStatus(row, 'Confirmed')" />
              <q-btn v-if="row.status === 'Pending'" outline no-caps size="sm" color="negative" icon="close" label="Reject" @click="updateStatus(row, 'Cancelled')" />
              <q-btn flat round dense icon="more_vert">
                <q-menu>
                  <q-list style="min-width: 160px">
                    <q-item v-close-popup clickable @click="openDetails(row)"><q-item-section>View Details</q-item-section></q-item>
                    <q-item v-if="row.status !== 'Cancelled'" v-close-popup clickable @click="openModify(row)"><q-item-section>Modify</q-item-section></q-item>
                    <q-item v-if="row.status !== 'Cancelled'" v-close-popup clickable @click="askCancel(row)"><q-item-section class="text-negative">Cancel</q-item-section></q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <div v-if="filteredRows.length" class="pagination-bar">
        <div class="rows-per-page">
          Rows per page
          <q-select v-model="rowsPerPage" dense outlined :options="[5, 10, 25, 50]" style="width: 80px" />
        </div>
        <div class="page-controls">
          <span>{{ pageLabel }}</span>
          <q-btn flat round dense icon="chevron_left" :disable="page <= 1" @click="page -= 1" />
          <q-btn flat round dense icon="chevron_right" :disable="page >= totalPages" @click="page += 1" />
        </div>
      </div>
    </q-card>

    <ModifyBookingDialog v-model="modifyOpen" :booking="selected" @saved="loadBookings" />
    <ConfirmDialog v-model="cancelOpen" title="Cancel Booking" message="Are you sure you want to cancel this booking? This action cannot be undone." confirm-label="Cancel Booking" cancel-label="Go Back" icon="warning" variant="danger" :loading="cancelling" @confirm="doCancel">
      <template v-if="selected" #details>
        <div class="cancel-details"><q-icon name="meeting_room" color="primary" /><div><div class="cancel-title">{{ selected.resource }}</div><div class="cancel-meta">{{ selected.datetime }}</div></div></div>
      </template>
    </ConfirmDialog>

    <q-dialog v-model="detailsOpen">
      <q-card v-if="selected" class="details-dialog">
        <q-card-section class="row items-center justify-between"><div class="text-h6">Booking Details</div><q-btn flat round dense icon="close" @click="detailsOpen = false" /></q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <div><strong>ID:</strong> {{ selected.id }}</div>
          <div><strong>User:</strong> {{ selected.user }}</div>
          <div><strong>Resource:</strong> {{ selected.resource }}</div>
          <div><strong>Status:</strong> {{ selected.status }}</div>
          <div><strong>Schedule:</strong> {{ selected.datetime }}</div>
          <div v-if="selected.location"><strong>Location:</strong> {{ selected.location }}</div>
          <div v-if="selected.purpose"><strong>Purpose:</strong> {{ selected.purpose }}</div>
          <div><strong>Amount:</strong> {{ selected.amount }}</div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import api from '@/services/api';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import ModifyBookingDialog from '@/components/user/ModifyBookingDialog.vue';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';

type Booking = {
  id: string;
  user: string;
  resource: string;
  date: string;
  time: string;
  status: string;
  amount: string;
  datetime: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  location?: string;
};

type BookingStats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed?: number;
  confirmedToday?: number;
};

const route = useRoute();
const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const bookings = ref<Booking[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref('All Statuses');
const sortBy = ref('newest');
const viewTab = ref<'all' | 'action'>('all');
const page = ref(1);
const rowsPerPage = ref(10);
const selected = ref<Booking | null>(null);
const modifyOpen = ref(false);
const cancelOpen = ref(false);
const cancelling = ref(false);
const detailsOpen = ref(false);

const statusOptions = ['All Statuses', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];
const sortOptions = [
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Status', value: 'status' },
];

const columns = [
  { name: 'id', label: 'BOOKING ID', field: 'id', align: 'left' as const },
  { name: 'user', label: 'REQUESTER', field: 'user', align: 'left' as const },
  { name: 'resource', label: 'RESOURCE', field: 'resource', align: 'left' as const },
  { name: 'schedule', label: 'SCHEDULE', field: 'schedule', align: 'left' as const },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' as const },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' as const },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' as const },
];

const stats = computed<BookingStats>(() => {
  const all = bookings.value;
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: all.length,
    confirmed: all.filter((b) => b.status === 'Confirmed').length,
    pending: all.filter((b) => b.status === 'Pending').length,
    cancelled: all.filter((b) => b.status === 'Cancelled').length,
    completed: all.filter((b) => b.status === 'Completed').length,
    confirmedToday: all.filter((b) => b.status === 'Confirmed' && String(b.date).slice(0, 10) === today).length,
  };
});

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  let list = bookings.value.filter((booking) => {
    const inTab = viewTab.value === 'action' ? booking.status === 'Pending' : true;
    const matchesSearch = [booking.id, booking.user, booking.resource, booking.status, booking.datetime, booking.location]
      .join(' ').toLowerCase().includes(q);
    const matchesStatus = statusFilter.value === 'All Statuses' || booking.status === statusFilter.value;
    return inTab && matchesSearch && matchesStatus;
  });
  list = list.slice().sort((a, b) => {
    if (sortBy.value === 'status') return a.status.localeCompare(b.status);
    const aKey = `${a.date}T${a.startTime || a.time}`;
    const bKey = `${b.date}T${b.startTime || b.time}`;
    return sortBy.value === 'oldest' ? aKey.localeCompare(bKey) : bKey.localeCompare(aKey);
  });
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / rowsPerPage.value)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredRows.value.slice(start, start + rowsPerPage.value);
});
const pageLabel = computed(() => {
  if (!filteredRows.value.length) return '0 of 0';
  const start = (page.value - 1) * rowsPerPage.value + 1;
  const end = Math.min(page.value * rowsPerPage.value, filteredRows.value.length);
  return `${start}-${end} of ${filteredRows.value.length}`;
});

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

async function loadBookings() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ bookings: Booking[]; stats?: BookingStats }>('/bookings');
    bookings.value = data.bookings || [];
  } catch {
    error.value = 'Unable to load bookings.';
  } finally {
    loading.value = false;
  }
}

async function updateStatus(row: Booking, status: string) {
  try {
    await api.put(`/bookings/${row.id}`, { status });
    Notify.create({ type: 'positive', message: `Booking ${status.toLowerCase()}.` });
    emitDashboardRefresh();
    await loadBookings();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to update booking status.' });
  }
}

function openModify(row: Booking) { selected.value = row; modifyOpen.value = true; }
function askCancel(row: Booking) { selected.value = row; cancelOpen.value = true; }
function openDetails(row: Booking) { selected.value = row; detailsOpen.value = true; }

async function doCancel() {
  if (!selected.value) return;
  cancelling.value = true;
  try {
    await api.delete(`/bookings/${selected.value.id}`);
    Notify.create({ type: 'positive', message: 'Booking cancelled.' });
    cancelOpen.value = false;
    emitDashboardRefresh();
    await loadBookings();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to cancel booking.' });
  } finally {
    cancelling.value = false;
  }
}

watch([viewTab, statusFilter, search, rowsPerPage, sortBy], () => { page.value = 1; });
watch(() => route.query.q, (value) => { search.value = typeof value === 'string' ? value : ''; });

let stopWatcher: (() => void) | undefined;
onMounted(() => {
  void loadBookings();
  stopWatcher = watch(() => dashboardEvents.version, () => { void loadBookings(); });
});
onUnmounted(() => { stopWatcher?.(); });
</script>

<style scoped>
.page-header { margin-bottom: 18px; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: #64748b; max-width: 720px; }
.view-tabs { display: flex; gap: 12px; margin-bottom: 16px; }
.tab { border: 1px solid #e5e7eb; background: #fff; border-radius: 999px; padding: 8px 16px; cursor: pointer; font-weight: 600; color: #64748b; display: inline-flex; align-items: center; gap: 8px; }
.tab.active { background: #eef2ff; border-color: #c7d2fe; color: #1e3a8a; }
.badge { background: #dc2626; color: #fff; border-radius: 999px; padding: 2px 8px; font-size: 11px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card { border-radius: 14px; border-color: #e5e7eb; }
.stat-label { color: #64748b; font-size: 12px; font-weight: 600; }
.stat-value { margin-top: 8px; font-size: 24px; font-weight: 700; }
.stat-value.danger { color: #dc2626; }
.table-card { border-radius: 14px; border-color: #e5e7eb; overflow: hidden; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.toolbar-title { font-size: 16px; font-weight: 700; }
.toolbar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.status-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status-chip.is-confirmed { background: #dcfce7; color: #15803d; }
.status-chip.is-pending { background: #e0e7ff; color: #3730a3; }
.status-chip.is-cancelled { background: #fee2e2; color: #b91c1c; }
.status-chip.is-completed { background: #f1f5f9; color: #475569; }
.schedule-date { font-weight: 600; font-size: 13px; }
.schedule-time { color: #64748b; font-size: 12px; margin-top: 2px; }
.action-group { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; }
.rows-per-page, .page-controls { display: flex; align-items: center; gap: 8px; }
.cancel-details { display: flex; gap: 12px; align-items: center; padding: 12px; border-radius: 12px; border: 1px solid #e5e7eb; background: #f8fafc; }
.cancel-title { font-weight: 700; }
.cancel-meta { font-size: 12px; color: #64748b; }
.details-dialog { width: min(440px, 92vw); border-radius: 14px; }
@media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
</style>

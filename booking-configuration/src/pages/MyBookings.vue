<template>
  <q-page class="portal-page bookings-page">
    <div class="page-header">
      <div>
        <h1>My Bookings</h1>
        <div class="upcoming-count">
          <span class="dot" />
          {{ upcomingCount }} Upcoming Booking{{ upcomingCount === 1 ? '' : 's' }}
        </div>
      </div>
      <div class="header-actions">
        <q-btn outline no-caps icon="filter_list" label="Filter" @click="filterOpen = !filterOpen" />
        <q-btn
          outline
          no-caps
          icon="sort"
          :label="sortNewest ? 'Newest' : 'Oldest'"
          @click="sortNewest = !sortNewest"
        />
      </div>
    </div>

    <q-card v-show="filterOpen" flat bordered class="filter-card q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input v-model="search" outlined dense clearable placeholder="Search bookings...">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-6">
          <q-select
            v-model="statusFilter"
            outlined
            dense
            :options="statusOptions"
            label="Status"
          />
        </div>
      </q-card-section>
    </q-card>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'upcoming' }" @click="tab = 'upcoming'">
        Upcoming Bookings
      </button>
      <button class="tab" :class="{ active: tab === 'past' }" @click="tab = 'past'">Past Bookings</button>
    </div>

    <div v-if="loading" class="portal-loading">
      <q-spinner color="primary" size="32px" />
      Loading bookings…
    </div>
    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadMyBookings" />
    </div>
    <div v-else-if="pagedBookings.length === 0" class="portal-empty">
      <q-icon name="event_busy" size="32px" />
      No {{ tab }} bookings found.
    </div>
    <div v-else class="booking-list">
      <q-card v-for="booking in pagedBookings" :key="booking.id" flat bordered class="booking-card">
        <q-card-section class="booking-row">
          <div class="booking-left">
            <div class="booking-icon"><q-icon name="meeting_room" size="22px" /></div>
            <div>
              <div class="booking-title-row">
                <div class="booking-title">{{ booking.resource }}</div>
                <span class="status-chip" :class="statusClass(booking.status)">{{ booking.status }}</span>
              </div>
              <div class="booking-location">{{ booking.location || 'Workspace' }}</div>
            </div>
          </div>

          <div class="booking-when">
            <div class="when-date">{{ formatDate(booking.date) }}</div>
            <div class="when-time">{{ booking.startTime }} - {{ booking.endTime }}</div>
          </div>

          <div class="booking-actions">
            <q-btn
              v-if="isUpcoming(booking)"
              unelevated
              no-caps
              class="primary-action"
              label="View Details"
              @click="openDetails(booking)"
            />
            <q-btn
              v-else
              outline
              no-caps
              class="secondary-action"
              label="View Receipt"
              @click="openReceipt(booking)"
            />
            <q-btn flat round dense icon="more_vert">
              <q-menu>
                <q-list style="min-width: 160px">
                  <q-item v-close-popup clickable @click="openDetails(booking)">
                    <q-item-section>View Details</q-item-section>
                  </q-item>
                  <q-item v-if="isUpcoming(booking)" v-close-popup clickable @click="openModify(booking)">
                    <q-item-section>Modify</q-item-section>
                  </q-item>
                  <q-item
                    v-if="isUpcoming(booking)"
                    v-close-popup
                    clickable
                    @click="askCancel(booking)"
                  >
                    <q-item-section class="text-negative">Cancel</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div v-if="filteredBookings.length" class="pagination-bar">
      <div class="rows-per-page">
        Rows per page
        <q-select
          v-model="rowsPerPage"
          dense
          outlined
          :options="[5, 10, 20]"
          style="width: 80px"
        />
      </div>
      <div class="page-controls">
        <span>{{ pageLabel }}</span>
        <q-btn flat round dense icon="chevron_left" :disable="page <= 1" @click="page -= 1" />
        <q-btn
          flat
          round
          dense
          icon="chevron_right"
          :disable="page >= totalPages"
          @click="page += 1"
        />
      </div>
    </div>

    <ModifyBookingDialog v-model="modifyOpen" :booking="selected" @saved="loadMyBookings" />

    <ConfirmDialog
      v-model="cancelOpen"
      title="Cancel Booking"
      message="Are you sure you want to cancel this booking? This action cannot be undone."
      confirm-label="Cancel Booking"
      cancel-label="Go Back"
      icon="warning"
      variant="danger"
      :loading="cancelling"
      @confirm="doCancel"
    >
      <template v-if="selected" #details>
        <div class="cancel-details">
          <q-icon name="meeting_room" color="primary" />
          <div>
            <div class="cancel-details__title">{{ selected.resource }}</div>
            <div class="cancel-details__meta">{{ selected.datetime }}</div>
          </div>
        </div>
      </template>
    </ConfirmDialog>

    <q-dialog v-model="detailsOpen">
      <q-card v-if="selected" class="details-dialog">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">{{ detailsMode === 'receipt' ? 'Booking Receipt' : 'Booking Details' }}</div>
          <q-btn flat round dense icon="close" @click="detailsOpen = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="q-gutter-sm">
          <div><strong>Resource:</strong> {{ selected.resource }}</div>
          <div><strong>Status:</strong> {{ selected.status }}</div>
          <div><strong>When:</strong> {{ selected.datetime }}</div>
          <div v-if="selected.location"><strong>Location:</strong> {{ selected.location }}</div>
          <div v-if="selected.purpose"><strong>Purpose:</strong> {{ selected.purpose }}</div>
          <div v-if="selected.notes"><strong>Notes:</strong> {{ selected.notes }}</div>
          <div><strong>Amount:</strong> {{ formatAmount(selected.amount) }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Close" @click="detailsOpen = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <BookingReceiptDialog v-model="receiptOpen" :booking-code="receiptBookingCode" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import api from '@/services/api';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import ModifyBookingDialog from '@/components/user/ModifyBookingDialog.vue';
import BookingReceiptDialog from '@/components/user/BookingReceiptDialog.vue';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSettingsStore } from '@/stores/settings-store';

type Booking = {
  id: string;
  resource: string;
  datetime: string;
  status: string;
  amount: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  notes?: string;
  location?: string;
};

const route = useRoute();
const notificationsStore = useNotificationsStore();
const dashboardEvents = useDashboardEvents();
const settingsStore = useSettingsStore();

const loading = ref(true);
const error = ref('');
const bookings = ref<Booking[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref('All Statuses');
const statusOptions = ['All Statuses', 'Confirmed', 'Pending', 'Completed', 'Cancelled'];
const filterOpen = ref(false);
const sortNewest = ref(true);
const tab = ref<'upcoming' | 'past'>('upcoming');
const page = ref(1);
const rowsPerPage = ref(10);

const selected = ref<Booking | null>(null);
const modifyOpen = ref(false);
const cancelOpen = ref(false);
const cancelling = ref(false);
const detailsOpen = ref(false);
const detailsMode = ref<'details' | 'receipt'>('details');
const receiptOpen = ref(false);
const receiptBookingCode = ref<string | null>(null);

function isUpcoming(booking: Booking) {
  if (booking.status === 'Cancelled' || booking.status === 'Completed') return false;
  const today = new Date().toISOString().slice(0, 10);
  const dateStr = String(booking.date || '').slice(0, 10);
  return (booking.status === 'Confirmed' || booking.status === 'Pending') && (!dateStr || dateStr >= today);
}

const upcomingCount = computed(() => bookings.value.filter(isUpcoming).length);

const filteredBookings = computed(() => {
  const q = search.value.trim().toLowerCase();
  let list = bookings.value.filter((booking) => {
    const inTab = tab.value === 'upcoming' ? isUpcoming(booking) : !isUpcoming(booking);
    const matchesSearch = [booking.resource, booking.datetime, booking.status, booking.amount, booking.location]
      .join(' ')
      .toLowerCase()
      .includes(q);
    const matchesStatus = statusFilter.value === 'All Statuses' || booking.status === statusFilter.value;
    return inTab && matchesSearch && matchesStatus;
  });

  list = list.slice().sort((a, b) => {
    const aKey = `${String(a.date || '').slice(0, 10)}T${a.startTime || '00:00'}`;
    const bKey = `${String(b.date || '').slice(0, 10)}T${b.startTime || '00:00'}`;
    return sortNewest.value ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
  });

  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredBookings.value.length / rowsPerPage.value)));

const pagedBookings = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredBookings.value.slice(start, start + rowsPerPage.value);
});

const pageLabel = computed(() => {
  if (!filteredBookings.value.length) return '0 of 0';
  const start = (page.value - 1) * rowsPerPage.value + 1;
  const end = Math.min(page.value * rowsPerPage.value, filteredBookings.value.length);
  return `${start}-${end} of ${filteredBookings.value.length}`;
});

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(amount?: string) {
  return settingsStore.formatAmount(amount);
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'is-confirmed';
  if (s === 'pending') return 'is-pending';
  if (s === 'completed') return 'is-completed';
  if (s === 'cancelled') return 'is-cancelled';
  return '';
}

async function loadMyBookings() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ bookings: Booking[] }>('/bookings/my');
    bookings.value = data.bookings || [];
  } catch {
    error.value = 'Unable to load your bookings.';
  } finally {
    loading.value = false;
  }
}

function openModify(booking: Booking) {
  selected.value = booking;
  modifyOpen.value = true;
}

function askCancel(booking: Booking) {
  selected.value = booking;
  cancelOpen.value = true;
}

function openDetails(booking: Booking) {
  selected.value = booking;
  detailsMode.value = 'details';
  detailsOpen.value = true;
}

function openReceipt(booking: Booking) {
  receiptBookingCode.value = booking.id;
  receiptOpen.value = true;
}

async function doCancel() {
  if (!selected.value) return;
  cancelling.value = true;
  try {
    await api.delete(`/bookings/${selected.value.id}`);
    Notify.create({ type: 'positive', message: `${selected.value.resource} cancelled.` });
    cancelOpen.value = false;
    emitDashboardRefresh();
    await notificationsStore.refreshUnread();
    await loadMyBookings();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to cancel booking.' });
  } finally {
    cancelling.value = false;
  }
}

watch([tab, statusFilter, search, rowsPerPage, sortNewest], () => {
  page.value = 1;
});

watch(
  () => route.query.q,
  (value) => {
    search.value = typeof value === 'string' ? value : '';
  },
);

watch(() => dashboardEvents.version, () => {
  void loadMyBookings();
  void notificationsStore.refreshUnread();
});

onMounted(() => {
  void loadMyBookings();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
}

.upcoming-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: var(--portal-primary);
  font-size: 13px;
  font-weight: 600;
}

.upcoming-count .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--portal-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions :deep(.q-btn),
.filter-card {
  border-radius: 10px;
  border-color: var(--portal-border);
}

.tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 18px;
}

.tab {
  border: 0;
  background: transparent;
  padding: 10px 0;
  color: var(--portal-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab.active {
  color: var(--portal-primary);
  border-bottom-color: var(--portal-primary);
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.booking-card {
  border-radius: 14px;
  border-color: var(--portal-border);
}

.booking-row {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(140px, 0.7fr) auto;
  gap: 16px;
  align-items: center;
}

.booking-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.booking-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--portal-primary-soft);
  color: var(--portal-primary);
  flex-shrink: 0;
}

.booking-title-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.booking-title {
  font-weight: 700;
  font-size: 15px;
}

.booking-location {
  margin-top: 2px;
  color: var(--portal-muted);
  font-size: 12px;
}

.status-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.status-chip.is-confirmed {
  background: var(--portal-status-confirmed-bg);
  color: var(--portal-status-confirmed-text);
}

.status-chip.is-pending {
  background: var(--portal-status-pending-bg);
  color: var(--portal-status-pending-text);
}

.status-chip.is-completed {
  background: var(--portal-summary-bg);
  color: var(--portal-text-secondary);
}

.status-chip.is-cancelled {
  background: #fee2e2;
  color: var(--portal-status-unavailable-text);
}

.when-date {
  font-weight: 700;
  font-size: 14px;
}

.when-time {
  margin-top: 2px;
  color: var(--portal-muted);
  font-size: 12px;
}

.booking-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}

.primary-action {
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  border-radius: 10px;
}

.secondary-action {
  border-color: #c7d2fe;
  color: var(--portal-primary);
  background: var(--portal-primary-soft);
  border-radius: 10px;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  color: var(--portal-muted);
  font-size: 13px;
}

.rows-per-page,
.page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.details-dialog {
  width: min(420px, 92vw);
  border-radius: 14px;
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

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
  }

  .booking-row {
    grid-template-columns: 1fr;
  }

  .booking-actions {
    justify-content: flex-start;
  }

  .pagination-bar {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

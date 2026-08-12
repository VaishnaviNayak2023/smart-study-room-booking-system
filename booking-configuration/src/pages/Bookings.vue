<template>
  <q-page class="portal-page bookings-page">
    <div class="page-header">
      <div>
        <h1>{{ viewTab === 'action' ? 'Requires Action' : 'Bookings Management' }}</h1>
        <p>
          {{
            viewTab === 'action'
              ? 'Manage pending approvals and bookings awaiting administrator attention.'
              : 'Review, route, and manage all facility and resource bookings across the organization.'
          }}
        </p>
      </div>
    </div>

    <div class="view-tabs">
      <button class="tab" :class="{ active: viewTab === 'all' }" @click="switchTab('all')">
        All Requests
      </button>
      <button class="tab" :class="{ active: viewTab === 'action' }" @click="switchTab('action')">
        Requires Action
        <span v-if="stats.pending" class="badge">{{ stats.pending }}</span>
      </button>
    </div>

    <!-- All Requests summary -->
    <div v-if="viewTab === 'all'" class="stats-grid stats-grid--two">
      <q-card flat bordered class="stat-card">
        <q-card-section class="stat-card__body">
          <div>
            <div class="stat-label">Pending Approval</div>
            <div class="stat-value danger">{{ stats.pending }}</div>
          </div>
          <div class="stat-icon is-pending"><q-icon name="hourglass_top" size="22px" /></div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card">
        <q-card-section class="stat-card__body">
          <div>
            <div class="stat-label">Confirmed Today</div>
            <div class="stat-value">{{ stats.confirmedToday }}</div>
            <div class="stat-hint">Based on confirmation time</div>
          </div>
          <div class="stat-icon is-confirmed"><q-icon name="check_circle" size="22px" /></div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Requires Action summary -->
    <div v-else class="stats-grid stats-grid--two">
      <q-card flat bordered class="stat-card">
        <q-card-section class="stat-card__body">
          <div>
            <div class="stat-label">Total Pending</div>
            <div class="stat-value danger">{{ stats.pending }}</div>
          </div>
          <div class="stat-icon is-warning"><q-icon name="warning_amber" size="22px" /></div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="stat-card">
        <q-card-section class="stat-card__body">
          <div>
            <div class="stat-label">Avg Response Time</div>
            <div class="stat-value">
              {{ stats.avgResponseHours == null ? '—' : `${stats.avgResponseHours} hrs` }}
            </div>
            <div class="stat-hint">
              {{
                stats.avgResponseHours == null
                  ? 'Not enough resolved pending bookings yet'
                  : 'Pending → confirmed/cancelled'
              }}
            </div>
          </div>
          <div class="stat-icon is-pending"><q-icon name="schedule" size="22px" /></div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered class="table-card">
      <q-card-section class="toolbar">
        <div class="toolbar-left">
          <q-input
            v-model="search"
            dense
            outlined
            clearable
            debounce="300"
            placeholder="Search bookings..."
            class="search-input"
            @update:model-value="onFilterChange"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>

          <template v-if="viewTab === 'all'">
            <q-select
              v-model="statusFilter"
              dense
              outlined
              :options="statusOptions"
              label="Status"
              style="min-width: 140px"
              @update:model-value="onFilterChange"
            />
            <q-select
              v-model="resourceFilter"
              dense
              outlined
              :options="resourceOptions"
              emit-value
              map-options
              label="Resource"
              style="min-width: 160px"
              @update:model-value="onFilterChange"
            />
            <q-input
              v-model="dateFrom"
              dense
              outlined
              type="date"
              label="From"
              style="min-width: 140px"
              @update:model-value="onFilterChange"
            />
            <q-input
              v-model="dateTo"
              dense
              outlined
              type="date"
              label="To"
              style="min-width: 140px"
              @update:model-value="onFilterChange"
            />
          </template>
        </div>

        <div class="toolbar-actions">
          <q-select
            v-model="sortBy"
            dense
            outlined
            :options="sortOptions"
            emit-value
            map-options
            label="Sort by"
            style="min-width: 150px"
            @update:model-value="onFilterChange"
          />
        </div>
      </q-card-section>
      <q-separator />

      <div v-if="loading" class="portal-loading">
        <q-spinner color="primary" size="32px" />
        Loading bookings…
      </div>
      <div v-else-if="error" class="portal-error">
        <div>{{ error }}</div>
        <q-btn unelevated no-caps color="primary" label="Retry" @click="loadBookings" />
      </div>
      <div v-else-if="!rows.length" class="portal-empty">
        <q-icon :name="viewTab === 'action' ? 'task_alt' : 'event_busy'" size="32px" />
        <div>
          {{
            viewTab === 'action'
              ? 'No bookings require action'
              : 'No bookings found'
          }}
        </div>
      </div>

      <!-- All Requests table -->
      <q-table
        v-else-if="viewTab === 'all'"
        :rows="rows"
        :columns="allColumns"
        row-key="id"
        flat
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
      >
        <template #body-cell-requester="{ row }">
          <q-td>
            <div class="requester-cell">
              <q-avatar size="34px" color="primary" text-color="white" class="requester-avatar">
                {{ initials(row.user || row.userEmail) }}
              </q-avatar>
              <div>
                <div class="requester-id">{{ row.id }}</div>
                <div class="requester-name">
                  {{ row.user || 'Unknown' }}
                  <span v-if="row.userEmail"> · {{ row.userEmail }}</span>
                </div>
              </div>
            </div>
          </q-td>
        </template>
        <template #body-cell-resource="{ row }">
          <q-td>
            <div class="resource-name">{{ row.resource }}</div>
            <div v-if="row.location" class="resource-location">
              <q-icon name="place" size="14px" />
              {{ row.location }}
            </div>
          </q-td>
        </template>
        <template #body-cell-schedule="{ row }">
          <q-td>
            <div class="schedule-date">{{ formatDate(row.date) }}</div>
            <div class="schedule-time">
              {{ row.startTime }} - {{ row.endTime }}
              <span v-if="durationLabel(row)" class="duration">({{ durationLabel(row) }})</span>
            </div>
          </q-td>
        </template>
        <template #body-cell-status="{ row }">
          <q-td>
            <span class="status-chip" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </q-td>
        </template>
        <template #body-cell-actions="{ row }">
          <q-td align="right">
            <q-btn outline no-caps size="sm" color="primary" label="Action" icon-right="expand_more">
              <q-menu>
                <q-list style="min-width: 180px">
                  <q-item v-close-popup clickable @click="openDetails(row)">
                    <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                    <q-item-section>View Details</q-item-section>
                  </q-item>
                  <q-item
                    v-if="row.status === 'Pending'"
                    v-close-popup
                    clickable
                    :disable="actionLoadingId === row.id"
                    @click="updateStatus(row, 'Confirmed')"
                  >
                    <q-item-section avatar><q-icon name="check" color="positive" /></q-item-section>
                    <q-item-section>Approve</q-item-section>
                  </q-item>
                  <q-item
                    v-if="row.status === 'Pending'"
                    v-close-popup
                    clickable
                    :disable="actionLoadingId === row.id"
                    @click="updateStatus(row, 'Cancelled')"
                  >
                    <q-item-section avatar><q-icon name="close" color="negative" /></q-item-section>
                    <q-item-section>Reject</q-item-section>
                  </q-item>
                  <q-item
                    v-if="row.status !== 'Cancelled'"
                    v-close-popup
                    clickable
                    @click="openModify(row)"
                  >
                    <q-item-section avatar><q-icon name="edit" /></q-item-section>
                    <q-item-section>Modify</q-item-section>
                  </q-item>
                  <q-item v-close-popup clickable @click="openReceipt(row)">
                    <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
                    <q-item-section>View Receipt</q-item-section>
                  </q-item>
                  <q-item
                    v-if="row.status !== 'Cancelled' && row.status !== 'Completed'"
                    v-close-popup
                    clickable
                    @click="askCancel(row)"
                  >
                    <q-item-section avatar><q-icon name="delete" color="negative" /></q-item-section>
                    <q-item-section class="text-negative">Cancel</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </template>
      </q-table>

      <!-- Requires Action table -->
      <q-table
        v-else
        :rows="rows"
        :columns="actionColumns"
        row-key="id"
        flat
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
      >
        <template #body-cell-details="{ row }">
          <q-td>
            <div class="requester-id">{{ row.id }}</div>
            <div class="requester-name">
              {{ row.user || 'Unknown' }}
              <span v-if="row.date"> · {{ formatDate(row.date) }}, {{ row.startTime }}</span>
            </div>
          </q-td>
        </template>
        <template #body-cell-resource="{ row }">
          <q-td>
            <div class="resource-name">{{ row.resource }}</div>
            <div v-if="row.location" class="resource-location">{{ row.location }}</div>
          </q-td>
        </template>
        <template #body-cell-status="{ row }">
          <q-td>
            <span class="status-chip" :class="statusClass(row.status)">{{ statusLabel(row.status) }}</span>
          </q-td>
        </template>
        <template #body-cell-urgency="{ row }">
          <q-td>
            <div class="urgency-cell" :class="{ 'is-stale': (row.waitingHours || 0) >= 2 }">
              <q-icon name="schedule" size="16px" />
              {{ row.urgencyLabel || 'Awaiting review' }}
            </div>
          </q-td>
        </template>
        <template #body-cell-actions="{ row }">
          <q-td align="right">
            <div class="action-group">
              <q-btn
                round
                dense
                unelevated
                color="positive"
                icon="check"
                :loading="actionLoadingId === row.id"
                @click="updateStatus(row, 'Confirmed')"
              >
                <q-tooltip>Approve</q-tooltip>
              </q-btn>
              <q-btn
                round
                dense
                unelevated
                color="negative"
                icon="close"
                :loading="actionLoadingId === row.id"
                @click="updateStatus(row, 'Cancelled')"
              >
                <q-tooltip>Reject</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="more_vert">
                <q-menu>
                  <q-list style="min-width: 160px">
                    <q-item v-close-popup clickable @click="openDetails(row)">
                      <q-item-section>View Details</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="openModify(row)">
                      <q-item-section>Modify</q-item-section>
                    </q-item>
                    <q-item v-close-popup clickable @click="openReceipt(row)">
                      <q-item-section>View Receipt</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-td>
        </template>
      </q-table>

      <div v-if="!loading && !error && pagination.total > 0" class="pagination-bar">
        <div class="rows-per-page">
          Records per page
          <q-select
            v-model="rowsPerPage"
            dense
            outlined
            :options="[5, 10, 25, 50]"
            style="width: 80px"
            @update:model-value="onPageSizeChange"
          />
          <span class="page-range">{{ pageLabel }}</span>
        </div>
        <div class="page-controls">
          <q-btn flat round dense icon="chevron_left" :disable="page <= 1" @click="goPage(page - 1)" />
          <q-btn
            v-for="p in visiblePages"
            :key="p"
            flat
            dense
            no-caps
            class="page-btn"
            :class="{ active: p === page }"
            :label="String(p)"
            @click="goPage(p)"
          />
          <q-btn
            flat
            round
            dense
            icon="chevron_right"
            :disable="page >= pagination.totalPages"
            @click="goPage(page + 1)"
          />
        </div>
      </div>
    </q-card>

    <ModifyBookingDialog v-model="modifyOpen" :booking="selected" @saved="loadBookings" />
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
            <div class="cancel-title">{{ selected.resource }}</div>
            <div class="cancel-meta">{{ selected.datetime }}</div>
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
        <q-card-section class="q-gutter-sm details-body">
          <div><strong>Booking ID:</strong> {{ selected.id }}</div>
          <div><strong>Requester:</strong> {{ selected.user || '—' }}</div>
          <div v-if="selected.userEmail"><strong>Email:</strong> {{ selected.userEmail }}</div>
          <div><strong>Resource:</strong> {{ selected.resource }}</div>
          <div v-if="selected.location"><strong>Location:</strong> {{ selected.location }}</div>
          <div><strong>Status:</strong> {{ selected.status }}</div>
          <div><strong>Reservation:</strong> {{ formatDate(selected.date) }}</div>
          <div><strong>Time:</strong> {{ selected.startTime }} - {{ selected.endTime }}</div>
          <div v-if="durationLabel(selected)"><strong>Duration:</strong> {{ durationLabel(selected) }}</div>
          <div v-if="selected.purpose"><strong>Purpose:</strong> {{ selected.purpose }}</div>
          <div v-if="selected.notes"><strong>Notes:</strong> {{ selected.notes }}</div>
          <div><strong>Amount:</strong> {{ formatAmount(selected.amount) }}</div>
          <div v-if="selected.createdAt"><strong>Created:</strong> {{ formatDateTime(selected.createdAt) }}</div>
          <div v-if="selected.statusUpdatedAt">
            <strong>Status updated:</strong> {{ formatDateTime(selected.statusUpdatedAt) }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Close" @click="detailsOpen = false" />
          <q-btn
            v-if="detailsMode === 'receipt'"
            unelevated
            no-caps
            color="primary"
            icon="print"
            label="Print Receipt"
            @click="printReceipt"
          />
        </q-card-actions>
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
  userEmail?: string;
  userPhone?: string;
  resource: string;
  resourceId?: number | null;
  date: string;
  time: string;
  status: string;
  amount: string;
  datetime: string;
  startTime?: string;
  endTime?: string;
  purpose?: string;
  notes?: string;
  location?: string;
  createdAt?: string;
  statusUpdatedAt?: string;
  waitingHours?: number | null;
  urgencyLabel?: string | null;
};

type BookingStats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed?: number;
  confirmedToday: number;
  avgResponseHours: number | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const route = useRoute();
const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const rows = ref<Booking[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const statusFilter = ref('All Statuses');
const resourceFilter = ref('all');
const dateFrom = ref('');
const dateTo = ref('');
const sortBy = ref('urgency');
const viewTab = ref<'all' | 'action'>('all');
const page = ref(1);
const rowsPerPage = ref(10);
const selected = ref<Booking | null>(null);
const modifyOpen = ref(false);
const cancelOpen = ref(false);
const cancelling = ref(false);
const detailsOpen = ref(false);
const detailsMode = ref<'details' | 'receipt'>('details');
const actionLoadingId = ref<string | null>(null);
const resourceNames = ref<string[]>([]);

const stats = ref<BookingStats>({
  total: 0,
  confirmed: 0,
  pending: 0,
  cancelled: 0,
  completed: 0,
  confirmedToday: 0,
  avgResponseHours: null,
});

const pagination = ref<Pagination>({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
});

const statusValues = ref<string[]>([]);
const statusOptions = computed(() => ['All Statuses', ...statusValues.value]);
const sortOptions = [
  { label: 'Urgency', value: 'urgency' },
  { label: 'Newest', value: 'newest' },
  { label: 'Oldest', value: 'oldest' },
  { label: 'Status', value: 'status' },
];

const resourceOptions = computed(() => [
  { label: 'All Resources', value: 'all' },
  ...resourceNames.value.map((name) => ({ label: name, value: name })),
]);

const allColumns = [
  { name: 'requester', label: 'BOOKING ID & REQUESTER', field: 'id', align: 'left' as const },
  { name: 'resource', label: 'RESOURCE / LOCATION', field: 'resource', align: 'left' as const },
  { name: 'schedule', label: 'SCHEDULE', field: 'schedule', align: 'left' as const },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' as const },
];

const actionColumns = [
  { name: 'details', label: 'BOOKING DETAILS', field: 'id', align: 'left' as const },
  { name: 'resource', label: 'RESOURCE', field: 'resource', align: 'left' as const },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' as const },
  { name: 'urgency', label: 'URGENCY', field: 'urgencyLabel', align: 'left' as const },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' as const },
];

const pageLabel = computed(() => {
  if (!pagination.value.total) return '0 of 0';
  const start = (pagination.value.page - 1) * pagination.value.limit + 1;
  const end = Math.min(pagination.value.page * pagination.value.limit, pagination.value.total);
  return `Showing ${start}-${end} of ${pagination.value.total} bookings`;
});

const visiblePages = computed(() => {
  const total = pagination.value.totalPages;
  const current = page.value;
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, start + 4);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
});

function initials(value?: string): string {
  const text = String(value ?? '').trim() || '?';
  const parts = text.split(/\s+/).filter((part) => part.length > 0);
  const firstPart = parts.at(0);
  const secondPart = parts.at(1);
  if (firstPart && secondPart) {
    return `${firstPart.charAt(0)}${secondPart.charAt(0)}`.toUpperCase();
  }
  return text.slice(0, 2).toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatAmount(amount?: string) {
  if (amount == null || amount === '') return '—';
  const raw = String(amount).trim();
  if (raw.startsWith('$') || raw.startsWith('₹')) return raw;
  return raw;
}

function parseTimeToMinutes(value?: string) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function durationLabel(row: Booking) {
  const start = parseTimeToMinutes(row.startTime || row.time);
  const end = parseTimeToMinutes(row.endTime);
  if (start == null || end == null || end <= start) return '';
  const hours = (end - start) / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${Math.round(hours * 10) / 10}h`;
}

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === 'confirmed') return 'is-confirmed';
  if (s === 'pending') return 'is-pending';
  if (s === 'cancelled') return 'is-cancelled';
  return 'is-completed';
}

function statusLabel(status: string) {
  if (status === 'Pending') return 'Pending Approval';
  return status;
}

function apiErrorMessage(err: unknown, fallback: string) {
  const ax = err as { response?: { data?: { message?: string }; status?: number } };
  return ax.response?.data?.message || fallback;
}

function switchTab(tab: 'all' | 'action') {
  if (viewTab.value === tab) return;
  viewTab.value = tab;
  sortBy.value = tab === 'action' ? 'urgency' : sortBy.value;
  page.value = 1;
  void loadBookings();
}

function onFilterChange() {
  page.value = 1;
  void loadBookings();
}

function onPageSizeChange() {
  page.value = 1;
  void loadBookings();
}

function goPage(next: number) {
  if (next < 1 || next > pagination.value.totalPages) return;
  page.value = next;
  void loadBookings();
}

async function loadMeta() {
  try {
    const { data } = await api.get<{
      resources: Array<{ id: number | null; name: string }>;
      statuses?: string[];
      stats?: BookingStats;
    }>('/bookings/meta');
    resourceNames.value = (data.resources || [])
      .map((r) => r.name)
      .filter((name, index, arr) => Boolean(name) && arr.indexOf(name) === index);
    statusValues.value = (data.statuses || []).filter(Boolean);
    if (data.stats) {
      stats.value = {
        ...stats.value,
        ...data.stats,
        confirmedToday: data.stats.confirmedToday ?? 0,
        avgResponseHours: data.stats.avgResponseHours ?? null,
      };
    }
  } catch {
    // Meta is optional; table load still proceeds.
  }
}

async function loadBookings() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, string | number> = {
      view: viewTab.value === 'action' ? 'action' : 'all',
      sort: sortBy.value,
      page: page.value,
      limit: rowsPerPage.value,
    };
    if (search.value.trim()) params.search = search.value.trim();
    if (viewTab.value === 'all') {
      if (statusFilter.value !== 'All Statuses') params.status = statusFilter.value;
      if (resourceFilter.value !== 'all') params.resource = resourceFilter.value;
      if (dateFrom.value) params.dateFrom = dateFrom.value;
      if (dateTo.value) params.dateTo = dateTo.value;
    }

    const { data } = await api.get<{
      bookings: Booking[];
      stats?: BookingStats;
      pagination?: Pagination;
    }>('/bookings', { params });

    rows.value = data.bookings || [];
    if (data.stats) {
      stats.value = {
        total: data.stats.total ?? 0,
        confirmed: data.stats.confirmed ?? 0,
        pending: data.stats.pending ?? 0,
        cancelled: data.stats.cancelled ?? 0,
        completed: data.stats.completed ?? 0,
        confirmedToday: data.stats.confirmedToday ?? 0,
        avgResponseHours: data.stats.avgResponseHours ?? null,
      };
    }
    if (data.pagination) {
      pagination.value = data.pagination;
      page.value = data.pagination.page;
      rowsPerPage.value = data.pagination.limit;
    } else {
      pagination.value = {
        page: 1,
        limit: rowsPerPage.value,
        total: rows.value.length,
        totalPages: 1,
      };
    }
  } catch (err) {
    error.value = apiErrorMessage(err, 'Unable to load bookings.');
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

async function updateStatus(row: Booking, status: string) {
  actionLoadingId.value = row.id;
  try {
    await api.put(`/bookings/${row.id}`, { status });
    Notify.create({
      type: 'positive',
      message: status === 'Confirmed' ? 'Booking approved.' : 'Booking rejected.',
    });
    emitDashboardRefresh();
    await Promise.all([loadBookings(), loadMeta()]);
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: apiErrorMessage(err, 'Failed to update booking status.'),
    });
  } finally {
    actionLoadingId.value = null;
  }
}

function openModify(row: Booking) {
  selected.value = row;
  modifyOpen.value = true;
}
function askCancel(row: Booking) {
  selected.value = row;
  cancelOpen.value = true;
}
function openDetails(row: Booking) {
  selected.value = row;
  detailsMode.value = 'details';
  detailsOpen.value = true;
}
function openReceipt(row: Booking) {
  selected.value = row;
  detailsMode.value = 'receipt';
  detailsOpen.value = true;
}
function printReceipt() {
  window.print();
}

async function doCancel() {
  if (!selected.value) return;
  cancelling.value = true;
  try {
    await api.delete(`/bookings/${selected.value.id}`);
    Notify.create({ type: 'positive', message: 'Booking cancelled.' });
    cancelOpen.value = false;
    emitDashboardRefresh();
    await Promise.all([loadBookings(), loadMeta()]);
  } catch (err) {
    Notify.create({
      type: 'negative',
      message: apiErrorMessage(err, 'Failed to cancel booking.'),
    });
  } finally {
    cancelling.value = false;
  }
}

watch(
  () => route.query.q,
  (value) => {
    search.value = typeof value === 'string' ? value : '';
    page.value = 1;
    void loadBookings();
  },
);

let stopWatcher: (() => void) | undefined;
onMounted(() => {
  void loadMeta();
  void loadBookings();
  stopWatcher = watch(
    () => dashboardEvents.version,
    () => {
      void loadMeta();
      void loadBookings();
    },
  );
});
onUnmounted(() => {
  stopWatcher?.();
});
</script>

<style scoped>
.page-header {
  margin-bottom: 18px;
}
.page-header h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
  color: #0f172a;
}
.page-header p {
  margin: 6px 0 0;
  color: #64748b;
  max-width: 720px;
}
.view-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.tab {
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding: 8px 4px;
  cursor: pointer;
  font-weight: 650;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tab.active {
  color: #1e3a8a;
  border-bottom-color: #1e3a8a;
  background: transparent;
}
.badge {
  background: #dc2626;
  color: #fff;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
}
.stats-grid {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}
.stats-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.stat-card {
  border-radius: 14px;
  border-color: #e5e7eb;
}
.stat-card__body {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.stat-label {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.stat-value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 750;
  color: #0f172a;
}
.stat-value.danger {
  color: #dc2626;
}
.stat-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}
.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
}
.stat-icon.is-pending {
  background: #e0e7ff;
  color: #3730a3;
}
.stat-icon.is-confirmed {
  background: #dcfce7;
  color: #15803d;
}
.stat-icon.is-warning {
  background: #fee2e2;
  color: #b91c1c;
}
.table-card {
  border-radius: 14px;
  border-color: #e5e7eb;
  overflow: hidden;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.toolbar-left,
.toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.search-input {
  min-width: min(280px, 100%);
}
.requester-cell {
  display: flex;
  gap: 10px;
  align-items: center;
}
.requester-avatar {
  font-size: 12px;
  font-weight: 700;
}
.requester-id {
  font-weight: 700;
  font-size: 13px;
  color: #0f172a;
}
.requester-name {
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
}
.resource-name {
  font-weight: 600;
  font-size: 13px;
}
.resource-location {
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.status-chip {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.status-chip.is-confirmed {
  background: #dcfce7;
  color: #15803d;
}
.status-chip.is-pending {
  background: #e0e7ff;
  color: #3730a3;
}
.status-chip.is-cancelled {
  background: #f1f5f9;
  color: #64748b;
}
.status-chip.is-completed {
  background: #f1f5f9;
  color: #475569;
}
.schedule-date {
  font-weight: 600;
  font-size: 13px;
}
.schedule-time {
  color: #64748b;
  font-size: 12px;
  margin-top: 2px;
}
.duration {
  color: #94a3b8;
}
.urgency-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}
.urgency-cell.is-stale {
  color: #dc2626;
}
.action-group {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  align-items: center;
}
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  color: #64748b;
  font-size: 13px;
  gap: 12px;
  flex-wrap: wrap;
}
.rows-per-page,
.page-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-range {
  margin-left: 4px;
}
.page-btn {
  min-width: 32px;
  border-radius: 8px;
}
.page-btn.active {
  background: #1e3a8a;
  color: #fff;
}
.cancel-details {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: #f8fafc;
}
.cancel-title {
  font-weight: 700;
}
.cancel-meta {
  font-size: 12px;
  color: #64748b;
}
.details-dialog {
  width: min(480px, 92vw);
  border-radius: 14px;
}
.details-body {
  font-size: 14px;
  color: #334155;
}
@media (max-width: 900px) {
  .stats-grid--two {
    grid-template-columns: 1fr;
  }
}
@media print {
  :global(body *) {
    visibility: hidden;
  }
  .details-dialog,
  .details-dialog * {
    visibility: visible;
  }
  .details-dialog {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none;
  }
}
</style>

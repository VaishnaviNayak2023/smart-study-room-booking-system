<template>
  <q-page class="portal-page browse-page">
    <header class="browse-header">
      <div>
        <h1>Browse Rooms</h1>
        <p>Find and reserve available workspaces.</p>
      </div>
    </header>

    <q-card flat bordered class="filter-bar">
      <q-card-section class="filter-grid">
        <q-select
          v-model="draftType"
          outlined
          dense
          clearable
          label="Room Type"
          :options="typeOptions"
          emit-value
          map-options
        />
        <q-input v-model="draftDate" outlined dense type="date" label="Date" :min="today" />
        <q-select
          v-model="draftCapacity"
          outlined
          dense
          clearable
          label="Capacity"
          :options="capacityOptions"
          emit-value
          map-options
        />
        <q-btn unelevated no-caps color="primary" label="Apply Filters" class="apply-btn" @click="applyFilters" />
      </q-card-section>
    </q-card>

    <div v-if="loading" class="portal-loading">
      <q-spinner color="primary" size="32px" />
      Loading spaces…
    </div>
    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadData" />
    </div>
    <div v-else-if="visibleResources.length" class="spaces-grid">
      <q-card v-for="resource in visibleResources" :key="resource.id" flat bordered class="space-card">
        <div class="space-image-wrap">
          <q-img v-if="resource.image" :src="resource.image" :alt="resource.name" class="space-image" fit="cover" />
          <div v-else class="image-placeholder">
            <q-icon :name="resourceIcon(resource)" size="42px" />
          </div>
          <div class="status-pill" :class="statusPillClass(resource)">
            <span class="dot" />
            {{ statusPillLabel(resource) }}
          </div>
        </div>

        <q-card-section class="space-body">
          <div class="space-title-row">
            <h2>{{ resource.name }}</h2>
            <div class="capacity"><q-icon name="group" size="16px" /> {{ resource.capacity }}</div>
          </div>
          <p class="space-description">
            {{ resource.description || resource.location || 'Workspace available for booking.' }}
          </p>
          <div v-if="resourceTags(resource).length" class="tag-list">
            <span v-for="tag in resourceTags(resource)" :key="tag" class="tag">{{ tag }}</span>
          </div>
          <div v-if="busyIntervals(resource).length" class="busy-intervals">
            <div class="busy-title">
              <q-icon name="event_busy" size="14px" />
              Unavailable intervals
            </div>
            <div
              v-for="(slot, index) in busyIntervals(resource)"
              :key="`${resource.id}-${slot.date}-${slot.startTime}-${index}`"
              class="busy-slot"
            >
              {{ formatInterval(slot) }}
              <span v-if="slot.isMine" class="mine-tag">Your booking</span>
            </div>
          </div>
          <div class="space-footer">
            <div class="price">{{ formatAmount(resourceHourlyRate(resource)) }}/hr</div>
            <q-btn
              unelevated
              no-caps
              :disable="!canBookResource(resource)"
              :label="actionLabel(resource)"
              class="book-btn"
              :class="{ unavailable: !canBookResource(resource) }"
              @click="openBooking(resource)"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div v-else-if="!resources.length" class="portal-empty">
      <q-icon name="meeting_room" size="32px" />
      No spaces available yet. An admin needs to create resource types and rooms in Manage Resources.
    </div>
    <div v-else-if="!visibleResources.length" class="portal-empty">
      <q-icon name="search_off" size="32px" />
      No spaces match the current filters.
    </div>

    <q-dialog v-model="bookingDialog" persistent>
      <q-card v-if="selectedResource" class="booking-dialog">
        <q-card-section class="dialog-heading">
          <div class="dialog-hero">
            <q-img
              v-if="selectedResource.image"
              :src="selectedResource.image"
              :alt="selectedResource.name"
              class="dialog-image"
              fit="cover"
            />
            <div v-else class="dialog-image placeholder">
              <q-icon :name="resourceIcon(selectedResource)" size="36px" />
            </div>
            <div class="dialog-hero-text">
              <div class="text-h6">{{ selectedResource.name }}</div>
              <div class="amenity-row">
                <span><q-icon name="group" size="14px" /> Capacity: {{ selectedResource.capacity }}</span>
                <span v-if="selectedResource.location"><q-icon name="place" size="14px" /> {{ selectedResource.location }}</span>
              </div>
              <p class="dialog-desc">
                {{ selectedResource.description || 'Reserve this workspace for your next session.' }}
              </p>
            </div>
          </div>
          <q-btn flat round dense icon="close" aria-label="Close booking dialog" @click="bookingDialog = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="dialog-body">
          <q-form class="booking-form" @submit.prevent="confirmBooking">
            <div class="form-section-label"><q-icon name="edit_note" size="16px" /> Booking Details</div>
            <q-input
              v-model="booking.purpose"
              outlined
              dense
              label="Booking Title / Purpose"
              placeholder="e.g., Strategy Review"
            />

            <div class="form-section-label"><q-icon name="schedule" size="16px" /> Date &amp; Time</div>
            <div class="schedule-box">
              <q-input
                v-model="booking.date"
                outlined
                dense
                type="date"
                label="Date"
                :min="today"
                :rules="[(value) => !!value || 'Date is required']"
              />
              <div class="time-fields">
                <q-select
                  v-model="booking.startTime"
                  outlined
                  dense
                  label="Start time"
                  :options="startTimeOptions"
                  :rules="[(value) => !!value || 'Start time is required']"
                />
                <span class="to-label">to</span>
                <q-select
                  v-model="booking.endTime"
                  outlined
                  dense
                  label="End time"
                  :options="endTimeOptions"
                  :rules="[(value) => !!value || 'End time is required']"
                />
              </div>
            </div>

            <div class="form-section-label"><q-icon name="notes" size="16px" /> Additional Notes</div>
            <q-input
              v-model="booking.notes"
              outlined
              type="textarea"
              autogrow
              placeholder="Enter any additional requirements or notes here..."
            />

            <template v-if="addOns.length">
              <div class="form-section-label">Enhancements</div>
              <q-option-group
                v-model="booking.addOns"
                :options="addOnOptions"
                type="checkbox"
                color="primary"
                class="addon-options"
              />
            </template>

            <div v-if="minimumDurationHours > 0" class="field-help q-mb-sm">
              Minimum booking duration: {{ minimumDurationLabel }}
            </div>
            <div v-if="quoteError" class="field-help text-negative q-mb-sm">{{ quoteError }}</div>
            <div class="price-summary">
              <div>
                <div class="summary-title">Booking Summary</div>
                <div class="summary-sub">Room Rate ({{ durationLabel }})</div>
              </div>
              <div class="summary-total">
                <div class="summary-sub">Estimated Total</div>
                <strong>{{ formatAmount(estimatedTotal) }}</strong>
              </div>
            </div>

            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              label="Confirm Booking"
              icon-right="arrow_forward"
              class="confirm-button"
              :loading="submitting"
              :disable="duration <= 0 || quoteLoading || !!quoteError"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <BookingReceiptDialog v-model="receiptOpen" :booking-code="receiptBookingCode" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import api from '@/services/api';
import BookingReceiptDialog from '@/components/user/BookingReceiptDialog.vue';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSettingsStore } from '@/stores/settings-store';

type BusyInterval = {
  date: string;
  startTime: string;
  endTime: string;
  bookingId?: string | null;
  isMine?: boolean;
};

type Resource = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  available: boolean;
  image: string;
  inService?: boolean;
  isBooked?: boolean;
  bookedByCurrentUser?: boolean;
  bookedByOthers?: boolean;
  canBook?: boolean;
  availabilityStatus?: string;
  unavailableIntervals?: BusyInterval[];
  hourlyRate?: number;
  currency?: string;
  freeFirstHour?: boolean;
};
type AddOn = { id: string; label: string; amount: number };
type Pricing = {
  hourlyRate?: number;
  freeFirstHour?: boolean;
  currency?: string;
  addOns?: AddOn[];
  minimumDuration?: string | number;
};

const $q = useQuasar();
const route = useRoute();
const notificationsStore = useNotificationsStore();
const dashboardEvents = useDashboardEvents();
const settingsStore = useSettingsStore();
const today = new Date().toISOString().slice(0, 10);

const resources = ref<Resource[]>([]);
const resourceTypeNames = ref<string[]>([]);
const resourceTypeIcons = ref<Record<string, string>>({});
const pricing = ref<Pricing>({});
const estimatedTotal = ref(0);
const quoteLoading = ref(false);
const quoteError = ref('');
const loading = ref(true);
const error = ref('');
const submitting = ref(false);
const receiptOpen = ref(false);
const receiptBookingCode = ref<string | null>(null);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const draftType = ref<string | null>(null);
const draftDate = ref(today);
const draftCapacity = ref<number | null>(null);
const appliedType = ref<string | null>(null);
const appliedCapacity = ref<number | null>(null);
const bookingDialog = ref(false);
const selectedResource = ref<Resource | null>(null);
const booking = ref({
  date: today,
  startTime: '',
  endTime: '',
  purpose: '',
  notes: '',
  addOns: [] as string[],
});

const timeOptions = Array.from({ length: 24 * 2 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});
const startTimeOptions = computed(() => timeOptions.slice(0, -1));
const endTimeOptions = computed(() => {
  const startIndex = timeOptions.indexOf(booking.value.startTime);
  return startIndex >= 0 ? timeOptions.slice(startIndex + 1) : timeOptions.slice(1);
});
const typeOptions = computed(() =>
  resourceTypeNames.value.map((value) => ({
    label: value,
    value,
  })),
);
const capacityOptions = computed(() =>
  [...new Set(resources.value.map((resource) => resource.capacity))]
    .sort((a, b) => a - b)
    .map((value) => ({ label: `${value}+ people`, value })),
);
const addOns = computed(() =>
  Array.isArray(pricing.value.addOns)
    ? pricing.value.addOns.filter((item) => item.id && item.label && Number.isFinite(Number(item.amount)))
    : [],
);
const addOnOptions = computed(() =>
  addOns.value.map((item) => ({ label: `${item.label} · ${formatAmount(item.amount)}`, value: item.id })),
);
function resourceHourlyRate(resource: Resource) {
  return Number(resource.hourlyRate) || 0;
}

const visibleResources = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return resources.value.filter((resource) => {
    const searchable = [resource.name, resource.type, resource.location, resource.description]
      .join(' ')
      .toLocaleLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      (!appliedType.value || resource.type === appliedType.value) &&
      (!appliedCapacity.value || resource.capacity >= appliedCapacity.value)
    );
  });
});

const duration = computed(() => {
  const start = timeToMinutes(booking.value.startTime);
  const end = timeToMinutes(booking.value.endTime);
  return start === null || end === null || end <= start ? 0 : (end - start) / 60;
});
const durationLabel = computed(() => `${duration.value} ${duration.value === 1 ? 'hour' : 'hours'}`);

function parseMinimumDurationHours(value: string | number | undefined): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  const match = String(value).trim().toLowerCase().match(/(\d+(?:\.\d+)?)/);
  return match ? Math.max(0, Number(match[1])) : 0;
}

const minimumDurationHours = computed(() => parseMinimumDurationHours(pricing.value.minimumDuration));
const minimumDurationLabel = computed(() => {
  const hours = minimumDurationHours.value;
  if (hours <= 0) return '';
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
});

async function refreshQuote() {
  if (!selectedResource.value || duration.value <= 0) {
    estimatedTotal.value = 0;
    quoteError.value = '';
    return;
  }
  quoteLoading.value = true;
  quoteError.value = '';
  try {
    const { data } = await api.post<{
      breakdown: { total: number; currency?: string };
    }>('/pricing-rules/calculate', {
      resourceId: selectedResource.value.id,
      resourceType: selectedResource.value.type,
      date: booking.value.date,
      startTime: booking.value.startTime,
      endTime: booking.value.endTime,
      addOnIds: booking.value.addOns,
    });
    estimatedTotal.value = Number(data.breakdown?.total) || 0;
  } catch (err: unknown) {
    estimatedTotal.value = 0;
    const message =
      typeof err === 'object' && err && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    quoteError.value = message || 'Unable to calculate price. Adjust your booking time and try again.';
  } finally {
    quoteLoading.value = false;
  }
}

function timeToMinutes(value: string): number | null {
  const [hours = Number.NaN, minutes = Number.NaN] = value.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
}

function busyIntervals(resource: Resource): BusyInterval[] {
  return Array.isArray(resource.unavailableIntervals) ? resource.unavailableIntervals : [];
}

function statusPillLabel(resource: Resource) {
  if (resource.availabilityStatus === 'booked' || resource.bookedByCurrentUser) return 'Booked';
  if (resource.availabilityStatus === 'maintenance' || resource.inService === false) return 'Unavailable';
  if (resource.availabilityStatus === 'unavailable' || resource.bookedByOthers) return 'Unavailable';
  return resource.available ? 'Available' : 'Unavailable';
}

function statusPillClass(resource: Resource) {
  const label = statusPillLabel(resource);
  if (label === 'Available') return 'available';
  if (label === 'Booked') return 'booked';
  return 'unavailable';
}

function canBookResource(resource: Resource) {
  if (typeof resource.canBook === 'boolean') return resource.canBook;
  return !!resource.available;
}

function actionLabel(resource: Resource) {
  if (resource.bookedByCurrentUser || resource.availabilityStatus === 'booked') return 'Booked';
  if (!canBookResource(resource)) return 'Unavailable';
  return 'Book Now';
}

function formatInterval(slot: BusyInterval) {
  const dateLabel = slot.date
    ? new Date(`${slot.date}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const timeLabel =
    slot.startTime && slot.endTime ? `${slot.startTime} - ${slot.endTime}` : slot.startTime || slot.endTime || '';
  if (dateLabel && timeLabel) return `${dateLabel} · ${timeLabel}`;
  return dateLabel || timeLabel || 'Reserved';
}

function resourceIcon(resource: Resource) {
  const fromType = resourceTypeIcons.value[resource.type];
  if (fromType) return fromType;
  return 'category';
}
function resourceTags(resource: Resource) {
  return resource.description
    .split(/[,;•|/]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 1 && tag.length < 24)
    .slice(0, 4);
}
function formatAmount(value: number) {
  return settingsStore.formatMoney(value);
}
function applyFilters() {
  appliedType.value = draftType.value;
  appliedCapacity.value = draftCapacity.value;
  if (draftDate.value) booking.value.date = draftDate.value;
  void loadData();
}
function openBooking(resource: Resource) {
  selectedResource.value = resource;
  booking.value = {
    date: draftDate.value || today,
    startTime: startTimeOptions.value[0] || '',
    endTime: startTimeOptions.value[2] || startTimeOptions.value[1] || '',
    purpose: '',
    notes: '',
    addOns: [],
  };
  bookingDialog.value = true;
  void loadPricingForResource(resource);
}

async function loadPricingForResource(resource: Resource) {
  try {
    const { data } = await api.get<{ pricing: Pricing }>('/pricing-rules/resources', {
      params: { resourceId: resource.id, resourceType: resource.type },
    });
    pricing.value = data.pricing || {};
    void refreshQuote();
  } catch {
    pricing.value = {};
  }
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const resourceParams: Record<string, string> = {};
    const date = draftDate.value || booking.value.date || today;
    if (date) resourceParams.date = date;

    // Load rooms first so pricing failures cannot hang the page forever.
    const resourcesResponse = await api.get<{ resources: Resource[] }>('/resources', {
      params: resourceParams,
    });
    resources.value = Array.isArray(resourcesResponse.data?.resources)
      ? resourcesResponse.data.resources
      : [];

    const [typesResult] = await Promise.allSettled([
      api.get<{ resourceTypes: Array<{ name: string; icon?: string }> }>('/resource-types'),
    ]);

    if (typesResult.status === 'fulfilled') {
      const types = typesResult.value.data.resourceTypes || [];
      resourceTypeNames.value = types.map((type) => type.name).filter(Boolean);
      const icons: Record<string, string> = {};
      for (const type of types) {
        if (type.name) icons[type.name] = type.icon || 'category';
      }
      resourceTypeIcons.value = icons;
    } else {
      resourceTypeNames.value = [];
      resourceTypeIcons.value = {};
    }
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string }; status?: number }; message?: string };
    error.value =
      ax.response?.data?.message ||
      (ax.response?.status ? `Unable to load spaces (HTTP ${ax.response.status}).` : null) ||
      ax.message ||
      'Unable to load spaces.';
    resources.value = [];
  } finally {
    loading.value = false;
  }
}

async function confirmBooking() {
  if (!selectedResource.value || duration.value <= 0) {
    $q.notify({ type: 'warning', message: 'Choose an end time after the start time.' });
    return;
  }
  if (minimumDurationHours.value > 0 && duration.value < minimumDurationHours.value) {
    $q.notify({
      type: 'warning',
      message: `Booking duration must be at least ${minimumDurationLabel.value}.`,
    });
    return;
  }
  submitting.value = true;
  try {
    const { data } = await api.post<{ booking: { id: string } }>('/bookings', {
      resource: selectedResource.value.name,
      resourceId: selectedResource.value.id,
      date: booking.value.date,
      time: booking.value.startTime,
      startTime: booking.value.startTime,
      endTime: booking.value.endTime,
      addOnIds: booking.value.addOns,
      purpose: booking.value.purpose,
      notes: booking.value.notes,
    });
    $q.notify({ type: 'positive', message: 'Booking confirmed.' });
    bookingDialog.value = false;
    receiptBookingCode.value = data.booking?.id || null;
    receiptOpen.value = !!receiptBookingCode.value;
    emitDashboardRefresh();
    await notificationsStore.refreshUnread();
    await loadData();
  } catch (err: unknown) {
    const message =
      typeof err === 'object' && err && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    $q.notify({ type: 'negative', message: message || 'Booking could not be created.' });
  } finally {
    submitting.value = false;
  }
}

watch(
  () => booking.value.startTime,
  () => {
    if (!endTimeOptions.value.includes(booking.value.endTime)) {
      booking.value.endTime = endTimeOptions.value[0] || '';
    }
    void refreshQuote();
  },
);

watch(
  () => [
    booking.value.date,
    booking.value.endTime,
    booking.value.addOns,
    selectedResource.value?.id,
    duration.value,
  ],
  () => {
    void refreshQuote();
  },
  { deep: true },
);

watch(
  () => route.query.q,
  (value) => {
    search.value = typeof value === 'string' ? value : '';
  },
);

watch(() => dashboardEvents.version, () => {
  void loadData();
});

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.browse-header {
  margin-bottom: 20px;
}

.browse-header h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
}

.browse-header p {
  margin: 6px 0 0;
  color: var(--portal-muted);
}

.filter-bar {
  border-radius: 14px;
  border-color: var(--portal-border);
  margin-bottom: 24px;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 12px;
  align-items: center;
}

.apply-btn {
  border-radius: 10px;
  min-height: 40px;
  background: var(--portal-primary);
}

.spaces-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.space-card {
  overflow: hidden;
  border-radius: 14px;
  border-color: var(--portal-border);
  background: var(--portal-card);
}

.space-image-wrap {
  position: relative;
  height: 170px;
  background: var(--portal-image-bg);
}

.space-image,
.image-placeholder {
  height: 170px;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--portal-primary);
  background: linear-gradient(135deg, #e0e7ff, #f8fafc);
}

.status-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 12px;
  font-weight: 600;
}

.status-pill .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-pill.available {
  color: var(--portal-status-confirmed-text);
}

.status-pill.available .dot {
  background: #22c55e;
}

.status-pill.booked {
  color: var(--portal-status-booked-text);
}

.status-pill.booked .dot {
  background: #3b82f6;
}

.status-pill.unavailable {
  color: var(--portal-status-unavailable-text);
}

.status-pill.unavailable .dot {
  background: #ef4444;
}

.busy-intervals {
  margin: 10px 0 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--portal-muted-bg);
  border: 1px solid var(--portal-border);
}

.busy-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--portal-muted);
  font-size: 12px;
  font-weight: 650;
  margin-bottom: 6px;
}

.busy-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--portal-text-secondary);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 0;
}

.mine-tag {
  color: var(--portal-status-booked-text);
  background: var(--portal-status-pending-bg);
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
}

.space-body {
  padding: 16px;
}

.space-title-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.space-title-row h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.capacity {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--portal-muted);
  font-size: 13px;
}

.space-description {
  margin: 8px 0 0;
  color: var(--portal-muted);
  font-size: 13px;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.tag {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--portal-border);
  background: var(--portal-muted-bg);
  color: var(--portal-text-secondary);
  font-size: 11px;
}

.space-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  gap: 10px;
}

.price {
  font-weight: 700;
  color: var(--portal-text);
}

.book-btn {
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  border-radius: 10px;
}

.book-btn.unavailable {
  background: var(--portal-image-bg);
  color: var(--portal-muted);
}

.booking-dialog {
  width: min(720px, 96vw);
  max-height: 90vh;
  border-radius: 16px;
}

.dialog-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.dialog-hero {
  display: flex;
  gap: 14px;
  flex: 1;
}

.dialog-image {
  width: 120px;
  height: 90px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.dialog-image.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--portal-primary-soft);
  color: var(--portal-primary);
}

.amenity-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  color: var(--portal-muted);
  font-size: 12px;
}

.dialog-desc {
  margin: 8px 0 0;
  color: var(--portal-muted);
  font-size: 13px;
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--portal-text);
}

.schedule-box {
  padding: 12px;
  border-radius: 12px;
  background: var(--portal-primary-soft);
}

.time-fields {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.to-label {
  color: var(--portal-muted);
  font-size: 12px;
}

.price-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
  background: var(--portal-summary-bg);
}

.summary-title {
  font-weight: 700;
}

.summary-sub {
  margin-top: 2px;
  color: var(--portal-muted);
  font-size: 12px;
}

.summary-total {
  text-align: right;
}

.summary-total strong {
  display: block;
  margin-top: 2px;
  color: var(--portal-primary);
  font-size: 22px;
}

.confirm-button {
  width: 100%;
  margin-top: 14px;
  min-height: 44px;
  border-radius: 10px;
}

@media (max-width: 1100px) {
  .spaces-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .spaces-grid {
    grid-template-columns: 1fr;
  }

  .dialog-hero {
    flex-direction: column;
  }

  .dialog-image {
    width: 100%;
    height: 140px;
  }
}
</style>

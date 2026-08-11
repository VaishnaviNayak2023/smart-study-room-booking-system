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
          <div class="status-pill" :class="resource.available ? 'available' : 'booked'">
            <span class="dot" />
            {{ resource.available ? 'Available' : 'Booked' }}
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
          <div class="space-footer">
            <div class="price">{{ formatAmount(hourlyRate) }}/hr</div>
            <q-btn
              unelevated
              no-caps
              :disable="!resource.available"
              :label="resource.available ? 'Book Now' : 'Unavailable'"
              class="book-btn"
              :class="{ unavailable: !resource.available }"
              @click="openBooking(resource)"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div v-else class="portal-empty">
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

            <div class="price-summary">
              <div>
                <div class="summary-title">Booking Summary</div>
                <div class="summary-sub">Room Rate ({{ durationLabel }})</div>
              </div>
              <div class="summary-total">
                <div class="summary-sub">Estimated Total</div>
                <strong>{{ formatAmount(total) }}</strong>
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
              :disable="duration <= 0"
            />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import api from '@/services/api';
import { appConfig } from '@/config/app';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import { useNotificationsStore } from '@/stores/notifications-store';

type Resource = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  available: boolean;
  image: string;
};
type AddOn = { id: string; label: string; amount: number };
type Pricing = { hourlyRate?: number; freeFirstHour?: boolean; currency?: string; addOns?: AddOn[] };

const $q = useQuasar();
const route = useRoute();
const notificationsStore = useNotificationsStore();
const dashboardEvents = useDashboardEvents();
const today = new Date().toISOString().slice(0, 10);

const resources = ref<Resource[]>([]);
const pricing = ref<Pricing>({});
const loading = ref(false);
const error = ref('');
const submitting = ref(false);
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
  [...new Set(resources.value.map((resource) => resource.type).filter(Boolean))].map((value) => ({
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
const hourlyRate = computed(() => Number(pricing.value.hourlyRate) || 0);

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
const subtotal = computed(() => {
  const rate = hourlyRate.value;
  const billableHours = Math.max(duration.value - (pricing.value.freeFirstHour ? 1 : 0), 0);
  return billableHours * rate;
});
const addOnTotal = computed(() =>
  addOns.value
    .filter((item) => booking.value.addOns.includes(item.id))
    .reduce((sum, item) => sum + Number(item.amount), 0),
);
const total = computed(() => subtotal.value + addOnTotal.value);

function timeToMinutes(value: string): number | null {
  const [hours = Number.NaN, minutes = Number.NaN] = value.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
}
function resourceIcon(resource: Resource) {
  const type = resource.type.toLocaleLowerCase();
  return type.includes('lab') ? 'science' : type.includes('conference') ? 'groups' : 'meeting_room';
}
function resourceTags(resource: Resource) {
  return resource.description
    .split(/[,;•|/]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 1 && tag.length < 24)
    .slice(0, 4);
}
function formatAmount(value: number) {
  const currency = pricing.value.currency || appConfig.defaultCurrency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}
function applyFilters() {
  appliedType.value = draftType.value;
  appliedCapacity.value = draftCapacity.value;
  if (draftDate.value) booking.value.date = draftDate.value;
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
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    const [resourcesResponse, pricingResponse] = await Promise.all([
      api.get<{ resources: Resource[] }>('/resources'),
      api.get<{ pricing: Pricing }>('/pricing-rules/resources'),
    ]);
    resources.value = resourcesResponse.data.resources;
    pricing.value = pricingResponse.data.pricing || {};
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load spaces.';
  } finally {
    loading.value = false;
  }
}

async function confirmBooking() {
  if (!selectedResource.value || duration.value <= 0) {
    $q.notify({ type: 'warning', message: 'Choose an end time after the start time.' });
    return;
  }
  submitting.value = true;
  try {
    await api.post('/bookings', {
      resource: selectedResource.value.name,
      resourceId: selectedResource.value.id,
      date: booking.value.date,
      time: booking.value.startTime,
      startTime: booking.value.startTime,
      endTime: booking.value.endTime,
      amount: total.value.toFixed(2),
      purpose: booking.value.purpose,
      notes: booking.value.notes,
    });
    $q.notify({ type: 'positive', message: 'Booking confirmed.' });
    bookingDialog.value = false;
    emitDashboardRefresh();
    await notificationsStore.refreshUnread();
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
  },
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
  color: #64748b;
}

.filter-bar {
  border-radius: 14px;
  border-color: #e5e7eb;
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
  background: #1e3a8a;
}

.spaces-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.space-card {
  overflow: hidden;
  border-radius: 14px;
  border-color: #e5e7eb;
  background: #fff;
}

.space-image-wrap {
  position: relative;
  height: 170px;
  background: #e2e8f0;
}

.space-image,
.image-placeholder {
  height: 170px;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1e3a8a;
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
  color: #15803d;
}

.status-pill.available .dot {
  background: #22c55e;
}

.status-pill.booked {
  color: #b91c1c;
}

.status-pill.booked .dot {
  background: #ef4444;
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
  color: #64748b;
  font-size: 13px;
}

.space-description {
  margin: 8px 0 0;
  color: #64748b;
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
  border: 1px solid #e5e7eb;
  background: #f8fafc;
  color: #475569;
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
  color: #111827;
}

.book-btn {
  background: #1e3a8a;
  color: #fff;
  border-radius: 10px;
}

.book-btn.unavailable {
  background: #e2e8f0;
  color: #64748b;
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
  background: #eef2ff;
  color: #1e3a8a;
}

.amenity-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
}

.dialog-desc {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}

.form-section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.schedule-box {
  padding: 12px;
  border-radius: 12px;
  background: #eef2ff;
}

.time-fields {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin-top: 10px;
}

.to-label {
  color: #64748b;
  font-size: 12px;
}

.price-summary {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
  background: #f1f5f9;
}

.summary-title {
  font-weight: 700;
}

.summary-sub {
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
}

.summary-total {
  text-align: right;
}

.summary-total strong {
  display: block;
  margin-top: 2px;
  color: #1e3a8a;
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

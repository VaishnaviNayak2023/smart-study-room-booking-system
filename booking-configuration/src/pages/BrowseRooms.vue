<template>
  <q-page class="browse-page">
    <main class="browse-content">
      <header class="browse-header">
        <div>
          <h1>Browse Spaces</h1>
          <p>Select a resource for your next booking.</p>
        </div>
        <div class="header-actions">
          <q-btn outline no-caps icon="filter_list" label="Filter" @click="filtersOpen = !filtersOpen" />
          <q-btn outline no-caps icon="sort" label="Sort" @click="sortDescending = !sortDescending" />
        </div>
      </header>

      <q-card v-show="filtersOpen" flat bordered class="filter-panel">
        <q-card-section class="filter-grid">
          <q-input v-model="search" outlined dense clearable label="Search spaces, locations, or amenities">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
          <q-select v-model="capacity" outlined dense clearable label="Minimum capacity" :options="capacityOptions" emit-value map-options />
          <q-toggle v-model="availableOnly" label="Available only" color="primary" />
        </q-card-section>
      </q-card>

      <div v-if="loading" class="state-panel"><q-spinner color="primary" size="32px" /> Loading spaces…</div>
      <div v-else-if="visibleResources.length" class="spaces-grid">
        <q-card v-for="resource in visibleResources" :key="resource.id" flat bordered class="space-card">
          <q-img v-if="resource.image" :src="resource.image" :alt="resource.name" class="space-image" fit="cover">
            <div class="capacity-badge"><q-icon name="group" /> Up to {{ resource.capacity }}</div>
          </q-img>
          <div v-else class="image-placeholder"><q-icon :name="resourceIcon(resource)" size="42px" /><span>{{ resource.type }}</span><div class="capacity-badge"><q-icon name="group" /> Up to {{ resource.capacity }}</div></div>

          <q-card-section class="space-body">
            <div class="space-title-row">
              <h2>{{ resource.name }}</h2>
              <q-avatar color="blue-1" text-color="primary" size="42px"><q-icon :name="resourceIcon(resource)" /></q-avatar>
            </div>
            <p v-if="resource.description" class="space-description">{{ resource.description }}</p>
            <p v-else-if="resource.location" class="space-description"><q-icon name="location_on" size="16px" /> {{ resource.location }}</p>
            <div v-if="resourceTags(resource).length" class="tag-list"><q-chip v-for="tag in resourceTags(resource)" :key="tag" dense square>{{ tag }}</q-chip></div>
            <q-btn outline no-caps label="Book" class="book-button" :disable="!resource.available" @click="openBooking(resource)" />
          </q-card-section>
        </q-card>
      </div>
      <div v-else class="state-panel"><q-icon name="search_off" size="32px" /> No spaces match the current filters.</div>
    </main>

    <q-dialog v-model="bookingDialog" persistent>
      <q-card v-if="selectedResource" class="booking-dialog">
        <q-card-section class="dialog-heading">
          <div class="text-h6">Configure Booking</div>
          <q-btn flat round dense icon="close" aria-label="Close booking dialog" @click="bookingDialog = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="dialog-body">
          <div class="selected-resource">
            <q-img v-if="selectedResource.image" :src="selectedResource.image" :alt="selectedResource.name" fit="cover" />
            <q-avatar v-else color="blue-1" text-color="primary" size="64px"><q-icon :name="resourceIcon(selectedResource)" size="30px" /></q-avatar>
            <div><strong>{{ selectedResource.name }}</strong><span><q-icon name="group" /> {{ selectedResource.capacity }} capacity</span></div>
          </div>

          <q-form class="booking-form" @submit.prevent="confirmBooking">
            <div class="form-section-label">Schedule</div>
            <q-input v-model="booking.date" outlined dense type="date" label="Date" :min="today" :rules="[(value) => !!value || 'Date is required']" />
            <div class="time-fields">
              <q-select v-model="booking.startTime" outlined dense label="Start time" :options="startTimeOptions" :rules="[(value) => !!value || 'Start time is required']" />
              <q-select v-model="booking.endTime" outlined dense label="End time" :options="endTimeOptions" :rules="[(value) => !!value || 'End time is required']" />
            </div>

            <template v-if="addOns.length">
              <div class="form-section-label">Enhancements</div>
              <q-option-group v-model="booking.addOns" :options="addOnOptions" type="checkbox" color="primary" class="addon-options" />
            </template>

            <div class="price-summary">
              <div><span>Subtotal ({{ durationLabel }})</span><span>{{ formatAmount(subtotal) }}</span></div>
              <div v-if="addOnTotal"><span>Add-ons</span><span>{{ formatAmount(addOnTotal) }}</span></div>
              <q-separator />
              <div class="total"><strong>Total</strong><strong>{{ formatAmount(total) }}</strong></div>
            </div>
            <q-btn unelevated no-caps color="primary" type="submit" label="Confirm Booking" icon-right="arrow_forward" class="confirm-button" :loading="submitting" :disable="duration <= 0" />
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import api from '@/services/api';
import { appConfig } from '@/config/app';
import { emitDashboardRefresh } from '@/stores/dashboard-events';

type Resource = { id: number; name: string; type: string; capacity: number; location: string; description: string; available: boolean; image: string };
type AddOn = { id: string; label: string; amount: number };
type Pricing = { hourlyRate?: number; freeFirstHour?: boolean; currency?: string; addOns?: AddOn[] };

const $q = useQuasar();
const today = new Date().toISOString().slice(0, 10);
const resources = ref<Resource[]>([]);
const pricing = ref<Pricing>({});
const loading = ref(false);
const submitting = ref(false);
const search = ref('');
const capacity = ref<number | null>(null);
const availableOnly = ref(true);
const filtersOpen = ref(false);
const sortDescending = ref(false);
const bookingDialog = ref(false);
const selectedResource = ref<Resource | null>(null);
const booking = ref({ date: today, startTime: '', endTime: '', addOns: [] as string[] });

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
const capacityOptions = computed(() => [...new Set(resources.value.map((resource) => resource.capacity))].sort((a, b) => a - b).map((value) => ({ label: `${value} people`, value })));
const addOns = computed(() => Array.isArray(pricing.value.addOns) ? pricing.value.addOns.filter((item) => item.id && item.label && Number.isFinite(Number(item.amount))) : []);
const addOnOptions = computed(() => addOns.value.map((item) => ({ label: `${item.label} · ${formatAmount(item.amount)}`, value: item.id })));

const visibleResources = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  const result = resources.value.filter((resource) => {
    const searchable = [resource.name, resource.type, resource.location, resource.description].join(' ').toLocaleLowerCase();
    return (!query || searchable.includes(query)) && (!capacity.value || resource.capacity >= capacity.value) && (!availableOnly.value || resource.available);
  });
  return result.sort((a, b) => sortDescending.value ? b.capacity - a.capacity : a.name.localeCompare(b.name));
});

const duration = computed(() => {
  const start = timeToMinutes(booking.value.startTime);
  const end = timeToMinutes(booking.value.endTime);
  return start === null || end === null || end <= start ? 0 : (end - start) / 60;
});
const durationLabel = computed(() => `${duration.value} ${duration.value === 1 ? 'hour' : 'hours'}`);
const subtotal = computed(() => {
  const rate = Number(pricing.value.hourlyRate) || 0;
  const billableHours = Math.max(duration.value - (pricing.value.freeFirstHour ? 1 : 0), 0);
  return billableHours * rate;
});
const addOnTotal = computed(() => addOns.value.filter((item) => booking.value.addOns.includes(item.id)).reduce((sum, item) => sum + Number(item.amount), 0));
const total = computed(() => subtotal.value + addOnTotal.value);

function timeToMinutes(value: string): number | null {
  const [hours = Number.NaN, minutes = Number.NaN] = value.split(':').map(Number);
  return Number.isInteger(hours) && Number.isInteger(minutes) ? hours * 60 + minutes : null;
}
function resourceIcon(resource: Resource) { const type = resource.type.toLocaleLowerCase(); return type.includes('lab') ? 'science' : type.includes('conference') ? 'groups' : 'meeting_room'; }
function resourceTags(resource: Resource) { return resource.description.split(/[,;•]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 4); }
function formatAmount(value: number) { const currency = pricing.value.currency || appConfig.defaultCurrency; return currency ? new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value) : value.toFixed(2); }
function openBooking(resource: Resource) { selectedResource.value = resource; booking.value = { date: today, startTime: startTimeOptions.value[0] || '', endTime: startTimeOptions.value[1] || '', addOns: [] }; bookingDialog.value = true; }

async function loadData() {
  loading.value = true;
  try {
    const [resourcesResponse, pricingResponse] = await Promise.all([api.get<{ resources: Resource[] }>('/resources'), api.get<{ pricing: Pricing }>('/pricing-rules/resources')]);
    resources.value = resourcesResponse.data.resources;
    pricing.value = pricingResponse.data.pricing || {};
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load spaces.';
    $q.notify({ type: 'negative', message });
  } finally { loading.value = false; }
}

async function confirmBooking() {
  if (!selectedResource.value || duration.value <= 0) { $q.notify({ type: 'warning', message: 'Choose an end time after the start time.' }); return; }
  submitting.value = true;
  try {
    await api.post('/bookings', { resource: selectedResource.value.name, resourceId: selectedResource.value.id, date: booking.value.date, time: booking.value.startTime, startTime: booking.value.startTime, endTime: booking.value.endTime, amount: total.value.toFixed(2) });
    $q.notify({ type: 'positive', message: 'Booking confirmed.' });
    bookingDialog.value = false;
    emitDashboardRefresh();
  } catch (error: unknown) {
    const message = typeof error === 'object' && error && 'response' in error ? (error as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
    $q.notify({ type: 'negative', message: message || 'Booking could not be created.' });
  } finally { submitting.value = false; }
}

watch(() => booking.value.startTime, () => { if (!endTimeOptions.value.includes(booking.value.endTime)) booking.value.endTime = endTimeOptions.value[0] || ''; });
onMounted(() => { void loadData(); });
</script>

<style scoped>
.browse-page { min-height: 100%; background: #f7f8fd; color: #12213a; }
.browse-content { max-width: 1120px; margin: 0 auto; padding: 38px 32px 56px; }
.browse-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 34px; }
.browse-header h1 { margin: 0; font-size: clamp(30px, 4vw, 38px); line-height: 1.1; font-weight: 750; letter-spacing: -0.5px; }
.browse-header p { margin: 9px 0 0; color: #586176; font-size: 16px; }
.header-actions { display: flex; gap: 10px; }.header-actions :deep(.q-btn) { border-color: #cbd3e5; border-radius: 8px; color: #1f2d44; }
.filter-panel { margin: -16px 0 28px; border-color: #dce2ef; border-radius: 12px; }.filter-grid { display: grid; grid-template-columns: minmax(240px, 2fr) minmax(180px, 1fr) auto; align-items: center; gap: 16px; }
.spaces-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }.space-card { overflow: hidden; border-color: #c9d1e1; border-radius: 12px; background: #fff; box-shadow: 0 8px 22px rgba(28, 47, 85, 0.05); }
.space-image, .image-placeholder { height: 220px; }.image-placeholder { position: relative; display: grid; place-content: center; justify-items: center; gap: 8px; color: #37517d; background: linear-gradient(135deg, #eaf1ff, #dce6f6); font-weight: 600; }.capacity-badge { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 18px; color: #0d2549; background: rgba(255,255,255,.93); font-size: 13px; font-weight: 600; }
.space-body { padding: 24px; }.space-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }.space-title-row h2 { margin: 3px 0 0; font-size: 25px; line-height: 1.15; }.space-description { min-height: 46px; margin: 16px 0; color: #525c70; font-size: 15px; line-height: 1.5; }.tag-list { display: flex; flex-wrap: wrap; gap: 7px; min-height: 31px; }.tag-list :deep(.q-chip) { margin: 0; padding: 2px 9px; color: #39465c; background: #e9efff; font-size: 12px; }.book-button { width: 100%; min-height: 42px; margin-top: 22px; border-color: #bdc8e0; border-radius: 8px; color: #102039; font-weight: 600; }
.state-panel { display: flex; min-height: 220px; align-items: center; justify-content: center; gap: 12px; color: #687388; font-size: 16px; }.booking-dialog { width: min(520px, calc(100vw - 28px)); overflow: hidden; border-radius: 14px; }.dialog-heading { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; }.dialog-body { padding: 24px; }.selected-resource { display: flex; align-items: center; gap: 16px; padding: 15px; border: 1px solid #b9cef8; border-radius: 10px; background: #eef4ff; }.selected-resource .q-img { width: 64px; height: 64px; border-radius: 8px; }.selected-resource strong { display: block; color: #064bc5; font-size: 20px; }.selected-resource span { display: block; margin-top: 5px; color: #3e4b61; font-size: 14px; }.booking-form { display: grid; gap: 16px; margin-top: 28px; }.form-section-label { color: #3d4658; font-size: 12px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; }.time-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }.addon-options { display: grid; gap: 8px; }.addon-options :deep(.q-checkbox) { width: 100%; margin: 0; padding: 10px 12px; border: 1px solid #d5dceb; border-radius: 8px; }.price-summary { display: grid; gap: 10px; padding-top: 14px; color: #4d586c; }.price-summary > div { display: flex; justify-content: space-between; }.price-summary .total { padding-top: 4px; color: #102039; font-size: 20px; }.confirm-button { min-height: 52px; border-radius: 8px; font-size: 17px; font-weight: 700; }
@media (max-width: 760px) { .browse-content { padding: 26px 16px 40px; }.browse-header { align-items: flex-start; flex-direction: column; margin-bottom: 24px; }.spaces-grid, .filter-grid, .time-fields { grid-template-columns: 1fr; }.header-actions { width: 100%; }.header-actions .q-btn { flex: 1; }.space-image, .image-placeholder { height: 190px; } }
</style>

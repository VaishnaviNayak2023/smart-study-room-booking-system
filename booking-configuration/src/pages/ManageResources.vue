<template>
  <q-page class="portal-page resources-page">
    <div class="page-header">
      <div>
        <h1>Resource Management</h1>
        <p>Manage physical spaces, equipment, and reservable assets.</p>
      </div>
      <q-btn unelevated no-caps icon="add" label="New Resource" class="primary-btn" @click="openCreate" />
    </div>

    <q-card flat bordered class="filter-card">
      <q-card-section class="filter-row">
        <q-input v-model="search" outlined dense clearable placeholder="Filter resources..." style="max-width: 320px">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-select v-model="typeFilter" outlined dense clearable :options="typeFilterOptions" label="Type" style="min-width: 180px" />
        <q-select v-model="statusFilter" outlined dense :options="statusOptions" label="Status" style="min-width: 160px" />
      </q-card-section>
    </q-card>

    <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="32px" /> Loading resources…</div>
    <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="() => loadResources()" /></div>
    <q-card v-else flat bordered class="table-card">
      <div v-if="!pagedRows.length" class="portal-empty">No resources match the current filters.</div>
      <q-table v-else :rows="pagedRows" :columns="columns" row-key="id" flat hide-pagination :pagination="{ rowsPerPage: 0 }">
        <template #body-cell-name="{ row }">
          <q-td>
            <div class="name-cell">
              <div class="resource-icon"><q-icon :name="resourceIcon(row.type)" /></div>
              <div>
                <div class="resource-name">{{ row.name }}</div>
                <div class="resource-id">RES-{{ row.id }}</div>
              </div>
            </div>
          </q-td>
        </template>
        <template #body-cell-status="{ row }">
          <q-td>
            <span class="status-chip" :class="statusChipClass(row)">{{ statusChipLabel(row) }}</span>
          </q-td>
        </template>
        <template #body-cell-actions="{ row }">
          <q-td align="right">
            <q-btn flat round dense icon="edit" @click="openEdit(row)" />
            <q-btn flat round dense icon="delete" color="negative" @click="askDelete(row)" />
          </q-td>
        </template>
      </q-table>
      <div v-if="filteredRows.length" class="pagination-bar">
        <div>Showing {{ pageLabel }} resources</div>
        <div class="page-controls">
          <q-select v-model="rowsPerPage" dense outlined :options="[5, 10, 25, 50, 100]" style="width: 80px" />
          <q-btn flat round dense icon="chevron_left" :disable="page <= 1" @click="page -= 1" />
          <q-btn flat round dense icon="chevron_right" :disable="page >= totalPages" @click="page += 1" />
        </div>
      </div>
    </q-card>

    <ResourceFormDialog v-model="formOpen" :resource="editing" :type-options="typeOptions" @saved="() => loadResources()" />
    <ConfirmDialog v-model="deleteOpen" title="Delete Resource" :message="deleteMessage" confirm-label="Delete" cancel-label="Cancel" icon="warning" variant="danger" :loading="deletingBusy" @confirm="doDelete" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import api from '@/services/api';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import ResourceFormDialog from '@/components/admin/ResourceFormDialog.vue';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import { useSettingsStore } from '@/stores/settings-store';
import type { Resource, ResourceFormData, ResourceType } from '@/types/resources';

const route = useRoute();
const dashboardEvents = useDashboardEvents();
const settingsStore = useSettingsStore();
const loading = ref(true);
const error = ref('');
const resources = ref<Resource[]>([]);
const resourceTypes = ref<ResourceType[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const typeFilter = ref<string | null>(null);
const statusFilter = ref('All Statuses');
const page = ref(1);
const rowsPerPage = ref(10);
const formOpen = ref(false);
const editing = ref<ResourceFormData | null>(null);
const deleteOpen = ref(false);
const deleting = ref<Resource | null>(null);
let availabilityTimer: ReturnType<typeof setInterval> | undefined;
const deletingBusy = ref(false);
const deleteMessage = computed(() =>
  `Are you sure you want to delete "${deleting.value?.name || 'this resource'}"?`,
);

const statusOptions = ['All Statuses', 'Available', 'Booked', 'Unavailable'];
const typeOptions = computed(() => {
  const names = resourceTypes.value.map((t) => t.name).filter(Boolean);
  // Keep edit workable if an older resource references a removed category name.
  const current = editing.value?.type;
  if (current && !names.includes(current)) return [...names, current];
  return names;
});
const typeFilterOptions = computed(() => resourceTypes.value.map((t) => t.name).filter(Boolean));
const typeIconByName = computed(() => {
  const map = new Map<string, string>();
  for (const type of resourceTypes.value) {
    if (type.name) map.set(type.name, type.icon || 'category');
  }
  return map;
});

function statusChipLabel(row: Resource) {
  if (row.inService === false || row.availabilityStatus === 'maintenance') return 'Unavailable';
  if (row.isBooked || row.availabilityStatus === 'booked' || row.availabilityStatus === 'unavailable') {
    return 'Booked';
  }
  return 'Available';
}

function statusChipClass(row: Resource) {
  const label = statusChipLabel(row);
  if (label === 'Available') return 'available';
  if (label === 'Booked') return 'booked';
  return 'maintenance';
}

function matchesStatusFilter(row: Resource) {
  if (statusFilter.value === 'All Statuses') return true;
  return statusChipLabel(row) === statusFilter.value;
}

const columns = [
  { name: 'name', label: 'RESOURCE NAME', field: 'name', align: 'left' as const },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left' as const },
  { name: 'capacity', label: 'CAPACITY', field: (r: Resource) => String(r.capacity), align: 'center' as const },
  { name: 'location', label: 'LOCATION', field: 'location', align: 'left' as const },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' as const },
];

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return resources.value.filter((res) => {
    const matchesSearch = [res.name, res.type, res.location, String(res.id)].join(' ').toLowerCase().includes(q);
    const matchesType = !typeFilter.value || res.type === typeFilter.value;
    const matchesStatus = matchesStatusFilter(res);
    return matchesSearch && matchesType && matchesStatus;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / rowsPerPage.value)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * rowsPerPage.value;
  return filteredRows.value.slice(start, start + rowsPerPage.value);
});
const pageLabel = computed(() => {
  if (!filteredRows.value.length) return '0 to 0 of 0';
  const start = (page.value - 1) * rowsPerPage.value + 1;
  const end = Math.min(page.value * rowsPerPage.value, filteredRows.value.length);
  return `${start} to ${end} of ${filteredRows.value.length}`;
});

function resourceIcon(type: string) {
  return typeIconByName.value.get(type) || 'category';
}

async function loadResourceTypes() {
  const { data } = await api.get<{ resourceTypes: ResourceType[] }>('/resource-types');
  resourceTypes.value = data.resourceTypes || [];
}

async function loadResources(options: { silent?: boolean } = {}) {
  if (!options.silent) {
    loading.value = true;
    error.value = '';
  }
  try {
    const [resourcesRes] = await Promise.all([
      api.get<{ resources: Resource[] }>('/resources'),
      loadResourceTypes(),
    ]);
    resources.value = (resourcesRes.data.resources || []).map((r) => {
      const inService = r.inService ?? true;
      const isBooked = !!r.isBooked;
      const availabilityStatus =
        r.availabilityStatus || (r.available ? 'available' : inService ? 'booked' : 'maintenance');
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: r.capacity,
        location: r.location || '',
        description: r.description || '',
        image: r.image || '',
        inService,
        isBooked,
        availabilityStatus,
        activeBookingId: r.activeBookingId ?? null,
        activeBookingStatus: r.activeBookingStatus ?? null,
        hourlyRate: r.hourlyRate ?? 0,
        currency: r.currency || settingsStore.currencyCode,
        // Effective bookable state from API (in service + not booked).
        available: !!r.available,
      };
    });
  } catch {
    if (!options.silent) error.value = 'Unable to load resources.';
  } finally {
    if (!options.silent) loading.value = false;
  }
}

async function openCreate() {
  editing.value = null;
  try {
    await loadResourceTypes();
  } catch {
    Notify.create({ type: 'negative', message: 'Unable to load resource types.' });
  }
  formOpen.value = true;
}

async function openEdit(row: Resource) {
  editing.value = {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    location: row.location,
    description: row.description,
    // Toggle controls admin maintenance flag, not booking-derived state.
    available: row.inService ?? true,
    image: row.image,
  };
  try {
    await loadResourceTypes();
  } catch {
    Notify.create({ type: 'negative', message: 'Unable to load resource types.' });
  }
  formOpen.value = true;
}

function askDelete(row: Resource) {
  deleting.value = row;
  deleteOpen.value = true;
}

async function doDelete() {
  if (!deleting.value) return;
  deletingBusy.value = true;
  try {
    await api.delete(`/resources/${deleting.value.id}`);
    Notify.create({ type: 'positive', message: 'Resource deleted.' });
    deleteOpen.value = false;
    emitDashboardRefresh();
    await loadResources();
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to delete resource.' });
  } finally {
    deletingBusy.value = false;
  }
}

watch([search, typeFilter, statusFilter, rowsPerPage], () => {
  page.value = 1;
});
watch(
  () => route.query.q,
  (value) => {
    search.value = typeof value === 'string' ? value : '';
  },
);
watch(
  () => route.query.action,
  (value) => {
    if (value === 'new') void openCreate();
  },
);
watch(
  () => dashboardEvents.version,
  () => {
    void loadResources();
  },
);

onMounted(async () => {
  await loadResources();
  if (route.query.action === 'new') void openCreate();
  const editId = route.query.id;
  if (editId) {
    const resource = resources.value.find((row) => String(row.id) === String(editId));
    if (resource) void openEdit(resource);
  }
  // Refresh so expired booking windows free the resource without a manual reload.
  availabilityTimer = setInterval(() => {
    void loadResources({ silent: true });
  }, 60_000);
});

onUnmounted(() => {
  if (availabilityTimer) clearInterval(availabilityTimer);
});

watch(
  () => route.query.id,
  (editId) => {
    if (!editId || !resources.value.length) return;
    const resource = resources.value.find((row) => String(row.id) === String(editId));
    if (resource) void openEdit(resource);
  },
);
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: var(--portal-muted); }
.primary-btn { background: var(--portal-primary); color: var(--portal-on-primary); border-radius: 10px; min-height: 40px; }
.filter-card, .table-card { border-radius: 14px; border-color: var(--portal-border); margin-bottom: 16px; }
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.name-cell { display: flex; gap: 12px; align-items: center; }
.resource-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--portal-primary-soft); color: var(--portal-primary); display: flex; align-items: center; justify-content: center; }
.resource-name { font-weight: 600; }
.resource-id { color: var(--portal-muted); font-size: 11px; margin-top: 2px; }
.status-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status-chip.available { background: var(--portal-status-confirmed-bg); color: var(--portal-status-confirmed-text); }
.status-chip.booked { background: #fee2e2; color: var(--portal-status-unavailable-text); }
.status-chip.maintenance { background: #ffedd5; color: #c2410c; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e5e7eb; color: var(--portal-muted); font-size: 13px; flex-wrap: wrap; gap: 8px; }
.page-controls { display: flex; align-items: center; gap: 8px; }
@media (max-width: 700px) { .page-header { flex-direction: column; } }
</style>

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
    <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="loadResources" /></div>
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
          <q-td><span class="status-chip" :class="row.available ? 'available' : 'maintenance'">{{ row.available ? 'Available' : 'Unavailable' }}</span></q-td>
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

    <ResourceFormDialog v-model="formOpen" :resource="editing" :type-options="typeOptions" @saved="loadResources" />
    <ConfirmDialog v-model="deleteOpen" title="Delete Resource" :message="deleteMessage" confirm-label="Delete" cancel-label="Cancel" icon="warning" variant="danger" :loading="deletingBusy" @confirm="doDelete" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import api from '@/services/api';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import ResourceFormDialog from '@/components/admin/ResourceFormDialog.vue';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';
import type { Resource, ResourceFormData } from '@/types/resources';

const route = useRoute();
const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const resources = ref<Resource[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const typeFilter = ref<string | null>(null);
const statusFilter = ref('All Statuses');
const page = ref(1);
const rowsPerPage = ref(10);
const formOpen = ref(false);
const editing = ref<ResourceFormData | null>(null);
const deleteOpen = ref(false);
const deleting = ref<Resource | null>(null);
const deletingBusy = ref(false);
const deleteMessage = computed(() =>
  `Are you sure you want to delete "${deleting.value?.name || 'this resource'}"?`,
);

const statusOptions = ['All Statuses', 'Available', 'Unavailable'];
const typeOptions = computed(() => [...new Set(resources.value.map((r) => r.type).filter(Boolean))]);
const typeFilterOptions = computed(() => typeOptions.value);

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
    const matchesStatus =
      statusFilter.value === 'All Statuses' ||
      (statusFilter.value === 'Available' ? res.available : !res.available);
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
  const t = type.toLowerCase();
  if (t.includes('lab')) return 'science';
  if (t.includes('transport') || t.includes('vehicle')) return 'directions_car';
  if (t.includes('equipment') || t.includes('av')) return 'videocam';
  return 'meeting_room';
}

async function loadResources() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ resources: Resource[] }>('/resources');
    resources.value = data.resources.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      capacity: r.capacity,
      location: r.location || '',
      description: r.description || '',
      available: r.available,
      image: r.image || '',
    }));
  } catch {
    error.value = 'Unable to load resources.';
  } finally {
    loading.value = false;
  }
}

function openCreate() { editing.value = null; formOpen.value = true; }
function openEdit(row: Resource) { editing.value = { ...row }; formOpen.value = true; }
function askDelete(row: Resource) { deleting.value = row; deleteOpen.value = true; }

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

watch([search, typeFilter, statusFilter, rowsPerPage], () => { page.value = 1; });
watch(() => route.query.q, (value) => { search.value = typeof value === 'string' ? value : ''; });
watch(() => route.query.action, (value) => { if (value === 'new') openCreate(); });
watch(() => dashboardEvents.version, () => { void loadResources(); });

onMounted(() => { void loadResources(); if (route.query.action === 'new') openCreate(); });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.primary-btn { background: #1e3a8a; color: #fff; border-radius: 10px; min-height: 40px; }
.filter-card, .table-card { border-radius: 14px; border-color: #e5e7eb; margin-bottom: 16px; }
.filter-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.name-cell { display: flex; gap: 12px; align-items: center; }
.resource-icon { width: 36px; height: 36px; border-radius: 10px; background: #eef2ff; color: #1e3a8a; display: flex; align-items: center; justify-content: center; }
.resource-name { font-weight: 600; }
.resource-id { color: #64748b; font-size: 11px; margin-top: 2px; }
.status-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.status-chip.available { background: #dcfce7; color: #15803d; }
.status-chip.maintenance { background: #fee2e2; color: #b91c1c; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 13px; flex-wrap: wrap; gap: 8px; }
.page-controls { display: flex; align-items: center; gap: 8px; }
@media (max-width: 700px) { .page-header { flex-direction: column; } }
</style>

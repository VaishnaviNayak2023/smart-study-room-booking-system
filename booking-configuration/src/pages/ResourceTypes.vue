<template>
  <q-page class="portal-page resource-types-page">
    <div class="page-header">
      <div>
        <h1>Resource Categories</h1>
        <p>Manage the organizational structure and base properties for all bookable assets.</p>
      </div>
      <q-input v-model="search" outlined dense clearable placeholder="Search categories..." style="max-width: 280px">
        <template #prepend><q-icon name="search" /></template>
      </q-input>
    </div>

    <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="32px" /> Loading categories…</div>
    <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="loadTypes" /></div>
    <div v-else class="types-grid">
      <q-card v-for="type in filteredTypes" :key="type.id" flat bordered class="type-card">
        <q-card-section>
          <div class="type-top">
            <div class="type-icon" :class="`type-icon-${type.color}`"><q-icon :name="type.icon" size="20px" /></div>
            <q-btn flat round dense icon="edit" @click="openEdit(type)" />
          </div>
          <div class="type-name">{{ type.name }}</div>
          <div class="type-description">{{ type.description || 'No description provided.' }}</div>
          <q-separator class="q-my-md" />
          <div class="type-footer">
            <div>
              <div class="type-count">{{ type.resources }}</div>
              <div class="type-count-label">Active Resources</div>
            </div>
            <span class="status-dot active">Active</span>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered class="type-card add-card" clickable @click="openCreate">
        <q-card-section class="add-body">
          <div class="add-icon"><q-icon name="add" size="28px" /></div>
          <div class="add-title">Add New Category</div>
          <div class="add-sub">Create a new organizational bucket for your resources.</div>
        </q-card-section>
      </q-card>
    </div>

    <ResourceTypeFormDialog v-model="formOpen" :resource-type="editing" @saved="loadTypes" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import ResourceTypeFormDialog from '@/components/admin/ResourceTypeFormDialog.vue';
import { useDashboardEvents } from '@/stores/dashboard-events';
import type { ResourceType, ResourceTypeFormData } from '@/types/resources';

const route = useRoute();
const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const resourceTypes = ref<ResourceType[]>([]);
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const formOpen = ref(false);
const editing = ref<ResourceTypeFormData | null>(null);

const filteredTypes = computed(() => {
  const q = search.value.trim().toLowerCase();
  return resourceTypes.value.filter((type) =>
    [type.name, type.description].join(' ').toLowerCase().includes(q),
  );
});

async function loadTypes() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ resourceTypes: ResourceType[] }>('/resource-types');
    resourceTypes.value = data.resourceTypes || [];
  } catch {
    error.value = 'Unable to load resource categories.';
  } finally {
    loading.value = false;
  }
}

function openCreate() { editing.value = null; formOpen.value = true; }
function openEdit(type: ResourceType) { editing.value = { id: type.id, name: type.name, description: type.description, icon: type.icon, color: type.color }; formOpen.value = true; }

watch(() => route.query.q, (value) => { search.value = typeof value === 'string' ? value : ''; });
watch(() => dashboardEvents.version, () => { void loadTypes(); });
onMounted(() => { void loadTypes(); });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: #64748b; max-width: 560px; }
.types-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.type-card { border-radius: 14px; border-color: #e5e7eb; min-height: 220px; }
.type-top { display: flex; justify-content: space-between; align-items: flex-start; }
.type-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #eef2ff; color: #1e3a8a; }
.type-icon-purple { background: #ede9fe; color: #6d28d9; }
.type-icon-green { background: #dcfce7; color: #15803d; }
.type-icon-orange { background: #ffedd5; color: #c2410c; }
.type-name { margin-top: 12px; font-size: 16px; font-weight: 700; }
.type-description { margin-top: 6px; color: #64748b; font-size: 13px; line-height: 1.45; min-height: 40px; }
.type-footer { display: flex; justify-content: space-between; align-items: flex-end; }
.type-count { font-size: 24px; font-weight: 700; }
.type-count-label { color: #64748b; font-size: 12px; }
.status-dot { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; }
.add-card { border-style: dashed; background: #fafafa; }
.add-body { height: 100%; min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 8px; }
.add-icon { width: 48px; height: 48px; border-radius: 50%; background: #eef2ff; color: #1e3a8a; display: flex; align-items: center; justify-content: center; }
.add-title { font-weight: 700; }
.add-sub { color: #64748b; font-size: 13px; max-width: 220px; }
@media (max-width: 1000px) { .types-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .types-grid { grid-template-columns: 1fr; } }
</style>

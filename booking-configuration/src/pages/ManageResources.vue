<template>
  <q-page class="manage-resources-page">
    <div class="mr-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Manage Resources</div>
          <div class="page-subtitle">Add, edit, and manage bookable resources.</div>
        </div>

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Add Resource"
          @click="addResource"
        />
      </div>

      <!-- Toolbar -->
      <q-card flat bordered class="toolbar-card q-mb-md">
        <q-card-section class="toolbar-section">
          <q-input
            dense
            outlined
            v-model="search"
            placeholder="Search resources..."
            debounce="300"
            style="width: 260px"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>

          <q-select
            dense
            outlined
            v-model="typeFilter"
            :options="['All Types', 'Study Room', 'Conference Room', 'Lab', 'Equipment']"
            style="min-width: 180px"
          />
        </q-card-section>
      </q-card>

      <!-- Table -->
      <q-card flat bordered class="table-card">
        <q-table
          :rows="filteredResources()"
          :columns="columns"
          row-key="id"
          flat
          dense
          class="resources-table"
        >
          <template v-slot:body-cell-status="{ row }">
            <q-td align="center">
              <q-chip dense :color="row.available ? 'green' : 'grey-5'" text-color="white" outline>
                {{ row.available ? 'Available' : 'Unavailable' }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="{ row }">
            <q-td align="right">
              <q-btn flat round dense icon="edit" color="primary" @click="editResource(row)" />
              <q-btn flat round dense icon="delete" color="negative" @click="deleteResource(row)" />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type Resource = {
  id: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  available: boolean;
};

type TableColumn = {
  name: string;
  label: string;
  field: string | ((row: Resource) => string);
  align?: 'left' | 'right' | 'center';
};

const search = ref('');
const typeFilter = ref('All Types');

const resources = ref<Resource[]>([]);

const columns: TableColumn[] = [
  { name: 'id', label: 'ID', field: (row: Resource) => String(row.id), align: 'left' },
  { name: 'name', label: 'NAME', field: 'name', align: 'left' },
  { name: 'type', label: 'TYPE', field: 'type', align: 'left' },
  {
    name: 'capacity',
    label: 'CAPACITY',
    field: (row: Resource) => String(row.capacity),
    align: 'center',
  },
  { name: 'location', label: 'LOCATION', field: 'location', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' },
];

function filteredResources() {
  return resources.value.filter((res) => {
    const matchesSearch = [res.name, res.type, res.location]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase());

    const matchesType = typeFilter.value === 'All Types' || typeFilter.value === res.type;

    return matchesSearch && matchesType;
  });
}

const loadResources = async () => {
  try {
    const { data } = await api.get<{ resources: Resource[] }>('/resources');
    resources.value = data.resources;
  } catch (error) {
    console.error('Failed to load resources', error);
  }
};

function addResource() {
  const name = window.prompt('Resource name');
  if (!name) return;
  const type = window.prompt('Type', 'Study Room') || 'Study Room';
  const capacity = Number(window.prompt('Capacity', '4')) || 1;
  const location = window.prompt('Location', '') || '';
  void api
    .post('/resources', { name, type, capacity, location, available: true, image: '' })
    .then(() => {
      Notify.create({ type: 'positive', message: 'Resource added.' });
      void loadResources();
    })
    .catch((error) => {
      console.error('Add failed', error);
      Notify.create({ type: 'negative', message: 'Failed to add resource.' });
    });
}

function editResource(res: Resource) {
  const name = window.prompt('Resource name', res.name);
  if (!name) return;
  const capacity = Number(window.prompt('Capacity', String(res.capacity))) || res.capacity;
  const available = window.confirm(`Is "${name}" available?`);
  void api
    .put(`/resources/${res.id}`, { name, capacity, available })
    .then(() => {
      Notify.create({ type: 'positive', message: `Updated ${name}.` });
      void loadResources();
    })
    .catch((error) => {
      console.error('Update failed', error);
      Notify.create({ type: 'negative', message: 'Failed to update resource.' });
    });
}

function deleteResource(res: Resource) {
  void api
    .delete(`/resources/${res.id}`)
    .then(() => {
      Notify.create({ type: 'negative', message: `Deleted ${res.name}` });
      void loadResources();
    })
    .catch((error) => {
      console.error('Delete failed', error);
      Notify.create({ type: 'negative', message: 'Failed to delete resource.' });
    });
}

onMounted(() => {
  void loadResources();
});

</script>

<style scoped>
.manage-resources-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.mr-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.page-subtitle {
  margin-top: 4px;
  color: #73798b;
  font-size: 11px;
}

.toolbar-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.table-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.resources-table {
  font-size: 12px;
}
</style>

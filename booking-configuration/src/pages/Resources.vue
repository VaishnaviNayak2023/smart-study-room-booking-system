<template>
  <q-page class="resources-page">
    <div class="resources-container">
      <!-- =====================================================
           PAGE HEADER
           ===================================================== -->

      <div class="page-header">
        <div>
          <h1>Manage Resources</h1>

          <p>Add, edit or remove resources</p>
        </div>

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Add Resource"
          class="add-resource-btn"
          @click="goToAddResource"
        />
      </div>

      <!-- =====================================================
           RESOURCE TABLE
           ===================================================== -->

      <q-card flat bordered class="resources-card">
        <q-table
          :rows="resources"
          :columns="columns"
          row-key="id"
          flat
          hide-pagination
          :rows-per-page-options="[0]"
          class="resources-table"
        >
          <!-- NAME -->

          <template #body-cell-name="props">
            <q-td :props="props">
              <span class="resource-name">
                {{ props.row.name }}
              </span>
            </q-td>
          </template>

          <!-- TYPE -->

          <template #body-cell-type="props">
            <q-td :props="props">
              <span class="resource-type">
                {{ props.row.type }}
              </span>
            </q-td>
          </template>

          <!-- CAPACITY -->

          <template #body-cell-capacity="props">
            <q-td :props="props">
              <span class="capacity-value">
                {{ props.row.capacity }}
              </span>
            </q-td>
          </template>

          <!-- STATUS -->

          <template #body-cell-status="props">
            <q-td :props="props">
              <q-badge v-if="props.row.active" class="status-active"> Active </q-badge>

              <q-badge v-else class="status-inactive"> Inactive </q-badge>
            </q-td>
          </template>

          <!-- ACTIONS -->

          <template #body-cell-actions="props">
            <q-td :props="props" class="actions-cell">
              <q-btn
                flat
                round
                dense
                icon="edit"
                class="action-btn edit-action"
                @click="editResource(props.row)"
              >
                <q-tooltip> Edit Resource </q-tooltip>
              </q-btn>

              <q-btn
                flat
                round
                dense
                icon="delete_outline"
                class="action-btn delete-action"
                @click="deleteResource(props.row)"
              >
                <q-tooltip> Delete Resource </q-tooltip>
              </q-btn>
            </q-td>
          </template>

          <!-- EMPTY STATE -->

          <template #no-data>
            <div class="empty-state">
              <q-icon name="inventory_2" size="34px" />

              <div class="empty-title">No resources found</div>

              <div class="empty-description">Add a resource to get started.</div>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { useRouter } from 'vue-router';

import { useQuasar } from 'quasar';
import api from '@/services/api';

/* ==========================================================
   TYPES
   ========================================================== */

interface Resource {
  id: number;
  name: string;
  type: string;
  capacity: number;
  location: string;
  description: string;
  active: boolean;
}

interface TableColumn {
  name: string;
  label: string;
  field: string;
  align: 'left' | 'right' | 'center';
  sortable?: boolean;
}

/* ==========================================================
   ROUTER / QUASAR
   ========================================================== */

const router = useRouter();

const $q = useQuasar();

/* ==========================================================
   STORAGE
   ========================================================== */

/* ==========================================================
   TABLE COLUMNS
   ========================================================== */

const columns: TableColumn[] = [
  {
    name: 'name',

    label: 'Name',

    field: 'name',

    align: 'left',

    sortable: true,
  },

  {
    name: 'type',

    label: 'Type',

    field: 'type',

    align: 'left',

    sortable: true,
  },

  {
    name: 'capacity',

    label: 'Capacity',

    field: 'capacity',

    align: 'left',

    sortable: true,
  },

  {
    name: 'status',

    label: 'Status',

    field: 'active',

    align: 'left',
  },

  {
    name: 'actions',

    label: 'Actions',

    field: 'actions',

    align: 'right',
  },
];

/* ==========================================================
   RESOURCES
   ========================================================== */

const resources = ref<Resource[]>([]);

/* ==========================================================
   LOAD RESOURCES
   ========================================================== */

const loadResources = async () => {
  try {
    const { data } = await api.get<{ resources?: Resource[] }>('/resources');
    resources.value = data.resources || [];
  } catch (error) {
    console.error('Unable to load resources:', error);
    resources.value = [];
  }
};

/* ==========================================================
   ADD RESOURCE
   ========================================================== */

const goToAddResource = () => {
  void router.push('/manage-resources');
};

/* ==========================================================
   EDIT RESOURCE
   ========================================================== */

const editResource = (resource: Resource) => {
  void router.push({
    path: '/manage-resources',
    query: { id: String(resource.id) },
  });
};

/* ==========================================================
   DELETE RESOURCE
   ========================================================== */

const deleteResource = (resource: Resource) => {
  $q.dialog({
    title: 'Delete Resource',

    message: `Are you sure you want to delete "${resource.name}"?`,

    persistent: true,

    cancel: {
      label: 'Cancel',
      flat: true,
    },

    ok: {
      label: 'Delete',
      color: 'negative',
      unelevated: true,
    },
  }).onOk(() => {
    void removeResource(resource);
  });
};

const removeResource = async (resource: Resource) => {
    try {
      await api.delete(`/resources/${resource.id}`);
      resources.value = resources.value.filter((item) => item.id !== resource.id);

      $q.notify({
        type: 'positive',
        message: 'Resource deleted successfully.',
        position: 'top',
      });
    } catch (error) {
      console.error('Delete resource failed:', error);
      $q.notify({
        type: 'negative',
        message: 'Failed to delete the resource.',
        position: 'top',
      });
    }
};

/* ==========================================================
   INITIALIZE
   ========================================================== */

onMounted(() => {
  void loadResources();
});
</script>

<style scoped>
/* ==========================================================
   PAGE
   ========================================================== */

.resources-page {
  min-height: 100%;
  background: var(--portal-muted-bg);
  color: var(--portal-text);
}

/* ==========================================================
   CONTAINER
   ========================================================== */

.resources-container {
  min-height: calc(100vh - 40px);
  padding: 22px 20px;
}

/* ==========================================================
   HEADER
   ========================================================== */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-header h1 {
  margin: 0;
  color: var(--portal-text);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.page-header p {
  margin: 4px 0 0;
  color: var(--portal-muted);
  font-size: 9px;
}

/* ==========================================================
   ADD BUTTON
   ========================================================== */

.add-resource-btn {
  min-height: 30px;
  height: 30px;
  padding: 0 14px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 600;
}

/* ==========================================================
   CARD
   ========================================================== */

.resources-card {
  overflow: hidden;
  border: 1px solid #d5dae6;
  border-radius: 7px;
  background: var(--portal-card);
}

/* ==========================================================
   TABLE
   ========================================================== */

.resources-table {
  color: var(--portal-text);
}

.resources-table :deep(thead tr) {
  height: 34px;
  background: var(--portal-muted-bg);
}

.resources-table :deep(th) {
  padding: 0 11px;
  color: var(--portal-text-secondary);
  border-bottom: 1px solid #d9deea;
  font-size: 7px;
  font-weight: 600;
}

.resources-table :deep(tbody tr) {
  height: 39px;
  background: var(--portal-card);
}

.resources-table :deep(tbody tr:hover) {
  background: var(--portal-muted-bg);
}

.resources-table :deep(td) {
  padding: 0 11px;
  color: var(--portal-text);
  border-bottom: 1px solid #e0e3eb;
  font-size: 8px;
}

/* ==========================================================
   TABLE CONTENT
   ========================================================== */

.resource-name {
  color: var(--portal-text);
  font-size: 8px;
  font-weight: 500;
}

.resource-type {
  color: var(--portal-muted);
  font-size: 8px;
}

.capacity-value {
  color: var(--portal-text-secondary);
  font-size: 8px;
}

/* ==========================================================
   STATUS
   ========================================================== */

.status-active {
  padding: 3px 7px;
  border-radius: 10px;
  color: var(--portal-on-primary);
  background: #07966c;
  font-size: 6px;
  font-weight: 650;
}

.status-inactive {
  padding: 3px 7px;
  border-radius: 10px;
  color: #a03f3f;
  background: #ffe1df;
  font-size: 6px;
  font-weight: 650;
}

/* ==========================================================
   ACTIONS
   ========================================================== */

.actions-cell {
  white-space: nowrap;
}

.action-btn {
  width: 24px;

  height: 24px;

  color: var(--portal-text);
}

.edit-action:hover {
  color: #5157e8;
}

.delete-action:hover {
  color: #d9374b;
}

/* ==========================================================
   EMPTY
   ========================================================== */

.empty-state {
  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  width: 100%;

  min-height: 250px;

  color: var(--portal-muted);
}

.empty-title {
  margin-top: 8px;

  color: var(--portal-muted);

  font-size: 10px;

  font-weight: 600;
}

.empty-description {
  margin-top: 3px;

  font-size: 8px;
}

/* ==========================================================
   RESPONSIVE
   ========================================================== */

@media (max-width: 700px) {
  .resources-container {
    padding: 15px 10px;
  }

  .page-header {
    align-items: flex-start;

    flex-direction: column;

    gap: 12px;
  }

  .add-resource-btn {
    align-self: flex-end;
  }

  .resources-card {
    overflow-x: auto;
  }

  .resources-table {
    min-width: 600px;
  }
}
</style>

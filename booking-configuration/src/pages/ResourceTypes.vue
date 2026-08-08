<template>
  <q-page class="resource-types-page">
    <div class="rt-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Resource Types</div>
          <div class="page-subtitle">Categorize the types of bookable resources.</div>
        </div>

        <q-btn unelevated no-caps color="primary" icon="add" label="New Type" @click="addType" />
      </div>

      <!-- Cards -->
      <div class="row q-col-gutter-md">
        <div v-for="type in resourceTypes" :key="type.id" class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="type-card">
            <q-card-section class="type-card-section">
              <div class="type-icon" :class="`type-icon-${type.color}`">
                <q-icon :name="type.icon" size="22px" />
              </div>

              <div class="type-name">{{ type.name }}</div>
              <div class="type-count">{{ type.resources }} resources</div>

              <q-separator class="q-my-sm" />

              <div class="type-description">
                {{ type.description }}
              </div>

              <div class="type-actions q-mt-sm">
                <q-btn flat dense round icon="edit" size="sm" @click="editType(type)" />
                <q-btn
                  flat
                  dense
                  round
                  icon="delete"
                  color="negative"
                  size="sm"
                  @click="deleteType(type)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type ResourceType = {
  id: number;
  name: string;
  icon: string;
  color: string;
  resources: number;
  description: string;
};

const resourceTypes = ref<ResourceType[]>([]);

const loadTypes = async () => {
  try {
    const { data } = await api.get<{ resourceTypes: ResourceType[] }>('/resource-types');
    resourceTypes.value = data.resourceTypes;
  } catch (error) {
    console.error('Failed to load resource types', error);
  }
};

function addType() {
  const name = window.prompt('Type name');
  if (!name) return;
  const description = window.prompt('Description', '') || '';
  void api
    .post('/resource-types', { name, description })
    .then(() => {
      Notify.create({ type: 'positive', message: 'Type added.' });
      void loadTypes();
    })
    .catch((error) => {
      console.error('Add failed', error);
      Notify.create({ type: 'negative', message: 'Failed to add type.' });
    });
}

function editType(type: ResourceType) {
  const name = window.prompt('Type name', type.name);
  if (!name) return;
  const description = window.prompt('Description', type.description) || '';
  void api
    .put(`/resource-types/${type.id}`, { name, description })
    .then(() => {
      Notify.create({ type: 'positive', message: `Updated ${name}.` });
      void loadTypes();
    })
    .catch((error) => {
      console.error('Update failed', error);
      Notify.create({ type: 'negative', message: 'Failed to update type.' });
    });
}

function deleteType(type: ResourceType) {
  void api
    .delete(`/resource-types/${type.id}`)
    .then(() => {
      Notify.create({ type: 'negative', message: `Deleted ${type.name}` });
      void loadTypes();
    })
    .catch((error) => {
      console.error('Delete failed', error);
      Notify.create({ type: 'negative', message: 'Failed to delete type.' });
    });
}

onMounted(() => {
  void loadTypes();
});

</script>

<style scoped>
.resource-types-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.rt-container {
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

.type-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
  height: 100%;
}

.type-card-section {
  padding: 18px;
}

.type-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.type-icon-purple {
  color: #5753e8;
  background: #e8e9ff;
}

.type-icon-blue {
  color: #3b82f6;
  background: #e0edff;
}

.type-icon-green {
  color: #168c70;
  background: #ddf4eb;
}

.type-icon-orange {
  color: #e07a2f;
  background: #fff0e0;
}

.type-icon-red {
  color: #e04545;
  background: #ffe6e6;
}

.type-icon-teal {
  color: #0d9488;
  background: #d9f3f0;
}

.type-name {
  margin-top: 12px;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.type-count {
  margin-top: 3px;
  color: #73798b;
  font-size: 10px;
}

.type-description {
  color: #5b6377;
  font-size: 10px;
  line-height: 1.4;
}

.type-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}
</style>

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
import { ref } from 'vue';
import { Notify } from 'quasar';

type ResourceType = {
  id: number;
  name: string;
  icon: string;
  color: string;
  resources: number;
  description: string;
};

const resourceTypes = ref<ResourceType[]>([
  {
    id: 1,
    name: 'Study Rooms',
    icon: 'meeting_room',
    color: 'purple',
    resources: 12,
    description: 'Quiet study spaces for individual and group work.',
  },
  {
    id: 2,
    name: 'Conference Rooms',
    icon: 'groups',
    color: 'blue',
    resources: 4,
    description: 'Meeting rooms equipped for presentations and calls.',
  },
  {
    id: 3,
    name: 'Labs',
    icon: 'science',
    color: 'green',
    resources: 6,
    description: 'Equipped laboratories for academic and research use.',
  },
  {
    id: 4,
    name: 'Equipment',
    icon: 'developer_board',
    color: 'orange',
    resources: 8,
    description: 'Specialized equipment available for booking.',
  },
  {
    id: 5,
    name: 'Auditoriums',
    icon: 'theaters',
    color: 'red',
    resources: 2,
    description: 'Large venues for events, seminars, and workshops.',
  },
  {
    id: 6,
    name: 'Outdoor Spaces',
    icon: 'park',
    color: 'teal',
    resources: 5,
    description: 'Open-air areas for gatherings and activities.',
  },
]);

function addType() {
  Notify.create({ type: 'info', message: 'Add a new resource type.' });
}

function editType(type: ResourceType) {
  Notify.create({ type: 'info', message: `Editing ${type.name}` });
}

function deleteType(type: ResourceType) {
  Notify.create({ type: 'negative', message: `Delete ${type.name}` });
}
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

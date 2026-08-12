<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="form-dialog">
      <q-card-section class="row items-center justify-between">
        <div class="dialog-title">{{ isEdit ? 'Edit Resource' : 'Add Resource' }}</div>
        <q-btn flat round dense icon="close" @click="emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="submit">
          <q-input v-model="form.name" outlined dense label="Resource Name" :rules="[(v) => !!v || 'Required']" />
          <q-select
            v-model="form.type"
            outlined
            dense
            label="Type"
            :options="typeOptions"
            :disable="!typeOptions.length"
            :hint="
              typeOptions.length
                ? 'Select a category from Resource Types'
                : 'No resource types yet — create one under Resource Types first'
            "
            :rules="[(v) => !!v || 'Select a resource type']"
          />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input
                v-model.number="form.capacity"
                outlined
                dense
                type="number"
                min="1"
                label="Capacity"
                :rules="[(v) => v > 0 || 'Must be at least 1']"
              />
            </div>
            <div class="col-6">
              <q-select
                v-model="serviceStatus"
                outlined
                dense
                label="Status"
                :options="serviceStatusOptions"
                emit-value
                map-options
                :rules="[(v) => !!v || 'Status is required']"
                hint="Unavailable = offline / maintenance"
              />
            </div>
          </div>
          <q-input v-model="form.location" outlined dense label="Location" />
          <q-input v-model="form.description" outlined dense type="textarea" autogrow label="Description" />
          <q-input v-model="form.image" outlined dense label="Image URL" />
          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps label="Cancel" @click="emit('update:modelValue', false)" />
            <q-btn
              unelevated
              no-caps
              color="primary"
              type="submit"
              :label="isEdit ? 'Save Changes' : 'Create Resource'"
              :loading="saving"
              :disable="!typeOptions.length"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/stores/dashboard-events';
import type { ResourceFormData } from '@/types/resources';

const props = defineProps<{
  modelValue: boolean;
  resource: ResourceFormData | null;
  typeOptions: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const saving = ref(false);
const serviceStatusOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Unavailable', value: 'unavailable' },
];
const serviceStatus = ref<'available' | 'unavailable'>('available');

const form = reactive<ResourceFormData>({
  name: '',
  type: '',
  capacity: 1,
  location: '',
  description: '',
  available: true,
  image: '',
});

const isEdit = computed(() => !!props.resource?.id);

function resetForm() {
  form.name = '';
  form.type = props.typeOptions[0] || '';
  form.capacity = 1;
  form.location = '';
  form.description = '';
  form.available = true;
  form.image = '';
  serviceStatus.value = 'available';
}

function applyResource(resource: ResourceFormData) {
  form.name = resource.name;
  form.type = resource.type;
  form.capacity = resource.capacity;
  form.location = resource.location;
  form.description = resource.description;
  form.available = resource.available !== false;
  form.image = resource.image;
  serviceStatus.value = form.available ? 'available' : 'unavailable';
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (!props.resource) {
      resetForm();
      return;
    }
    applyResource(props.resource);
  },
);

watch(
  () => props.resource,
  (resource) => {
    if (!props.modelValue) return;
    if (!resource) {
      resetForm();
      return;
    }
    applyResource(resource);
  },
);

watch(serviceStatus, (value) => {
  form.available = value === 'available';
});

async function submit() {
  if (!form.type) {
    Notify.create({ type: 'warning', message: 'Select a resource type.' });
    return;
  }
  form.available = serviceStatus.value === 'available';
  saving.value = true;
  try {
    const payload = {
      name: form.name,
      type: form.type,
      capacity: form.capacity,
      location: form.location,
      description: form.description,
      image: form.image,
      available: form.available,
    };
    if (isEdit.value && props.resource?.id) {
      await api.put(`/resources/${props.resource.id}`, payload);
      Notify.create({ type: 'positive', message: 'Resource updated.' });
    } else {
      await api.post('/resources', payload);
      Notify.create({ type: 'positive', message: 'Resource created.' });
    }
    emitDashboardRefresh();
    emit('saved');
    emit('update:modelValue', false);
  } catch (err) {
    const ax = err as { response?: { data?: { message?: string } } };
    Notify.create({
      type: 'negative',
      message: ax.response?.data?.message || 'Failed to save resource.',
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-dialog {
  width: min(520px, 94vw);
  border-radius: 14px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 700;
}
</style>

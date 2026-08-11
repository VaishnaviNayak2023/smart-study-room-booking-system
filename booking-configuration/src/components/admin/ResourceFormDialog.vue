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
            use-input
            new-value-mode="add-unique"
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
              <q-toggle v-model="form.available" label="Available" color="primary" />
            </div>
          </div>
          <q-input v-model="form.location" outlined dense label="Location" />
          <q-input v-model="form.description" outlined dense type="textarea" autogrow label="Description" />
          <q-input v-model="form.image" outlined dense label="Image URL" />
          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps label="Cancel" @click="emit('update:modelValue', false)" />
            <q-btn unelevated no-caps color="primary" type="submit" :label="isEdit ? 'Save Changes' : 'Create Resource'" :loading="saving" />
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

watch(
  () => props.resource,
  (resource) => {
    if (!resource) {
      form.name = '';
      form.type = props.typeOptions[0] || '';
      form.capacity = 1;
      form.location = '';
      form.description = '';
      form.available = true;
      form.image = '';
      return;
    }
    form.name = resource.name;
    form.type = resource.type;
    form.capacity = resource.capacity;
    form.location = resource.location;
    form.description = resource.description;
    form.available = resource.available;
    form.image = resource.image;
  },
  { immediate: true },
);

async function submit() {
  saving.value = true;
  try {
    if (isEdit.value && props.resource?.id) {
      await api.put(`/resources/${props.resource.id}`, { ...form });
      Notify.create({ type: 'positive', message: 'Resource updated.' });
    } else {
      await api.post('/resources', { ...form });
      Notify.create({ type: 'positive', message: 'Resource created.' });
    }
    emitDashboardRefresh();
    emit('saved');
    emit('update:modelValue', false);
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to save resource.' });
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

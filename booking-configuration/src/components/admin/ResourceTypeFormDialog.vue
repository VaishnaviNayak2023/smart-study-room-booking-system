<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="form-dialog">
      <q-card-section class="row items-center justify-between">
        <div class="dialog-title">{{ isEdit ? 'Edit Category' : 'Add New Category' }}</div>
        <q-btn flat round dense icon="close" @click="emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="submit">
          <q-input v-model="form.name" outlined dense label="Category Name" :rules="[(v) => !!v || 'Required']" />
          <q-input v-model="form.description" outlined dense type="textarea" autogrow label="Description" />
          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-input v-model="form.icon" outlined dense label="Icon name" hint="Material icon name" />
            </div>
            <div class="col-6">
              <q-select
                v-model="form.color"
                outlined
                dense
                label="Color"
                :options="colorOptions"
                emit-value
                map-options
              />
            </div>
          </div>
          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps label="Cancel" @click="emit('update:modelValue', false)" />
            <q-btn unelevated no-caps color="primary" type="submit" :label="isEdit ? 'Save Changes' : 'Create Category'" :loading="saving" />
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
import type { ResourceTypeFormData } from '@/types/resources';

const props = defineProps<{
  modelValue: boolean;
  resourceType: ResourceTypeFormData | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const colorOptions = [
  { label: 'Blue', value: 'blue' },
  { label: 'Purple', value: 'purple' },
  { label: 'Green', value: 'green' },
  { label: 'Orange', value: 'orange' },
  { label: 'Grey', value: 'grey' },
];

const saving = ref(false);
const form = reactive<ResourceTypeFormData>({
  name: '',
  description: '',
  icon: 'meeting_room',
  color: 'blue',
});

const isEdit = computed(() => !!props.resourceType?.id);

watch(
  () => props.resourceType,
  (type) => {
    if (!type) {
      form.name = '';
      form.description = '';
      form.icon = 'meeting_room';
      form.color = 'blue';
      return;
    }
    form.name = type.name;
    form.description = type.description;
    form.icon = type.icon;
    form.color = type.color;
  },
  { immediate: true },
);

async function submit() {
  saving.value = true;
  try {
    if (isEdit.value && props.resourceType?.id) {
      await api.put(`/resource-types/${props.resourceType.id}`, { ...form });
      Notify.create({ type: 'positive', message: 'Category updated.' });
    } else {
      await api.post('/resource-types', { ...form });
      Notify.create({ type: 'positive', message: 'Category created.' });
    }
    emitDashboardRefresh();
    emit('saved');
    emit('update:modelValue', false);
  } catch {
    Notify.create({ type: 'negative', message: 'Failed to save category.' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.form-dialog {
  width: min(480px, 94vw);
  border-radius: 14px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 700;
}
</style>

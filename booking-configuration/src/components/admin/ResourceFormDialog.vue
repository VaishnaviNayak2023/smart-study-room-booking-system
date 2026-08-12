<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="form-dialog">
      <q-card-section class="dialog-header">
        <div class="dialog-title">{{ isEdit ? 'Edit Resource' : 'Add Resource' }}</div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="emit('update:modelValue', false)" />
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-body">
        <q-form class="resource-form" @submit.prevent="submit">
          <div class="field">
            <label class="field-label" for="resource-name">Resource Name</label>
            <q-input
              id="resource-name"
              v-model="form.name"
              outlined
              dense
              hide-bottom-space
              placeholder="e.g. Meeting Room A101"
              :rules="[(v) => !!v || 'Required']"
            />
          </div>

          <div class="field">
            <label class="field-label" for="resource-type">Type</label>
            <q-select
              id="resource-type"
              v-model="form.type"
              outlined
              dense
              hide-bottom-space
              :options="typeOptions"
              :disable="!typeOptions.length"
              :rules="[(v) => !!v || 'Select a resource type']"
            />
            <div class="field-hint">
              {{
                typeOptions.length
                  ? 'Select a category from Resource Types'
                  : 'No resource types yet — create one under Resource Types first'
              }}
            </div>
          </div>

          <div class="field-grid">
            <div class="field">
              <label class="field-label" for="resource-capacity">Capacity</label>
              <q-input
                id="resource-capacity"
                v-model.number="form.capacity"
                outlined
                dense
                hide-bottom-space
                type="number"
                min="1"
                :rules="[(v) => v > 0 || 'Must be at least 1']"
              />
            </div>
            <div class="field">
              <label class="field-label" for="resource-status">Status</label>
              <q-select
                id="resource-status"
                v-model="serviceStatus"
                outlined
                dense
                hide-bottom-space
                :options="serviceStatusOptions"
                emit-value
                map-options
                :rules="[(v) => !!v || 'Status is required']"
              />
              <div class="field-hint">Unavailable = offline / maintenance</div>
            </div>
          </div>

          <div class="field">
            <label class="field-label" for="resource-location">Location</label>
            <q-input
              id="resource-location"
              v-model="form.location"
              outlined
              dense
              hide-bottom-space
              placeholder="Building, floor, city"
            />
          </div>

          <div class="field">
            <label class="field-label" for="resource-description">Description</label>
            <q-input
              id="resource-description"
              v-model="form.description"
              outlined
              dense
              hide-bottom-space
              type="textarea"
              autogrow
              :input-style="{ minHeight: '72px' }"
              placeholder="Short description of the space"
            />
          </div>

          <div class="field">
            <div class="field-label">Resource Image</div>
            <div class="field-hint">JPEG, PNG, GIF, or WebP · max 5 MB</div>
            <div class="image-upload">
              <div class="image-preview-wrap">
                <q-img
                  v-if="previewSrc"
                  :src="previewSrc"
                  alt="Resource preview"
                  class="image-preview"
                  fit="cover"
                />
                <div v-else class="image-preview placeholder">
                  <q-icon name="image" size="22px" />
                  <span>No image</span>
                </div>
              </div>
              <div class="image-side">
                <q-btn
                  outline
                  no-caps
                  dense
                  icon="upload"
                  label="Upload Image"
                  class="upload-btn"
                  :disable="saving"
                  @click="triggerPick"
                />
                <q-btn
                  v-if="previewSrc"
                  flat
                  no-caps
                  dense
                  color="negative"
                  label="Remove"
                  :disable="saving"
                  @click="clearImage"
                />
                <div v-if="imageName" class="image-filename" :title="imageName">{{ imageName }}</div>
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              class="hidden-file"
              @change="onFileSelected"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-footer">
        <q-btn outline no-caps label="Cancel" class="footer-btn" @click="emit('update:modelValue', false)" />
        <q-btn
          unelevated
          no-caps
          color="primary"
          class="footer-btn"
          :label="isEdit ? 'Save Changes' : 'Create Resource'"
          :loading="saving"
          :disable="!typeOptions.length"
          @click="submit"
        />
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
import { resolveAssetUrl } from '@/utils/assetUrl';

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
const fileInput = ref<HTMLInputElement | null>(null);
const imageData = ref<string | null>(null);
const imageName = ref('');
const clearImageFlag = ref(false);
const existingImage = ref('');

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
const previewSrc = computed(() => {
  if (imageData.value) return imageData.value;
  if (clearImageFlag.value) return '';
  return resolveAssetUrl(existingImage.value || form.image);
});

function resetForm() {
  form.name = '';
  form.type = props.typeOptions[0] || '';
  form.capacity = 1;
  form.location = '';
  form.description = '';
  form.available = true;
  form.image = '';
  serviceStatus.value = 'available';
  imageData.value = null;
  imageName.value = '';
  clearImageFlag.value = false;
  existingImage.value = '';
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
  imageData.value = null;
  imageName.value = '';
  clearImageFlag.value = false;
  existingImage.value = resource.image || '';
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

function triggerPick() {
  fileInput.value?.click();
}

function clearImage() {
  imageData.value = null;
  imageName.value = '';
  clearImageFlag.value = true;
  form.image = '';
  if (fileInput.value) fileInput.value.value = '';
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) {
    Notify.create({ type: 'warning', message: 'Please choose a JPEG, PNG, GIF, or WebP image.' });
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    Notify.create({ type: 'warning', message: 'Image must be 5 MB or smaller.' });
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    imageData.value = typeof result === 'string' ? result : '';
    imageName.value = file.name;
    clearImageFlag.value = false;
  };
  reader.onerror = () => {
    Notify.create({ type: 'negative', message: 'Could not read the selected image.' });
  };
  reader.readAsDataURL(file);
}

async function submit() {
  if (!form.name?.trim()) {
    Notify.create({ type: 'warning', message: 'Resource name is required.' });
    return;
  }
  if (!form.type) {
    Notify.create({ type: 'warning', message: 'Select a resource type.' });
    return;
  }
  if (!(Number(form.capacity) > 0)) {
    Notify.create({ type: 'warning', message: 'Capacity must be at least 1.' });
    return;
  }
  form.available = serviceStatus.value === 'available';
  saving.value = true;
  try {
    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      capacity: form.capacity,
      location: form.location,
      description: form.description,
      available: form.available,
    };

    if (imageData.value) {
      payload.imageData = imageData.value;
      payload.imageName = imageName.value;
    } else if (clearImageFlag.value) {
      payload.clearImage = true;
      payload.image = '';
    } else if (existingImage.value) {
      payload.image = existingImage.value;
    } else {
      payload.image = '';
    }

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
  width: min(540px, 94vw);
  max-height: min(92vh, 820px);
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: var(--portal-card);
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--portal-text);
}

.dialog-body {
  flex: 1;
  overflow: auto;
  padding: 18px;
}

.resource-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--portal-text);
}

.field-hint {
  font-size: 11px;
  line-height: 1.35;
  color: var(--portal-muted);
  min-height: 15px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  align-items: start;
}

.resource-form :deep(.q-field--outlined .q-field__control) {
  border-radius: 10px;
  min-height: 40px;
}

.resource-form :deep(.q-field--dense .q-field__control) {
  height: 40px;
}

.resource-form :deep(.q-textarea .q-field__control) {
  height: auto;
  min-height: 72px;
}

.image-upload {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--portal-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--portal-border) 18%, transparent);
}

.image-preview-wrap {
  width: 112px;
  height: 84px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--portal-border);
  background: var(--portal-card);
  flex-shrink: 0;
}

.image-preview {
  width: 100%;
  height: 100%;
}

.image-preview.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--portal-muted);
  font-size: 11px;
  background: color-mix(in srgb, var(--portal-border) 28%, transparent);
}

.image-side {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.upload-btn {
  border-radius: 8px;
}

.image-filename {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: var(--portal-muted);
}

.hidden-file {
  display: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 18px;
  flex-shrink: 0;
}

.footer-btn {
  min-height: 38px;
  border-radius: 10px;
  padding: 0 16px;
}

@media (max-width: 520px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .image-upload {
    grid-template-columns: 1fr;
  }

  .image-preview-wrap {
    width: 100%;
    height: 120px;
  }
}
</style>

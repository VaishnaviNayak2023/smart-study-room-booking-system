<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="confirm-dialog" :class="`confirm-dialog--${variant}`">
      <q-card-section class="confirm-dialog__icon-wrap">
        <div class="confirm-dialog__icon" :class="`confirm-dialog__icon--${variant}`">
          <q-icon :name="icon" size="28px" />
        </div>
      </q-card-section>

      <q-card-section class="q-pt-none text-center">
        <div class="confirm-dialog__title">{{ title }}</div>
        <div class="confirm-dialog__message">{{ message }}</div>
        <div v-if="$slots.details" class="confirm-dialog__details">
          <slot name="details" />
        </div>
      </q-card-section>

      <q-card-actions class="confirm-dialog__actions" :class="{ stacked }">
        <q-btn
          v-if="cancelLabel"
          outline
          no-caps
          class="confirm-dialog__cancel"
          :label="cancelLabel"
          :disable="loading"
          @click="emit('update:modelValue', false)"
        />
        <q-btn
          unelevated
          no-caps
          class="confirm-dialog__confirm"
          :class="`confirm-dialog__confirm--${variant}`"
          :label="confirmLabel"
          :loading="loading"
          @click="emit('confirm')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    icon?: string;
    variant?: 'primary' | 'danger' | 'info';
    loading?: boolean;
    stacked?: boolean;
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    icon: 'logout',
    variant: 'primary',
    loading: false,
    stacked: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();
</script>

<style scoped>
.confirm-dialog {
  width: min(420px, 92vw);
  border-radius: 16px;
  padding-bottom: 8px;
}

.confirm-dialog__icon-wrap {
  display: flex;
  justify-content: center;
  padding-top: 28px;
}

.confirm-dialog__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog__icon--primary,
.confirm-dialog__icon--info {
  background: #e8eefc;
  color: #1e3a8a;
}

.confirm-dialog__icon--danger {
  background: #fde8e8;
  color: #dc2626;
}

.confirm-dialog__title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.confirm-dialog__message {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.confirm-dialog__details {
  margin-top: 16px;
  text-align: left;
}

.confirm-dialog__actions {
  padding: 8px 20px 20px;
  gap: 10px;
}

.confirm-dialog__actions.stacked {
  flex-direction: column-reverse;
}

.confirm-dialog__actions.stacked .q-btn {
  width: 100%;
}

.confirm-dialog__cancel {
  border-color: #e5e7eb;
  color: #4b5563;
  border-radius: 10px;
  min-height: 42px;
}

.confirm-dialog__confirm {
  border-radius: 10px;
  min-height: 42px;
  color: #fff;
}

.confirm-dialog__confirm--primary,
.confirm-dialog__confirm--info {
  background: #1e3a8a;
}

.confirm-dialog__confirm--danger {
  background: #dc2626;
}
</style>

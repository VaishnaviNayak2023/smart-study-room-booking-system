<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card v-if="booking" class="modify-dialog">
      <q-card-section class="row items-start justify-between">
        <div>
          <div class="modify-dialog__title">Modify Booking</div>
          <div class="modify-dialog__subtitle">{{ booking.resource }}</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" @click="emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <div class="current-box">
          <q-icon name="apartment" size="18px" />
          <div>
            <div class="current-label">Current Booking</div>
            <div class="current-value">{{ booking.datetime }}</div>
          </div>
        </div>

        <q-form class="q-gutter-md q-mt-md" @submit.prevent="save">
          <q-input
            v-model="form.date"
            outlined
            dense
            type="date"
            label="New Date"
            :min="today"
            :rules="[(v) => !!v || 'Date is required']"
          >
            <template #prepend>
              <q-icon name="event" />
            </template>
          </q-input>

          <div class="row q-col-gutter-md">
            <div class="col-6">
              <q-select
                v-model="form.startTime"
                outlined
                dense
                label="Start Time"
                :options="timeOptions"
                :rules="[(v) => !!v || 'Start time is required']"
              >
                <template #prepend>
                  <q-icon name="schedule" />
                </template>
              </q-select>
            </div>
            <div class="col-6">
              <q-select
                v-model="form.duration"
                outlined
                dense
                label="Duration"
                :options="durationOptions"
                emit-value
                map-options
                :rules="[(v) => !!v || 'Duration is required']"
              />
            </div>
          </div>

          <div class="info-hint">
            <q-icon name="info" size="16px" />
            Changing the time may affect participant availability.
          </div>

          <div class="row justify-end q-gutter-sm q-mt-md">
            <q-btn outline no-caps label="Cancel" class="action-btn" @click="emit('update:modelValue', false)" />
            <q-btn unelevated no-caps color="primary" label="Save Changes" type="submit" class="action-btn" :loading="saving" />
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

export type ModifiableBooking = {
  id: string;
  resource: string;
  datetime: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  amount?: string;
  purpose?: string;
  notes?: string;
};

const props = defineProps<{
  modelValue: boolean;
  booking: ModifiableBooking | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'saved'): void;
}>();

const today = new Date().toISOString().slice(0, 10);
const saving = ref(false);

const timeOptions = Array.from({ length: 24 * 2 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

const durationOptions = [
  { label: '30 minutes', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '1.5 hours', value: 1.5 },
  { label: '2 hours', value: 2 },
  { label: '3 hours', value: 3 },
  { label: '4 hours', value: 4 },
];

const form = reactive({
  date: today,
  startTime: '10:00',
  duration: 1.5,
});

function minutesToTime(total: number) {
  const hours = Math.floor(total / 60) % 24;
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function durationFromTimes(start?: string, end?: string) {
  if (!start || !end) return 1.5;
  const startParts = start.split(':').map(Number);
  const endParts = end.split(':').map(Number);
  const sh = startParts[0] ?? 0;
  const sm = startParts[1] ?? 0;
  const eh = endParts[0] ?? 0;
  const em = endParts[1] ?? 0;
  const mins = eh * 60 + em - (sh * 60 + sm);
  return mins > 0 ? mins / 60 : 1.5;
}

watch(
  () => props.booking,
  (booking) => {
    if (!booking) return;
    form.date = String(booking.date || today).slice(0, 10);
    form.startTime = booking.startTime || '10:00';
    form.duration = durationFromTimes(booking.startTime, booking.endTime);
  },
  { immediate: true },
);

const endTime = computed(() => {
  const parts = form.startTime.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return minutesToTime(h * 60 + m + form.duration * 60);
});

async function save() {
  if (!props.booking) return;
  saving.value = true;
  try {
    await api.put(`/bookings/${props.booking.id}`, {
      date: form.date,
      time: form.startTime,
      startTime: form.startTime,
      endTime: endTime.value,
      purpose: props.booking.purpose,
      notes: props.booking.notes,
      amount: props.booking.amount,
    });
    Notify.create({ type: 'positive', message: 'Booking updated successfully.' });
    emitDashboardRefresh();
    emit('saved');
    emit('update:modelValue', false);
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    Notify.create({ type: 'negative', message: message || 'Failed to update booking.' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.modify-dialog {
  width: min(480px, 94vw);
  border-radius: 16px;
}

.modify-dialog__title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.modify-dialog__subtitle {
  margin-top: 2px;
  color: #6b7280;
  font-size: 13px;
}

.current-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #eef2ff;
  color: #1e3a8a;
}

.current-label {
  font-size: 11px;
  color: #64748b;
}

.current-value {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.info-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 12px;
}

.action-btn {
  border-radius: 10px;
  min-height: 40px;
  padding: 0 16px;
}
</style>

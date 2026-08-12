<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="rule-dialog">
      <q-card-section class="row items-center justify-between">
        <div class="dialog-title">{{ isEdit ? 'Edit Pricing Rule' : 'Create New Pricing Rule' }}</div>
        <q-btn flat round dense icon="close" @click="emit('update:modelValue', false)" />
      </q-card-section>
      <q-separator />
      <q-card-section>
        <q-form class="q-gutter-md" @submit.prevent="submit">
          <q-input
            v-model="form.name"
            outlined
            dense
            label="Rule Name"
            placeholder="e.g. Weekend Surcharge"
            :rules="[(v) => !!v || 'Rule name is required']"
          />

          <q-select
            v-model="form.conditionType"
            outlined
            dense
            label="Condition Type"
            :options="conditionTypeOptions"
            emit-value
            map-options
          />

          <q-input
            v-if="form.conditionType === 'custom'"
            v-model="form.condition"
            outlined
            dense
            label="Condition"
            placeholder="Describe when this rule applies"
          />

          <div v-if="form.conditionType === 'date_range'" class="row q-col-gutter-sm">
            <div class="col-6">
              <q-input v-model="form.startDate" outlined dense type="date" label="Start Date" />
            </div>
            <div class="col-6">
              <q-input v-model="form.endDate" outlined dense type="date" label="End Date" />
            </div>
          </div>

          <q-select
            v-if="form.conditionType === 'day_of_week'"
            v-model="form.peakDays"
            outlined
            dense
            label="Days"
            :options="dayOptions"
            emit-value
            map-options
          />

          <q-input
            v-if="form.conditionType === 'duration'"
            v-model.number="form.minDurationHours"
            outlined
            dense
            type="number"
            min="1"
            label="Minimum Duration (hours)"
          />

          <q-input
            v-if="form.conditionType === 'advance'"
            v-model.number="form.advanceDays"
            outlined
            dense
            type="number"
            min="1"
            label="Advance Booking (days)"
          />

          <div class="row q-col-gutter-sm">
            <div class="col-6">
              <q-select
                v-model="form.modifierType"
                outlined
                dense
                label="Adjustment Type"
                :options="modifierTypeOptions"
                emit-value
                map-options
              />
            </div>
            <div class="col-6">
              <q-input
                v-model.number="form.value"
                outlined
                dense
                type="number"
                label="Value"
                :prefix="form.direction === 'discount' ? '-' : '+'"
              />
            </div>
          </div>

          <q-select
            v-model="form.direction"
            outlined
            dense
            label="Rule Effect"
            :options="directionOptions"
            emit-value
            map-options
          />

          <div class="toggle-row">
            <span>Enable or disable this pricing rule immediately</span>
            <q-toggle v-model="form.active" color="primary" dense />
          </div>

          <div class="row justify-end q-gutter-sm">
            <q-btn outline no-caps label="Cancel" @click="emit('update:modelValue', false)" />
            <q-btn unelevated no-caps color="primary" type="submit" :label="isEdit ? 'Save Changes' : 'Create Rule'" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings-store';
import { currencySymbol } from '@/utils/currency';

export type PricingRuleForm = {
  id?: number | string;
  name: string;
  condition: string;
  modifier: string;
  modifierType?: string;
  value?: number;
  active: boolean;
  conditionType?: string;
  direction?: 'surcharge' | 'discount';
  startDate?: string;
  endDate?: string;
  peakDays?: string;
  minDurationHours?: number;
  advanceDays?: number;
};

const props = defineProps<{
  modelValue: boolean;
  rule: PricingRuleForm | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'save', rule: PricingRuleForm): void;
}>();

const settingsStore = useSettingsStore();

const conditionTypeOptions = [
  { label: 'Day of Week', value: 'day_of_week' },
  { label: 'Date Range', value: 'date_range' },
  { label: 'Duration-based', value: 'duration' },
  { label: 'Advance Booking', value: 'advance' },
  { label: 'Custom', value: 'custom' },
];

const modifierTypeOptions = computed(() => [
  { label: 'Percentage (%)', value: 'percent' },
  { label: `Fixed Amount (${settingsStore.ratePrefix.trim()})`, value: 'fixed' },
]);

const directionOptions = [
  { label: 'Surcharge (increase)', value: 'surcharge' },
  { label: 'Discount (decrease)', value: 'discount' },
];

const dayOptions = [
  { label: 'Mon - Fri', value: 'Mon - Fri' },
  { label: 'Weekends', value: 'Weekends' },
  { label: 'Every Day', value: 'Every Day' },
];

const form = reactive<PricingRuleForm>({
  id: '',
  name: '',
  condition: '',
  modifier: '',
  modifierType: 'percent',
  value: 0,
  active: true,
  conditionType: 'day_of_week',
  direction: 'surcharge',
  startDate: '',
  endDate: '',
  peakDays: 'Weekends',
  minDurationHours: 8,
  advanceDays: 30,
});

const isEdit = computed(() => props.rule?.id !== undefined && props.rule?.id !== '');

function buildCondition(): string {
  switch (form.conditionType) {
    case 'day_of_week':
      return `Day = ${form.peakDays}`;
    case 'date_range':
      return form.startDate && form.endDate ? `${form.startDate} - ${form.endDate}` : 'Date range';
    case 'duration':
      return `Duration >= ${form.minDurationHours}h`;
    case 'advance':
      return `Advance > ${form.advanceDays} days`;
    default:
      return form.condition.trim();
  }
}

function buildModifier(): string {
  const sign = form.direction === 'discount' ? '-' : '+';
  const magnitude = Math.abs(Number(form.value) || 0);
  if (form.modifierType === 'fixed') {
    const sym = currencySymbol(settingsStore.currencyCode);
    return `${sign}${sym}${magnitude.toFixed(2)}`;
  }
  return `${sign}${magnitude}% Base`;
}

function resetForm() {
  form.id = Date.now();
  form.name = '';
  form.condition = '';
  form.modifier = '';
  form.modifierType = 'percent';
  form.value = 0;
  form.active = true;
  form.conditionType = 'day_of_week';
  form.direction = 'surcharge';
  form.startDate = '';
  form.endDate = '';
  form.peakDays = 'Weekends';
  form.minDurationHours = 8;
  form.advanceDays = 30;
}

function applyRule(rule: PricingRuleForm) {
  form.id = rule.id ?? Date.now();
  form.name = rule.name;
  form.condition = rule.condition;
  form.modifier = rule.modifier;
  form.modifierType = rule.modifierType || (rule.modifier.includes('Rs.') || rule.modifier.includes('$') ? 'fixed' : 'percent');
  form.value = rule.value ?? Math.abs(Number(String(rule.modifier).match(/-?\d+(?:\.\d+)?/)?.[0] || 0));
  form.active = rule.active !== false;
  form.conditionType = rule.conditionType || 'custom';
  form.direction = rule.direction || (String(rule.modifier).startsWith('-') ? 'discount' : 'surcharge');
  form.startDate = rule.startDate || '';
  form.endDate = rule.endDate || '';
  form.peakDays = rule.peakDays || 'Weekends';
  form.minDurationHours = rule.minDurationHours || 8;
  form.advanceDays = rule.advanceDays || 30;
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    if (!props.rule) {
      resetForm();
      return;
    }
    applyRule(props.rule);
  },
);

function submit() {
  const saved: PricingRuleForm = {
    name: form.name.trim(),
    condition: buildCondition(),
    modifier: buildModifier(),
    value: Number(form.value) || 0,
    active: form.active,
  };
  if (form.id !== undefined && form.id !== '') {
    saved.id = form.id;
  }
  if (form.modifierType) saved.modifierType = form.modifierType;
  if (form.conditionType) saved.conditionType = form.conditionType;
  if (form.direction) saved.direction = form.direction;
  if (form.startDate) saved.startDate = form.startDate;
  if (form.endDate) saved.endDate = form.endDate;
  if (form.peakDays) saved.peakDays = form.peakDays;
  if (form.minDurationHours !== undefined) saved.minDurationHours = form.minDurationHours;
  if (form.advanceDays !== undefined) saved.advanceDays = form.advanceDays;
  emit('save', saved);
  emit('update:modelValue', false);
}
</script>

<style scoped>
.rule-dialog {
  width: min(520px, 94vw);
  border-radius: 14px;
}
.dialog-title {
  font-size: 18px;
  font-weight: 700;
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--portal-muted);
}
</style>

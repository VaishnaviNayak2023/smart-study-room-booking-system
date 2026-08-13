<template>
  <q-page class="portal-page pricing-page">
    <div v-if="pageLoading" class="portal-loading q-py-xl">
      <q-spinner color="primary" size="36px" />
      Loading pricing configuration…
    </div>
    <div v-else-if="pageError" class="portal-error q-py-xl">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ pageError }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadPricing" />
    </div>
    <template v-else>
    <!-- Page header -->
    <div class="pricing-header">
      <div>
        <h1 class="pricing-title">Pricing Rules Configuration</h1>
        <p class="pricing-subtitle">
          Manage base rates, taxes, settings, and global modifiers for {{ selectedContextLabel }}.
        </p>
        <div class="booking-system-row">
          <span class="toolbar-label">Booking System</span>
          <q-select
            v-model="selectedPricingContext"
            :options="pricingContexts"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            dense
            outlined
            class="booking-system-select"
          />
        </div>
      </div>
      <div class="header-actions">
        <q-btn outline no-caps color="primary" label="Discard Changes" @click="discardChanges" />
        <q-btn unelevated no-caps color="primary" icon="save" label="Save Configuration" @click="saveConfiguration" />
      </div>
    </div>

    <!-- Pricing Rules â€” always visible -->
    <q-card flat bordered class="panel-card rules-panel">
      <q-card-section>
        <div class="panel-head">
          <div class="panel-head-left">
            <div class="panel-icon green"><q-icon name="sell" size="18px" /></div>
            <div>
              <div class="panel-title">
                {{ selectedPricingContext === 'general' ? 'Global Discount Rules' : 'Pricing Rules' }}
              </div>
              <div class="panel-subtitle">{{ selectedRulesDescription }}</div>
            </div>
          </div>
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon="add"
            :label="selectedPricingContext === 'general' ? 'Add Rule' : 'Add Modifier'"
            size="sm"
            @click="addRuleForSelectedContext"
          />
        </div>

        <div class="rules-table">
          <div class="rules-table-head">
            <span>RULE NAME</span>
            <span>CONDITION</span>
            <span>MODIFIER</span>
            <span>STATUS</span>
            <span>ACTIONS</span>
          </div>
          <div v-if="!selectedRuleSet.length" class="rules-empty">
            No pricing rules configured for {{ selectedContextLabel }} yet.
          </div>
          <div v-for="rule in selectedRuleSet" :key="rule.id" class="rules-table-row">
            <span class="rule-name">{{ rule.name }}</span>
            <span class="rule-condition">{{ rule.condition }}</span>
            <span :class="['rule-modifier', ruleModifierClass(rule.modifier)]">{{ rule.modifier }}</span>
            <span class="rule-status">
              <q-toggle v-model="rule.active" color="primary" dense size="sm" @update:model-value="refreshSimulation" />
              <q-badge :class="rule.active ? 'badge-active' : 'badge-inactive'">
                {{ rule.active ? 'ACTIVE' : 'INACTIVE' }}
              </q-badge>
            </span>
            <span class="rule-actions">
              <q-btn flat round dense icon="edit" size="sm" @click="openRuleEditorForSelectedContext(rule)" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="removeRuleFromSelectedContext(rule)" />
            </span>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Configuration grid -->
    <div class="config-grid">
      <!-- LEFT COLUMN -->
      <div class="config-main">
        <!-- General: Base Rate Settings -->
        <q-card v-if="selectedPricingContext === 'general'" flat bordered class="panel-card">
          <q-card-section>
            <div class="panel-head compact">
              <div class="panel-head-left">
                <div class="panel-icon purple"><q-icon name="payments" size="18px" /></div>
                <div class="panel-title">Base Rate Settings</div>
              </div>
            </div>
            <q-separator class="q-my-md" />
            <div class="field-grid">
              <div>
                <label class="field-label">Default Hourly Rate ({{ ratePrefix }})</label>
                <q-input v-model="baseRate" outlined dense :prefix="ratePrefix" />
                <div class="field-hint">Applied if no specific tier rule exists.</div>
              </div>
              <div>
                <label class="field-label">Minimum Booking Duration</label>
                <q-select v-model="minimumDuration" :options="durationOptions" outlined dense />
              </div>
            </div>
            <div class="field-hint q-mt-md">
              Currency is configured in <strong>System Settings</strong> (currently {{ settingsStore.currencyLabel }}).
            </div>
          </q-card-section>
        </q-card>

        <!-- Context: Base Pricing -->
        <q-card v-else flat bordered class="panel-card">
          <q-card-section>
            <div class="panel-head compact">
              <div class="panel-head-left">
                <div class="panel-icon purple"><q-icon name="payments" size="18px" /></div>
                <div>
                  <div class="panel-title">Base Pricing</div>
                  <div class="panel-subtitle">Standard rates and peak windows for {{ selectedContextLabel }}</div>
                </div>
              </div>
              <q-badge :class="Number(studyHourlyRate) > 0 ? 'badge-active' : 'badge-inactive'">Active</q-badge>
            </div>
            <q-separator class="q-my-md" />
            <div class="field-grid">
              <div>
                <label class="field-label">Standard Hourly Rate ({{ ratePrefix }})</label>
                <q-input v-model="studyHourlyRate" outlined dense :prefix="ratePrefix" />
              </div>
              <div class="toggle-field">
                <div>
                  <label class="field-label">Free First Hour</label>
                  <div class="field-hint">Waive fee for first 60 mins</div>
                </div>
                <q-toggle v-model="freeFirstHour" color="primary" />
              </div>
            </div>

            <div class="peak-section q-mt-lg">
              <div class="peak-section-title">Peak Hour Surcharges</div>
              <div class="peak-table">
                <div class="peak-table-head">
                  <span>TIME RANGE</span>
                  <span>DAYS</span>
                  <span>MULTIPLIER</span>
                </div>
                <div class="peak-table-row">
                  <div class="peak-times">
                    <q-input v-model="peakStart" type="time" dense outlined />
                    <span>to</span>
                    <q-input v-model="peakEnd" type="time" dense outlined />
                  </div>
                  <q-select v-model="peakDays" :options="peakDayOptions" dense outlined emit-value map-options />
                  <q-input v-model="peakMultiplier" dense outlined prefix="Ã—" />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Context: Base Hourly Rates per resource -->
        <q-card v-if="selectedPricingContext !== 'general'" flat bordered class="panel-card q-mt-md">
          <q-card-section>
            <div class="panel-head compact">
              <div class="panel-head-left">
                <div class="panel-icon blue"><q-icon name="meeting_room" size="18px" /></div>
                <div class="panel-title">Base Hourly Rates</div>
              </div>
            </div>
            <q-separator class="q-my-md" />
            <div v-if="!contextResources.length" class="field-hint">No resources found. Create rooms in Manage Resources.</div>
            <div v-for="resource in contextResources" :key="resource.id" class="rate-row">
              <div>
                <strong>{{ resource.name }}</strong>
                <div class="field-hint">Shared hourly rate for all resources in this booking system</div>
              </div>
              <q-input
                :model-value="studyHourlyRate"
                outlined
                dense
                :prefix="ratePrefix"
                suffix="/ hr"
                readonly
                class="rate-input"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- RIGHT COLUMN -->
      <div class="config-aside">
        <!-- Tax -->
        <q-card flat bordered class="panel-card">
          <q-card-section>
            <div class="panel-head compact">
              <div class="panel-head-left">
                <div class="panel-icon red"><q-icon name="receipt_long" size="18px" /></div>
                <div class="panel-title">Tax Configurations</div>
              </div>
            </div>
            <div class="toggle-field q-mt-md">
              <span>Apply Standard Tax Rate</span>
              <q-toggle v-model="applyTax" color="primary" dense />
            </div>
            <label class="field-label q-mt-md">Tax Rate (%)</label>
            <q-input v-model="taxRate" outlined dense suffix="%" class="q-mt-xs" />
            <label class="field-label q-mt-md">Tax Label (Shown on Invoice)</label>
            <q-input v-model="taxLabel" outlined dense class="q-mt-xs" />
            <div class="info-note q-mt-md">
              <q-icon name="info_outline" size="16px" />
              Tax is applied to the final amount after all discount rules are calculated.
            </div>
          </q-card-section>
        </q-card>

        <!-- Role Discounts (context only) -->
        <q-card v-if="selectedPricingContext !== 'general'" flat bordered class="panel-card q-mt-md">
          <q-card-section>
            <div class="panel-head compact">
              <div class="panel-head-left">
                <div class="panel-icon green"><q-icon name="loyalty" size="18px" /></div>
                <div>
                  <div class="panel-title">Role Discounts</div>
                  <div class="panel-subtitle">Applied to base rate by user type</div>
                </div>
              </div>
              <q-badge class="badge-active">{{ activeRoleDiscountCount }} Active</q-badge>
            </div>
            <q-separator class="q-my-md" />
            <div v-for="(item, index) in roleDiscounts" :key="`role-${index}`" class="role-discount-row">
              <div class="role-discount-fields">
                <q-input v-model="item.role" outlined dense label="Role" placeholder="e.g. student" />
                <q-input v-model="item.discount" outlined dense label="Discount %" type="number" min="0" max="100" suffix="%" />
              </div>
              <q-btn flat round dense icon="delete" color="negative" @click="removeRoleDiscount(index)" />
            </div>
            <q-btn flat no-caps icon="add" label="Add Role Discount" color="primary" size="sm" class="q-mt-sm" @click="addRoleDiscount" />
          </q-card-section>
        </q-card>

        <!-- Pricing Simulation -->
        <div class="simulation-panel q-mt-md">
          <div class="simulation-inner">
            <div class="simulation-head">
              <div class="simulation-icon"><q-icon name="calculate" size="20px" /></div>
              <div>
                <div class="simulation-title">Pricing Simulation</div>
                <div class="simulation-sub">
                  {{ selectedPricingContext === 'general'
                    ? 'Preview how current rules affect a standard booking.'
                    : 'Test rules with resource, user type, and schedule.' }}
                </div>
              </div>
            </div>

            <q-select
              v-if="simulationResourceOptions.length"
              v-model="simulationResourceId"
              outlined
              dense
              dark
              label="Select Resource"
              :options="simulationResourceOptions"
              emit-value
              map-options
              class="q-mt-md sim-input"
              popup-content-class="sim-menu"
              @update:model-value="refreshSimulation"
            />
            <q-select
              v-model="simulationUserRole"
              outlined
              dense
              dark
              label="User Type"
              :options="simulationRoleOptions"
              emit-value
              map-options
              class="q-mt-sm sim-input"
              popup-content-class="sim-menu"
              @update:model-value="refreshSimulation"
            />
            <div class="row q-col-gutter-sm q-mt-sm">
              <div class="col-12">
                <q-input
                  v-model="simulationDate"
                  outlined
                  dense
                  dark
                  type="date"
                  label="Date"
                  class="sim-input"
                  @update:model-value="refreshSimulation"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="simulationStartTime"
                  outlined
                  dense
                  dark
                  type="time"
                  label="Start"
                  class="sim-input"
                  @update:model-value="refreshSimulation"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="simulationEndTime"
                  outlined
                  dense
                  dark
                  type="time"
                  label="End"
                  class="sim-input"
                  @update:model-value="refreshSimulation"
                />
              </div>
            </div>

            <div v-if="simulationLoading" class="sim-loading"><q-spinner color="white" size="28px" /></div>
            <div v-else-if="simulationError" class="sim-error">{{ simulationError }}</div>
            <div v-else-if="simulationBreakdown" class="sim-breakdown q-mt-md">
              <div
                v-for="(item, index) in simulationBreakdown.lineItems.filter((l) => l.type !== 'tax')"
                :key="index"
                class="sim-line"
              >
                <span>{{ item.description }}</span>
                <strong :class="item.amount < 0 ? 'line-discount' : item.type === 'surcharge' ? 'line-surcharge' : ''">
                  {{ formatCurrency(item.amount) }}
                </strong>
              </div>
              <div class="sim-separator" />
              <div class="sim-line"><span>Subtotal</span><strong>{{ formatCurrency(simulationBreakdown.subtotal) }}</strong></div>
              <div class="sim-line"><span>Tax ({{ simulationBreakdown.taxRate }}%)</span><strong>{{ formatCurrency(simulationBreakdown.tax) }}</strong></div>
              <div class="sim-total">
                <span>Estimated Total</span>
                <strong>{{ formatCurrency(simulationBreakdown.total) }}</strong>
              </div>
            </div>
            <div v-else class="sim-error q-mt-md">Configure rates and create a resource to preview pricing.</div>

            <div class="sim-actions q-mt-md">
              <q-btn outline no-caps label="Recalculate" class="sim-btn sim-btn-outline" @click="refreshSimulation" />
              <q-btn
                unelevated
                no-caps
                label="View Receipt"
                class="sim-btn sim-btn-solid"
                :disable="!simulationBreakdown"
                @click="simulationReceiptOpen = true"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <PricingRuleFormDialog v-model="ruleDialogOpen" :rule="editingRule" @save="saveRuleFromDialog" />
    <PricingSimulationReceiptDialog
      v-model="simulationReceiptOpen"
      :breakdown="simulationBreakdown"
      :resource-name="simulationResourceLabel"
      :date-label="simulationDateLabel"
      :duration-label="simulationDurationLabel"
    />

    <!-- Bottom save bar -->
    <div class="bottom-bar">
      <div class="bottom-note">
        <q-icon name="info_outline" size="18px" />
        Changes made to base rates will not affect currently active bookings.
      </div>
      <div class="bottom-actions">
        <q-btn outline no-caps color="primary" label="Discard Changes" @click="discardChanges" />
        <q-btn unelevated no-caps color="primary" icon="save" label="Save Pricing Rules" @click="saveConfiguration" />
      </div>
    </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { useQuasar } from 'quasar';

import api from '@/services/api';
import PricingRuleFormDialog from '@/components/admin/PricingRuleFormDialog.vue';
import PricingSimulationReceiptDialog from '@/components/admin/PricingSimulationReceiptDialog.vue';
import { useSettingsStore } from '@/stores/settings-store';
import { emitDashboardRefresh, useDashboardEvents } from '@/stores/dashboard-events';

/* ==========================================================
   QUASAR
========================================================== */

const $q = useQuasar();
const settingsStore = useSettingsStore();
const dashboardEvents = useDashboardEvents();
const ratePrefix = computed(() => settingsStore.ratePrefix);

/* ==========================================================
   LOAD / SAVE PRICING RULES FROM BACKEND
========================================================== */

type PricingRule = {
  id: number | string;
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
  fromGeneral?: boolean;
};

type PricingRuleFormState = {
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

type RoleDiscount = { role: string; discount: string };
type PricingStore = Record<string, Record<string, unknown>>;

const pricingStore = ref<PricingStore>({});
const pageLoading = ref(true);
const pageError = ref('');
const pricingContexts = ref<{ label: string; value: string }[]>([]);
const selectedPricingContext = ref('general');
const peakDayOptions = [
  { label: 'Mon - Fri', value: 'Mon - Fri' },
  { label: 'Every Day', value: 'Every Day' },
  { label: 'Weekends', value: 'Weekends' },
];
const baseRate = ref('0.00');
const minimumDuration = ref('1 Hour');
const durationOptions = ['30 Minutes', '1 Hour', '2 Hours', '3 Hours'];
const applyTax = ref(true);
const taxRate = ref('0');
const taxLabel = ref('Tax');
const discountRules = ref<PricingRule[]>([]);
const studyHourlyRate = ref('0.00');
const freeFirstHour = ref(false);
const peakStart = ref('');
const peakEnd = ref('');
const peakDays = ref('Mon - Fri');
const peakMultiplier = ref('1');
const roleDiscounts = ref<RoleDiscount[]>([]);
const contextRules = ref<PricingRule[]>([]);
const contextResources = ref<Array<{ id: number; name: string; hourlyRate?: number }>>([]);
const ruleDialogOpen = ref(false);
const editingRule = ref<PricingRuleFormState | null>(null);
const ruleDialogTarget = ref<'general' | 'context'>('general');
const pendingRuleDirection = ref<'surcharge' | 'discount'>('surcharge');
const simulationDate = ref(new Date().toISOString().slice(0, 10));
const simulationStartTime = ref('10:00');
const simulationEndTime = ref('12:00');
const simulationBreakdown = ref<{
  lineItems: Array<{ description: string; calculation: string; amount: number; type?: string }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency?: string;
} | null>(null);
const simulationLoading = ref(false);
const simulationError = ref('');
const simulationReceiptOpen = ref(false);
const simulationResourceId = ref<number | null>(null);
const simulationUserRole = ref('user');

function toDisplayString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

const applyGeneralToForm = (data: Record<string, unknown>) => {
  if (data.baseRate !== undefined) baseRate.value = toDisplayString(data.baseRate);
  if (data.minimumDuration) minimumDuration.value = toDisplayString(data.minimumDuration);
  if (data.applyTax !== undefined) applyTax.value = Boolean(data.applyTax);
  if (data.taxRate !== undefined) taxRate.value = toDisplayString(data.taxRate);
  if (data.taxLabel) taxLabel.value = toDisplayString(data.taxLabel);
  discountRules.value = Array.isArray(data.rules)
    ? (data.rules as PricingRule[]).map((rule, index) => mapRuleFromApi(rule, index))
    : [];
};

function mapRuleFromApi(rule: PricingRule, index: number): PricingRule {
  return {
    id: rule.id ?? index + 1,
    name: rule.name || 'Rule',
    condition: rule.condition || '',
    modifier: rule.modifier || '',
    active: rule.active !== false,
    ...(rule.modifierType ? { modifierType: rule.modifierType } : {}),
    ...(rule.value !== undefined ? { value: rule.value } : {}),
    ...(rule.conditionType ? { conditionType: rule.conditionType } : {}),
    ...(rule.direction ? { direction: rule.direction } : {}),
    ...(rule.startDate ? { startDate: rule.startDate } : {}),
    ...(rule.endDate ? { endDate: rule.endDate } : {}),
    ...(rule.peakDays ? { peakDays: rule.peakDays } : {}),
    ...(rule.minDurationHours !== undefined ? { minDurationHours: rule.minDurationHours } : {}),
    ...(rule.advanceDays !== undefined ? { advanceDays: rule.advanceDays } : {}),
    ...(rule.fromGeneral ? { fromGeneral: true } : {}),
  };
}

const applyContextToForm = (data: Record<string, unknown>) => {
  if (data.hourlyRate !== undefined) studyHourlyRate.value = toDisplayString(data.hourlyRate);
  if (data.freeFirstHour !== undefined) freeFirstHour.value = Boolean(data.freeFirstHour);
  if (data.peakStart) peakStart.value = toDisplayString(data.peakStart);
  if (data.peakEnd) peakEnd.value = toDisplayString(data.peakEnd);
  if (data.peakDays) peakDays.value = toDisplayString(data.peakDays);
  if (data.peakMultiplier !== undefined) peakMultiplier.value = toDisplayString(data.peakMultiplier);
  roleDiscounts.value = Array.isArray(data.roleDiscounts)
    ? (data.roleDiscounts as RoleDiscount[]).map((item) => ({
        role: item.role || 'Role',
        discount: String(item.discount ?? '0'),
      }))
    : [];
  contextRules.value = Array.isArray(data.rules)
    ? (data.rules as PricingRule[]).map((rule, index) => mapRuleFromApi(rule, index))
    : [];
};

const selectedRuleSet = computed(() =>
  selectedPricingContext.value === 'general' ? discountRules.value : contextRules.value,
);
const selectedRulesDescription = computed(() =>
  selectedPricingContext.value === 'general'
    ? 'Rules added here are saved to every booking system by default and apply across quotes.'
    : `Rules for ${selectedContextLabel.value}. Inherited General Base rules stay in sync automatically.`,
);

const simulationResourceOptions = computed(() =>
  contextResources.value.map((resource) => ({
    label: `${resource.name} (${formatCurrency(resource.hourlyRate || Number(studyHourlyRate.value) || 0)}/hr)`,
    value: resource.id,
  })),
);

const simulationRoleOptions = computed(() => {
  const options = [
    { label: 'Standard User', value: 'user' },
    { label: 'Admin', value: 'admin' },
  ];
  for (const item of roleDiscounts.value) {
    if (item.role && !options.some((opt) => opt.value === item.role)) {
      options.push({ label: item.role, value: item.role });
    }
  }
  return options;
});

const simulationResourceLabel = computed(() => {
  const resource = contextResources.value.find((item) => item.id === simulationResourceId.value);
  return resource?.name || selectedContextLabel.value;
});

const simulationDateLabel = computed(() => {
  if (!simulationDate.value) return '—';
  return new Date(`${simulationDate.value}T12:00:00`).toLocaleDateString();
});

const simulationDurationLabel = computed(() => {
  const hours = simulationHours.value;
  if (hours <= 0) return '—';
  return `${hours} ${hours === 1 ? 'Hr' : 'Hrs'}`;
});

const simulationHours = computed(() => {
  const [sh = 0, sm = 0] = simulationStartTime.value.split(':').map(Number);
  const [eh = 0, em = 0] = simulationEndTime.value.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return end > start ? (end - start) / 60 : 0;
});

const activeRoleDiscountCount = computed(
  () => roleDiscounts.value.filter((item) => item.role.trim() && Number(item.discount) > 0).length,
);

function ruleModifierClass(modifier: string) {
  return String(modifier).trim().startsWith('-') ? 'mod-discount' : 'mod-surcharge';
}

async function loadContextResources() {
  if (selectedPricingContext.value === 'general') {
    contextResources.value = [];
    return;
  }
  const label =
    pricingContexts.value.find((item) => item.value === selectedPricingContext.value)?.label || '';
  try {
    const { data } = await api.get<{
      resources: Array<{ id: number; name: string; type: string; hourlyRate?: number }>;
    }>('/resources');
    contextResources.value = (data.resources || []).filter((resource) => resource.type === label);
    if (contextResources.value.length) {
      simulationResourceId.value = contextResources.value[0]?.id ?? null;
    } else {
      simulationResourceId.value = null;
    }
  } catch {
    contextResources.value = [];
  }
}

function applyPricingFromStore(context = selectedPricingContext.value) {
  if (context === 'general') {
    applyGeneralToForm(pricingStore.value.general || {});
  } else {
    applyContextToForm(pricingStore.value[context] || {});
  }
}

const loadPricing = async () => {
  pageLoading.value = true;
  pageError.value = '';
  try {
    const [metaRes, pricingRes] = await Promise.all([
      api.get<{ contexts: { label: string; value: string }[] }>('/pricing-rules/meta'),
      api.get<{ pricing: PricingStore }>(`/pricing-rules/${selectedPricingContext.value}`),
    ]);
    pricingContexts.value = metaRes.data.contexts?.length
      ? metaRes.data.contexts
      : [{ label: 'General Base Pricing', value: 'general' }];
    if (!pricingContexts.value.some((item) => item.value === selectedPricingContext.value)) {
      selectedPricingContext.value = 'general';
    }
    pricingStore.value = { ...(pricingRes.data.pricing || {}) };
    applyPricingFromStore();
    if (selectedPricingContext.value !== 'general') {
      await loadContextResources();
    }
    await refreshSimulation();
  } catch (error) {
    console.error('Failed to load pricing rules', error);
    pageError.value = 'Unable to load pricing configuration from the server.';
  } finally {
    pageLoading.value = false;
  }
};

async function reloadPricingFromServer(context = selectedPricingContext.value) {
  const { data } = await api.get<{ pricing: PricingStore }>(`/pricing-rules/${context}`);
  pricingStore.value = { ...(data.pricing || {}) };
  applyPricingFromStore(context);
}

const selectedContextLabel = computed(() => {
  const context = pricingContexts.value.find((item) => item.value === selectedPricingContext.value);
  return context?.label || 'General Base Pricing';
});

function addRoleDiscount() {
  roleDiscounts.value.push({ role: '', discount: '0' });
}

function removeRoleDiscount(index: number) {
  roleDiscounts.value.splice(index, 1);
}

async function refreshSimulation() {
  simulationLoading.value = true;
  simulationError.value = '';
  simulationBreakdown.value = null;
  try {
    const isGeneral = selectedPricingContext.value === 'general';
    const resourceId: number | null = isGeneral ? null : simulationResourceId.value;
    let resourceType = '';
    if (!isGeneral) {
      const label = pricingContexts.value.find((item) => item.value === selectedPricingContext.value)?.label;
      resourceType = label || '';
    }
    // General preview must use General Base Rate only — never the first resource's booking-system rate.
    if (!isGeneral && !resourceId && !resourceType) {
      simulationError.value = 'Create a resource for this booking system to preview pricing.';
      return;
    }

    const generalPayload = buildGeneralPayload();
    const pricingOverride: Record<string, unknown> = {
      general: isGeneral
        ? { ...generalPayload, hourlyRate: Number(generalPayload.baseRate) || 0 }
        : generalPayload,
    };
    if (!isGeneral) {
      pricingOverride.context = buildContextPayload();
    }

    const { data } = await api.post<{ breakdown: typeof simulationBreakdown.value }>('/pricing-rules/calculate', {
      resourceId,
      resourceType,
      date: simulationDate.value,
      startTime: simulationStartTime.value,
      endTime: simulationEndTime.value,
      pricingOverride,
      simulationUserRole: simulationUserRole.value,
    });
    simulationBreakdown.value = data.breakdown;
  } catch (error: unknown) {
    simulationError.value =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Simulation failed.'
        : 'Simulation failed.';
  } finally {
    simulationLoading.value = false;
  }
}

const formatCurrency = (value: number) => settingsStore.formatMoney(value);

onMounted(() => {
  void loadPricing().then(() => refreshSimulation());
});

/* ==========================================================
   ACTIONS
========================================================== */

const addDiscountRule = () => {
  ruleDialogTarget.value = 'general';
  editingRule.value = null;
  ruleDialogOpen.value = true;
};

const addRuleForSelectedContext = () => {
  if (selectedPricingContext.value === 'general') {
    addDiscountRule();
    return;
  }
  openContextRuleEditor('surcharge');
};

const openRuleEditor = (rule: PricingRule) => {
  ruleDialogTarget.value = 'general';
  editingRule.value = { ...rule };
  ruleDialogOpen.value = true;
};

const openRuleEditorForSelectedContext = (rule: PricingRule) => {
  if (selectedPricingContext.value === 'general') {
    openRuleEditor(rule);
    return;
  }
  if (rule.fromGeneral) {
    $q.notify({
      type: 'info',
      message: 'Inherited General Base rules are edited under General Base Pricing.',
    });
    selectedPricingContext.value = 'general';
    openRuleEditor(rule);
    return;
  }
  editContextRule(rule);
};

const openContextRuleEditor = (direction: 'surcharge' | 'discount') => {
  ruleDialogTarget.value = 'context';
  pendingRuleDirection.value = direction;
  editingRule.value = { direction, name: '', condition: '', modifier: '', active: true };
  ruleDialogOpen.value = true;
};

const editContextRule = (rule: PricingRule) => {
  ruleDialogTarget.value = 'context';
  pendingRuleDirection.value = String(rule.modifier).startsWith('-') ? 'discount' : 'surcharge';
  editingRule.value = { ...rule, direction: pendingRuleDirection.value };
  ruleDialogOpen.value = true;
};

const removeRule = (rule: PricingRule) => {
  discountRules.value = discountRules.value.filter((item) => item.id !== rule.id);
};

const removeRuleFromSelectedContext = (rule: PricingRule) => {
  if (selectedPricingContext.value === 'general') {
    removeRule(rule);
    return;
  }
  if (rule.fromGeneral) {
    $q.notify({
      type: 'warning',
      message: 'This rule comes from General Base Pricing. Remove or edit it there to update all booking systems.',
    });
    return;
  }
  contextRules.value = contextRules.value.filter((item) => item.id !== rule.id);
};

const saveRuleFromDialog = (rule: PricingRuleFormState) => {
  const normalized: PricingRule = {
    id: rule.id ?? Date.now(),
    name: rule.name,
    condition: rule.condition,
    modifier: rule.modifier,
    active: rule.active,
    ...(rule.modifierType ? { modifierType: rule.modifierType } : {}),
    ...(rule.value !== undefined ? { value: rule.value } : {}),
    ...(rule.conditionType ? { conditionType: rule.conditionType } : {}),
    ...(rule.direction ? { direction: rule.direction } : {}),
    ...(rule.startDate ? { startDate: rule.startDate } : {}),
    ...(rule.endDate ? { endDate: rule.endDate } : {}),
    ...(rule.peakDays ? { peakDays: rule.peakDays } : {}),
    ...(rule.minDurationHours !== undefined ? { minDurationHours: rule.minDurationHours } : {}),
    ...(rule.advanceDays !== undefined ? { advanceDays: rule.advanceDays } : {}),
  };

  if (ruleDialogTarget.value === 'general') {
    const index = discountRules.value.findIndex((item) => item.id === normalized.id);
    if (index >= 0) discountRules.value[index] = normalized;
    else discountRules.value.push(normalized);
    void refreshSimulation();
    return;
  }

  const index = contextRules.value.findIndex((item) => item.id === normalized.id);
  if (index >= 0) contextRules.value[index] = normalized;
  else contextRules.value.push(normalized);
  void refreshSimulation();
};

const buildGeneralPayload = () => ({
  baseRate: Number(baseRate.value) || 0,
  minimumDuration: minimumDuration.value,
  applyTax: applyTax.value,
  taxRate: Number(taxRate.value) || 0,
  taxLabel: taxLabel.value,
  rules: discountRules.value,
});

const buildContextPayload = () => ({
  hourlyRate: Number(studyHourlyRate.value) || 0,
  freeFirstHour: freeFirstHour.value,
  peakStart: peakStart.value,
  peakEnd: peakEnd.value,
  peakDays: peakDays.value,
  peakMultiplier: Number(peakMultiplier.value) || 1,
  roleDiscounts: roleDiscounts.value,
  rules: contextRules.value,
});

const discardChanges = () => {
  $q.dialog({
    title: 'Discard Changes',
    message: 'Reload pricing configuration from the server?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void loadPricing();
    $q.notify({ type: 'info', message: 'Changes discarded' });
  });
};

const saveConfiguration = async () => {
  if (Number(baseRate.value) < 0 || Number(studyHourlyRate.value) < 0) {
    $q.notify({ type: 'warning', message: 'Rates cannot be negative.' });
    return;
  }
  if (Number(taxRate.value) < 0 || Number(taxRate.value) > 100) {
    $q.notify({ type: 'warning', message: 'Tax rate must be between 0 and 100.' });
    return;
  }
  try {
    const generalPayload = buildGeneralPayload();
    await api.put('/pricing-rules/general', generalPayload);

    if (selectedPricingContext.value !== 'general') {
      const contextPayload = buildContextPayload();
      await api.put(`/pricing-rules/${selectedPricingContext.value}`, contextPayload);
    }

    $q.notify({ type: 'positive', message: 'Pricing configuration saved successfully' });
    await reloadPricingFromServer();
    if (selectedPricingContext.value !== 'general') {
      await loadContextResources();
    }
    emitDashboardRefresh();
    await refreshSimulation();
  } catch (error: unknown) {
    console.error('Save pricing failed', error);
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    $q.notify({ type: 'negative', message: message || 'Failed to save pricing configuration' });
  }
};

watch(
  () => settingsStore.currencyCode,
  () => {
    void reloadPricingFromServer().then(() => refreshSimulation());
  },
);

watch(
  () => dashboardEvents.version,
  () => {
    void reloadPricingFromServer().then(() => refreshSimulation());
  },
);

watch(
  [
    baseRate,
    minimumDuration,
    applyTax,
    taxRate,
    taxLabel,
    studyHourlyRate,
    freeFirstHour,
    peakStart,
    peakEnd,
    peakDays,
    peakMultiplier,
    roleDiscounts,
    discountRules,
    contextRules,
  ],
  () => {
    void refreshSimulation();
  },
  { deep: true },
);

watch(selectedPricingContext, async (context) => {
  try {
    const { data } = await api.get<{ pricing: PricingStore }>(`/pricing-rules/${context}`);
    pricingStore.value = { ...(data.pricing || {}) };
  } catch {
    /* keep cached store */
  }
  applyPricingFromStore(context);
  await loadContextResources();
  await refreshSimulation();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
</script>

<style scoped>
.pricing-page {
  min-height: 100%;
  padding: 0 24px 100px;
  background: var(--portal-muted-bg);
  color: var(--portal-text);
}

.booking-system-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--portal-muted);
}

.booking-system-select {
  min-width: 220px;
}

.pricing-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 0 20px;
}

.pricing-title {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--portal-text);
  line-height: 1.2;
}

.pricing-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--portal-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.panel-card {
  border: 1px solid var(--portal-border);
  border-radius: 12px;
  background: var(--portal-card);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.rules-panel {
  margin-bottom: 20px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.panel-head.compact {
  align-items: center;
}

.panel-head-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.panel-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.panel-icon.green { background: var(--portal-status-confirmed-bg); color: var(--portal-status-confirmed-text); }
.panel-icon.purple { background: #ede9fe; color: #6d28d9; }
.panel-icon.red { background: #fee2e2; color: var(--portal-status-unavailable-text); }
.panel-icon.blue { background: var(--portal-status-pending-bg); color: var(--portal-status-booked-text); }

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--portal-text);
}

.panel-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: var(--portal-muted);
}

.config-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.field-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--portal-text-secondary);
  margin-bottom: 6px;
}

.field-hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--portal-muted);
}

.toggle-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--portal-muted-bg);
  font-size: 12px;
  color: var(--portal-muted);
}

.rules-table {
  margin-top: 16px;
  border: 1px solid var(--portal-border);
  border-radius: 10px;
  overflow: hidden;
}

.rules-table-head,
.rules-table-row {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 0.9fr 1fr 0.7fr;
  gap: 12px;
  align-items: center;
  padding: 12px 16px;
}

.rules-table-head {
  background: var(--portal-muted-bg);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--portal-muted);
}

.rules-table-row {
  border-top: 1px solid #e2e8f0;
  font-size: 14px;
}

.rules-table-row:hover {
  background: var(--portal-muted-bg);
}

.rules-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--portal-muted);
  font-size: 14px;
}

.rule-name {
  font-weight: 600;
  color: var(--portal-text);
}

.rule-condition {
  color: var(--portal-text-secondary);
  font-size: 13px;
}

.rule-modifier {
  font-weight: 700;
  font-size: 13px;
}

.mod-surcharge { color: var(--portal-error); }
.mod-discount { color: var(--portal-success); }

.rule-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rule-actions {
  display: flex;
  gap: 4px;
}

.badge-active {
  background: var(--portal-status-confirmed-bg);
  color: var(--portal-status-confirmed-text);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
}

.badge-inactive {
  background: var(--portal-summary-bg);
  color: var(--portal-muted);
  font-size: 10px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
}

.peak-section {
  background: var(--portal-muted-bg);
  border: 1px solid var(--portal-border);
  border-radius: 10px;
  padding: 16px;
}

.peak-section-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--portal-text-secondary);
  margin-bottom: 12px;
}

.peak-table-head,
.peak-table-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 0.6fr;
  gap: 12px;
  align-items: center;
}

.peak-table-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--portal-muted);
  margin-bottom: 8px;
}

.peak-times {
  display: flex;
  align-items: center;
  gap: 8px;
}

.peak-times span {
  font-size: 13px;
  color: var(--portal-muted);
}

.rate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #f1f5f9;
}

.rate-row:last-child {
  border-bottom: none;
}

.rate-input {
  max-width: 140px;
}

.role-discount-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
}

.role-discount-fields {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 8px;
}

.simulation-panel {
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(165deg, #172554 0%, #1e3a8a 42%, #1d4ed8 100%) !important;
  color: #ffffff !important;
  border: 1px solid rgba(147, 197, 253, 0.35);
  box-shadow: 0 10px 28px rgba(30, 58, 138, 0.28);
}

.simulation-inner {
  padding: 18px;
  color: #ffffff;
}

.simulation-head {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.simulation-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  flex-shrink: 0;
}

.simulation-title {
  font-size: 16px;
  font-weight: 750;
  color: #ffffff !important;
}

.simulation-sub {
  font-size: 12px;
  line-height: 1.4;
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.82) !important;
}

.sim-input {
  color: #ffffff;
}

.sim-input :deep(.q-field__control) {
  background: rgba(255, 255, 255, 0.14) !important;
  color: #ffffff !important;
  border-radius: 10px;
}

.sim-input :deep(.q-field__native),
.sim-input :deep(.q-field__input),
.sim-input :deep(.q-field__append),
.sim-input :deep(.q-field__marginal),
.sim-input :deep(.q-select__dropdown-icon),
.sim-input :deep(input),
.sim-input :deep(.q-placeholder) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.sim-input :deep(.q-field__label) {
  color: rgba(255, 255, 255, 0.78) !important;
}

.sim-input :deep(.q-field--outlined .q-field__control:before),
.sim-input :deep(.q-field--outlined .q-field__control:after) {
  border-color: rgba(255, 255, 255, 0.42) !important;
}

.sim-input :deep(.q-field--focused .q-field__control:after) {
  border-color: #bfdbfe !important;
}

.sim-loading {
  text-align: center;
  padding: 24px 0;
  color: #ffffff;
}

.sim-error {
  font-size: 13px;
  color: #fecaca !important;
}

.sim-breakdown {
  background: rgba(2, 6, 23, 0.35) !important;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 12px;
  padding: 14px;
  color: #ffffff !important;
}

.sim-separator {
  height: 1px;
  margin: 10px 0;
  background: rgba(255, 255, 255, 0.2);
}

.sim-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 5px 0;
  color: rgba(255, 255, 255, 0.86) !important;
}

.sim-line strong {
  font-weight: 700;
  color: #ffffff !important;
}

.line-surcharge { color: #fecaca !important; }
.line-discount { color: #bbf7d0 !important; }

.sim-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.22);
  color: #ffffff !important;
}

.sim-total span {
  font-weight: 650;
  color: #ffffff !important;
}

.sim-total strong {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff !important;
}

.sim-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.sim-btn {
  font-weight: 650;
  min-height: 40px;
  border-radius: 10px;
  width: 100%;
}

.sim-btn-outline {
  color: #ffffff !important;
  border: 1px solid rgba(255, 255, 255, 0.75) !important;
  background: transparent !important;
}

.sim-btn-solid {
  color: #1e3a8a !important;
  background: #ffffff !important;
}

.sim-btn-solid:disabled {
  opacity: 0.55;
}

.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 24px;
  background: var(--portal-card);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06);
}

.bottom-note {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--portal-muted);
}

.bottom-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 1100px) {
  .config-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .pricing-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .field-grid {
    grid-template-columns: 1fr;
  }

  .rules-table-head,
  .rules-table-row {
    min-width: 640px;
  }

  .rules-table {
    overflow-x: auto;
  }

  .bottom-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .role-discount-fields {
    grid-template-columns: 1fr;
  }
}
</style>

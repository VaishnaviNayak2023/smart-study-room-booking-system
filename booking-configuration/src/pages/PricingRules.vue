<template>
  <q-page class="pricing-page">
    <!-- =====================================================
         TOP BAR
    ====================================================== -->

    <div class="top-toolbar">
      <q-select
        v-model="selectedPricingContext"
        :options="pricingContexts"
        option-label="label"
        option-value="value"
        emit-value
        map-options
        dense
        outlined
        class="context-select"
      />

      <div class="toolbar-actions">
        <q-btn flat round dense icon="notifications_none" class="toolbar-icon" />

        <q-btn flat round dense icon="help_outline" class="toolbar-icon" />

        <q-avatar size="27px" class="admin-avatar">
          <img src="https://i.pravatar.cc/100?img=12" />
        </q-avatar>
      </div>
    </div>

    <!-- =====================================================
         PAGE HEADER
    ====================================================== -->

    <div class="page-header">
      <div>
        <div class="page-title">Pricing Rules Configuration</div>

        <div class="page-description">
          Manage base rates, taxes, settings, and global modifiers for {{ selectedContextLabel }}.
        </div>
      </div>

      <div class="header-actions">
        <q-btn
          outline
          no-caps
          label="Discard Changes"
          class="discard-button"
          @click="discardChanges"
        />

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Save Configuration"
          class="save-button"
          @click="saveConfiguration"
        />
      </div>
    </div>

    <!-- =====================================================
         GENERAL BASE PRICING
    ====================================================== -->

    <template v-if="selectedPricingContext === 'general'">
      <div class="pricing-layout">
        <!-- LEFT -->
        <div class="pricing-main">
          <!-- Base Rate -->
          <q-card flat bordered class="pricing-card">
            <q-card-section>
              <div class="card-title-row">
                <div class="card-title-icon purple">
                  <q-icon name="description" />
                </div>

                <div class="card-title">Base Rate Settings</div>
              </div>

              <q-separator class="card-separator" />

              <div class="form-grid">
                <div>
                  <div class="field-label">Default Hourly Rate ($)</div>

                  <q-input v-model="baseRate" outlined dense prefix="$" class="pricing-input" />

                  <div class="field-help">Applied if no specific tier rule exists.</div>
                </div>

                <div>
                  <div class="field-label">Minimum Booking Duration</div>

                  <q-select
                    v-model="minimumDuration"
                    :options="durationOptions"
                    outlined
                    dense
                    class="pricing-input"
                  />
                </div>
              </div>

              <div class="field-label q-mt-md">Currency Setup</div>

              <q-option-group
                v-model="currency"
                :options="currencyOptions"
                color="primary"
                inline
                dense
                class="currency-options"
              />
            </q-card-section>
          </q-card>

          <!-- Global Discount Rules -->
          <q-card flat bordered class="pricing-card discount-card">
            <q-card-section class="no-padding">
              <div class="discount-header">
                <div class="card-title-row">
                  <div class="card-title-icon green">
                    <q-icon name="sell" />
                  </div>

                  <div class="card-title">Global Discount Rules</div>
                </div>

                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  icon="add"
                  label="Add Rule"
                  size="sm"
                  class="add-rule-button"
                  @click="addDiscountRule"
                />
              </div>

              <div class="rules-table">
                <div class="rules-head">
                  <div>RULE NAME</div>
                  <div>CONDITION</div>
                  <div>MODIFIER</div>
                  <div>STATUS</div>
                  <div>ACTIONS</div>
                </div>

                <div v-for="rule in discountRules" :key="rule.id" class="rules-row">
                  <div class="rule-name">
                    {{ rule.name }}
                  </div>

                  <div>
                    {{ rule.condition }}
                  </div>

                  <div
                    :class="{
                      'discount-value': rule.active,
                    }"
                  >
                    {{ rule.modifier }}
                  </div>

                  <div>
                    <q-badge :class="rule.active ? 'status-active' : 'status-inactive'">
                      {{ rule.active ? 'ACTIVE' : 'INACTIVE' }}
                    </q-badge>
                  </div>

                  <div class="rule-actions">
                    <q-btn flat round dense icon="edit" size="sm" @click="editDiscountRule(rule)" />
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- RIGHT -->
        <div class="pricing-side">
          <!-- Tax -->
          <q-card flat bordered class="pricing-card">
            <q-card-section>
              <div class="card-title-row">
                <div class="card-title-icon red">
                  <q-icon name="receipt_long" />
                </div>

                <div class="card-title">Tax Configurations</div>
              </div>

              <div class="toggle-row">
                <span> Apply Standard Tax Rate </span>

                <q-toggle v-model="applyTax" color="primary" dense />
              </div>

              <div class="field-label">Tax Rate (%)</div>

              <q-input v-model="taxRate" outlined dense suffix="%" class="pricing-input" />

              <div class="field-label q-mt-md">Tax Label (Shown on Invoice)</div>

              <q-input v-model="taxLabel" outlined dense class="pricing-input" />

              <div class="info-box q-mt-md">
                <q-icon name="info_outline" size="13px" />

                <span>
                  Tax is applied to the final amount after all global discount rules are calculated.
                </span>
              </div>
            </q-card-section>
          </q-card>

          <!-- Simulation -->
          <q-card flat class="simulation-card">
            <q-card-section>
              <div class="simulation-title">Pricing Simulation</div>

              <div class="simulation-description">
                Preview how current rules affect a standard 2-hour booking.
              </div>

              <div class="simulation-body">
                <div class="simulation-row">
                  <span> Base Rate (2 hrs x ${{ baseRate }}) </span>

                  <strong>
                    {{ formatCurrency(simulation.base) }}
                  </strong>
                </div>

                <div class="simulation-row">
                  <span> Discounts </span>

                  <strong class="negative"> -{{ formatCurrency(simulation.discount) }} </strong>
                </div>

                <q-separator />

                <div class="simulation-row">
                  <span>Subtotal</span>

                  <strong>
                    {{ formatCurrency(simulation.subtotal) }}
                  </strong>
                </div>

                <div class="simulation-row">
                  <span> Tax ({{ taxRate }}%) </span>

                  <strong>
                    {{ formatCurrency(simulation.tax) }}
                  </strong>
                </div>

                <q-separator />

                <div class="simulation-row total">
                  <span>Total</span>

                  <strong>
                    {{ formatCurrency(simulation.total) }}
                  </strong>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- =====================================================
         RENTAL VEHICLE
    ====================================================== -->

    <template v-else-if="selectedPricingContext === 'vehicle'">
      <div class="vehicle-layout">
        <div class="vehicle-main">
          <!-- Vehicle Rates -->
          <q-card flat bordered class="pricing-card">
            <q-card-section class="no-padding">
              <div class="vehicle-card-header">
                <div class="card-title-row">
                  <div class="card-title-icon purple">
                    <q-icon name="directions_car" />
                  </div>

                  <div>
                    <div class="card-title">Base Rate Structure</div>

                    <div class="card-subtitle">Vehicle-specific hourly and daily pricing.</div>
                  </div>
                </div>

                <q-btn flat no-caps label="Edit Matrix" color="primary" size="sm" />
              </div>

              <div class="vehicle-table">
                <div class="vehicle-table-head">
                  <div>VEHICLE TYPE</div>
                  <div>HOURLY RATE</div>
                  <div>DAILY RATE<br />(24H)</div>
                  <div>WEEKLY DISCOUNT</div>
                  <div>STATUS</div>
                </div>

                <div v-for="vehicle in vehicleRates" :key="vehicle.id" class="vehicle-table-row">
                  <div class="vehicle-name">
                    <div class="vehicle-icon">
                      <q-icon :name="vehicle.icon" />
                    </div>

                    <span>
                      {{ vehicle.name }}
                    </span>
                  </div>

                  <div>
                    {{ vehicle.hourly }}
                  </div>

                  <div>
                    {{ vehicle.daily }}
                  </div>

                  <div class="green-text">
                    {{ vehicle.discount }}
                  </div>

                  <div>
                    <q-badge class="status-active">
                      {{ vehicle.status }}
                    </q-badge>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>

          <div class="vehicle-bottom-grid">
            <!-- Mileage -->
            <q-card flat bordered class="pricing-card">
              <q-card-section>
                <div class="small-card-header">
                  <div class="card-title-row">
                    <div class="card-title-icon purple">
                      <q-icon name="speed" />
                    </div>

                    <div class="card-title">Mileage Overage</div>
                  </div>

                  <q-toggle v-model="mileageEnabled" color="primary" dense />
                </div>

                <p class="small-description">
                  Applies an additional charge per mile once the daily allowance is exceeded.
                </p>

                <div class="mini-field">
                  <span>Daily Allowance</span>
                  <strong>150 Miles</strong>
                </div>

                <div class="mini-field">
                  <span>Overage Rate</span>
                  <strong>$0.25 / Mile</strong>
                </div>

                <q-btn
                  outline
                  no-caps
                  label="Configure Limits"
                  color="primary"
                  class="full-width mini-button"
                />
              </q-card-section>
            </q-card>

            <!-- Insurance -->
            <q-card flat bordered class="pricing-card">
              <q-card-section>
                <div class="card-title-row">
                  <div class="card-title-icon green">
                    <q-icon name="shield" />
                  </div>

                  <div class="card-title">Insurance Packages</div>
                </div>

                <p class="small-description">
                  Mandatory and optional insurance tiers applied to base rental cost.
                </p>

                <div class="insurance-row">
                  <span>● Basic (Required)</span>
                  <strong>+$12/day</strong>
                </div>

                <div class="insurance-row">
                  <span>● Comprehensive</span>
                  <strong>+$28/day</strong>
                </div>

                <div class="insurance-row muted">
                  <span>● Premium Waiver</span>
                  <span>Not Configured</span>
                </div>

                <q-btn
                  outline
                  no-caps
                  label="Manage Tiers"
                  color="primary"
                  class="full-width mini-button"
                />
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Seasonal -->
        <div>
          <q-card flat bordered class="pricing-card seasonal-card">
            <q-card-section>
              <div class="card-title-row">
                <div class="card-title-icon purple">
                  <q-icon name="calendar_month" />
                </div>

                <div>
                  <div class="card-title">Seasonal Surcharges</div>

                  <div class="card-subtitle">Active multipliers and date-specific rules.</div>
                </div>
              </div>

              <div v-for="season in seasonalRules" :key="season.id" class="season-rule">
                <div class="season-header">
                  <strong>
                    {{ season.name }}
                  </strong>

                  <q-badge :class="season.active ? 'priority-high' : 'status-inactive'">
                    {{ season.status }}
                  </q-badge>
                </div>

                <div class="season-date">
                  {{ season.date }}
                </div>

                <div class="season-adjustment">
                  <span>Base Rate Adjust</span>

                  <strong>
                    {{ season.adjustment }}
                  </strong>
                </div>
              </div>

              <q-btn
                flat
                no-caps
                icon="add"
                label="Add Surcharge Rule"
                color="primary"
                class="full-width"
              />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- =====================================================
         STUDY ROOM
    ====================================================== -->

    <template v-else>
      <div class="study-layout">
        <div class="study-main">
          <q-card flat bordered class="pricing-card">
            <q-card-section>
              <div class="study-card-header">
                <div class="card-title-row">
                  <div class="card-title-icon purple">
                    <q-icon name="payments" />
                  </div>

                  <div class="card-title">Base Pricing & Tiers</div>
                </div>

                <q-badge class="status-active"> Active </q-badge>
              </div>

              <q-separator class="card-separator" />

              <div class="form-grid">
                <div>
                  <div class="field-label">Standard Hourly Rate ($)</div>

                  <q-input v-model="studyHourlyRate" outlined dense class="pricing-input" />
                </div>

                <div class="free-hour-setting">
                  <div>
                    <div class="field-label">Free First Hour</div>

                    <div class="field-help">Waive fee for first 60 mins</div>
                  </div>

                  <q-toggle v-model="freeFirstHour" color="primary" />
                </div>
              </div>

              <!-- Peak windows -->
              <div class="field-label q-mt-lg">Peak Hour Surcharges</div>

              <div class="peak-window">
                <div class="peak-head">
                  <span>TIME RANGE</span>
                  <span>DAYS</span>
                  <span>MULTIPLIER</span>
                </div>

                <div class="peak-row">
                  <q-input v-model="peakStart" type="time" dense outlined />

                  <span>→</span>

                  <q-input v-model="peakEnd" type="time" dense outlined />

                  <q-select
                    v-model="peakDays"
                    :options="['Mon - Fri', 'Every Day', 'Weekends']"
                    dense
                    outlined
                  />

                  <span>x</span>

                  <q-input v-model="peakMultiplier" dense outlined />
                </div>

                <q-btn flat no-caps color="primary" icon="add" label="Add Peak Window" size="sm" />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Right side -->
        <div class="study-side">
          <!-- Role discounts -->
          <q-card flat bordered class="pricing-card">
            <q-card-section>
              <div class="card-title-row">
                <div class="card-title-icon purple">
                  <q-icon name="sell" />
                </div>

                <div class="card-title">Role Discounts</div>
              </div>

              <q-separator class="card-separator" />

              <div v-for="role in roleDiscounts" :key="role.role" class="role-row">
                <div>
                  <strong>{{ role.role }}</strong>

                  <span> Applied to base rate </span>
                </div>

                <div class="percentage-input">
                  <q-input v-model="role.discount" dense outlined suffix="%" />
                </div>
              </div>
            </q-card-section>
          </q-card>

          <!-- Cancellation -->
          <q-card flat bordered class="pricing-card q-mt-md">
            <q-card-section>
              <div class="card-title-row">
                <div class="card-title-icon red">
                  <q-icon name="cancel" />
                </div>

                <div class="card-title">Cancellation Charges</div>
              </div>

              <div class="field-help q-mt-sm">
                Penalties based on notice given prior to booking start time.
              </div>

              <div
                v-for="charge in cancellationCharges"
                :key="charge.label"
                class="cancellation-row"
              >
                <span>{{ charge.label }}</span>
                <strong>{{ charge.value }}</strong>
              </div>

              <q-btn flat no-caps label="Edit Penalty Tiers" color="primary" size="sm" />
            </q-card-section>
          </q-card>
        </div>
      </div>
    </template>

    <!-- =====================================================
         BOTTOM SAVE BAR
    ====================================================== -->

    <div class="bottom-save-bar">
      <div class="change-message">
        <q-icon name="info_outline" />

        <span> Changes made to base rates will not affect currently active bookings. </span>
      </div>

      <div class="bottom-actions">
        <q-btn
          outline
          no-caps
          label="Discard Changes"
          class="discard-button"
          @click="discardChanges"
        />

        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="save"
          label="Save Pricing Rules"
          class="save-button"
          @click="saveConfiguration"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useQuasar } from 'quasar';

/* ==========================================================
   QUASAR
========================================================== */

const $q = useQuasar();

/* ==========================================================
   PRICING CONTEXT
========================================================== */

const selectedPricingContext = ref('general');

const pricingContexts = [
  {
    label: 'General Base Pricing',
    value: 'general',
  },
  {
    label: 'Rental Vehicle',
    value: 'vehicle',
  },
  {
    label: 'Study Room',
    value: 'study',
  },
];

const selectedContextLabel = computed(() => {
  const context = pricingContexts.find((item) => item.value === selectedPricingContext.value);

  return context?.label || 'General Base Pricing';
});

/* ==========================================================
   GENERAL PRICING
========================================================== */

const baseRate = ref('25.00');

const minimumDuration = ref('1 Hour');

const durationOptions = ['30 Minutes', '1 Hour', '2 Hours', '3 Hours'];

const currency = ref('USD');

const currencyOptions = [
  {
    label: 'USD ($)',
    value: 'USD',
  },
  {
    label: 'EUR (€)',
    value: 'EUR',
  },
  {
    label: 'GBP (£)',
    value: 'GBP',
  },
];

/* ==========================================================
   TAX
========================================================== */

const applyTax = ref(true);

const taxRate = ref('8.5');

const taxLabel = ref('State Sales Tax');

/* ==========================================================
   DISCOUNT RULES
========================================================== */

const discountRules = ref([
  {
    id: 1,
    name: 'Bulk Booking (8h+)',
    condition: 'Duration >= 8h',
    modifier: '-15% Total',
    active: true,
  },
  {
    id: 2,
    name: 'Early Bird',
    condition: 'Advance > 30 days',
    modifier: '-10% Base',
    active: true,
  },
  {
    id: 3,
    name: 'Weekend Surge',
    condition: 'Day = Sat, Sun',
    modifier: '+20% Base',
    active: false,
  },
]);

/* ==========================================================
   PRICING SIMULATION
========================================================== */

const simulation = computed(() => {
  const hourly = Number(baseRate.value) || 0;

  const base = hourly * 2;

  const discount = base * 0;

  const subtotal = base - discount;

  const tax = applyTax.value ? subtotal * ((Number(taxRate.value) || 0) / 100) : 0;

  const total = subtotal + tax;

  return {
    base,
    discount,
    subtotal,
    tax,
    total,
  };
});

const formatCurrency = (value: number) => {
  return `$${Number(value).toFixed(2)}`;
};

/* ==========================================================
   RENTAL VEHICLE
========================================================== */

const vehicleRates = ref([
  {
    id: 1,
    name: 'Sedan (Standard)',
    icon: 'directions_car',
    hourly: '$15.00',
    daily: '$85.00',
    discount: '15% off',
    status: 'Active',
  },
  {
    id: 2,
    name: 'SUV (Premium)',
    icon: 'airport_shuttle',
    hourly: '$25.00',
    daily: '$140.00',
    discount: '10% off',
    status: 'Active',
  },
  {
    id: 3,
    name: 'Motorbike',
    icon: 'two_wheeler',
    hourly: '$10.00',
    daily: '$55.00',
    discount: '20% off',
    status: 'Active',
  },
]);

const mileageEnabled = ref(true);

const seasonalRules = ref([
  {
    id: 1,
    name: 'Holiday Peak Multiplier',
    date: 'Dec 15 - Jan 05',
    adjustment: '+25%',
    status: 'HIGH PRIORITY',
    active: true,
  },
  {
    id: 2,
    name: 'Weekend Premium',
    date: 'Fri 5PM - Sun 11PM',
    adjustment: '+10%',
    status: 'ACTIVE',
    active: true,
  },
  {
    id: 3,
    name: 'Off-Season Discount',
    date: 'Feb 01 - Mar 31',
    adjustment: '-15%',
    status: 'INACTIVE',
    active: false,
  },
]);

/* ==========================================================
   STUDY ROOM
========================================================== */

const studyHourlyRate = ref('15.00');

const freeFirstHour = ref(true);

const peakStart = ref('17:00');

const peakEnd = ref('22:00');

const peakDays = ref('Mon - Fri');

const peakMultiplier = ref('1.5');

const roleDiscounts = ref([
  {
    role: 'Student Member',
    discount: '20',
  },
  {
    role: 'Faculty',
    discount: '50',
  },
]);

const cancellationCharges = ref([
  {
    label: '< 24 hours',
    value: '25% of fee',
  },
  {
    label: '< 12 hours',
    value: '50% of fee',
  },
  {
    label: 'No Show',
    value: '100% of fee',
  },
]);

/* ==========================================================
   ACTIONS
========================================================== */

const addDiscountRule = () => {
  discountRules.value.push({
    id: Date.now(),
    name: 'New Discount Rule',
    condition: 'Configure condition',
    modifier: '0%',
    active: false,
  });
};

const editDiscountRule = (rule: { name: string }) => {
  $q.notify({
    type: 'info',
    message: `Editing ${rule.name}`,
  });
};

const discardChanges = () => {
  $q.dialog({
    title: 'Discard Changes',
    message: 'Are you sure you want to discard your changes?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    $q.notify({
      type: 'info',
      message: 'Changes discarded',
    });
  });
};

const saveConfiguration = () => {
  $q.notify({
    type: 'positive',
    message: 'Pricing configuration saved successfully',
  });
};

/* ==========================================================
   WATCHERS
========================================================== */

watch(selectedPricingContext, () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
</script>

<style scoped>
/* ==========================================================
   PAGE
========================================================== */

.pricing-page {
  min-height: 100%;
  padding: 0 20px 18px;

  background: #f7f8fd;

  color: #182033;
}

/* ==========================================================
   TOP TOOLBAR
========================================================== */

.top-toolbar {
  height: 42px;

  display: flex;
  align-items: center;
  justify-content: space-between;

  margin: 0 -20px;
  padding: 0 20px;

  background: #ffffff;
  border-bottom: 1px solid #e2e5ef;
}

.context-select {
  width: 145px;
}

.context-select :deep(.q-field__control) {
  min-height: 28px;
  height: 28px;
}

.context-select :deep(.q-field__native) {
  font-size: 9px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.toolbar-icon {
  color: #30364a;
}

.admin-avatar {
  margin-left: 5px;
}

/* ==========================================================
   PAGE HEADER
========================================================== */

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  padding: 20px 0 13px;
}

.page-title {
  color: #101522;

  font-size: 20px;
  line-height: 1.15;
  font-weight: 700;
}

.page-description {
  margin-top: 3px;

  color: #737a8e;

  font-size: 9px;
}

.header-actions {
  display: flex;
  gap: 7px;
}

.discard-button,
.save-button {
  min-height: 25px;

  border-radius: 5px;

  font-size: 8px;
}

.save-button {
  padding: 0 12px;
}

/* ==========================================================
   GENERAL LAYOUT
========================================================== */

.pricing-layout {
  display: grid;

  grid-template-columns: minmax(0, 1fr) 185px;

  gap: 13px;
}

.pricing-main {
  min-width: 0;
}

.pricing-side {
  min-width: 0;
}

/* ==========================================================
   CARDS
========================================================== */

.pricing-card {
  border: 1px solid #d9deea;
  border-radius: 7px;

  background: #ffffff;
}

.pricing-card + .pricing-card {
  margin-top: 13px;
}

.pricing-card .q-card__section {
  padding: 13px;
}

.no-padding {
  padding: 0 !important;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  color: #1a2235;

  font-size: 12px;
  font-weight: 650;
}

.card-subtitle {
  margin-top: 2px;

  color: #7a8193;

  font-size: 7px;
}

.card-title-icon {
  width: 24px;
  height: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 4px;

  font-size: 13px;
}

.card-title-icon.purple {
  color: #5753e8;
  background: #e8e9ff;
}

.card-title-icon.green {
  color: #168c70;
  background: #ddf4eb;
}

.card-title-icon.red {
  color: #e04545;
  background: #ffe6e6;
}

.card-separator {
  margin: 7px 0 10px;

  background: #dfe3ec;
}

/* ==========================================================
   FORM
========================================================== */

.form-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;
}

.field-label {
  margin-bottom: 4px;

  color: #454c60;

  font-size: 8px;
  font-weight: 500;
}

.pricing-input :deep(.q-field__control) {
  height: 27px;
  min-height: 27px;

  border-radius: 5px;
}

.pricing-input :deep(.q-field__native) {
  font-size: 9px;
}

.field-help {
  margin-top: 4px;

  color: #8990a1;

  font-size: 7px;
}

.currency-options {
  font-size: 8px;
}

.currency-options :deep(.q-radio__label) {
  font-size: 8px;
}

/* ==========================================================
   DISCOUNT RULES
========================================================== */

.discount-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 10px 12px;
}

.add-rule-button {
  min-height: 23px;

  border-radius: 4px;

  font-size: 8px;
}

.rules-table {
  border-top: 1px solid #dce1eb;
}

.rules-head,
.rules-row {
  display: grid;

  grid-template-columns:
    1.25fr
    1fr
    0.8fr
    0.65fr
    0.45fr;

  align-items: center;
}

.rules-head {
  min-height: 22px;

  padding: 0 10px;

  color: #535b70;
  background: #e9efff;

  font-size: 7px;
  font-weight: 600;
}

.rules-row {
  min-height: 28px;

  padding: 0 10px;

  border-top: 1px solid #edf0f5;

  color: #4d5569;

  font-size: 8px;
}

.rule-name {
  color: #252c40;
}

.discount-value {
  color: #188d70;
}

.rule-actions {
  display: flex;
  justify-content: center;
}

.status-active,
.status-inactive {
  border-radius: 3px;

  padding: 3px 5px;

  font-size: 6px;
  font-weight: 600;
}

.status-active {
  color: #158567;
  background: #d9f1e9;
}

.status-inactive {
  color: #7e8698;
  background: #e8ebf2;
}

/* ==========================================================
   TAX
========================================================== */

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin: 16px 0 8px;

  color: #454c60;

  font-size: 9px;
}

.info-box {
  display: flex;
  gap: 5px;

  padding: 8px;

  border-radius: 4px;

  color: #687084;
  background: #edf1ff;

  font-size: 7px;
  line-height: 1.35;
}

/* ==========================================================
   SIMULATION
========================================================== */

.simulation-card {
  margin-top: 13px;

  overflow: hidden;

  border-radius: 7px;

  color: #ffffff;

  background: #5a56ed;
}

.simulation-card .q-card__section {
  padding: 14px;
}

.simulation-title {
  font-size: 15px;
  font-weight: 700;
}

.simulation-description {
  margin-top: 4px;

  color: rgba(255, 255, 255, 0.82);

  font-size: 8px;
  line-height: 1.35;
}

.simulation-body {
  margin-top: 11px;

  padding: 7px;

  border-radius: 4px;

  background: rgba(255, 255, 255, 0.12);
}

.simulation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 4px 0;

  font-size: 7px;
}

.simulation-row strong {
  font-size: 8px;
}

.simulation-row .negative {
  color: #b9ffd9;
}

.simulation-row.total {
  padding-top: 7px;

  font-size: 8px;
}

.simulation-body .q-separator {
  background: rgba(255, 255, 255, 0.25);
}

/* ==========================================================
   RENTAL VEHICLE
========================================================== */

.vehicle-layout {
  display: grid;

  grid-template-columns: minmax(0, 1fr) 185px;

  gap: 13px;
}

.vehicle-card-header,
.study-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 11px 13px;
}

.vehicle-table {
  border-top: 1px solid #dce1eb;
}

.vehicle-table-head,
.vehicle-table-row {
  display: grid;

  grid-template-columns:
    1.4fr
    0.8fr
    0.8fr
    1fr
    0.6fr;

  align-items: center;
}

.vehicle-table-head {
  min-height: 29px;

  padding: 0 13px;

  color: #4f5870;
  background: #e9efff;

  font-size: 7px;
}

.vehicle-table-row {
  min-height: 47px;

  padding: 0 13px;

  border-top: 1px solid #e8ebf1;

  color: #242b3e;

  font-size: 8px;
}

.vehicle-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vehicle-icon {
  width: 24px;
  height: 24px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  color: #5260df;
  background: #edf0ff;
}

.green-text {
  color: #168c70;
}

.vehicle-bottom-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 13px;

  margin-top: 13px;
}

.small-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.small-description {
  color: #737a8e;

  font-size: 8px;
  line-height: 1.4;
}

.mini-field {
  display: flex;
  justify-content: space-between;

  padding: 6px;

  margin-top: 6px;

  border: 1px solid #dfe3eb;
  border-radius: 4px;

  color: #596174;

  font-size: 8px;
}

.mini-field strong {
  color: #263047;
}

.mini-button {
  min-height: 22px;

  margin-top: 8px;

  font-size: 7px;
}

.insurance-row {
  display: flex;
  justify-content: space-between;

  padding: 3px 0;

  color: #394155;

  font-size: 8px;
}

.insurance-row strong {
  color: #27304a;
}

.insurance-row.muted {
  color: #a0a5b3;
}

/* ==========================================================
   SEASONAL
========================================================== */

.season-rule {
  margin-top: 10px;
  padding: 9px;

  border: 1px solid #e1e4ec;
  border-radius: 5px;

  background: #ffffff;

  box-shadow: 0 1px 3px rgba(30, 40, 70, 0.04);
}

.season-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  font-size: 8px;
}

.season-date {
  margin-top: 4px;

  color: #72798c;

  font-size: 7px;
}

.season-adjustment {
  display: flex;
  justify-content: space-between;

  margin-top: 10px;

  font-size: 7px;
}

.season-adjustment strong {
  color: #e23f46;
}

.priority-high {
  color: #e0444b;
  background: #ffe5e6;

  border-radius: 3px;

  font-size: 6px;
}

/* ==========================================================
   STUDY ROOM
========================================================== */

.study-layout {
  display: grid;

  grid-template-columns: minmax(0, 1fr) 255px;

  gap: 13px;
}

.free-hour-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 7px 10px;

  border: 1px solid #e0e4ed;
  border-radius: 5px;
}

.peak-window {
  margin-top: 6px;

  padding: 8px;

  border-radius: 5px;

  background: #e9efff;
}

.peak-head {
  display: grid;

  grid-template-columns: 1fr 1fr 1fr;

  color: #5b6377;

  font-size: 7px;
}

.peak-row {
  display: flex;
  align-items: center;
  gap: 5px;

  margin-top: 6px;
}

.peak-row .q-field {
  width: 75px;
}

.peak-row .q-field :deep(.q-field__control) {
  min-height: 24px;
  height: 24px;
}

.peak-row .q-field :deep(.q-field__native) {
  font-size: 7px;
}

.role-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 9px 0;

  border-bottom: 1px solid #eceef3;
}

.role-row:last-child {
  border-bottom: none;
}

.role-row strong {
  display: block;

  color: #343b4f;

  font-size: 8px;
}

.role-row span {
  display: block;

  margin-top: 2px;

  color: #858b9a;

  font-size: 7px;
}

.percentage-input {
  width: 57px;
}

.percentage-input :deep(.q-field__control) {
  min-height: 25px;
  height: 25px;
}

.percentage-input :deep(.q-field__native) {
  font-size: 8px;
}

.cancellation-row {
  display: flex;
  justify-content: space-between;

  padding: 7px 0;

  border-bottom: 1px solid #eceef3;

  color: #555d70;

  font-size: 8px;
}

.cancellation-row strong {
  color: #df454b;
}

/* ==========================================================
   BOTTOM SAVE BAR
========================================================== */

.bottom-save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-top: 13px;
  padding: 7px 10px;

  border: 1px solid #dce1eb;
  border-radius: 6px;

  background: #e9efff;
}

.change-message {
  display: flex;
  align-items: center;
  gap: 5px;

  color: #697185;

  font-size: 7px;
}

.bottom-actions {
  display: flex;
  gap: 7px;
}

/* ==========================================================
   RESPONSIVE
========================================================== */

@media (max-width: 1000px) {
  .pricing-layout,
  .vehicle-layout {
    grid-template-columns: 1fr;
  }

  .study-layout {
    grid-template-columns: 1fr;
  }

  .pricing-side,
  .study-side {
    display: grid;

    grid-template-columns: 1fr 1fr;

    gap: 13px;
  }

  .simulation-card,
  .pricing-card + .pricing-card {
    margin-top: 0;
  }
}

@media (max-width: 700px) {
  .pricing-page {
    padding: 0 12px 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .q-btn {
    flex: 1;
  }

  .form-grid,
  .vehicle-bottom-grid,
  .pricing-side,
  .study-side {
    grid-template-columns: 1fr;
  }

  .rules-table {
    overflow-x: auto;
  }

  .rules-head,
  .rules-row {
    min-width: 600px;
  }

  .vehicle-table {
    overflow-x: auto;
  }

  .vehicle-table-head,
  .vehicle-table-row {
    min-width: 650px;
  }

  .bottom-save-bar {
    align-items: stretch;
    flex-direction: column;
    gap: 8px;
  }

  .bottom-actions {
    justify-content: flex-end;
  }
}
</style>

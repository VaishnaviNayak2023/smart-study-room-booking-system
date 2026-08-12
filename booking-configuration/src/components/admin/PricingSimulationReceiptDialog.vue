<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emit('update:modelValue', $event)">
    <q-card class="sim-receipt-dialog">
      <q-card-section class="sim-receipt-header row items-start justify-between">
        <div>
          <div class="sim-brand">{{ organizationLabel }}</div>
          <div class="sim-brand-sub">Booking Management</div>
        </div>
        <div class="sim-receipt-meta">
          <div class="sim-receipt-title">BOOKING SIMULATION RECEIPT</div>
          <div class="sim-receipt-id">Receipt ID: {{ receiptId }}</div>
          <div class="sim-receipt-date">Date of Issue: {{ issuedLabel }}</div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close simulation receipt" @click="close" />
      </q-card-section>

      <q-separator />

      <q-card-section>
        <div class="sim-details-card">
          <div class="sim-details-title">Simulation Details</div>
          <div class="sim-details-grid">
            <div><span>Resource</span><strong>{{ resourceName }}</strong></div>
            <div><span>Date</span><strong>{{ dateLabel }}</strong></div>
            <div><span>Duration</span><strong>{{ durationLabel }}</strong></div>
          </div>
        </div>

        <div class="sim-table">
          <div class="sim-table-head">
            <div>Description</div>
            <div>Calculation</div>
            <div>Amount</div>
          </div>
          <div
            v-for="(item, index) in lineItems"
            :key="`${item.description}-${index}`"
            class="sim-table-row"
          >
            <div>
              <strong>{{ item.description }}</strong>
              <q-badge
                v-if="item.badge"
                :class="item.badgeClass"
                class="sim-badge q-ml-sm"
              >
                {{ item.badge }}
              </q-badge>
              <div v-if="item.subtext" class="sim-subtext">{{ item.subtext }}</div>
            </div>
            <div>{{ item.calculation }}</div>
            <div :class="item.amountClass">{{ formatAmount(item.amount) }}</div>
          </div>
        </div>

        <div class="sim-totals">
          <div class="sim-total-row">
            <span>Subtotal</span>
            <strong>{{ formatAmount(breakdown?.subtotal ?? 0) }}</strong>
          </div>
          <div class="sim-total-row">
            <span>Tax ({{ breakdown?.taxRate ?? 0 }}%)</span>
            <strong>{{ formatAmount(breakdown?.tax ?? 0) }}</strong>
          </div>
          <div class="sim-final-total">
            <span>Final Estimated</span>
            <strong>{{ formatAmount(breakdown?.total ?? 0) }}</strong>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="sim-actions">
        <q-btn outline no-caps label="Close" @click="close" />
        <q-btn unelevated no-caps color="primary" icon="download" label="Download PDF" @click="downloadPdf" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Notify } from 'quasar';
import { appConfig } from '@/config/app';
import { useSettingsStore } from '@/stores/settings-store';

type BreakdownLine = {
  description: string;
  calculation: string;
  amount: number;
  type?: string;
};

type SimulationBreakdown = {
  lineItems: BreakdownLine[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency?: string;
  hours?: number;
};

const props = defineProps<{
  modelValue: boolean;
  breakdown: SimulationBreakdown | null;
  resourceName: string;
  dateLabel: string;
  durationLabel: string;
  organizationName?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const settingsStore = useSettingsStore();

const organizationLabel = computed(
  () => props.organizationName || settingsStore.systemName || appConfig.appName || 'Booking Portal',
);

const receiptId = computed(() => `SIM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`);
const issuedLabel = computed(() =>
  new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
);

const lineItems = computed(() => {
  const items = props.breakdown?.lineItems || [];
  return items
    .filter((line) => line.type !== 'tax')
    .map((line) => {
      const isDiscount = line.type === 'discount' || line.amount < 0;
      const isSurcharge = line.type === 'surcharge' || line.amount > 0 && line.type !== 'base' && line.type !== 'addon';
      let badge = '';
      if (isDiscount && line.calculation.includes('%')) {
        badge = line.calculation.match(/-?\d+(?:\.\d+)?%/)?.[0] || '';
      } else if (isSurcharge && line.calculation.includes('%')) {
        badge = line.calculation.match(/\+?\d+(?:\.\d+)?%/)?.[0] || '';
      }
      return {
        ...line,
        badge,
        badgeClass: isDiscount ? 'badge-discount' : isSurcharge ? 'badge-surcharge' : '',
        amountClass: isDiscount ? 'amount-discount' : isSurcharge ? 'amount-surcharge' : '',
        subtext: line.type === 'base' ? '' : undefined,
      };
    });
});

function formatAmount(value: number) {
  return settingsStore.formatMoney(value);
}

function close() {
  emit('update:modelValue', false);
}

async function downloadPdf() {
  if (!props.breakdown) return;
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 48;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(organizationLabel.value, margin, y);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('BOOKING SIMULATION RECEIPT', margin, y + 18);
    doc.text(`Receipt ID: ${receiptId.value}`, margin, y + 32);
    doc.text(`Date of Issue: ${issuedLabel.value}`, margin, y + 46);

    y += 70;
    doc.setFont('helvetica', 'bold');
    doc.text('Simulation Details', margin, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    doc.text(`Resource: ${props.resourceName}`, margin, y);
    y += 14;
    doc.text(`Date: ${props.dateLabel}`, margin, y);
    y += 14;
    doc.text(`Duration: ${props.durationLabel}`, margin, y);
    y += 24;

    for (const item of lineItems.value) {
      doc.text(`${item.description} — ${item.calculation}`, margin, y);
      doc.text(formatAmount(item.amount), 520, y, { align: 'right' });
      y += 16;
      if (y > 720) break;
    }

    y += 10;
    doc.text(`Subtotal: ${formatAmount(props.breakdown.subtotal)}`, margin, y);
    y += 14;
    doc.text(`Tax (${props.breakdown.taxRate}%): ${formatAmount(props.breakdown.tax)}`, margin, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.text(`Final Estimated: ${formatAmount(props.breakdown.total)}`, margin, y);

    doc.save(`simulation-receipt-${receiptId.value}.pdf`);
  } catch {
    Notify.create({ type: 'negative', message: 'Unable to generate simulation PDF.' });
  }
}
</script>

<style scoped>
.sim-receipt-dialog {
  width: min(720px, 96vw);
  border-radius: 14px;
}
.sim-receipt-header {
  gap: 12px;
}
.sim-brand {
  font-size: 18px;
  font-weight: 800;
  color: var(--portal-primary);
}
.sim-brand-sub {
  font-size: 12px;
  color: var(--portal-muted);
}
.sim-receipt-meta {
  flex: 1;
  text-align: right;
  padding-right: 8px;
}
.sim-receipt-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--portal-text-secondary);
}
.sim-receipt-id,
.sim-receipt-date {
  font-size: 11px;
  color: var(--portal-muted);
}
.sim-details-card {
  background: var(--portal-muted-bg);
  border: 1px solid var(--portal-border);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}
.sim-details-title {
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--portal-text);
}
.sim-details-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  font-size: 13px;
}
.sim-details-grid span {
  display: block;
  color: var(--portal-muted);
  font-size: 11px;
}
.sim-table-head,
.sim-table-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr 0.7fr;
  gap: 12px;
  align-items: start;
  padding: 10px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 13px;
}
.sim-table-head {
  font-size: 11px;
  font-weight: 700;
  color: var(--portal-muted);
  letter-spacing: 0.04em;
}
.sim-badge {
  font-size: 10px;
}
.badge-surcharge {
  background: #fee2e2;
  color: var(--portal-status-unavailable-text);
}
.badge-discount {
  background: var(--portal-status-confirmed-bg);
  color: var(--portal-status-confirmed-text);
}
.amount-surcharge {
  color: var(--portal-status-unavailable-text);
  font-weight: 700;
}
.amount-discount {
  color: var(--portal-status-confirmed-text);
  font-weight: 700;
}
.sim-subtext {
  font-size: 11px;
  color: var(--portal-muted);
  margin-top: 2px;
}
.sim-totals {
  margin-top: 16px;
  text-align: right;
}
.sim-total-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}
.sim-final-total {
  margin-top: 10px;
  padding: 14px 16px;
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.sim-final-total strong {
  font-size: 22px;
}
.sim-actions {
  padding: 12px 16px;
}
@media (max-width: 640px) {
  .sim-details-grid {
    grid-template-columns: 1fr;
  }
  .sim-table-head,
  .sim-table-row {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Notify } from 'quasar';
import type { jsPDF as PdfDoc } from 'jspdf';
import api from '@/services/api';
import { useSettingsStore } from '@/stores/settings-store';

type LineItem = {
  description: string;
  calculation: string;
  amount: number;
  type?: string;
};

type ReceiptBreakdown = {
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  amount: string;
  currency: string;
  hours?: number;
  billableHours?: number;
  hourlyRate?: number;
};

type ReceiptBooking = {
  id: string;
  resource: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  datetime?: string;
  amount: string;
  status: string;
  user?: string;
  userEmail?: string;
  userPhone?: string;
  userPhoneCountryCode?: string;
  location?: string;
  purpose?: string;
  notes?: string;
  createdAt?: string;
};

const props = defineProps<{
  modelValue: boolean;
  bookingCode: string | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const settingsStore = useSettingsStore();

const loading = ref(false);
const receipt = ref<{
  receiptId: string;
  issuedAt: string;
  organizationName?: string;
  booking: ReceiptBooking;
  breakdown: ReceiptBreakdown;
} | null>(null);

const organizationLabel = computed(
  () => receipt.value?.organizationName || settingsStore.systemName || 'Booking Portal',
);

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const phoneDisplay = computed(() => {
  const booking = receipt.value?.booking;
  if (!booking) return '';
  const code = booking.userPhoneCountryCode || '';
  const phone = booking.userPhone || '';
  return `${code} ${phone}`.trim();
});

watch(
  () => [props.modelValue, props.bookingCode] as const,
  ([visible, code]) => {
    if (visible && code) void loadReceipt(code);
  },
  { immediate: true },
);

async function loadReceipt(code: string) {
  loading.value = true;
  receipt.value = null;
  try {
    const { data } = await api.get<{ receipt: typeof receipt.value }>(`/bookings/${code}/receipt`);
    receipt.value = data.receipt;
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    Notify.create({ type: 'negative', message: message || 'Unable to load receipt.' });
    open.value = false;
  } finally {
    loading.value = false;
  }
}

function formatMoney(value: number) {
  return settingsStore.formatMoney(value);
}

function formatDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function formatDateTime(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const PDF_COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  primaryLight: [238, 244, 255] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function setPdfColor(doc: PdfDoc, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setPdfFill(doc: PdfDoc, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setPdfDraw(doc: PdfDoc, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function drawPdfLabelValue(
  doc: PdfDoc,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setPdfColor(doc, PDF_COLORS.text);
  doc.text(label, x, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(value || '—', width);
  doc.text(lines, x, y + 13);
  return 13 + lines.length * 12;
}

function drawPdfHeader(
  doc: PdfDoc,
  receiptId: string,
  issuedAt: string,
  margin: number,
  contentWidth: number,
  organizationName: string,
) {
  const logoX = margin;
  const logoY = 36;
  const logoSize = 34;

  setPdfFill(doc, PDF_COLORS.primary);
  doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setPdfColor(doc, PDF_COLORS.white);
  doc.text(organizationName.slice(0, 2).toUpperCase(), logoX + logoSize / 2, logoY + logoSize / 2 + 5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setPdfColor(doc, PDF_COLORS.primary);
  doc.text(organizationName, logoX + logoSize + 12, logoY + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setPdfColor(doc, PDF_COLORS.muted);
  doc.text('Booking Management', logoX + logoSize + 12, logoY + 28);

  const metaX = margin + contentWidth;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setPdfColor(doc, PDF_COLORS.text);
  doc.text('BOOKING RECEIPT', metaX, logoY + 8, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setPdfColor(doc, PDF_COLORS.muted);
  doc.text(`Receipt ID: ${receiptId}`, metaX, logoY + 24, { align: 'right' });
  doc.text(`Date of Issue: ${new Date(issuedAt).toLocaleDateString()}`, metaX, logoY + 38, { align: 'right' });

  setPdfDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.75);
  doc.line(margin, 88, margin + contentWidth, 88);

  return 104;
}

function measurePdfLabelValue(doc: PdfDoc, value: string, width: number) {
  const lines = doc.splitTextToSize(value || '—', width);
  return 13 + lines.length * 12;
}

function drawPdfDetailsBox(
  doc: PdfDoc,
  startY: number,
  margin: number,
  contentWidth: number,
  fields: Array<{ label: string; value: string }>,
) {
  const padding = 14;
  const colWidth = (contentWidth - padding * 2) / 2;
  const leftFields = fields.filter((_, index) => index % 2 === 0);
  const rightFields = fields.filter((_, index) => index % 2 === 1);
  const rowCount = Math.max(leftFields.length, rightFields.length);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  let leftHeight = 0;
  let rightHeight = 0;
  for (let i = 0; i < rowCount; i += 1) {
    const leftField = leftFields[i];
    if (leftField) {
      leftHeight += measurePdfLabelValue(doc, leftField.value, colWidth - 8) + 10;
    }
    const rightField = rightFields[i];
    if (rightField) {
      rightHeight += measurePdfLabelValue(doc, rightField.value, colWidth - 8) + 10;
    }
  }
  const boxHeight = padding * 2 + Math.max(leftHeight, rightHeight);

  setPdfFill(doc, PDF_COLORS.primaryLight);
  doc.roundedRect(margin, startY, contentWidth, boxHeight, 10, 10, 'F');

  let leftY = startY + padding + 10;
  let rightY = startY + padding + 10;
  for (let i = 0; i < rowCount; i += 1) {
    const leftField = leftFields[i];
    if (leftField) {
      const used = drawPdfLabelValue(doc, leftField.label, leftField.value, margin + padding, leftY, colWidth - 8);
      leftY += used + 10;
    }
    const rightField = rightFields[i];
    if (rightField) {
      const used = drawPdfLabelValue(
        doc,
        rightField.label,
        rightField.value,
        margin + padding + colWidth,
        rightY,
        colWidth - 8,
      );
      rightY += used + 10;
    }
  }

  return startY + boxHeight + 18;
}

function drawPdfTable(
  doc: PdfDoc,
  startY: number,
  margin: number,
  contentWidth: number,
  lineItems: LineItem[],
) {
  const colDesc = margin + 12;
  const colCalc = margin + contentWidth * 0.42;
  const colAmount = margin + contentWidth - 12;
  const rowHeight = 28;
  const headerHeight = 30;
  const bodyHeight = lineItems.length * rowHeight;
  const tableHeight = headerHeight + bodyHeight;

  setPdfDraw(doc, PDF_COLORS.border);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, startY, contentWidth, tableHeight, 8, 8);

  setPdfFill(doc, PDF_COLORS.primaryLight);
  doc.roundedRect(margin, startY, contentWidth, headerHeight, 8, 8, 'F');
  doc.rect(margin, startY + headerHeight - 8, contentWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setPdfColor(doc, PDF_COLORS.text);
  doc.text('Description', colDesc, startY + 19);
  doc.text('Calculation', colCalc, startY + 19);
  doc.text('Amount', colAmount, startY + 19, { align: 'right' });

  let y = startY + headerHeight + 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  for (const [index, item] of lineItems.entries()) {
    if (index > 0) {
      setPdfDraw(doc, PDF_COLORS.border);
      doc.line(margin + 10, y - 12, margin + contentWidth - 10, y - 12);
    }
    setPdfColor(doc, PDF_COLORS.text);
    doc.text(item.description, colDesc, y);
    setPdfColor(doc, PDF_COLORS.muted);
    doc.text(item.calculation, colCalc, y);
    setPdfColor(doc, PDF_COLORS.text);
    doc.text(formatMoney(item.amount), colAmount, y, { align: 'right' });
    y += rowHeight;
  }

  return startY + tableHeight + 16;
}

function drawPdfTotals(
  doc: PdfDoc,
  startY: number,
  margin: number,
  contentWidth: number,
  breakdown: ReceiptBreakdown,
) {
  const totalsX = margin + contentWidth;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setPdfColor(doc, PDF_COLORS.muted);
  doc.text(`Subtotal: ${formatMoney(breakdown.subtotal)}`, totalsX, startY, { align: 'right' });
  doc.text(`Tax (${breakdown.taxRate}%): ${formatMoney(breakdown.tax)}`, totalsX, startY + 16, {
    align: 'right',
  });

  const bannerY = startY + 34;
  const bannerHeight = 38;
  setPdfFill(doc, PDF_COLORS.primary);
  doc.roundedRect(margin, bannerY, contentWidth, bannerHeight, 8, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setPdfColor(doc, PDF_COLORS.white);
  doc.text(`Final Estimated: ${formatMoney(breakdown.total)}`, margin + contentWidth / 2, bannerY + 25, {
    align: 'center',
  });

  return bannerY + bannerHeight + 20;
}

async function downloadPdf() {
  if (!receipt.value) return;
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const r = receipt.value;
    const b = r.booking;
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - margin * 2;
    const duration = `${r.breakdown.billableHours ?? r.breakdown.hours ?? '—'} Hrs`;
    const lineItems = r.breakdown.lineItems.filter((line) => line.type !== 'tax');

    let y = drawPdfHeader(doc, r.receiptId, r.issuedAt, margin, contentWidth, organizationLabel.value);

    const detailFields = [
      { label: 'Booking ID', value: b.id },
      { label: 'Date', value: formatDate(b.date) },
      { label: 'Status', value: b.status },
      { label: 'Duration', value: duration },
      { label: 'Customer', value: b.user || '—' },
      { label: 'Email', value: b.userEmail || '—' },
      { label: 'Phone', value: phoneDisplay.value || '—' },
      { label: 'Resource', value: b.resource },
      { label: 'Time', value: `${b.startTime || '—'} - ${b.endTime || '—'}` },
      { label: 'Location', value: b.location || '—' },
      { label: 'Booked On', value: formatDateTime(b.createdAt) },
      { label: 'Total Charged', value: formatMoney(r.breakdown.total) },
    ];

    if (b.purpose) detailFields.push({ label: 'Purpose', value: b.purpose });
    if (b.notes) detailFields.push({ label: 'Notes', value: b.notes });

    y = drawPdfDetailsBox(doc, y, margin, contentWidth, detailFields);
    y = drawPdfTable(doc, y, margin, contentWidth, lineItems);
    drawPdfTotals(doc, y, margin, contentWidth, r.breakdown);

    doc.save(`${b.id || 'receipt'}.pdf`);
  } catch (error) {
    console.error('PDF download failed', error);
    Notify.create({ type: 'negative', message: 'PDF download failed.' });
  }
}
</script>

<template>
  <q-dialog v-model="open" persistent>
    <q-card class="receipt-card">
      <q-card-section class="receipt-header row items-start justify-between">
        <div>
          <div class="brand-row">
            <q-avatar size="36px" color="primary" text-color="white" icon="apartment" />
            <div>
              <div class="brand-title">{{ organizationLabel }}</div>
              <div class="brand-sub">Booking Management</div>
            </div>
          </div>
        </div>
        <div class="receipt-meta text-right">
          <div class="receipt-title">BOOKING RECEIPT</div>
          <div v-if="receipt">Receipt ID: {{ receipt.receiptId }}</div>
          <div v-if="receipt">Date of Issue: {{ new Date(receipt.issuedAt).toLocaleDateString() }}</div>
        </div>
        <q-btn flat round dense icon="close" @click="open = false" />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="primary" size="32px" />
      </q-card-section>

      <q-card-section v-else-if="receipt" class="q-gutter-md">
        <div class="details-box row q-col-gutter-md">
          <div class="col-6 col-md-3"><strong>Booking ID</strong><div>{{ receipt.booking.id }}</div></div>
          <div class="col-6 col-md-3"><strong>Status</strong><div>{{ receipt.booking.status }}</div></div>
          <div class="col-6 col-md-3"><strong>Date</strong><div>{{ formatDate(receipt.booking.date) }}</div></div>
          <div class="col-6 col-md-3">
            <strong>Duration</strong>
            <div>{{ receipt.breakdown.billableHours ?? receipt.breakdown.hours }} Hrs</div>
          </div>
        </div>

        <div class="details-box row q-col-gutter-md">
          <div class="col-12 col-md-6"><strong>Customer</strong><div>{{ receipt.booking.user || '—' }}</div></div>
          <div class="col-12 col-md-6"><strong>Email</strong><div>{{ receipt.booking.userEmail || '—' }}</div></div>
          <div class="col-12 col-md-6"><strong>Phone</strong><div>{{ phoneDisplay || '—' }}</div></div>
          <div class="col-12 col-md-6"><strong>Resource</strong><div>{{ receipt.booking.resource }}</div></div>
          <div class="col-12 col-md-6"><strong>Time</strong><div>{{ receipt.booking.startTime }} - {{ receipt.booking.endTime }}</div></div>
          <div class="col-12 col-md-6"><strong>Location</strong><div>{{ receipt.booking.location || '—' }}</div></div>
          <div class="col-12 col-md-6"><strong>Booked On</strong><div>{{ formatDateTime(receipt.booking.createdAt) }}</div></div>
          <div class="col-12 col-md-6"><strong>Total Charged</strong><div>{{ formatMoney(receipt.breakdown.total) }}</div></div>
          <div v-if="receipt.booking.purpose" class="col-12"><strong>Purpose</strong><div>{{ receipt.booking.purpose }}</div></div>
          <div v-if="receipt.booking.notes" class="col-12"><strong>Notes</strong><div>{{ receipt.booking.notes }}</div></div>
        </div>

        <q-markup-table flat bordered class="receipt-table">
          <thead>
            <tr>
              <th class="text-left">Description</th>
              <th class="text-left">Calculation</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in receipt.breakdown.lineItems.filter((line) => line.type !== 'tax')" :key="index">
              <td>{{ item.description }}</td>
              <td>{{ item.calculation }}</td>
              <td class="text-right">{{ formatMoney(item.amount) }}</td>
            </tr>
          </tbody>
        </q-markup-table>

        <div class="totals">
          <div>Subtotal: {{ formatMoney(receipt.breakdown.subtotal) }}</div>
          <div>Tax ({{ receipt.breakdown.taxRate }}%): {{ formatMoney(receipt.breakdown.tax) }}</div>
          <div class="final-total">
            Final Estimated: {{ formatMoney(receipt.breakdown.total) }}
          </div>
        </div>

      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat no-caps label="Close" @click="open = false" />
        <q-btn unelevated no-caps color="primary" icon="download" label="Download PDF" @click="downloadPdf" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.receipt-card {
  width: min(760px, 95vw);
  border-radius: 12px;
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--portal-primary);
}
.brand-sub {
  font-size: 11px;
  color: var(--portal-muted);
}
.receipt-title {
  font-weight: 700;
  letter-spacing: 0.04em;
}
.details-box {
  background: #eef4ff;
  border-radius: 10px;
  padding: 14px;
}
.totals {
  text-align: right;
  display: grid;
  gap: 6px;
  color: var(--portal-muted);
  font-size: 14px;
}
.receipt-table {
  border-radius: 8px;
  overflow: hidden;
}
.receipt-table :deep(thead tr) {
  background: #eef4ff;
}
.receipt-table :deep(th) {
  font-size: 12px;
  font-weight: 700;
  color: var(--portal-text);
}
.receipt-table :deep(td) {
  font-size: 13px;
  color: var(--portal-text-secondary);
}
.receipt-table :deep(tbody tr:not(:last-child) td) {
  border-bottom: 1px solid #e2e8f0;
}
.final-total {
  margin-top: 8px;
  padding: 12px 16px;
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  border-radius: 8px;
  font-size: 18px;
  font-weight: 700;
}
</style>

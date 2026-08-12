<template>
  <q-page class="portal-page reports-page">
    <div class="page-header">
      <div>
        <h1>Reports & Analytics</h1>
        <p>Overview of platform performance and routing efficiency.</p>
      </div>
      <div class="header-actions">
        <q-btn outline no-caps icon="event" :label="rangeLabel" class="ghost-btn" />
        <q-btn unelevated no-caps icon="download" label="Export Report" class="primary-btn" :disable="loading || !hasData" @click="exportReport" />
      </div>
    </div>

    <div v-if="loading" class="portal-loading"><q-spinner color="primary" size="32px" /> Loading reports…</div>
    <div v-else-if="error" class="portal-error"><div>{{ error }}</div><q-btn unelevated no-caps color="primary" label="Retry" @click="loadReports" /></div>
    <template v-else>
      <div class="stats-grid">
        <q-card v-for="stat in stats" :key="stat.label" flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-top">
              <div class="stat-label">{{ stat.label }}</div>
              <div class="stat-icon" :class="`stat-icon-${stat.color}`"><q-icon :name="stat.icon" size="18px" /></div>
            </div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-trend" :class="trendClass(stat.trend)">{{ formatTrend(stat.trend) }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="reports-grid">
        <q-card flat bordered class="chart-card">
          <q-card-section>
            <div class="section-head">
              <div class="section-title">Bookings by Status</div>
              <div class="view-toggle">
                <button class="toggle" :class="{ active: chartView === 'status' }" @click="chartView = 'status'">Status</button>
                <button class="toggle" :class="{ active: chartView === 'volume' }" @click="chartView = 'volume'">Volume</button>
              </div>
            </div>
            <div v-if="!statusBreakdown.length" class="portal-empty">No booking data available yet.</div>
            <div v-else class="status-breakdown">
              <div v-for="item in statusBreakdown" :key="item.label" class="breakdown-row">
                <div class="breakdown-label"><span class="dot" :style="{ background: item.color }"></span>{{ item.label }}</div>
                <div class="breakdown-bar"><div class="breakdown-fill" :style="{ width: `${item.percent}%`, background: item.color }"></div></div>
                <div class="breakdown-value">{{ item.count }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="chart-card">
          <q-card-section>
            <div class="section-title">Top Resources Utilization</div>
            <div v-if="!topResources.length" class="portal-empty">No resource utilization data yet.</div>
            <div v-else class="top-resources">
              <div v-for="res in topResources" :key="res.name" class="resource-row">
                <div class="resource-head">
                  <div class="resource-name">{{ res.name }}</div>
                  <div class="resource-meta">{{ res.bookings }} bookings · {{ res.utilization }}%</div>
                </div>
                <q-linear-progress :value="res.utilization / 100" color="primary" size="8px" rounded />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { useDashboardEvents } from '@/stores/dashboard-events';

type Stat = { label: string; value: string; icon: string; color: string; trend: number };
type StatusItem = { label: string; count: number; percent: number; color?: string };
type ResourceItem = { name: string; bookings: number; utilization: number };

const dashboardEvents = useDashboardEvents();
const loading = ref(true);
const error = ref('');
const stats = ref<Stat[]>([]);
const statusBreakdown = ref<StatusItem[]>([]);
const topResources = ref<ResourceItem[]>([]);
const chartView = ref<'status' | 'volume'>('status');
const rangeLabel = 'Last 30 Days';

const hasData = computed(() => stats.value.length > 0 || statusBreakdown.value.length > 0 || topResources.value.length > 0);

function trendClass(trend: number) {
  if (trend > 0) return 'trend-up';
  if (trend < 0) return 'trend-down';
  return 'trend-flat';
}

function formatTrend(trend: number) {
  if (trend === 0) return '— No change vs last month';
  return `${trend > 0 ? '+' : ''}${trend}% vs last month`;
}

async function loadReports() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ stats: Stat[]; statusBreakdown: StatusItem[]; topResources: ResourceItem[] }>('/reports');
    stats.value = data.stats || [];
    statusBreakdown.value = data.statusBreakdown || [];
    topResources.value = data.topResources || [];
  } catch {
    error.value = 'Unable to load reports.';
  } finally {
    loading.value = false;
  }
}

function exportReport() {
  const rows = [
    ['Metric', 'Value', 'Trend vs last month'],
    ...stats.value.map((s) => [s.label, s.value, String(s.trend)]),
    [],
    ['Status', 'Count', 'Percent'],
    ...statusBreakdown.value.map((s) => [s.label, String(s.count), `${s.percent}%`]),
    [],
    ['Resource', 'Bookings', 'Utilization %'],
    ...topResources.value.map((r) => [r.name, String(r.bookings), String(r.utilization)]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `booking-report-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  Notify.create({ type: 'positive', message: 'Report exported successfully.' });
}

let stopWatcher: (() => void) | undefined;
onMounted(() => {
  void loadReports();
  stopWatcher = watch(() => dashboardEvents.version, () => { void loadReports(); });
});
onUnmounted(() => { stopWatcher?.(); });
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
.page-header h1 { margin: 0; font-size: clamp(26px, 3vw, 32px); font-weight: 750; }
.page-header p { margin: 6px 0 0; color: var(--portal-muted); }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.primary-btn { background: var(--portal-primary); color: var(--portal-on-primary); border-radius: 10px; min-height: 40px; }
.ghost-btn { border-radius: 10px; border-color: var(--portal-border); color: var(--portal-text-secondary); min-height: 40px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.stat-card { border-radius: 14px; border-color: var(--portal-border); }
.stat-top { display: flex; justify-content: space-between; align-items: center; }
.stat-label { color: var(--portal-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.4px; }
.stat-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon-green { background: var(--portal-status-confirmed-bg); color: var(--portal-status-confirmed-text); }
.stat-icon-blue { background: var(--portal-status-pending-bg); color: var(--portal-status-booked-text); }
.stat-icon-purple { background: #ede9fe; color: #6d28d9; }
.stat-icon-orange { background: #ffedd5; color: #c2410c; }
.stat-value { margin-top: 10px; font-size: 24px; font-weight: 750; }
.stat-trend { margin-top: 4px; font-size: 12px; }
.trend-up { color: var(--portal-status-confirmed-text); }
.trend-down { color: var(--portal-error); }
.trend-flat { color: var(--portal-muted); }
.reports-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; }
.chart-card { border-radius: 14px; border-color: var(--portal-border); min-height: 280px; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.section-title { font-size: 16px; font-weight: 700; }
.view-toggle { display: flex; gap: 4px; background: var(--portal-summary-bg); padding: 3px; border-radius: 8px; }
.toggle { border: none; background: transparent; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; color: var(--portal-muted); }
.toggle.active { background: var(--portal-card); color: var(--portal-primary); font-weight: 600; }
.status-breakdown { padding-top: 4px; }
.breakdown-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; }
.breakdown-label { display: flex; align-items: center; gap: 6px; width: 120px; font-size: 13px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.breakdown-bar { flex: 1; height: 8px; border-radius: 999px; background: var(--portal-border-subtle); overflow: hidden; }
.breakdown-fill { height: 100%; border-radius: 999px; }
.breakdown-value { width: 36px; text-align: right; font-weight: 700; font-size: 13px; }
.top-resources { padding-top: 8px; }
.resource-row { padding: 10px 0; }
.resource-head { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.resource-name { font-weight: 600; }
.resource-meta { color: var(--portal-muted); font-size: 12px; }
@media (max-width: 1100px) { .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .reports-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .stats-grid { grid-template-columns: 1fr; } }
</style>

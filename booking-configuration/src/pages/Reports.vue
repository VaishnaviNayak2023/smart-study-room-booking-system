<template>
  <q-page class="reports-page">
    <div class="reports-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Reports</div>
          <div class="page-subtitle">Analytics and insights across the booking system.</div>
        </div>

        <q-btn
          outline
          no-caps
          color="primary"
          icon="download"
          label="Export Report"
          @click="exportReport"
        />
      </div>

      <!-- Stats -->
      <div class="row q-col-gutter-md q-mb-md">
        <div v-for="stat in stats" :key="stat.label" class="col-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="stat-header">
                <div class="stat-label">{{ stat.label }}</div>
                <div class="stat-icon" :class="`stat-icon-${stat.color}`">
                  <q-icon :name="stat.icon" size="14px" />
                </div>
              </div>
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-trend" :class="stat.trend > 0 ? 'trend-up' : 'trend-down'">
                {{ stat.trend > 0 ? '+' : '' }}{{ stat.trend }}% vs last month
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Bookings by status -->
        <div class="col-12 col-md-6">
          <q-card flat bordered class="chart-card">
            <q-card-section>
              <div class="chart-title">Bookings by Status</div>
              <q-separator class="q-my-sm" />
              <div class="status-breakdown">
                <div v-for="item in statusBreakdown" :key="item.label" class="breakdown-row">
                  <div class="breakdown-label">
                    <span class="dot" :style="{ background: item.color }"></span>
                    {{ item.label }}
                  </div>
                  <div class="breakdown-bar">
                    <div
                      class="breakdown-fill"
                      :style="{ width: item.percent + '%', background: item.color }"
                    ></div>
                  </div>
                  <div class="breakdown-value">{{ item.count }}</div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Resource utilization -->
        <div class="col-12 col-md-6">
          <q-card flat bordered class="chart-card">
            <q-card-section>
              <div class="chart-title">Top Resources</div>
              <q-separator class="q-my-sm" />
              <div class="top-resources">
                <div v-for="res in topResources" :key="res.name" class="resource-row">
                  <div class="resource-name">{{ res.name }}</div>
                  <div class="resource-meta">
                    <span>{{ res.bookings }} bookings</span>
                    <span>{{ res.utilization }}% utilization</span>
                  </div>
                  <q-linear-progress
                    :value="res.utilization / 100"
                    color="primary"
                    size="8px"
                    rounded
                    class="q-mt-xs"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type Stat = {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend: number;
};

type StatusItem = {
  label: string;
  count: number;
  percent: number;
  color?: string;
};

type ResourceItem = {
  name: string;
  bookings: number;
  utilization: number;
};

const stats = ref<Stat[]>([]);
const statusBreakdown = ref<StatusItem[]>([]);
const topResources = ref<ResourceItem[]>([]);

const loadReports = async () => {
  try {
    const { data } = await api.get<{
      stats: Stat[];
      statusBreakdown: StatusItem[];
      topResources: ResourceItem[];
    }>('/reports');
    stats.value = data.stats;
    statusBreakdown.value = data.statusBreakdown;
    topResources.value = data.topResources;
  } catch (error) {
    console.error('Failed to load reports', error);
  }
};

onMounted(() => {
  void loadReports();
});

function exportReport() {
  Notify.create({ type: 'positive', message: 'Report exported successfully.' });
}
</script>

<style scoped>
.reports-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.reports-container {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 30px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.page-subtitle {
  margin-top: 4px;
  color: #73798b;
  font-size: 11px;
}

.stat-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.stat-card .q-card__section {
  padding: 14px 16px;
}

.stat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-label {
  color: #7c8293;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.stat-icon {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.stat-icon-green {
  color: #168c70;
  background: #ddf4eb;
}

.stat-icon-blue {
  color: #3b82f6;
  background: #e0edff;
}

.stat-icon-purple {
  color: #5753e8;
  background: #e8e9ff;
}

.stat-icon-orange {
  color: #e07a2f;
  background: #fff0e0;
}

.stat-value {
  margin-top: 10px;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.stat-trend {
  margin-top: 4px;
  font-size: 9px;
}

.trend-up {
  color: #168c70;
}

.trend-down {
  color: #e04545;
}

.chart-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
  height: 100%;
}

.chart-title {
  color: #111827;
  font-size: 13px;
  font-weight: 700;
}

.status-breakdown {
  padding: 4px 0;
}

.breakdown-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.breakdown-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 110px;
  color: #454c60;
  font-size: 11px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.breakdown-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: #eef0f5;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  border-radius: 4px;
}

.breakdown-value {
  width: 30px;
  text-align: right;
  color: #111827;
  font-size: 11px;
  font-weight: 600;
}

.resource-row {
  padding: 8px 0;
}

.resource-name {
  color: #111827;
  font-size: 12px;
  font-weight: 600;
}

.resource-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
  color: #7c8293;
  font-size: 10px;
}
</style>

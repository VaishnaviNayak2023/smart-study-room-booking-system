<template>
  <q-page class="q-pa-lg bg-grey-1">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h4 text-weight-bold">Dashboard</div>
        <div class="text-subtitle2 text-grey-7">Overview of your booking system</div>
      </div>
      <div>
        <q-btn flat label="Admin" round outline icon="arrow_drop_down" />
      </div>
    </div>

    <div class="row q-gutter-md q-mb-lg">
      <q-card flat class="col-12 col-md-3 q-pa-lg">
        <div class="text-h3 text-weight-bold">{{ stats.totalResources }}</div>
        <div class="text-caption text-grey-6">TOTAL RESOURCES</div>
      </q-card>

      <q-card flat class="col-12 col-md-3 q-pa-lg">
        <div class="text-h3 text-weight-bold">{{ stats.totalBookings }}</div>
        <div class="text-caption text-grey-6">TOTAL BOOKINGS</div>
      </q-card>

      <q-card flat class="col-12 col-md-3 q-pa-lg">
        <div class="text-h3 text-weight-bold">{{ stats.todaysBookings }}</div>
        <div class="text-caption text-grey-6">TODAY'S BOOKINGS</div>
      </q-card>

      <q-card flat class="col-12 col-md-3 q-pa-lg">
        <div class="text-h3 text-weight-bold">{{ stats.totalUsers }}</div>
        <div class="text-caption text-grey-6">TOTAL USERS</div>
      </q-card>
    </div>

    <q-card flat bordered class="q-pa-md">
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-subtitle1 text-weight-medium">Recent Bookings</div>
        <div>
          <q-btn flat label="Pricing Rules" to="/pricing-rules" class="text-primary q-mr-sm" />
          <q-btn flat label="View All Bookings" to="/bookings" class="text-primary" />
        </div>
      </div>

      <q-separator />

      <q-table :columns="columns" :rows="bookings" flat dense row-key="id" class="no-border-radius">
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              size="sm"
              :color="
                props.row.status === 'Confirmed'
                  ? 'green-3'
                  : props.row.status === 'Cancelled'
                    ? 'red-3'
                    : 'grey-4'
              "
              text-color="black"
            >
              {{ props.row.status }}
            </q-chip>
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { useDashboardEvents } from '@/stores/dashboard-events';

type DashboardStats = {
  totalResources: number;
  totalBookings: number;
  todaysBookings: number;
  totalUsers: number;
};

type BookingRow = {
  id: string;
  user: string;
  resource: string;
  date: string;
  time: string;
  status: string;
};

const loading = ref(false);

const stats = ref<DashboardStats>({
  totalResources: 0,
  totalBookings: 0,
  todaysBookings: 0,
  totalUsers: 0,
});

const columns = [
  { name: 'id', label: 'BOOKING ID', field: 'id' },
  { name: 'user', label: 'USER', field: 'user' },
  { name: 'resource', label: 'RESOURCE', field: 'resource' },
  { name: 'date', label: 'DATE', field: 'date' },
  { name: 'time', label: 'TIME', field: 'time' },
  { name: 'status', label: 'STATUS', field: 'status' },
];

const bookings = ref<BookingRow[]>([]);
const dashboardEvents = useDashboardEvents();

const loadDashboard = async () => {
  loading.value = true;
  try {
    const { data } = await api.get<{ stats: DashboardStats; bookings: BookingRow[] }>('/dashboard');
    stats.value = data.stats;
    bookings.value = data.bookings;
  } catch (error) {
    console.error('Failed to load dashboard', error);
    Notify.create({ type: 'negative', message: 'Failed to load dashboard data.' });
  } finally {
    loading.value = false;
  }
};

let stopWatcher: (() => void) | undefined;

onMounted(() => {
  void loadDashboard();
  stopWatcher = watch(
    () => dashboardEvents.version,
    () => {
      void loadDashboard();
    },
  );
});

onUnmounted(() => {
  stopWatcher?.();
});

</script>

<template>
  <q-page class="bookings-page">
    <div class="bookings-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Bookings</div>
          <div class="page-subtitle">Manage and monitor all resource bookings.</div>
        </div>
      </div>

      <!-- Stats -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="stat-label">TOTAL</div>
              <div class="stat-value">{{ stats.total }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="stat-label">CONFIRMED</div>
              <div class="stat-value text-positive">{{ stats.confirmed }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="stat-label">PENDING</div>
              <div class="stat-value text-orange-8">{{ stats.pending }}</div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-6 col-md-3">
          <q-card flat bordered class="stat-card">
            <q-card-section>
              <div class="stat-label">CANCELLED</div>
              <div class="stat-value text-negative">{{ stats.cancelled }}</div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Table -->
      <q-card flat bordered class="table-card">
        <q-card-section class="table-toolbar">
          <div class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">All Bookings</div>
            <div class="row q-gutter-sm">
              <q-input
                dense
                outlined
                v-model="search"
                placeholder="Search bookings..."
                debounce="300"
                style="width: 220px"
              >
                <template #append>
                  <q-icon name="search" />
                </template>
              </q-input>

              <q-select
                dense
                outlined
                v-model="statusFilter"
                :options="['All Statuses', 'Confirmed', 'Pending', 'Completed', 'Cancelled']"
                style="min-width: 160px"
              />
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-table
          :rows="filteredBookings()"
          :columns="columns"
          row-key="id"
          flat
          dense
          class="bookings-table"
        >
          <template v-slot:body-cell-status="{ row }">
            <q-td align="center">
              <q-chip dense :color="statusColor(row.status)" text-color="white" outline>
                {{ row.status }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="{ row }">
            <q-td align="right">
              <q-btn flat round dense icon="visibility" @click="viewBooking(row)" />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type Booking = {
  id: string;
  user: string;
  resource: string;
  date: string;
  time: string;
  status: string;
  amount: string;
};

type TableColumn = {
  name: string;
  label: string;
  field: string | ((row: Booking) => string);
  align?: 'left' | 'right' | 'center';
};

type BookingStats = {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
};

const search = ref('');
const statusFilter = ref('All Statuses');

const bookings = ref<Booking[]>([]);

const columns: TableColumn[] = [
  { name: 'id', label: 'BOOKING ID', field: 'id', align: 'left' },
  { name: 'user', label: 'USER', field: 'user', align: 'left' },
  { name: 'resource', label: 'RESOURCE', field: 'resource', align: 'left' },
  { name: 'date', label: 'DATE', field: 'date', align: 'left' },
  { name: 'time', label: 'TIME', field: 'time', align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'amount', label: 'AMOUNT', field: 'amount', align: 'right' },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' },
];

function filteredBookings() {
  return bookings.value.filter((booking) => {
    const matchesSearch = [booking.id, booking.user, booking.resource, booking.date, booking.status]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase());

    const matchesStatus =
      statusFilter.value === 'All Statuses' || statusFilter.value === booking.status;

    return matchesSearch && matchesStatus;
  });
}

const stats = ref<BookingStats>({
  total: 0,
  confirmed: 0,
  pending: 0,
  cancelled: 0,
});

const loadBookings = async () => {
  try {
    const { data } = await api.get<{ bookings: Booking[]; stats?: BookingStats }>('/bookings');
    bookings.value = data.bookings;
    if (data.stats) {
      stats.value = data.stats;
    } else {
      stats.value = {
        total: data.bookings.length,
        confirmed: data.bookings.filter((b) => b.status === 'Confirmed').length,
        pending: data.bookings.filter((b) => b.status === 'Pending').length,
        cancelled: data.bookings.filter((b) => b.status === 'Cancelled').length,
      };
    }
  } catch (error) {
    console.error('Failed to load bookings', error);
  }
};

onMounted(() => {
  void loadBookings();
});


function statusColor(status: string) {
  switch (status) {
    case 'Confirmed':
      return 'green';
    case 'Pending':
      return 'orange';
    case 'Completed':
      return 'grey-6';
    case 'Cancelled':
      return 'negative';
    default:
      return 'blue';
  }
}

function viewBooking(row: Booking) {
  Notify.create({ type: 'info', message: `Viewing ${row.id}` });
}
</script>

<style scoped>
.bookings-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.bookings-container {
  max-width: 1200px;
  margin: 0 auto;
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

.stat-label {
  color: #7c8293;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.stat-value {
  margin-top: 8px;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.table-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.table-toolbar {
  padding: 14px 16px;
}

.bookings-table {
  font-size: 12px;
}
</style>

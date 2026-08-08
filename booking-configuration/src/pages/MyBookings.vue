<template>
  <q-page class="q-pa-lg bg-grey-1">
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h4 text-weight-bold">My Bookings</div>
        <div class="text-subtitle2 text-grey-7">Manage your upcoming and past reservations.</div>
      </div>

      <div class="col-12 col-md-6">
        <q-input
          dense
          rounded
          debounce="300"
          placeholder="Search rooms, bookings..."
          v-model="search"
          append-icon="search"
          class="bg-white"
        />
      </div>
    </div>

    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-8">
        <q-card class="q-pa-lg shadow-2">
          <div class="row items-center justify-between">
            <div>
              <q-chip dense outline color="green-4" text-color="black">Upcoming</q-chip>
              <div class="text-h6 q-mt-sm">{{ upcoming.resource }}</div>
              <div class="text-caption text-grey-7">{{ upcoming.location }}</div>
            </div>

            <div class="text-right">
              <div class="text-h6 text-primary">{{ upcoming.amount }}</div>
              <div class="text-caption text-grey-7">{{ upcoming.dateLabel }}</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="row items-center q-pa-sm">
            <div class="col-6">
              <div class="text-caption text-grey-6">Date</div>
              <div class="text-body1 q-mt-sm">{{ upcoming.date }}</div>
            </div>
            <div class="col-6">
              <div class="text-caption text-grey-6">Time</div>
              <div class="text-body1 q-mt-sm">{{ upcoming.time }}</div>
            </div>
          </div>

          <div class="row q-mt-md">
            <div class="col-auto">
              <q-btn unelevated color="primary" label="Modify" @click="modifyBooking(upcoming)" />
            </div>
            <div class="col-auto">
              <q-btn unelevated color="negative" label="Cancel" @click="cancelBooking(upcoming)" />
            </div>
          </div>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <div class="row q-col-gutter-md">
          <q-card flat class="col-12 q-pa-md bg-white shadow-1">
            <div class="text-caption text-grey-6">TOTAL BOOKINGS</div>
            <div class="text-h5 text-weight-bold q-mt-sm">{{ stats.totalBookings }}</div>
          </q-card>
          <q-card flat class="col-12 q-pa-md bg-white shadow-1">
            <div class="text-caption text-grey-6">HOURS LOGGED</div>
            <div class="text-h5 text-weight-bold q-mt-sm">{{ stats.hoursLogged }}</div>
          </q-card>
        </div>
      </div>
    </div>

    <div class="row q-gutter-md">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-subtitle1">All Bookings</div>
              <q-select
                dense
                outlined
                :options="[
                  'All Statuses',
                  'Upcoming',
                  'Confirmed',
                  'Pending',
                  'Completed',
                  'Cancelled',
                ]"
                v-model="statusFilter"
                style="max-width: 220px"
              />
            </div>

            <q-table
              :rows="filteredBookings"
              :columns="columns"
              row-key="id"
              flat
              dense
              class="no-border-radius"
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
                  <q-btn
                    flat
                    round
                    dense
                    icon="close"
                    color="negative"
                    @click="cancelBooking(row)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Notify } from 'quasar';

type Booking = {
  id: string;
  resource: string;
  datetime: string;
  status: string;
  amount: string;
};

type TableColumn = {
  name: string;
  label: string;
  field: string | ((row: Booking) => string);
  align?: 'left' | 'right' | 'center';
};

const search = ref('');
const statusFilter = ref('All Statuses');

const stats = ref({
  totalBookings: 24,
  hoursLogged: 48.5,
});

const upcoming = ref({
  id: 'BK1001',
  resource: 'Study Room A101',
  location: 'Main Library, 1st Floor',
  date: '24 May 2024',
  time: '10:00 AM - 12:00 PM',
  dateLabel: 'Tomorrow',
  amount: '$15.00',
});

const bookings = ref<Booking[]>([
  {
    id: 'BK1001',
    resource: 'Study Room B205',
    datetime: '28 May 2024 — 02:00 PM - 04:00 PM',
    status: 'Confirmed',
    amount: '$20.00',
  },
  {
    id: 'BK1002',
    resource: 'Lab 4C (Equipment)',
    datetime: '02 Jun 2024 — 09:00 AM - 12:00 PM',
    status: 'Pending',
    amount: '$0.00',
  },
  {
    id: 'BK1003',
    resource: 'Study Room A101',
    datetime: '15 May 2024 — 10:00 AM - 12:00 PM',
    status: 'Completed',
    amount: '$15.00',
  },
  {
    id: 'BK1004',
    resource: 'Conference Room 1',
    datetime: '10 May 2024 — 01:00 PM - 02:00 PM',
    status: 'Cancelled',
    amount: '$25.00',
  },
]);

const columns: TableColumn[] = [
  { name: 'resource', label: 'RESOURCE', field: (r: Booking) => r.resource, align: 'left' },
  { name: 'datetime', label: 'DATE & TIME', field: (r: Booking) => r.datetime, align: 'left' },
  { name: 'status', label: 'STATUS', field: 'status', align: 'center' },
  { name: 'amount', label: 'AMOUNT', field: (r: Booking) => r.amount, align: 'right' },
  { name: 'actions', label: 'ACTIONS', field: 'actions', align: 'right' },
];

const filteredBookings = computed(() => {
  return bookings.value.filter((booking) => {
    const matchesSearch = [booking.resource, booking.datetime, booking.status, booking.amount]
      .join(' ')
      .toLowerCase()
      .includes(search.value.toLowerCase());

    const matchesStatus =
      statusFilter.value === 'All Statuses' || statusFilter.value === booking.status;

    return matchesSearch && matchesStatus;
  });
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
  Notify.create({ type: 'info', message: `Viewing ${row.resource}` });
}

function cancelBooking(row: { resource: string }) {
  Notify.create({ type: 'negative', message: `Cancelling ${row.resource}` });
}

function modifyBooking(row: { id: string }) {
  Notify.create({ type: 'warning', message: `Modify booking ${row.id}` });
}
</script>

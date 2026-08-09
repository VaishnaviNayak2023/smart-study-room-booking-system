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
        <q-card v-if="upcoming" class="q-pa-lg shadow-2">
          <div class="row items-center justify-between">
            <div>
              <q-chip dense outline color="green-4" text-color="black">Upcoming</q-chip>
              <div class="text-h6 q-mt-sm">{{ upcoming.resource }}</div>
              <div class="text-caption text-grey-7">{{ upcoming.status }}</div>
            </div>

            <div class="text-right">
              <div class="text-h6 text-primary">{{ upcoming.amount }}</div>
              <div class="text-caption text-grey-7">{{ upcoming.datetime }}</div>
            </div>
          </div>

          <q-separator class="q-my-md" />

          <div class="row items-center q-pa-sm">
            <div class="col-6">
              <div class="text-caption text-grey-6">Date &amp; Time</div>
              <div class="text-body1 q-mt-sm">{{ upcoming.datetime }}</div>
            </div>
          </div>

          <div class="row q-mt-md">
            <div class="col-auto">
              <q-btn unelevated color="negative" label="Cancel" @click="cancelBooking(upcoming)" />
            </div>
          </div>
        </q-card>
        <q-card v-else class="q-pa-lg shadow-2">
          <div class="text-body1 text-grey-7">No upcoming bookings.</div>
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
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { emitDashboardRefresh } from '@/stores/dashboard-events';

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

type RawBooking = {
  id: string;
  resource: string;
  datetime: string;
  status: string;
  amount: string;
  user?: string;
  date?: string;
  time?: string;
};

const search = ref('');
const statusFilter = ref('All Statuses');

const stats = ref({
  totalBookings: 0,
  hoursLogged: 0,
});

const upcoming = ref<Booking | null>(null);

const bookings = ref<Booking[]>([]);

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

const loadMyBookings = async () => {
  try {
    const { data } = await api.get<{ bookings: RawBooking[] }>('/bookings/my');
    bookings.value = data.bookings.map((b: RawBooking) => ({
      id: b.id,
      resource: b.resource,
      datetime: b.datetime,
      status: b.status,
      amount: b.amount,
    }));
    stats.value.totalBookings = bookings.value.length;
    const hours = data.bookings.reduce((acc: number, b: RawBooking) => {
      const m = String(b.datetime || '').match(/(\d+)\s*Hours?/i);
      return acc + (m ? Number(m[1]) : 0);
    }, 0);
    stats.value.hoursLogged = hours;
    const next =
      data.bookings.find(
        (b: RawBooking) => b.status === 'Confirmed' || b.status === 'Pending',
      ) || null;
    upcoming.value = next
      ? {
          id: next.id,
          resource: next.resource,
          datetime: next.datetime,
          status: next.status,
          amount: next.amount,
        }
      : null;
  } catch (error) {
    console.error('Failed to load my bookings', error);
  }
};

onMounted(() => {
  void loadMyBookings();
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

function cancelBooking(row: { id: string; resource: string }) {
  const shouldCancel = window.confirm(`Do you want to cancel "${row.resource}"?`);
  if (!shouldCancel) {
    return;
  }

  void doCancel(row);
}

async function doCancel(row: { id: string; resource: string }) {
  try {
    await api.delete(`/bookings/${row.id}`);
    emitDashboardRefresh();
    Notify.create({ type: 'positive', message: `${row.resource} cancelled.` });
    await loadMyBookings();
  } catch (error) {
    console.error('Cancel failed', error);
    Notify.create({ type: 'negative', message: 'Failed to cancel booking.' });
  }
}
</script>

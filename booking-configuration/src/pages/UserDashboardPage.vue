<template>
  <q-page class="dashboard-page">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h1 class="welcome-title">Welcome Back, Ananya.</h1>
        <p class="welcome-subtitle">Here's what's happening today.</p>
      </div>

      <q-input
        v-model="search"
        dense
        outlined
        rounded
        placeholder="Search rooms, bookings..."
        class="search-input"
        debounce="300"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <!-- Statistics -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="stat in stats" :key="stat.label" class="col-12 col-sm-6 col-md-3">
        <q-card flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-header">
              <div class="stat-label">
                {{ stat.label }}
              </div>

              <div class="stat-icon" :class="`stat-icon-${stat.color}`">
                <q-icon :name="stat.icon" size="16px" />
              </div>
            </div>

            <div class="stat-value">
              {{ stat.value }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Main content -->
    <div class="row q-col-gutter-md">
      <!-- Upcoming booking -->
      <div class="col-12 col-md-8">
        <div class="section-title">Next Upcoming Booking</div>

        <q-card v-if="upcoming" flat bordered class="booking-card q-mt-sm">
          <div class="booking-banner"></div>

          <q-card-section class="booking-section">
            <div class="booking-header">
              <div>
                <q-badge class="confirmed-badge">
                  <q-icon name="fiber_manual_record" size="7px" class="q-mr-xs" />
                  {{ upcoming.status.toUpperCase() }}
                </q-badge>

                <div class="booking-resource">
                  {{ upcoming.resource }}
                </div>

                <div class="booking-location">
                  <q-icon name="schedule" size="13px" />
                  {{ upcoming.datetime }}
                </div>
              </div>

              <div class="booking-date">
                <div>{{ upcoming.datetime }}</div>
                <span>{{ upcoming.amount }}</span>
              </div>
            </div>

            <!-- Booked slot -->
            <div class="booking-info q-mt-lg">
              <div class="booking-info-item">
                <div class="info-icon">
                  <q-icon name="calendar_month" size="17px" />
                </div>

                <div>
                  <div class="info-label">Selected Slot</div>
                  <div class="info-value">
                    {{ upcoming.datetime }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Buttons -->
            <div class="booking-actions">
              <q-btn
                outline
                no-caps
                color="primary"
                label="My Bookings"
                class="cancel-btn"
                @click="browseRooms"
              />
            </div>
          </q-card-section>
        </q-card>
        <q-card v-else flat bordered class="booking-card q-mt-sm">
          <q-card-section class="booking-section">
            <div class="booking-resource">No upcoming bookings</div>
            <div class="booking-location">Browse rooms to reserve your next study space.</div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Quick actions -->
      <div class="col-12 col-md-4">
        <div class="section-title">Quick Actions</div>

        <q-card flat bordered class="quick-card q-mt-sm" clickable @click="browseRooms">
          <q-card-section class="quick-card-content">
            <div class="quick-icon">
              <q-icon name="search" size="18px" />
            </div>

            <div class="quick-text">
              <div class="quick-title">Browse Rooms</div>

              <div class="quick-description">Find and book a new space.</div>
            </div>

            <q-icon name="chevron_right" color="grey-6" size="20px" />
          </q-card-section>
        </q-card>

        <q-card flat bordered class="quick-card q-mt-md" clickable @click="openBookings">
          <q-card-section class="quick-card-content">
            <div class="quick-icon">
              <q-icon name="calendar_month" size="18px" />
            </div>

            <div class="quick-text">
              <div class="quick-title">My Bookings</div>

              <div class="quick-description">Manage your existing reservations.</div>
            </div>

            <q-icon name="chevron_right" color="grey-6" size="20px" />
          </q-card-section>
        </q-card>

        <!-- Notice -->
        <q-card flat class="notice-card q-mt-md">
          <q-card-section>
            <div class="notice-title">Exam Season is Here</div>

            <div class="notice-description">
              Study rooms are booking fast. Reserve your spot up to 7 days in advance.
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();

const search = ref('');

type Stat = {
  label: string;
  value: number | string;
  icon: string;
  color: string;
};

type MyBooking = {
  id: string;
  resource: string;
  datetime: string;
  status: string;
  amount: string;
};

const stats = ref<Stat[]>([
  { label: 'UPCOMING BOOKINGS', value: 0, icon: 'calendar_month', color: 'purple' },
  { label: 'COMPLETED BOOKINGS', value: 0, icon: 'check_circle_outline', color: 'green' },
  { label: 'HOURS BOOKED', value: 0, icon: 'schedule', color: 'grey' },
  { label: 'TOTAL SPENT', value: '₹0', icon: 'payments', color: 'blue' },
]);

const allBookings = ref<MyBooking[]>([]);

const upcoming = ref<MyBooking | null>(null);

const filteredBookings = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return allBookings.value;
  return allBookings.value.filter((b) =>
    [b.resource, b.datetime, b.status, b.amount].join(' ').toLowerCase().includes(q),
  );
});

const updateStats = () => {
  const bookings = filteredBookings.value;
  const upcomingCount = bookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Pending',
  ).length;
  const completedCount = bookings.filter((b) => b.status === 'Completed').length;
  const hours = bookings.reduce((acc, b) => {
    const m = String(b.datetime || '').match(/(\d+)\s*Hours?/i);
    return acc + (m ? Number(m[1]) : 0);
  }, 0);
  const spent = bookings.reduce((acc, b) => {
    const n = parseFloat(String(b.amount || '').replace(/[^\d.]/g, ''));
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  const s = stats.value;
  s[0]!.value = upcomingCount;
  s[1]!.value = completedCount;
  s[2]!.value = hours;
  s[3]!.value = `₹${spent}`;

  upcoming.value =
    bookings.find((b) => b.status === 'Confirmed' || b.status === 'Pending') || null;
};

const loadUserDashboard = async () => {
  try {
    const { data } = await api.get<{ bookings: MyBooking[] }>('/bookings/my');
    allBookings.value = data.bookings || [];
    updateStats();
  } catch (error) {
    console.error('Failed to load user dashboard', error);
  }
};

onMounted(() => {
  void loadUserDashboard();
});

function browseRooms() {
  void router.push('/browse-rooms');
}

function openBookings() {
  void router.push('/my-bookings');
}
</script>

<style scoped>
.dashboard-page {
  background: #f7f8fc;
  min-height: 100%;
  padding: 22px 25px;
}

/* Header */

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.welcome-title {
  margin: 0;
  color: #111827;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
}

.welcome-subtitle {
  margin: 4px 0 0;
  color: #73798b;
  font-size: 11px;
}

.search-input {
  width: 235px;
  background: #fff;
}

.search-input :deep(.q-field__control) {
  height: 36px;
}

.search-input :deep(.q-field__native) {
  font-size: 10px;
}

/* Section */

.section-title {
  color: #111827;
  font-size: 12px;
  font-weight: 700;
}

/* Stats */

.stat-card {
  min-height: 104px;
  border-color: #e0e3ed;
  border-radius: 5px;
  background: #fff;
}

.stat-card .q-card__section {
  padding: 14px 16px;
}

.stat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.stat-label {
  max-width: 100px;
  color: #7c8293;
  font-size: 8px;
  line-height: 1.25;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.stat-value {
  margin-top: 12px;
  color: #111827;
  font-size: 20px;
  line-height: 1;
  font-weight: 700;
}

.stat-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.stat-icon-purple {
  color: #4f46e5;
  background: #eef0ff;
}

.stat-icon-green {
  color: #15966b;
  background: #e8f7f0;
}

.stat-icon-grey {
  color: #667085;
  background: #f0f1f4;
}

.stat-icon-blue {
  color: #5367c9;
  background: #e9edff;
}

/* Booking */

.booking-card {
  overflow: hidden;
  border-color: #dfe2ec;
  border-radius: 7px;
  background: #fff;
}

.booking-banner {
  height: 50px;

  background-color: #5148e8;
  background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 14px 14px;
}

.booking-section {
  padding: 0 20px 14px;
}

.booking-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.confirmed-badge {
  padding: 4px 7px;
  border-radius: 4px;
  color: #17815f;
  background: #e3f6ee;
  font-size: 7px;
  font-weight: 700;
}

.booking-resource {
  margin-top: 6px;
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.booking-location {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  color: #72788b;
  font-size: 8px;
}

.booking-date {
  padding-top: 2px;
  color: #5148e8;
  font-size: 11px;
  font-weight: 700;
  text-align: right;
}

.booking-date span {
  display: block;
  margin-top: 2px;
  color: #7c8293;
  font-size: 8px;
  font-weight: 400;
}

/* Booking info */

.booking-info {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 7px 10px;
  border-radius: 5px;
  background: #e8efff;
}

.booking-info-item {
  display: flex;
  align-items: center;
  flex: 1;
}

.info-icon {
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  border-radius: 50%;
  color: #4f46e5;
  background: #fff;
}

.info-label {
  color: #73798b;
  font-size: 7px;
  line-height: 1;
}

.info-value {
  margin-top: 3px;
  color: #171b29;
  font-size: 9px;
  font-weight: 500;
}

/* Booking actions */

.booking-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 13px;
}

.cancel-btn,
.details-btn {
  min-height: 26px;
  padding: 0 12px;
  border-radius: 4px;
  font-size: 8px;
}

/* Quick actions */

.quick-card {
  border-color: #dfe2ec;
  border-radius: 5px;
  background: #fff;
}

.quick-card-content {
  min-height: 49px;
  display: flex;
  align-items: center;
  padding: 9px 10px;
}

.quick-icon {
  width: 29px;
  height: 29px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 5px;
  color: #4f46e5;
  background: #edf1ff;
}

.quick-text {
  flex: 1;
  margin-left: 10px;
}

.quick-title {
  color: #252a3a;
  font-size: 9px;
  font-weight: 700;
}

.quick-description {
  margin-top: 2px;
  color: #7b8194;
  font-size: 8px;
}

/* Notice */

.notice-card {
  border-radius: 5px;
  background: #e7edff;
}

.notice-card .q-card__section {
  padding: 11px;
}

.notice-title {
  color: #252a3a;
  font-size: 9px;
  font-weight: 700;
}

.notice-description {
  margin-top: 3px;
  color: #626a80;
  font-size: 8px;
  line-height: 1.45;
}

/* Responsive */

@media (max-width: 900px) {
  .dashboard-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .search-input {
    width: 100%;
  }
}

@media (max-width: 600px) {
  .dashboard-page {
    padding: 16px;
  }

  .booking-header {
    gap: 12px;
  }

  .booking-info {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .booking-info-item {
    width: 100%;
  }
}
</style>

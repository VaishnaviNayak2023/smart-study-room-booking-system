<template>
  <q-page class="browse-page">
    <div class="browse-layout">
      <!-- =====================================================
           LEFT: BROWSE ROOMS
           ===================================================== -->

      <section class="rooms-section">
        <!-- Header -->
        <div class="page-header">
          <div class="page-heading">
            <h1>Browse Rooms</h1>

            <p>Find and book available study rooms.</p>
          </div>

          <div class="header-user">
            <q-btn flat round dense icon="notifications_none" class="notification-button" />

            <q-avatar size="28px">
              <img src="https://i.pravatar.cc/100?img=12" alt="User" />
            </q-avatar>

            <span class="username"> Ananya </span>

            <q-icon name="keyboard_arrow_down" size="14px" />
          </div>
        </div>

        <!-- =================================================
             SEARCH / FILTER CARD
             ================================================= -->

        <q-card flat bordered class="filter-card">
          <div class="filter-grid">
            <!-- Date -->

            <div class="filter-field">
              <label>Date</label>

              <q-input v-model="filters.date" dense outlined type="date" class="filter-input" />
            </div>

            <!-- Time -->

            <div class="filter-field">
              <label>Time</label>

              <q-select
                v-model="filters.time"
                :options="timeOptions"
                dense
                outlined
                class="filter-input"
              />
            </div>

            <!-- Capacity -->

            <div class="filter-field">
              <label>Capacity</label>

              <q-select
                v-model="filters.capacity"
                :options="capacityOptions"
                dense
                outlined
                class="filter-input"
              />
            </div>

            <!-- Search -->

            <div class="search-button-wrapper">
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Search"
                class="search-button"
                @click="searchRooms"
              />
            </div>
          </div>
        </q-card>

        <!-- =================================================
             ROOM CARDS
             ================================================= -->

        <div v-if="filteredRooms.length" class="rooms-grid">
          <q-card v-for="room in filteredRooms" :key="room.id" flat bordered class="room-card">
            <!-- Image -->

            <div class="room-image-wrapper">
              <q-img :src="room.image" :alt="room.name" fit="cover" class="room-image" />
            </div>

            <!-- Content -->

            <q-card-section class="room-content">
              <div class="room-name">
                {{ room.name }}
              </div>

              <div class="room-capacity">
                <q-icon name="groups" size="13px" />

                <span> Capacity: {{ room.capacity }} </span>
              </div>

              <div class="room-footer">
                <q-badge
                  :class="[
                    'availability-badge',
                    room.available ? 'available-badge' : 'unavailable-badge',
                  ]"
                >
                  {{ room.available ? 'Available' : 'Unavailable' }}
                </q-badge>

                <q-btn
                  unelevated
                  no-caps
                  color="primary"
                  label="Book Now"
                  class="book-button"
                  :disable="!room.available"
                  @click="selectRoom(room)"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- No rooms -->

        <div v-else class="empty-state">
          <q-icon name="meeting_room" size="42px" />

          <div class="empty-title">No rooms found</div>

          <div class="empty-text">Try changing your search filters.</div>
        </div>

        <!-- =================================================
             FOOTER
             ================================================= -->

        <footer class="dashboard-footer">
          <div class="footer-brand">Smart Study Room</div>

          <div class="copyright">© 2024 Smart Study Room. All rights reserved.</div>

          <div class="footer-links">
            <span> Privacy Policy </span>

            <span> Terms of Service </span>

            <span> Contact Support </span>
          </div>
        </footer>
      </section>

      <!-- =====================================================
           RIGHT: BOOKING SUMMARY
           ===================================================== -->

      <section class="booking-section">
        <!-- Summary Header -->

        <div class="summary-title">
          <q-icon name="event_note" size="19px" />

          <span> Booking Summary </span>
        </div>

        <!-- Summary Card -->

        <q-card flat bordered class="summary-card">
          <!-- Back -->

          <button type="button" class="back-button" @click="clearSelectedRoom">
            <q-icon name="arrow_back" size="13px" />

            <span> Back </span>
          </button>

          <!-- Selected Room -->

          <h2 class="summary-heading">
            Book
            {{ selectedRoom?.name || 'Study Room A101' }}
          </h2>

          <!-- =================================================
               BOOKING DETAILS
               ================================================= -->

          <div class="booking-details">
            <div class="section-title">Booking Details</div>

            <div class="details-grid">
              <!-- Date -->

              <div class="summary-field">
                <label> Date </label>

                <q-input v-model="booking.date" dense outlined type="date" class="summary-input" />
              </div>

              <!-- Start Time -->

              <div class="summary-field">
                <label> Start Time </label>

                <q-select
                  v-model="booking.startTime"
                  :options="startTimeOptions"
                  dense
                  outlined
                  class="summary-input"
                />
              </div>

              <!-- End Time -->

              <div class="summary-field">
                <label> End Time </label>

                <q-select
                  v-model="booking.endTime"
                  :options="endTimeOptions"
                  dense
                  outlined
                  class="summary-input"
                />
              </div>

              <!-- Duration -->

              <div class="summary-field">
                <label> Total Duration </label>

                <q-input
                  :model-value="`${duration} Hours`"
                  dense
                  outlined
                  readonly
                  class="summary-input duration-input"
                />
              </div>
            </div>

            <q-separator class="summary-separator" />

            <!-- =================================================
                 PRICE SUMMARY
                 ================================================= -->

            <div class="section-title">Price Summary</div>

            <div class="price-list">
              <!-- First Hour -->

              <div class="price-row">
                <span> First 1 Hour (Free) </span>

                <span> ₹{{ formatPrice(priceSummary.firstHour) }} </span>
              </div>

              <!-- Additional Hours -->

              <div class="price-row">
                <span> Additional {{ additionalHoursLabel }} </span>

                <span> ₹{{ formatPrice(priceSummary.additionalHour) }} </span>
              </div>

              <!-- Peak -->

              <div class="price-row">
                <span> Peak Hour Charge (15%) </span>

                <span> ₹{{ formatPrice(priceSummary.peakCharge) }} </span>
              </div>

              <!-- Discount -->

              <div class="price-row discount-row">
                <span> Student Discount (10%) </span>

                <span> -₹{{ formatPrice(priceSummary.discount) }} </span>
              </div>

              <!-- GST -->

              <div class="price-row">
                <span> GST (18%) </span>

                <span> ₹{{ formatPrice(priceSummary.gst) }} </span>
              </div>
            </div>

            <q-separator />

            <!-- Total -->

            <div class="total-row">
              <span> Total Amount </span>

              <strong> ₹{{ formatPrice(priceSummary.total) }} </strong>
            </div>

            <!-- Confirm -->

            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Confirm Booking"
              class="confirm-button"
              :disable="!selectedRoom || duration <= 0"
              @click="confirmBooking"
            />
          </div>
        </q-card>
      </section>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { useQuasar } from 'quasar';

/* ==========================================================
   TYPES
   ========================================================== */

interface Room {
  id: number;
  name: string;
  capacity: number;
  available: boolean;
  image: string;
}

/* ==========================================================
   QUASAR
   ========================================================== */

const $q = useQuasar();

/* ==========================================================
   FILTERS
   ========================================================== */

const filters = ref({
  date: '2024-05-24',
  time: 'Any Time',
  capacity: 'Any',
});

const timeOptions = ['Any Time', 'Morning', 'Afternoon', 'Evening'];

const capacityOptions = ['Any', 'Up to 2 People', 'Up to 4 People', 'Up to 8 People'];

/* ==========================================================
   ROOMS
   ========================================================== */

const rooms = ref<Room[]>([
  {
    id: 1,

    name: 'Study Room A101',

    capacity: 4,

    available: true,

    image:
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=80',
  },

  {
    id: 2,

    name: 'Study Room A102',

    capacity: 4,

    available: true,

    image:
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
  },

  {
    id: 3,

    name: 'Study Room B201',

    capacity: 8,

    available: true,

    image:
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
  },
]);

/* ==========================================================
   FILTERED ROOMS
   ========================================================== */

const filteredRooms = computed(() => {
  const capacity = filters.value.capacity;

  if (capacity === 'Any') {
    return rooms.value;
  }

  const capacityMap: Record<string, number> = {
    'Up to 2 People': 2,
    'Up to 4 People': 4,
    'Up to 8 People': 8,
  };

  const selectedCapacity = capacityMap[capacity] ?? 0;

  if (!selectedCapacity) {
    return rooms.value;
  }

  return rooms.value.filter((room: Room) => {
    return room.capacity >= selectedCapacity;
  });
});

/* ==========================================================
   SELECTED ROOM
   ========================================================== */

const selectedRoom = ref<Room | null>(rooms.value[0] ?? null);

const selectRoom = (room: Room) => {
  selectedRoom.value = room;
};

const clearSelectedRoom = () => {
  selectedRoom.value = null;
};

/* ==========================================================
   BOOKING
   ========================================================== */

const booking = ref({
  date: '2024-05-24',

  startTime: '10:00 AM',

  endTime: '12:00 PM',
});

/* ==========================================================
   TIME OPTIONS
   ========================================================== */

const startTimeOptions = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

const endTimeOptions = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

/* ==========================================================
   TIME CONVERSION
   ========================================================== */

const convertTimeToMinutes = (time: string): number => {
  if (!time) {
    return 0;
  }

  const parts = time.split(' ');

  const rawTime = parts[0] ?? '';

  const modifier = parts[1] ?? '';

  const timeParts = rawTime.split(':').map(Number);

  let hours = timeParts[0] ?? 0;

  const minutes = timeParts[1] ?? 0;

  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
};

/* ==========================================================
   DURATION
   ========================================================== */

const duration = computed(() => {
  const start = convertTimeToMinutes(booking.value.startTime);

  const end = convertTimeToMinutes(booking.value.endTime);

  if (!start || !end || end <= start) {
    return 0;
  }

  return (end - start) / 60;
});

/* ==========================================================
   ADDITIONAL HOURS LABEL
   ========================================================== */

const additionalHoursLabel = computed(() => {
  const hours = Math.max(duration.value - 1, 0);

  if (hours === 1) {
    return '1 Hour';
  }

  return `${hours} Hours`;
});

/* ==========================================================
   PRICING CONFIGURATION
   ========================================================== */

const HOURLY_RATE = 50;

const PEAK_RATE = 0.15;

const STUDENT_DISCOUNT = 0.1;

const GST_RATE = 0.18;

/* ==========================================================
   PRICE CALCULATION
   ========================================================== */

const priceSummary = computed(() => {
  const totalHours = duration.value;

  /*
   * First hour is free.
   */

  const freeHours = Math.min(totalHours, 1);

  const additionalHours = Math.max(totalHours - freeHours, 0);

  const firstHour = freeHours > 0 ? 0 : 0;

  /*
   * Additional hourly charge.
   */

  const additionalHour = additionalHours * HOURLY_RATE;

  /*
   * Peak hour surcharge.
   */

  const peakCharge = additionalHour * PEAK_RATE;

  /*
   * Amount before discount.
   */

  const beforeDiscount = additionalHour + peakCharge;

  /*
   * Student discount.
   */

  const discount = beforeDiscount * STUDENT_DISCOUNT;

  /*
   * Taxable amount.
   */

  const taxableAmount = beforeDiscount - discount;

  /*
   * GST.
   */

  const gst = taxableAmount * GST_RATE;

  /*
   * Final total.
   */

  const total = taxableAmount + gst;

  return {
    firstHour,

    additionalHour,

    peakCharge,

    discount,

    gst,

    total,
  };
});

/* ==========================================================
   SEARCH
   ========================================================== */

const searchRooms = () => {
  $q.notify({
    type: 'info',

    message: 'Searching available rooms...',

    position: 'top',
  });
};

/* ==========================================================
   CONFIRM BOOKING
   ========================================================== */

const confirmBooking = () => {
  if (!selectedRoom.value) {
    $q.notify({
      type: 'warning',

      message: 'Please select a room first.',

      position: 'top',
    });

    return;
  }

  if (duration.value <= 0) {
    $q.notify({
      type: 'negative',

      message: 'Please select a valid booking duration.',

      position: 'top',
    });

    return;
  }

  $q.notify({
    type: 'positive',

    message: `${selectedRoom.value.name} booked successfully.`,

    position: 'top',
  });
};

/* ==========================================================
   PRICE FORMATTER
   ========================================================== */

const formatPrice = (value: number): string => {
  return Number(value || 0).toFixed(2);
};
</script>

<style scoped>
/* ==========================================================
   PAGE
   ========================================================== */

.browse-page {
  min-height: 100%;

  background: #f7f8fd;

  color: #141a2b;
}

/* ==========================================================
   MAIN TWO-COLUMN LAYOUT
   ========================================================== */

.browse-layout {
  display: grid;

  grid-template-columns:
    minmax(0, 1.45fr)
    minmax(400px, 0.95fr);

  gap: 30px;

  min-height: calc(100vh - 40px);

  padding: 0 18px;
}

/* ==========================================================
   LEFT SECTION
   ========================================================== */

.rooms-section {
  min-width: 0;

  display: flex;

  flex-direction: column;
}

/* ==========================================================
   HEADER
   ========================================================== */

.page-header {
  min-height: 62px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  border-bottom: 1px solid #e1e4ed;
}

.page-heading h1 {
  margin: 0;

  color: #11182b;

  font-size: 20px;

  font-weight: 700;

  line-height: 1.15;
}

.page-heading p {
  margin: 4px 0 0;

  color: #777f92;

  font-size: 9px;
}

.header-user {
  display: flex;

  align-items: center;

  gap: 5px;

  color: #444b60;

  font-size: 8px;
}

.notification-button {
  color: #4149d9;
}

.username {
  margin-left: 2px;
}

/* ==========================================================
   FILTER CARD
   ========================================================== */

.filter-card {
  margin-top: 12px;

  padding: 10px;

  border: 1px solid #d8ddea;

  border-radius: 7px;

  background: #ffffff;
}

.filter-grid {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr)
    minmax(0, 1fr)
    65px;

  gap: 8px;

  align-items: end;
}

.filter-field label,
.summary-field label {
  display: block;

  margin-bottom: 4px;

  color: #535c70;

  font-size: 7px;

  font-weight: 500;
}

.filter-input :deep(.q-field__control) {
  min-height: 28px;

  height: 28px;

  border-radius: 4px;
}

.filter-input :deep(.q-field__native) {
  min-height: 28px;

  font-size: 8px;
}

.filter-input :deep(.q-field__marginal) {
  height: 28px;
}

.search-button-wrapper {
  display: flex;

  align-items: flex-end;
}

.search-button {
  width: 100%;

  height: 28px;

  min-height: 28px;

  padding: 0;

  border-radius: 4px;

  font-size: 8px;
}

/* ==========================================================
   ROOMS GRID
   ========================================================== */

.rooms-grid {
  display: grid;

  grid-template-columns: repeat(3, minmax(0, 1fr));

  gap: 10px;

  margin-top: 12px;
}

/* ==========================================================
   ROOM CARD
   ========================================================== */

.room-card {
  overflow: hidden;

  border: 1px solid #d8ddea;

  border-radius: 7px;

  background: #ffffff;

  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.room-card:hover {
  transform: translateY(-2px);

  box-shadow: 0 6px 18px rgba(33, 43, 75, 0.08);
}

.room-image-wrapper {
  width: 100%;

  height: 102px;

  overflow: hidden;
}

.room-image {
  width: 100%;

  height: 100%;
}

.room-content {
  padding: 9px !important;
}

.room-name {
  color: #111a31;

  font-size: 10px;

  font-weight: 650;
}

.room-capacity {
  display: flex;

  align-items: center;

  gap: 3px;

  margin-top: 5px;

  color: #626b7e;

  font-size: 7px;
}

.room-footer {
  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-top: 9px;
}

.availability-badge {
  padding: 3px 5px;

  border-radius: 8px;

  font-size: 6px;

  font-weight: 600;
}

.available-badge {
  color: #087d5c;

  background: #d8f5e9;
}

.unavailable-badge {
  color: #777e8e;

  background: #e9ebf0;
}

.book-button {
  min-height: 22px;

  height: 22px;

  padding: 0 9px;

  border-radius: 4px;

  font-size: 7px;
}

/* ==========================================================
   EMPTY STATE
   ========================================================== */

.empty-state {
  min-height: 180px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  color: #9299aa;

  text-align: center;
}

.empty-title {
  margin-top: 8px;

  color: #525a6e;

  font-size: 11px;

  font-weight: 600;
}

.empty-text {
  margin-top: 3px;

  font-size: 8px;
}

/* ==========================================================
   FOOTER
   ========================================================== */

.dashboard-footer {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 10px;

  margin-top: auto;

  padding: 15px 0;

  border-top: 1px solid #e0e3eb;

  color: #737b8e;

  font-size: 6px;
}

.footer-brand {
  color: #182038;

  font-size: 10px;

  font-weight: 650;
}

.footer-links {
  display: flex;

  gap: 10px;

  white-space: nowrap;
}

/* ==========================================================
   RIGHT SECTION
   ========================================================== */

.booking-section {
  min-width: 0;
}

.summary-title {
  height: 62px;

  display: flex;

  align-items: center;

  gap: 7px;

  color: #ffffff;

  font-size: 13px;

  font-weight: 600;
}

.summary-title .q-icon {
  color: #ffffff;
}

/* ==========================================================
   SUMMARY CARD
   ========================================================== */

.summary-card {
  min-height: 410px;

  padding: 27px 17px;

  border: 1px solid #d6dbe7;

  border-radius: 7px;

  background: #f8f9fe;
}

.back-button {
  display: flex;

  align-items: center;

  gap: 4px;

  padding: 0;

  border: 0;

  outline: none;

  color: #4f57d9;

  background: transparent;

  cursor: pointer;

  font-size: 8px;
}

.summary-heading {
  margin: 17px 0 11px;

  color: #10182b;

  font-size: 17px;

  font-weight: 700;

  line-height: 1.2;
}

/* ==========================================================
   BOOKING DETAILS
   ========================================================== */

.booking-details {
  padding: 12px;

  border: 1px solid #d4d9e5;

  border-radius: 7px;

  background: #ffffff;
}

.section-title {
  color: #1b2438;

  font-size: 10px;

  font-weight: 600;
}

.details-grid {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 9px;

  margin-top: 10px;
}

.summary-input :deep(.q-field__control) {
  height: 27px;

  min-height: 27px;

  border-radius: 4px;
}

.summary-input :deep(.q-field__native) {
  min-height: 27px;

  font-size: 8px;
}

.summary-input :deep(.q-field__marginal) {
  height: 27px;
}

.duration-input :deep(.q-field__control) {
  background: #e7edff;
}

.summary-separator {
  margin: 12px 0;

  background: #e0e3ea;
}

/* ==========================================================
   PRICE SUMMARY
   ========================================================== */

.price-list {
  margin-top: 7px;
}

.price-row {
  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 10px;

  padding: 4px 0;

  color: #596175;

  font-size: 8px;
}

.price-row span:last-child {
  color: #30374a;

  white-space: nowrap;
}

.discount-row span:last-child {
  color: #168d69;
}

/* ==========================================================
   TOTAL
   ========================================================== */

.total-row {
  display: flex;

  align-items: center;

  justify-content: space-between;

  padding: 8px 0 9px;

  color: #141a2a;

  font-size: 10px;
}

.total-row strong {
  color: #121726;

  font-size: 11px;
}

.confirm-button {
  width: 100%;

  height: 27px;

  min-height: 27px;

  margin-top: 3px;

  border-radius: 4px;

  font-size: 8px;
}

/* ==========================================================
   RESPONSIVE
   ========================================================== */

@media (max-width: 1100px) {
  .browse-layout {
    grid-template-columns: 1fr;

    gap: 20px;
  }

  .booking-section {
    padding-bottom: 20px;
  }

  .summary-title {
    height: 42px;

    color: #20283c;
  }

  .summary-title .q-icon {
    color: #20283c;
  }
}

@media (max-width: 750px) {
  .browse-layout {
    padding: 0 12px;
  }

  .page-header {
    min-height: auto;

    align-items: flex-start;

    flex-direction: column;

    gap: 10px;

    padding: 12px 0;
  }

  .header-user {
    align-self: flex-end;
  }

  .filter-grid {
    grid-template-columns: 1fr 1fr;
  }

  .search-button-wrapper {
    grid-column: span 2;
  }

  .rooms-grid {
    grid-template-columns: 1fr 1fr;
  }

  .room-image-wrapper {
    height: 140px;
  }

  .dashboard-footer {
    align-items: flex-start;

    flex-direction: column;
  }

  .footer-links {
    flex-wrap: wrap;

    white-space: normal;
  }
}

@media (max-width: 520px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .search-button-wrapper {
    grid-column: auto;
  }

  .rooms-grid {
    grid-template-columns: 1fr;
  }

  .room-image-wrapper {
    height: 170px;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .summary-card {
    padding: 20px 10px;
  }
}
</style>

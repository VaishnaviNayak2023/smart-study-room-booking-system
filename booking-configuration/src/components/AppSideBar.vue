<template>
  <q-drawer v-model="drawerOpen" show-if-above :width="250" bordered class="sidebar-drawer">
    <div class="sidebar">
      <!-- Logo / Brand -->
      <div class="brand">
        <div class="brand-logo">
          <q-icon :name="isAdmin ? 'admin_panel_settings' : 'business_center'" size="15px" />
        </div>

        <div>
          <div class="brand-title">
            {{ isAdmin ? 'Admin Panel' : appName }}
          </div>

          <div class="brand-subtitle">
            {{ isAdmin ? 'System Management' : 'User Portal' }}
          </div>
        </div>
      </div>

      <q-separator />

      <!-- Navigation -->
      <q-list class="navigation-list">
        <q-item
          v-for="item in navigationItems"
          :key="item.label"
          clickable
          v-ripple
          :to="item.to"
          exact
          class="navigation-item"
          :class="{
            'navigation-item-active': isActive(item.to),
          }"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" class="navigation-icon" />
          </q-item-section>

          <q-item-section>
            <q-item-label class="navigation-label">
              {{ item.label }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- Bottom actions -->
      <div class="bottom-actions">
        <!-- User Portal -->
        <q-btn
          v-if="!isAdmin"
          unelevated
          no-caps
          color="primary"
          icon="add"
          label="Book Now"
          class="book-button"
          @click="goToBooking"
        />

        <!-- Admin Panel -->
        <template v-else>
          <q-separator class="logout-separator" />

          <q-item clickable v-ripple class="logout-item" @click="logout">
            <q-item-section avatar>
              <q-icon name="logout" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="navigation-label"> Logout </q-item-label>
            </q-item-section>
          </q-item>
        </template>
      </div>
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { appConfig } from '@/config/app';
import { useStudyroomStore } from '@/stores/studyroom-store';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

type NavigationItem = {
  label: string;
  icon: string;
  to: string;
};

/*
|--------------------------------------------------------------------------
| Props
|--------------------------------------------------------------------------
*/

const props = defineProps({
  admin: {
    type: Boolean,
    default: false,
  },
});

/*
|--------------------------------------------------------------------------
| Composition API
|--------------------------------------------------------------------------
*/

const router = useRouter();
const route = useRoute();
const studyroomStore = useStudyroomStore();

const drawerOpen = ref(true);

/*
|--------------------------------------------------------------------------
| Computed
|--------------------------------------------------------------------------
*/

const isAdmin = computed(() => props.admin);
const appName = computed(() => appConfig.appName || 'Booking Portal');

const userNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    to: '/dashboard',
  },
  {
    label: 'Browse Rooms',
    icon: 'search',
    to: '/browse-rooms',
  },
  {
    label: 'My Bookings',
    icon: 'calendar_month',
    to: '/my-bookings',
  },
  {
    label: 'Profile',
    icon: 'person_outline',
    to: '/profile',
  },
];

const adminNavigation: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    to: '/admin-dashboard',
  },
  {
    label: 'Resource Types',
    icon: 'category',
    to: '/resource-types',
  },
  {
    label: 'Resources',
    icon: 'inventory_2',
    to: '/manage-resources',
  },
  {
    label: 'Bookings',
    icon: 'calendar_month',
    to: '/bookings',
  },
  {
    label: 'Pricing Rules',
    icon: 'payments',
    to: '/pricing-rules',
  },
  {
    label: 'Reports',
    icon: 'assessment',
    to: '/reports',
  },
  {
    label: 'Settings',
    icon: 'settings',
    to: '/settings',
  },
];

const navigationItems = computed(() => {
  return isAdmin.value ? adminNavigation : userNavigation;
});

/*
|--------------------------------------------------------------------------
| Methods
|--------------------------------------------------------------------------
*/

const isActive = (path: string) => {
  return route.path === path;
};

const goToBooking = () => {
  void router.push('/browse-rooms');
};

const logout = () => {
  const shouldLogout = window.confirm('Are you sure you want to logout?');
  if (!shouldLogout) {
    return;
  }

  studyroomStore.logout();
  Notify.create({
    type: 'positive',
    message: 'Logged out successfully.',
    position: 'center',
    timeout: 1200,
  });
  void router.replace('/login');
};
</script>

<style scoped>
.sidebar-drawer {
  background: #ffffff;
}

.sidebar {
  width: 100%;
  height: 100vh;

  display: flex;
  flex-direction: column;

  background: #ffffff;
}

/* ---------------------------------------------------------
   Brand
--------------------------------------------------------- */

.brand {
  height: 72px;

  display: flex;
  align-items: center;

  padding: 0 20px;
}

.brand-logo {
  width: 38px;
  height: 38px;

  display: flex;
  align-items: center;
  justify-content: center;

  flex-shrink: 0;

  border-radius: 8px;

  background: #5955e9;
  color: #ffffff;
}

.brand-logo :deep(.q-icon) {
  font-size: 20px;
}

.brand-title {
  margin-left: 12px;

  color: #111827;

  font-size: 16px;
  line-height: 18px;
  font-weight: 700;
}

.brand-subtitle {
  margin-left: 12px;
  margin-top: 3px;

  color: #777d90;

  font-size: 11px;
  line-height: 12px;
}

/* ---------------------------------------------------------
   Navigation
--------------------------------------------------------- */

.navigation-list {
  padding: 12px 0;
}

.navigation-item {
  position: relative;

  height: 44px;
  min-height: 44px;

  margin: 2px 8px 2px 8px;
  padding: 0 14px;

  border-radius: 0 20px 20px 0;

  color: #272c3b;
}

.navigation-item :deep(.q-item__section--avatar) {
  width: 32px;
  min-width: 32px;

  padding-right: 0;

  color: #202536;
}

.navigation-icon {
  font-size: 20px;
}

.navigation-label {
  font-size: 13px;
  line-height: 1;
  font-weight: 500;
}

/* ---------------------------------------------------------
   Active User item
--------------------------------------------------------- */

.navigation-item-active {
  color: #4d49df;
  background: #dfe6ff;
}

.navigation-item-active::before {
  content: '';

  position: absolute;

  left: 0;
  top: 0;
  bottom: 0;

  width: 3px;

  background: #5b56ed;
}

.navigation-item-active :deep(.q-item__section--avatar) {
  color: #4d49df;
}

/* ---------------------------------------------------------
   Bottom
--------------------------------------------------------- */

.bottom-actions {
  margin-top: auto;
  padding: 0 12px 16px;
}

.book-button {
  width: 100%;
  height: 40px;
  min-height: 40px;

  border-radius: 8px;

  font-size: 13px;
  font-weight: 600;
}

.book-button :deep(.q-icon) {
  font-size: 18px;
}

/* ---------------------------------------------------------
   Logout
--------------------------------------------------------- */

.logout-separator {
  margin-bottom: 8px;
}

.logout-item {
  height: 44px;
  min-height: 44px;

  padding: 0 14px;

  color: #272c3b;
}

.logout-item :deep(.q-item__section--avatar) {
  width: 32px;
  min-width: 32px;

  padding-right: 0;
}

.logout-item :deep(.q-icon) {
  font-size: 20px;
}

.logout-item:hover {
  background: #f5f6fa;
}

/* ---------------------------------------------------------
   Mobile
--------------------------------------------------------- */

@media (max-width: 700px) {
  .sidebar-drawer {
    width: 250px !important;
  }

  .brand {
    height: 72px;
    padding: 0 20px;
  }

  .brand-title {
    font-size: 16px;
  }

  .brand-subtitle {
    font-size: 11px;
  }

  .navigation-item {
    height: 44px;
    min-height: 44px;
  }

  .navigation-label {
    font-size: 13px;
  }
}
</style>

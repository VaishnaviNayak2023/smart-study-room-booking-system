<template>
  <q-drawer
    :model-value="modelValue"
    show-if-above
    :width="250"
    bordered
    class="sidebar-drawer"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sidebar" :class="{ 'sidebar--admin': isAdmin }">
      <div class="brand">
        <div v-if="isAdmin" class="brand-logo"><q-icon name="apartment" size="18px" /></div>
        <div>
          <div class="brand-title">{{ brandTitle }}</div>
          <div class="brand-subtitle">{{ brandSubtitle }}</div>
        </div>
      </div>

      <q-list class="navigation-list">
        <q-item
          v-for="item in navigationItems"
          :key="item.label"
          clickable
          v-ripple
          :to="item.to"
          exact
          class="navigation-item"
          :class="{ 'navigation-item-active': isActive(item.to) }"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" class="navigation-icon" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="navigation-label">{{ item.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div class="bottom-actions">
        <q-btn
          outline
          no-caps
          icon="logout"
          label="Logout"
          class="logout-button"
          @click="logoutOpen = true"
        />
      </div>
    </div>

    <ConfirmDialog
      v-model="logoutOpen"
      title="Log out?"
      :message="logoutMessage"
      confirm-label="Logout"
      cancel-label="Cancel"
      icon="logout"
      variant="primary"
      stacked
      @confirm="doLogout"
    />
  </q-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import ConfirmDialog from '@/components/user/ConfirmDialog.vue';
import { useStudyroomStore } from '@/stores/studyroom-store';
import { useSettingsStore } from '@/stores/settings-store';

type NavigationItem = {
  label: string;
  icon: string;
  to: string;
};

const props = defineProps({
  modelValue: { type: Boolean, default: true },
  admin: { type: Boolean, default: false },
});

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

const router = useRouter();
const route = useRoute();
const studyroomStore = useStudyroomStore();
const settingsStore = useSettingsStore();
const logoutOpen = ref(false);

const isAdmin = computed(() => props.admin);

const brandTitle = computed(() => {
  const name = settingsStore.systemName?.trim();
  if (name) return name;
  return isAdmin.value ? 'Admin' : 'User Portal';
});

const brandSubtitle = computed(() =>
  isAdmin.value ? 'Admin Dashboard' : 'Modern Workspace',
);

const logoutMessage = computed(() =>
  isAdmin.value
    ? 'Are you sure you want to log out of the admin dashboard?'
    : 'Are you sure you want to log out? You will need to sign in again to access your modern workspace.',
);

const userNavigation: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { label: 'Browse Rooms', icon: 'search', to: '/browse-rooms' },
  { label: 'My Bookings', icon: 'calendar_month', to: '/my-bookings' },
  { label: 'Profile', icon: 'person_outline', to: '/profile' },
  { label: 'Notifications', icon: 'notifications_none', to: '/notifications' },
  { label: 'Settings', icon: 'settings', to: '/user-settings' },
];

const adminNavigation: NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', to: '/admin-dashboard' },
  { label: 'Resource Types', icon: 'category', to: '/resource-types' },
  { label: 'Resources', icon: 'inventory_2', to: '/manage-resources' },
  { label: 'Bookings', icon: 'calendar_month', to: '/bookings' },
  { label: 'Pricing Rules', icon: 'payments', to: '/pricing-rules' },
  { label: 'Reports', icon: 'assessment', to: '/reports' },
  { label: 'Notifications', icon: 'notifications_none', to: '/notifications' },
  { label: 'Settings', icon: 'settings', to: '/settings' },
  { label: 'Profile', icon: 'person_outline', to: '/profile' },
];

const navigationItems = computed(() => (isAdmin.value ? adminNavigation : userNavigation));
const isActive = (path: string) => route.path === path;

function doLogout() {
  studyroomStore.logout();
  logoutOpen.value = false;
  Notify.create({ type: 'positive', message: 'Logged out successfully.', position: 'center', timeout: 1200 });
  void router.replace('/login');
}
</script>

<style scoped>
.sidebar-drawer { background: var(--portal-sidebar); }
.sidebar { width: 100%; height: 100%; display: flex; flex-direction: column; background: var(--portal-sidebar); }
.sidebar--admin { background: var(--portal-sidebar); }
.brand { display: flex; align-items: center; gap: 12px; padding: 28px 24px 18px; }
.brand-logo { width: 38px; height: 38px; border-radius: 10px; background: var(--portal-primary); color: var(--portal-on-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.brand-title { color: var(--portal-primary); font-size: 18px; font-weight: 700; line-height: 1.2; }
.brand-subtitle { margin-top: 4px; color: var(--portal-muted); font-size: 12px; }
.navigation-list { padding: 8px 12px; flex: 1; }
.navigation-item { height: 44px; min-height: 44px; margin: 4px 0; padding: 0 14px; border-radius: 12px; color: var(--portal-muted); }
.navigation-item :deep(.q-item__section--avatar) { width: 32px; min-width: 32px; padding-right: 0; color: var(--portal-muted); }
.navigation-icon { font-size: 20px; }
.navigation-label { font-size: 14px; font-weight: 500; }
.navigation-item-active { color: var(--portal-primary); background: var(--portal-sidebar-active); font-weight: 600; }
.navigation-item-active :deep(.q-item__section--avatar) { color: var(--portal-primary); }
.bottom-actions { margin-top: auto; padding: 0 16px 20px; }
.logout-button { width: 100%; min-height: 42px; border-radius: 10px; border-color: var(--portal-border); color: var(--portal-text-secondary); background: var(--portal-card); font-weight: 500; }
</style>

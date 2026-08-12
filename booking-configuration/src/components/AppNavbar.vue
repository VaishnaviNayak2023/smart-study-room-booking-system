<template>
  <q-header elevated class="app-header">
    <q-toolbar class="app-toolbar">
      <q-btn flat dense round icon="menu" aria-label="Menu" class="menu-btn" @click="emit('toggleDrawer')" />

      <div class="search-wrap">
        <q-input
          v-model="search"
          dense
          outlined
          rounded
          debounce="300"
          :placeholder="searchPlaceholder"
          class="header-search"
          @update:model-value="onSearch"
        >
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>

      <q-space />

      <div class="header-actions">
        <template v-if="isAdmin">
          <q-btn
            v-if="showExport"
            outline
            no-caps
            icon="download"
            label="Export Report"
            class="ghost-btn"
            @click="exportReport"
          />
          <q-btn
            v-if="showNewResource"
            unelevated
            no-caps
            icon="add"
            label="New Resource"
            class="primary-btn"
            @click="goNewResource"
          />
        </template>
        <template v-else>
          <q-btn v-if="showNewBooking" unelevated no-caps icon="add" label="New Booking" class="primary-btn" @click="goBrowse" />
        </template>

        <q-btn flat round icon="notifications_none" aria-label="Notifications" @click="goNotifications">
          <q-badge v-if="unreadCount > 0" floating color="negative" rounded>{{ unreadBadge }}</q-badge>
        </q-btn>

        <q-btn
          round
          flat
          dense
          class="theme-toggle-btn"
          :icon="themeStore.navbarIcon"
          :aria-label="themeStore.navbarAriaLabel"
          @click="themeStore.toggleResolved()"
        >
          <q-tooltip>{{ themeStore.navbarAriaLabel }}</q-tooltip>
        </q-btn>

        <div v-if="isAdmin" class="admin-badge">ADMIN</div>
        <q-btn flat round dense class="avatar-btn" aria-label="Profile" @click="goProfile">
          <q-avatar size="34px" class="avatar">
            <img v-if="avatarSrc" :src="avatarSrc" alt="" />
            <div v-else class="avatar-initials">{{ initials }}</div>
          </q-avatar>
          <q-tooltip>{{ currentUser?.name || currentUser?.email || 'Profile' }}</q-tooltip>
        </q-btn>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useStudyroomStore } from '@/stores/studyroom-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useThemeStore } from '@/stores/theme-store';
import type { RouteNavMeta } from '@/types/navigation';

const emit = defineEmits<{ (e: 'toggleDrawer'): void }>();
const router = useRouter();
const route = useRoute();
const studyroomStore = useStudyroomStore();
const notificationsStore = useNotificationsStore();
const themeStore = useThemeStore();

const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const currentUser = computed(() => studyroomStore.currentUser);
const isAdmin = computed(() => currentUser.value?.role === 'admin');
const unreadCount = computed(() => notificationsStore.unreadCount);
const unreadBadge = computed(() => (unreadCount.value > 9 ? '9+' : unreadCount.value));
const avatarSrc = ref<string | null>(null);

const routeNav = computed(() => (route.meta.nav as RouteNavMeta | undefined) ?? {});

const initials = computed(() => {
  const name = currentUser.value?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) || '';
    const second = parts[1]?.charAt(0) || '';
    if (first && second) return `${first}${second}`.toUpperCase();
    if (first) return first.toUpperCase();
  }
  const email = currentUser.value?.email?.trim() || '';
  return email ? email.charAt(0).toUpperCase() : '?';
});

function loadAvatar() {
  const userId = currentUser.value?.id;
  if (!userId) {
    avatarSrc.value = null;
    return;
  }
  const stored = localStorage.getItem(`booking_avatar_${userId}`);
  avatarSrc.value = stored || null;
}

const searchPlaceholder = computed(() => routeNav.value.searchPlaceholder || 'Search...');
const showExport = computed(() => routeNav.value.exportReport === true);
const showNewResource = computed(() => routeNav.value.newResource === true);
const showNewBooking = computed(() => routeNav.value.newBooking === true);

function onSearch(value: string | number | null) {
  const q = String(value || '').trim();
  const nextQuery = { ...route.query };
  if (q) nextQuery.q = q;
  else delete nextQuery.q;
  void router.replace({ query: nextQuery });
}

function goBrowse() {
  void router.push('/browse-rooms');
}
function goNotifications() {
  void router.push('/notifications');
}
function goProfile() {
  void router.push('/profile');
}
function goNewResource() {
  void router.push({ path: '/manage-resources', query: { ...route.query, action: 'new' } });
}

function exportReport() {
  Notify.create({ type: 'info', message: 'Preparing export from current data...' });
  void router.push('/reports');
}

function refreshNotifications() {
  if (currentUser.value) void notificationsStore.refreshUnread();
}

onMounted(() => {
  loadAvatar();
  window.addEventListener('booking-avatar-updated', loadAvatar);
  refreshNotifications();
});
onUnmounted(() => {
  window.removeEventListener('booking-avatar-updated', loadAvatar);
});
watch(() => route.path, () => {
  loadAvatar();
  refreshNotifications();
});
watch(() => route.query.q, (value) => {
  search.value = typeof value === 'string' ? value : '';
});
watch(() => currentUser.value?.id, () => {
  loadAvatar();
  refreshNotifications();
});
</script>

<style scoped>
.app-header { background: var(--portal-navbar); color: var(--portal-text); box-shadow: var(--portal-shadow); }
.app-toolbar { min-height: 64px; padding: 0 16px; gap: 12px; }
.menu-btn { color: var(--portal-text-secondary); }
.search-wrap { flex: 1; max-width: 520px; }
.header-search { background: var(--portal-bg); }
.header-search :deep(.q-field__control) { border-radius: 999px; height: 40px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.primary-btn { background: var(--portal-primary); color: var(--portal-on-primary); border-radius: 10px; min-height: 40px; padding: 0 14px; font-weight: 600; }
.ghost-btn { border-radius: 10px; border-color: var(--portal-border); color: var(--portal-text-secondary); min-height: 40px; }
.theme-toggle-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border: 1px solid var(--portal-border);
  color: var(--portal-text-secondary);
  background: var(--portal-card);
}
.theme-toggle-btn:hover {
  color: var(--portal-primary);
  border-color: var(--portal-primary);
}
.theme-toggle-btn:focus-visible {
  outline: 2px solid var(--portal-primary);
  outline-offset: 2px;
}
.avatar-btn { padding: 0; }
.avatar { cursor: pointer; background: var(--portal-primary-soft); color: var(--portal-primary); }
.avatar-initials { font-weight: 700; font-size: 13px; line-height: 34px; text-align: center; width: 100%; }
.admin-badge { font-size: 10px; font-weight: 700; color: var(--portal-primary); background: var(--portal-primary-soft); padding: 4px 8px; border-radius: 6px; }
@media (max-width: 700px) {
  .primary-btn :deep(.block), .ghost-btn :deep(.block) { display: none; }
}
</style>

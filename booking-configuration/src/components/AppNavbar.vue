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
          <q-btn v-if="showExport" outline no-caps icon="download" label="Export Report" class="ghost-btn" @click="exportReport" />
          <q-btn v-if="showNewResource" unelevated no-caps icon="add" label="New Resource" class="primary-btn" @click="goNewResource" />
        </template>
        <template v-else>
          <q-btn unelevated no-caps icon="add" label="New Booking" class="primary-btn" @click="goBrowse" />
          <q-btn flat round icon="notifications_none" aria-label="Notifications" @click="goNotifications">
            <q-badge v-if="unreadCount > 0" floating color="negative" rounded>{{ unreadCount > 9 ? '9+' : unreadCount }}</q-badge>
          </q-btn>
        </template>

        <q-btn flat round icon="help_outline" aria-label="Help" />
        <div v-if="isAdmin" class="admin-badge">ADMIN</div>
        <q-avatar size="34px" class="avatar" @click="goProfile">
          <div class="avatar-initials">{{ initials }}</div>
        </q-avatar>
        <div v-if="isAdmin" class="admin-name">{{ displayName }}</div>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useStudyroomStore } from '@/stores/studyroom-store';
import { useNotificationsStore } from '@/stores/notifications-store';

const emit = defineEmits<{ (e: 'toggleDrawer'): void }>();
const router = useRouter();
const route = useRoute();
const studyroomStore = useStudyroomStore();
const notificationsStore = useNotificationsStore();

const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const currentUser = computed(() => studyroomStore.currentUser);
const isAdmin = computed(() => currentUser.value?.role === 'admin');
const unreadCount = computed(() => notificationsStore.unreadCount);
const displayName = computed(() => currentUser.value?.name || 'Admin User');
const initials = computed(() => {
  const name = currentUser.value?.name?.trim();
  if (name) return name.charAt(0).toUpperCase();
  const email = currentUser.value?.email || '';
  return email ? email.charAt(0).toUpperCase() : 'A';
});

const searchPlaceholder = computed(() => {
  if (route.path.includes('bookings')) return 'Search bookings...';
  if (route.path.includes('manage-resources')) return 'Search entire portal...';
  if (route.path.includes('pricing')) return 'Search pricing rules...';
  return 'Search...';
});

const showExport = computed(() =>
  ['/admin-dashboard', '/reports', '/bookings', '/manage-resources'].some((p) => route.path.startsWith(p)),
);
const showNewResource = computed(() =>
  ['/admin-dashboard', '/manage-resources', '/resource-types'].some((p) => route.path.startsWith(p)),
);

function onSearch(value: string | number | null) {
  const q = String(value || '').trim();
  const nextQuery = { ...route.query };
  if (q) nextQuery.q = q;
  else delete nextQuery.q;
  void router.replace({ query: nextQuery });
}

function goBrowse() { void router.push('/browse-rooms'); }
function goNotifications() { void router.push('/notifications'); }
function goProfile() { void router.push('/profile'); }
function goNewResource() { void router.push({ path: '/manage-resources', query: { ...route.query, action: 'new' } }); }

function exportReport() {
  Notify.create({ type: 'info', message: 'Preparing export from current data...' });
  void router.push('/reports');
}

onMounted(() => { if (!isAdmin.value) void notificationsStore.refreshUnread(); });
watch(() => route.path, () => { if (!isAdmin.value) void notificationsStore.refreshUnread(); });
watch(() => route.query.q, (value) => { search.value = typeof value === 'string' ? value : ''; });
</script>

<style scoped>
.app-header { background: #ffffff; color: #111827; box-shadow: 0 1px 0 rgba(15, 23, 42, 0.06); }
.app-toolbar { min-height: 64px; padding: 0 16px; gap: 12px; }
.menu-btn { color: #334155; }
.search-wrap { flex: 1; max-width: 520px; }
.header-search { background: #f8fafc; }
.header-search :deep(.q-field__control) { border-radius: 999px; height: 40px; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.primary-btn { background: #1e3a8a; color: #fff; border-radius: 10px; min-height: 40px; padding: 0 14px; font-weight: 600; }
.ghost-btn { border-radius: 10px; border-color: #e5e7eb; color: #374151; min-height: 40px; }
.avatar { cursor: pointer; background: #e0e7ff; color: #1e3a8a; }
.avatar-initials { font-weight: 700; font-size: 14px; }
.admin-badge { font-size: 10px; font-weight: 700; color: #1e3a8a; background: #eef2ff; padding: 4px 8px; border-radius: 6px; }
.admin-name { font-size: 13px; font-weight: 600; color: #374151; display: none; }
@media (min-width: 900px) { .admin-name { display: block; } }
@media (max-width: 700px) {
  .primary-btn :deep(.block), .ghost-btn :deep(.block) { display: none; }
  .admin-name { display: none; }
}
</style>

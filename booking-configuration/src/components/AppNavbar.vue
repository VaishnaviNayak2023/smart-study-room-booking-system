<template>
  <q-header elevated class="bg-white">
    <q-toolbar>
      <q-btn flat dense round icon="menu" aria-label="Menu" @click="emit('toggleDrawer')" />

      <q-toolbar-title>
        <q-input
          dense
          rounded
          debounce="300"
          placeholder="Search..."
          v-model="search"
          append-icon="search"
          class="bg-white"
        />
      </q-toolbar-title>

      <q-space />

      <q-btn flat round icon="dark_mode" @click="toggleDark" />
      <q-btn flat round icon="notifications" @click="openNotifications" />
      <q-btn flat round icon="help_outline" />

      <q-avatar size="32px" class="q-ml-sm" style="cursor: pointer" @click="goProfile">
        <img v-if="avatarSrc" :src="avatarSrc" />
        <div v-else class="text-weight-medium">{{ initials }}</div>
      </q-avatar>

      <q-btn
        flat
        round
        icon="logout"
        color="negative"
        aria-label="Logout"
        class="q-ml-sm"
        @click="confirmLogout"
      >
        <q-tooltip>Logout</q-tooltip>
      </q-btn>
    </q-toolbar>
  </q-header>
</template>

<script setup lang="ts">
import { Notify, useQuasar } from 'quasar';
import { computed, ref } from 'vue';
import { useStudyroomStore } from '@/stores/studyroom-store';
import { useRouter } from 'vue-router';

const emit = defineEmits<{ (e: 'toggleDrawer'): void }>();
const $q = useQuasar();
const studyroomStore = useStudyroomStore();
const router = useRouter();

const currentUser = computed(() => studyroomStore.currentUser);
const search = ref('');

const avatarSrc = computed(() => null);
const initials = computed(() => {
  const email = currentUser.value?.email || '';
  return email ? email.charAt(0).toUpperCase() : 'U';
});

function toggleDark() {
  $q.dark.set(!$q.dark.isActive);
}

function openNotifications() {
  Notify.create({ message: 'No new notifications', type: 'info' });
}

function goProfile() {
  void router.push('/profile');
}

function confirmLogout() {
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
}
</script>

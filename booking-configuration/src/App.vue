<template>
  <q-layout view="lHh Lpr lFf">
    <template v-if="!isAuthPage">
      <app-side-bar v-model="drawerOpen" :admin="isAdmin"></app-side-bar>
      <app-navbar @toggleDrawer="toggleDrawer"></app-navbar>
    </template>

    <q-page-container>
      <router-view></router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import AppNavbar from './components/AppNavbar.vue';
import AppSideBar from './components/AppSideBar.vue';
import { useStudyroomStore } from '@/stores/studyroom-store';

const drawerOpen = ref(true);
const route = useRoute();
const studyroomStore = useStudyroomStore();

const authPaths = ['/login', '/register'];

const isAuthPage = computed(() => authPaths.includes(route.path));
const isAdmin = computed(() => studyroomStore.currentUser?.role === 'admin');

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value;
}
</script>

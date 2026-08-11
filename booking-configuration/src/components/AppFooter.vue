<template>
  <q-footer bordered class="bg-grey-1 text-grey-8">
    <q-toolbar class="justify-center text-caption">
      <span>{{ appName || 'Booking system' }}</span>
    </q-toolbar>
  </q-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { appConfig } from '@/config/app';

const appName = computed(() => appConfig.appName || 'Booking system');
</script>

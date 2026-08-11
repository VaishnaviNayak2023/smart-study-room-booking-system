<template>
  <q-page class="portal-page notifications-page">
    <div class="page-header">
      <h1>Notifications</h1>
      <q-btn
        flat
        no-caps
        color="primary"
        icon="done_all"
        label="Mark all as read"
        :disable="!notifications.length || unreadCount === 0"
        :loading="markingAll"
        @click="markAllRead"
      />
    </div>

    <div v-if="loading" class="portal-loading">
      <q-spinner color="primary" size="32px" />
      Loading notifications…
    </div>
    <div v-else-if="error" class="portal-error">
      <q-icon name="error_outline" size="32px" color="negative" />
      <div>{{ error }}</div>
      <q-btn unelevated no-caps color="primary" label="Retry" @click="loadNotifications" />
    </div>
    <div v-else-if="!notifications.length" class="portal-empty">
      <q-icon name="notifications_none" size="32px" />
      You’re all caught up. No notifications yet.
    </div>
    <div v-else class="notification-list">
      <q-card
        v-for="item in notifications"
        :key="item.id"
        flat
        bordered
        class="notification-card"
        :class="{ unread: !item.read }"
        clickable
        @click="markOneRead(item)"
      >
        <q-card-section class="notification-row">
          <div class="type-icon" :class="`type-${item.type}`">
            <q-icon :name="iconFor(item.type)" size="20px" />
          </div>
          <div class="notification-body">
            <div class="notification-top">
              <div class="notification-title">{{ item.title }}</div>
              <div class="notification-time">{{ relativeTime(item.createdAt) }}</div>
            </div>
            <div class="notification-message">{{ item.message }}</div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';
import { useNotificationsStore } from '@/stores/notifications-store';

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const notificationsStore = useNotificationsStore();
const loading = ref(true);
const error = ref('');
const markingAll = ref(false);
const notifications = ref<NotificationItem[]>([]);

const unreadCount = computed(() => notifications.value.filter((n) => !n.read).length);

function iconFor(type: string) {
  switch (type) {
    case 'booking_confirmed':
      return 'check_circle';
    case 'reminder':
      return 'event';
    case 'report':
      return 'mail_outline';
    default:
      return 'warning_amber';
  }
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleString();
}

async function loadNotifications() {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get<{ notifications: NotificationItem[]; unreadCount: number }>(
      '/notifications',
    );
    notifications.value = data.notifications || [];
    notificationsStore.setUnread(data.unreadCount || 0);
  } catch {
    error.value = 'Unable to load notifications.';
  } finally {
    loading.value = false;
  }
}

async function markOneRead(item: NotificationItem) {
  if (item.read) return;
  try {
    await api.patch(`/notifications/${item.id}/read`);
    item.read = true;
    notificationsStore.setUnread(unreadCount.value);
  } catch {
    Notify.create({ type: 'negative', message: 'Could not mark notification as read.' });
  }
}

async function markAllRead() {
  markingAll.value = true;
  try {
    await api.post('/notifications/read-all');
    notifications.value = notifications.value.map((n) => ({ ...n, read: true }));
    notificationsStore.setUnread(0);
    Notify.create({ type: 'positive', message: 'All notifications marked as read.' });
  } catch {
    Notify.create({ type: 'negative', message: 'Could not update notifications.' });
  } finally {
    markingAll.value = false;
  }
}

onMounted(() => {
  void loadNotifications();
});
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-card {
  border-radius: 14px;
  border-color: #e5e7eb;
  overflow: hidden;
}

.notification-card.unread {
  box-shadow: inset 4px 0 0 #1e3a8a;
}

.notification-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.type-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-booking_confirmed {
  background: #dcfce7;
  color: #15803d;
}

.type-reminder {
  background: #ede9fe;
  color: #6d28d9;
}

.type-system {
  background: #fee2e2;
  color: #b91c1c;
}

.type-report {
  background: #dbeafe;
  color: #1d4ed8;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.notification-title {
  font-weight: 700;
  font-size: 14px;
}

.notification-time {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.notification-message {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .notification-top {
    flex-direction: column;
  }
}
</style>

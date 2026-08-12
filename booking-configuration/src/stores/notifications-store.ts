import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Notify } from 'quasar';
import api from '@/services/api';

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
};

const SEEN_KEY = 'booking_seen_notification_ids';

function loadSeenIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as number[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<number>) {
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);
  const loading = ref(false);
  const notifications = ref<NotificationItem[]>([]);
  const seenIds = ref<Set<number>>(loadSeenIds());

  function toastNewNotifications(items: NotificationItem[]) {
    for (const item of items) {
      if (item.read || seenIds.value.has(item.id)) continue;
      seenIds.value.add(item.id);
      Notify.create({
        type: item.type.includes('confirmed') ? 'positive' : 'info',
        message: item.message,
        caption: item.title,
        timeout: 5000,
      });
    }
    saveSeenIds(seenIds.value);
  }

  async function refreshUnread() {
    loading.value = true;
    try {
      const { data } = await api.get<{ unreadCount: number; notifications: NotificationItem[] }>(
        '/notifications',
      );
      notifications.value = data.notifications || [];
      unreadCount.value = data.unreadCount || 0;
      toastNewNotifications(notifications.value.filter((item) => !item.read));
    } catch {
      unreadCount.value = 0;
      notifications.value = [];
    } finally {
      loading.value = false;
    }
  }

  function setUnread(count: number) {
    unreadCount.value = count;
  }

  return { unreadCount, loading, notifications, refreshUnread, setUnread };
});

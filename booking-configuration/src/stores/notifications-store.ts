import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/api';

export const useNotificationsStore = defineStore('notifications', () => {
  const unreadCount = ref(0);
  const loading = ref(false);

  async function refreshUnread() {
    loading.value = true;
    try {
      const { data } = await api.get<{ unreadCount: number }>('/notifications');
      unreadCount.value = data.unreadCount || 0;
    } catch {
      unreadCount.value = 0;
    } finally {
      loading.value = false;
    }
  }

  function setUnread(count: number) {
    unreadCount.value = count;
  }

  return { unreadCount, loading, refreshUnread, setUnread };
});

import { defineBoot } from '#q-app';
import { useThemeStore } from '@/stores/theme-store';

export default defineBoot(() => {
  const themeStore = useThemeStore();
  themeStore.initFromStorage();
});

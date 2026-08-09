import { reactive } from 'vue';

const state = reactive({
  version: 0,
});

export function emitDashboardRefresh() {
  state.version += 1;
}

export function useDashboardEvents() {
  return state;
}

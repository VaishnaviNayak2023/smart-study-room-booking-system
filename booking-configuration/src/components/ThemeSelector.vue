<template>
  <div class="appearance-section">
    <div class="appearance-head">
      <div class="appearance-title">Appearance</div>
      <div class="appearance-sub">Choose how the application looks.</div>
    </div>
    <div class="theme-group" role="radiogroup" aria-label="Theme preference">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="radio"
        class="theme-option"
        :class="{ active: modelValue === option.value }"
        :aria-checked="modelValue === option.value"
        @click="select(option.value)"
      >
        <q-icon :name="option.icon" size="18px" aria-hidden="true" />
        <span>{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ThemePreference } from '@/utils/theme';

defineProps<{
  modelValue: ThemePreference;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ThemePreference];
}>();

const options: Array<{ label: string; value: ThemePreference; icon: string }> = [
  { label: 'Light', value: 'light', icon: 'light_mode' },
  { label: 'Dark', value: 'dark', icon: 'dark_mode' },
  { label: 'Auto', value: 'auto', icon: 'brightness_auto' },
];

function select(value: ThemePreference) {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.appearance-section {
  margin-bottom: 20px;
}

.appearance-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--portal-text);
}

.appearance-sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--portal-muted);
}

.theme-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.theme-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  min-width: 110px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--portal-border);
  background: var(--portal-card);
  color: var(--portal-text-secondary);
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.theme-option:hover {
  border-color: var(--portal-primary);
  color: var(--portal-primary);
}

.theme-option:focus-visible {
  outline: 2px solid var(--portal-primary);
  outline-offset: 2px;
}

.theme-option.active {
  border-color: var(--portal-primary);
  color: var(--portal-primary);
  background: var(--portal-primary-soft);
  box-shadow: inset 0 0 0 1px var(--portal-primary);
}

@media (max-width: 600px) {
  .theme-option {
    flex: 1 1 calc(50% - 10px);
    min-width: 0;
  }
}
</style>

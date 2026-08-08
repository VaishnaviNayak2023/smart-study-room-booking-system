<template>
  <q-page class="row items-center justify-center q-pa-lg">
    <q-card class="col-12 col-md-5 q-pa-xl login-card">
      <div class="text-h4 text-weight-bold q-mb-md">Welcome back</div>
      <div class="text-body1 text-grey-7 q-mb-lg">
        Sign in to manage your study space experience.
      </div>

      <!-- Role selector -->
      <q-btn-toggle
        v-model="role"
        class="full-width q-mb-lg role-toggle"
        :options="[
          { label: 'User', value: 'user' },
          { label: 'Admin', value: 'admin' },
        ]"
        unelevated
        no-caps
      />

      <q-form ref="loginForm" @submit.prevent="handleLogin" class="q-gutter-md">
        <q-input
          v-model="email"
          label="Email"
          type="email"
          filled
          autocomplete="email"
          :rules="emailRules"
        />
        <q-input
          v-model="password"
          label="Password"
          type="password"
          filled
          autocomplete="current-password"
          :rules="passwordRules"
        />
        <q-btn type="submit" color="primary" class="full-width" label="Login" />
      </q-form>

      <div class="q-mt-lg text-center">
        <span class="text-grey-7">No account yet?</span>
        <q-btn flat color="primary" label="Register" to="/register" />
      </div>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Notify } from 'quasar';
import { useRouter } from 'vue-router';
import { useStudyroomStore } from '@/stores/studyroom-store';

type Role = 'admin' | 'user';

const email = ref('');
const password = ref('');
const role = ref<Role>('user');
const loginForm = ref<{ validate: () => Promise<boolean> } | null>(null);
const router = useRouter();
const studyroomStore = useStudyroomStore();

const emailRules = [
  (value: string) => !!value || 'Email is required.',
  (value: string) => /.+@.+\..+/.test(value) || 'Please enter a valid email address.',
];

const passwordRules = [
  (value: string) => !!value || 'Password is required.',
  (value: string) => value.length >= 8 || 'Password must be at least 8 characters long.',
  (value: string) => /\d/.test(value) || 'Password must include at least one number.',
  (value: string) =>
    /[^A-Za-z0-9]/.test(value) || 'Password must include at least one special character.',
];

async function handleLogin() {
  const isValid = await loginForm.value?.validate();

  if (!isValid) {
    return;
  }

  try {
    const user = await studyroomStore.login(email.value, password.value, role.value);
    Notify.create({ type: 'positive', message: `Sign-in successful.` });
    await router.replace(user.role === 'admin' ? '/admin-dashboard' : '/dashboard');
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    Notify.create({ type: 'negative', message: message || 'Unable to sign in with the supplied details.' });
  }
}
</script>

<style scoped>
.role-toggle {
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  overflow: hidden;
}

.role-toggle :deep(.q-btn) {
  border-radius: 0;
  min-height: 40px;
  font-weight: 600;
}
</style>

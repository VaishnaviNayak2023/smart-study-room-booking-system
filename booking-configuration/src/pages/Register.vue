<template>
  <q-page class="row items-center justify-center q-pa-lg">
    <q-card class="col-12 col-md-6 q-pa-xl">
      <div class="text-h5 q-mb-md">Create an account</div>

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

      <q-form ref="regForm" @submit.prevent="handleRegister" class="q-gutter-md">
        <q-input v-model="email" label="Email" type="email" filled :rules="emailRules" />
        <q-input
          v-model="password"
          label="Password"
          type="password"
          filled
          :rules="passwordRules"
        />
        <q-input
          v-model="confirm"
          label="Confirm Password"
          type="password"
          filled
          :rules="confirmRules"
        />

        <div class="row items-center justify-between q-mt-md">
          <q-btn flat label="Back to login" to="/login" />
          <q-btn type="submit" color="primary" label="Register" />
        </div>
      </q-form>
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
const confirm = ref('');
const role = ref<Role>('user');
const regForm = ref<{ validate: () => Promise<boolean> } | null>(null);
const router = useRouter();
const studyroomStore = useStudyroomStore();

const emailRules = [
  (v: string) => !!v || 'Email is required.',
  (v: string) => /.+@.+\..+/.test(v) || 'Please enter a valid email address.',
];

const passwordRules = [
  (v: string) => !!v || 'Password is required.',
  (v: string) => v.length >= 8 || 'Password must be at least 8 characters long.',
  (v: string) => /\d/.test(v) || 'Password must include at least one number.',
  (v: string) => /[^A-Za-z0-9]/.test(v) || 'Password must include at least one special character.',
];

const confirmRules = [
  (v: string) => !!v || 'Please confirm your password.',
  (v: string) => v === password.value || 'Passwords do not match.',
];

async function handleRegister() {
  const isValid = await regForm.value?.validate();
  if (!isValid) return;

  if (password.value !== confirm.value) {
    Notify.create({ type: 'negative', message: 'Passwords do not match.' });
    return;
  }

  try {
    const res = await studyroomStore.register(email.value, password.value, '', role.value);
    Notify.create({
      type: 'positive',
      message: `Registration successful. Redirecting to ${res.role === 'admin' ? 'Admin' : 'User'} dashboard...`,
    });
    void router.push(res.role === 'admin' ? '/admin-dashboard' : '/dashboard');
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    Notify.create({ type: 'negative', message: message || 'Registration failed. Please try again.' });
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

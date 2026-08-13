<template>
  <q-page class="auth-page">
    <div class="auth-shell">
      <header class="auth-header">
        <router-link class="brand" to="/login"><q-icon name="meeting_room" size="22px" />{{ appName }}</router-link>
        <div class="header-links"><q-btn flat round dense icon="language" aria-label="Language" /><span>New here?</span><q-btn outline no-caps label="Create account" to="/register" /></div>
      </header>
      <div class="auth-art left-art" aria-hidden="true"><span class="dot-grid"></span><span class="outline-card"></span><span class="squiggle"></span></div>
      <div class="auth-art right-art" aria-hidden="true"><span class="desk"></span><span class="person"><i></i></span><span class="plant"></span></div>

      <q-card flat class="auth-card">
        <q-card-section>
          <div class="auth-kicker">Welcome back</div><h1>Sign in to your account</h1><p>Enter your details to continue to your workspace.</p>
          <q-btn-toggle
            v-model="role"
            class="role-toggle"
            :options="[{ label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' }]"
            unelevated
            no-caps
          />
          <q-form ref="loginForm" class="auth-form" @submit.prevent="handleLogin">
            <q-input v-model="email" outlined dense label="Email address" type="email" autocomplete="email" :rules="emailRules"><template #prepend><q-icon name="mail_outline" /></template></q-input>
            <q-input v-model="password" outlined dense label="Password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" :rules="passwordRules"><template #prepend><q-icon name="lock_outline" /></template><template #append><q-btn flat round dense :icon="showPassword ? 'visibility_off' : 'visibility'" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword" /></template></q-input>
            <q-btn type="submit" unelevated no-caps color="primary" label="Sign in" class="submit-button" :loading="studyroomStore.loading" />
          </q-form>
          <p class="switch-copy">Don't have an account? <router-link to="/register">Register now</router-link></p>
        </q-card-section>
      </q-card>
      <footer>© {{ currentYear }} {{ appName }} · <a href="mailto:support@example.com">Contact support</a></footer>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Notify } from 'quasar';
import { useRouter } from 'vue-router';
import { appConfig } from '@/config/app';
import { useStudyroomStore } from '@/stores/studyroom-store';
type Role = 'admin' | 'user';
const email = ref('');
const password = ref('');
const role = ref<Role>('user');
const showPassword = ref(false);
const loginForm = ref<{ validate: () => Promise<boolean> } | null>(null); const router = useRouter(); const studyroomStore = useStudyroomStore();
const appName = computed(() => appConfig.appName || 'Booking Portal'); const currentYear = new Date().getFullYear();
const emailRules = [(value: string) => !!value || 'Email is required.', (value: string) => /.+@.+\..+/.test(value) || 'Enter a valid email address.'];
const passwordRules = [(value: string) => !!value || 'Password is required.', (value: string) => value.length >= 8 || 'Password must be at least 8 characters long.'];
async function handleLogin() {
  if (!(await loginForm.value?.validate())) return;
  try {
    const user = await studyroomStore.login(email.value, password.value, role.value);
    Notify.create({ type: 'positive', message: 'Sign-in successful.' });
    await router.replace(user.role === 'admin' ? '/admin-dashboard' : '/dashboard');
  } catch (error: unknown) {
    const response =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string; actualRole?: string } }; message?: string }).response?.data
        : undefined;
    const message = response?.message;
    const fallback =
      typeof error === 'object' && error && 'message' in error
        ? (error as { message?: string }).message
        : undefined;
    if (response?.actualRole) {
      role.value = response.actualRole as Role;
    }
    Notify.create({
      type: 'negative',
      message: message || fallback || 'Unable to sign in with the supplied details.',
    });
  }
}
</script>

<style scoped>
/* Auth layout styles live in src/css/app.scss for theme support */
.auth-card {
  margin-top: 76px;
}
</style>

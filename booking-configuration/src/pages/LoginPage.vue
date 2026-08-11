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
          <q-btn-toggle v-model="role" class="role-toggle" :options="[{ label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' }]" unelevated no-caps />
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
const email = ref(''); const password = ref(''); const role = ref<Role>('user'); const showPassword = ref(false);
const loginForm = ref<{ validate: () => Promise<boolean> } | null>(null); const router = useRouter(); const studyroomStore = useStudyroomStore();
const appName = computed(() => appConfig.appName || 'Booking Portal'); const currentYear = new Date().getFullYear();
const emailRules = [(value: string) => !!value || 'Email is required.', (value: string) => /.+@.+\..+/.test(value) || 'Enter a valid email address.'];
const passwordRules = [(value: string) => !!value || 'Password is required.', (value: string) => value.length >= 8 || 'Password must be at least 8 characters long.'];
async function handleLogin() { if (!(await loginForm.value?.validate())) return; try { const user = await studyroomStore.login(email.value, password.value, role.value); Notify.create({ type: 'positive', message: 'Sign-in successful.' }); await router.replace(user.role === 'admin' ? '/admin-dashboard' : '/dashboard'); } catch (error: unknown) { const message = typeof error === 'object' && error && 'response' in error ? (error as { response?: { data?: { message?: string } } }).response?.data?.message : undefined; Notify.create({ type: 'negative', message: message || 'Unable to sign in with the supplied details.' }); } }
</script>

<style scoped>
.auth-page{min-height:100%;display:grid;place-items:center;padding:28px;background:#f4f7ff}.auth-shell{position:relative;isolation:isolate;width:min(1160px,100%);min-height:680px;overflow:hidden;padding:28px 54px 24px;background:#eef4ff;border:1px solid #d5e0f6;box-shadow:0 24px 70px rgba(32,65,126,.16)}.auth-header{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:20px}.brand{display:flex;align-items:center;gap:8px;color:#0e347d;font-size:19px;font-weight:800;text-decoration:none}.header-links{display:flex;align-items:center;gap:14px;color:#50617e;font-size:13px}.header-links :deep(.q-btn--outline){border-color:#9db5e8;border-radius:8px}.auth-card{position:relative;z-index:2;width:min(410px,100%);margin:76px auto 0;border-radius:22px;background:#fff;box-shadow:0 18px 40px rgba(39,63,111,.16)}.auth-card :deep(.q-card__section){padding:38px 38px 30px}.auth-kicker{color:#1976d2;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.auth-card h1{margin:8px 0 8px;color:#142744;font-size:28px;line-height:1.15}.auth-card p{margin:0;color:#65728a;font-size:14px;line-height:1.5}.role-toggle{width:100%;margin:25px 0 20px;border:1px solid #d4ddeb;border-radius:9px;overflow:hidden}.role-toggle :deep(.q-btn){min-height:38px;flex:1;color:#52617a}.role-toggle :deep(.q-btn--active){color:#fff;background:#1976d2}.auth-form{display:grid;gap:15px}.auth-form :deep(.q-field__control){border-radius:9px}.auth-form :deep(.q-field__prepend){color:#5171a9}.submit-button{min-height:48px;margin-top:6px;border-radius:9px;font-size:16px;font-weight:700}.switch-copy{text-align:center;margin-top:22px!important}.switch-copy a,footer a{color:#1976d2;font-weight:700;text-decoration:none}footer{position:relative;z-index:2;margin-top:26px;color:#6d7990;font-size:12px;text-align:center}.auth-art{position:absolute;z-index:0;color:#1976d2}.left-art{left:10%;bottom:14%;width:160px;height:220px}.dot-grid{position:absolute;bottom:0;left:0;width:64px;height:112px;background:radial-gradient(#1976d2 2px,transparent 3px) 0 0/18px 18px}.outline-card{position:absolute;right:0;top:46px;width:82px;height:58px;border:1px solid #89a8de;background:rgba(255,255,255,.35)}.squiggle{position:absolute;top:0;left:30px;width:110px;height:48px;border-bottom:2px solid #8da7d6;border-radius:50%;transform:rotate(-15deg)}.right-art{right:9%;bottom:12%;width:190px;height:245px}.desk{position:absolute;bottom:0;width:100%;height:2px;background:#b9cbe8}.person{position:absolute;right:44px;bottom:2px;width:78px;height:156px;border-radius:44px 44px 15px 15px;background:#1976d2;transform:skew(-5deg)}.person:before{content:'';position:absolute;top:-35px;left:20px;width:42px;height:42px;border-radius:50%;background:#12366f}.person i{position:absolute;left:-27px;top:64px;width:67px;height:18px;border-radius:20px;background:#91d2c4;transform:rotate(-24deg)}.plant{position:absolute;right:0;bottom:0;width:42px;height:94px;background:repeating-linear-gradient(45deg,#9fc2ff 0 7px,#fff 7px 14px)}@media(max-width:700px){.auth-shell{min-height:620px;padding:22px}.header-links span,.header-links :deep(.q-btn--outline){display:none}.auth-card{margin-top:72px}.auth-art{opacity:.4}.left-art{left:-25px}.right-art{right:-45px}.auth-card :deep(.q-card__section){padding:32px 24px}} 
</style>

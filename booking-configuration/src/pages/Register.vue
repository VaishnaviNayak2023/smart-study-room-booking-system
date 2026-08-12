<template><q-page class="auth-page"><div class="auth-shell"><header class="auth-header"><router-link class="brand" to="/login"><q-icon name="meeting_room" size="22px" />{{ appName }}</router-link><div class="header-links"><q-btn flat round dense icon="language" aria-label="Language" /><span>Already registered?</span><q-btn outline no-caps label="Sign in" to="/login" /></div></header><div class="auth-art left-art" aria-hidden="true"><span class="dot-grid"></span><span class="outline-card"></span><span class="squiggle"></span></div><div class="auth-art right-art" aria-hidden="true"><span class="desk"></span><span class="person"><i></i></span><span class="plant"></span></div><q-card flat class="auth-card register-card"><q-card-section><div class="auth-kicker">Get started</div><h1>Create your account</h1><p>Set up your profile and reserve the spaces you need.</p><q-btn-toggle v-model="role" class="role-toggle" :options="[{label:'User',value:'user'},{label:'Admin',value:'admin'}]" unelevated no-caps /><q-form ref="regForm" class="auth-form" @submit.prevent="handleRegister"><q-input v-model="name" outlined dense label="Full Name" autocomplete="name" :rules="nameRules"><template #prepend><q-icon name="person_outline" /></template></q-input><q-input v-model="email" outlined dense label="Email address" type="email" autocomplete="email" :rules="emailRules"><template #prepend><q-icon name="mail_outline" /></template></q-input><div class="row q-col-gutter-sm"><div class="col-4"><q-input v-model="phoneCountryCode" outlined dense label="Code" prefix="+" :rules="countryCodeRules" /></div><div class="col-8"><q-input v-model="phone" outlined dense label="Phone Number" autocomplete="tel" :rules="phoneRules" /></div></div><q-input v-model="password" outlined dense label="Password" :type="showPassword?'text':'password'" autocomplete="new-password" :rules="passwordRules"><template #prepend><q-icon name="lock_outline" /></template><template #append><q-btn flat round dense :icon="showPassword?'visibility_off':'visibility'" :aria-label="showPassword?'Hide password':'Show password'" @click="showPassword=!showPassword" /></template></q-input><q-input v-model="confirm" outlined dense label="Confirm password" :type="showConfirmPassword?'text':'password'" autocomplete="new-password" :rules="confirmRules"><template #prepend><q-icon name="lock_outline" /></template><template #append><q-btn flat round dense :icon="showConfirmPassword?'visibility_off':'visibility'" :aria-label="showConfirmPassword?'Hide confirm password':'Show confirm password'" @click="showConfirmPassword=!showConfirmPassword" /></template></q-input><q-btn type="submit" unelevated no-caps color="primary" label="Create account" class="submit-button" :loading="studyroomStore.loading" /></q-form><p class="switch-copy">Already have an account? <router-link to="/login">Sign in</router-link></p></q-card-section></q-card><footer>© {{ currentYear }} {{ appName }} · <a href="mailto:support@example.com">Contact support</a></footer></div></q-page></template>
<script setup lang="ts">import {computed,ref}from'vue';import{Notify}from'quasar';import{useRouter}from'vue-router';import{appConfig}from'@/config/app';import{useStudyroomStore}from'@/stores/studyroom-store';type Role='admin'|'user';const name=ref(''),email=ref(''),phone=ref(''),phoneCountryCode=ref(''),password=ref(''),confirm=ref(''),role=ref<Role>('user'),showPassword=ref(false),showConfirmPassword=ref(false),regForm=ref<{validate:()=>Promise<boolean>}|null>(null),router=useRouter(),studyroomStore=useStudyroomStore();const appName=computed(()=>appConfig.appName||'Booking Portal'),currentYear=new Date().getFullYear();const nameRules=[(v:string)=>!!v||'Name is required.'];const emailRules=[(v:string)=>!!v||'Email is required.',(v:string)=>/.+@.+\..+/.test(v)||'Enter a valid email address.'];const countryCodeRules=[(v:string)=>!!v||'Country code is required.',(v:string)=>/^\d{1,4}$/.test(v)||'Enter a valid country code.'];const phoneRules=[(v:string)=>!!v||'Phone number is required.',(v:string)=>v.replace(/\D/g,'').length>=6||'Enter a valid phone number.'];const passwordRules=[(v:string)=>!!v||'Password is required.',(v:string)=>v.length>=8||'Password must be at least 8 characters long.'];const confirmRules=[(v:string)=>!!v||'Please confirm your password.',(v:string)=>v===password.value||'Passwords do not match.'];async function handleRegister(){if(!(await regForm.value?.validate()))return;try{const user=await studyroomStore.register(email.value,password.value,name.value,role.value,phone.value,phoneCountryCode.value?`+${phoneCountryCode.value.replace(/^\+/,'')}`:'');Notify.create({type:'positive',message:'Registration successful.'});await router.replace(user.role==='admin'?'/admin-dashboard':'/dashboard')}catch(error:unknown){const message=typeof error==='object'&&error&&'response'in error?(error as{response?:{data?:{message?:string}}}).response?.data?.message:undefined;Notify.create({type:'negative',message:message||'Registration failed. Please try again.'})}}</script>
<style scoped>
/* Auth layout styles live in src/css/app.scss for theme support */
.register-card {
  margin-top: 45px;
}

.register-card :deep(.q-card__section) {
  padding: 34px 38px 26px;
}

.role-toggle {
  margin: 21px 0 17px;
}

.role-toggle :deep(.q-btn) {
  min-height: 36px;
}

.auth-form {
  gap: 13px;
}

.submit-button {
  min-height: 47px;
  margin-top: 5px;
}

.switch-copy {
  margin-top: 19px !important;
}

.auth-page footer {
  margin-top: 20px;
}

.auth-shell {
  min-height: 700px;
}

@media (max-width: 700px) {
  .auth-shell {
    min-height: 660px;
  }

  .register-card {
    margin-top: 52px;
  }

  .register-card :deep(.q-card__section) {
    padding: 30px 24px;
  }
}
</style>

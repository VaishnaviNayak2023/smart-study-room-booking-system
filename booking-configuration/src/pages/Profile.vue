<template>
  <q-page class="profile-page">
    <div class="profile-container">
      <!-- Header -->
      <div class="profile-header">
        <div class="profile-header-text">
          <div class="profile-title">My Profile</div>
          <div class="profile-subtitle">Manage your account details and preferences.</div>
        </div>
      </div>

      <div class="row q-col-gutter-md">
        <!-- Profile card -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="profile-card">
            <q-card-section class="profile-card-section">
              <div class="avatar-wrap">
                <div class="avatar-container">
                  <q-avatar size="88px" class="profile-avatar">
                    <img v-if="avatarSrc" :src="avatarSrc" alt="" />
                    <div v-else class="avatar-initials">{{ initials }}</div>
                  </q-avatar>
                  <button
                    type="button"
                    class="avatar-edit-btn"
                    aria-label="Change profile photo"
                    @click="triggerAvatarPick"
                  >
                    <q-icon name="edit" size="15px" />
                  </button>
                </div>
                <q-btn
                  v-if="avatarSrc"
                  flat
                  dense
                  no-caps
                  color="negative"
                  label="Remove photo"
                  class="remove-avatar-btn"
                  aria-label="Remove profile photo"
                  @click="removeAvatar"
                />
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/*"
                  class="hidden-file"
                  @change="onAvatarSelected"
                />
              </div>

              <div class="profile-name">{{ displayName }}</div>
              <div class="profile-email">{{ currentUser?.email }}</div>

              <q-badge
                color="primary"
                outline
                class="role-badge"
                :label="`${(currentUser?.role || 'user').toUpperCase()}`"
              />

              <q-separator class="q-my-md" />

              <div class="profile-meta">
                <div class="meta-row">
                  <q-icon name="verified_user" size="14px" color="green-6" />
                  <span>Account Active</span>
                </div>
                <div class="meta-row">
                  <q-icon name="shield" size="14px" color="primary" />
                  <span>Role: {{ currentUser?.role || 'user' }}</span>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Edit form -->
        <div class="col-12 col-md-8">
          <q-card flat bordered class="profile-card">
            <q-card-section>
              <div class="form-title">Account Details</div>

              <q-form @submit.prevent="saveProfile" class="q-gutter-md q-mt-md">
                <q-input v-model="form.name" label="Full Name" filled :rules="nameRules" />
                <q-input
                  v-model="form.email"
                  label="Email"
                  type="email"
                  filled
                  readonly
                  hint="Email cannot be changed here."
                />
                <div class="row q-col-gutter-sm">
                  <div class="col-4">
                    <q-input
                      v-model="form.phoneCountryCode"
                      label="Country Code"
                      filled
                      prefix="+"
                      :rules="countryCodeRules"
                    />
                  </div>
                  <div class="col-8">
                    <q-input v-model="form.phone" label="Phone Number" filled :rules="phoneRules" />
                  </div>
                </div>

                <div class="form-title q-mt-lg">Change Password</div>

                <q-input
                  v-model="form.currentPassword"
                  label="Current Password"
                  :type="showCurrentPassword ? 'text' : 'password'"
                  filled
                  :rules="currentPasswordRules"
                >
                  <template #append>
                    <q-btn
                      flat
                      round
                      dense
                      :icon="showCurrentPassword ? 'visibility_off' : 'visibility'"
                      @click="showCurrentPassword = !showCurrentPassword"
                    />
                  </template>
                </q-input>

                <q-input
                  v-model="form.newPassword"
                  label="New Password"
                  :type="showNewPassword ? 'text' : 'password'"
                  filled
                  :rules="passwordRules"
                >
                  <template #append>
                    <q-btn
                      flat
                      round
                      dense
                      :icon="showNewPassword ? 'visibility_off' : 'visibility'"
                      @click="showNewPassword = !showNewPassword"
                    />
                  </template>
                </q-input>

                <div class="row justify-end q-mt-md">
                  <q-btn
                    type="submit"
                    unelevated
                    no-caps
                    color="primary"
                    label="Save Changes"
                    class="save-btn"
                    :disable="!sessionReady"
                    :loading="saving"
                  />
                </div>
              </q-form>
            </q-card-section>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Notify } from 'quasar';
import { useStudyroomStore } from '@/stores/studyroom-store';

const studyroomStore = useStudyroomStore();
const currentUser = computed(() => studyroomStore.currentUser);

const avatarSrc = ref<string | null>(null);
const avatarInput = ref<HTMLInputElement | null>(null);
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const sessionReady = ref(false);
const saving = ref(false);
const initialPhone = ref('');
const initialCountryCode = ref('');

const initials = computed(() => {
  const name = (form.name || currentUser.value?.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.charAt(0) || '';
    const second = parts[1]?.charAt(0) || '';
    if (first && second) return `${first}${second}`.toUpperCase();
    if (first) return first.toUpperCase();
  }
  const email = currentUser.value?.email || '';
  return email ? email.charAt(0).toUpperCase() : 'U';
});

const displayName = computed(() => form.name || currentUser.value?.email?.split('@')[0] || 'User');

const form = reactive({
  name: currentUser.value?.name || '',
  email: currentUser.value?.email || '',
  phone: currentUser.value?.phone || '',
  phoneCountryCode: (currentUser.value?.phoneCountryCode || '').replace(/^\+/, ''),
  currentPassword: '',
  newPassword: '',
});

const nameRules = [(v: string) => !!v || 'Name is required.'];
const countryCodeRules = [(v: string) => !v || /^\d{1,4}$/.test(v) || 'Enter a valid country code.'];
const phoneRules = [(v: string) => !v || v.replace(/\D/g, '').length >= 6 || 'Enter a valid phone number.'];
const currentPasswordRules = [
  (v: string) => !form.newPassword || !!v || 'Current password is required to set a new password.',
];
const passwordRules = [
  (v: string) => !v || v.length >= 8 || 'Password must be at least 8 characters long if provided.',
];

function avatarStorageKey() {
  const id = currentUser.value?.id;
  return id ? `booking_avatar_${id}` : null;
}

function loadAvatar() {
  const key = avatarStorageKey();
  avatarSrc.value = key ? localStorage.getItem(key) : null;
}

function triggerAvatarPick() {
  avatarInput.value?.click();
}

function onAvatarSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    Notify.create({ type: 'negative', message: 'Please choose an image file.' });
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    Notify.create({ type: 'negative', message: 'Image must be under 2MB.' });
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const key = avatarStorageKey();
    const result = typeof reader.result === 'string' ? reader.result : null;
    if (!key || !result) return;
    localStorage.setItem(key, result);
    avatarSrc.value = result;
    window.dispatchEvent(new Event('booking-avatar-updated'));
    Notify.create({ type: 'positive', message: 'Profile photo updated.' });
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function removeAvatar() {
  const key = avatarStorageKey();
  if (key) localStorage.removeItem(key);
  avatarSrc.value = null;
  window.dispatchEvent(new Event('booking-avatar-updated'));
  Notify.create({ type: 'positive', message: 'Profile photo removed.' });
}

onMounted(async () => {
  try {
    await studyroomStore.validateSession();
  } catch {
    /* session refresh best-effort */
  }
  form.name = currentUser.value?.name || '';
  form.email = currentUser.value?.email || '';
  form.phone = currentUser.value?.phone || '';
  form.phoneCountryCode = (currentUser.value?.phoneCountryCode || '').replace(/^\+/, '');
  initialPhone.value = form.phone;
  initialCountryCode.value = form.phoneCountryCode;
  loadAvatar();
  sessionReady.value = true;
});

async function saveProfile() {
  if (!sessionReady.value || saving.value) return;
  saving.value = true;
  try {
    const payload: {
      name: string;
      phone?: string;
      phoneCountryCode?: string;
      currentPassword?: string;
      newPassword?: string;
    } = { name: form.name };

    if (form.phone !== initialPhone.value) {
      payload.phone = form.phone;
    }
    const nextCode = form.phoneCountryCode ? `+${form.phoneCountryCode.replace(/^\+/, '')}` : '';
    const initialCode = initialCountryCode.value ? `+${initialCountryCode.value.replace(/^\+/, '')}` : '';
    if (nextCode !== initialCode) {
      payload.phoneCountryCode = nextCode;
    }
    if (form.newPassword) {
      payload.currentPassword = form.currentPassword;
      payload.newPassword = form.newPassword;
    }

    await studyroomStore.updateProfile(payload);
    form.name = studyroomStore.currentUser?.name || form.name;
    form.phone = studyroomStore.currentUser?.phone || form.phone;
    form.phoneCountryCode = (studyroomStore.currentUser?.phoneCountryCode || '').replace(/^\+/, '');
    initialPhone.value = form.phone;
    initialCountryCode.value = form.phoneCountryCode;
    Notify.create({ type: 'positive', message: 'Profile updated successfully.' });
    form.currentPassword = '';
    form.newPassword = '';
  } catch (error: unknown) {
    console.error('Profile update failed', error);
    const message =
      typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    Notify.create({ type: 'negative', message: message || 'Failed to update profile.' });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100%;
  padding: 24px 28px 40px;
  background: var(--portal-muted-bg);
}

.profile-container {
  max-width: 1100px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 20px;
}

.profile-title {
  color: var(--portal-text);
  font-size: clamp(26px, 3vw, 32px);
  font-weight: 750;
}

.profile-subtitle {
  margin-top: 6px;
  color: var(--portal-muted);
  font-size: 14px;
}

.profile-card {
  border-color: var(--portal-border);
  border-radius: 14px;
  background: var(--portal-card);
}

.profile-card-section {
  padding: 24px;
  text-align: center;
}

.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.remove-avatar-btn {
  font-size: 12px;
}

.avatar-container {
  position: relative;
  width: 88px;
  height: 88px;
}

.avatar-edit-btn {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--portal-card);
  color: var(--portal-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  outline: none;
  box-shadow:
    0 0 0 3px #fff,
    0 2px 8px rgba(15, 23, 42, 0.14),
    0 1px 2px rgba(15, 23, 42, 0.08);
  transition:
    color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.avatar-edit-btn:hover {
  background: var(--portal-primary);
  color: var(--portal-on-primary);
  transform: scale(1.06);
  box-shadow:
    0 0 0 3px #fff,
    0 4px 14px rgba(30, 58, 138, 0.28);
}

.avatar-edit-btn:active {
  transform: scale(0.98);
}

.avatar-edit-btn:focus-visible {
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px rgba(30, 58, 138, 0.35);
}

.hidden-file {
  display: none;
}

.profile-avatar {
  background: linear-gradient(145deg, #1e3a8a 0%, #2563eb 100%);
  color: var(--portal-on-primary);
  font-size: 28px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(30, 58, 138, 0.22);
}

.avatar-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.profile-name {
  margin-top: 14px;
  color: var(--portal-text);
  font-size: 18px;
  font-weight: 700;
}

.profile-email {
  margin-top: 4px;
  color: var(--portal-muted);
  font-size: 13px;
}

.role-badge {
  margin-top: 10px;
  padding: 4px 10px;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.profile-meta {
  text-align: left;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  color: var(--portal-text-secondary);
  font-size: 13px;
}

.form-title {
  color: var(--portal-text);
  font-size: 16px;
  font-weight: 700;
}

.save-btn {
  min-height: 40px;
  padding: 0 20px;
  border-radius: 10px;
  background: var(--portal-primary);
}
</style>

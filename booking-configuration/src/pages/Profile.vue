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
                <q-avatar size="80px" class="profile-avatar">
                  <img v-if="avatarSrc" :src="avatarSrc" />
                  <div v-else class="avatar-initials">{{ initials }}</div>
                </q-avatar>
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
                  :rules="emailRules"
                />
                <q-input v-model="form.phone" label="Phone Number" filled mask="(###) ### - ####" />

                <div class="form-title q-mt-lg">Change Password</div>

                <q-input
                  v-model="form.newPassword"
                  label="New Password"
                  type="password"
                  filled
                  :rules="passwordRules"
                />

                <div class="row justify-end q-mt-md">
                  <q-btn
                    type="submit"
                    unelevated
                    no-caps
                    color="primary"
                    label="Save Changes"
                    class="save-btn"
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
const initials = computed(() => {
  const email = currentUser.value?.email || '';
  return email ? email.charAt(0).toUpperCase() : 'U';
});

const displayName = computed(() => form.name || currentUser.value?.email?.split('@')[0] || 'User');

const form = reactive({
  name: currentUser.value?.name || '',
  email: currentUser.value?.email || '',
  phone: '',
  currentPassword: '',
  newPassword: '',
});

const nameRules = [(v: string) => !!v || 'Name is required.'];
const emailRules = [
  (v: string) => !!v || 'Email is required.',
  (v: string) => /.+@.+\..+/.test(v) || 'Please enter a valid email address.',
];
const passwordRules = [
  (v: string) => !v || v.length >= 8 || 'Password must be at least 8 characters long if provided.',
];

onMounted(() => {
  form.name = currentUser.value?.name || '';
  form.email = currentUser.value?.email || '';
});

async function saveProfile() {
  try {
    await studyroomStore.updateProfile({
      name: form.name,
      ...(form.newPassword
        ? { currentPassword: form.currentPassword, newPassword: form.newPassword }
        : {}),
    });
    Notify.create({ type: 'positive', message: 'Profile updated successfully.' });
    form.currentPassword = '';
    form.newPassword = '';
  } catch (error) {
    console.error('Profile update failed', error);
    Notify.create({ type: 'negative', message: 'Failed to update profile.' });
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100%;
  padding: 22px 25px;
  background: #f7f8fc;
}

.profile-container {
  max-width: 1100px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 20px;
}

.profile-title {
  color: #111827;
  font-size: 20px;
  font-weight: 700;
}

.profile-subtitle {
  margin-top: 4px;
  color: #73798b;
  font-size: 11px;
}

.profile-card {
  border-color: #e0e3ed;
  border-radius: 8px;
  background: #fff;
}

.profile-card-section {
  padding: 24px;
  text-align: center;
}

.avatar-wrap {
  display: flex;
  justify-content: center;
}

.profile-avatar {
  background: #5148e8;
  color: #fff;
  font-size: 28px;
  font-weight: 700;
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
  color: #111827;
  font-size: 16px;
  font-weight: 700;
}

.profile-email {
  margin-top: 3px;
  color: #73798b;
  font-size: 11px;
}

.role-badge {
  margin-top: 10px;
  padding: 4px 10px;
  font-size: 9px;
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
  color: #454c60;
  font-size: 11px;
}

.form-title {
  color: #111827;
  font-size: 14px;
  font-weight: 700;
}

.save-btn {
  min-height: 36px;
  padding: 0 20px;
  border-radius: 6px;
}
</style>

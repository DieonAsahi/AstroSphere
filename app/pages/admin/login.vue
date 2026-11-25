<script setup>
// Halaman Masuk Pengelola (Admin Login) — Zero Public Register, Anti-SQLi, 30s Cooldown
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  adminLogin,
  verifyAdminSession,
  readLastActivityTimestamp,
  isAdminSessionIdleExpired,
  clearAdminSessionStorage,
  readLoginRateLimit,
  LOGIN_COOLDOWN_MS,
} from '~/utils/adminAuth.js';
import { useNetworkStatus, OFFLINE_ADMIN_NOTICE } from '~/utils/networkError.js';

definePageMeta({
  layout: false,
});

const router = useRouter();
const route = useRoute();
const { isOffline } = useNetworkStatus();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const checkingSession = ref(true);
const errorMessage = ref('');
const infoMessage = ref('');
const cooldownSeconds = ref(0);

let cooldownTimer = null;

function stopCooldownTimer() {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function updateCooldown() {
  const rl = readLoginRateLimit();
  const now = Date.now();
  if (rl.lockedUntil > now) {
    cooldownSeconds.value = Math.ceil((rl.lockedUntil - now) / 1000);
  } else {
    cooldownSeconds.value = 0;
  }
}

function startCooldownTimer() {
  updateCooldown();
  if (cooldownSeconds.value > 0 && !cooldownTimer) {
    cooldownTimer = setInterval(() => {
      updateCooldown();
      if (cooldownSeconds.value <= 0) {
        stopCooldownTimer();
      }
    }, 1000);
  }
}

onMounted(async () => {
  startCooldownTimer();

  if (route.query.reason === 'idle_timeout') {
    infoMessage.value = 'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 5 menit. Silakan masuk kembali.';
  } else if (route.query.error === 'unauthorized') {
    errorMessage.value = 'Akses ditolak: Akun Anda tidak memiliki hak akses Administrator AstroSphere.';
  }

  // Cek sesi aktif yang sah di server (getUser)
  const client = getSupabaseClient();
  if (client) {
    try {
      const lastAt = readLastActivityTimestamp();
      if (lastAt !== null && isAdminSessionIdleExpired(lastAt)) {
        clearAdminSessionStorage();
        await client.auth.signOut().catch(() => {});
      } else {
        const check = await verifyAdminSession();
        if (check.status === 'authorized') {
          router.replace('/admin');
          return;
        }
        if (check.status === 'offline') {
          // Pertahankan sesi lokal saat perangkat sedang offline tanpa menghapus penyimpanan admin
          checkingSession.value = false;
          return;
        }
        if (check.status === 'unauthorized') {
          clearAdminSessionStorage();
          await client.auth.signOut().catch(() => {});
        } else if (check.reason === 'expired' || check.reason === 'invalid_user') {
          clearAdminSessionStorage();
          await client.auth.signOut().catch(() => {});
        }
      }
    } catch {}
  }
  checkingSession.value = false;
});

onBeforeUnmount(() => {
  stopCooldownTimer();
});

async function handleLogin() {
  errorMessage.value = '';
  infoMessage.value = '';

  updateCooldown();
  if (cooldownSeconds.value > 0) {
    errorMessage.value = `Terlalu banyak percobaan gagal. Silakan tunggu ${cooldownSeconds.value} detik sebelum mencoba kembali.`;
    return;
  }

  loading.value = true;
  const res = await adminLogin(email.value, password.value);
  loading.value = false;

  if (!res.ok) {
    errorMessage.value = res.error || 'Email atau kata sandi salah.';
    startCooldownTimer();
    return;
  }

  stopCooldownTimer();
  router.push('/admin');
}
</script>

<template>
  <div class="admin-login-screen">
    <!-- Pengecekan Sesi Latar Belakang -->
    <div v-if="checkingSession" class="admin-login-loader">
      <div class="spinner" />
      <span>Memeriksa status sesi administrator…</span>
    </div>

    <div v-else class="login-card-container">
      <div class="login-card">
        <!-- Logo & Header -->
        <div class="card-header">
          <div class="logo-circle">
            <UiIcon name="logo" :size="28" />
          </div>
          <h1 class="card-title">Konsol Pengelola</h1>
          <p class="card-sub">AstroSphere Content Management System</p>
        </div>

        <!-- Notifikasi Offline -->
        <div v-if="isOffline" class="alert-box warning" role="status">
          <UiIcon name="info" :size="18" />
          <span>{{ OFFLINE_ADMIN_NOTICE }}</span>
        </div>

        <!-- Notifikasi Timeout / Info -->
        <div v-if="infoMessage" class="alert-box info" role="status">
          <UiIcon name="info" :size="18" />
          <span>{{ infoMessage }}</span>
        </div>

        <!-- Notifikasi Error -->
        <div v-if="errorMessage" class="alert-box error" role="alert">
          <UiIcon name="silang" :size="18" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Formulir Masuk Admin -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="field-wrap">
            <label for="adm-email">Email Administrator</label>
            <div class="input-icon-wrap">
              <UiIcon name="pengguna" :size="18" class="field-ic" />
              <input
                id="adm-email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="admin@contoh.id"
                :disabled="loading || cooldownSeconds > 0"
              />
            </div>
          </div>

          <div class="field-wrap">
            <label for="adm-pass">Kata Sandi</label>
            <div class="input-icon-wrap">
              <UiIcon name="kunci" :size="18" class="field-ic" />
              <input
                id="adm-pass"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                :disabled="loading || cooldownSeconds > 0"
              />
              <button
                type="button"
                class="btn-toggle-pw"
                :aria-label="showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'"
                @click="showPassword = !showPassword"
              >
                <UiIcon :name="showPassword ? 'silang' : 'mata'" :size="18" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn-submit-login"
            :disabled="loading || cooldownSeconds > 0"
          >
            <template v-if="loading">
              <div class="spinner-sm" />
              <span>Memverifikasi Akses…</span>
            </template>
            <template v-else-if="cooldownSeconds > 0">
              <UiIcon name="sejarah" :size="18" />
              <span>Tunggu {{ cooldownSeconds }} Detik…</span>
            </template>
            <template v-else>
              <span>Masuk ke Konsol CMS</span>
              <UiIcon name="lanjut" :size="16" />
            </template>
          </button>
        </form>

        <div class="card-footer">
          <NuxtLink to="/" class="back-home-link">
            <UiIcon name="kembali" :size="14" />
            <span>Kembali ke Jelajah 3D</span>
          </NuxtLink>
          <span class="ver-tag">AstroSphere v3.8</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-login-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 20%, #eff6ff 0%, #f1f5f9 100%);
  padding: 20px;
  font-family: 'Poppins', system-ui, -apple-system, sans-serif;
}

.admin-login-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.spinner-sm {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-card-container {
  width: 100%;
  max-width: 420px;
}
.login-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 32px 28px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}
.logo-circle {
  width: 52px;
  height: 52px;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #ffffff;
  border-radius: 12px;
  display: grid;
  place-items: center;
}
.card-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}
.card-sub {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #64748b;
}

.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  margin-bottom: 18px;
}
.alert-box.info {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e40af;
}
.alert-box.error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field-wrap label {
  display: block;
  font-size: 12.5px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}
.input-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field-ic {
  position: absolute;
  left: 12px;
  color: #94a3b8;
  pointer-events: none;
}
.input-icon-wrap input {
  width: 100%;
  padding: 10px 12px 10px 38px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #0f172a;
  font-size: 14px;
  transition: all 0.15s;
}
.input-icon-wrap input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}
.btn-toggle-pw {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}
.btn-toggle-pw:hover {
  color: #475569;
}

.btn-submit-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px;
  border-radius: 8px;
  background-color: #2563eb;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  margin-top: 6px;
  transition: background 0.15s;
}
.btn-submit-login:hover:not(:disabled) {
  background-color: #1d4ed8;
}
.btn-submit-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.alert-box.warning {
  background-color: #fffbeb;
  border: 1px solid #fde68a;
  color: #92400e;
}

.card-footer {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
}
.back-home-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}
.back-home-link:hover {
  text-decoration: underline;
}
.ver-tag {
  color: #94a3b8;
  font-size: 11.5px;
}
</style>

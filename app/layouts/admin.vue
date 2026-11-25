<script setup>
// Tata Letak Khusus Pengelola (Admin Layout) — Tema Terang (Light Mode)
// Menerapkan Zero-Leak Route Guard, Sesi Idle Timeout 5 Menit, dan Peringatan 30 Detik Terakhir.
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  verifyAdminSession,
  readLastActivityTimestamp,
  recordAdminActivity,
  isAdminSessionIdleExpired,
  getIdleRemainingMs,
  clearAdminSessionStorage,
  adminLogout,
  ADMIN_IDLE_WARNING_MS,
} from '~/utils/adminAuth.js';
import { useNetworkStatus, OFFLINE_ADMIN_NOTICE } from '~/utils/networkError.js';

const router = useRouter();
const route = useRoute();
const { isOffline } = useNetworkStatus();

const isVerifying = ref(true);
const isAuthorized = ref(false);
const isOfflineGate = ref(false);
const adminEmail = ref('');

// Idle Session State
const showIdleWarning = ref(false);
const idleRemainingSec = ref(30);
let idleCheckTimer = null;

const NAV_ITEMS = [
  { path: '/admin', label: 'Dasbor', icon: 'peta' },
  { path: '/admin/planets', label: 'Planet', icon: 'planet' },
  { path: '/admin/history', label: 'Sejarah', icon: 'sejarah' },
  { path: '/admin/phenomena', label: 'Fenomena', icon: 'fenomena' },
  { path: '/admin/quizzes', label: 'Kuis', icon: 'kuis' },
  { path: '/admin/facts', label: 'Tahukah Kamu?', icon: 'jurnal' },
  { path: '/admin/myths', label: 'Mitos atau Fakta', icon: 'cek' },
  { path: '/admin/ships', label: 'Hanggar Pesawat', icon: 'hanggar' },
  { path: '/admin/users', label: 'Pengguna', icon: 'pengguna' },
];

function handleUserActivity() {
  if (isAuthorized.value && !showIdleWarning.value) {
    recordAdminActivity();
  }
}

function keepSessionAlive() {
  recordAdminActivity();
  showIdleWarning.value = false;
}

async function performLogout() {
  await adminLogout();
  router.push('/admin/login');
}

function checkIdleStatus() {
  const lastAt = readLastActivityTimestamp();
  if (isAdminSessionIdleExpired(lastAt)) {
    if (idleCheckTimer) clearInterval(idleCheckTimer);
    adminLogout().then(() => {
      router.push('/admin/login?reason=idle_timeout');
    });
    return;
  }

  const remainingMs = getIdleRemainingMs(lastAt);
  if (remainingMs <= ADMIN_IDLE_WARNING_MS) {
    showIdleWarning.value = true;
    idleRemainingSec.value = Math.max(1, Math.ceil(remainingMs / 1000));
  } else {
    showIdleWarning.value = false;
  }
}

let listenersAttached = false;

function attachActivityListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;
  window.addEventListener('mousemove', handleUserActivity, { passive: true });
  window.addEventListener('keydown', handleUserActivity, { passive: true });
  window.addEventListener('click', handleUserActivity, { passive: true });
  window.addEventListener('scroll', handleUserActivity, { passive: true });
}

function reloadAdminPage(clearError) {
  if (typeof window !== 'undefined') {
    window.location.reload();
    return;
  }
  clearError?.();
}

async function verifyAndInitAdmin() {
  isVerifying.value = true;
  isOfflineGate.value = false;

  const client = getSupabaseClient();
  if (!client) {
    router.replace('/admin/login');
    return;
  }

  try {
    const check = await verifyAdminSession();
    if (check.status === 'offline') {
      isAuthorized.value = false;
      isOfflineGate.value = true;
      isVerifying.value = false;
      return;
    }

    if (check.status !== 'authorized') {
      clearAdminSessionStorage();
      await client.auth.signOut().catch(() => {});
      router.replace(check.status === 'unauthorized' ? '/admin/login?error=unauthorized' : '/admin/login');
      return;
    }

    adminEmail.value = check.user?.email || 'Admin';
    isAuthorized.value = true;
    isOfflineGate.value = false;
    isVerifying.value = false;
    recordAdminActivity();

    attachActivityListeners();
    if (!idleCheckTimer) {
      idleCheckTimer = setInterval(checkIdleStatus, 1000);
    }
  } catch {
    clearAdminSessionStorage();
    router.replace('/admin/login');
  }
}

onMounted(async () => {
  await verifyAndInitAdmin();
});

onBeforeUnmount(() => {
  if (idleCheckTimer) clearInterval(idleCheckTimer);
  if (typeof window !== 'undefined') {
    window.removeEventListener('mousemove', handleUserActivity);
    window.removeEventListener('keydown', handleUserActivity);
    window.removeEventListener('click', handleUserActivity);
    window.removeEventListener('scroll', handleUserActivity);
  }
});
</script>

<template>
  <div class="admin-theme-root">
    <!-- ZERO-LEAK LOADING SCREEN -->
    <div v-if="isVerifying" class="admin-gate-loader">
      <div class="spinner" />
      <p>Memverifikasi kredensial administrator…</p>
    </div>

    <!-- GERBANG OFFLINE ADMIN (SAAT KONEKSI TERPUTUS, SESI TETAP DIPERTAHANKAN) -->
    <div v-else-if="isOfflineGate" class="admin-offline-gate" role="alert">
      <div class="admin-offline-card">
        <div class="offline-card-ic" aria-hidden="true">
          <UiIcon name="info" :size="26" />
        </div>
        <h2>Koneksi Internet Terputus</h2>
        <p>{{ OFFLINE_ADMIN_NOTICE }}</p>
        <div class="boundary-btns">
          <button type="button" class="btn-boundary-primary" @click="verifyAndInitAdmin">
            Coba Hubungkan Ulang
          </button>
          <NuxtLink to="/" class="btn-boundary-secondary">
            Kembali ke Beranda
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- TAMPILAN RESMI PENGELOLA (HANYA MUNCUL JIKA TERAUTORISASI) -->
    <div v-else-if="isAuthorized" class="admin-shell">
      <!-- BANNER PERINGATAN IDLE TIMEOUT 30 DETIK TERAKHIR -->
      <div v-if="showIdleWarning" class="idle-warning-banner" role="alert">
        <div class="idle-content">
          <UiIcon name="info" :size="20" />
          <span>Sesi diam Anda akan berakhir dalam <b>{{ idleRemainingSec }} detik</b> karena tidak ada aktivitas.</span>
        </div>
        <button type="button" class="btn-keep-alive" @click="keepSessionAlive">
          Tetap Masuk
        </button>
      </div>

      <!-- BILAH SAMPING (SIDEBAR) -->
      <aside class="admin-sidebar">
        <div class="sidebar-brand">
          <div class="brand-badge"><UiIcon name="logo" :size="22" /></div>
          <div class="brand-text">
            <b>AstroSphere</b>
            <small>Panel Pengelola</small>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Menu Pengelola">
          <NuxtLink
            v-for="item in NAV_ITEMS"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: route.path === item.path }"
          >
            <UiIcon :name="item.icon" :size="18" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <div class="sidebar-footer">
          <NuxtLink to="/" class="public-link">
            <UiIcon name="mata" :size="16" />
            <span>Buka Simulasi Publik</span>
          </NuxtLink>

          <div class="admin-profile-box">
            <div class="admin-avatar">{{ adminEmail.slice(0, 1).toUpperCase() }}</div>
            <div class="admin-info">
              <span class="admin-email" :title="adminEmail">{{ adminEmail }}</span>
              <small class="admin-role">Administrator</small>
            </div>
            <button type="button" class="btn-logout" title="Keluar dari Panel Admin" @click="performLogout">
              <UiIcon name="keluar" :size="16" />
            </button>
          </div>
        </div>
      </aside>

      <!-- KONTEN UTAMA HALAMAN -->
      <div class="admin-main-wrap">
        <div v-if="isOffline" class="admin-offline-banner" role="status">
          <UiIcon name="info" :size="16" />
          <span>{{ OFFLINE_ADMIN_NOTICE }}</span>
        </div>

        <main class="admin-content-area">
          <NuxtErrorBoundary>
            <slot />
            <template #error="{ clearError }">
              <div class="admin-boundary-card" role="alert">
                <div class="boundary-ic" aria-hidden="true">
                  <UiIcon name="info" :size="24" />
                </div>
                <h2>Saat ini halaman masih belum bisa diakses.</h2>
                <p>Terjadi kendala saat menampilkan halaman konsol admin. Silakan muat ulang beberapa saat lagi.</p>
                <div class="boundary-btns">
                  <button type="button" class="btn-boundary-primary" @click="reloadAdminPage(clearError)">
                    Muat Ulang
                  </button>
                  <button type="button" class="btn-boundary-secondary" @click="clearError">
                    Coba Lanjutkan
                  </button>
                </div>
              </div>
            </template>
          </NuxtErrorBoundary>
        </main>
      </div>
    </div>
  </div>
</template>

<style>
/* Reset khusus tata letak admin dalam mode terang (Light Mode) */
html:has(.admin-theme-root),
body:has(.admin-theme-root),
#__nuxt:has(.admin-theme-root) {
  background-color: #f8fafc;
  color: #0f172a;
  height: 100%;
  overflow: hidden;
  -webkit-user-select: text;
  user-select: text;
}

.admin-theme-root {
  --adm-bg: #f8fafc;
  --adm-surface: #ffffff;
  --adm-border: #e2e8f0;
  --adm-border-dark: #cbd5e1;
  --adm-text: #0f172a;
  --adm-muted: #475569;
  --adm-faint: #64748b;
  --adm-primary: #2563eb;
  --adm-primary-hover: #1d4ed8;
  --adm-primary-light: #eff6ff;
  --adm-danger: #dc2626;
  --adm-danger-light: #fef2f2;
  --adm-success: #16a34a;
  --adm-success-light: #f0fdf4;
  --adm-warning: #d97706;
  --adm-warning-light: #fffbeb;

  position: fixed;
  inset: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #f8fafc;
  background-color: var(--adm-bg);
  color: var(--adm-text);
  font-family: 'Poppins', system-ui, -apple-system, sans-serif;
  -webkit-user-select: text;
  user-select: text;
}

/* Zero Leak Loader */
.admin-gate-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 100%;
  background-color: #f8fafc;
  color: #475569;
  font-size: 14px;
}
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: adm-spin 0.8s linear infinite;
}
@keyframes adm-spin {
  to { transform: rotate(360deg); }
}

.admin-shell {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-height: 100%;
  background-color: var(--adm-bg);
  position: relative;
}

/* Idle Warning Banner */
.idle-warning-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background-color: #fef3c7;
  color: #92400e;
  border-bottom: 2px solid #f59e0b;
  padding: 10px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.idle-content {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}
.btn-keep-alive {
  background-color: #d97706;
  color: #ffffff;
  border: none;
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-keep-alive:hover {
  background-color: #b45309;
}

/* Sidebar */
.admin-sidebar {
  width: 250px;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex: none;
  align-self: flex-start;
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  z-index: 20;
}
.sidebar-brand {
  padding: 20px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.brand-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: #ffffff;
  display: grid;
  place-items: center;
}
.brand-text b {
  display: block;
  font-size: 16px;
  color: #0f172a;
}
.brand-text small {
  font-size: 12px;
  color: #64748b;
}

.sidebar-nav {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}
.nav-item:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}
.nav-item.active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.sidebar-footer {
  padding: 14px;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.public-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: #64748b;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
}
.public-link:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.admin-profile-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
}
.admin-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #2563eb;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 500;
  font-size: 14px;
  flex: none;
}
.admin-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.admin-email {
  font-size: 13px;
  font-weight: 500;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.admin-role {
  font-size: 11px;
  color: #64748b;
}
.btn-logout {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: grid;
  place-items: center;
}
.btn-logout:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

/* Konten Utama */
.admin-main-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 100%;
  background-color: var(--adm-bg);
}
.admin-content-area {
  padding: 32px 28px 48px;
  flex: 1;
}

.admin-offline-gate {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 24px;
  background-color: var(--adm-bg);
}
.admin-offline-card,
.admin-boundary-card {
  width: min(460px, 100%);
  margin: 24px auto;
  padding: 28px 24px;
  border-radius: 14px;
  background-color: var(--adm-surface);
  border: 1px solid var(--adm-border);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 28px -10px rgba(15, 23, 42, 0.12);
}
.offline-card-ic,
.boundary-ic {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background-color: var(--adm-warning-light);
  color: var(--adm-warning);
  border: 1px solid #fde68a;
}
.boundary-ic {
  background-color: var(--adm-danger-light);
  color: var(--adm-danger);
  border-color: #fecaca;
}
.admin-offline-card h2,
.admin-boundary-card h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--adm-text);
}
.admin-offline-card p,
.admin-boundary-card p {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--adm-muted);
}
.boundary-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 6px;
}
.btn-boundary-primary {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background-color: var(--adm-primary);
  color: #ffffff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-boundary-primary:hover {
  background-color: var(--adm-primary-hover);
}
.btn-boundary-secondary {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid var(--adm-border-dark);
  background-color: var(--adm-surface);
  color: var(--adm-text);
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.btn-boundary-secondary:hover {
  background-color: #f1f5f9;
}
.admin-offline-banner {
  margin: 16px 28px 0;
  padding: 10px 14px;
  border-radius: 8px;
  background-color: var(--adm-warning-light);
  border: 1px solid #fde68a;
  color: #92400e;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 70px;
  }
  .brand-text, .nav-item span, .public-link span, .admin-info {
    display: none;
  }
  .sidebar-brand {
    justify-content: center;
    padding: 16px 8px;
  }
  .nav-item {
    justify-content: center;
    padding: 12px 0;
  }
  .public-link {
    justify-content: center;
    padding: 8px 0;
  }
  .sidebar-footer {
    padding: 10px 8px;
  }
  .admin-profile-box {
    flex-direction: column;
    padding: 8px 4px;
    gap: 6px;
  }
  .admin-content-area {
    padding: 20px 18px 36px;
  }
}
</style>

<script setup>
// Tata Letak Khusus Pengelola (Admin Layout) — Tema Terang (Light Mode)
// Menerapkan Zero-Leak Route Guard, Sesi Idle Timeout 5 Menit, dan Peringatan 30 Detik Terakhir.
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  verifyIsAdmin,
  readLastActivityTimestamp,
  recordAdminActivity,
  isAdminSessionIdleExpired,
  getIdleRemainingMs,
  adminLogout,
  ADMIN_IDLE_WARNING_MS,
} from '~/utils/adminAuth.js';

const router = useRouter();
const route = useRoute();

const isVerifying = ref(true);
const isAuthorized = ref(false);
const adminEmail = ref('');

// Idle Session State
const showIdleWarning = ref(false);
const idleRemainingSec = ref(30);
let idleCheckTimer = null;

const NAV_ITEMS = [
  { path: '/admin', label: 'Dasbor', icon: 'peta' },
  { path: '/admin/planets', label: 'Planet', icon: 'planet' },
  { path: '/admin/history', label: 'Sejarah & POI', icon: 'sejarah' },
  { path: '/admin/phenomena', label: 'Fenomena', icon: 'fenomena' },
  { path: '/admin/quizzes', label: 'Kuis', icon: 'kuis' },
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

onMounted(async () => {
  const client = getSupabaseClient();
  if (!client) {
    router.replace('/admin/login');
    return;
  }

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) {
      router.replace('/admin/login');
      return;
    }

    const authorized = await verifyIsAdmin(session.user);
    if (!authorized) {
      await client.auth.signOut().catch(() => {});
      router.replace('/admin/login');
      return;
    }

    adminEmail.value = session.user.email || 'Admin';
    isAuthorized.value = true;
    isVerifying.value = false;
    recordAdminActivity();

    // Pasang listener aktivitas interaksi mouse & keyboard
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('click', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    // Pemeriksaan berkala batas idle timeout setiap detik
    idleCheckTimer = setInterval(checkIdleStatus, 1000);
  } catch (err) {
    router.replace('/admin/login');
  }
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
            <span>Ke Tampilan Siswa</span>
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
        <header class="admin-topbar">
          <div class="topbar-title">
            <span class="route-tag">Admin / {{ route.name || 'Dashboard' }}</span>
          </div>
          <div class="topbar-actions">
            <NuxtLink to="/" class="btn-view-pub">
              <UiIcon name="planet" :size="15" /> Buka Simulasi Publik
            </NuxtLink>
          </div>
        </header>

        <main class="admin-content-area">
          <slot />
        </main>
      </div>
    </div>
  </div>
</template>

<style>
/* Reset khusus tata letak admin dalam mode terang (Light Mode) */
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

  min-height: 100vh;
  background-color: var(--adm-bg);
  color: var(--adm-text);
  font-family: 'Poppins', system-ui, -apple-system, sans-serif;
}

/* Zero Leak Loader */
.admin-gate-loader {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 100vh;
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
  min-height: 100vh;
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
  position: sticky;
  top: 0;
  height: 100vh;
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
}
.admin-topbar {
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 10;
}
.route-tag {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  text-transform: capitalize;
}
.btn-view-pub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #334155;
  text-decoration: none;
  border: 1px solid #e2e8f0;
}
.btn-view-pub:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}
.admin-content-area {
  padding: 24px 28px 48px;
  flex: 1;
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
}
</style>

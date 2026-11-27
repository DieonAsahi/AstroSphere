// Middleware Proteksi Rute Pengelola (Zero-Leak Route Guard)
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  verifyAdminSession,
  isAdminSessionIdleExpired,
  readLastActivityTimestamp,
  recordAdminActivity,
  clearAdminSessionStorage,
  isAdminRemembered,
  isAdminTabSessionActive,
  setAdminTabSessionActive,
} from '~/utils/adminAuth.js';

export default defineNuxtRouteMiddleware(async (to) => {
  // Rute halaman login tidak perlu diproteksi
  if (to.path === '/admin/login') return;

  if (process.client) {
    // 1. Cek sesi tab vs preferensi 'Ingat saya'
    if (!isAdminRemembered() && !isAdminTabSessionActive()) {
      clearAdminSessionStorage();
      // Jangan panggil client.auth.signOut() di sini agar tidak memutus sesi tab admin lain di localStorage
      return navigateTo('/admin/login');
    }

    // Bila user mencentang 'Ingat saya' dan membuka tab/jendela browser baru:
    if (isAdminRemembered() && !isAdminTabSessionActive()) {
      setAdminTabSessionActive();
      recordAdminActivity();
    }

    // 2. Cek batas kedaluwarsa idle 5 menit (hanya berlaku saat tab sedang berjalan)
    const lastAt = readLastActivityTimestamp();
    if (isAdminSessionIdleExpired(lastAt)) {
      clearAdminSessionStorage();
      const client = getSupabaseClient();
      if (client) await client.auth.signOut().catch(() => {});
      return navigateTo('/admin/login?reason=idle_timeout');
    }

    const client = getSupabaseClient();
    if (!client) {
      return navigateTo('/admin/login');
    }

    const check = await verifyAdminSession();
    if (check.status === 'authorized' || check.status === 'offline') {
      // Pastikan penanda sesi tab aktif
      setAdminTabSessionActive();
      // Saat offline tetapi memiliki sesi lokal, biarkan admin.vue menampilkan layar offline ramah tanpa mencabut sesi
      return;
    }

    clearAdminSessionStorage();
    await client.auth.signOut().catch(() => {});
    if (check.status === 'unauthorized') {
      return navigateTo('/admin/login?error=unauthorized');
    }
    return navigateTo('/admin/login');
  }
});

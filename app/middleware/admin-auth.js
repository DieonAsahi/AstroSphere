// Middleware Proteksi Rute Pengelola (Zero-Leak Route Guard)
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  verifyAdminSession,
  isAdminSessionIdleExpired,
  readLastActivityTimestamp,
  clearAdminSessionStorage,
} from '~/utils/adminAuth.js';

export default defineNuxtRouteMiddleware(async (to) => {
  // Rute halaman login tidak perlu diproteksi
  if (to.path === '/admin/login') return;

  if (process.client) {
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

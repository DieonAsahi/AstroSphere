// Middleware Proteksi Rute Pengelola (Zero-Leak Route Guard)
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import {
  verifyIsAdmin,
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

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session || !session.user) {
        return navigateTo('/admin/login');
      }

      const isAdmin = await verifyIsAdmin(session.user);
      if (!isAdmin) {
        return navigateTo('/admin/login?error=unauthorized');
      }
    } catch {
      return navigateTo('/admin/login?error=unauthorized');
    }
  }
});

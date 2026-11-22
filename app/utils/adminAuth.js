// Modul Keamanan & Autentikasi Pengelola (Admin Auth) AstroSphere
// Menerapkan fail-closed verification, anti-SQLi input validation, rate limiting, dan idle timeout 5 menit.
import { getSupabaseClient } from './supabaseClient.js';

export const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 300.000 ms (5 menit)
export const ADMIN_IDLE_WARNING_MS = 30 * 1000;      // 30 detik terakhir
export const ADMIN_ACTIVITY_STORAGE_KEY = 'astrosphere_admin_last_activity_at';
export const ADMIN_LOGIN_ATTEMPTS_KEY = 'astrosphere_admin_login_attempts';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_COOLDOWN_MS = 30 * 1000;          // 30 detik cooldown

const EMAIL_FORMAT_REGEX = /^[a-z0-9.!#$%&*+/=?^_{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const SQLI_OR_FORBIDDEN_CHARS_REGEX = /['"`\\;]|--|\*\/|\/\*|\b(?:or|and)\s+\d+\s*=\s*\d+|\bunion\s+select\b/i;

function hasControlChars(value) {
  if (typeof value !== 'string') return false;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export function validateAdminLoginInput(rawEmail, rawPassword) {
  const email = (rawEmail || '').trim().toLowerCase();

  if (!email || !rawPassword) {
    return {
      valid: false,
      email,
      password: rawPassword,
      error: 'Harap masukkan email dan kata sandi.',
    };
  }

  if (
    email.length > 254 ||
    hasControlChars(rawEmail) ||
    SQLI_OR_FORBIDDEN_CHARS_REGEX.test(email) ||
    !EMAIL_FORMAT_REGEX.test(email)
  ) {
    return {
      valid: false,
      email,
      password: rawPassword,
      error: 'Format email tidak valid atau mengandung karakter yang tidak diizinkan.',
    };
  }

  // Akun pemain dilarang mencoba login ke panel pengelola
  if (email.endsWith('@player.astrosphere.app')) {
    return {
      valid: false,
      email,
      password: rawPassword,
      error: 'Akun pemain tidak diizinkan mengakses area pengelola.',
    };
  }

  return {
    valid: true,
    email,
    password: rawPassword,
  };
}

function getSafeStorage(kind = 'local') {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function readLastActivityTimestamp(storage = getSafeStorage('local')) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function recordAdminActivity(now = Date.now(), storage = getSafeStorage('local')) {
  if (!storage || !Number.isFinite(now) || now <= 0) return;
  try {
    storage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(Math.floor(now)));
  } catch {}
}

export function clearAdminSessionStorage(
  localStore = getSafeStorage('local'),
  sessionStore = getSafeStorage('session')
) {
  for (const store of [localStore, sessionStore]) {
    if (!store) continue;
    try {
      store.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
      const keysToClear = [];
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
          keysToClear.push(key);
        }
      }
      for (const k of keysToClear) store.removeItem(k);
    } catch {}
  }
}

export function isAdminSessionIdleExpired(
  lastActivityAt,
  now = Date.now(),
  timeoutMs = ADMIN_IDLE_TIMEOUT_MS
) {
  if (lastActivityAt === null || !Number.isFinite(lastActivityAt)) {
    return false;
  }
  return now - lastActivityAt >= timeoutMs;
}

export function getIdleRemainingMs(
  lastActivityAt,
  now = Date.now(),
  timeoutMs = ADMIN_IDLE_TIMEOUT_MS
) {
  if (lastActivityAt === null || !Number.isFinite(lastActivityAt)) {
    return timeoutMs;
  }
  return Math.max(0, timeoutMs - Math.max(0, now - lastActivityAt));
}

export function readLoginRateLimit(storage = getSafeStorage('local')) {
  if (!storage) return { failedCount: 0, lockedUntil: 0 };
  try {
    const raw = storage.getItem(ADMIN_LOGIN_ATTEMPTS_KEY);
    if (!raw) return { failedCount: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    const failedCount = Number.isFinite(parsed.failedCount) ? parsed.failedCount : 0;
    const lockedUntil = Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : 0;
    return { failedCount, lockedUntil };
  } catch {
    return { failedCount: 0, lockedUntil: 0 };
  }
}

export function recordLoginFailure(storage = getSafeStorage('local'), now = Date.now()) {
  if (!storage) return { failedCount: 1, lockedUntil: 0 };
  try {
    const current = readLoginRateLimit(storage);
    const newCount = current.failedCount + 1;
    let lockedUntil = current.lockedUntil;
    if (newCount >= MAX_LOGIN_ATTEMPTS) {
      lockedUntil = now + LOGIN_COOLDOWN_MS;
    }
    storage.setItem(ADMIN_LOGIN_ATTEMPTS_KEY, JSON.stringify({ failedCount: newCount, lockedUntil }));
    return { failedCount: newCount, lockedUntil };
  } catch {
    return { failedCount: 1, lockedUntil: 0 };
  }
}

export function resetLoginRateLimit(storage = getSafeStorage('local')) {
  if (!storage) return;
  try {
    storage.removeItem(ADMIN_LOGIN_ATTEMPTS_KEY);
  } catch {}
}

/**
 * Pemeriksaan hak akses Admin (Fail-Closed):
 * Memastikan sesi Supabase Auth aktif dan user terdaftar di tabel public.admin_users
 */
export async function verifyIsAdmin(user) {
  const client = getSupabaseClient();
  if (!client || !user || !user.id) return false;

  const normalizedEmail = (user.email || '').trim().toLowerCase();
  // Akun pemain biasa menggunakan domain sintetis @player.astrosphere.app — fail-closed seketika
  if (normalizedEmail.endsWith('@player.astrosphere.app')) {
    return false;
  }

  try {
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session || !session.access_token || session.user?.id !== user.id) {
      return false;
    }
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      return false;
    }
  } catch {
    return false;
  }

  // Cek via RPC jika tersedia
  try {
    const { data: rpcAdmin, error: rpcError } = await client.rpc('is_admin');
    if (!rpcError && rpcAdmin === true) return true;
  } catch {}

  // Cek tabel public.admin_users berdasarkan user_id
  try {
    const { data: byUserId, error: byIdError } = await client
      .from('admin_users')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!byIdError && byUserId) return true;
  } catch {
    return false;
  }

  // Cek tabel public.admin_users berdasarkan email terverifikasi
  if (
    normalizedEmail &&
    !hasControlChars(normalizedEmail) &&
    EMAIL_FORMAT_REGEX.test(normalizedEmail) &&
    !SQLI_OR_FORBIDDEN_CHARS_REGEX.test(normalizedEmail)
  ) {
    try {
      const { data: byEmail, error: byEmailError } = await client
        .from('admin_users')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!byEmailError && byEmail) return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Alur Login Admin Lengkap
 */
export async function adminLogin(emailInput, passwordInput) {
  const rateLimit = readLoginRateLimit();
  const now = Date.now();
  if (rateLimit.lockedUntil > now) {
    const remainingSec = Math.ceil((rateLimit.lockedUntil - now) / 1000);
    return {
      ok: false,
      error: `Terlalu banyak percobaan gagal. Silakan tunggu ${remainingSec} detik sebelum mencoba kembali.`,
    };
  }

  const validation = validateAdminLoginInput(emailInput, passwordInput);
  if (!validation.valid) {
    recordLoginFailure();
    return { ok: false, error: validation.error };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      error: 'Klien Supabase belum terkonfigurasi. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY telah diatur.',
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: validation.email,
      password: validation.password,
    });

    if (error || !data.user) {
      recordLoginFailure();
      return { ok: false, error: 'Email atau kata sandi salah.' };
    }

    // Verifikasi apakah akun terdaftar sebagai admin
    const isAuthorized = await verifyIsAdmin(data.user);
    if (!isAuthorized) {
      await client.auth.signOut();
      recordLoginFailure();
      return {
        ok: false,
        error: 'Akun ini tidak memiliki hak akses administrator AstroSphere.',
      };
    }

    resetLoginRateLimit();
    recordAdminActivity();
    return { ok: true, user: data.user };
  } catch (err) {
    recordLoginFailure();
    return { ok: false, error: mapAdminAuthError(err) };
  }
}

/**
 * Alur Logout Admin
 */
export async function adminLogout() {
  clearAdminSessionStorage();
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch {}
  }
}

export function mapAdminAuthError(err) {
  const raw = typeof err === 'string' ? err : err?.message ? String(err.message) : '';
  const lower = raw.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timeout')) {
    return 'Tidak dapat terhubung ke server autentikasi Supabase. Periksa koneksi internet Anda.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan login. Harap tunggu beberapa saat sebelum mencoba kembali.';
  }
  return 'Email atau kata sandi salah.';
}

export function formatSupabaseError(err, fallback = 'Terjadi kesalahan sistem database.') {
  if (err && typeof err === 'object') {
    const msg = typeof err.message === 'string' ? err.message : '';
    const code = typeof err.code === 'string' ? err.code : '';
    const details = typeof err.details === 'string' ? err.details : '';
    const comb = `${msg} ${details}`.toLowerCase();

    if (code === '42501' || comb.includes('row-level security') || comb.includes('permission denied')) {
      return 'Akses ditolak oleh kebijakan keamanan database (RLS). Pastikan Anda masuk sebagai Admin yang sah.';
    }
    if (code === '23505' || comb.includes('duplicate key')) {
      return `Data duplikat terdeteksi oleh database (${msg || code}).`;
    }
    if (code === '23503' || comb.includes('foreign key')) {
      return `Referensi planet/data tidak valid di database (${details || msg || code}).`;
    }
    if (msg) return `${fallback}: ${msg}`;
  }
  return fallback;
}

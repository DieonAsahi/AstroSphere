// Modul Keamanan & Autentikasi Pengelola (Admin Auth) AstroSphere
// Menerapkan fail-closed verification, anti-SQLi input validation, rate limiting, dan idle timeout 5 menit.
import { getSupabaseClient } from './supabaseClient.js';
import {
  isBrowserOffline,
  isOfflineOrNetworkError,
  OFFLINE_ADMIN_NOTICE,
  GENERIC_ADMIN_ERROR,
} from './networkError.js';

export const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 300.000 ms (5 menit)
export const ADMIN_IDLE_WARNING_MS = 30 * 1000;      // 30 detik terakhir
export const ADMIN_ACTIVITY_STORAGE_KEY = 'astrosphere_admin_last_activity_at';
export const ADMIN_LOGIN_ATTEMPTS_KEY = 'astrosphere_admin_login_attempts';
export const ADMIN_REMEMBER_KEY = 'astrosphere_admin_remember';
export const ADMIN_TAB_SESSION_KEY = 'astrosphere_admin_tab_active';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_COOLDOWN_MS = 30 * 1000;          // 30 detik cooldown

const EMAIL_FORMAT_REGEX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;
const FORBIDDEN_EMAIL_CHARS_REGEX = /["`\\;<>]|\*\/|\/\*/;

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
    FORBIDDEN_EMAIL_CHARS_REGEX.test(email) ||
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
  clearAdminTabSessionActive(sessionStore);
  clearAdminRememberPreference(localStore);
  for (const store of [localStore, sessionStore]) {
    if (!store) continue;
    try {
      store.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
      store.removeItem(ADMIN_REMEMBER_KEY);
      store.removeItem(ADMIN_TAB_SESSION_KEY);
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

export function isAdminRemembered(storage = getSafeStorage('local')) {
  if (!storage) return false;
  try {
    return storage.getItem(ADMIN_REMEMBER_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminRememberPreference(remember, storage = getSafeStorage('local')) {
  if (!storage) return;
  try {
    if (remember) {
      storage.setItem(ADMIN_REMEMBER_KEY, 'true');
    } else {
      storage.removeItem(ADMIN_REMEMBER_KEY);
    }
  } catch {}
}

export function clearAdminRememberPreference(storage = getSafeStorage('local')) {
  if (!storage) return;
  try {
    storage.removeItem(ADMIN_REMEMBER_KEY);
  } catch {}
}

export function isAdminTabSessionActive(storage = getSafeStorage('session')) {
  if (!storage) return false;
  try {
    return storage.getItem(ADMIN_TAB_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAdminTabSessionActive(storage = getSafeStorage('session')) {
  if (!storage) return;
  try {
    storage.setItem(ADMIN_TAB_SESSION_KEY, '1');
  } catch {}
}

export function clearAdminTabSessionActive(storage = getSafeStorage('session')) {
  if (!storage) return;
  try {
    storage.removeItem(ADMIN_TAB_SESSION_KEY);
  } catch {}
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

export function readLoginRateLimit(storage = getSafeStorage('local'), now = Date.now()) {
  if (!storage) return { failedCount: 0, lockedUntil: 0 };
  try {
    const raw = storage.getItem(ADMIN_LOGIN_ATTEMPTS_KEY);
    if (!raw) return { failedCount: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    const failedCount = Number.isFinite(parsed.failedCount) ? parsed.failedCount : 0;
    const lockedUntil = Number.isFinite(parsed.lockedUntil) ? parsed.lockedUntil : 0;

    // Reset otomatis bila masa cooldown telah berakhir agar user kembali mendapat jatah percobaan baru
    if (lockedUntil > 0 && lockedUntil <= now) {
      storage.removeItem(ADMIN_LOGIN_ATTEMPTS_KEY);
      return { failedCount: 0, lockedUntil: 0 };
    }

    return { failedCount, lockedUntil };
  } catch {
    return { failedCount: 0, lockedUntil: 0 };
  }
}

export function recordLoginFailure(storage = getSafeStorage('local'), now = Date.now()) {
  if (!storage) return { failedCount: 1, lockedUntil: 0 };
  try {
    const current = readLoginRateLimit(storage, now);
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

async function checkAdminRoleRows(client, verifiedUser) {
  const normalizedEmail = (verifiedUser?.email || '').trim().toLowerCase();
  if (!verifiedUser?.id || normalizedEmail.endsWith('@player.astrosphere.app')) {
    return { status: 'unauthorized' };
  }

  try {
    const { data: rpcAdmin, error: rpcError } = await client.rpc('is_admin');
    if (rpcError && (isOfflineOrNetworkError(rpcError) || isBrowserOffline())) {
      return { status: 'offline' };
    }
    if (!rpcError && rpcAdmin === true) {
      // Pastikan user_id tertaut ke admin_users jika sebelumnya masih NULL
      await client.rpc('link_admin_user_id').catch(() => {});
      return { status: 'authorized' };
    }
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { status: 'offline' };
    }
  }

  try {
    const { data: byUserId, error: byIdError } = await client
      .from('admin_users')
      .select('email')
      .eq('user_id', verifiedUser.id)
      .maybeSingle();

    if (byIdError) {
      if (isOfflineOrNetworkError(byIdError) || isBrowserOffline()) {
        return { status: 'offline' };
      }
      return { status: 'unauthorized' };
    }
    if (byUserId) return { status: 'authorized' };
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { status: 'offline' };
    }
    return { status: 'unauthorized' };
  }

  if (
    normalizedEmail &&
    !hasControlChars(normalizedEmail) &&
    EMAIL_FORMAT_REGEX.test(normalizedEmail) &&
    !FORBIDDEN_EMAIL_CHARS_REGEX.test(normalizedEmail)
  ) {
    try {
      const { data: byEmail, error: byEmailError } = await client
        .from('admin_users')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (byEmailError) {
        if (isOfflineOrNetworkError(byEmailError) || isBrowserOffline()) {
          return { status: 'offline' };
        }
        return { status: 'unauthorized' };
      }
      if (byEmail) {
        // Tautkan user_id akun admin yang terverifikasi ke auth.uid()
        await client.rpc('link_admin_user_id').catch(() => {});
        return { status: 'authorized' };
      }
    } catch (err) {
      if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
        return { status: 'offline' };
      }
      return { status: 'unauthorized' };
    }
  }

  return { status: 'unauthorized' };
}

/**
 * Verifikasi sesi Admin dengan pembedaan kondisi 'offline' vs 'unauthenticated' / 'unauthorized'
 */
export async function verifyAdminSession() {
  const client = getSupabaseClient();
  if (!client) {
    return { status: 'unauthenticated', user: null, reason: 'no_client' };
  }

  let session = null;
  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) {
      if (isOfflineOrNetworkError(sessionError) || isBrowserOffline()) {
        return { status: 'offline', user: null, reason: OFFLINE_ADMIN_NOTICE };
      }
      return { status: 'unauthenticated', user: null, reason: 'session_error' };
    }
    session = sessionData?.session || null;
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { status: 'offline', user: null, reason: OFFLINE_ADMIN_NOTICE };
    }
    return { status: 'unauthenticated', user: null, reason: 'session_error' };
  }

  if (!session || !session.access_token || !session.user) {
    return { status: 'unauthenticated', user: null, reason: 'no_session' };
  }
  if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
    return { status: 'unauthenticated', user: null, reason: 'expired' };
  }

  const preNormalizedEmail = (session.user.email || '').trim().toLowerCase();
  if (preNormalizedEmail.endsWith('@player.astrosphere.app')) {
    return { status: 'unauthorized', user: session.user, reason: 'player_account' };
  }

  // Saat browser offline dan terdapat sesi non-player lokal, pertahankan sesi tanpa redirect error
  if (isBrowserOffline()) {
    return { status: 'offline', user: session.user, reason: OFFLINE_ADMIN_NOTICE };
  }

  try {
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) {
      if (isOfflineOrNetworkError(userError) || isBrowserOffline()) {
        return { status: 'offline', user: session.user, reason: OFFLINE_ADMIN_NOTICE };
      }
      return { status: 'unauthenticated', user: null, reason: 'invalid_user' };
    }
    const authUser = userData?.user;
    if (!authUser || authUser.id !== session.user.id) {
      return { status: 'unauthenticated', user: null, reason: 'invalid_user' };
    }

    const roleRes = await checkAdminRoleRows(client, authUser);
    if (roleRes.status === 'offline') {
      return { status: 'offline', user: authUser, reason: OFFLINE_ADMIN_NOTICE };
    }
    if (roleRes.status !== 'authorized') {
      return { status: 'unauthorized', user: authUser, reason: 'not_admin' };
    }
    return { status: 'authorized', user: authUser };
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { status: 'offline', user: session.user, reason: OFFLINE_ADMIN_NOTICE };
    }
    return { status: 'unauthenticated', user: null, reason: 'verify_failed' };
  }
}

/**
 * Pemeriksaan hak akses Admin (Fail-Closed + Verifikasi Server-Side getUser()):
 * Memastikan sesi Supabase Auth valid di server dan user terdaftar di public.admin_users
 */
export async function verifyIsAdmin(user) {
  const client = getSupabaseClient();
  if (!client || !user || !user.id) return false;

  const preNormalizedEmail = (user.email || '').trim().toLowerCase();
  if (preNormalizedEmail.endsWith('@player.astrosphere.app')) {
    return false;
  }

  let verifiedUser = user;
  try {
    const [{ data: { session }, error: sessionError }, { data: { user: authUser }, error: userError }] = await Promise.all([
      client.auth.getSession(),
      client.auth.getUser(),
    ]);
    if (
      sessionError ||
      userError ||
      !session ||
      !session.access_token ||
      !authUser ||
      authUser.id !== user.id ||
      session.user?.id !== user.id
    ) {
      return false;
    }
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      return false;
    }
    verifiedUser = authUser;
  } catch {
    return false;
  }

  const roleRes = await checkAdminRoleRows(client, verifiedUser);
  return roleRes.status === 'authorized';
}

/**
 * Alur Login Admin Lengkap
 */
export async function adminLogin(emailInput, passwordInput, options = {}) {
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
      error: 'Layanan belum siap. Silakan muat ulang atau coba beberapa saat lagi.',
    };
  }

  if (isBrowserOffline()) {
    return {
      ok: false,
      offline: true,
      error: OFFLINE_ADMIN_NOTICE,
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: validation.email,
      password: validation.password,
    });

    if (error || !data.user) {
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, offline: true, error: mapAdminAuthError(error) };
      }
      recordLoginFailure();
      return { ok: false, error: mapAdminAuthError(error) };
    }

    // Verifikasi apakah akun terdaftar sebagai admin
    const isAuthorized = await verifyIsAdmin(data.user);
    if (!isAuthorized) {
      if (isBrowserOffline()) {
        return { ok: false, offline: true, error: OFFLINE_ADMIN_NOTICE };
      }
      await client.auth.signOut();
      recordLoginFailure();
      return {
        ok: false,
        error: 'Akun ini tidak memiliki hak akses administrator AstroSphere.',
      };
    }

    resetLoginRateLimit();
    recordAdminActivity();
    setAdminRememberPreference(Boolean(options?.rememberMe));
    setAdminTabSessionActive();
    return { ok: true, user: data.user };
  } catch (err) {
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, error: mapAdminAuthError(err) };
    }
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
  if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
    return OFFLINE_ADMIN_NOTICE;
  }
  const raw = typeof err === 'string' ? err : err?.message ? String(err.message) : '';
  const lower = raw.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan login. Harap tunggu beberapa saat sebelum mencoba kembali.';
  }
  return 'Email atau kata sandi salah.';
}

export function formatSupabaseError(err, fallback = GENERIC_ADMIN_ERROR) {
  if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
    return OFFLINE_ADMIN_NOTICE;
  }
  if (err && typeof err === 'object') {
    const msg = typeof err.message === 'string' ? err.message : '';
    const code = typeof err.code === 'string' ? err.code : '';
    const details = typeof err.details === 'string' ? err.details : '';
    const comb = `${msg} ${details}`.toLowerCase();

    if (code === '42501' || comb.includes('row-level security') || comb.includes('permission denied')) {
      return 'Akses ditolak. Pastikan Anda masuk dengan akun Administrator yang sah.';
    }
    if (code === '23505' || comb.includes('duplicate key')) {
      if (comb.includes('urutan_planet')) {
        return 'Urutan planet (1–8) sudah digunakan oleh planet lain. Gunakan nomor urutan yang belum terpakai.';
      }
      if (comb.includes('slug')) {
        return 'Slug unik sudah digunakan pernyataan lain. Ubah atau kosongkan kolom slug.';
      }
      return 'Data dengan nilai unik tersebut sudah terdaftar di sistem.';
    }
    if (code === '23503' || comb.includes('foreign key')) {
      return 'Referensi data terkait tidak valid atau sudah dihapus.';
    }
  }
  return fallback;
}

const CSV_FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;

/**
 * Membersihkan sel CSV dari potensi formula injection (=, +, -, @, tab, CR)
 */
export function sanitizeCsvCell(value) {
  const raw = String(value ?? '');
  const safeText = CSV_FORMULA_PREFIX_REGEX.test(raw) ? `'${raw}` : raw;
  return `"${safeText.replace(/"/g, '""')}"`;
}

/**
 * Mengunduh berkas CSV aman dengan sanitasi formula injection per sel
 */
export function downloadSafeCsv(filename, headers, rows) {
  if (typeof document === 'undefined') return;
  const csvLines = [
    headers.map((h) => sanitizeCsvCell(h)).join(','),
    ...rows.map((cols) => cols.map((cell) => sanitizeCsvCell(cell)).join(',')),
  ].join('\n');
  const blob = new Blob([`\uFEFF${csvLines}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', url);
  dlAnchor.setAttribute('download', filename);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const MAX_ADMIN_IMPORT_ROWS = 200;

/**
 * Memvalidasi muatan JSON impor massal Admin: harus array objek non-kosong & tidak melebihi batas batch
 */
export function parseAdminJsonBatch(
  rawText,
  emptyArrayMsg = 'Format JSON harus berupa array objek yang tidak kosong.',
  maxRows = MAX_ADMIN_IMPORT_ROWS,
) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: 'Format JSON tidak valid. Periksa tanda kutip, koma, dan kurung.' };
  }
  if (!Array.isArray(parsed) || !parsed.length) {
    return { ok: false, error: emptyArrayMsg };
  }
  if (parsed.length > maxRows) {
    return {
      ok: false,
      error: `Maksimal ${maxRows} entri per sekali impor agar proses tetap aman dan stabil (ditemukan ${parsed.length} entri).`,
    };
  }
  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, error: `Baris ${i + 1}: entri harus berupa objek JSON.` };
    }
  }
  return { ok: true, rows: parsed };
}

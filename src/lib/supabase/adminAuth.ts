import type { User } from '@supabase/supabase-js';
import { getSupabaseConfigStatus, supabase } from './client';

export const ADMIN_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 300.000 ms (5 menit)
export const ADMIN_IDLE_WARNING_MS = 30 * 1000; // Peringatan 30 detik terakhir
export const ADMIN_ACTIVITY_STORAGE_KEY = 'astrosphere_admin_last_activity_at';
export const ADMIN_LOGIN_ATTEMPTS_KEY = 'astrosphere_admin_login_attempts';
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOGIN_COOLDOWN_MS = 30 * 1000; // Cooldown 30 detik setelah 5x gagal

const EMAIL_FORMAT_REGEX =
  /^[a-z0-9.!#$%&*+/=?^_{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

const SQLI_OR_FORBIDDEN_CHARS_REGEX =
  /['"`\\;]|--|\*\/|\/\*|\b(?:or|and)\s+\d+\s*=\s*\d+|\bunion\s+select\b/i;

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

export interface AdminLoginValidationResult {
  valid: boolean;
  email: string;
  password: string;
  error?: string;
}

export interface LoginRateLimitState {
  failedCount: number;
  lockedUntil: number;
}

/**
 * Validasi dan sanitasi ketat input login Admin untuk memblokir payload SQLi/karakter berbahaya
 * sebelum dikirim ke Supabase Auth API.
 */
export function validateAdminLoginInput(
  rawEmail: string,
  rawPassword: string
): AdminLoginValidationResult {
  const email = rawEmail.trim().toLowerCase();

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
      error: 'Format email tidak valid atau mengandung karakter tidak diizinkan.',
    };
  }

  return {
    valid: true,
    email,
    password: rawPassword,
  };
}

function getSafeStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Membaca timestamp aktivitas terakhir Admin (ms) untuk evaluasi idle timeout.
 */
export function readLastActivityTimestamp(storage: Storage | null = getSafeStorage('local')): number | null {
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

/**
 * Mencatat timestamp aktivitas terbaru Admin (tersinkronisasi antar-tab melalui localStorage).
 */
export function recordAdminActivity(
  now: number = Date.now(),
  storage: Storage | null = getSafeStorage('local')
): void {
  if (!storage || !Number.isFinite(now) || now <= 0) return;
  try {
    storage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(Math.floor(now)));
  } catch {
    // Abaikan error kuota/privasi storage
  }
}

/**
 * Menghapus jejak sesi & timestamp aktivitas Admin dari browser storage saat logout / timeout.
 */
export function clearAdminSessionStorage(
  localStore: Storage | null = getSafeStorage('local'),
  sessionStore: Storage | null = getSafeStorage('session')
): void {
  for (const store of [localStore, sessionStore]) {
    if (!store) continue;
    try {
      store.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
      const keysToClear: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
          keysToClear.push(key);
        }
      }
      for (const k of keysToClear) {
        store.removeItem(k);
      }
    } catch {
      // Abaikan error storage
    }
  }
}

/**
 * Mengevaluasi apakah sesi Admin sudah melebihi batas idle timeout (default 5 menit / 300.000 ms).
 */
export function isAdminSessionIdleExpired(
  lastActivityAt: number | null,
  now: number = Date.now(),
  timeoutMs: number = ADMIN_IDLE_TIMEOUT_MS
): boolean {
  if (lastActivityAt === null || !Number.isFinite(lastActivityAt)) {
    return false;
  }
  return now - lastActivityAt >= timeoutMs;
}

/**
 * Menghitung sisa waktu sebelum idle timeout terjadi (dalam ms).
 */
export function getIdleRemainingMs(
  lastActivityAt: number | null,
  now: number = Date.now(),
  timeoutMs: number = ADMIN_IDLE_TIMEOUT_MS
): number {
  if (lastActivityAt === null || !Number.isFinite(lastActivityAt)) {
    return timeoutMs;
  }
  return Math.max(0, timeoutMs - Math.max(0, now - lastActivityAt));
}

export function readLoginRateLimitState(
  storage: Storage | null = getSafeStorage('session')
): LoginRateLimitState {
  if (!storage) return { failedCount: 0, lockedUntil: 0 };
  try {
    const raw = storage.getItem(ADMIN_LOGIN_ATTEMPTS_KEY);
    if (!raw) return { failedCount: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LoginRateLimitState>;
    const failedCount = Number(parsed.failedCount);
    const lockedUntil = Number(parsed.lockedUntil);
    return {
      failedCount: Number.isFinite(failedCount) && failedCount >= 0 ? failedCount : 0,
      lockedUntil: Number.isFinite(lockedUntil) && lockedUntil >= 0 ? lockedUntil : 0,
    };
  } catch {
    return { failedCount: 0, lockedUntil: 0 };
  }
}

export function recordFailedLoginAttempt(
  now: number = Date.now(),
  storage: Storage | null = getSafeStorage('session')
): LoginRateLimitState {
  const prev = readLoginRateLimitState(storage);
  const nextCount = prev.lockedUntil > 0 && now >= prev.lockedUntil ? 1 : prev.failedCount + 1;
  const nextState: LoginRateLimitState = {
    failedCount: nextCount,
    lockedUntil: nextCount >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_COOLDOWN_MS : 0,
  };
  if (storage) {
    try {
      storage.setItem(ADMIN_LOGIN_ATTEMPTS_KEY, JSON.stringify(nextState));
    } catch {
      // Abaikan error storage
    }
  }
  return nextState;
}

export function resetLoginRateLimitState(
  storage: Storage | null = getSafeStorage('session')
): void {
  if (!storage) return;
  try {
    storage.removeItem(ADMIN_LOGIN_ATTEMPTS_KEY);
  } catch {
    // Abaikan error storage
  }
}

export function getLoginCooldownRemainingMs(
  state: LoginRateLimitState,
  now: number = Date.now()
): number {
  if (!state.lockedUntil || now >= state.lockedUntil) return 0;
  return state.lockedUntil - now;
}

/**
 * Memverifikasi apakah akun Supabase Auth terdaftar sebagai Administrator secara FAIL-CLOSED.
 * Mengembalikan false jika konfigurasi belum siap, session tidak valid/kedaluwarsa, atau query gagal.
 */
export async function verifyIsAdmin(user: User | null | undefined): Promise<boolean> {
  if (!getSupabaseConfigStatus().configured || !supabase) {
    return false;
  }

  if (!user || !user.id) {
    return false;
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !session.access_token || session.user?.id !== user.id) {
      return false;
    }

    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
      return false;
    }
  } catch {
    return false;
  }

  try {
    const { data: rpcAdmin, error: rpcError } = await supabase.rpc('is_admin');
    if (!rpcError && rpcAdmin === true) {
      return true;
    }
  } catch {
    // Lanjut pengecekan terparameterisasi ke tabel public.admin_users
  }

  try {
    const { data: byUserId, error: byIdError } = await supabase
      .from('admin_users')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!byIdError && byUserId) {
      return true;
    }
  } catch {
    return false;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();
  if (
    normalizedEmail &&
    !hasControlChars(normalizedEmail) &&
    EMAIL_FORMAT_REGEX.test(normalizedEmail) &&
    !SQLI_OR_FORBIDDEN_CHARS_REGEX.test(normalizedEmail)
  ) {
    try {
      const { data: byEmail, error: byEmailError } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (!byEmailError && byEmail) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Memetakan error autentikasi Supabase / jaringan ke pesan generik aman (tanpa membocorkan eksistensi akun).
 */
export function mapAdminAuthError(err: unknown): string {
  const raw =
    typeof err === 'string'
      ? err
      : err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : '';
  const lower = raw.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('timeout')
  ) {
    return 'Tidak dapat terhubung ke server autentikasi. Periksa koneksi internet dan konfigurasi Supabase Anda.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Terlalu banyak percobaan login. Harap tunggu beberapa saat sebelum mencoba lagi.';
  }
  if (lower.includes('invalid email')) {
    return 'Format alamat email tidak valid.';
  }

  // Pesan generik untuk semua kegagalan kredensial/status akun agar tidak membocorkan eksistensi admin
  return 'Email atau kata sandi salah.';
}

/**
 * Mengekstrak dan memformat error Supabase/PostgREST (termasuk object error non-Error instance)
 * menjadi pesan Bahasa Indonesia yang jelas bagi Admin.
 */
export function formatSupabaseError(err: unknown, fallbackMessage: string): string {
  if (err && typeof err === 'object') {
    const errObj = err as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };
    const rawMsg = typeof errObj.message === 'string' ? errObj.message.trim() : '';
    const code = typeof errObj.code === 'string' ? errObj.code.trim() : '';
    const details = typeof errObj.details === 'string' ? errObj.details.trim() : '';
    const combinedLower = `${rawMsg} ${details}`.toLowerCase();

    if (
      code === '42501' ||
      combinedLower.includes('row-level security') ||
      combinedLower.includes('permission denied')
    ) {
      return 'Akses ditolak oleh kebijakan keamanan database (RLS). Pastikan Anda login sebagai Admin yang sah.';
    }
    if (code === 'PGRST116' || combinedLower.includes('0 rows')) {
      return 'Data target tidak ditemukan atau akses ditolak oleh kebijakan database (RLS).';
    }
    if (code === '23505' || combinedLower.includes('duplicate key')) {
      if (combinedLower.includes('urutan_orbit')) {
        return 'Urutan orbit bentrok dengan planet lain. Gunakan angka urutan orbit yang unik.';
      }
      return `Data duplikat terdeteksi oleh database (${rawMsg || code}).`;
    }
    if (code === '23503' || combinedLower.includes('foreign key')) {
      return `Referensi planet/data tidak ditemukan di database (${details || rawMsg || code}).`;
    }
    if (code === '23514' || combinedLower.includes('check constraint')) {
      return `Nilai tidak memenuhi batasan validasi database (${rawMsg || code}).`;
    }
    if (
      combinedLower.includes('failed to fetch') ||
      combinedLower.includes('networkerror') ||
      combinedLower.includes('err_name_not_resolved')
    ) {
      return 'Koneksi ke server database Supabase gagal. Periksa internet serta SUPABASE_URL dan SUPABASE_ANON_KEY.';
    }
    if (rawMsg) {
      return `${fallbackMessage}: ${rawMsg}`;
    }
  } else if (typeof err === 'string' && err.trim()) {
    return `${fallbackMessage}: ${err.trim()}`;
  }

  return fallbackMessage;
}

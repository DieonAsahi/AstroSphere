import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
import {
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_ACTIVITY_STORAGE_KEY,
  clearAdminSessionStorage,
  formatSupabaseError,
  getIdleRemainingMs,
  getLoginCooldownRemainingMs,
  isAdminSessionIdleExpired,
  LOGIN_COOLDOWN_MS,
  mapAdminAuthError,
  MAX_LOGIN_ATTEMPTS,
  readLastActivityTimestamp,
  recordAdminActivity,
  recordFailedLoginAttempt,
  resetLoginRateLimitState,
  validateAdminLoginInput,
  verifyIsAdmin,
} from '../auth/adminAuth';
import { createClient, getSupabaseConfigStatus, supabase } from './client';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('Admin Supabase Integration, Security Hardening & Error Handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('connects Admin client directly using SUPABASE_URL and SUPABASE_ANON_KEY even when DATA_SOURCE=json', () => {
    vi.stubEnv('DATA_SOURCE', 'json');
    vi.stubEnv('VITE_DATA_SOURCE', 'json');
    vi.stubEnv('SUPABASE_URL', 'https://astrosphere-live.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'live-anon-key-123');

    const status = getSupabaseConfigStatus();
    expect(status.configured).toBe(true);
    expect(status.url).toBe('https://astrosphere-live.supabase.co');

    const client = createClient();
    expect(client).toBeDefined();
  });

  it('flags placeholder or missing Supabase credentials as unconfigured', () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

    const status = getSupabaseConfigStatus();
    expect(status.configured).toBe(false);
  });

  it('rejects SQL injection payloads and malformed emails in validateAdminLoginInput', () => {
    const sqliPayloads = [
      "' OR '1'='1",
      "admin@astrosphere.edu' OR 1=1--",
      'admin@astrosphere.edu; DROP TABLE admin_users;--',
      '"admin"@astrosphere.edu',
      'admin@astrosphere.edu/*comment*/',
      'admin@astrosphere.edu\n',
      '',
      'not-an-email',
    ];

    for (const payload of sqliPayloads) {
      const res = validateAdminLoginInput(payload, 'secret123');
      expect(res.valid).toBe(false);
      expect(res.error).toBeTruthy();
    }

    const validRes = validateAdminLoginInput('  Admin@AstroSphere.EDU ', 'admin123');
    expect(validRes.valid).toBe(true);
    expect(validRes.email).toBe('admin@astrosphere.edu');
    expect(validRes.password).toBe('admin123');
  });

  it('enforces exact 5-minute (300,000 ms) idle timeout and resets timer on activity', () => {
    expect(ADMIN_IDLE_TIMEOUT_MS).toBe(300_000);
    const storage = createMemoryStorage();
    const t0 = 1_700_000_000_000;

    recordAdminActivity(t0, storage);
    expect(readLastActivityTimestamp(storage)).toBe(t0);

    // Before 5 minutes (4m 59s) -> active
    expect(isAdminSessionIdleExpired(t0, t0 + 299_000)).toBe(false);
    expect(getIdleRemainingMs(t0, t0 + 299_000)).toBe(1_000);

    // User activity at 4m 50s resets idle timer
    const tActivity = t0 + 290_000;
    recordAdminActivity(tActivity, storage);
    expect(isAdminSessionIdleExpired(readLastActivityTimestamp(storage), t0 + 300_000)).toBe(false);
    expect(getIdleRemainingMs(readLastActivityTimestamp(storage), t0 + 300_000)).toBe(290_000);

    // Past 5 minutes from latest activity -> expired (including tab closed & reopened later)
    expect(
      isAdminSessionIdleExpired(
        readLastActivityTimestamp(storage),
        tActivity + ADMIN_IDLE_TIMEOUT_MS
      )
    ).toBe(true);
    expect(
      getIdleRemainingMs(readLastActivityTimestamp(storage), tActivity + ADMIN_IDLE_TIMEOUT_MS + 5000)
    ).toBe(0);

    // Session cleanup removes activity key and Supabase auth keys
    storage.setItem('sb-project-auth-token', 'secret-token');
    clearAdminSessionStorage(storage, null);
    expect(storage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('sb-project-auth-token')).toBeNull();
  });

  it('triggers 30-second cooldown after 5 consecutive failed login attempts', () => {
    const sessionStore = createMemoryStorage();
    const now = 1_700_000_000_000;

    for (let i = 1; i < MAX_LOGIN_ATTEMPTS; i += 1) {
      const state = recordFailedLoginAttempt(now + i * 1000, sessionStore);
      expect(getLoginCooldownRemainingMs(state, now + i * 1000)).toBe(0);
    }

    const lockedState = recordFailedLoginAttempt(now + 5000, sessionStore);
    expect(lockedState.failedCount).toBe(MAX_LOGIN_ATTEMPTS);
    expect(getLoginCooldownRemainingMs(lockedState, now + 5000)).toBe(LOGIN_COOLDOWN_MS);
    expect(getLoginCooldownRemainingMs(lockedState, now + 5000 + LOGIN_COOLDOWN_MS)).toBe(0);

    resetLoginRateLimitState(sessionStore);
    const resetCheck = recordFailedLoginAttempt(now + 60_000, sessionStore);
    expect(resetCheck.failedCount).toBe(1);
  });

  it('fails closed in verifyIsAdmin when session is missing, expired, unconfigured, or non-admin', async () => {
    // 1. Missing user
    expect(await verifyIsAdmin(null)).toBe(false);
    expect(await verifyIsAdmin(undefined)).toBe(false);

    // 2. Unconfigured env
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    const dummyUser = { id: 'user-123', email: 'student@astrosphere.edu' } as User;
    expect(await verifyIsAdmin(dummyUser)).toBe(false);

    // 3. Configured env, but null / expired session
    vi.stubEnv('SUPABASE_URL', 'https://astrosphere-live.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'live-anon-key-123');
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: { session: null },
      error: null,
    });
    expect(await verifyIsAdmin(dummyUser)).toBe(false);

    // 4. Valid session, non-admin RPC false & table lookup empty/error
    vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
      data: {
        session: {
          access_token: 'valid-jwt',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: dummyUser,
        } as never,
      },
      error: null,
    });
    vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: false,
      error: null,
    } as never);
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    } as never);

    expect(await verifyIsAdmin(dummyUser)).toBe(false);
  });

  it('returns generic non-enumerating auth errors and formats PostgREST errors', () => {
    expect(mapAdminAuthError({ message: 'Invalid login credentials' })).toBe(
      'Email atau kata sandi salah.'
    );
    expect(mapAdminAuthError({ message: 'User not found' })).toBe(
      'Email atau kata sandi salah.'
    );
    expect(mapAdminAuthError({ message: 'Email not confirmed' })).toBe(
      'Email atau kata sandi salah.'
    );

    expect(
      formatSupabaseError(
        {
          code: '42501',
          message: 'new row violates row-level security policy for table "planets"',
        },
        'Gagal simpan'
      )
    ).toMatch(/kebijakan keamanan database \(RLS\)/i);

    expect(
      formatSupabaseError(
        {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
          details: 'The result contains 0 rows',
        },
        'Gagal update'
      )
    ).toMatch(/tidak ditemukan atau akses ditolak/i);

    expect(
      formatSupabaseError(
        {
          code: '23505',
          message: 'duplicate key value violates unique constraint "planets_urutan_orbit_key"',
        },
        'Gagal update'
      )
    ).toMatch(/Urutan orbit bentrok/i);

    expect(
      formatSupabaseError(
        {
          code: '23503',
          message: 'insert or update on table "history_events" violates foreign key constraint',
        },
        'Gagal simpan'
      )
    ).toMatch(/Referensi planet\/data tidak ditemukan/i);

    expect(
      formatSupabaseError({ message: 'TypeError: Failed to fetch' }, 'Gagal memuat')
    ).toMatch(/Koneksi ke server database Supabase gagal/i);
  });
});

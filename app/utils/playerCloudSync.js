// Utilitas Autentikasi & Sinkronisasi Progres Pemain:
// - Akun Username + Password memakai RPC pgcrypto & session_token tanpa email / Supabase Email Auth.
// - Akun Google memakai Google OAuth dan tetap terhubung ke tabel public.player_progress.
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import {
  isBrowserOffline,
  isOfflineOrNetworkError,
  OFFLINE_ACTION_NOTICE,
  GENERIC_PUBLIC_ERROR,
} from './networkError.js';

const SAFE_PLAYER_COLUMNS = [
  'user_id',
  'auth_user_id',
  'auth_provider',
  'username',
  'astro_id',
  'display_name',
  'points',
  'earned',
  'selected_ship',
  'owned_ships',
  'progress_data',
  'game_state',
  'settings_data',
  'is_active',
  'banned_at',
  'banned_reason',
  'last_sign_in_at',
  'created_at',
  'updated_at',
].join(', ');

export const isValidUsername = (username) => {
  const clean = String(username || '').trim().toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(clean);
};

export const sanitizeUsername = (username) => {
  return String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
};

export function formatBannedMessage(reason = '') {
  const clean = String(reason || '').trim();
  return clean
    ? `Akun Anda telah dinonaktifkan oleh pengelola. Alasan: ${clean}`
    : 'Akun Anda telah dinonaktifkan oleh pengelola.';
}

function isBannedAuthError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  return (
    msg.includes('account_disabled') ||
    msg.includes('user is banned') ||
    msg.includes('banned') ||
    code === 'user_banned'
  );
}

function extractDisabledReason(err) {
  const raw = String(err?.message || err || '');
  const idx = raw.indexOf('ACCOUNT_DISABLED:');
  if (idx === -1) return '';
  return raw.slice(idx + 'ACCOUNT_DISABLED:'.length).trim();
}

function mapSafePlayerError(err, fallback = GENERIC_PUBLIC_ERROR) {
  if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
    return { offline: true, err: OFFLINE_ACTION_NOTICE };
  }
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const status = Number(err?.status || 0);

  if (msg.includes('ACCOUNT_DISABLED:') || lower.includes('user_banned') || lower.includes('user is banned')) {
    const bannedReason = extractDisabledReason(err);
    return { banned: true, revoked: true, bannedReason, err: formatBannedMessage(bannedReason) };
  }
  if (msg.includes('USERNAME_TAKEN') || (code === '23505' && lower.includes('username'))) {
    return { err: 'Nama penjelajah sudah digunakan.' };
  }
  if (msg.includes('INVALID_USERNAME')) {
    return { err: 'Nama penjelajah harus 3–20 karakter (huruf kecil, angka, atau garis bawah _).' };
  }
  if (msg.includes('WEAK_PASSWORD')) {
    return { err: 'Kata sandi minimal 6 karakter.' };
  }
  if (msg.includes('INVALID_CREDENTIALS') || lower.includes('invalid login credentials') || code === 'invalid_credentials') {
    return { err: 'Nama penjelajah atau kata sandi salah.' };
  }
  if (msg.includes('SESSION_INVALID')) {
    return { revoked: true, err: 'Sesi akun telah berakhir atau tidak valid. Silakan masuk kembali.' };
  }
  if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests') || msg.includes('RATE_LIMITED') || code === 'rate_limited') {
    return { err: 'Terlalu banyak percobaan masuk yang gagal. Silakan tunggu 60 detik sebelum mencoba kembali.' };
  }
  return { err: fallback };
}

function buildRpcProgressPayload(merged, astroId) {
  return {
    points: merged.points,
    earned: merged.earned,
    selected_ship: merged.selected_ship,
    owned_ships: merged.owned_ships,
    astro_id: astroId,
    progress_data: merged.progress_data,
    game_state: merged.game_state && typeof merged.game_state === 'object' ? merged.game_state : {},
    settings_data: merged.settings_data && typeof merged.settings_data === 'object' ? merged.settings_data : {},
  };
}

function resolveSessionArg(sessionOrUserId) {
  if (sessionOrUserId && typeof sessionOrUserId === 'object') {
    return {
      userId: sessionOrUserId.userId || null,
      authProvider: sessionOrUserId.authProvider || (sessionOrUserId.sessionToken ? 'username' : 'google'),
      sessionToken: sessionOrUserId.sessionToken || '',
    };
  }
  return {
    userId: typeof sessionOrUserId === 'string' ? sessionOrUserId : null,
    authProvider: 'google',
    sessionToken: '',
  };
}

// Pembuat ASTRO-ID unik otomatis (8 digit acak + tahun berjalan)
export function generateAstroId() {
  let num = 10000000;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    num = 10000000 + (buf[0] % 90000000);
  } else {
    num = Math.floor(10000000 + Math.random() * 90000000);
  }
  const year = new Date().getFullYear();
  return `${num} (${year})`;
}

// Gabungkan progres lokal tamu dengan data yang ada di awan
export function mergeProgress(cloudRow, localProgress, localSettings, localState) {
  const pData = cloudRow?.progress_data || {};
  const cBest = pData.best || {};
  const lBest = localProgress?.best || {};

  const mergedBest = { ...cBest };
  for (const [k, v] of Object.entries(lBest)) {
    mergedBest[k] = Math.max(mergedBest[k] || 0, Number(v) || 0);
  }

  const cAttempts = pData.attempts || {};
  const lAttempts = localProgress?.attempts || {};
  const mergedAttempts = { ...cAttempts };
  for (const [k, v] of Object.entries(lAttempts)) {
    mergedAttempts[k] = Math.max(mergedAttempts[k] || 0, Number(v) || 0);
  }

  const VALID_SHIPS = new Set(['astra', 'orion', 'nova']);
  const cOwned = Array.isArray(cloudRow?.owned_ships) ? cloudRow.owned_ships.filter((id) => VALID_SHIPS.has(id)) : [];
  const lOwned = Array.isArray(localProgress?.owned) ? localProgress.owned.filter((id) => VALID_SHIPS.has(id)) : [];
  const mergedOwned = [...new Set(['astra', ...cOwned, ...lOwned])];

  const mergedFound = { ...(pData.found || {}), ...(localProgress?.found || {}) };
  const mergedCards = { ...(pData.cards || {}), ...(localProgress?.cards || {}) };
  const mergedMyths = { ...(pData.myths || {}), ...(localProgress?.myths || {}) };
  const mergedPredict = { ...(pData.predict || {}), ...(localProgress?.predict || {}) };
  const mergedEvents = { ...(pData.events || {}), ...(localProgress?.events || {}) };
  const mergedMissions = { ...(pData.missions || {}), ...(localProgress?.missions || {}) };

  // Gabungkan buku catatan transaksi bintang
  const cLedger = Array.isArray(pData.ledger) ? pData.ledger : [];
  const lLedger = Array.isArray(localProgress?.ledger) ? localProgress.ledger : [];
  const ledgerMap = new Map();
  for (const item of [...cLedger, ...lLedger]) {
    if (item && item.id) ledgerMap.set(item.id, item);
  }
  const mergedLedger = Array.from(ledgerMap.values()).slice(-60);

  const mergedPoints = Math.min(50000, Math.max(0, Math.floor(Math.max(cloudRow?.points || 0, localProgress?.points || 0))));
  const mergedEarned = Math.min(50000, Math.max(mergedPoints, Math.floor(Math.max(cloudRow?.earned || 0, localProgress?.earned || 0))));

  const selectedShip = mergedOwned.includes(localProgress?.selectedShip)
    ? localProgress.selectedShip
    : (mergedOwned.includes(cloudRow?.selected_ship) ? cloudRow.selected_ship : 'astra');

  // Game state: pilih yang tersimpan paling baru (pastikan selalu objek JSONB valid, bukan null)
  const cSavedAt = cloudRow?.game_state?.savedAt || 0;
  const lSavedAt = localState?.savedAt || 0;
  const rawMergedState = lSavedAt >= cSavedAt ? (localState || cloudRow?.game_state || {}) : (cloudRow?.game_state || localState || {});
  const mergedGameState = rawMergedState && typeof rawMergedState === 'object' && !Array.isArray(rawMergedState) ? rawMergedState : {};

  // Pengaturan preferensi, keymap & tata letak sentuh terisolasi (jangan wariskan milik tamu ke akun awan)
  const cloudKeymap = cloudRow?.progress_data?.keymap || cloudRow?.settings_data?.keys || null;
  const cloudTouchLayout = cloudRow?.progress_data?.touchLayout || cloudRow?.settings_data?.touchLayout || null;
  const mergedSettings = {
    ...(cloudRow?.settings_data || {}),
    ...(localSettings || {}),
  };
  mergedSettings.keys = cloudKeymap || {};
  if (cloudTouchLayout && typeof cloudTouchLayout === 'object') {
    mergedSettings.touchLayout = cloudTouchLayout;
  } else {
    delete mergedSettings.touchLayout;
  }

  return {
    points: mergedPoints,
    earned: mergedEarned,
    selected_ship: selectedShip,
    owned_ships: mergedOwned,
    progress_data: {
      best: mergedBest,
      attempts: mergedAttempts,
      ledger: mergedLedger,
      predict: mergedPredict,
      myths: mergedMyths,
      cards: mergedCards,
      found: mergedFound,
      events: mergedEvents,
      missions: mergedMissions,
      keymap: cloudKeymap || {},
      ...(cloudTouchLayout && typeof cloudTouchLayout === 'object' ? { touchLayout: cloudTouchLayout } : {}),
    },
    game_state: mergedGameState,
    settings_data: mergedSettings,
  };
}

// Cek ketersediaan username via Supabase RPC
export async function checkUsernameAvailability(username) {
  const clean = sanitizeUsername(username);
  if (!isValidUsername(clean)) {
    return { ok: false, available: false, msg: 'Nama pengguna harus 3–20 karakter alfanumerik (huruf kecil, angka, atau garis bawah).' };
  }

  const client = getSupabaseClient();
  if (!client) {
    // Mode offline / fallback lokal
    return { ok: true, available: true, offline: true, noClient: true };
  }
  if (isBrowserOffline()) {
    return { ok: true, available: true, offline: true };
  }

  try {
    const { data, error } = await client.rpc('is_username_available', { p_username: clean });
    if (error) throw error;
    return { ok: true, available: !!data };
  } catch (err) {
    console.warn('[AstroSphere] Gagal mengecek ketersediaan nama:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: true, available: true, offline: true };
    }
    return { ok: true, available: true, warning: 'Pemeriksaan nama tertunda, melanjutkan proses pendaftaran.' };
  }
}

// Pendaftaran Pemain Baru via RPC player_register_username (tanpa email)
export async function registerPlayerToCloud(username, password, localStoreData) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!isValidUsername(cleanUsername)) {
    return { ok: false, err: 'Nama penjelajah harus 3–20 karakter (huruf kecil, angka, atau garis bawah _).' };
  }
  if (!password || password.length < 6) {
    return { ok: false, err: 'Kata sandi minimal 6 karakter.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, offline: true, noClient: true, err: 'Layanan akun belum tersedia. Data disimpan di perangkat ini.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    const merged = mergeProgress(null, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    const desiredAstroId = (typeof localStoreData?.astroId === 'string' && localStoreData.astroId.trim()) || generateAstroId();

    const { data: row, error } = await client.rpc('player_register_username', {
      p_username: cleanUsername,
      p_password: password,
      p_astro_id: desiredAstroId,
      p_progress: buildRpcProgressPayload(merged, desiredAstroId),
    });

    if (error) {
      console.error('[AstroSphere] player_register_username gagal:', error);
      const mapped = mapSafePlayerError(error, 'Tidak dapat membuat akun saat ini. Silakan coba lagi.');
      return { ok: false, offline: !!mapped.offline, err: mapped.err };
    }

    if (!row || !row.user_id || !row.session_token) {
      console.error('[AstroSphere] player_register_username mengembalikan data tidak lengkap (ID atau token sesi hilang).');
      return { ok: false, err: 'Tidak dapat membuat akun saat ini. Silakan coba lagi.' };
    }

    return {
      ok: true,
      userId: row.user_id,
      user: { id: row.user_id },
      username: row.username || cleanUsername,
      displayName: row.display_name || cleanUsername,
      astroId: row.astro_id || desiredAstroId,
      sessionToken: row.session_token,
      authProvider: 'username',
      mergedData: mergeProgress(row, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState),
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan tak terduga saat pendaftaran username:', err);
    const mapped = mapSafePlayerError(err, 'Tidak dapat membuat akun saat ini. Silakan coba lagi.');
    return { ok: false, offline: !!mapped.offline, err: mapped.err };
  }
}

// Masuk Akun Username + Password via RPC player_login_username (tanpa email)
export async function loginPlayerToCloud(username, password, localStoreData) {
  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) {
    return { ok: false, err: 'Isi nama penjelajah.' };
  }
  if (!password) {
    return { ok: false, err: 'Isi kata sandi.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, offline: true, noClient: true, err: 'Layanan akun belum tersedia saat ini.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    const { data: row, error } = await client.rpc('player_login_username', {
      p_username: cleanUsername,
      p_password: password,
    });

    if (error) {
      const mapped = mapSafePlayerError(error, 'Tidak dapat masuk ke akun saat ini. Silakan coba lagi.');
      if (!mapped.banned && mapped.err !== 'Nama penjelajah atau kata sandi salah.') {
        console.error('[AstroSphere] player_login_username gagal:', error);
      }
      return {
        ok: false,
        offline: !!mapped.offline,
        banned: !!mapped.banned,
        bannedReason: mapped.bannedReason || '',
        err: mapped.err,
        unknown: false,
      };
    }

    if (!row || !row.user_id || !row.session_token) {
      console.error('[AstroSphere] player_login_username mengembalikan data tidak lengkap (ID atau token sesi hilang).');
      return { ok: false, err: 'Tidak dapat masuk ke akun saat ini. Silakan coba lagi.' };
    }

    if (row.is_active === false) {
      const reason = String(row.banned_reason || '').trim();
      return {
        ok: false,
        banned: true,
        bannedReason: reason,
        err: formatBannedMessage(reason),
        unknown: false,
      };
    }

    const merged = mergeProgress(row, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    const assignedAstroId = row.astro_id || localStoreData?.astroId || generateAstroId();

    // Gabungkan progres tamu lokal jika ada tambahan capaian lalu sinkronkan via player_sync_username
    const { error: syncErr } = await client.rpc('player_sync_username', {
      p_user_id: row.user_id,
      p_session_token: row.session_token,
      p_progress: buildRpcProgressPayload(merged, assignedAstroId),
      p_game_state: merged.game_state,
    });

    if (syncErr) {
      console.error('[AstroSphere] Peringatan sinkronisasi pasca-login username:', syncErr);
    }

    return {
      ok: true,
      userId: row.user_id,
      user: { id: row.user_id },
      username: row.username || cleanUsername,
      displayName: row.display_name || cleanUsername,
      astroId: assignedAstroId,
      sessionToken: row.session_token,
      authProvider: 'username',
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan tak terduga saat masuk akun:', err);
    const mapped = mapSafePlayerError(err, 'Tidak dapat masuk ke akun saat ini. Silakan coba lagi.');
    return {
      ok: false,
      offline: !!mapped.offline,
      banned: !!mapped.banned,
      err: mapped.err,
    };
  }
}

// Otentikasi Google OAuth
export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, offline: true, noClient: true, err: 'Layanan masuk dengan Google belum siap saat ini.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }
  try {
    let redirectTo;
    if (typeof window !== 'undefined') {
      // Bersihkan query error / parameter callback lama dari URL sebelum memulai OAuth baru
      if ((window.location.search || window.location.hash) && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname || '/');
      }
      redirectTo = window.location.origin;
    }
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error('[AstroSphere] Gagal memulai autentikasi Google:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Tidak dapat terhubung ke layanan Google saat ini. Silakan coba lagi.' };
  }
}

// Buat username unik & valid untuk pengguna Google baru
export function generateGoogleUsername(user) {
  const raw = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '') || 'penjelajah';
  let base = sanitizeUsername(raw).slice(0, 14);
  if (base.length < 3) base = 'penjelajah';
  const rand = Math.floor(1000 + Math.random() * 9000);
  let candidate = `${base}_${rand}`.slice(0, 20);
  if (!isValidUsername(candidate)) {
    candidate = `user_${Date.now().toString().slice(-6)}`;
  }
  return candidate;
}

// Sinkronisasi Sesi Pemain Google (OAuth) dengan public.player_progress
export async function syncGooglePlayerSession(user, localStoreData) {
  if (!user) return { ok: false };
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    // 1. Baca status baris public.player_progress TERLEBIH DAHULU sebelum memutus sesi agar banned_reason terbaca jelas
    const { data: progressRow, error: pErr } = await client
      .from('player_progress')
      .select(SAFE_PLAYER_COLUMNS)
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (pErr) {
      console.error('[AstroSphere] Gagal membaca player_progress untuk Google user:', pErr);
      if (isOfflineOrNetworkError(pErr) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      if (isBannedAuthError(pErr) || (user.banned_until && new Date(user.banned_until) > new Date())) {
        await client.auth.signOut({ scope: 'local' }).catch(() => {});
        return { ok: false, banned: true, bannedReason: '', err: formatBannedMessage() };
      }
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
    }

    if (progressRow?.is_active === false) {
      const reason = String(progressRow.banned_reason || '').trim();
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        ok: false,
        banned: true,
        bannedReason: reason,
        err: formatBannedMessage(reason),
      };
    }

    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      const reason = String(progressRow?.banned_reason || '').trim();
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return { ok: false, banned: true, bannedReason: reason, err: formatBannedMessage(reason) };
    }

    let username = progressRow?.username;
    let displayName = String(
      progressRow?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Penjelajah')
    ).trim() || 'Penjelajah';

    if (!username || !isValidUsername(username)) {
      username = generateGoogleUsername(user);
    }

    // 2. Gabungkan capaian tamu lokal (mergeProgress) ke akun Google tersebut
    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    const saveGoogleRow = async (uname, astroId) => {
      const mutableFields = {
        username: uname,
        astro_id: astroId,
        display_name: displayName,
        points: merged.points,
        earned: merged.earned,
        selected_ship: merged.selected_ship,
        owned_ships: merged.owned_ships,
        progress_data: merged.progress_data,
        game_state: merged.game_state,
        settings_data: merged.settings_data,
        last_sign_in_at: new Date().toISOString(),
      };
      if (progressRow?.user_id) {
        return client.from('player_progress').update(mutableFields).eq('user_id', progressRow.user_id);
      }
      return client.from('player_progress').insert({
        user_id: user.id,
        auth_user_id: user.id,
        auth_provider: 'google',
        is_active: true,
        ...mutableFields,
      });
    };

    // 3. Insert / Update baris progres di public.player_progress (dengan coba ulang unik jika astro_id / username bertabrakan)
    let upsertRes = await saveGoogleRow(username, assignedAstroId);

    for (let attempt = 0; attempt < 3 && upsertRes.error; attempt++) {
      const msg = String(upsertRes.error.message || '').toLowerCase();
      const code = String(upsertRes.error.code || '');
      if (code === '23505' || msg.includes('astro_id') || msg.includes('username') || msg.includes('unique')) {
        if (!progressRow && (msg.includes('username') || code === '23505')) {
          username = generateGoogleUsername(user);
        }
        if (msg.includes('astro_id') || code === '23505') {
          assignedAstroId = generateAstroId();
        }
        upsertRes = await saveGoogleRow(username, assignedAstroId);
      } else {
        break;
      }
    }

    if (upsertRes.error) {
      console.error('[AstroSphere] Gagal menyimpan data player_progress Google user:', upsertRes.error);
      if (isOfflineOrNetworkError(upsertRes.error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
    }

    return {
      ok: true,
      user,
      userId: progressRow?.user_id || user.id,
      username,
      displayName,
      astroId: assignedAstroId,
      authProvider: 'google',
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Gagal sinkronisasi sesi Google user:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: GENERIC_PUBLIC_ERROR };
  }
}

// Debounce Timer & Kontrol Antrean Sinkronisasi Otomatis
let saveTimer = null;
let isSaving = false;
let saveGeneration = 0;
let pendingSaveArgs = null;

export function cancelScheduledCloudSave() {
  saveGeneration += 1;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingSaveArgs = null;
}

// Keluar Akun (bersihkan antrean simpan & sesi Auth jika Google)
export async function logoutPlayerFromCloud(sessionOrUserId = null, { localOnly = false } = {}) {
  cancelScheduledCloudSave();
  const { authProvider } = resolveSessionArg(sessionOrUserId);
  const client = getSupabaseClient();
  if (client && authProvider !== 'username') {
    try {
      await client.auth.signOut(localOnly ? { scope: 'local' } : undefined);
    } catch (err) {
      console.error('[AstroSphere] Kesalahan saat logout:', err);
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  }
  return { ok: true };
}

async function executeCloudSave(args) {
  if (!args) return;
  const { sessionOrUserId, payloadGetter, onSavedCallback, onRevokedCallback, gen } = args;
  if (gen !== saveGeneration) return;

  const { userId, authProvider, sessionToken } = resolveSessionArg(sessionOrUserId);
  if (!userId) return;

  const client = getSupabaseClient();
  if (!client || isSaving || isBrowserOffline()) return;

  isSaving = true;
  try {
    const payload = payloadGetter();
    if (!payload || gen !== saveGeneration) return;

    if (authProvider === 'username' && sessionToken) {
      const { error: rpcErr } = await client.rpc('player_sync_username', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_progress: {
          points: payload.points,
          earned: payload.earned,
          selected_ship: payload.selected_ship,
          owned_ships: payload.owned_ships,
          astro_id: payload.astro_id,
          progress_data: payload.progress_data,
          settings_data: payload.settings_data,
        },
        p_game_state: payload.game_state && typeof payload.game_state === 'object' ? payload.game_state : {},
      });

      if (gen !== saveGeneration) return;
      if (rpcErr) {
        if (isOfflineOrNetworkError(rpcErr) || isBrowserOffline()) return;
        const mapped = mapSafePlayerError(rpcErr);
        if (mapped.banned || mapped.revoked) {
          onRevokedCallback?.({
            banned: !!mapped.banned,
            bannedReason: mapped.bannedReason || '',
            reason: mapped.err,
          });
          return;
        }
        console.error('[AstroSphere] Gagal sinkronisasi otomatis akun username:', rpcErr);
        return;
      }

      onSavedCallback?.();
      return;
    }

    // Jalur Google OAuth: periksa status is_active di player_progress dahulu sebelum cek/putus Auth agar alasan terbaca
    const { data: statusPrecheck, error: statusPreErr } = await client
      .from('player_progress')
      .select('is_active, banned_reason')
      .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (gen !== saveGeneration) return;
    if (!statusPreErr) {
      if (!statusPrecheck || statusPrecheck.is_active === false) {
        const reason = String(statusPrecheck?.banned_reason || '').trim();
        onRevokedCallback?.({
          banned: statusPrecheck?.is_active === false,
          bannedReason: reason,
          reason: statusPrecheck?.is_active === false
            ? formatBannedMessage(reason)
            : 'Akun Anda tidak ditemukan atau telah dihapus oleh pengelola.',
        });
        return;
      }
    } else if (isOfflineOrNetworkError(statusPreErr) || isBrowserOffline()) {
      return;
    }

    const { data: authCheck, error: authCheckErr } = await client.auth.getUser();
    if (gen !== saveGeneration) return;
    if (authCheckErr || !authCheck?.user) {
      if (isOfflineOrNetworkError(authCheckErr) || isBrowserOffline()) return;
      const banned = isBannedAuthError(authCheckErr);
      onRevokedCallback?.({
        banned,
        bannedReason: '',
        reason: banned ? formatBannedMessage() : 'Sesi akun tidak lagi valid atau telah dihapus.',
      });
      return;
    }

    const updateData = {
      points: payload.points,
      earned: payload.earned,
      selected_ship: payload.selected_ship,
      owned_ships: payload.owned_ships,
      progress_data: payload.progress_data,
      game_state: payload.game_state && typeof payload.game_state === 'object' ? payload.game_state : {},
      settings_data: payload.settings_data,
      updated_at: new Date().toISOString(),
    };
    if (payload.astro_id) {
      updateData.astro_id = payload.astro_id;
    }

    const { error } = await client.from('player_progress').update(updateData).eq('user_id', userId);
    if (gen !== saveGeneration) return;

    if (error) {
      const { data: rowStatus } = await client
        .from('player_progress')
        .select('is_active, banned_reason')
        .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();

      if (gen !== saveGeneration) return;
      if (!rowStatus || rowStatus.is_active === false) {
        const reason = String(rowStatus?.banned_reason || '').trim();
        onRevokedCallback?.({
          banned: rowStatus?.is_active === false,
          bannedReason: reason,
          reason: rowStatus?.is_active === false
            ? formatBannedMessage(reason)
            : 'Akun Anda tidak ditemukan atau telah dihapus oleh pengelola.',
        });
        return;
      }
    } else {
      onSavedCallback?.();
    }
  } catch (err) {
    console.error('[AstroSphere] Gagal sinkronisasi otomatis:', err);
  } finally {
    isSaving = false;
  }
}

// Simpan Progres Otomatis dengan Jeda (Debounce 2 Detik)
export function scheduleCloudSave(sessionOrUserId, payloadGetter, onSavedCallback, onRevokedCallback) {
  const { userId } = resolveSessionArg(sessionOrUserId);
  if (!userId) return;
  if (saveTimer) clearTimeout(saveTimer);
  const gen = ++saveGeneration;
  pendingSaveArgs = { sessionOrUserId, payloadGetter, onSavedCallback, onRevokedCallback, gen };

  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const args = pendingSaveArgs;
    pendingSaveArgs = null;
    if (!args || gen !== saveGeneration) return;
    await executeCloudSave(args);
  }, 2000);
}

// Langsung eksekusi sinkronisasi jika ada simpanan yang tertahan di timer debounce (misal saat tab ditutup / backgrounded)
export async function flushScheduledCloudSave() {
  if (!saveTimer && !pendingSaveArgs) return;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const args = pendingSaveArgs;
  pendingSaveArgs = null;
  if (!args) return;
  await executeCloudSave(args);
}

// Pemeriksaan ringan status aktif akun (username & Google) untuk deteksi real-time penonaktifan
let inFlightStatusCheck = null;
let inFlightStatusKey = '';

export async function checkPlayerAccountStatus(sessionOrUserId) {
  const { userId, authProvider, sessionToken } = resolveSessionArg(sessionOrUserId);
  if (!userId) return { ok: true, active: true };
  if (authProvider === 'username' && !sessionToken) return { ok: true, active: true };

  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) return { ok: false, offline: true };

  const key = `${userId}:${authProvider}`;
  if (inFlightStatusCheck && inFlightStatusKey === key) {
    return inFlightStatusCheck;
  }

  inFlightStatusKey = key;
  inFlightStatusCheck = (async () => {
    try {
      if (authProvider === 'username') {
        const { data, error } = await client.rpc('player_sync_username', {
          p_user_id: userId,
          p_session_token: sessionToken,
          p_progress: null,
          p_game_state: null,
        });

        if (error) {
          if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
            return { ok: false, offline: true };
          }
          const mapped = mapSafePlayerError(error);
          if (mapped.banned || mapped.revoked) {
            return {
              ok: false,
              active: false,
              banned: !!mapped.banned,
              revoked: true,
              bannedReason: mapped.bannedReason || '',
              err: mapped.err,
            };
          }
          return { ok: true, active: true };
        }

        if (!data || !data.user_id) {
          return {
            ok: false,
            active: false,
            banned: false,
            revoked: true,
            err: 'Sesi akun telah berakhir. Silakan masuk kembali.',
          };
        }

        if (data.is_active === false) {
          const reason = String(data.banned_reason || '').trim();
          return {
            ok: false,
            active: false,
            banned: true,
            revoked: true,
            bannedReason: reason,
            err: formatBannedMessage(reason),
          };
        }

        return { ok: true, active: true };
      }

      // Jalur Google: baca SELECT is_active, banned_reason lebih dahulu sebelum memanggil Auth/signOut
      const { data: row, error: qErr } = await client
        .from('player_progress')
        .select('is_active, banned_reason')
        .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
        .maybeSingle();

      if (!qErr) {
        if (!row) {
          return {
            ok: false,
            active: false,
            banned: false,
            revoked: true,
            notFound: true,
            err: 'Akun Anda tidak ditemukan atau telah dihapus oleh pengelola.',
          };
        }
        if (row.is_active === false) {
          const reason = String(row.banned_reason || '').trim();
          return {
            ok: false,
            active: false,
            banned: true,
            revoked: true,
            bannedReason: reason,
            err: formatBannedMessage(reason),
          };
        }
        return { ok: true, active: true };
      }

      if (isOfflineOrNetworkError(qErr) || isBrowserOffline()) {
        return { ok: false, offline: true };
      }
      if (isBannedAuthError(qErr)) {
        return {
          ok: false,
          active: false,
          banned: true,
          revoked: true,
          bannedReason: '',
          err: formatBannedMessage(),
        };
      }

      const { data: uData, error: uErr } = await client.auth.getUser();
      if (uErr) {
        if (isOfflineOrNetworkError(uErr) || isBrowserOffline()) {
          return { ok: false, offline: true };
        }
        if (isBannedAuthError(uErr)) {
          return {
            ok: false,
            active: false,
            banned: true,
            revoked: true,
            bannedReason: '',
            err: formatBannedMessage(),
          };
        }
        const status = Number(uErr?.status || 0);
        const code = String(uErr?.code || '').toLowerCase();
        if (status === 401 || status === 403 || code.includes('session')) {
          return {
            ok: false,
            active: false,
            banned: false,
            revoked: true,
            err: 'Sesi akun telah berakhir. Silakan masuk kembali.',
          };
        }
      } else if (!uData?.user) {
        return {
          ok: false,
          active: false,
          banned: false,
          revoked: true,
          err: 'Sesi akun telah berakhir. Silakan masuk kembali.',
        };
      }

      return { ok: true, active: true };
    } catch (err) {
      if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
        return { ok: false, offline: true };
      }
      console.warn('[AstroSphere] Pemeriksaan status akun tertunda:', err);
      return { ok: true, active: true };
    } finally {
      inFlightStatusCheck = null;
      inFlightStatusKey = '';
    }
  })();

  return inFlightStatusCheck;
}

// Sinkronkan data pemain live (tarik data terbaru & gabungkan dengan data lokal)
export async function syncPlayerCloudProgress(sessionOrUserId, localStoreData) {
  const { userId, authProvider, sessionToken } = resolveSessionArg(sessionOrUserId);
  if (!userId) return { ok: false, err: 'Sesi pengguna tidak ditemukan.' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    if (authProvider === 'username' && sessionToken) {
      const { data: serverRow, error: fetchErr } = await client.rpc('player_sync_username', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_progress: null,
        p_game_state: null,
      });

      if (fetchErr) {
        console.error('[AstroSphere] Gagal mengambil sesi player_sync_username:', fetchErr);
        const mapped = mapSafePlayerError(fetchErr);
        return {
          ok: false,
          offline: !!mapped.offline,
          banned: !!mapped.banned,
          revoked: !!mapped.revoked,
          bannedReason: mapped.bannedReason || '',
          err: mapped.err,
        };
      }

      if (!serverRow || !serverRow.user_id) {
        return { ok: false, revoked: true, err: 'Akun penjelajah tidak ditemukan atau telah dihapus.' };
      }

      if (serverRow.is_active === false) {
        const reason = String(serverRow.banned_reason || '').trim();
        return {
          ok: false,
          banned: true,
          revoked: true,
          bannedReason: reason,
          err: formatBannedMessage(reason),
        };
      }

      const merged = mergeProgress(serverRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
      const assignedAstroId = serverRow?.astro_id || localStoreData?.astroId || generateAstroId();

      const { data: updatedRow, error: updErr } = await client.rpc('player_sync_username', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_progress: buildRpcProgressPayload(merged, assignedAstroId),
        p_game_state: merged.game_state,
      });

      if (updErr) {
        console.error('[AstroSphere] Gagal menyimpan hasil gabungan player_sync_username:', updErr);
        const mapped = mapSafePlayerError(updErr);
        return {
          ok: false,
          offline: !!mapped.offline,
          banned: !!mapped.banned,
          revoked: !!mapped.revoked,
          bannedReason: mapped.bannedReason || '',
          err: mapped.err,
        };
      }

      return {
        ok: true,
        username: updatedRow?.username || serverRow.username,
        displayName: updatedRow?.display_name || serverRow.display_name,
        astroId: assignedAstroId,
        mergedData: merged,
      };
    }

    // Jalur Google OAuth: baca baris player_progress dahulu sebelum getUser()/signOut() agar alasan nonaktif tetap terbaca
    const { data: progressRow, error: pErr } = await client
      .from('player_progress')
      .select(SAFE_PLAYER_COLUMNS)
      .or(`user_id.eq.${userId},auth_user_id.eq.${userId}`)
      .maybeSingle();

    if (!pErr && progressRow?.is_active === false) {
      const reason = String(progressRow.banned_reason || '').trim();
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        ok: false,
        banned: true,
        revoked: true,
        bannedReason: reason,
        err: formatBannedMessage(reason),
      };
    }

    if (pErr) {
      console.error('[AstroSphere] Gagal mengambil player_progress live:', pErr);
      if (isOfflineOrNetworkError(pErr) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      if (isBannedAuthError(pErr)) {
        await client.auth.signOut({ scope: 'local' }).catch(() => {});
        return { ok: false, banned: true, revoked: true, bannedReason: '', err: formatBannedMessage() };
      }
    }

    const { data: userCheck, error: userErr } = await client.auth.getUser();
    if (userErr) {
      if (isOfflineOrNetworkError(userErr) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      const banned = isBannedAuthError(userErr);
      const reason = String(progressRow?.banned_reason || '').trim();
      return {
        ok: false,
        revoked: true,
        banned,
        bannedReason: reason,
        err: banned ? formatBannedMessage(reason) : 'Sesi akun telah berakhir atau akun dihapus.',
      };
    }
    if (!userCheck?.user) {
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        ok: false,
        revoked: true,
        banned: false,
        bannedReason: '',
        err: 'Sesi akun telah berakhir atau akun dihapus.',
      };
    }

    if (pErr) {
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
    }

    if (!progressRow) {
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return { ok: false, notFound: true, revoked: true, banned: false, bannedReason: '', err: 'Akun Anda tidak ditemukan atau telah dihapus oleh pengelola.' };
    }

    if (userCheck.user.banned_until && new Date(userCheck.user.banned_until) > new Date()) {
      const reason = String(progressRow.banned_reason || '').trim();
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
      return {
        ok: false,
        banned: true,
        revoked: true,
        bannedReason: reason,
        err: formatBannedMessage(reason),
      };
    }

    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    const assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    await client.from('player_progress').update({
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
      astro_id: assignedAstroId,
      updated_at: new Date().toISOString(),
    }).eq('user_id', progressRow.user_id);

    return {
      ok: true,
      username: progressRow?.username,
      displayName: progressRow?.display_name,
      astroId: assignedAstroId,
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan sinkronisasi live pemain:', err);
    const mapped = mapSafePlayerError(err);
    return { ok: false, offline: !!mapped.offline, err: mapped.err };
  }
}
export const syncPlayerProgress = syncPlayerCloudProgress;

// Reset bersih data progres pemain (tetap mempertahankan akun)
export async function resetPlayerCloudProgress(sessionOrUserId) {
  const { userId, authProvider, sessionToken } = resolveSessionArg(sessionOrUserId);
  if (!userId) return { ok: false, err: 'Sesi pengguna tidak ditemukan.' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    if (authProvider === 'username' && sessionToken) {
      const { error: rpcErr } = await client.rpc('player_reset_username', {
        p_user_id: userId,
        p_session_token: sessionToken,
      });
      if (rpcErr) {
        console.error('[AstroSphere] player_reset_username gagal:', rpcErr);
        const mapped = mapSafePlayerError(rpcErr, 'Tidak bisa mengatur ulang data akun saat ini. Silakan coba lagi.');
        return { ok: false, offline: !!mapped.offline, err: mapped.err };
      }
      return { ok: true };
    }

    const cleanData = {
      points: 0,
      earned: 0,
      selected_ship: 'astra',
      owned_ships: ['astra'],
      progress_data: {
        best: {},
        attempts: {},
        ledger: [],
        predict: {},
        myths: {},
        cards: {},
        found: { matahari: true },
        events: {},
        missions: {},
      },
      game_state: {},
      settings_data: {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('player_progress').update(cleanData).eq('user_id', userId);
    if (error) {
      console.error('[AstroSphere] Gagal mengatur ulang progres:', error);
      const mapped = mapSafePlayerError(error, 'Tidak bisa mengatur ulang data akun saat ini. Silakan coba lagi.');
      return { ok: false, offline: !!mapped.offline, err: mapped.err };
    }
    return { ok: true };
  } catch (err) {
    console.error('[AstroSphere] Error saat mengatur ulang progres:', err);
    const mapped = mapSafePlayerError(err, 'Tidak bisa mengatur ulang data akun saat ini. Silakan coba lagi.');
    return { ok: false, offline: !!mapped.offline, err: mapped.err };
  }
}

// Hapus akun pemain secara permanen
export async function deletePlayerAccountFromCloud(sessionOrUserId = null) {
  const { userId, authProvider, sessionToken } = resolveSessionArg(sessionOrUserId);
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    if (authProvider === 'username' && sessionToken && userId) {
      const { data, error: rpcErr } = await client.rpc('player_delete_username', {
        p_user_id: userId,
        p_session_token: sessionToken,
      });
      if (rpcErr) {
        console.error('[AstroSphere] player_delete_username gagal:', rpcErr);
        const mapped = mapSafePlayerError(rpcErr, 'Tidak bisa menghapus akun saat ini. Silakan coba lagi.');
        return { ok: false, offline: !!mapped.offline, err: mapped.err };
      }
      return { ok: true, data };
    }

    const { data, error } = await client.rpc('delete_my_account');
    if (error) {
      console.error('[AstroSphere] delete_my_account gagal:', error);
      const mapped = mapSafePlayerError(error, 'Tidak bisa menghapus akun saat ini. Silakan coba lagi.');
      return { ok: false, offline: !!mapped.offline, err: mapped.err };
    }
    await client.auth.signOut().catch(() => {});
    return { ok: true, data };
  } catch (err) {
    console.error('[AstroSphere] Error saat menghapus akun:', err);
    const mapped = mapSafePlayerError(err, 'Tidak bisa menghapus akun saat ini. Silakan coba lagi.');
    return { ok: false, offline: !!mapped.offline, err: mapped.err };
  }
}
export const deletePlayerAccount = deletePlayerAccountFromCloud;

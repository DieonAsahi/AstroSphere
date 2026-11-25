// Utilitas Sinkronisasi Progres Pemain ke Awan (Supabase) dengan Mode Tamu Lokal & Fallback Graceful.
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.js';
import {
  isBrowserOffline,
  isOfflineOrNetworkError,
  OFFLINE_ACTION_NOTICE,
  GENERIC_PUBLIC_ERROR,
} from './networkError.js';

// Domain sintetis untuk memetakan nama penjelajah ke format email Supabase Auth
const SYNTHETIC_DOMAIN = 'player.astrosphere.app';

export const toSyntheticEmail = (username) => {
  const clean = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${clean}@${SYNTHETIC_DOMAIN}`;
};

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
    ? `Akun Anda sedang dinonaktifkan oleh administrator. Alasan: ${clean}`
    : 'Akun Anda sedang dinonaktifkan oleh administrator.';
}

function isBannedAuthError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  return msg.includes('user is banned') || msg.includes('banned') || code === 'user_banned';
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

  const cOwned = Array.isArray(cloudRow?.owned_ships) ? cloudRow.owned_ships : ['astra'];
  const lOwned = Array.isArray(localProgress?.owned) ? localProgress.owned : ['astra'];
  const mergedOwned = [...new Set([...cOwned, ...lOwned])];

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

  const mergedPoints = Math.max(cloudRow?.points || 0, localProgress?.points || 0);
  const mergedEarned = Math.max(cloudRow?.earned || 0, localProgress?.earned || 0, mergedPoints);

  const selectedShip = mergedOwned.includes(localProgress?.selectedShip)
    ? localProgress.selectedShip
    : cloudRow?.selected_ship || 'astra';

  // Game state: pilih yang tersimpan paling baru
  const cSavedAt = cloudRow?.game_state?.savedAt || 0;
  const lSavedAt = localState?.savedAt || 0;
  const mergedGameState = lSavedAt >= cSavedAt ? (localState || cloudRow?.game_state || {}) : (cloudRow?.game_state || localState || {});

  // Pengaturan preferensi & keymap terisolasi (jangan wariskan keymap tamu ke akun awan)
  const cloudKeymap = cloudRow?.progress_data?.keymap || cloudRow?.settings_data?.keys || null;
  const mergedSettings = {
    ...(cloudRow?.settings_data || {}),
    ...(localSettings || {}),
  };
  if (cloudKeymap) {
    mergedSettings.keys = cloudKeymap;
  } else {
    mergedSettings.keys = {};
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
    console.warn('[AstroSphere] Gagal mengecek ketersediaan username via RPC:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: true, available: true, offline: true };
    }
    return { ok: true, available: true, warning: 'Gagal menghubungi server ketersediaan nama, melanjutkan pemeriksaan di pendaftaran.' };
  }
}

// Pendaftaran Pemain Baru di Supabase Auth + Tabel player_progress
export async function registerPlayerToCloud(username, password, localStoreData) {
  const cleanUsername = sanitizeUsername(username);
  if (!isValidUsername(cleanUsername)) {
    return { ok: false, err: 'Nama pengguna harus 3–20 karakter (huruf kecil, angka, atau _).' };
  }
  if (!password || password.length < 6) {
    return { ok: false, err: 'Kata sandi minimal 6 karakter.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, offline: true, noClient: true, err: 'Koneksi Supabase tidak aktif. Akun disimpan lokal di perangkat ini.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  // 1. Cek ketersediaan nama pengguna
  const avail = await checkUsernameAvailability(cleanUsername);
  if (avail.offline) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }
  if (avail.ok && !avail.available) {
    return { ok: false, err: 'Nama pengguna ini sudah dipakai penjelajah lain. Coba nama lain atau masuk.' };
  }

  const email = toSyntheticEmail(cleanUsername);

  try {
    // 2. Daftarkan akun di Supabase Auth
    const { data: authData, error: authErr } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanUsername,
        },
      },
    });

    if (authErr) {
      if (isOfflineOrNetworkError(authErr)) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      if (authErr.message?.includes('User already registered') || authErr.message?.includes('already exists')) {
        return { ok: false, err: 'Nama pengguna ini sudah terdaftar. Silakan pilih Masuk.' };
      }
      return { ok: false, err: 'Gagal mendaftar di server awan. Silakan coba lagi.' };
    }

    const user = authData.user;
    if (!user) {
      return { ok: false, err: 'Pendaftaran gagal membuat sesi pengguna.' };
    }

    // 3. Susun data awal progres yang menggabungkan capaian lokal tamu
    const merged = mergeProgress(null, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = localStoreData?.astroId || generateAstroId();

    // 4. Buat baris data progres di tabel public.player_progress
    let insertRes = await client.from('player_progress').upsert({
      user_id: user.id,
      username: cleanUsername,
      astro_id: assignedAstroId,
      display_name: cleanUsername,
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
    });

    // Tangani kemungkinan collision unik astro_id secara anggun
    if (insertRes.error && insertRes.error.message?.includes('astro_id')) {
      assignedAstroId = generateAstroId();
      insertRes = await client.from('player_progress').upsert({
        user_id: user.id,
        username: cleanUsername,
        astro_id: assignedAstroId,
        display_name: cleanUsername,
        points: merged.points,
        earned: merged.earned,
        selected_ship: merged.selected_ship,
        owned_ships: merged.owned_ships,
        progress_data: merged.progress_data,
        game_state: merged.game_state,
        settings_data: merged.settings_data,
      });
    }

    if (insertRes.error) {
      console.warn('[AstroSphere] Gagal menyimpan data awal player_progress:', insertRes.error);
    }

    return {
      ok: true,
      user,
      username: cleanUsername,
      displayName: cleanUsername,
      astroId: assignedAstroId,
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan saat mendaftar akun awan:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Terjadi kendala saat mendaftar akun. Silakan coba lagi.' };
  }
}

// Masuk Akun Pemain di Supabase Auth & Tarik Progres Awan
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
    return { ok: false, offline: true, noClient: true, err: 'Koneksi Supabase tidak aktif.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  const email = toSyntheticEmail(cleanUsername);

  try {
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      if (isOfflineOrNetworkError(authErr)) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      if (isBannedAuthError(authErr)) {
        return { ok: false, banned: true, err: formatBannedMessage() };
      }
      if (authErr.message?.includes('Invalid login credentials')) {
        return { ok: false, err: 'Nama penjelajah atau kata sandi salah.', unknown: false };
      }
      return { ok: false, err: 'Gagal masuk akun awan. Silakan coba lagi.' };
    }

    const user = authData.user;
    if (!user) {
      return { ok: false, err: 'Sesi masuk tidak ditemukan.' };
    }

    // Ambil data progres dari tabel public.player_progress
    const { data: progressRow, error: pErr } = await client
      .from('player_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pErr) {
      console.warn('[AstroSphere] Peringatan saat membaca player_progress:', pErr);
    }

    if (progressRow?.is_active === false) {
      await client.auth.signOut().catch(() => {});
      return {
        ok: false,
        banned: true,
        bannedReason: progressRow.banned_reason || '',
        err: formatBannedMessage(progressRow.banned_reason),
      };
    }

    // Gabungkan dengan capaian lokal tamu saat ini agar bintang/planet baru tidak hilang
    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    // Perbarui baris progres di awan dengan data gabungan
    let updateRes = await client.from('player_progress').upsert({
      user_id: user.id,
      username: progressRow?.username || cleanUsername,
      astro_id: assignedAstroId,
      display_name: progressRow?.display_name || cleanUsername,
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
    });

    if (updateRes.error && updateRes.error.message?.includes('astro_id')) {
      assignedAstroId = generateAstroId();
      await client.from('player_progress').upsert({
        user_id: user.id,
        username: progressRow?.username || cleanUsername,
        astro_id: assignedAstroId,
        display_name: progressRow?.display_name || cleanUsername,
        points: merged.points,
        earned: merged.earned,
        selected_ship: merged.selected_ship,
        owned_ships: merged.owned_ships,
        progress_data: merged.progress_data,
        game_state: merged.game_state,
        settings_data: merged.settings_data,
      });
    }

    return {
      ok: true,
      user,
      username: progressRow?.username || cleanUsername,
      displayName: progressRow?.display_name || cleanUsername,
      astroId: assignedAstroId,
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan saat masuk akun awan:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Terjadi kendala saat masuk ke akun. Silakan coba lagi.' };
  }
}

// Otentikasi Google OAuth via Supabase
export async function signInWithGoogle() {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, offline: true, noClient: true, err: 'Layanan akun awan belum dikonfigurasi.' };
  }
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }
  try {
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return { ok: true, data };
  } catch (err) {
    console.error('[AstroSphere] Gagal memulai Google OAuth:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Gagal terhubung ke layanan Google. Silakan coba lagi.' };
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
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      await client.auth.signOut().catch(() => {});
      return { ok: false, banned: true, err: formatBannedMessage() };
    }

    // 1. Cek tabel public.player_progress untuk user_id tersebut
    const { data: progressRow, error: pErr } = await client
      .from('player_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (pErr) {
      console.warn('[AstroSphere] Peringatan saat mengambil player_progress untuk Google user:', pErr);
      if (isOfflineOrNetworkError(pErr)) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
    }

    if (progressRow?.is_active === false) {
      await client.auth.signOut().catch(() => {});
      return {
        ok: false,
        banned: true,
        bannedReason: progressRow.banned_reason || '',
        err: formatBannedMessage(progressRow.banned_reason),
      };
    }

    let username = progressRow?.username;
    let displayName = progressRow?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Penjelajah');

    if (!username) {
      username = generateGoogleUsername(user);
    }

    // 2. Gabungkan capaian tamu lokal (mergeProgress) ke akun Google tersebut
    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    // 3. Upsert baris progres di public.player_progress
    let upsertRes = await client.from('player_progress').upsert({
      user_id: user.id,
      username,
      astro_id: assignedAstroId,
      display_name: displayName,
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
    });

    if (upsertRes.error && upsertRes.error.message?.includes('astro_id')) {
      assignedAstroId = generateAstroId();
      await client.from('player_progress').upsert({
        user_id: user.id,
        username,
        astro_id: assignedAstroId,
        display_name: displayName,
        points: merged.points,
        earned: merged.earned,
        selected_ship: merged.selected_ship,
        owned_ships: merged.owned_ships,
        progress_data: merged.progress_data,
        game_state: merged.game_state,
        settings_data: merged.settings_data,
      });
    }

    if (upsertRes.error) {
      console.warn('[AstroSphere] Gagal menyimpan data player_progress Google user:', upsertRes.error);
    }

    return {
      ok: true,
      user,
      username,
      displayName,
      astroId: assignedAstroId,
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

// Keluar Akun Supabase
export async function logoutPlayerFromCloud() {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.warn('[AstroSphere] Kesalahan saat logout Supabase:', err);
    }
  }
  return { ok: true };
}

// Debounce Timer untuk Sinkronisasi Otomatis
let saveTimer = null;
let isSaving = false;

// Simpan Progres Awan dengan Jeda (Debounce 2 Detik)
export function scheduleCloudSave(userId, payloadGetter, onSavedCallback, onRevokedCallback) {
  if (!userId) return;
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    const client = getSupabaseClient();
    if (!client || isSaving) return;

    isSaving = true;
    try {
      // Verifikasi ke server Auth terlebih dahulu agar status ban / hapus akun langsung terdeteksi
      const { data: authCheck, error: authCheckErr } = await client.auth.getUser();
      if (authCheckErr || !authCheck?.user) {
        if (typeof onRevokedCallback === 'function') {
          onRevokedCallback({
            banned: isBannedAuthError(authCheckErr),
            reason: isBannedAuthError(authCheckErr) ? formatBannedMessage() : 'Sesi akun tidak lagi valid atau telah dihapus.',
          });
        }
        return;
      }

      const payload = payloadGetter();
      if (!payload) return;

      const updateData = {
        points: payload.points,
        earned: payload.earned,
        selected_ship: payload.selected_ship,
        owned_ships: payload.owned_ships,
        progress_data: payload.progress_data,
        game_state: payload.game_state,
        settings_data: payload.settings_data,
        updated_at: new Date().toISOString(),
      };
      if (payload.astro_id) {
        updateData.astro_id = payload.astro_id;
      }

      const { error } = await client.from('player_progress').update(updateData).eq('user_id', userId);

      if (error) {
        const { data: rowStatus } = await client
          .from('player_progress')
          .select('is_active, banned_reason')
          .eq('user_id', userId)
          .maybeSingle();

        if (!rowStatus || rowStatus.is_active === false) {
          if (typeof onRevokedCallback === 'function') {
            onRevokedCallback({
              banned: rowStatus?.is_active === false,
              reason: rowStatus?.is_active === false
                ? formatBannedMessage(rowStatus.banned_reason)
                : 'Akun Anda tidak ditemukan atau telah dihapus oleh administrator.',
            });
          }
          return;
        }
      } else if (typeof onSavedCallback === 'function') {
        onSavedCallback();
      }
    } catch (err) {
      console.warn('[AstroSphere] Gagal sinkronisasi otomatis ke awan:', err);
    } finally {
      isSaving = false;
    }
  }, 2000);
}

// Sinkronkan data pemain live dari Supabase (tarik data awan & gabungkan dengan data lokal)
export async function syncPlayerCloudProgress(userId, localStoreData) {
  if (!userId) return { ok: false, err: 'Sesi pengguna tidak ditemukan.' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    const { data: userCheck, error: userErr } = await client.auth.getUser();
    if (userErr) {
      if (isOfflineOrNetworkError(userErr) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      await client.auth.signOut().catch(() => {});
      return {
        ok: false,
        revoked: true,
        banned: isBannedAuthError(userErr),
        err: isBannedAuthError(userErr) ? formatBannedMessage() : 'Sesi akun telah berakhir atau akun dihapus.',
      };
    }
    if (!userCheck?.user) {
      await client.auth.signOut().catch(() => {});
      return {
        ok: false,
        revoked: true,
        banned: false,
        err: 'Sesi akun telah berakhir atau akun dihapus.',
      };
    }

    const { data: progressRow, error: pErr } = await client
      .from('player_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (pErr) {
      console.warn('[AstroSphere] Peringatan saat mengambil player_progress live:', pErr);
      if (isOfflineOrNetworkError(pErr) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
    }

    if (!progressRow) {
      await client.auth.signOut().catch(() => {});
      return { ok: false, notFound: true, revoked: true, err: 'Akun penjelajah tidak ditemukan atau telah dihapus.' };
    }

    if (progressRow.is_active === false) {
      await client.auth.signOut().catch(() => {});
      return {
        ok: false,
        banned: true,
        revoked: true,
        err: formatBannedMessage(progressRow.banned_reason),
      };
    }

    // Gabungkan dengan data lokal saat ini agar capaian baru tidak tertimpa
    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    // Perbarui baris di awan dengan gabungan terbaru
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
    }).eq('user_id', userId);

    return {
      ok: true,
      username: progressRow?.username,
      displayName: progressRow?.display_name,
      astroId: assignedAstroId,
      mergedData: merged,
    };
  } catch (err) {
    console.error('[AstroSphere] Kesalahan sinkronisasi live pemain:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: GENERIC_PUBLIC_ERROR };
  }
}

// Reset bersih data progres pemain di Supabase (tetap mempertahankan akun)
export async function resetPlayerCloudProgress(userId) {
  if (!userId) return { ok: false, err: 'Sesi pengguna tidak ditemukan.' };
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
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
      game_state: null,
      settings_data: {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('player_progress').update(cleanData).eq('user_id', userId);
    if (error) {
      console.warn('[AstroSphere] Gagal mereset player_progress di awan:', error);
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: 'Gagal mereset progres di awan. Silakan coba lagi.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[AstroSphere] Error saat mereset progres awan:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Gagal mereset progres di awan. Silakan coba lagi.' };
  }
}

// Hapus akun pemain secara permanen via RPC delete_my_account
export async function deletePlayerAccountFromCloud() {
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    const { data, error } = await client.rpc('delete_my_account');
    if (error) {
      console.warn('[AstroSphere] Gagal memanggil delete_my_account:', error);
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: 'Gagal menghapus akun dari server. Silakan coba lagi.' };
    }
    await client.auth.signOut().catch(() => {});
    return { ok: true, data };
  } catch (err) {
    console.error('[AstroSphere] Error saat menghapus akun awan:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Gagal menghapus akun dari server. Silakan coba lagi.' };
  }
}

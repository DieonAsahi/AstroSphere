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
  const clean = sanitizeUsername(username);
  return `${clean}@${SYNTHETIC_DOMAIN}`;
};

function isValidSyntheticEmail(email) {
  return /^[a-z0-9_]{3,20}@[a-z0-9.-]+\.[a-z]{2,}$/.test(String(email || '').trim().toLowerCase());
}

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
    console.warn('[AstroSphere] Gagal mengecek ketersediaan nama:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: true, available: true, offline: true };
    }
    return { ok: true, available: true, warning: 'Pemeriksaan nama tertunda, melanjutkan proses pendaftaran.' };
  }
}

// Pendaftaran Pemain Baru di Supabase Auth + Tabel public.player_progress
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

  // 1. Cek ketersediaan nama penjelajah via RPC is_username_available
  const avail = await checkUsernameAvailability(cleanUsername);
  if (avail.offline) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }
  if (avail.ok && !avail.available) {
    return { ok: false, err: 'Nama penjelajah sudah digunakan.' };
  }

  const email = toSyntheticEmail(cleanUsername);
  if (!isValidSyntheticEmail(email)) {
    console.error('[AstroSphere] Format email internal hasil pemetaan username tidak valid:', { cleanUsername, email });
    return { ok: false, err: 'Nama penjelajah hanya boleh menggunakan huruf kecil, angka, atau garis bawah (_).' };
  }

  try {
    // 2. Daftarkan akun di Auth
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
      console.error('[AstroSphere] signUp gagal:', {
        code: authErr.code,
        status: authErr.status,
        message: authErr.message,
        username: cleanUsername,
      });
      const authMsg = String(authErr.message || '').toLowerCase();
      const authCode = String(authErr.code || '').toLowerCase();
      if (
        authCode === 'user_already_exists' ||
        authMsg.includes('already registered') ||
        authMsg.includes('already exists') ||
        authMsg.includes('already been registered')
      ) {
        return { ok: false, err: 'Nama penjelajah sudah digunakan.' };
      }
      if (authCode === 'weak_password' || authMsg.includes('password')) {
        return { ok: false, err: 'Kata sandi minimal 6 karakter dan memenuhi syarat keamanan.' };
      }
      if (authCode === 'email_address_invalid' || authMsg.includes('invalid email') || authMsg.includes('unable to validate email')) {
        return { ok: false, err: 'Format nama penjelajah tidak valid untuk pendaftaran.' };
      }
      if (authCode === 'over_email_send_rate_limit' || authCode === 'over_request_rate_limit' || authErr.status === 429) {
        return { ok: false, err: 'Terlalu banyak percobaan pendaftaran. Silakan tunggu beberapa saat lalu coba lagi.' };
      }
      return { ok: false, err: 'Tidak dapat membuat akun saat ini. Silakan coba lagi.' };
    }

    const user = authData?.user;
    if (!user) {
      console.error('[AstroSphere] signUp tidak mengembalikan objek user:', authData);
      return { ok: false, err: 'Tidak dapat membuat akun saat ini. Silakan coba lagi.' };
    }

    // Jika Supabase menyamarkan duplikasi akun (identities kosong saat Confirm email aktif)
    if (Array.isArray(user.identities) && user.identities.length === 0) {
      console.error('[AstroSphere] signUp terdeteksi nama penjelajah sudah terdaftar (identities kosong):', { username: cleanUsername });
      return { ok: false, err: 'Nama penjelajah sudah digunakan.' };
    }

    // Pastikan sesi aktif terpasang agar RLS INSERT public.player_progress (auth.uid() = user_id) lolos
    let activeSession = authData?.session || null;
    if (!activeSession) {
      const { data: loginFallback, error: loginFallbackErr } = await client.auth.signInWithPassword({ email, password });
      if (loginFallback?.session) {
        activeSession = loginFallback.session;
      } else {
        console.error('[AstroSphere] signUp berhasil tanpa sesi aktif (periksa pengaturan Confirm email):', {
          error: loginFallbackErr?.message || 'no_session',
          code: loginFallbackErr?.code,
        });
        return { ok: false, err: 'Akun dibuat tetapi belum aktif. Silakan coba masuk kembali.' };
      }
    }

    if (activeSession?.access_token && activeSession?.refresh_token) {
      const { data: curSess } = await client.auth.getSession();
      if (!curSess?.session?.access_token) {
        await client.auth.setSession({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        });
      }
    }

    // 3. Susun data awal progres yang menggabungkan capaian lokal tamu
    const merged = mergeProgress(null, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = (typeof localStoreData?.astroId === 'string' && localStoreData.astroId.trim()) || generateAstroId();

    // 4. Buat baris data progres di tabel public.player_progress (memenuhi RLS is_active = true & NOT NULL JSONB)
    const buildPayload = (astroId) => ({
      user_id: user.id,
      username: cleanUsername,
      astro_id: astroId,
      display_name: cleanUsername,
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
      is_active: true,
    });

    let insertRes = await client.from('player_progress').insert(buildPayload(assignedAstroId));

    for (let attempt = 0; attempt < 3 && insertRes.error; attempt++) {
      const iErr = insertRes.error;
      const iCode = String(iErr.code || '');
      const iMsg = `${iErr.message || ''} ${iErr.details || ''}`.toLowerCase();

      if (iCode === '42501' && activeSession?.access_token && activeSession?.refresh_token) {
        await client.auth.setSession({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        });
        insertRes = await client.from('player_progress').insert(buildPayload(assignedAstroId));
        continue;
      }

      if (iCode === '23505') {
        if (iMsg.includes('username')) {
          console.error('[AstroSphere] Bentrok constraint unik username saat daftar:', iErr);
          return { ok: false, err: 'Nama penjelajah sudah digunakan.' };
        }
        if (iMsg.includes('user_id') || iMsg.includes('pkey')) {
          const { is_active: _ignored, ...updateFields } = buildPayload(assignedAstroId);
          insertRes = await client.from('player_progress').update(updateFields).eq('user_id', user.id);
          continue;
        }
        assignedAstroId = generateAstroId();
        insertRes = await client.from('player_progress').insert(buildPayload(assignedAstroId));
        continue;
      }
      break;
    }

    if (insertRes.error) {
      console.error('[AstroSphere] Gagal menyimpan baris awal player_progress:', {
        code: insertRes.error.code,
        message: insertRes.error.message,
        details: insertRes.error.details,
        hint: insertRes.error.hint,
      });
      if (isOfflineOrNetworkError(insertRes.error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: 'Tidak dapat membuat akun saat ini. Silakan coba lagi.' };
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
    console.error('[AstroSphere] Kesalahan tak terduga saat pendaftaran akun:', err);
    if (isOfflineOrNetworkError(err)) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Tidak dapat membuat akun saat ini. Silakan coba lagi.' };
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
    return { ok: false, offline: true, noClient: true, err: 'Layanan akun belum tersedia saat ini.' };
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
      if (authErr.message?.includes('Invalid login credentials') || authErr.code === 'invalid_credentials') {
        return { ok: false, err: 'Nama penjelajah atau kata sandi salah.', unknown: false };
      }
      console.error('[AstroSphere] loginPlayerToCloud signInWithPassword error:', {
        code: authErr.code,
        status: authErr.status,
        message: authErr.message,
      });
      return { ok: false, err: 'Tidak dapat masuk ke akun saat ini. Silakan coba lagi.' };
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

    // Perbarui (atau buat jika belum ada) baris progres di awan dengan data gabungan
    const buildPayload = (astroId) => ({
      user_id: user.id,
      username: progressRow?.username || cleanUsername,
      astro_id: astroId,
      display_name: progressRow?.display_name || cleanUsername,
      points: merged.points,
      earned: merged.earned,
      selected_ship: merged.selected_ship,
      owned_ships: merged.owned_ships,
      progress_data: merged.progress_data,
      game_state: merged.game_state,
      settings_data: merged.settings_data,
      ...(progressRow ? {} : { is_active: true }),
    });

    let updateRes = await client.from('player_progress').upsert(buildPayload(assignedAstroId), { onConflict: 'user_id' });

    if (updateRes.error && (updateRes.error.message?.includes('astro_id') || updateRes.error.code === '23505')) {
      assignedAstroId = generateAstroId();
      updateRes = await client.from('player_progress').upsert(buildPayload(assignedAstroId), { onConflict: 'user_id' });
    }

    if (updateRes.error) {
      console.error('[AstroSphere] Gagal memperbarui/menyimpan player_progress saat login:', updateRes.error);
      if (!progressRow) {
        return { ok: false, err: GENERIC_PUBLIC_ERROR };
      }
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
    let displayName = String(
      progressRow?.display_name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Penjelajah')
    ).trim() || 'Penjelajah';

    if (!username || !isValidUsername(username)) {
      username = generateGoogleUsername(user);
    }

    // 2. Gabungkan capaian tamu lokal (mergeProgress) ke akun Google tersebut
    const merged = mergeProgress(progressRow, localStoreData?.progress, localStoreData?.settings, localStoreData?.gameState);
    let assignedAstroId = progressRow?.astro_id || localStoreData?.astroId || generateAstroId();

    const buildGooglePayload = (uname, astroId) => ({
      user_id: user.id,
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
      ...(progressRow ? {} : { is_active: true }),
    });

    // 3. Upsert baris progres di public.player_progress (dengan coba ulang unik jika astro_id / username bertabrakan)
    let upsertRes = await client.from('player_progress').upsert(buildGooglePayload(username, assignedAstroId), { onConflict: 'user_id' });

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
        upsertRes = await client.from('player_progress').upsert(buildGooglePayload(username, assignedAstroId), { onConflict: 'user_id' });
      } else {
        break;
      }
    }

    if (upsertRes.error) {
      console.warn('[AstroSphere] Gagal menyimpan data player_progress Google user:', upsertRes.error);
      if (isOfflineOrNetworkError(upsertRes.error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: GENERIC_PUBLIC_ERROR };
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
      game_state: {},
      settings_data: {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('player_progress').update(cleanData).eq('user_id', userId);
    if (error) {
      console.warn('[AstroSphere] Gagal mengatur ulang progres:', error);
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: 'Tidak bisa mengatur ulang data akun saat ini. Silakan coba lagi.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[AstroSphere] Error saat mengatur ulang progres:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Tidak bisa mengatur ulang data akun saat ini. Silakan coba lagi.' };
  }
}

// Hapus akun pemain secara permanen
export async function deletePlayerAccountFromCloud() {
  const client = getSupabaseClient();
  if (!client) return { ok: false, offline: true, noClient: true };
  if (isBrowserOffline()) {
    return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
  }

  try {
    const { data, error } = await client.rpc('delete_my_account');
    if (error) {
      console.warn('[AstroSphere] Gagal menghapus akun:', error);
      if (isOfflineOrNetworkError(error) || isBrowserOffline()) {
        return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
      }
      return { ok: false, err: 'Tidak bisa menghapus akun saat ini. Silakan coba lagi.' };
    }
    await client.auth.signOut().catch(() => {});
    return { ok: true, data };
  } catch (err) {
    console.error('[AstroSphere] Error saat menghapus akun:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: 'Tidak bisa menghapus akun saat ini. Silakan coba lagi.' };
  }
}

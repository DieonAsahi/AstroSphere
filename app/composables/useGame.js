// State bersama UI ↔ mesin 3D + penyimpanan lokal (localStorage) + Sinkronisasi Awan (Supabase).
// Alur: splash (Beranda/Masuk/Daftar, tanpa WebGL) → guide (cara bermain + memuat dunia 3D) → playing ⇄ paused.
import { reactive, watch } from 'vue';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { QUIZ, POINTS_PER_QUESTION, QUIZ_VERSION } from '../data/quiz.js';
import { NAME_OF } from '../data/solarSystem.js';
import { sanitizeKeys } from '../data/keymap.js';
import { PREDICT, PREDICT_REWARD, MYTH_REWARD, FACTS, CARD_REWARD } from '../data/learning.js';
import { useSupabaseContent } from './useSupabaseContent.js';
import { EVENTS, EVENT_REWARD } from '../data/events.js';
import { MISSIONS, MISSION_REWARD } from '../data/missions.js';
import {
  registerPlayerToCloud,
  loginPlayerToCloud,
  logoutPlayerFromCloud,
  scheduleCloudSave,
  cancelScheduledCloudSave,
  checkPlayerAccountStatus,
  sanitizeUsername,
  generateAstroId,
  signInWithGoogle,
  syncGooglePlayerSession,
  syncPlayerCloudProgress,
  resetPlayerCloudProgress,
  deletePlayerAccountFromCloud,
  formatBannedMessage,
} from '../utils/playerCloudSync.js';
import { getSupabaseClient } from '../utils/supabaseClient.js';
import {
  isBrowserOffline,
  isOfflineOrNetworkError,
  OFFLINE_ACTION_NOTICE,
  GENERIC_PUBLIC_ERROR,
} from '../utils/networkError.js';

const KEYS = {
  state: 'astrosphere.gameState',
  settings: 'astrosphere.settings',
  progress: 'astrosphere.progress',
  account: 'astrosphere.account',
  users: 'astrosphere.users',
  astroId: 'astrosphere.astro_id',
};

const ls = {
  read(k) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; }
  },
  write(k, v) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
  },
  remove(k) {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try { localStorage.removeItem(k); } catch {}
  },
};

const touch = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? (window.matchMedia('(pointer: coarse)').matches || ((navigator.maxTouchPoints || 0) > 0 && window.matchMedia('(hover: none)').matches))
  : false;
const DEFAULT_SETTINGS = { soundEnabled: true, hudOpacity: 1, sensitivity: 1, invertY: false, graphics: 'rendah', reduceMotion: false, tutorialSeen: false, events: true, keys: {} };
const DEFAULT_PROGRESS = { points: 0, earned: 0, best: {}, attempts: {}, owned: ['astra'], selectedShip: 'astra', ledger: [], quizVersion: QUIZ_VERSION, predict: {}, myths: {}, cards: {}, found: { matahari: true }, events: {}, missions: {} };

/** Menghitung skor kuis maksimal yang sah per planet berdasarkan bobot poin soal aktif */
export function quizMax(planet) {
  const liveQuiz = planet ? useSupabaseContent().getQuiz(planet) : null;
  const questions = liveQuiz?.questions?.length
    ? liveQuiz.questions
    : (planet && QUIZ[planet]?.questions) || null;
  if (questions && questions.length > 0) {
    return questions.reduce((sum, q) => sum + (Number(q.points) || POINTS_PER_QUESTION), 0);
  }
  return POINTS_PER_QUESTION * 4;
}

function sanitizeSettings(s) {
  const o = { ...DEFAULT_SETTINGS, keys: {} };
  if (!s || typeof s !== 'object') return o;
  for (const k of ['soundEnabled', 'invertY', 'reduceMotion', 'tutorialSeen', 'events']) if (typeof s[k] === 'boolean') o[k] = s[k];
  if (Number.isFinite(s.hudOpacity)) o.hudOpacity = Math.min(1, Math.max(.3, s.hudOpacity));
  if (Number.isFinite(s.sensitivity)) o.sensitivity = Math.min(2.5, Math.max(.3, s.sensitivity));
  if (s.graphics === 'tinggi' || s.graphics === 'rendah') o.graphics = s.graphics;
  o.keys = sanitizeKeys(s.keys);
  return o;
}

// ---- Isolasi Keymap Per Akun (Tamu vs Akun Login) ----
let storeInitialized = false;

function getActiveUserId() {
  if (storeInitialized && store?.account?.loggedIn && store?.account?.userId) {
    return store.account.userId;
  }
  const a = ls.read(KEYS.account);
  return (a?.loggedIn && typeof a.userId === 'string' && a.userId) ? a.userId : null;
}

export function getUserKeymapStorageKey(userId = null) {
  const targetId = userId ?? getActiveUserId();
  return targetId ? `astrosphere.keymap.${targetId}` : 'astrosphere.keymap.guest';
}

export function loadUserKeymap(userId = null) {
  const targetId = userId ?? getActiveUserId();
  const storageKey = targetId ? `astrosphere.keymap.${targetId}` : 'astrosphere.keymap.guest';
  const raw = ls.read(storageKey);
  if (raw && typeof raw === 'object' && Object.keys(raw).length > 0) {
    return sanitizeKeys(raw);
  }
  // Migrasi aman satu kali untuk mode Tamu jika belum ada astrosphere.keymap.guest tetapi ada di settings lama
  if (!targetId) {
    const legacy = ls.read(KEYS.settings);
    if (legacy?.keys && typeof legacy.keys === 'object' && Object.keys(legacy.keys).length > 0) {
      const sanitized = sanitizeKeys(legacy.keys);
      ls.write('astrosphere.keymap.guest', sanitized);
      return sanitized;
    }
  }
  return {};
}

export function saveUserKeymap(keys = null, userId = null) {
  const targetId = userId ?? getActiveUserId();
  const finalKeys = sanitizeKeys(keys ?? (storeInitialized ? store?.settings?.keys : {}) ?? {});
  const storageKey = targetId ? `astrosphere.keymap.${targetId}` : 'astrosphere.keymap.guest';
  ls.write(storageKey, finalKeys);
  if (storeInitialized && store?.settings) {
    store.settings.keys = finalKeys;
    ls.write(KEYS.settings, store.settings);
  }
  if (storeInitialized && store?.account?.loggedIn && store?.account?.userId) {
    triggerCloudSync();
  }
}

export function switchAccountKeymap(userId = null, cloudKeymap = null) {
  let targetKeys = {};
  if (userId) {
    // Mode Akun Login:
    // Cek key lokal spesifik ID pengguna (astrosphere.keymap.<userId>)
    const localKeys = ls.read(`astrosphere.keymap.${userId}`);
    if (localKeys && typeof localKeys === 'object' && Object.keys(localKeys).length > 0) {
      targetKeys = sanitizeKeys(localKeys);
    } else if (cloudKeymap && typeof cloudKeymap === 'object' && Object.keys(cloudKeymap).length > 0) {
      targetKeys = sanitizeKeys(cloudKeymap);
    } else {
      targetKeys = {};
    }
    ls.write(`astrosphere.keymap.${userId}`, targetKeys);
  } else {
    // Mode Tamu: muat khusus astrosphere.keymap.guest
    const guestKeys = ls.read('astrosphere.keymap.guest');
    targetKeys = sanitizeKeys(guestKeys || {});
  }
  if (storeInitialized && store?.settings) {
    store.settings.keys = targetKeys;
    ls.write(KEYS.settings, store.settings);
  }
  game()?.applySettings();
  return targetKeys;
}

function sanitizeProgress(p) {
  const o = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  if (!p || typeof p !== 'object') return o;
  if (Number.isFinite(p.points) && p.points >= 0) o.points = Math.floor(p.points);
  if (Number.isFinite(p.earned) && p.earned >= 0) o.earned = Math.floor(p.earned);
  if (p.best && typeof p.best === 'object') for (const [k, v] of Object.entries(p.best)) if ((QUIZ[k] || useSupabaseContent().getQuiz(k)) && Number.isFinite(v)) o.best[k] = Math.min(quizMax(k), Math.max(0, v));
  if (p.attempts && typeof p.attempts === 'object') for (const [k, v] of Object.entries(p.attempts)) if ((QUIZ[k] || useSupabaseContent().getQuiz(k)) && Number.isFinite(v)) o.attempts[k] = v;
  if (Array.isArray(p.owned)) o.owned = [...new Set(['astra', ...p.owned.filter((id) => SHIPS[id])])];
  if (SHIPS[p.selectedShip] && o.owned.includes(p.selectedShip)) o.selectedShip = p.selectedShip;
  if (Array.isArray(p.ledger)) o.ledger = p.ledger.slice(-60);
  if (p.predict && typeof p.predict === 'object') for (const [k, v] of Object.entries(p.predict)) if (k && v && typeof v === 'object' && Number.isInteger(v.pick)) o.predict[k] = { pick: v.pick, ok: !!v.ok };
  if (p.myths && typeof p.myths === 'object') for (const k of Object.keys(p.myths)) if (p.myths[k] && typeof k === 'string' && k.trim()) o.myths[k] = true;
  if (p.cards && typeof p.cards === 'object') for (const k of Object.keys(p.cards)) if (FACTS[k] || useSupabaseContent().getFacts(k)?.length) o.cards[k] = true;
  if (p.missions && typeof p.missions === 'object') for (const [k, v] of Object.entries(p.missions)) if (MISSIONS[k] && v && Number.isFinite(v.done)) o.missions[k] = { done: Math.max(0, Math.floor(v.done)), stars: Math.min(3, Math.max(0, Math.floor(v.stars || 0))) };
  if (p.events && typeof p.events === 'object') for (const [k, v] of Object.entries(p.events)) if (EVENTS[k] && Number.isFinite(v)) o.events[k] = Math.max(0, Math.floor(v));
  // Benda yang pernah ditemukan (permanen)
  for (const k of [...Object.keys(p.found || {}), ...Object.keys(o.cards), ...Object.keys(o.best), ...Object.keys(o.predict)]) if (FACTS[k] || useSupabaseContent().getFacts(k)?.length) o.found[k] = true;
  return o;
}

export const store = reactive({
  touch,
  phase: 'splash',         // splash | guide | playing | paused
  screen: 'welcome',       // layar splash: welcome | login | register
  ready: false,            // dunia 3D sudah dimuat
  startFromSave: false,
  mode: 'jelajah',         // jelajah | planet | sejarah | fenomena | kuis | hanggar | peta | profil
  loading: { p: 0, text: '', error: '' },
  hudOff: false,
  hud: {
    hdg: '000°', speed: '0', thr: 0, braking: false, boost: false, limited: false,
    target: { id: '', name: '—', dist: '—', eta: '—' },
    near: { id: '', name: '—', dist: '—', isApproaching: false },
    stick: { x: 0, y: 0 },
    disc: '0/0', boundary: false,
  },
  autopilot: false,
  backTo: null,            // mode tujuan tombol Kembali (mis. Sejarah → Planet)
  capturing: false,        // Profil → Kontrol sedang merekam tombol baru
  approach: { show: false, id: '', name: '', kind: '', color: '', desc: '', pheno: '' },
  pheno: { on: false, id: '', playing: true, line1: '', line2: '', state: '' },
  mission: { id: 'apollo13', alt: 0, amd: 0, pred: 0, fixK: 0, step: 'brief', u: 0, clock: 0, dist: 0, o2: 100, power: 100, co2: 4, cold: false, blackout: false, note: '', firstTry: {}, stars: 0, reward: 0 },
  event: { kind: '', phase: '', left: 0, shelterName: '', safe: false, shield: 100, damaged: false, hits: 0, expo: 0, flash: 0, result: null },
  toast: { show: false, parts: [] },
  msg: { show: false, text: '' },
  saved: { show: false, label: '' },
  look: { active: false, freeLook: false },
  camMode: 'chase',
  settings: sanitizeSettings(ls.read(KEYS.settings)),
  progress: sanitizeProgress(ls.read(KEYS.progress)),
  account: (() => {
    const a = ls.read(KEYS.account);
    let guestAstroId = ls.read(KEYS.astroId);
    if (!guestAstroId || typeof guestAstroId !== 'string') {
      guestAstroId = generateAstroId();
      ls.write(KEYS.astroId, guestAstroId);
    }
    return {
      loggedIn: !!a?.loggedIn && typeof a.name === 'string' && !!a.name,
      name: typeof a?.name === 'string' ? a.name : '',
      username: typeof a?.username === 'string' ? a.username : '',
      userId: typeof a?.userId === 'string' ? a.userId : null,
      authProvider: a?.authProvider === 'google' ? 'google' : (a?.authProvider === 'username' ? 'username' : ''),
      sessionToken: typeof a?.sessionToken === 'string' ? a.sessionToken : '',
      cloudSynced: !!a?.cloudSynced,
      astroId: a?.astroId || guestAstroId,
    };
  })(),
  discovered: [],
  hasSave: false,
  saveMeta: '',
  focus: 'bumi',
  obs: { mul: 1, day: 0, date: '' },
  toggles: { orbit: true, axis: true, follow: false },
  sejarah: { body: 'bumi', era: 'semua', selected: null },
  lab: { type: 'matahari', pov: 'samping', t: 30, playing: true, speed: 1, volume: true, labels: true, status: 'none', covered: 0, caller: 'planet', dia: null, marks: [] },
  quiz: { planet: 'bumi', stage: 'intro', index: 0, picked: null, answers: [], score: 0, reward: 0, prevBest: 0, kind: 'planet', mythStage: 'intro' },
  modal: null,             // null | settings | journal | confirmNew | controls
  journalId: null,         // Jurnal: benda yang kartunya sedang dibuka
  profileTab: 'kuis',
  hangarPreview: 'astra',
  oauthError: '',          // Pesan error callback Google agar tampil aman di form masuk
  bannedModal: {
    show: false,
    reason: '',
    message: '',
  },
});

// Inisialisasi keymap terisolasi akun / tamu setelah store siap (mencegah TDZ ReferenceError)
storeInitialized = true;
const initialUserId = store.account.loggedIn && store.account.userId ? store.account.userId : null;
store.settings.keys = loadUserKeymap(initialUserId);

/** Sudah pernah ditemukan (dijelajahi)? Kuis, Mitos/Fakta, dan kartu planet baru terbuka setelah ini. */
export const isFound = (id) => !!store.progress.found[id] || store.discovered.includes(id);

if (typeof window !== 'undefined') {
  watch(() => store.discovered, (ids) => {
    let changed = false;
    for (const id of ids) {
      if (FACTS[id] && !store.progress.found[id]) {
        store.progress.found[id] = true;
        changed = true;
      }
    }
    if (changed) saveProgress();
  });
}

function getAccountSessionInfo() {
  return {
    userId: store.account.userId,
    authProvider: store.account.authProvider || (store.account.sessionToken ? 'username' : 'google'),
    sessionToken: store.account.sessionToken || '',
  };
}

let syncedSessionUserId = null;
let isRevokingSession = false;

function clearLocalAccountToGuest() {
  syncedSessionUserId = null;
  let guestAstroId = ls.read(KEYS.astroId);
  if (!guestAstroId) {
    guestAstroId = generateAstroId();
    ls.write(KEYS.astroId, guestAstroId);
  }
  Object.assign(store.account, {
    loggedIn: false,
    name: '',
    username: '',
    userId: null,
    authProvider: '',
    sessionToken: '',
    cloudSynced: false,
    astroId: guestAstroId,
  });
  saveAccount();
  switchAccountKeymap(null);
}

// Memicu sinkronisasi otomatis (debounced 2 detik) jika pemain masuk akun online
function triggerCloudSync() {
  if (!store.account.loggedIn || !store.account.userId || !store.account.cloudSynced) return;
  const sessionInfo = getAccountSessionInfo();
  if (sessionInfo.authProvider === 'username' && !sessionInfo.sessionToken) return;

  scheduleCloudSave(sessionInfo, () => ({
    points: store.progress.points,
    earned: store.progress.earned,
    selected_ship: store.progress.selectedShip,
    owned_ships: store.progress.owned,
    astro_id: store.account.astroId,
    progress_data: {
      best: store.progress.best,
      attempts: store.progress.attempts,
      ledger: store.progress.ledger,
      predict: store.progress.predict,
      myths: store.progress.myths,
      cards: store.progress.cards,
      found: store.progress.found,
      events: store.progress.events,
      missions: store.progress.missions,
      keymap: store.settings.keys || {},
    },
    game_state: readGameState() || {},
    settings_data: store.settings,
  }), () => {
    store.saved.label = 'Tersimpan';
    store.saved.show = true;
    setTimeout(() => { store.saved.show = false; }, 2200);
  }, (revoked) => {
    forceRevokeAccountSession({
      banned: !!revoked?.banned,
      reason: revoked?.bannedReason || '',
      message: revoked?.reason,
    });
  });
}

async function forceRevokeAccountSession(payload) {
  if (isRevokingSession) return;
  isRevokingSession = true;
  try {
    const isObj = payload && typeof payload === 'object';
    const isBanned = isObj ? !!payload.banned : true;
    const cleanReason = isObj ? String(payload.reason || payload.bannedReason || '').trim() : '';
    const message = isObj ? String(payload.message || '') : String(payload || '');
    const silentModal = isObj ? !!payload.silentModal : false;

    cancelScheduledCloudSave();
    store.capturing = false;
    const info = getAccountSessionInfo();
    clearLocalAccountToGuest();

    if (isBanned && !silentModal) {
      store.modal = null;
      store.bannedModal.reason = cleanReason;
      store.bannedModal.message = message || formatBannedMessage(cleanReason);
      store.bannedModal.show = true;
    } else if (!silentModal && message) {
      showToast(message, 4800);
    }

    manualAuthFlowDepth++;
    try {
      await logoutPlayerFromCloud(info, { localOnly: isBanned });
    } finally {
      manualAuthFlowDepth = Math.max(0, manualAuthFlowDepth - 1);
    }
  } finally {
    isRevokingSession = false;
  }
}

export function acknowledgeBannedModal() {
  store.bannedModal.show = false;
  store.bannedModal.reason = '';
  store.bannedModal.message = '';
  store.modal = null;
  store.journalId = null;
  store.approach.show = false;
  store.autopilot = false;
  const eng = game();
  if (eng) {
    try {
      eng.toSplash(true);
    } catch {}
  }
  store.phase = 'splash';
  store.screen = 'welcome';
  store.mode = 'jelajah';
}

export function saveSettings() {
  saveUserKeymap(store.settings.keys);
}

export function saveProgress() {
  ls.write(KEYS.progress, store.progress);
  triggerCloudSync();
}

export function saveAccount() {
  ls.write(KEYS.account, store.account);
}

// Sinkronkan data progres pemain secara langsung ke state reaktif
export async function pullCloudProgress() {
  if (!store.account.loggedIn || !store.account.userId) {
    return { ok: false, localOnly: true };
  }
  try {
    const res = await syncPlayerCloudProgress(getAccountSessionInfo(), {
      progress: store.progress,
      settings: store.settings,
      gameState: readGameState(),
      astroId: store.account.astroId,
    });
    if (!res.offline && (res.banned || res.revoked)) {
      await forceRevokeAccountSession({
        banned: !!res.banned,
        reason: res.bannedReason || '',
        message: res.err,
      });
      return res;
    }
    if (res.offline) {
      return { ok: false, offline: true, noClient: !!res.noClient, err: res.err || OFFLINE_ACTION_NOTICE };
    }
    if (res.ok && res.mergedData) {
      applyMergedData(res.mergedData);
      if (res.astroId) {
        store.account.astroId = res.astroId;
        ls.write(KEYS.astroId, res.astroId);
      }
      const cloudKeymap = res.mergedData?.progress_data?.keymap;
      const localKeys = ls.read(`astrosphere.keymap.${store.account.userId}`);
      if (!localKeys && cloudKeymap && typeof cloudKeymap === 'object' && Object.keys(cloudKeymap).length > 0) {
        switchAccountKeymap(store.account.userId, cloudKeymap);
      }
      saveAccount();
      ls.write(KEYS.progress, store.progress);
      ls.write(KEYS.settings, store.settings);
      return { ok: true, mergedData: res.mergedData };
    }
    return { ok: false, err: res.err || GENERIC_PUBLIC_ERROR };
  } catch (err) {
    console.warn('[AstroSphere] Gagal sinkronisasi data awan:', err);
    if (isOfflineOrNetworkError(err) || isBrowserOffline()) {
      return { ok: false, offline: true, err: OFFLINE_ACTION_NOTICE };
    }
    return { ok: false, err: GENERIC_PUBLIC_ERROR };
  }
}

// ---- Akun: Mendukung Supabase Auth + Cadangan Lokal Hash Bergaram ----
const nameKey = (n) => n.trim().replace(/\s+/g, ' ').toLowerCase();

async function hashPass(salt, pass) {
  const text = salt + ':' + pass;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 's256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'fnv:' + (h >>> 0).toString(16);
}

// Flag anti-race: cegah listener onAuthStateChange membatalkan akun baru sebelum upsert player_progress selesai
let manualAuthFlowDepth = 0;

// Pendaftaran Akun: Prioritas Supabase Auth -> Cadangan Lokal
export async function registerUser(name, pass) {
  const clean = String(name || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    return { ok: false, err: 'Nama penjelajah harus 3–20 karakter (huruf kecil, angka, atau garis bawah _).' };
  }
  if (!pass || pass.length < 6) {
    return { ok: false, err: 'Kata sandi minimal 6 karakter.' };
  }

  // 1. Coba daftarkan ke Supabase Auth & Cloud Save
  manualAuthFlowDepth++;
  let cloudRes;
  try {
    cloudRes = await registerPlayerToCloud(clean, pass, {
      progress: store.progress,
      settings: store.settings,
      gameState: readGameState(),
      astroId: store.account.astroId,
    });
  } finally {
    manualAuthFlowDepth = Math.max(0, manualAuthFlowDepth - 1);
  }

  if (cloudRes.ok) {
    // Terapkan data gabungan
    if (cloudRes.mergedData) {
      applyMergedData(cloudRes.mergedData);
    }
    const finalAstroId = cloudRes.astroId || store.account.astroId;
    const userId = cloudRes.userId || cloudRes.user?.id || null;
    Object.assign(store.account, {
      loggedIn: true,
      name: cloudRes.displayName || clean,
      username: cloudRes.username || clean,
      userId,
      authProvider: 'username',
      sessionToken: cloudRes.sessionToken || '',
      cloudSynced: true,
      astroId: finalAstroId,
    });
    ls.write(KEYS.astroId, finalAstroId);
    saveAccount();
    saveProgress();
    // Beralih ke keymap akun ini secara terisolasi (muat milik akun atau tamu bersih)
    const cloudKeymap = cloudRes.mergedData?.progress_data?.keymap || null;
    switchAccountKeymap(userId, cloudKeymap);
    saveSettings();
    return { ok: true, cloud: true };
  }

  // Jika Supabase terkonfigurasi tetapi gagal (termasuk offline jaringan), jangan diam-diam buat akun lokal terpisah
  if (!cloudRes.noClient) {
    return { ok: false, offline: !!cloudRes.offline, err: cloudRes.err };
  }

  // 2. Mode Cadangan Lokal (Offline)
  const users = ls.read(KEYS.users) || {};
  if (users[nameKey(clean)]) {
    return { ok: false, err: 'Nama ini sudah dipakai di perangkat ini. Coba nama lain atau masuk.' };
  }
  const salt = Math.random().toString(36).slice(2, 10);
  users[nameKey(clean)] = { name: clean, salt, hash: await hashPass(salt, pass), at: new Date().toISOString() };
  if (!ls.write(KEYS.users, users)) {
    return { ok: false, err: 'Penyimpanan browser penuh atau diblokir.' };
  }
  Object.assign(store.account, {
    loggedIn: true,
    name: clean,
    username: clean,
    userId: null,
    cloudSynced: false,
  });
  saveAccount();
  return { ok: true, cloud: false };
}

// Masuk Akun: Prioritas Supabase Auth -> Cadangan Lokal
export async function loginUser(name, pass) {
  const clean = sanitizeUsername(name);
  if (!clean) return { ok: false, err: 'Isi nama penjelajah.' };
  if (!pass) return { ok: false, err: 'Isi kata sandi.' };

  // 1. Coba masuk via Supabase Auth
  manualAuthFlowDepth++;
  let cloudRes;
  try {
    cloudRes = await loginPlayerToCloud(clean, pass, {
      progress: store.progress,
      settings: store.settings,
      gameState: readGameState(),
      astroId: store.account.astroId,
    });
  } finally {
    manualAuthFlowDepth = Math.max(0, manualAuthFlowDepth - 1);
  }

  if (cloudRes.ok) {
    if (cloudRes.mergedData) {
      applyMergedData(cloudRes.mergedData);
    }
    const finalAstroId = cloudRes.astroId || store.account.astroId;
    const userId = cloudRes.userId || cloudRes.user?.id || null;
    Object.assign(store.account, {
      loggedIn: true,
      name: cloudRes.displayName || clean,
      username: cloudRes.username || clean,
      userId,
      authProvider: 'username',
      sessionToken: cloudRes.sessionToken || '',
      cloudSynced: true,
      astroId: finalAstroId,
    });
    ls.write(KEYS.astroId, finalAstroId);
    saveAccount();
    saveProgress();
    // Beralih ke keymap akun ini secara terisolasi (muat milik akun, jangan warisi tamu)
    const cloudKeymap = cloudRes.mergedData?.progress_data?.keymap || null;
    switchAccountKeymap(userId, cloudKeymap);
    saveSettings();
    return { ok: true, cloud: true };
  }

  // Jika akun diblokir oleh administrator, tolak mutlak tanpa jatuh ke fallback lokal
  if (cloudRes.banned) {
    return { ok: false, banned: true, err: cloudRes.err };
  }

  // Jika gagal di cloud karena offline jaringan (bukan karena client belum dikonfigurasi), cek akun lokal yang sudah ada; jika belum ada beri pesan offline ramah
  if (cloudRes.offline && !cloudRes.noClient) {
    const localExisting = (ls.read(KEYS.users) || {})[nameKey(clean)];
    if (!localExisting) {
      return { ok: false, offline: true, err: cloudRes.err || OFFLINE_ACTION_NOTICE, unknown: false };
    }
    if (await hashPass(localExisting.salt, pass) !== localExisting.hash) {
      return { ok: false, err: 'Kata sandi salah.' };
    }
    Object.assign(store.account, {
      loggedIn: true,
      name: localExisting.name,
      username: clean,
      userId: null,
      cloudSynced: false,
    });
    saveAccount();
    return { ok: true, cloud: false, localFallback: true };
  }

  // Jika gagal otentikasi di cloud dan bukan karena offline, cek apakah akun lokal ada
  if (!cloudRes.offline) {
    // Jika password salah di cloud, kita coba cek apakah ada akun lokal cadangan
    const u = (ls.read(KEYS.users) || {})[nameKey(clean)];
    if (u && (await hashPass(u.salt, pass)) === u.hash) {
      Object.assign(store.account, {
        loggedIn: true,
        name: u.name,
        username: clean,
        userId: null,
        cloudSynced: false,
      });
      saveAccount();
      return { ok: true, cloud: false, localFallback: true };
    }
    return { ok: false, err: cloudRes.err, unknown: false };
  }

  // 2. Mode Cadangan Lokal
  const u = (ls.read(KEYS.users) || {})[nameKey(clean)];
  if (!u) return { ok: false, err: 'Nama ini belum terdaftar di perangkat ini.', unknown: true };
  if (await hashPass(u.salt, pass) !== u.hash) return { ok: false, err: 'Kata sandi salah.' };

  Object.assign(store.account, {
    loggedIn: true,
    name: u.name,
    username: clean,
    userId: null,
    cloudSynced: false,
  });
  saveAccount();
  return { ok: true, cloud: false };
}

// Keluar Akun
export async function logoutUser() {
  cancelScheduledCloudSave();
  const info = getAccountSessionInfo();
  clearLocalAccountToGuest();
  manualAuthFlowDepth++;
  try {
    await logoutPlayerFromCloud(info);
  } finally {
    manualAuthFlowDepth = Math.max(0, manualAuthFlowDepth - 1);
  }
}

// Masuk dengan Google
export async function loginUserWithGoogle() {
  store.oauthError = '';
  const res = await signInWithGoogle();
  if (!res.ok) {
    showToast(res.err || 'Tidak dapat menghubungkan layanan Google saat ini.', 3500);
  }
  return res;
}
export const loginWithGoogle = loginUserWithGoogle;

function applyMergedData(merged) {
  if (!merged) return;
  if (Number.isFinite(merged.points)) store.progress.points = merged.points;
  if (Number.isFinite(merged.earned)) store.progress.earned = merged.earned;
  if (merged.selected_ship && SHIPS[merged.selected_ship]) store.progress.selectedShip = merged.selected_ship;
  if (Array.isArray(merged.owned_ships)) store.progress.owned = merged.owned_ships;

  const pd = merged.progress_data || {};
  if (pd.best) Object.assign(store.progress.best, pd.best);
  if (pd.attempts) Object.assign(store.progress.attempts, pd.attempts);
  if (Array.isArray(pd.ledger)) store.progress.ledger = pd.ledger;
  if (pd.predict) Object.assign(store.progress.predict, pd.predict);
  if (pd.myths) Object.assign(store.progress.myths, pd.myths);
  if (pd.cards) Object.assign(store.progress.cards, pd.cards);
  if (pd.found) Object.assign(store.progress.found, pd.found);
  if (pd.events) Object.assign(store.progress.events, pd.events);
  if (pd.missions) Object.assign(store.progress.missions, pd.missions);

  if (merged.settings_data) {
    Object.assign(store.settings, sanitizeSettings(merged.settings_data));
  }
}

export function readGameState() {
  const s = ls.read(KEYS.state);
  if (!s || !s.position || !s.rotation) return null;
  const p = s.position, r = s.rotation;
  if (![p.x, p.y, p.z, r.x, r.y, r.z].every(Number.isFinite)) return null;
  return s;
}

export function writeGameState(data) {
  const ok = ls.write(KEYS.state, data);
  triggerCloudSync();
  return ok;
}

export function wipeAll() {
  for (const k of Object.values(KEYS)) ls.remove(k);
}

export async function resetAllGameData() {
  // 1. Jika login akun online, sinkronkan reset bersih ke database terlebih dahulu agar tidak terjadi reset palsu saat offline
  if (store.account.loggedIn && store.account.userId) {
    const cloudRes = await resetPlayerCloudProgress(getAccountSessionInfo());
    if (!cloudRes.ok && !cloudRes.noClient) {
      showToast(cloudRes.err || GENERIC_PUBLIC_ERROR, 3500);
      return { ok: false, offline: !!cloudRes.offline, err: cloudRes.err };
    }
  }

  // 2. Bersihkan localStorage data progres & posisi 3D
  ls.remove(KEYS.state);
  ls.remove(KEYS.progress);

  // Reset tutorialSeen agar onboarding dapat muncul kembali
  store.settings.tutorialSeen = false;
  ls.write(KEYS.settings, store.settings);

  // 3. Reset state reaktif progres & penemuan
  const cleanProgress = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  Object.assign(store.progress, cleanProgress);
  store.discovered = ['matahari'];
  store.hasSave = false;
  store.saveMeta = '';

  // 4. Tutup seluruh modal dan hentikan mesin/sesi game ke splash screen
  store.modal = null;
  store.journalId = null;
  const eng = game();
  if (eng) {
    try {
      eng.toSplash(true);
    } catch {}
  } else {
    store.phase = 'splash';
    store.screen = 'welcome';
    store.mode = 'jelajah';
  }
  showToast('Seluruh data permainan berhasil diatur ulang dari awal.', 3200);
  return { ok: true };
}

export async function deleteUserAccount() {
  // 1. Hapus akun dari server (RPC username atau Google) jika akun online terhubung
  if (store.account.loggedIn && store.account.userId) {
    const cloudRes = await deletePlayerAccountFromCloud(getAccountSessionInfo());
    if (!cloudRes.ok && !cloudRes.noClient) {
      showToast(cloudRes.err || GENERIC_PUBLIC_ERROR, 3500);
      return { ok: false, offline: !!cloudRes.offline, err: cloudRes.err };
    }
  }

  // 2. Hapus seluruh data di localStorage
  if (store.account.name) {
    const users = ls.read(KEYS.users) || {};
    delete users[store.account.name.toLowerCase()];
    ls.write(KEYS.users, users);
  }
  for (const k of Object.values(KEYS)) ls.remove(k);

  // 3. Reset state akun
  let guestAstroId = generateAstroId();
  ls.write(KEYS.astroId, guestAstroId);
  store.account.loggedIn = false;
  store.account.name = '';
  store.account.id = null;
  store.account.userId = null;
  store.account.authProvider = '';
  store.account.sessionToken = '';
  store.account.email = null;
  store.account.username = '';
  store.account.cloudSynced = false;
  store.account.astroId = guestAstroId;

  // 4. Reset progress & settings
  const cleanProgress = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  Object.assign(store.progress, cleanProgress);
  const cleanSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(store.settings, cleanSettings);
  store.discovered = ['matahari'];
  store.hasSave = false;
  store.saveMeta = '';
  switchAccountKeymap(null);

  // 5. Kembali ke splash screen bersih
  store.modal = null;
  store.journalId = null;
  const eng = game();
  if (eng) {
    try {
      eng.toSplash(true);
    } catch {}
  } else {
    store.phase = 'splash';
    store.screen = 'welcome';
    store.mode = 'jelajah';
  }
  showToast('Akun dan seluruh progres berhasil dihapus permanen.', 3500);
  return { ok: true };
}

/** Ringkasan simpanan untuk tombol "Lanjutkan" — bisa dibaca sebelum dunia 3D dimuat. */
export function refreshSaveInfo() {
  const s = readGameState();
  store.hasSave = !!s;
  store.saveMeta = s ? [s.nearest && NAME_OF[s.nearest] ? 'Dekat ' + NAME_OF[s.nearest] : '', Array.isArray(s.discovered) ? s.discovered.length + ' penemuan' : ''].filter(Boolean).join(' · ') : '';
}

if (typeof window !== 'undefined') {
  refreshSaveInfo();

  const cleanOAuthUrl = () => {
    if (!window.history?.replaceState) return;
    const sp = new URLSearchParams(window.location.search || '');
    const hp = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    for (const k of ['code', 'state', 'error', 'error_code', 'error_description']) sp.delete(k);
    for (const k of ['access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'type', 'error', 'error_code', 'error_description']) hp.delete(k);
    const nextSearch = sp.toString();
    const nextHash = hp.toString();
    const cleanTarget = `${window.location.pathname || '/'}${nextSearch ? `?${nextSearch}` : ''}${nextHash ? `#${nextHash}` : ''}`;
    window.history.replaceState({}, document.title, cleanTarget);
  };

  // Tangkap indikator callback OAuth Google sebelum SDK membersihkan URL fragment/query
  const initialSp = new URLSearchParams(window.location.search || '');
  const initialHp = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const INITIAL_OAUTH_ERROR = initialSp.get('error_description') || initialHp.get('error_description') || initialSp.get('error') || initialHp.get('error') || '';
  const INITIAL_OAUTH_ERROR_CODE = initialSp.get('error_code') || initialHp.get('error_code') || '';
  const INITIAL_OAUTH_CALLBACK = !INITIAL_OAUTH_ERROR && (initialHp.has('access_token') || initialHp.has('refresh_token') || initialSp.has('code'));
  const INITIAL_LOGGED_IN_UID = (() => {
    const a = ls.read(KEYS.account);
    return a?.loggedIn && typeof a.userId === 'string' && a.userId ? a.userId : null;
  })();

  if (INITIAL_OAUTH_ERROR) {
    console.error('[AstroSphere] Google OAuth callback error:', {
      error: initialSp.get('error') || initialHp.get('error') || '',
      code: INITIAL_OAUTH_ERROR_CODE,
      description: INITIAL_OAUTH_ERROR,
    });
    cleanOAuthUrl();
    const isBannedOAuth = INITIAL_OAUTH_ERROR_CODE.toLowerCase() === 'user_banned'
      || INITIAL_OAUTH_ERROR.toLowerCase().includes('banned')
      || INITIAL_OAUTH_ERROR.toLowerCase().includes('disabled');
    const msg = isBannedOAuth
      ? formatBannedMessage()
      : 'Autentikasi Google dibatalkan atau gagal diproses. Silakan coba lagi.';
    store.oauthError = msg;
    if (store.phase === 'splash') store.screen = 'login';
    showToast(msg, 4500);
  }

  let lastStatusCheckAt = 0;
  async function verifyActiveAccountStatus({ force = false } = {}) {
    if (!store.account.loggedIn || !store.account.cloudSynced || !store.account.userId) return;
    if (window.location.pathname.startsWith('/admin')) return;
    if (store.bannedModal.show || isRevokingSession || manualAuthFlowDepth > 0) return;
    if (isBrowserOffline()) return;

    const now = Date.now();
    if (!force && now - lastStatusCheckAt < 2500) return;
    lastStatusCheckAt = now;

    const snapshot = getAccountSessionInfo();
    if (snapshot.authProvider === 'username' && !snapshot.sessionToken) return;

    const statusRes = await checkPlayerAccountStatus(snapshot);
    if (!store.account.loggedIn || store.account.userId !== snapshot.userId) return;
    if (statusRes.offline) return;

    if (statusRes.banned || statusRes.revoked) {
      await forceRevokeAccountSession({
        banned: !!statusRes.banned,
        reason: statusRes.bannedReason || '',
        message: statusRes.err,
      });
    }
  }

  // Pemeriksaan status akun aktif berkala (setiap 15 detik) & saat tab kembali aktif
  setInterval(() => {
    verifyActiveAccountStatus();
  }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      verifyActiveAccountStatus();
    }
  });
  window.addEventListener('focus', () => {
    verifyActiveAccountStatus();
  });
  window.addEventListener('online', () => {
    verifyActiveAccountStatus({ force: true });
  });

  // Pulihkan sesi aktif Supabase Auth saat halaman dibuka jika ada
  const client = getSupabaseClient();
  if (client) {
    let oauthRedirectHandled = false;
    let sessionSyncQueue = Promise.resolve();

    async function processUserSession(user, fromOAuth = false) {
      if (!user || manualAuthFlowDepth > 0) return;
      if (window.location.pathname.startsWith('/admin')) return;

      // Cek apakah user adalah admin (jangan sentuh sesi admin)
      try {
        if (user.email) {
          const { data: adminRow } = await client
            .from('admin_users')
            .select('email')
            .eq('email', user.email.toLowerCase())
            .maybeSingle();

          if (adminRow) {
            // Akun admin, jangan kelola di sesi game pemain
            return;
          }
        }
      } catch {}

      const isSyntheticPlayer = user.email?.endsWith('@player.astrosphere.app');
      const isGoogle = user.app_metadata?.provider === 'google' ||
                       user.identities?.some(i => i.provider === 'google') ||
                       !isSyntheticPlayer;

      // Cegah duplikasi upsert paralel untuk sesi pengguna yang sama saat event auth beruntun
      if (syncedSessionUserId === user.id && store.account.loggedIn && store.account.cloudSynced) {
        const shouldFinishOAuthNav = !oauthRedirectHandled && (
          INITIAL_OAUTH_CALLBACK ||
          (fromOAuth && INITIAL_LOGGED_IN_UID !== user.id) ||
          window.location.hash.includes('access_token') ||
          window.location.search.includes('code=')
        );
        if (shouldFinishOAuthNav) {
          oauthRedirectHandled = true;
          if (window.history?.replaceState && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          if (store.phase === 'splash') {
            store.settings.tutorialSeen = true;
            saveSettings();
            showToast(`Selamat datang, <b>${store.account.name.replace(/[<>&"]/g, '')}</b>!`, 3200);
            store.startFromSave = store.hasSave;
            store.phase = 'loading';
          }
        }
        return;
      }

      if (isGoogle) {
        const syncRes = await syncGooglePlayerSession(user, {
          progress: store.progress,
          settings: store.settings,
          gameState: readGameState(),
          astroId: store.account.astroId,
        });

        if (syncRes.banned) {
          const isFreshLoginAttempt = (INITIAL_OAUTH_CALLBACK || fromOAuth)
            && !INITIAL_LOGGED_IN_UID
            && !store.account.loggedIn
            && store.phase === 'splash';
          cleanOAuthUrl();
          await forceRevokeAccountSession({
            banned: true,
            reason: syncRes.bannedReason || '',
            message: syncRes.err,
            silentModal: isFreshLoginAttempt,
          });
          if (isFreshLoginAttempt) {
            store.oauthError = syncRes.err;
            store.screen = 'login';
            showToast(syncRes.err, 5000);
          }
          return;
        }
        if (syncRes.offline) {
          // Saat offline, pertahankan sesi lokal pengguna tanpa mencabut akun
          store.account.loggedIn = true;
          store.account.userId = user.id;
          store.account.cloudSynced = true;
          saveAccount();
          return;
        }
        if (!syncRes.ok) {
          showToast(syncRes.err || GENERIC_PUBLIC_ERROR, 3800);
          return;
        }

        if (syncRes.ok) {
          syncedSessionUserId = user.id;
          if (syncRes.mergedData) {
            applyMergedData(syncRes.mergedData);
          }
          const finalAstroId = syncRes.astroId || store.account.astroId;
          Object.assign(store.account, {
            loggedIn: true,
            name: syncRes.displayName || syncRes.username,
            username: syncRes.username,
            userId: syncRes.userId || user.id,
            authProvider: 'google',
            sessionToken: '',
            cloudSynced: true,
            astroId: finalAstroId,
          });
          ls.write(KEYS.astroId, finalAstroId);
          saveAccount();
          saveProgress();
          // Beralih ke keymap akun Google ini secara terisolasi
          const cloudKeymap = syncRes.mergedData?.progress_data?.keymap || null;
          switchAccountKeymap(user.id, cloudKeymap);
          saveSettings();

          // Deteksi jika baru kembali dari redirect Google OAuth (PKCE maupun implicit)
          const isRedirectReturn = !oauthRedirectHandled && (
            INITIAL_OAUTH_CALLBACK ||
            (fromOAuth && INITIAL_LOGGED_IN_UID !== user.id) ||
            window.location.hash.includes('access_token') ||
            window.location.search.includes('code=')
          );

          if (isRedirectReturn) {
            oauthRedirectHandled = true;
            if (window.history?.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            if (store.phase === 'splash') {
              store.settings.tutorialSeen = true;
              saveSettings();
              showToast(`Selamat datang, <b>${store.account.name.replace(/[<>&"]/g, '')}</b>!`, 3200);
              store.startFromSave = store.hasSave;
              store.phase = 'loading';
            }
          }
        }
      } else {
        // Akun pemain sintetis lama: cek status is_active pada player_progress
        if (isBrowserOffline()) {
          store.account.loggedIn = true;
          store.account.userId = user.id;
          store.account.cloudSynced = true;
          saveAccount();
          return;
        }
        const { data: pRow, error: pErr } = await client
          .from('player_progress')
          .select('is_active, banned_reason, astro_id, username, display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (pErr) {
          if (isOfflineOrNetworkError(pErr) || isBrowserOffline()) {
            store.account.loggedIn = true;
            store.account.userId = user.id;
            store.account.cloudSynced = true;
            saveAccount();
            return;
          }
          console.warn('[AstroSphere] Peringatan pemeriksaan status akun:', pErr);
          return;
        }

        if (!pRow || pRow.is_active === false) {
          const reason = String(pRow?.banned_reason || '').trim();
          await forceRevokeAccountSession({
            banned: pRow?.is_active === false,
            reason,
            message: pRow?.is_active === false
              ? formatBannedMessage(reason)
              : 'Akun Anda tidak lagi aktif atau telah dihapus.',
          });
          return;
        }

        syncedSessionUserId = user.id;
        store.account.loggedIn = true;
        store.account.userId = user.id;
        store.account.cloudSynced = true;
        if (pRow.astro_id) {
          store.account.astroId = pRow.astro_id;
          ls.write(KEYS.astroId, pRow.astro_id);
        }
        if (!store.account.name && (pRow.display_name || pRow.username || user.user_metadata?.username)) {
          store.account.name = pRow.display_name || pRow.username || user.user_metadata.username;
          store.account.username = pRow.username || user.user_metadata.username;
        }
        saveAccount();
      }
    }

    function handleUserSession(user, fromOAuth = false) {
      if (!user || manualAuthFlowDepth > 0) return Promise.resolve();
      sessionSyncQueue = sessionSyncQueue
        .catch(() => {})
        .then(() => processUserSession(user, fromOAuth));
      return sessionSyncQueue;
    }

    // Tunggu getSession() terlebih dahulu agar detectSessionInUrl (PKCE ?code= / implicit #access_token=) selesai diproses
    if (!isBrowserOffline()) {
      client.auth.getSession().then(async ({ data: sessData, error: sessErr }) => {
        if (sessErr) {
          console.error('[AstroSphere] OAuth / session init error:', sessErr);
          if (INITIAL_OAUTH_CALLBACK || window.location.search.includes('code=') || window.location.search.includes('error=')) {
            cleanOAuthUrl();
            const errStr = String(sessErr.code || sessErr.message || '').toLowerCase();
            const msg = errStr.includes('banned') || errStr.includes('disabled')
              ? formatBannedMessage()
              : 'Autentikasi Google dibatalkan atau gagal diproses. Silakan coba lagi.';
            store.oauthError = msg;
            if (store.phase === 'splash') store.screen = 'login';
            showToast(msg, 4200);
          }
          return;
        }
        if (!sessData?.session?.user) {
          if (INITIAL_OAUTH_CALLBACK || window.location.search.includes('code=')) {
            cleanOAuthUrl();
          }
          // Jika sesi yang aktif adalah akun username + sessionToken, pulihkan & sinkronkan lewat RPC
          if (store.account.loggedIn && store.account.cloudSynced && store.account.userId && store.account.sessionToken) {
            pullCloudProgress();
            return;
          }
          if (store.account.loggedIn && store.account.cloudSynced) {
            await forceRevokeAccountSession({
              banned: false,
              message: 'Sesi akun berakhir. Silakan masuk kembali.',
            });
          }
          return;
        }

        // Proses & periksa status row player_progress LEBIH DAHULU sebelum memanggil getUser()
        await handleUserSession(sessData.session.user, INITIAL_OAUTH_CALLBACK);
        if (!store.account.loggedIn || !store.account.cloudSynced) return;

        const { error: userErr } = await client.auth.getUser();
        if (userErr) {
          if (isOfflineOrNetworkError(userErr) || isBrowserOffline()) {
            return;
          }
          const preCheck = await checkPlayerAccountStatus({
            userId: sessData.session.user.id,
            authProvider: 'google',
          });
          if (preCheck.offline) return;
          const isBanned = !!preCheck.banned || String(userErr.message || '').toLowerCase().includes('banned');
          await forceRevokeAccountSession({
            banned: isBanned,
            reason: preCheck.bannedReason || '',
            message: isBanned
              ? (preCheck.err || formatBannedMessage())
              : 'Sesi akun tidak lagi valid atau telah dihapus pengelola.',
          });
        }
      }).catch(() => {});
    }

    client.auth.onAuthStateChange((event, session) => {
      if (manualAuthFlowDepth > 0) return;
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        handleUserSession(session.user, event === 'SIGNED_IN' || INITIAL_OAUTH_CALLBACK);
      } else if (event === 'SIGNED_OUT') {
        syncedSessionUserId = null;
        if (store.account.loggedIn && store.account.cloudSynced && store.account.authProvider !== 'username') {
          forceRevokeAccountSession({
            banned: false,
            message: 'Sesi akun Anda telah berakhir. Silakan masuk kembali.',
          });
        }
      }
    });
  }
}

// ---- Ekonomi poin (PRD §11.2) ----
export function submitQuiz(planet, score) {
  const p = store.progress;
  const prev = p.best[planet] ?? 0;
  const reward = Math.max(0, score - prev);
  p.attempts[planet] = (p.attempts[planet] || 0) + 1;
  if (score > prev) p.best[planet] = score;
  if (reward > 0) {
    p.points += reward;
    p.earned += reward;
    p.ledger.push({ id: `${planet}-${Date.now()}`, type: 'kuis', planet, attempt: p.attempts[planet], delta: reward, from: prev, to: score, at: new Date().toISOString() });
  }
  saveProgress();
  return { reward, prev };
}

export function unlockShip(id) {
  const p = store.progress;
  const liveShips = useSupabaseContent().getShips?.() || {};
  const s = liveShips[id] || SHIPS[id];
  if (!s || s.is_active === false) return { ok: false, inactive: true };
  if (p.owned.includes(id)) return { ok: true, already: true };
  if (p.points < s.price) return { ok: false, need: s.price - p.points };
  p.points -= s.price;
  p.owned.push(id);
  p.ledger.push({ id: `ship-${id}-${Date.now()}`, type: 'pesawat', ship: id, delta: -s.price, at: new Date().toISOString() });
  saveProgress();
  return { ok: true };
}

// ---- Tebak dulu & Mitos atau Fakta (data/learning.js) ----
function addPoints(n) {
  store.progress.points += n;
  store.progress.earned += n;
}

/** Simpan tebakan fenomena. Bintang hanya untuk tebakan pertama yang benar. */
export function recordPrediction(key, pick, customQuestion = null) {
  const p = store.progress;
  const q = (customQuestion && Number.isInteger(customQuestion.a)) ? customQuestion : PREDICT[key];
  if (!q) return { ok: false, reward: 0 };
  const ok = pick === q.a, first = !p.predict[key];
  p.predict[key] = { pick, ok };
  let reward = 0;
  if (first && ok) {
    reward = Number(q.points) > 0 ? Number(q.points) : PREDICT_REWARD;
    addPoints(reward);
    p.ledger.push({ id: `tebak-${key}-${Date.now()}`, type: 'tebak', key, delta: reward, at: new Date().toISOString() });
  }
  saveProgress();
  return { ok, reward };
}

/** Satu jawaban Mitos/Fakta. Bintang hanya saat pernyataan itu pertama kali dijawab benar. */
export function recordMyth(id, ok, customPoints = MYTH_REWARD) {
  const p = store.progress;
  if (!ok || p.myths[id]) return 0;
  const reward = Number(customPoints) > 0 ? Number(customPoints) : MYTH_REWARD;
  p.myths[id] = true;
  addPoints(reward);
  saveProgress();
  return reward;
}

/** Kartu "Tahukah kamu?" dibuka: +bintang hanya pertama kali. */
export function openCard(id) {
  const p = store.progress;
  const sup = useSupabaseContent();
  const hasFacts = sup.loadedFromDb?.value?.facts
    ? sup.getFacts(id)?.length > 0
    : Boolean(FACTS[id] || sup.getFacts(id)?.length);
  if (!hasFacts || p.cards[id]) return 0;
  p.cards[id] = true;
  addPoints(CARD_REWARD);
  p.ledger.push({ id: `kartu-${id}-${Date.now()}`, type: 'kartu', key: id, delta: CARD_REWARD, at: new Date().toISOString() });
  saveProgress();
  return CARD_REWARD;
}

/** Jumlah kartu benda yang sudah ditemukan tetapi belum dibaca (untuk lencana di menu). */
export function unreadCards() {
  const sup = useSupabaseContent();
  const map = sup.loadedFromDb?.value?.facts ? sup.facts.value : FACTS;
  return Object.keys(map).filter((id) => (map[id]?.length ?? 0) > 0 && isFound(id) && !store.progress.cards[id]).length;
}

/** Misi selesai: +bintang hanya saat pertama kali tamat; bintang misi terbaik disimpan. */
export function rewardMission(id, stars) {
  if (!MISSIONS[id]) return 0;
  const p = store.progress, prev = p.missions[id] || { done: 0, stars: 0 };
  const reward = prev.done ? 0 : MISSION_REWARD;
  p.missions[id] = { done: prev.done + 1, stars: Math.max(prev.stars, stars) };
  if (reward) {
    addPoints(reward);
    p.ledger.push({ id: `misi-${id}-${Date.now()}`, type: 'misi', key: id, delta: reward, at: new Date().toISOString() });
  }
  saveProgress();
  return reward;
}

/** Selamat dari peristiwa antariksa: +bintang setiap kali (peristiwa jarang terjadi). */
export function rewardEvent(kind) {
  if (!EVENTS[kind]) return 0;
  const p = store.progress;
  p.events[kind] = (p.events[kind] || 0) + 1;
  addPoints(EVENT_REWARD);
  p.ledger.push({ id: `peristiwa-${kind}-${Date.now()}`, type: 'peristiwa', key: kind, delta: EVENT_REWARD, at: new Date().toISOString() });
  saveProgress();
  return EVENT_REWARD;
}

export function logMythRound(correct, total, gained) {
  if (gained <= 0) return;
  store.progress.ledger.push({ id: `mitos-${Date.now()}`, type: 'mitos', correct, total, delta: gained, at: new Date().toISOString() });
  saveProgress();
}

function parseToastSegments(raw) {
  if (!raw || typeof raw !== 'string') return [];
  // Strip tag selain <b>...</b> lalu pecah aman menjadi array teks biasa & cetak tebal tanpa v-html
  const segments = [];
  const regex = /<b>([\s\S]*?)<\/b>/gi;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const plain = raw.slice(lastIndex, match.index).replace(/<[^>]*>/g, '');
      if (plain) segments.push({ text: plain, bold: false });
    }
    const boldText = match[1].replace(/<[^>]*>/g, '');
    if (boldText) segments.push({ text: boldText, bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) {
    const rest = raw.slice(lastIndex).replace(/<[^>]*>/g, '');
    if (rest) segments.push({ text: rest, bold: false });
  }
  return segments;
}

let toastT = 0;
export function showToast(html, ms = 3200) {
  store.toast.parts = parseToastSegments(html);
  store.toast.show = true;
  clearTimeout(toastT);
  toastT = setTimeout(() => { store.toast.show = false; }, ms);
}

let engineRef = null;
export const setEngine = (e) => { engineRef = e; };
export const game = () => engineRef;

/**
 * Menentukan apakah layar Onboarding 5 Slide (Guide.vue) harus ditampilkan:
 * - HANYA tampil untuk Tamu Baru (!store.account.loggedIn && !store.hasSave && !store.settings.tutorialSeen).
 * - Langsung lewati jika sudah login akun ATAU sudah pernah main (hasSave / tutorialSeen).
 */
export function getActiveShipIds() {
  const liveShips = useSupabaseContent().getShips?.() || {};
  const ids = SHIP_IDS.filter((id) => liveShips[id]?.is_active !== false);
  return ids.length ? ids : [SHIP_IDS[0]];
}

export function shouldShowGuide() {
  return !store.account.loggedIn && !store.hasSave && !store.settings.tutorialSeen;
}

export function useGame() { return { store, game, shouldShowGuide }; }

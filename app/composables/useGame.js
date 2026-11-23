// State bersama UI ↔ mesin 3D + penyimpanan lokal (localStorage) + Sinkronisasi Awan (Supabase).
// Alur: splash (Beranda/Masuk/Daftar, tanpa WebGL) → guide (cara bermain + memuat dunia 3D) → playing ⇄ paused.
import { reactive, watch } from 'vue';
import { SHIPS } from '../data/ships.js';
import { QUIZ, POINTS_PER_QUESTION, QUIZ_VERSION } from '../data/quiz.js';
import { NAME_OF } from '../data/solarSystem.js';
import { sanitizeKeys } from '../data/keymap.js';
import { PREDICT, PREDICT_REWARD, MYTH_IDS, MYTH_REWARD, FACTS, CARD_REWARD } from '../data/learning.js';
import { EVENTS, EVENT_REWARD } from '../data/events.js';
import { MISSIONS, MISSION_REWARD } from '../data/missions.js';
import {
  registerPlayerToCloud,
  loginPlayerToCloud,
  logoutPlayerFromCloud,
  scheduleCloudSave,
  sanitizeUsername,
  signInWithGoogle,
  syncGooglePlayerSession,
  resetPlayerCloudProgress,
  deletePlayerAccountFromCloud,
} from '../utils/playerCloudSync.js';
import { getSupabaseClient } from '../utils/supabaseClient.js';

const KEYS = {
  state: 'astrosphere.gameState',
  settings: 'astrosphere.settings',
  progress: 'astrosphere.progress',
  account: 'astrosphere.account',
  users: 'astrosphere.users',
};

const ls = {
  read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
};

const touch = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches));
const DEFAULT_SETTINGS = { soundEnabled: true, hudOpacity: 1, sensitivity: 1, invertY: false, graphics: 'rendah', reduceMotion: false, tutorialSeen: false, events: true, keys: {} };
const DEFAULT_PROGRESS = { points: 0, earned: 0, best: {}, attempts: {}, owned: ['astra'], selectedShip: 'astra', ledger: [], quizVersion: QUIZ_VERSION, predict: {}, myths: {}, cards: {}, found: { matahari: true }, events: {}, missions: {} };

/** Menghitung skor kuis maksimal yang sah per planet (atau default 4 soal × 50 poin = 200) */
export function quizMax(planet) {
  return (planet && QUIZ[planet]?.questions?.length)
    ? QUIZ[planet].questions.length * POINTS_PER_QUESTION
    : POINTS_PER_QUESTION * 4;
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

function sanitizeProgress(p) {
  const o = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  if (!p || typeof p !== 'object') return o;
  if (Number.isFinite(p.points) && p.points >= 0) o.points = Math.floor(p.points);
  if (Number.isFinite(p.earned) && p.earned >= 0) o.earned = Math.floor(p.earned);
  if (p.best && typeof p.best === 'object') for (const [k, v] of Object.entries(p.best)) if (QUIZ[k] && Number.isFinite(v)) o.best[k] = Math.min(quizMax(k), Math.max(0, v));
  if (p.attempts && typeof p.attempts === 'object') for (const [k, v] of Object.entries(p.attempts)) if (QUIZ[k] && Number.isFinite(v)) o.attempts[k] = v;
  if (Array.isArray(p.owned)) o.owned = [...new Set(['astra', ...p.owned.filter((id) => SHIPS[id])])];
  if (SHIPS[p.selectedShip] && o.owned.includes(p.selectedShip)) o.selectedShip = p.selectedShip;
  if (Array.isArray(p.ledger)) o.ledger = p.ledger.slice(-60);
  if (p.predict && typeof p.predict === 'object') for (const [k, v] of Object.entries(p.predict)) if (PREDICT[k] && v && Number.isInteger(v.pick)) o.predict[k] = { pick: v.pick, ok: !!v.ok };
  if (p.myths && typeof p.myths === 'object') for (const k of Object.keys(p.myths)) if (MYTH_IDS.has(k)) o.myths[k] = true;
  if (p.cards && typeof p.cards === 'object') for (const k of Object.keys(p.cards)) if (FACTS[k]) o.cards[k] = true;
  if (p.missions && typeof p.missions === 'object') for (const [k, v] of Object.entries(p.missions)) if (MISSIONS[k] && v && Number.isFinite(v.done)) o.missions[k] = { done: Math.max(0, Math.floor(v.done)), stars: Math.min(3, Math.max(0, Math.floor(v.stars || 0))) };
  if (p.events && typeof p.events === 'object') for (const [k, v] of Object.entries(p.events)) if (EVENTS[k] && Number.isFinite(v)) o.events[k] = Math.max(0, Math.floor(v));
  // Benda yang pernah ditemukan (permanen)
  for (const k of [...Object.keys(p.found || {}), ...Object.keys(o.cards), ...Object.keys(o.best), ...Object.keys(o.predict)]) if (FACTS[k]) o.found[k] = true;
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
  toast: { show: false, html: '' },
  msg: { show: false, text: '' },
  saved: { show: false, label: '' },
  look: { active: false, freeLook: false },
  camMode: 'chase',
  settings: sanitizeSettings(ls.read(KEYS.settings)),
  progress: sanitizeProgress(ls.read(KEYS.progress)),
  account: (() => {
    const a = ls.read(KEYS.account);
    return {
      loggedIn: !!a?.loggedIn && typeof a.name === 'string' && !!a.name,
      name: typeof a?.name === 'string' ? a.name : '',
      username: typeof a?.username === 'string' ? a.username : '',
      userId: typeof a?.userId === 'string' ? a.userId : null,
      cloudSynced: !!a?.cloudSynced,
    };
  })(),
  discovered: [],
  hasSave: false,
  saveMeta: '',
  focus: 'bumi',
  obs: { mul: 1, day: 0, date: '' },
  toggles: { orbit: true, axis: true, follow: false },
  sejarah: { body: 'mars', era: 'semua', selected: 'mar-1965' },
  lab: { type: 'matahari', pov: 'samping', t: 30, playing: true, speed: 1, volume: true, labels: true, status: 'none', covered: 0, caller: 'planet', dia: null, marks: [] },
  quiz: { planet: 'bumi', stage: 'intro', index: 0, picked: null, answers: [], score: 0, reward: 0, prevBest: 0, kind: 'planet', mythStage: 'intro' },
  modal: null,             // null | settings | journal | confirmNew | controls
  journalId: null,         // Jurnal: benda yang kartunya sedang dibuka
  profileTab: 'kuis',
  hangarPreview: 'astra',
});

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

// Memicu sinkronisasi ke awan (debounced 2 detik) jika pemain masuk akun Supabase
function triggerCloudSync() {
  if (!store.account.loggedIn || !store.account.userId || !store.account.cloudSynced) return;

  scheduleCloudSave(store.account.userId, () => ({
    points: store.progress.points,
    earned: store.progress.earned,
    selected_ship: store.progress.selectedShip,
    owned_ships: store.progress.owned,
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
    },
    game_state: readGameState() || {},
    settings_data: store.settings,
  }), () => {
    store.saved.label = 'Tersimpan di Awan';
    store.saved.show = true;
    setTimeout(() => { store.saved.show = false; }, 2200);
  });
}

export function saveSettings() {
  ls.write(KEYS.settings, store.settings);
  triggerCloudSync();
}

export function saveProgress() {
  ls.write(KEYS.progress, store.progress);
  triggerCloudSync();
}

export function saveAccount() {
  ls.write(KEYS.account, store.account);
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

// Pendaftaran Akun: Prioritas Supabase Auth -> Cadangan Lokal
export async function registerUser(name, pass) {
  const clean = sanitizeUsername(name);
  if (clean.length < 3 || clean.length > 20) {
    return { ok: false, err: 'Nama penjelajah harus 3–20 karakter alfanumerik (huruf kecil, angka, atau garis bawah).' };
  }
  if (!pass || pass.length < 6) {
    return { ok: false, err: 'Kata sandi minimal 6 karakter.' };
  }

  // 1. Coba daftarkan ke Supabase Auth & Cloud Save
  const cloudRes = await registerPlayerToCloud(clean, pass, {
    progress: store.progress,
    settings: store.settings,
    gameState: readGameState(),
  });

  if (cloudRes.ok) {
    // Terapkan data gabungan
    if (cloudRes.mergedData) {
      applyMergedData(cloudRes.mergedData);
    }
    Object.assign(store.account, {
      loggedIn: true,
      name: cloudRes.displayName || clean,
      username: clean,
      userId: cloudRes.user?.id || null,
      cloudSynced: true,
    });
    saveAccount();
    saveProgress();
    saveSettings();
    return { ok: true, cloud: true };
  }

  // Jika error bukan karena offline (misal nama sudah ada di server awan), jangan fallback diam-diam
  if (!cloudRes.offline) {
    return { ok: false, err: cloudRes.err };
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
  const cloudRes = await loginPlayerToCloud(clean, pass, {
    progress: store.progress,
    settings: store.settings,
    gameState: readGameState(),
  });

  if (cloudRes.ok) {
    if (cloudRes.mergedData) {
      applyMergedData(cloudRes.mergedData);
    }
    Object.assign(store.account, {
      loggedIn: true,
      name: cloudRes.displayName || clean,
      username: clean,
      userId: cloudRes.user?.id || null,
      cloudSynced: true,
    });
    saveAccount();
    saveProgress();
    saveSettings();
    return { ok: true, cloud: true };
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
  await logoutPlayerFromCloud();
  Object.assign(store.account, {
    loggedIn: false,
    name: '',
    username: '',
    userId: null,
    cloudSynced: false,
  });
  saveAccount();
}

// Masuk dengan Google OAuth
export async function loginUserWithGoogle() {
  const res = await signInWithGoogle();
  if (!res.ok) {
    showToast(res.err || 'Gagal menghubungkan Google.', 3500);
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
  // 1. Bersihkan localStorage data progres & posisi 3D
  ls.remove(KEYS.state);
  ls.remove(KEYS.progress);

  // Reset tutorialSeen agar onboarding dapat muncul kembali
  store.settings.tutorialSeen = false;
  ls.write(KEYS.settings, store.settings);

  // 2. Reset state reaktif progres & penemuan
  const cleanProgress = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  Object.assign(store.progress, cleanProgress);
  store.discovered = ['matahari'];
  store.hasSave = false;
  store.saveMeta = '';

  // 3. Jika login akun awan, sinkronkan reset bersih ke Supabase (akun tetap aktif)
  if (store.account.loggedIn && store.account.id) {
    await resetPlayerCloudProgress(store.account.id);
  }

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
}

export async function deleteUserAccount() {
  // 1. Panggil RPC Supabase jika login
  if (store.account.loggedIn) {
    await deletePlayerAccountFromCloud();
  }

  // 2. Hapus seluruh data di localStorage
  if (store.account.name) {
    const users = ls.read(KEYS.users) || {};
    delete users[store.account.name.toLowerCase()];
    ls.write(KEYS.users, users);
  }
  for (const k of Object.values(KEYS)) ls.remove(k);

  // 3. Reset state akun
  store.account.loggedIn = false;
  store.account.name = 'Penjelajah Tamu';
  store.account.id = null;
  store.account.email = null;
  store.account.username = '';

  // 4. Reset progress & settings
  const cleanProgress = JSON.parse(JSON.stringify(DEFAULT_PROGRESS));
  Object.assign(store.progress, cleanProgress);
  const cleanSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(store.settings, cleanSettings);
  store.discovered = ['matahari'];
  store.hasSave = false;
  store.saveMeta = '';

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
}

/** Ringkasan simpanan untuk tombol "Lanjutkan" — bisa dibaca sebelum dunia 3D dimuat. */
export function refreshSaveInfo() {
  const s = readGameState();
  store.hasSave = !!s;
  store.saveMeta = s ? [s.nearest && NAME_OF[s.nearest] ? 'Dekat ' + NAME_OF[s.nearest] : '', Array.isArray(s.discovered) ? s.discovered.length + ' penemuan' : ''].filter(Boolean).join(' · ') : '';
}

if (typeof window !== 'undefined') {
  refreshSaveInfo();

  // Pulihkan sesi aktif Supabase Auth saat halaman dibuka jika ada
  const client = getSupabaseClient();
  if (client) {
    let authHandled = false;

    async function handleUserSession(user, fromOAuth = false) {
      if (!user) return;
      if (window.location.pathname.startsWith('/admin')) return;

      // Cek apakah user adalah admin (jangan sentuh sesi admin)
      try {
        const { data: adminRow } = await client
          .from('admin_users')
          .select('id')
          .eq('email', user.email)
          .eq('is_active', true)
          .maybeSingle();

        if (adminRow) {
          // Akun admin, jangan kelola di sesi game pemain
          return;
        }
      } catch {}

      const isSyntheticPlayer = user.email?.endsWith('@player.astrosphere.app');
      const isGoogle = user.app_metadata?.provider === 'google' ||
                       user.identities?.some(i => i.provider === 'google') ||
                       !isSyntheticPlayer;

      if (isGoogle) {
        const syncRes = await syncGooglePlayerSession(user, {
          progress: store.progress,
          settings: store.settings,
          gameState: readGameState(),
        });

        if (syncRes.ok) {
          if (syncRes.mergedData) {
            applyMergedData(syncRes.mergedData);
          }
          Object.assign(store.account, {
            loggedIn: true,
            name: syncRes.displayName || syncRes.username,
            username: syncRes.username,
            userId: user.id,
            cloudSynced: true,
          });
          saveAccount();
          saveProgress();
          saveSettings();

          // Deteksi jika baru kembali dari redirect Google OAuth
          const isRedirectReturn = fromOAuth || 
            window.location.hash.includes('access_token') || 
            window.location.search.includes('code=');

          if (isRedirectReturn) {
            if (window.history?.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            store.settings.tutorialSeen = true;
            saveSettings();
            showToast(`Selamat datang, <b>${store.account.name.replace(/[<>&"]/g, '')}</b>!`, 3200);
            store.startFromSave = store.hasSave;
            store.phase = 'loading';
          }
        }
      } else {
        // Akun pemain sintetis biasa
        store.account.loggedIn = true;
        store.account.userId = user.id;
        store.account.cloudSynced = true;
        if (!store.account.name && user.user_metadata?.username) {
          store.account.name = user.user_metadata.username;
          store.account.username = user.user_metadata.username;
        }
      }
    }

    client.auth.getSession().then(({ data }) => {
      if (data?.session?.user && !authHandled) {
        authHandled = true;
        handleUserSession(data.session.user);
      }
    }).catch(() => {});

    client.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        authHandled = true;
        handleUserSession(session.user, event === 'SIGNED_IN');
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
  const p = store.progress, s = SHIPS[id];
  if (!s || p.owned.includes(id)) return { ok: true, already: true };
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
export function recordPrediction(key, pick) {
  const p = store.progress, q = PREDICT[key];
  if (!q) return { ok: false, reward: 0 };
  const ok = pick === q.a, first = !p.predict[key];
  p.predict[key] = { pick, ok };
  let reward = 0;
  if (first && ok) {
    reward = PREDICT_REWARD;
    addPoints(reward);
    p.ledger.push({ id: `tebak-${key}-${Date.now()}`, type: 'tebak', key, delta: reward, at: new Date().toISOString() });
  }
  saveProgress();
  return { ok, reward };
}

/** Satu jawaban Mitos/Fakta. Bintang hanya saat pernyataan itu pertama kali dijawab benar. */
export function recordMyth(id, ok) {
  const p = store.progress;
  if (!ok || p.myths[id]) return 0;
  p.myths[id] = true;
  addPoints(MYTH_REWARD);
  saveProgress();
  return MYTH_REWARD;
}

/** Kartu "Tahukah kamu?" dibuka: +bintang hanya pertama kali. */
export function openCard(id) {
  const p = store.progress;
  if (!FACTS[id] || p.cards[id]) return 0;
  p.cards[id] = true;
  addPoints(CARD_REWARD);
  p.ledger.push({ id: `kartu-${id}-${Date.now()}`, type: 'kartu', key: id, delta: CARD_REWARD, at: new Date().toISOString() });
  saveProgress();
  return CARD_REWARD;
}

/** Jumlah kartu benda yang sudah ditemukan tetapi belum dibaca (untuk lencana di menu). */
export function unreadCards() {
  return Object.keys(FACTS).filter((id) => isFound(id) && !store.progress.cards[id]).length;
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

function sanitizeToastHtml(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/<\s*(?:script|iframe|object|embed|style|form|input|button|meta|link)[^>]*>.*?<\s*\/\s*(?:script|iframe|object|embed|style|form|input|button|meta|link)\s*>/gi, '')
    .replace(/<\s*(?:script|iframe|object|embed|style|form|input|button|meta|link)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, '');
}

let toastT = 0;
export function showToast(html, ms = 3200) {
  store.toast.html = sanitizeToastHtml(html);
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
export function shouldShowGuide() {
  return !store.account.loggedIn && !store.hasSave && !store.settings.tutorialSeen;
}

export function useGame() { return { store, game, shouldShowGuide }; }

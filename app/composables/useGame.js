// State bersama UI ↔ mesin 3D + penyimpanan lokal (localStorage).
// Alur: splash (Beranda/Masuk/Daftar, tanpa WebGL) → guide (cara bermain + memuat dunia 3D) → playing ⇄ paused.
import { reactive, watch } from 'vue';
import { SHIPS } from '../data/ships.js';
import { QUIZ, POINTS_PER_QUESTION, QUIZ_VERSION } from '../data/quiz.js';
import { NAME_OF } from '../data/solarSystem.js';
import { sanitizeKeys } from '../data/keymap.js';
import { PREDICT, PREDICT_REWARD, MYTH_IDS, MYTH_REWARD, FACTS, CARD_REWARD } from '../data/learning.js';
import { EVENTS, EVENT_REWARD } from '../data/events.js';
import { MISSIONS, MISSION_REWARD } from '../data/missions.js';

const KEYS = { state: 'astrosphere.gameState', settings: 'astrosphere.settings', progress: 'astrosphere.progress', account: 'astrosphere.account', users: 'astrosphere.users' };
const ls = {
  read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
};

const touch = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches));
const DEFAULT_SETTINGS = { soundEnabled: true, hudOpacity: 1, sensitivity: 1, invertY: false, graphics: touch ? 'rendah' : 'tinggi', reduceMotion: false, tutorialSeen: false, events: true, keys: {} };
const DEFAULT_PROGRESS = { points: 0, earned: 0, best: {}, attempts: {}, owned: ['astra'], selectedShip: 'astra', ledger: [], quizVersion: QUIZ_VERSION, predict: {}, myths: {}, cards: {}, found: { matahari: true }, events: {}, missions: {} };

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
  if (p.best && typeof p.best === 'object') for (const [k, v] of Object.entries(p.best)) if (QUIZ[k] && Number.isFinite(v)) o.best[k] = Math.min(150, Math.max(0, v));
  if (p.attempts && typeof p.attempts === 'object') for (const [k, v] of Object.entries(p.attempts)) if (QUIZ[k] && Number.isFinite(v)) o.attempts[k] = v;
  if (Array.isArray(p.owned)) o.owned = [...new Set(['astra', ...p.owned.filter((id) => SHIPS[id])])];
  if (SHIPS[p.selectedShip] && o.owned.includes(p.selectedShip)) o.selectedShip = p.selectedShip;
  if (Array.isArray(p.ledger)) o.ledger = p.ledger.slice(-60);
  if (p.predict && typeof p.predict === 'object') for (const [k, v] of Object.entries(p.predict)) if (PREDICT[k] && v && Number.isInteger(v.pick)) o.predict[k] = { pick: v.pick, ok: !!v.ok };
  if (p.myths && typeof p.myths === 'object') for (const k of Object.keys(p.myths)) if (MYTH_IDS.has(k)) o.myths[k] = true;
  if (p.cards && typeof p.cards === 'object') for (const k of Object.keys(p.cards)) if (FACTS[k]) o.cards[k] = true;
  if (p.missions && typeof p.missions === 'object') for (const [k, v] of Object.entries(p.missions)) if (MISSIONS[k] && v && Number.isFinite(v.done)) o.missions[k] = { done: Math.max(0, Math.floor(v.done)), stars: Math.min(3, Math.max(0, Math.floor(v.stars || 0))) };
  if (p.events && typeof p.events === 'object') for (const [k, v] of Object.entries(p.events)) if (EVENTS[k] && Number.isFinite(v)) o.events[k] = Math.max(0, Math.floor(v));
  // benda yang pernah ditemukan (permanen, juga setelah "Mulai baru"); diisi pula dari progres lama
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
    target: { id: '', name: '—', dist: '—', eta: '—' }, near: { id: '', name: '—', dist: '—' },
    disc: '0/0', boundary: false,
  },
  autopilot: false,
  backTo: null,            // mode tujuan tombol Kembali (mis. Sejarah → Planet)
  capturing: false,        // Profil → Kontrol sedang merekam tombol baru
  approach: { show: false, id: '', name: '', kind: '', color: '', desc: '', pheno: '' },
  pheno: { on: false, id: '', playing: true, line1: '', line2: '', state: '' },
  // Misi kisah nyata (game/mission.js): langkah, posisi di lintasan (u), jam misi (jam), sumber daya
  mission: { id: 'apollo13', alt: 0, amd: 0, pred: 0, fixK: 0, step: 'brief', u: 0, clock: 0, dist: 0, o2: 100, power: 100, co2: 4, cold: false, blackout: false, note: '', firstTry: {}, stars: 0, reward: 0 },
  // Peristiwa antariksa (game/hazards.js): phase '' | 'warn' | 'active'; result = kartu hasil setelah peristiwa
  event: { kind: '', phase: '', left: 0, shelterName: '', safe: false, shield: 100, damaged: false, hits: 0, expo: 0, flash: 0, result: null },
  toast: { show: false, html: '' },
  msg: { show: false, text: '' },
  saved: { show: false, label: '' },
  look: { active: false },
  camMode: 'chase',
  settings: sanitizeSettings(ls.read(KEYS.settings)),
  progress: sanitizeProgress(ls.read(KEYS.progress)),
  account: (() => { const a = ls.read(KEYS.account); return { loggedIn: !!a?.loggedIn && typeof a.name === 'string' && !!a.name, name: typeof a?.name === 'string' ? a.name : '' }; })(),
  discovered: [],
  hasSave: false, saveMeta: '',
  // Mode Planet & Sejarah (waktu observasi bercabang dari waktu jelajah)
  focus: 'bumi',
  obs: { mul: 1, day: 0, date: '' },
  toggles: { orbit: true, axis: true, follow: false },
  sejarah: { body: 'mars', era: 'semua', selected: 'mar-1965' },
  // Fenomena Bumi (lab gerhana)
  lab: { type: 'matahari', pov: 'samping', t: 30, playing: true, speed: 1, volume: true, labels: true, status: 'none', covered: 0, caller: 'planet', dia: null, marks: [] },
  // Kuis
  quiz: { planet: 'bumi', stage: 'intro', index: 0, picked: null, answers: [], score: 0, reward: 0, prevBest: 0, kind: 'planet', mythStage: 'intro' },
  modal: null,             // null | settings | journal | confirmNew | controls
  journalId: null,         // Jurnal: benda yang kartunya sedang dibuka
  profileTab: 'kuis',
  hangarPreview: 'astra',
});

/** Sudah pernah ditemukan (dijelajahi)? Kuis, Mitos/Fakta, dan kartu planet baru terbuka setelah ini. */
export const isFound = (id) => !!store.progress.found[id] || store.discovered.includes(id);
if (typeof window !== 'undefined') watch(() => store.discovered, (ids) => {
  let changed = false;
  for (const id of ids) if (FACTS[id] && !store.progress.found[id]) { store.progress.found[id] = true; changed = true; }
  if (changed) saveProgress();
});
export function saveSettings() { ls.write(KEYS.settings, store.settings); }
export function saveProgress() { ls.write(KEYS.progress, store.progress); }
export function saveAccount() { ls.write(KEYS.account, store.account); }

// ---- Akun lokal: nama + kata sandi (disimpan di perangkat ini; kata sandi hanya berupa hash bergaram) ----
const nameKey = (n) => n.trim().replace(/\s+/g, ' ').toLowerCase();
async function hashPass(salt, pass) {
  const text = salt + ':' + pass;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return 's256:' + [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); } // cadangan bila konteks tidak aman (http)
  return 'fnv:' + (h >>> 0).toString(16);
}
export async function registerUser(name, pass) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length < 2) return { ok: false, err: 'Nama minimal 2 huruf.' };
  if (pass.length < 6) return { ok: false, err: 'Kata sandi minimal 6 karakter.' };
  const users = ls.read(KEYS.users) || {};
  if (users[nameKey(clean)]) return { ok: false, err: 'Nama ini sudah dipakai. Coba nama lain atau masuk.' };
  const salt = Math.random().toString(36).slice(2, 10);
  users[nameKey(clean)] = { name: clean, salt, hash: await hashPass(salt, pass), at: new Date().toISOString() };
  if (!ls.write(KEYS.users, users)) return { ok: false, err: 'Penyimpanan browser penuh atau diblokir.' };
  Object.assign(store.account, { loggedIn: true, name: clean }); saveAccount();
  return { ok: true };
}
export async function loginUser(name, pass) {
  const u = (ls.read(KEYS.users) || {})[nameKey(name)];
  if (!u) return { ok: false, err: 'Nama ini belum terdaftar di perangkat ini.', unknown: true };
  if (await hashPass(u.salt, pass) !== u.hash) return { ok: false, err: 'Kata sandi salah.' };
  Object.assign(store.account, { loggedIn: true, name: u.name }); saveAccount();
  return { ok: true };
}
export function logoutUser() { Object.assign(store.account, { loggedIn: false, name: '' }); saveAccount(); }
export function readGameState() {
  const s = ls.read(KEYS.state);
  if (!s || !s.position || !s.rotation) return null;
  const p = s.position, r = s.rotation;
  if (![p.x, p.y, p.z, r.x, r.y, r.z].every(Number.isFinite)) return null;
  return s;
}
export function writeGameState(data) { return ls.write(KEYS.state, data); }
export function wipeAll() { for (const k of Object.values(KEYS)) ls.remove(k); }
/** Ringkasan simpanan untuk tombol "Lanjutkan" — bisa dibaca sebelum dunia 3D dimuat. */
export function refreshSaveInfo() {
  const s = readGameState();
  store.hasSave = !!s;
  store.saveMeta = s ? [s.nearest && NAME_OF[s.nearest] ? 'Dekat ' + NAME_OF[s.nearest] : '', Array.isArray(s.discovered) ? s.discovered.length + ' penemuan' : ''].filter(Boolean).join(' · ') : '';
}
if (typeof window !== 'undefined') refreshSaveInfo();

// ---- Ekonomi poin (PRD §11.2) ----
export function submitQuiz(planet, score) {
  const p = store.progress;
  const prev = p.best[planet] ?? 0;
  const reward = Math.max(0, score - prev);
  p.attempts[planet] = (p.attempts[planet] || 0) + 1;
  if (score > prev) p.best[planet] = score;
  if (reward > 0) {
    p.points += reward; p.earned += reward;
    p.ledger.push({ id: `${planet}-${Date.now()}`, type: 'kuis', planet, attempt: p.attempts[planet], delta: reward, from: prev, to: score, at: new Date().toISOString() });
  }
  saveProgress();
  return { reward, prev };
}
export function unlockShip(id) {
  const p = store.progress, s = SHIPS[id];
  if (!s || p.owned.includes(id)) return { ok: true, already: true };
  if (p.points < s.price) return { ok: false, need: s.price - p.points };
  p.points -= s.price; p.owned.push(id);
  p.ledger.push({ id: `ship-${id}-${Date.now()}`, type: 'pesawat', ship: id, delta: -s.price, at: new Date().toISOString() });
  saveProgress();
  return { ok: true };
}
export const quizMax = () => POINTS_PER_QUESTION * 3;

// ---- Tebak dulu & Mitos atau Fakta (data/learning.js) ----
function addPoints(n) { store.progress.points += n; store.progress.earned += n; }
/** Simpan tebakan fenomena. Bintang hanya untuk tebakan pertama yang benar. */
export function recordPrediction(key, pick) {
  const p = store.progress, q = PREDICT[key]; if (!q) return { ok: false, reward: 0 };
  const ok = pick === q.a, first = !p.predict[key];
  p.predict[key] = { pick, ok };
  let reward = 0;
  if (first && ok) {
    reward = PREDICT_REWARD; addPoints(reward);
    p.ledger.push({ id: `tebak-${key}-${Date.now()}`, type: 'tebak', key, delta: reward, at: new Date().toISOString() });
  }
  saveProgress();
  return { ok, reward };
}
/** Satu jawaban Mitos/Fakta. Bintang hanya saat pernyataan itu pertama kali dijawab benar. */
export function recordMyth(id, ok) {
  const p = store.progress;
  if (!ok || p.myths[id]) return 0;
  p.myths[id] = true; addPoints(MYTH_REWARD); saveProgress();
  return MYTH_REWARD;
}
/** Kartu "Tahukah kamu?" dibuka: +bintang hanya pertama kali. */
export function openCard(id) {
  const p = store.progress;
  if (!FACTS[id] || p.cards[id]) return 0;
  p.cards[id] = true; addPoints(CARD_REWARD);
  p.ledger.push({ id: `kartu-${id}-${Date.now()}`, type: 'kartu', key: id, delta: CARD_REWARD, at: new Date().toISOString() });
  saveProgress();
  return CARD_REWARD;
}
/** Jumlah kartu benda yang sudah ditemukan tetapi belum dibaca (untuk lencana di menu). */
export function unreadCards() { return Object.keys(FACTS).filter((id) => isFound(id) && !store.progress.cards[id]).length; }
/** Misi selesai: +bintang hanya saat pertama kali tamat; bintang misi terbaik disimpan. */
export function rewardMission(id, stars) {
  if (!MISSIONS[id]) return 0;
  const p = store.progress, prev = p.missions[id] || { done: 0, stars: 0 };
  const reward = prev.done ? 0 : MISSION_REWARD;
  p.missions[id] = { done: prev.done + 1, stars: Math.max(prev.stars, stars) };
  if (reward) { addPoints(reward); p.ledger.push({ id: `misi-${id}-${Date.now()}`, type: 'misi', key: id, delta: reward, at: new Date().toISOString() }); }
  saveProgress();
  return reward;
}
/** Selamat dari peristiwa antariksa: +bintang setiap kali (peristiwa jarang terjadi). */
export function rewardEvent(kind) {
  if (!EVENTS[kind]) return 0;
  const p = store.progress;
  p.events[kind] = (p.events[kind] || 0) + 1; addPoints(EVENT_REWARD);
  p.ledger.push({ id: `peristiwa-${kind}-${Date.now()}`, type: 'peristiwa', key: kind, delta: EVENT_REWARD, at: new Date().toISOString() });
  saveProgress();
  return EVENT_REWARD;
}
export function logMythRound(correct, total, gained) {
  if (gained <= 0) return;
  store.progress.ledger.push({ id: `mitos-${Date.now()}`, type: 'mitos', correct, total, delta: gained, at: new Date().toISOString() });
  saveProgress();
}
let toastT = 0;
export function showToast(html, ms = 3200) { store.toast.html = html; store.toast.show = true; clearTimeout(toastT); toastT = setTimeout(() => { store.toast.show = false; }, ms); }

let engineRef = null;
export const setEngine = (e) => { engineRef = e; };
export const game = () => engineRef;
export function useGame() { return { store, game }; }

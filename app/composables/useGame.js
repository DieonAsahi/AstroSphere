// State bersama UI ↔ mesin 3D + penyimpanan lokal (localStorage).
// Mesin Three.js menulis telemetri HUD ke `store`; komponen Vue membaca & memanggil API mesin lewat `game()`.
import { reactive } from 'vue';
import { SHIPS } from '../data/ships.js';
import { QUIZ, POINTS_PER_QUESTION, QUIZ_VERSION } from '../data/quiz.js';

const KEYS = { state: 'astrosphere.gameState', settings: 'astrosphere.settings', progress: 'astrosphere.progress', account: 'astrosphere.account' };
const ls = {
  read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch { return null; } },
  write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
};

const touch = typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches));
const DEFAULT_SETTINGS = { soundEnabled: true, hudOpacity: .85, sensitivity: 1, invertY: false, graphics: touch ? 'rendah' : 'tinggi', reduceMotion: false, tutorialSeen: false };
const DEFAULT_PROGRESS = { points: 0, earned: 0, best: {}, attempts: {}, owned: ['astra'], selectedShip: 'astra', ledger: [], quizVersion: QUIZ_VERSION };

function sanitizeSettings(s) {
  const o = { ...DEFAULT_SETTINGS };
  if (!s || typeof s !== 'object') return o;
  for (const k of ['soundEnabled', 'invertY', 'reduceMotion', 'tutorialSeen']) if (typeof s[k] === 'boolean') o[k] = s[k];
  if (Number.isFinite(s.hudOpacity)) o.hudOpacity = Math.min(1, Math.max(.2, s.hudOpacity));
  if (Number.isFinite(s.sensitivity)) o.sensitivity = Math.min(2.5, Math.max(.3, s.sensitivity));
  if (s.graphics === 'tinggi' || s.graphics === 'rendah') o.graphics = s.graphics;
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
  return o;
}

export const store = reactive({
  touch,
  phase: 'loading',        // loading | menu | playing | paused
  intro: false,            // adegan pembuka lubang hitam: false | 'hold' | 'fly'
  mode: 'jelajah',         // jelajah | planet | sejarah | fenomena | kuis | hanggar | peta | profil
  loading: { p: 0, text: 'Menyiapkan mesin grafis…', error: '' },
  hudOff: false,
  hud: {
    hdg: '000°', pit: '+00°', speed: '0', thrTxt: 'Dorongan 0%', thrLeft: 23, thrWidth: 0, boost: false, limited: false,
    target: { id: '', name: '—', dist: '—', eta: '—' }, near: { name: '—', kind: '—', dist: '—', alt: '—' },
    x: '0', y: '0', z: '0', disc: '0/0', boundary: false, simDate: '',
  },
  banner: { show: false, kick: '', title: '', kind: '', desc: '' },
  toast: { show: false, html: '' },
  msg: { show: false, text: '' },
  saved: { show: false, label: '' },
  look: { active: false, info: '' },
  camMode: 'chase',
  settings: sanitizeSettings(ls.read(KEYS.settings)),
  progress: sanitizeProgress(ls.read(KEYS.progress)),
  account: Object.assign({ loggedIn: false, name: '', email: '' }, ls.read(KEYS.account) || {}),
  discovered: [],
  hasSave: false, saveMeta: '',
  // Mode Planet & Sejarah (waktu observasi bercabang dari waktu jelajah)
  focus: 'bumi',
  obs: { mul: 1, day: 0, date: '' },
  toggles: { orbit: true, axis: true, autoCam: false, follow: false },
  sejarah: { body: 'mars', era: 'semua', selected: 'mar-1965' },
  // Fenomena
  lab: { type: 'matahari', pov: 'samping', t: 30, playing: true, speed: 1, volume: true, labels: true, status: 'none', covered: 0, caller: null },
  // Kuis
  quiz: { planet: 'bumi', stage: 'intro', index: 0, picked: null, answers: [], score: 0, reward: 0, prevBest: 0 },
  modal: null,             // null | login | register | settings | controls | journal | confirmNew
  profileTab: 'kuis',
  hangarPreview: 'astra',
});

export function saveSettings() { ls.write(KEYS.settings, store.settings); }
export function saveProgress() { ls.write(KEYS.progress, store.progress); }
export function saveAccount() { ls.write(KEYS.account, store.account); }
export function readGameState() {
  const s = ls.read(KEYS.state);
  if (!s || !s.position || !s.rotation) return null;
  const p = s.position, r = s.rotation;
  if (![p.x, p.y, p.z, r.x, r.y, r.z].every(Number.isFinite)) return null;
  return s;
}
export function writeGameState(data) { return ls.write(KEYS.state, data); }
export function wipeAll() { for (const k of Object.values(KEYS)) ls.remove(k); }

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

let engineRef = null;
export const setEngine = (e) => { engineRef = e; };
export const game = () => engineRef;
export function useGame() { return { store, game }; }

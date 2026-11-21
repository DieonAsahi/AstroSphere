// Pemetaan tombol keyboard (KeyboardEvent.code). Tombol pertama tiap aksi bisa diubah di Profil → Kontrol.
// Kursor/mouse TIDAK mengemudikan pesawat; seret mouse hanya untuk melihat sekeliling.
export const ACTIONS = [
  { id: 'forward', label: 'Maju', sub: 'Tambah kecepatan', keys: ['KeyW', 'Enter'] },
  { id: 'back', label: 'Mundur', sub: 'Kurangi kecepatan', keys: ['KeyS'] },
  { id: 'left', label: 'Geser kiri', sub: 'Bergeser ke samping', keys: ['KeyA'] },
  { id: 'right', label: 'Geser kanan', sub: 'Bergeser ke samping', keys: ['KeyD'] },
  { id: 'turnL', label: 'Putar kiri', sub: 'Belok ke kiri', keys: ['KeyQ', 'ArrowLeft'] },
  { id: 'turnR', label: 'Putar kanan', sub: 'Belok ke kanan', keys: ['KeyE', 'ArrowRight'] },
  { id: 'up', label: 'Naik', sub: 'Hidung pesawat ke atas', keys: ['ArrowUp'] },
  { id: 'down', label: 'Turun', sub: 'Hidung pesawat ke bawah', keys: ['ArrowDown'] },
  { id: 'turbo', label: 'Turbo', sub: 'Tahan untuk melesat', keys: ['ShiftLeft', 'ShiftRight'] },
  { id: 'brake', label: 'Rem', sub: 'Tahan untuk melambat', keys: ['ControlLeft', 'ControlRight'] },
  { id: 'stop', label: 'Berhenti', sub: 'Langsung diam', keys: ['Space'] },
  { id: 'map', label: 'Peta', sub: 'Pilih tujuan', keys: ['KeyM'] },
];
export const ACTION_IDS = ACTIONS.map((a) => a.id);
const RESERVED = ['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'AltLeft', 'AltRight', 'F5', 'F11', 'F12'];
export const canBind = (code) => !!code && !RESERVED.includes(code);

/** Gabungkan pemetaan bawaan dengan ubahan pemain (hanya tombol pertama yang diganti). */
export function resolveKeymap(custom) {
  const out = {};
  for (const a of ACTIONS) {
    const keys = [...a.keys];
    const c = custom && custom[a.id];
    if (typeof c === 'string' && canBind(c)) {
      // tombol kembar kiri/kanan (Shift/Ctrl) ikut diganti seluruhnya
      if (/(Left|Right)$/.test(keys[0]) && keys[1] && /(Left|Right)$/.test(keys[1]) && keys[0].replace(/(Left|Right)$/, '') === keys[1].replace(/(Left|Right)$/, '')) keys.splice(0, 2, c);
      else keys[0] = c;
    }
    out[a.id] = [...new Set(keys)];
  }
  return out;
}
export function sanitizeKeys(k) {
  const o = {};
  if (k && typeof k === 'object') for (const id of ACTION_IDS) if (typeof k[id] === 'string' && canBind(k[id])) o[id] = k[id];
  return o;
}

const NAMES = { Space: 'Spasi', Enter: 'Enter', Escape: 'Esc', Backspace: '⌫', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', CapsLock: 'Caps', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\' };
export function keyLabel(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Num ' + code.slice(6);
  return code;
}
/** Label unik untuk daftar tombol satu aksi (Shift kiri+kanan → satu "Shift"). */
export const keyLabels = (codes) => [...new Set((codes || []).map(keyLabel))];

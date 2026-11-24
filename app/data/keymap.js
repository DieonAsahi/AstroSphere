// Pemetaan tombol keyboard (KeyboardEvent.code). Tombol pertama tiap aksi bisa diubah di Profil → Kontrol.
// Kursor/mouse TIDAK mengemudikan pesawat; seret mouse hanya untuk melihat sekeliling.
export const ACTIONS = [
  { id: 'up', label: 'Hidung Naik (Pitch Up)', sub: 'Arahkan moncong ke atas', keys: ['KeyW', 'ArrowUp'] },
  { id: 'down', label: 'Hidung Turun (Pitch Down)', sub: 'Arahkan moncong ke bawah', keys: ['KeyS', 'ArrowDown'] },
  { id: 'left', label: 'Belok Kiri (Yaw)', sub: 'Arahkan moncong ke kiri (tanpa geser samping)', keys: ['KeyA', 'ArrowLeft'] },
  { id: 'right', label: 'Belok Kanan (Yaw)', sub: 'Arahkan moncong ke kanan (tanpa geser samping)', keys: ['KeyD', 'ArrowRight'] },
  { id: 'forward', label: 'Maju / Tambah Gas', sub: 'Tarik tuas dorong ke atas', keys: ['Enter', 'NumpadEnter', 'KeyE'] },
  { id: 'back', label: 'Mundur / Kurangi Gas', sub: 'Tarik tuas dorong ke bawah', keys: ['KeyQ'] },
  { id: 'turnL', label: 'Putar Kiri', sub: 'Arahkan moncong ke kiri', keys: ['KeyA', 'ArrowLeft'] },
  { id: 'turnR', label: 'Putar Kanan', sub: 'Arahkan moncong ke kanan', keys: ['KeyD', 'ArrowRight'] },
  { id: 'turbo', label: 'Turbo', sub: 'Tahan untuk melesat cepat', keys: ['AltLeft', 'AltRight'] },
  { id: 'brake', label: 'Rem', sub: 'Tahan untuk melambat', keys: ['ControlLeft', 'ControlRight', 'KeyQ'] },
  { id: 'stop', label: 'Berhenti', sub: 'Langsung diam di tempat', keys: ['Space'] },
  { id: 'map', label: 'Peta', sub: 'Pilih tujuan penjelajahan', keys: ['KeyM'] },
  { id: 'cam', label: 'Ganti Sudut Pandang Kamera', sub: 'Beralih antara Kamera Belakang dan Kokpit Pengemudi', keys: ['KeyV'] },
  { id: 'target', label: 'Ganti Target Tujuan', sub: 'Arahkan kompas target ke planet atau destinasi berikutnya', keys: ['KeyT'] },
];
export const ACTION_IDS = ACTIONS.map((a) => a.id);
const RESERVED = ['Escape', 'Tab', 'MetaLeft', 'MetaRight', 'F5', 'F11', 'F12'];
export const canBind = (code) => !!code && !RESERVED.includes(code);

/** Gabungkan pemetaan bawaan dengan ubahan pemain (hanya tombol pertama yang diganti). */
export function resolveKeymap(custom) {
  const out = {};
  for (const a of ACTIONS) {
    const keys = [...a.keys];
    const c = custom && custom[a.id];
    if (typeof c === 'string' && canBind(c)) {
      // tombol kembar kiri/kanan (Shift/Ctrl/Alt) ikut diganti seluruhnya
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
  ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt', CapsLock: 'Caps', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\' };
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

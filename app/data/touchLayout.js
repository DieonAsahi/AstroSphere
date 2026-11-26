// Konfigurasi & sanitasi tata letak HUD kontrol sentuh per akun (disimpan lokal + sinkronisasi awan).
// Posisi x dan y dinyatakan dalam persentase viewport (titik tengah elemen) agar adaptif di berbagai ukuran layar.

export const TOUCH_SCALE_MIN = 0.75;
export const TOUCH_SCALE_MAX = 1.35;

export const TOUCH_ELEMENTS = [
  { id: 'stick', label: 'Kemudi Analog', shortLabel: 'Kemudi', defaultX: 14, defaultY: 74, defaultScale: 1 },
  { id: 'throttle', label: 'Tuas Kecepatan', shortLabel: 'Kecepatan', defaultX: 89, defaultY: 74, defaultScale: 1 },
  { id: 'rollLeft', label: 'Guling Kiri', shortLabel: 'Guling Kiri', defaultX: 74, defaultY: 82, defaultScale: 1 },
  { id: 'rollRight', label: 'Guling Kanan', shortLabel: 'Guling Kanan', defaultX: 74, defaultY: 60, defaultScale: 1 },
  { id: 'pause', label: 'Tombol Jeda', shortLabel: 'Jeda', defaultX: 6, defaultY: 36, defaultScale: 1 },
];

export const TOUCH_ELEMENT_IDS = TOUCH_ELEMENTS.map((e) => e.id);

export function defaultTouchLayout() {
  const out = {};
  for (const el of TOUCH_ELEMENTS) {
    out[el.id] = {
      x: el.defaultX,
      y: el.defaultY,
      scale: el.defaultScale,
      hidden: false,
    };
  }
  return out;
}

const clampNum = (v, min, max, fallback) => (
  Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback
);

export function sanitizeTouchLayout(raw) {
  const base = defaultTouchLayout();
  if (!raw || typeof raw !== 'object') return base;
  for (const el of TOUCH_ELEMENTS) {
    const src = raw[el.id];
    if (!src || typeof src !== 'object') continue;
    base[el.id] = {
      x: Math.round(clampNum(src.x, 4, 96, el.defaultX) * 10) / 10,
      y: Math.round(clampNum(src.y, 6, 94, el.defaultY) * 10) / 10,
      scale: Math.round(clampNum(src.scale, TOUCH_SCALE_MIN, TOUCH_SCALE_MAX, el.defaultScale) * 100) / 100,
      hidden: Boolean(src.hidden),
    };
  }
  return base;
}

/** Menghasilkan gaya CSS penempatan terpusat untuk elemen HUD sentuh maupun editor tata letak. */
export function touchItemStyle(cfg) {
  const x = clampNum(cfg?.x, 4, 96, 50);
  const y = clampNum(cfg?.y, 6, 94, 50);
  const scale = clampNum(cfg?.scale, TOUCH_SCALE_MIN, TOUCH_SCALE_MAX, 1);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: `translate(-50%, -50%) scale(${scale})`,
  };
}

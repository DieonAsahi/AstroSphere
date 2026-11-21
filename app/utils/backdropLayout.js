// Tata letak latar layar awal dalam "koordinat gambar" 1920×1080 — dipakai bersama oleh WebGL (liveBackdrop.js)
// dan oleh scripts/render-backdrops.mjs (gambar statis), supaya keduanya sama persis.

/** Pemetaan "cover" seperti CSS background-size: cover → [skala, offsetX, offsetY] dalam px kanvas. */
export function coverMap(W, H, alignBottom = false) {
  const s = Math.max(W / 1920, H / 1080);
  return [s, (W - 1920 * s) / 2, alignBottom ? H - 1080 * s : (H - 1080 * s) / 2];
}
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Setengah lebar bagian gambar yang terlihat (px gambar) untuk rasio layar W/H. */
const halfVisible = (W, H) => Math.min(960, 540 * W / H);

/** Matahari: lanskap = piringan besar di kanan-bawah; potret = busur dari kanan ke bawah. */
export function sunLayout(W, H) {
  const hw = halfVisible(W, H), t = smooth(.75, 1.3, W / H);
  const r = Math.min(2.8 * hw, 900);
  const P = { cx: 960 + .55 * r, cy: 1080 + .15 * r, r };
  return { cx: lerp(P.cx, 1500, t), cy: lerp(P.cy, 1150, t), r: lerp(P.r, 780, t) };
}
/** Lubang hitam: di tengah, bayangan cukup besar agar busur piringan muncul di atas & bawah kartu formulir. */
export function holeLayout(W, H) {
  const hw = halfVisible(W, H), t = smooth(.75, 1.3, W / H);
  return { cx: 960, cy: lerp(470, 540, t), s: lerp(.8 * hw, 250, t), rout: 9 };
}
/** Pita lintang tekstur Bumi (utara di atas): +62° … −62°. */
export const EARTH_LAT = [62 * Math.PI / 180, -62 * Math.PI / 180];
/** Kecepatan putar Bumi di beranda: satu putaran per 3 menit. */
export const EARTH_SPIN = 2 * Math.PI / 180;

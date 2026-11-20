// Utilitas matematika & format angka (bahasa Indonesia)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const dead = (v, dz) => (Math.abs(v) < dz ? 0 : Math.sign(v) * (Math.abs(v) - dz) / (1 - dz));
export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
export const DEG = Math.PI / 180;
export const TAU = Math.PI * 2;

// 1 satuan dunia ≈ 398 km → radius Bumi = 16 satuan (6.371 km). Ukuran planet berskala nyata relatif satu sama lain;
// jarak antarplanet dipadatkan (diberi label di UI).
export const KM = 6371.0084 / 16;

export const isTouchDevice = () => typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && matchMedia('(hover: none)').matches));

const nf0 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtInt = (n) => nf0.format(Math.round(n));
export const fmtDist = (u) => { const km = Math.max(0, u) * KM; return km >= 1e6 ? nf1.format(km / 1e6) + ' jt km' : nf0.format(km) + ' km'; };
export const fmtEta = (s) => { if (!isFinite(s) || s <= 0 || s > 5999) return '—'; const m = Math.floor(s / 60); return m + ':' + String(Math.floor(s % 60)).padStart(2, '0'); };
export const fmtCoord = (u) => nf0.format(Math.round(u * KM));
export const fmtDate = (iso) => { try { return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
export const fmtDay = (d) => nf1.format(d);

// Hari sejak epoch J2000 (1 Jan 2000 12:00 TT ≈ UTC) untuk tanggal sekarang — titik awal waktu simulasi.
export const daysSinceJ2000 = (date = new Date()) => (date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000;
// Tanggal kalender dari hari simulasi
export const dateFromDays = (d) => new Date(Date.UTC(2000, 0, 1, 12) + d * 86400000);
export const fmtSimDate = (d) => { try { return dateFromDays(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } };

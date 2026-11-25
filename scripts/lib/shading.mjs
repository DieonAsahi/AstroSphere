// Fungsi bayangan (shading) untuk scripts/lib/raster.mjs: planet, cincin, awan, pesawat.
import { v3, hex } from './raster.mjs';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Planet: tekstur + terminator lembut + sisi malam gelap + pendar atmosfer di tepi siang. */
export function planetShade(L, { atm = null, atmK = .9, gain = 1.15, night = .012 } = {}) {
  const A = atm ? hex(atm) : null;
  return (c) => {
    const n = c.n, d = v3.dot(n, L);
    const lit = sm(-.12, .35, d) * (.25 + .75 * Math.max(0, d));
    const t = c.tex;
    const out = [t[0] * (lit * gain + night), t[1] * (lit * gain + night), t[2] * (lit * gain + night), 1];
    if (A) {
      const mu = Math.max(0, v3.dot(n, c.v)), rim = Math.pow(1 - mu, 3.5) * sm(-.25, .45, d) * atmK;
      out[0] += A[0] * rim; out[1] += A[1] * rim; out[2] += A[2] * rim;
    }
    return out;
  };
}
/** Cincin & awan (BLEND): alfa dari tekstur × faktor material, diterangi Matahari dua sisi. */
export function layerShade(L, { gain = 1 } = {}) {
  return (c) => {
    const t = c.tex, f = c.prim.mat.bcf;
    const lit = .35 + .65 * Math.abs(v3.dot(c.n, L));
    const a = Math.min(1, t[3] * f[3]);
    return [t[0] * f[0] * lit * gain, t[1] * f[1] * lit * gain, t[2] * f[2] * lit * gain, a];
  };
}
/** Pesawat: tekstur × faktor, cahaya utama + isi kebiruan + ambien langit/tanah + kilap + cahaya tepi berwarna. */
export function shipShade(L, { key = '#fff4e6', fill = '#4a6cff', rim = '#ffb25a', rimK = .7, engine = null, keyK = 1.5, fillK = .35 } = {}) {
  const K = hex(key), F = hex(fill), R = hex(rim), E = engine ? hex(engine) : null;
  const LF = v3.norm([-L[0], .3, -L[2]]);
  return (c) => {
    let n = c.n;
    if (v3.dot(n, c.v) < 0) n = [-n[0], -n[1], -n[2]];
    const t = c.tex, f = c.prim.mat.bcf;
    if (c.prim.role === 'glow' && E) return [E[0] * 4, E[1] * 4, E[2] * 4, 1];
    const base = [t[0] * f[0], t[1] * f[1], t[2] * f[2]];
    const d = Math.max(0, v3.dot(n, L)), df = Math.max(0, v3.dot(n, LF));
    const sky = .5 + .5 * n[1];
    const amb = .05 + .07 * sky;
    const h = v3.norm(v3.add(L, c.v)), sp = Math.pow(Math.max(0, v3.dot(n, h)), 40) * (c.prim.mat.rough < .6 ? .9 : .35);
    const mu = Math.max(0, v3.dot(n, c.v)), rm = Math.pow(1 - mu, 3) * rimK;
    const out = [0, 0, 0, 1];
    for (let i = 0; i < 3; i++) out[i] = base[i] * (d * K[i] * keyK + df * F[i] * fillK + amb) + sp * K[i] + rm * R[i] * (.4 + .6 * base[i] * 3);
    return out;
  };
}

// Perender perangkat lunak kecil (Node, tanpa GPU/browser) untuk membuat gambar statis dari model GLB game:
// rasterisasi segitiga + z-buffer, koreksi perspektif, tekstur bilinear, supersampling, lalu dikomposisi dengan sharp.
// Dipakai oleh scripts/render-guide.mjs (gambar slide panduan) — bukan bagian dari bundel game.
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

/* ---------- warna ---------- */
const S2L = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; S2L[i] = c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
export const srgb2lin = (c) => S2L[c];
export const lin2srgb = (x) => { x = x <= 0 ? 0 : x >= 1 ? 1 : x; return Math.round(255 * (x <= .0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - .055)); };
export const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [S2L[(n >> 16) & 255], S2L[(n >> 8) & 255], S2L[n & 255]]; };

/* ---------- vektor/matriks ---------- */
export const v3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  len: (a) => Math.hypot(a[0], a[1], a[2]),
};
/** Matriks 4×4 kolom-mayor dari posisi, rotasi Euler (urutan YXZ, radian), skala seragam. */
export function trs(pos = [0, 0, 0], rot = [0, 0, 0], s = 1) {
  const [x, y, z] = rot;
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y), cz = Math.cos(z), sz = Math.sin(z);
  // R = Ry * Rx * Rz
  const m00 = cy * cz + sy * sx * sz, m01 = -cy * sz + sy * sx * cz, m02 = sy * cx;
  const m10 = cx * sz, m11 = cx * cz, m12 = -sx;
  const m20 = -sy * cz + cy * sx * sz, m21 = sy * sz + cy * sx * cz, m22 = cy * cx;
  return [m00 * s, m10 * s, m20 * s, 0, m01 * s, m11 * s, m21 * s, 0, m02 * s, m12 * s, m22 * s, 0, pos[0], pos[1], pos[2], 1];
}
/** Perkalian matriks 4×4 kolom-mayor: a·b (b diterapkan lebih dulu). */
export function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
export const rx = (t) => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; };
export const ry = (t) => { const c = Math.cos(t), s = Math.sin(t); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
export const rz = (t) => { const c = Math.cos(t), s = Math.sin(t); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
/** T · S · R1 · R2 · … (rotasi paling kanan diterapkan pertama, dalam ruang lokal). */
export function place(pos, s, ...rots) {
  let m = [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, pos[0], pos[1], pos[2], 1];
  for (const r of rots) m = mul(m, r);
  return m;
}
/** Arah lokal planet dari lintang/bujur (derajat): utara +Y, bujur 0° → +X, timur → −Z (sama dengan game). */
export const latLon = (lat, lon) => { const a = lat * Math.PI / 180, b = lon * Math.PI / 180; return [Math.cos(a) * Math.cos(b), Math.sin(a), -Math.cos(a) * Math.sin(b)]; };
/** Sudut putar Y agar bujur `lon` menghadap +Z (ke kamera). */
export const faceLon = (lon) => -Math.PI / 2 - lon * Math.PI / 180;
export const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
export const xd = (m, d) => [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];

/* ---------- derau & latar ---------- */
const h2 = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
  const a = h2(xi, yi, s), b = h2(xi + 1, yi, s), c = h2(xi, yi + 1, s), d = h2(xi + 1, yi + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
export function fbm(x, y, oct = 5, s = 0) { let a = .5, t = 0; for (let i = 0; i < oct; i++) { t += a * vnoise(x, y, s + i * 17); x = x * 2.03 + 5.3; y = y * 2.03 + 1.7; a *= .5; } return t; }

/**
 * Latar angkasa: gradasi gelap + nebula fbm dua warna + bintang. Linear RGB Float32 (W×H×3).
 */
export function spaceBackground(W, H, { seed = 1, a = '#1b2a6b', b = '#5a1f63', nebula = .55, stars = 1, center = [.5, .5], base = '#050816' } = {}) {
  const out = new Float32Array(W * H * 3);
  const A = hex(a), B = hex(b), BG = hex(base);
  const sc = 2.6 / W;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x * sc, v = y * sc;
    const n = fbm(u * 1.3 + seed, v * 1.3 - seed, 5, seed);
    const m = fbm(u * 2.1 - seed * 2, v * 2.1 + 3, 4, seed + 7);
    const dx = x / W - center[0], dy = (y / H - center[1]) * H / W;
    const vig = Math.exp(-(dx * dx + dy * dy) * 3.2);
    const cloud = Math.max(0, n - .42) * 2.2 * nebula * (.45 + .75 * vig);
    const mix = Math.min(1, Math.max(0, m * 1.6 - .3));
    const i = (y * W + x) * 3;
    for (let c = 0; c < 3; c++) out[i + c] = BG[c] * (.6 + .6 * vig) + cloud * cloud * (A[c] * (1 - mix) + B[c] * mix) * 1.4;
  }
  // bintang
  let s = (seed * 9973) >>> 0 || 1; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const n = Math.round(W * H / 900 * stars);
  for (let k = 0; k < n; k++) {
    const x = r() * W, y = r() * H, br = Math.pow(r(), 6) * 1.6 + .04, warm = r();
    const tint = warm < .2 ? [1, .85, .7] : warm > .8 ? [.75, .85, 1] : [1, 1, 1];
    const rad = br > .6 ? 1.6 : 1;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
      const px = Math.floor(x) + ox, py = Math.floor(y) + oy; if (px < 0 || py < 0 || px >= W || py >= H) continue;
      const d2 = (px + .5 - x) ** 2 + (py + .5 - y) ** 2, f = Math.exp(-d2 / (.35 * rad * rad)) * br;
      const i = (py * W + px) * 3; out[i] += f * tint[0]; out[i + 1] += f * tint[1]; out[i + 2] += f * tint[2];
    }
  }
  return out;
}

/* ---------- model ---------- */
const texCache = new Map();
async function decodeTexture(tex) {
  if (!tex) return null;
  if (texCache.has(tex)) return texCache.get(tex);
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, lin = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { lin[i * 4] = S2L[data[i * 4]]; lin[i * 4 + 1] = S2L[data[i * 4 + 1]]; lin[i * 4 + 2] = S2L[data[i * 4 + 2]]; lin[i * 4 + 3] = data[i * 4 + 3] / 255; }
  const t = { w, h, d: lin };
  texCache.set(tex, t); return t;
}
export function sampleTex(t, u, v, out) {
  u = u - Math.floor(u); v = v - Math.floor(v);
  const x = u * t.w - .5, y = v * t.h - .5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const X0 = (x0 % t.w + t.w) % t.w, X1 = (X0 + 1) % t.w, Y0 = Math.min(t.h - 1, Math.max(0, y0)), Y1 = Math.min(t.h - 1, Math.max(0, y0 + 1));
  const d = t.d, a = (Y0 * t.w + X0) * 4, b = (Y0 * t.w + X1) * 4, c = (Y1 * t.w + X0) * 4, e = (Y1 * t.w + X1) * 4;
  for (let k = 0; k < 4; k++) out[k] = (d[a + k] * (1 - fx) + d[b + k] * fx) * (1 - fy) + (d[c + k] * (1 - fx) + d[e + k] * fx) * fy;
  return out;
}
/** Muat GLB → daftar primitif dalam ruang model (transform node sudah dipanggang). */
export async function loadModel(file) {
  const doc = await io.read(file);
  const root = doc.getRoot(), scene = root.listScenes()[0];
  const top = scene.listChildren()[0];
  const extras = top?.getExtras() || {};
  const prims = [], nodes = [];
  for (const n of root.listNodes()) {
    const role = n.getExtras()?.role || '';
    const W = n.getWorldMatrix();
    if (!n.getMesh()) { nodes.push({ name: n.getName(), role, pos: xf(W, [0, 0, 0]) }); continue; }
    for (const p of n.getMesh().listPrimitives()) {
      const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), T = p.getAttribute('TEXCOORD_0'), I = p.getIndices();
      const cnt = P.getCount(), pos = new Float32Array(cnt * 3), nrm = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2);
      const e = [0, 0, 0];
      for (let i = 0; i < cnt; i++) {
        P.getElement(i, e); const w = xf(W, e); pos.set(w, i * 3);
        if (N) { N.getElement(i, e); const d = v3.norm(xd(W, e)); nrm.set(d, i * 3); }
        if (T) { T.getElement(i, e); uv[i * 2] = e[0]; uv[i * 2 + 1] = e[1]; }
      }
      const idx = I ? Uint32Array.from(I.getArray()) : Uint32Array.from({ length: cnt }, (_, i) => i);
      const m = p.getMaterial();
      prims.push({
        role, name: n.getName(), pos, nrm, uv, idx, hasN: !!N,
        mat: {
          name: m?.getName() || '', tex: await decodeTexture(m?.getBaseColorTexture()), bcf: m?.getBaseColorFactor() || [1, 1, 1, 1],
          blend: m?.getAlphaMode() === 'BLEND', mask: m?.getAlphaMode() === 'MASK', metal: m?.getMetallicFactor() ?? 0, rough: m?.getRoughnessFactor() ?? 1,
        },
      });
    }
  }
  return { file, extras, prims, nodes };
}

/* ---------- kamera ---------- */
export function camera({ pos, target, up = [0, 1, 0], fov = 40, W, H, shift = [0, 0] }) {
  const f = v3.norm(v3.sub(target, pos)), r = v3.norm(v3.cross(f, up)), u = v3.cross(r, f);
  const foc = (H / 2) / Math.tan(fov * Math.PI / 360);
  const cx = W / 2 + shift[0] * W, cy = H / 2 + shift[1] * H;
  return {
    pos, W, H, foc, cx, cy,
    view(p) { const d = v3.sub(p, pos); return [v3.dot(d, r), v3.dot(d, u), -v3.dot(d, f)]; },
    project(p) { const v = this.view(p); const z = -v[2]; return [cx + v[0] / z * foc, cy - v[1] / z * foc, z]; },
    /** proyeksi bola → lingkaran layar (perkiraan) */
    sphere(c, rad) { const [x, y, z] = this.project(c); return { x, y, r: rad / Math.sqrt(Math.max(1e-6, z * z - rad * rad)) * foc }; },
    scaled(k) { return camera({ pos, target, up, fov, W: W * k, H: H * k, shift }); },
  };
}

/* ---------- rasterisasi ---------- */
export function target(W, H) {
  return { W, H, c: new Float32Array(W * H * 3), a: new Float32Array(W * H), z: new Float32Array(W * H).fill(Infinity) };
}
const tmp = [0, 0, 0, 0];
/**
 * Gambar satu instans model.
 * @param shade (ctx) => [r,g,b,a] — ctx: { n, v, p (dunia), uv, prim, tex(rgba) }
 */
export function draw(rt, cam, model, M, shade, { pass = 'opaque', filter = () => true } = {}) {
  const { W, H } = rt;
  for (const prim of model.prims) {
    if (!filter(prim)) continue;
    const isBlend = prim.mat.blend;
    if ((pass === 'opaque') === isBlend) continue;
    const cnt = prim.pos.length / 3;
    const sx = new Float32Array(cnt), sy = new Float32Array(cnt), iz = new Float32Array(cnt), wp = new Float32Array(cnt * 3), wn = new Float32Array(cnt * 3);
    const ok = new Uint8Array(cnt);
    for (let i = 0; i < cnt; i++) {
      const p = xf(M, [prim.pos[i * 3], prim.pos[i * 3 + 1], prim.pos[i * 3 + 2]]);
      const n = v3.norm(xd(M, [prim.nrm[i * 3], prim.nrm[i * 3 + 1], prim.nrm[i * 3 + 2]]));
      wp.set(p, i * 3); wn.set(n, i * 3);
      const v = cam.view(p), z = -v[2];
      if (z < .05) continue;
      ok[i] = 1; iz[i] = 1 / z; sx[i] = cam.cx + v[0] / z * cam.foc; sy[i] = cam.cy - v[1] / z * cam.foc;
    }
    const idx = prim.idx, ctx = { n: [0, 0, 0], v: [0, 0, 0], p: [0, 0, 0], uv: [0, 0], prim, tex: [1, 1, 1, 1] };
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      if (!ok[a] || !ok[b] || !ok[c]) continue;
      const area = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sx[c] - sx[a]) * (sy[b] - sy[a]);
      if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(sx[a], sx[b], sx[c]))), maxX = Math.min(W - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
      const minY = Math.max(0, Math.floor(Math.min(sy[a], sy[b], sy[c]))), maxY = Math.min(H - 1, Math.ceil(Math.max(sy[a], sy[b], sy[c])));
      if (minX > maxX || minY > maxY) continue;
      const ia = 1 / area;
      for (let y = minY; y <= maxY; y++) {
        const py = y + .5;
        for (let x = minX; x <= maxX; x++) {
          const px = x + .5;
          const w0 = ((sx[b] - px) * (sy[c] - py) - (sx[c] - px) * (sy[b] - py)) * ia;
          const w1 = ((sx[c] - px) * (sy[a] - py) - (sx[a] - px) * (sy[c] - py)) * ia;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const q0 = w0 * iz[a], q1 = w1 * iz[b], q2 = w2 * iz[c], qs = q0 + q1 + q2, z = 1 / qs;
          const k = y * W + x;
          if (z >= rt.z[k]) continue;
          const b0 = q0 / qs, b1 = q1 / qs, b2 = q2 / qs;
          for (let j = 0; j < 3; j++) {
            ctx.p[j] = wp[a * 3 + j] * b0 + wp[b * 3 + j] * b1 + wp[c * 3 + j] * b2;
            ctx.n[j] = wn[a * 3 + j] * b0 + wn[b * 3 + j] * b1 + wn[c * 3 + j] * b2;
          }
          const nl = Math.hypot(ctx.n[0], ctx.n[1], ctx.n[2]) || 1; ctx.n[0] /= nl; ctx.n[1] /= nl; ctx.n[2] /= nl;
          const vx = cam.pos[0] - ctx.p[0], vy = cam.pos[1] - ctx.p[1], vz = cam.pos[2] - ctx.p[2], vl = Math.hypot(vx, vy, vz) || 1;
          ctx.v[0] = vx / vl; ctx.v[1] = vy / vl; ctx.v[2] = vz / vl;
          ctx.uv[0] = prim.uv[a * 2] * b0 + prim.uv[b * 2] * b1 + prim.uv[c * 2] * b2;
          ctx.uv[1] = prim.uv[a * 2 + 1] * b0 + prim.uv[b * 2 + 1] * b1 + prim.uv[c * 2 + 1] * b2;
          if (prim.mat.tex) { sampleTex(prim.mat.tex, ctx.uv[0], ctx.uv[1], tmp); ctx.tex[0] = tmp[0]; ctx.tex[1] = tmp[1]; ctx.tex[2] = tmp[2]; ctx.tex[3] = tmp[3]; }
          else { ctx.tex[0] = ctx.tex[1] = ctx.tex[2] = ctx.tex[3] = 1; }
          const col = shade(ctx);
          if (!col) continue;
          const al = col[3] ?? 1;
          if (pass === 'opaque') {
            if (prim.mat.mask && al < .5) continue;
            rt.z[k] = z; rt.c[k * 3] = col[0]; rt.c[k * 3 + 1] = col[1]; rt.c[k * 3 + 2] = col[2]; rt.a[k] = 1;
          } else {
            rt.c[k * 3] = col[0] * al + rt.c[k * 3] * (1 - al);
            rt.c[k * 3 + 1] = col[1] * al + rt.c[k * 3 + 1] * (1 - al);
            rt.c[k * 3 + 2] = col[2] * al + rt.c[k * 3 + 2] * (1 - al);
            rt.a[k] = al + rt.a[k] * (1 - al);
          }
        }
      }
    }
  }
}
/** Perkecil hasil supersampling (rata-rata k×k), warna premultiplied. */
export function downsample(rt, k) {
  const W = rt.W / k, H = rt.H / k, c = new Float32Array(W * H * 3), a = new Float32Array(W * H), inv = 1 / (k * k);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let r = 0, g = 0, b = 0, al = 0;
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) {
      const s = (y * k + j) * rt.W + x * k + i; const aa = rt.a[s];
      r += rt.c[s * 3] * aa; g += rt.c[s * 3 + 1] * aa; b += rt.c[s * 3 + 2] * aa; al += aa;
    }
    const d = y * W + x; c[d * 3] = r * inv; c[d * 3 + 1] = g * inv; c[d * 3 + 2] = b * inv; a[d] = al * inv;
  }
  return { W, H, c, a };
}
/** Tumpuk lapisan (premultiplied) di atas latar linear. */
export function over(bg, layer) {
  const n = layer.W * layer.H;
  for (let i = 0; i < n; i++) { const a = layer.a[i]; for (let c = 0; c < 3; c++) bg[i * 3 + c] = layer.c[i * 3 + c] + bg[i * 3 + c] * (1 - a); }
  return bg;
}
/** Tambahkan pendar radial (aditif) — untuk Matahari, mesin, kilatan. */
export function glow(bg, W, H, x, y, r, col, k = 1, falloff = 2, mask = null, maskK = 0) {
  const C = typeof col === 'string' ? hex(col) : col;
  const R = r * Math.pow(Math.log(Math.max(2, k * 2000)), 1 / falloff) + 1, x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(W - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(H - 1, Math.ceil(y + R));
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const d = Math.hypot(px + .5 - x, py + .5 - y) / r;
    const f = k * Math.exp(-Math.pow(d, falloff));
    if (f < 1e-4) continue;
    const m = mask ? 1 - mask[py * W + px] * maskK : 1;
    const i = (py * W + px) * 3; bg[i] += C[0] * f * m; bg[i + 1] += C[1] * f * m; bg[i + 2] += C[2] * f * m;
  }
}
/** Gambar SVG (dirender sharp/librsvg) lalu tumpuk ke buffer linear dengan alfa — untuk lapisan di BAWAH objek 3D. */
export async function svgInto(bg, W, H, svg) {
  const { data } = await sharp(Buffer.from(svg)).resize(W, H).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < W * H; i++) {
    const a = data[i * 4 + 3] / 255; if (!a) continue;
    for (let c = 0; c < 3; c++) bg[i * 3 + c] = S2L[data[i * 4 + c]] * a + bg[i * 3 + c] * (1 - a);
  }
  return bg;
}
/** Linear → PNG/WebP dengan pemetaan nada lembut, lalu tumpuk SVG di atasnya. */
export async function exportImage(bg, W, H, file, { svg = null, quality = 82, exposure = 1 } = {}) {
  const px = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) {
    let x = bg[i] * exposure;
    x = x / (1 + Math.max(0, x - .8) * .9); // bahu lembut agar sorotan tidak terpotong kasar
    px[i] = lin2srgb(x);
  }
  let img = sharp(px, { raw: { width: W, height: H, channels: 3 } });
  if (svg) img = sharp(await img.png().toBuffer()).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]);
  await img.webp({ quality, effort: 5 }).toFile(file);
}

/** Halo atmosfer mengikuti siluet lapisan 3D yang sebenarnya (alfa diburamkan, hanya di luar objek). */
export function halo(bg, layer, color, radius, k = 1) {
  const { W, H } = layer, C = typeof color === 'string' ? hex(color) : color;
  let a = Float32Array.from(layer.a), t = new Float32Array(W * H);
  const r = Math.max(1, Math.round(radius / 1.7));
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * W + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) { t[y * W + x] = s / (2 * r + 1); s += a[y * W + Math.min(W - 1, x + r + 1)] - a[y * W + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) { a[y * W + x] = s / (2 * r + 1); s += t[Math.min(H - 1, y + r + 1) * W + x] - t[Math.max(0, y - r) * W + x]; } }
  }
  for (let i = 0; i < W * H; i++) { const f = a[i] * (1 - layer.a[i]) * k * 2; if (f <= 0) continue; bg[i * 3] += C[0] * f; bg[i * 3 + 1] += C[1] * f; bg[i * 3 + 2] += C[2] * f; }
}

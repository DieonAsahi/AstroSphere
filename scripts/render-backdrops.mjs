// Aset latar layar awal (Beranda = Bumi, Masuk = Matahari, Daftar = lubang hitam).
// Layar awal menggambar latar secara hidup dengan WebGL ringan (app/utils/liveBackdrop.js). File ini membuat:
//   - public/img/earth-band-{4k,2k}.webp : tekstur Bumi (pita lintang ±62°, utara di atas) untuk Bumi yang berputar
//   - public/img/bg-{earth,sun,blackhole}.webp : frame pertama yang sama, sebagai gambar instan & cadangan tanpa WebGL
// Fungsi piksel di bawah adalah padanan JS dari shader di app/utils/backdropShaders.js (rumus harus dijaga sama).
//   node scripts/render-backdrops.mjs                 (semua)
//   node scripts/render-backdrops.mjs earth sun       (sebagian; "band" = hanya tekstur Bumi)
//   node scripts/render-backdrops.mjs preview <earth|sun|blackhole> <W> <H> <detik> <keluaran.png>   (cek komposisi/animasi)
// Tekstur Bumi diambil dari model sumber "3D Planet/earth.glb" (Akshat, CC BY 4.0 — lihat app/data/credits.js).
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { noiseRGBA } from '../app/utils/noise.js';
import { coverMap, sunLayout, holeLayout, EARTH_LAT, EARTH_SPIN } from '../app/utils/backdropLayout.js';

const OUT_W = 1920, OUT_H = 1080, SS = 1.5;

// ---------- util (meniru GLSL) ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const fract = (x) => x - Math.floor(x);
const sstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const aces = (x) => clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0, 1);
const g8 = (c) => Math.round(clamp(c, 0, 1) * 255);
const toneAces = (r, g, b) => [g8(Math.pow(aces(r), 1 / 2.2)), g8(Math.pow(aces(g), 1 / 2.2)), g8(Math.pow(aces(b), 1 / 2.2))];
const toneExp = (r, g, b) => [g8(Math.pow(1 - Math.exp(-Math.max(0, r)), 1 / 2.2)), g8(Math.pow(1 - Math.exp(-Math.max(0, g)), 1 / 2.2)), g8(Math.pow(1 - Math.exp(-Math.max(0, b)), 1 / 2.2))];
function hash12(x, y) {
  let a = fract(x * .1031), b = fract(y * .1031), c = fract(x * .1031);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d;
  return fract((a + b) * c);
}
function hash22(x, y) {
  let a = fract(x * .1031), b = fract(y * .1030), c = fract(x * .0973);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33); a += d; b += d; c += d;
  return [fract((a + b) * c), fract((a + c) * b)];
}
function stars(px, py) {
  const gx = px / 1080 * 200, gy = py / 1080 * 200, ix = Math.floor(gx), iy = Math.floor(gy);
  if (hash12(ix, iy) > .05) return 0;
  const o = hash22(ix + 7.7, iy + 7.7), dx = gx - (ix + .2 + .6 * o[0]), dy = gy - (iy + .2 + .6 * o[1]);
  return (Math.pow(hash12(ix + 3.1, iy + 3.1), 5) * 1.3 + .1) * Math.exp(-(dx * dx + dy * dy) * 60);
}
// derau dari tekstur yang sama dengan WebGL (bilinear + REPEAT)
const NZ = noiseRGBA();
const texel = (ix, iy, c) => NZ[(((iy & 255) * 256) + (ix & 255)) * 4 + c];
function n3(x, y, z) {
  const px = Math.floor(x), py = Math.floor(y), pz = Math.floor(z);
  let fx = x - px, fy = y - py, fz = z - pz;
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const ux = px + 37 * pz + fx, uy = py + 17 * pz + fy, ix = Math.floor(ux), iy = Math.floor(uy), ax = ux - ix, ay = uy - iy;
  const bil = (c) => mix(mix(texel(ix, iy, c), texel(ix + 1, iy, c), ax), mix(texel(ix, iy + 1, c), texel(ix + 1, iy + 1, c), ax), ay) / 255;
  return mix(bil(0), bil(1), fz);
}
function fbm(x, y, z) { let s = 0, a = .5; for (let i = 0; i < 5; i++) { s += a * n3(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1; a *= .5; } return s; }
function fbm3(x, y, z) { let s = 0, a = .5; for (let i = 0; i < 3; i++) { s += a * n3(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; z = z * 2.03 + 3.1; a *= .5; } return s / .875; }

// ---------- Bumi ----------
function sampleBand(t, u, v) { // REPEAT di u, CLAMP di v, bilinear (pusat texel seperti GL)
  const fx = fract(u) * t.w - .5, fy = clamp(v, 0, 1) * t.h - .5, x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
  const X = (x) => ((x % t.w) + t.w) % t.w, Y = (y) => clamp(y, 0, t.h - 1);
  const o = (xx, yy, k) => t.d[(Y(yy) * t.w + X(xx)) * t.c + k] / 255;
  const s = (k) => mix(mix(o(x0, y0, k), o(x0 + 1, y0, k), ax), mix(o(x0, y0 + 1, k), o(x0 + 1, y0 + 1, k), ax), ay);
  return [Math.pow(s(0), 2.2), Math.pow(s(1), 2.2), Math.pow(s(2), 2.2)];
}
const LE = norm3(.62, .55, .38), K = 1140 / 1500, V0 = [0, K, Math.sqrt(1 - K * K)], RIGHT = [1, 0, 0], UPE = cross3(V0, RIGHT);
const la0 = -3 * Math.PI / 180, lo0 = 116 * Math.PI / 180;
const P0 = [Math.cos(la0) * Math.cos(lo0), Math.sin(la0), -Math.cos(la0) * Math.sin(lo0)];
const N0 = [-Math.sin(la0) * Math.cos(lo0), Math.cos(la0), Math.sin(la0) * Math.sin(lo0)];
const E0 = [-Math.sin(lo0), 0, -Math.cos(lo0)];
/** Mengembalikan [r,g,b,alpha] tanpa tone-map untuk cakram Bumi (alpha 0 = di luar cakram). */
function earthDisk(x, y, tex, rot) {
  const nx = (x - 960) / 1500, ny = (2120 - y) / 1500, rr = nx * nx + ny * ny;
  if (rr >= 1) return null;
  const nz = Math.sqrt(1 - rr), n = [nx, ny, nz];
  const a = dot3(n, V0), b = dot3(n, UPE), c = dot3(n, RIGHT);
  const q = [a * P0[0] + b * N0[0] + c * E0[0], a * P0[1] + b * N0[1] + c * E0[1], a * P0[2] + b * N0[2] + c * E0[2]];
  const lat = Math.asin(clamp(q[1], -1, 1)), lon = Math.atan2(-q[2], q[0]) - rot;
  const [tr, tg, tb] = sampleBand(tex, lon / (2 * Math.PI) + .5, (EARTH_LAT[0] - lat) / (EARTH_LAT[0] - EARTH_LAT[1]));
  const ndl = dot3(n, LE), day = sstep(-.12, .35, ndl);
  const ocean = clamp((tb - Math.max(tr, tg) * .9) * 4, 0, 1) * (1 - clamp((tr + tg + tb) / 3 - .6, 0, 1) * 3);
  const Hh = norm3(LE[0], LE[1], LE[2] + 1), spec = Math.pow(Math.max(0, dot3(n, Hh)), 70) * ocean * 1.4 * day;
  const fres = Math.pow(1 - nz, 3), lit = 1.05 * day * Math.max(0, ndl * .7 + .3);
  let cr = tr * (.03 + lit), cg = tg * (.035 + lit), cb = tb * (.06 + lit);
  const haze = fres * (.25 + .75 * day), dusk = Math.exp(-((ndl - .02) ** 2) * 60) * .25;
  cr = cr * (1 - haze * .6) + haze * .25 + dusk * .9 + spec * .9;
  cg = cg * (1 - haze * .6) + haze * .55 + dusk * .45 + spec * .9;
  cb = cb * (1 - haze * .6) + haze * 1.1 + dusk * .2 + spec * .85;
  return [cr, cg, cb, 1 - sstep(.996, 1, Math.sqrt(rr))];
}
function earthPixel(x, y, tex, t) {
  const nx = (x - 960) / 1500, ny = (2120 - y) / 1500, rr = nx * nx + ny * ny;
  let r = .008, g = .012, b = .032;
  const vy = y / OUT_H; r += .006 * (1 - vy); g += .01 * (1 - vy); b += .03 * (1 - vy);
  const st = stars(x, y) * sstep(.75, .45, vy) * 1.2;
  r += st * .9; g += st * .93; b += st;
  const d = Math.max(0, Math.sqrt(rr) - 1), nn = norm3(nx, ny, 0);
  const sun = clamp(dot3(nn, LE) * 1.1 + .25, 0, 1), glow = Math.exp(-d * 95) * 1.6 + Math.exp(-d * 18) * .35;
  r += glow * sun * .28; g += glow * sun * .55; b += glow * sun * 1.05;
  const e = earthDisk(x, y, tex, t * EARTH_SPIN);
  if (!e) return toneAces(r, g, b);
  return toneAces(mix(r, e[0], e[3]), mix(g, e[1], e[3]), mix(b, e[2], e[3]));
}

// ---------- Matahari ----------
function worley(x, y, t) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy; let d1 = 8, d2 = 8, h1 = 0;
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    const h = hash22(ix + a, iy + b), ox = .5 + .38 * Math.sin(t + 6.2831853 * h[0]), oy = .5 + .38 * Math.sin(t + 6.2831853 * h[1]);
    const rx = a + ox - fx, ry = b + oy - fy, d = rx * rx + ry * ry;
    if (d < d1) { d2 = d1; d1 = d; h1 = h[0]; } else if (d < d2) d2 = d;
  }
  return [Math.sqrt(d1), Math.sqrt(d2), h1];
}
const spot = (qx, qy, cx, cy, r, clat) => Math.hypot((qx - cx) * clat, qy - cy) / r;
function sunSurface(dx, dy, rad, t) {
  const mu = Math.sqrt(Math.max(0, 1 - rad * rad));
  const lat = Math.asin(clamp(dy, -1, 1)), lon = Math.atan2(dx, Math.max(mu, 1e-4)) + t * .002, clat = Math.cos(lat);
  const w = worley(lon * 44 * clat, lat * 44, t * .35), gran = sstep(0, .5, w[1] - w[0]) * (.7 + .3 * w[2]);
  const warp = fbm3(lon * 4, lat * 4, 1 + t * .008);
  const meso = fbm3(lon * 10 + warp * 1.6, lat * 10 + warp * 1.6, t * .012);
  const s1 = spot(lon, lat, -.367, .582, .034, clat), s2 = spot(lon, lat, -.30, .565, .017, clat);
  const um = Math.max(1 - sstep(.35, .55, s1), 1 - sstep(.35, .55, s2)), pe = Math.max(1 - sstep(.85, 1.12, s1), 1 - sstep(.85, 1.12, s2));
  const fac = sstep(.52, .72, meso) * Math.pow(1 - mu, 1.4) * .5;
  const k = Math.pow(mu, .7), lim = .68 + .56 * mu;
  let I = (.9 + .16 * gran) * (.62 + .7 * meso) + fac; I *= (1 - .5 * pe) * (1 - .85 * um);
  return [mix(.42, 1.5, k) * lim * I, mix(.075, .48, k) * lim * I, mix(.01, .07, k) * lim * I];
}
function prom(dx, dy, a0, sz, t) {
  const fx = Math.cos(a0), fy = Math.sin(a0), rx = dx - fx, ry = dy - fy;
  let qx = (rx * -fy + ry * fx) / sz, qy = (rx * fx + ry * fy) / sz;
  if (qy < -.3 || qy > 1.8 || Math.abs(qx) > 1.9) return 0;
  const ox = n3(qx * 3, qy * 3, t * .08), oy = n3(qx * 3 + 7, qy * 3 + 7, t * .08);
  qx += (ox - .5) * .35; qy += (oy - .5) * .35;
  const arch = Math.abs(Math.hypot(qx, qy + .25) - .95);
  const dens = Math.exp(-arch * arch / .012) * sstep(-.05, .12, qy);
  const fil = .55 + .45 * n3(Math.atan2(qy + .25, qx) * 9, Math.hypot(qx, qy) * 22, t * .25);
  return dens * fil;
}
function sunOuter(dx, dy, rad, t) {
  const h = rad - 1, ang = Math.atan2(dy, dx);
  const streak = .55 + .45 * fbm3(Math.cos(ang) * 3 + 10, Math.sin(ang) * 3, h * .6 - t * .015);
  const cor = Math.exp(-h * 18) * .7 + Math.exp(-h * 6) * .22 * streak + Math.exp(-h * 2.2) * .025;
  const chH = .006 + .010 * n3(ang * 260, h * 40, t * .6), ch = 1 - sstep(chH * .6, chH, h);
  const pr = prom(dx, dy, 1.2566, .10, t) + prom(dx, dy, 1.7104, .16, t) * 1.2 + prom(dx, dy, 2.2340, .12, t) + prom(dx, dy, 2.7576, .13, t) * .9;
  return [cor + ch * 1.3 + pr * 2.2, cor * .36 + ch * .28 + pr * .45, cor * .07 + ch * .06 + pr * .08];
}
function sunPixel(x, y, L, t, e) {
  const dx = (x - L.cx) / L.r, dy = -(y - L.cy) / L.r, rad = Math.hypot(dx, dy);
  const st = stars(x, y) * sstep(1.9, 3.2, rad);
  let c;
  if (rad < 1 - e) c = sunSurface(dx, dy, rad, t);
  else if (rad > 1 + e) c = sunOuter(dx, dy, rad, t);
  else {
    const ux = dx / rad, uy = dy / rad, a = sunSurface(ux * (1 - e), uy * (1 - e), 1 - e, t), b = sunOuter(ux * (1 + e), uy * (1 + e), 1 + e, t), k = sstep(1 - e, 1 + e, rad);
    c = [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
  }
  return toneExp(.002 + st + c[0], .0015 + st * .95 + c[1], .005 + st * .9 + c[2]);
}

// ---------- Lubang hitam ----------
const RIN = 2.9;
function disk(hx, hz, hr, v, t, rout) {
  const ang = Math.atan2(hz, hx), tw = ang + 4.2 / Math.sqrt(hr) - t * .12, cx = Math.cos(tw), cz = Math.sin(tw);
  const n1 = fbm(cx * 2.2 + hr * .9, cz * 2.2, hr * .35);
  const n2 = fbm3(cx * 6 + hr * 3.1, cz * 6, hr * 1.7 + 4);
  const bands = .62 + .38 * Math.sin(hr * 4.1 + n1 * 9 + n2 * 5) * (.4 + .6 * n2);
  const temp = Math.pow(RIN / hr, .9);
  const vd = norm3(-hz, 0, hx), vn = norm3(-v[0], -v[1], -v[2]);
  const beam = Math.pow(clamp(1 + .6 * dot3(vd, vn), .2, 2), 3);
  const fade = sstep(RIN, RIN + .5, hr) * (1 - sstep(rout - 4.5, rout, hr));
  const I = (.3 + n1 * .9) * bands * temp * beam * fade * .85;
  const a = clamp(fade * (.35 + n1 * .75) * (.6 + .4 * temp), 0, .96), k = temp * temp;
  return [a, I * mix(1.1, 1.7, k), I * mix(.26, .75, k), I * mix(.012, .16, k)];
}
function bhPixel(x, y, L, t) {
  const D = 26, inc = .15708, cam = [0, Math.sin(inc) * D, -Math.cos(inc) * D];
  const fwd = norm3(-cam[0], -cam[1], -cam[2]), right = norm3(...cross3([0, 1, 0], fwd)), up = cross3(fwd, right);
  const sx = (x - L.cx) / L.s * .1004, sy = (L.cy - y) / L.s * .1004;
  let v = norm3(fwd[0] + right[0] * sx + up[0] * sy, fwd[1] + right[1] * sx + up[1] * sy, fwd[2] + right[2] * sx + up[2] * sy);
  let p = cam.slice();
  const RS = L.rout + 2;
  let r = 0, g = 0, b = 0, alpha = 1, captured = false;
  const bq = dot3(p, v), cq = dot3(p, p) - RS * RS, disc = bq * bq - cq;
  if (disc > 0) {
    const te = Math.max(-bq - Math.sqrt(disc), 0); p = [p[0] + v[0] * te, p[1] + v[1] * te, p[2] + v[2] * te];
    const hv = cross3(p, v), h2 = dot3(hv, hv);
    for (let i = 0; i < 160; i++) {
      const rl = Math.hypot(p[0], p[1], p[2]);
      if (rl < 1) { captured = true; break; }
      if (rl > RS + .5 && dot3(p, v) > 0) break;
      const dt = clamp(.07 * rl, .03, .45) * (rl > 6 ? 1 : .6), k = -1.5 * h2 / Math.pow(rl, 5) * dt;
      v = [v[0] + p[0] * k, v[1] + p[1] * k, v[2] + p[2] * k];
      const np = [p[0] + v[0] * dt, p[1] + v[1] * dt, p[2] + v[2] * dt];
      if ((p[1] > 0) !== (np[1] > 0)) {
        const tt = p[1] / (p[1] - np[1]), hx = mix(p[0], np[0], tt), hz = mix(p[2], np[2], tt), hr = Math.hypot(hx, hz);
        if (hr > RIN && hr < L.rout) { const c = disk(hx, hz, hr, v, t, L.rout); r += alpha * c[0] * c[1]; g += alpha * c[0] * c[2]; b += alpha * c[0] * c[3]; alpha *= 1 - c[0]; }
      }
      p = np;
      if (alpha < .02) break;
    }
  }
  if (!captured) { const st = stars(x, y) * .8; r += alpha * (.0015 + st * .95); g += alpha * (.0015 + st * .95); b += alpha * (.005 + st); }
  return toneExp(r, g, b);
}

// ---------- render paralel ----------
function pixelFn(job, W, H, t, tex) {
  const [s, ox, oy] = coverMap(W, H, job === 'earth');
  const L = job === 'sun' ? sunLayout(W, H) : job === 'blackhole' ? holeLayout(W, H) : null;
  const e = L ? 1.5 / (s * L.r || 1) : 0;
  return (px, py) => {
    const x = (px - ox) / s, y = (py - oy) / s;
    if (job === 'earth') return earthPixel(x, y, tex, t);
    if (job === 'sun') return sunPixel(x, y, L, t, e);
    return bhPixel(x, y, L, t);
  };
}

if (!isMainThread) {
  const { job, W, H, t, y0, y1, buf, tex } = workerData;
  const out = new Uint8Array(buf);
  const fn = pixelFn(job, W, H, t, tex ? { ...tex, d: new Uint8Array(tex.buf) } : null);
  for (let py = y0; py < y1; py++) for (let px = 0; px < W; px++) {
    const c = fn(px + .5, py + .5), o = (py * W + px) * 3;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
  }
  parentPort.postMessage('done');
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const require = createRequire(path.join(root, 'package.json'));
  const sharp = require('sharp');
  const outDir = path.join(root, 'public', 'img');
  fs.mkdirSync(outDir, { recursive: true });
  const args = process.argv.slice(2);

  // Tekstur Bumi: pita lintang ±62° dari tekstur sumber (sumber tersimpan "selatan di atas" → dibalik)
  async function earthBand() {
    const big = path.join(outDir, 'earth-band-4k.webp');
    if (!fs.existsSync(big) || args.includes('band')) {
      const { NodeIO } = require('@gltf-transform/core');
      const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
      const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(path.join(root, '3D Planet', 'earth.glb'));
      const img = Buffer.from(doc.getRoot().listTextures()[0].getImage());
      const meta = await sharp(img).metadata();
      const row = (lat) => (lat / Math.PI + .5) * meta.height;
      const top = Math.floor(row(EARTH_LAT[1])), bottom = Math.ceil(row(EARTH_LAT[0]));
      const band = sharp(img).extract({ left: 0, top, width: meta.width, height: bottom - top }).flip();
      await band.clone().resize(4096, 1024, { fit: 'fill', kernel: 'lanczos3' }).webp({ quality: 82, effort: 6 }).toFile(big);
      await band.clone().resize(2048, 512, { fit: 'fill', kernel: 'lanczos3' }).webp({ quality: 82, effort: 6 }).toFile(path.join(outDir, 'earth-band-2k.webp'));
      for (const f of ['earth-band-4k.webp', 'earth-band-2k.webp']) console.log(`${f}: ${(fs.statSync(path.join(outDir, f)).size / 1024).toFixed(0)} KB`);
    }
    const { data, info } = await sharp(big).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const sab = new SharedArrayBuffer(data.length); new Uint8Array(sab).set(data);
    return { w: info.width, h: info.height, c: info.channels, buf: sab };
  }
  async function render(job, W, H, t, tex) {
    const buf = new SharedArrayBuffer(W * H * 3), N = Math.max(2, os.cpus().length - 1);
    await Promise.all(Array.from({ length: N }, (_, i) => new Promise((res, rej) => {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { job, W, H, t, y0: Math.floor(H * i / N), y1: Math.floor(H * (i + 1) / N), buf, tex } });
      w.on('message', res); w.on('error', rej);
    })));
    return sharp(Buffer.from(buf), { raw: { width: W, height: H, channels: 3 } });
  }

  if (args[0] === 'preview') {
    const [, job, W, H, t, out] = args;
    const tex = job === 'earth' ? await earthBand() : null;
    const t0 = Date.now();
    await (await render(job, +W, +H, +t, tex)).png().toFile(out);
    console.log(`${job} ${W}×${H} t=${t}: ${((Date.now() - t0) / 1000).toFixed(1)} s → ${out}`);
  } else {
    const want = args.filter((a) => a !== 'band');
    const jobs = want.length ? want : args.includes('band') ? [] : ['earth', 'sun', 'blackhole'];
    const tex = jobs.includes('earth') || args.includes('band') ? await earthBand() : null;
    for (const job of jobs) {
      const t0 = Date.now(), file = path.join(outDir, `bg-${job}.webp`);
      const img = await render(job, Math.round(OUT_W * SS), Math.round(OUT_H * SS), 0, tex);
      await img.resize(OUT_W, OUT_H, { kernel: 'lanczos3' }).webp({ quality: 80, effort: 6 }).toFile(file);
      console.log(`${job}: ${(fs.statSync(file).size / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
  }
}

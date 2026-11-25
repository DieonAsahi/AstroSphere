// Gambar slide panduan (public/img/guide/*.webp, 1280×800) + latar statis halaman Daftar (public/img/bg-galaxy.webp).
// Semua objek 3D digambar dari model GLB game sendiri (planet & pesawat) dengan perender perangkat lunak di
// scripts/lib/raster.mjs — tanpa browser/GPU. Jalankan ulang:  node scripts/render-guide.mjs [nama ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import {
  loadModel, camera, target, draw, downsample, over, spaceBackground, glow, exportImage, svgInto, halo,
  v3, xf, xd, place, rx, ry, rz, latLon, faceLon, hex, fbm,
} from './lib/raster.mjs';
import { planetShade, layerShade, shipShade } from './lib/shading.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'img', 'guide');
fs.mkdirSync(OUT, { recursive: true });
const W = 1280, H = 800, SS = 2;
const FONT = "'Segoe UI', Arial, Helvetica, sans-serif";
const only = process.argv.slice(2);
const want = (n) => !only.length || only.includes(n);

const M = {};
for (const id of ['bumi', 'bulan', 'mars', 'jupiter', 'saturnus']) M[id] = await loadModel(path.join(ROOT, `public/models/planets/${id}.glb`));
for (const id of ['astra', 'orion', 'nova']) M[id] = await loadModel(path.join(ROOT, `public/models/ships/${id}.glb`));
const noPlume = (p) => p.role !== 'plumeMesh';
const noCloud = (p) => p.role !== 'cloud';

/* ---------- bantuan ---------- */
function render3d(cam, items) {
  const rt = target(W * SS, H * SS), cs = cam.scaled(SS);
  for (const it of items) draw(rt, cs, it.model, it.M, it.shade, { filter: it.filter || (() => true) });
  for (const it of items) if (it.blend) draw(rt, cs, it.model, it.M, it.blend, { pass: 'blend', filter: it.filter || (() => true) });
  return downsample(rt, SS);
}
const planet = (id, M_, L, o = {}) => ({ model: M[id], M: M_, shade: planetShade(L, o), blend: id === 'saturnus' ? layerShade(L) : null, filter: noCloud });
const ship = (id, M_, L, o = {}) => ({ model: M[id], M: M_, shade: shipShade(L, o), filter: noPlume });
/** Pendar mesin + jejak api (aditif) mengikuti arah belakang pesawat di layar. */
function engineFx(bg, cam, id, Mx, color, { power = 1, len = 2.4, size = 1, layer = null } = {}) {
  const C = hex(color), back = v3.norm(xd(Mx, [0, 0, 1]));
  // nosel menghadap menjauhi kamera → pendarnya tertutup badan pesawat (alfa lapisan 3D sebagai penutup)
  const away = layer ? Math.max(0, Math.min(1, -v3.dot(back, v3.norm(v3.sub(cam.pos, xf(Mx, [0, 0, 0])))) * 1.6 + .2)) : 0;
  const mk = layer ? layer.a : null;
  for (const n of M[id].nodes.filter((q) => q.role === 'engine')) {
    const p = xf(Mx, n.pos);
    const [x, y, z] = cam.project(p);
    const pxPerUnit = cam.foc / z;
    for (let i = 14; i >= 0; i--) {
      const t = i / 14, q = v3.add(p, v3.mul(back, t * len * power));
      const [qx, qy] = cam.project(q);
      const r = (.16 + .3 * t) * pxPerUnit * size;
      glow(bg, W, H, qx, qy, r, [C[0] * (1 - t * .3), C[1] * (1 - t * .6), C[2] * (1 - t * .8)], .16 * (1 - t) * power, 1.6, mk, away);
    }
    glow(bg, W, H, x, y, .55 * pxPerUnit * size, C, .9 * power, 1.8, mk, away);
    glow(bg, W, H, x, y, .22 * pxPerUnit * size, [1, .95, .85], 1.6 * power, 2, mk, away);
  }
}
/** Pendar tipis di tepi planet (atmosfer). */
function limbGlow(bg, cx, cy, R, color, width = .05, k = .8) {
  const C = hex(color), w = R * width, R2 = R + w * 5;
  const x0 = Math.max(0, Math.floor(cx - R2)), x1 = Math.min(W - 1, Math.ceil(cx + R2)), y0 = Math.max(0, Math.floor(cy - R2)), y1 = Math.min(H - 1, Math.ceil(cy + R2));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot(x + .5 - cx, y + .5 - cy) - R;
    if (d < -w * 1.5) continue;
    const f = k * (d < 0 ? Math.exp(-(d * d) / (w * w * .6)) * .5 : Math.exp(-d / w));
    const i = (y * W + x) * 3; bg[i] += C[0] * f; bg[i + 1] += C[1] * f; bg[i + 2] += C[2] * f;
  }
}
const svg = (body, defs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000" flood-opacity=".55"/></filter>
  <linearGradient id="key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26386e"/><stop offset="1" stop-color="#111c40"/></linearGradient>
  <linearGradient id="card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16224c" stop-opacity=".96"/><stop offset="1" stop-color="#0b1330" stop-opacity=".96"/></linearGradient>
  ${defs}
</defs>${body}</svg>`;
const keycap = (x, y, label, s = 76) => `<g filter="url(#shadow)">
  <rect x="${x - s / 2}" y="${y - s / 2 + 6}" width="${s}" height="${s}" rx="${s * .22}" fill="#070c20"/>
  <rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" rx="${s * .22}" fill="url(#key)" stroke="#8fb0ff" stroke-opacity=".55" stroke-width="2"/>
  <text x="${x}" y="${y + s * .17}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${s * .48}" fill="#ffffff">${label}</text></g>`;
const chip = (x, y, text, { color = '#93c5fd', bg = 'rgba(10,16,40,.78)', size = 22, icon = '' } = {}) => {
  const w = text.length * size * .58 + (icon ? size * 1.3 : 0) + size * 1.4;
  return `<g filter="url(#shadow)"><rect x="${x}" y="${y}" width="${w}" height="${size * 1.9}" rx="${size * .95}" fill="${bg}" stroke="${color}" stroke-opacity=".55" stroke-width="1.5"/>
  ${icon ? `<g transform="translate(${x + size * .75} ${y + size * .38}) scale(${size / 24})">${icon}</g>` : ''}
  <text x="${x + (icon ? size * 2.05 : size * .7)}" y="${y + size * 1.3}" font-family="${FONT}" font-weight="600" font-size="${size}" fill="${color}">${text}</text></g>`;
};
const STAR = (fill = '#facc15') => `<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z" fill="${fill}"/>`;
const starAt = (x, y, s, fill = '#facc15', op = 1) => `<g transform="translate(${x - s / 2} ${y - s / 2}) scale(${s / 24})" opacity="${op}">${STAR(fill)}</g>`;
const polyPath = (pts) => 'M' + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L');
function bez(p0, p1, p2, p3, n = 40) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([0, 1, 2].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]));
  }
  return out;
}
async function save(name, bg, over_ = null, under = null) {
  if (under) await svgInto(bg, W, H, under);
  await exportImage(bg, W, H, path.join(OUT, `${name}.webp`), { svg: over_ });
  console.log('✓', name);
}

/* ================= SLIDE 1 — EKSPLORASI ================= */
// 1-1 Navigasi 3D: pesawat melaju menuju Saturnus, radius observasi bergaris putus-putus di sekitar planet.
async function s1a() {
  const bg = spaceBackground(W, H, { seed: 11, a: '#1d3a8a', b: '#6b2f6b', nebula: .7, center: [.3, .3] });
  const cam = camera({ pos: [3.3, 2.9, 11.2], target: [-1.8, .4, -20], fov: 40, W, H });
  const L = v3.norm([.55, .6, .6]);
  const Ms = place([-11, 5.2, -52], 8.5, rx(.42), ry(.5), rz(-.3));
  const Ma = place([0, 0, 0], 1, ry(.16), rz(-.1), rx(.05));
  over(bg, render3d(cam, [planet('saturnus', Ms, L, { atm: '#f0d9a8', atmK: .35 }), ship('astra', Ma, L, { rim: '#7fb0ff' })]));
  engineFx(bg, cam, 'astra', Ma, '#ffb25a', { power: 1.1, len: 3.2 });
  const s = cam.sphere(xf(Ms, [0, 0, 0]), 8.5);
  const vp = cam.project([-30, 8, -400]);
  let streaks = '';
  let r = 7; const rnd = () => ((r = (Math.imul(r, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, r1 = 260 + rnd() * 380, r2 = r1 + 60 + rnd() * 160;
    const x1 = vp[0] + Math.cos(a) * r1, y1 = vp[1] + Math.sin(a) * r1 * .8, x2 = vp[0] + Math.cos(a) * r2, y2 = vp[1] + Math.sin(a) * r2 * .8;
    streaks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#cfe0ff" stroke-opacity="${(.1 + rnd() * .25).toFixed(2)}" stroke-width="${(1 + rnd() * 1.6).toFixed(1)}" stroke-linecap="round"/>`;
  }
  const R = s.r * 2.15;
  const o = svg(`${streaks}
    <g filter="url(#glow)">
      <circle cx="${s.x}" cy="${s.y}" r="${R}" fill="none" stroke="#5eead4" stroke-width="3" stroke-dasharray="14 12" stroke-opacity=".9"/>
      <circle cx="${s.x}" cy="${s.y}" r="${R + 14}" fill="none" stroke="#5eead4" stroke-width="1.2" stroke-opacity=".35"/>
    </g>
    ${[0, 1, 2].map((i) => { const a = -.45 + i * .16, x = s.x + Math.cos(Math.PI + a) * (R + 40), y = s.y + Math.sin(Math.PI + a) * (R + 40);
      return `<path d="M${x - 9},${y - 9} L${x + 3},${y} L${x - 9},${y + 9}" fill="none" stroke="#5eead4" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${.95 - i * .25}" transform="rotate(${(a * 180 / Math.PI).toFixed(1)} ${x} ${y})"/>`; }).join('')}`);
  await save('slide-1-1-navigasi', bg, o);
}

// 1-2 Peta sistem & autopilot: orbit miring, rute putus-putus Bumi → Mars, tombol M.
async function s1b() {
  const bg = spaceBackground(W, H, { seed: 21, a: '#143070', b: '#2a1a5a', nebula: .45 });
  const cam = camera({ pos: [0, 15.5, 10.5], target: [.6, 0, -.4], fov: 42, W, H });
  const orb = { merkurius: [2.0, 30], venus: [2.9, 165], bumi: [3.9, 112], mars: [5.1, 38], jupiter: [7.2, -28], saturnus: [9.3, 205] };
  const size = { merkurius: .2, venus: .3, bumi: .36, mars: .29, jupiter: .82, saturnus: .64 };
  const pos = (id) => { const [r, d] = orb[id], a = d * Math.PI / 180; return [r * Math.cos(a), 0, r * Math.sin(a)]; };
  const items = [];
  for (const id of ['bumi', 'mars', 'jupiter', 'saturnus']) {
    const p = pos(id), L = v3.norm(v3.mul(p, -1));
    items.push(planet(id, place(p, size[id], rx(id === 'saturnus' ? .45 : .2), ry(1.2)), L, { atm: id === 'bumi' ? '#6fb6ff' : null, night: .03 }));
  }
  // Merkurius & Venus: bola kecil dari model Bulan/Mars tidak cocok — cukup titik bercahaya
  const sun = cam.project([0, 0, 0]);
  glow(bg, W, H, sun[0], sun[1], 70, '#ff9b3d', 1.1, 1.4);
  glow(bg, W, H, sun[0], sun[1], 26, '#fff1cf', 3.2, 2);
  over(bg, render3d(cam, items));
  for (const id of ['merkurius', 'venus']) { const q = cam.project(pos(id)); glow(bg, W, H, q[0], q[1], id === 'venus' ? 9 : 6, id === 'venus' ? '#f2d6a0' : '#b8aea0', 1.6, 2); }
  const ell = (r) => polyPath(Array.from({ length: 97 }, (_, i) => { const a = i / 96 * Math.PI * 2; return cam.project([r * Math.cos(a), 0, r * Math.sin(a)]); })) + 'Z';
  const e = pos('bumi'), m = pos('mars');
  const route = bez(v3.add(e, [.35, 0, -.35]), [-.2, 0, 6.6], [5.4, 0, 6.2], v3.add(m, [-.3, 0, .38]), 60).map((p) => cam.project(p));
  const pm = cam.project(m), pe = cam.project(e);
  const end = route[route.length - 4], end2 = route[route.length - 1];
  const ang = Math.atan2(end2[1] - end[1], end2[0] - end[0]) * 180 / Math.PI;
  const mr = cam.sphere(m, .29).r + 16;
  const ship = route[14], ship2 = route[17], sa = Math.atan2(ship2[1] - ship[1], ship2[0] - ship[0]) * 180 / Math.PI;
  const o = svg(`
    <g fill="none" stroke="#9db5ff">
      ${['merkurius', 'venus', 'jupiter', 'saturnus'].map((id) => `<path d="${ell(orb[id][0])}" stroke-opacity=".18" stroke-width="1.5"/>`).join('')}
      <path d="${ell(orb.bumi[0])}" stroke="#6fb6ff" stroke-opacity=".45" stroke-width="2"/>
      <path d="${ell(orb.mars[0])}" stroke="#ff8a5c" stroke-opacity=".45" stroke-width="2"/>
    </g>
    <g filter="url(#glow)">
      <path d="${polyPath(route)}" fill="none" stroke="#5eead4" stroke-width="4" stroke-dasharray="16 12" stroke-linecap="round"/>
      <path d="M-14,-10 L4,0 L-14,10" transform="translate(${end2[0]} ${end2[1]}) rotate(${ang})" fill="none" stroke="#5eead4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <g transform="translate(${ship[0]} ${ship[1]}) rotate(${sa})"><path d="M14,0 L-10,-9 L-5,0 L-10,9 Z" fill="#ffffff"/></g>
    </g>
    <g stroke="#ffb27a" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#glow)">
      ${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `<path d="M${pm[0] + sx * mr},${pm[1] + sy * (mr - 12)} L${pm[0] + sx * mr},${pm[1] + sy * mr} L${pm[0] + sx * (mr - 12)},${pm[1] + sy * mr}"/>`).join('')}
    </g>
    <circle cx="${pe[0]}" cy="${pe[1]}" r="${cam.sphere(e, .36).r + 10}" fill="none" stroke="#6fb6ff" stroke-width="2" stroke-opacity=".7"/>
    ${keycap(92, 92, 'M')}`);
  await save('slide-1-2-peta', bg, o);
}

// 1-3 Kamera kokpit & bebas: layar terbelah — kiri pandangan kokpit, kanan pandangan luar; tombol V.
async function s1c() {
  const L = v3.norm([-.55, .35, .75]);
  // kiri: kokpit
  const bgA = spaceBackground(W, H, { seed: 31, a: '#173c8a', b: '#1d2a6a', nebula: .5, center: [.3, .5] });
  const camA = camera({ pos: [0, 0, 0], target: [0, 0, -10], fov: 50, W, H, shift: [-.21, 0] });
  const Me = place([.4, -1.7, -9.5], 3.1, rx(.35), ry(faceLon(110)));
  over(bgA, render3d(camA, [planet('bumi', Me, L, { atm: '#7cc0ff', atmK: 1.1 }), planet('bulan', place([-3.6, 1.7, -17], .85, ry(faceLon(0))), L)]));
  const se = camA.sphere(xf(Me, [0, 0, 0]), 3.1); limbGlow(bgA, se.x, se.y, se.r, '#5aa8ff', .035, .7);
  // kanan: pandangan luar (Orion dari belakang)
  const bgB = spaceBackground(W, H, { seed: 32, a: '#173c8a', b: '#4a1f66', nebula: .55, center: [.75, .5] });
  const camB = camera({ pos: [2.9, 2.6, 11.5], target: [0, .2, -6], fov: 42, W, H, shift: [.2, .06] });
  const Mo = place([0, 0, 0], 1, ry(-.22), rz(.14));
  const Me2 = place([1.5, 3.5, -40], 7.5, rx(.35), ry(faceLon(110)));
  over(bgB, render3d(camB, [planet('bumi', Me2, L, { atm: '#7cc0ff', atmK: 1.1 }), ship('astra', Mo, L, { rim: '#7fb0ff' })]));
  const se2 = camB.sphere(xf(Me2, [0, 0, 0]), 7.5); limbGlow(bgB, se2.x, se2.y, se2.r, '#5aa8ff', .035, .7);
  engineFx(bgB, camB, 'astra', Mo, '#ffb25a', { power: 1, len: 3 });
  // gabung diagonal
  const xb = (y) => 640 + (y - 400) * .2;
  for (let y = 0; y < H; y++) for (let x = Math.ceil(xb(y)); x < W; x++) { const i = (y * W + x) * 3; bgA[i] = bgB[i]; bgA[i + 1] = bgB[i + 1]; bgA[i + 2] = bgB[i + 2]; }
  const cx = 358, cy = 400;
  const o = svg(`
    <clipPath id="left"><path d="M0,0 L${xb(0)},0 L${xb(H)},${H} L0,${H} Z"/></clipPath>
    <g clip-path="url(#left)">
      <path d="M0,0 L${W},0 L${W},70 Q640,40 0,90 Z" fill="#0a0f22"/>
      <path d="M0,${H} L0,600 Q200,560 360,575 Q520,560 ${W},600 L${W},${H} Z" fill="#0b1128"/>
      <path d="M0,600 Q200,560 360,575 Q520,560 ${W},600" fill="none" stroke="#3b5bdb" stroke-opacity=".5" stroke-width="2"/>
      <path d="M0,90 L150,600 L110,600 L0,250 Z" fill="#0a0f22"/>
      ${[0, 1, 2].map((i) => `<circle cx="${190 + i * 120}" cy="690" r="34" fill="#0f1a3d" stroke="#5eead4" stroke-opacity=".55" stroke-width="2"/><path d="M${190 + i * 120 - 22},690 A22,22 0 0 1 ${190 + i * 120 + [10, 18, 4][i]},${690 - [20, 12, 22][i]}" fill="none" stroke="#5eead4" stroke-width="4" stroke-linecap="round"/>`).join('')}
      <g stroke="#5eead4" stroke-opacity=".85" fill="none" stroke-width="2.2" filter="url(#glow)">
        <circle cx="${cx}" cy="${cy}" r="34"/>
        <path d="M${cx - 70},${cy} L${cx - 44},${cy} M${cx + 44},${cy} L${cx + 70},${cy} M${cx},${cy - 70} L${cx},${cy - 44} M${cx},${cy + 44} L${cx},${cy + 70}"/>
        ${[-2, -1, 1, 2].map((k) => `<path d="M${cx - 120},${cy + k * 46} L${cx - 96},${cy + k * 46} M${cx + 96},${cy + k * 46} L${cx + 120},${cy + k * 46}" stroke-opacity=".45"/>`).join('')}
      </g>
    </g>
    <path d="M${xb(0)},0 L${xb(H)},${H}" stroke="#93c5fd" stroke-width="3" filter="url(#glow)"/>
    ${keycap(xb(400), 400, 'V', 84)}
    <g fill="none" stroke="#dbe7ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".9">
      <path d="M${xb(400) - 70},400 L${xb(400) - 100},400 M${xb(400) - 88},388 L${xb(400) - 100},400 L${xb(400) - 88},412"/>
      <path d="M${xb(400) + 70},400 L${xb(400) + 100},400 M${xb(400) + 88},388 L${xb(400) + 100},400 L${xb(400) + 88},412"/>
    </g>`);
  await save('slide-1-3-kamera', bgA, o);
}

/* ================= SLIDE 2 — SEJARAH & SAINS ================= */
// 2-1 Titik sejarah: Bumi dengan pin situs bersejarah (warna per zaman), Bulan & Mars dengan pin pendaratan, lini masa 6 zaman.
async function s2a() {
  const bg = spaceBackground(W, H, { seed: 41, a: '#123a7a', b: '#3a1d6b', nebula: .5, center: [.35, .45] });
  const cam = camera({ pos: [0, 0, 11], target: [0, 0, 0], fov: 36, W, H });
  const L = v3.norm([.55, .35, .75]);
  const ERA = ['#f59e0b', '#ef4444', '#a855f7', '#3b82f6', '#22c55e', '#06b6d4'];
  const Me = place([-1.9, .25, 0], 2.85, rx(.38), ry(faceLon(-50)));
  const Mm = place([3.35, 1.75, -1], .78, rx(.1), ry(faceLon(18)));
  const Mr = place([3.6, -1.6, -1.5], .66, rx(.15), ry(faceLon(125)));
  over(bg, render3d(cam, [planet('bumi', Me, L, { atm: '#7cc0ff', atmK: 1.1 }), planet('bulan', Mm, L), planet('mars', Mr, L, { atm: '#ff9a70', atmK: .5 })]));
  const s = cam.sphere(xf(Me, [0, 0, 0]), 2.85); limbGlow(bg, s.x, s.y, s.r, '#5aa8ff', .035, .7);
  const pins = [
    [Me, 51.18, -1.83, 0], [Me, 29.98, 31.13, 0], [Me, 20.68, -88.57, 1], [Me, 28.57, -80.65, 3], [Me, 5.24, -52.77, 4],
    [Mm, .67, 23.47, 3], [Mr, -4.59, 137.44, 5],
  ];
  let pinSvg = '';
  for (const [Mx, la, lo, era] of pins) {
    const d = latLon(la, lo), p = xf(Mx, d), n = v3.norm(xd(Mx, d));
    if (v3.dot(n, v3.norm(v3.sub(cam.pos, p))) < .15) continue;
    const [x, y] = cam.project(p);
    glow(bg, W, H, x, y, 10, ERA[era], 1.4, 1.6);
    pinSvg += `<g filter="url(#glow)"><path d="M${x},${y} L${x},${y - 30}" stroke="${ERA[era]}" stroke-width="3"/><circle cx="${x}" cy="${y - 36}" r="9" fill="${ERA[era]}" stroke="#fff" stroke-width="2.5"/></g><circle cx="${x}" cy="${y}" r="4" fill="#fff"/>`;
  }
  const tl = Array.from({ length: 6 }, (_, i) => 150 + i * 196);
  const o = svg(`${pinSvg}
    <g>
      <rect x="96" y="694" width="1088" height="76" rx="38" fill="rgba(8,13,34,.82)" stroke="rgba(148,174,255,.25)"/>
      <path d="M${tl[0]},732 L${tl[5]},732" stroke="#9db5ff" stroke-opacity=".35" stroke-width="3"/>
      <path d="M${tl[0]},732 L${tl[3]},732" stroke="url(#tlg)" stroke-width="4"/>
      ${tl.map((x, i) => `<circle cx="${x}" cy="732" r="${i === 3 ? 15 : 10}" fill="${ERA[i]}" ${i === 3 ? 'filter="url(#glow)" stroke="#fff" stroke-width="3"' : `fill-opacity="${i < 3 ? 1 : .55}"`}/>`).join('')}
    </g>`, `<linearGradient id="tlg" x1="0" x2="1"><stop offset="0" stop-color="${ERA[0]}"/><stop offset=".5" stop-color="${ERA[2]}"/><stop offset="1" stop-color="${ERA[3]}"/></linearGradient>`);
  await save('slide-2-1-sejarah', bg, o);
}

// 2-2 Laboratorium fenomena: gerhana Matahari total (korona + cincin berlian) dan Saturnus.
async function s2b() {
  const bg = spaceBackground(W, H, { seed: 51, a: '#1a2350', b: '#3a1a40', nebula: .3, stars: .7 });
  const cx = 800, cy = 360, R = 165;
  // korona & kromosfer
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy, r = Math.hypot(dx, dy) / R;
    if (r < .995 || r > 6) continue;
    const ca = dx / (r * R), sa = dy / (r * R);
    const st = fbm(ca * 2.4 + 9, sa * 2.4 + 3, 4, 5), fine = fbm(ca * 14, sa * 14, 3, 9);
    const h = r - 1;
    const I = (Math.exp(-h * 3.6) * .95 + Math.exp(-h * 1.5) * .12) * (.3 + 1.15 * Math.pow(st, 1.7)) * (.8 + .4 * fine);
    const chrom = Math.exp(-h * 90) * .9;
    const i = (y * W + x) * 3;
    bg[i] += I * 1.0 + chrom * 1.0; bg[i + 1] += I * .9 + chrom * .25; bg[i + 2] += I * .78 + chrom * .15;
  }
  const cam = camera({ pos: [0, 0, 12], target: [0, 0, 0], fov: 36, W, H, shift: [(cx - 640) / W, (cy - 400) / H] });
  const foc = cam.foc, s = R * 12 / foc;
  const Ls = v3.norm([.85, .45, -.3]);
  const moonShade = (c) => { const t = c.tex, e = .02 + .015 * Math.max(0, v3.dot(c.n, [0, 0, 1])); return [t[0] * e, t[1] * e, t[2] * e * 1.15, 1]; };
  const Msat = place([-5.2, -2.3, -2], 1.05, rz(-.35), rx(.5), ry(.4));
  over(bg, render3d(cam, [{ model: M.bulan, M: place([0, 0, 0], s), shade: moonShade }, planet('saturnus', Msat, Ls, { atm: '#f0d9a8', atmK: .4 })]));
  const da = 2.45, dx = cx + Math.cos(da) * R * .99, dy = cy - Math.sin(da) * R * .99;
  glow(bg, W, H, dx, dy, 60, '#fff3d6', 1.4, 1.5);
  glow(bg, W, H, dx, dy, 14, '#ffffff', 5, 2);
  const o = svg(`
    <g transform="translate(${dx} ${dy})" filter="url(#soft)" opacity=".9">
      ${[0, 45, 90, 135].map((a) => `<path d="M${-(a % 90 ? 70 : 150)},0 L0,-2.5 L${a % 90 ? 70 : 150},0 L0,2.5 Z" fill="#fffaf0" transform="rotate(${a})"/>`).join('')}
    </g>
`);
  await save('slide-2-2-fenomena', bg, o);
}

// 2-3 Jurnal: tiga kartu koleksi (Mars, Saturnus, Jupiter) dengan tanda centang dan label baru.
async function s2c() {
  const bg = spaceBackground(W, H, { seed: 61, a: '#173a7a', b: '#4a1f6b', nebula: .5 });
  const cards = [{ x: 400, y: 425, a: -11, id: 'mars', got: true }, { x: 880, y: 425, a: 11, id: 'jupiter', got: true }, { x: 640, y: 398, a: 0, id: 'saturnus', got: false }];
  const cardSvg = (c, hi) => `<g transform="translate(${c.x} ${c.y}) rotate(${c.a})" filter="url(#shadow)">
      <rect x="-150" y="-205" width="300" height="410" rx="26" fill="url(#card)" stroke="${hi ? '#5eead4' : '#8fb0ff'}" stroke-opacity="${hi ? .95 : .35}" stroke-width="${hi ? 3 : 1.6}"/>
      <rect x="-128" y="-183" width="256" height="236" rx="18" fill="#060b1f" stroke="rgba(148,174,255,.14)"/>
      <rect x="-118" y="82" width="170" height="20" rx="10" fill="#dbe7ff" fill-opacity=".85"/>
      <rect x="-118" y="118" width="236" height="12" rx="6" fill="#9db5ff" fill-opacity=".35"/>
      <rect x="-118" y="142" width="196" height="12" rx="6" fill="#9db5ff" fill-opacity=".25"/>
    </g>`;
  const under = svg(cards.map((c) => cardSvg(c, !c.got)).join(''));
  await svgInto(bg, W, H, under);
  const cam = camera({ pos: [0, 0, 40], target: [0, 0, 0], fov: 20, W, H });
  const toWorld = (x, y) => [(x - 640) / cam.foc * 40, -(y - 400) / cam.foc * 40, 0];
  const L = v3.norm([-.45, .35, .8]);
  const items = cards.map((c) => {
    const a = c.a * Math.PI / 180, ox = 0, oy = -65;
    const px = c.x + ox * Math.cos(a) - oy * Math.sin(a), py = c.y + ox * Math.sin(a) + oy * Math.cos(a);
    const rr = c.id === 'saturnus' ? 58 : 86;
    return planet(c.id, place(toWorld(px, py), rr / cam.foc * 40, rz(-a), rx(c.id === 'saturnus' ? .45 : .15), ry(.9)), L, { atm: c.id === 'mars' ? '#ff9a70' : null, atmK: .5 });
  });
  over(bg, render3d(cam, items));
  const check = (c) => { const a = c.a * Math.PI / 180, x = c.x + 118 * Math.cos(a) + 175 * Math.sin(a), y = c.y + 118 * Math.sin(a) - 175 * Math.cos(a);
    return `<g filter="url(#glow)"><circle cx="${x}" cy="${y}" r="20" fill="#22c55e"/><path d="M${x - 9},${y} L${x - 2},${y + 7} L${x + 10},${y - 7}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>`; };
  const mid = cards[2];
  const o = svg(`${cards.filter((c) => c.got).map(check).join('')}
    <g filter="url(#glow)">${starAt(mid.x + 128, mid.y - 196, 50, '#facc15')}</g>
    ${[[560, 160, 16], [742, 150, 12], [1010, 220, 14], [270, 250, 12], [1050, 640, 10]].map(([x, y, s]) => starAt(x, y, s, '#fde68a', .8)).join('')}`);
  await save('slide-2-3-jurnal', bg, o);
}

/* ================= SLIDE 3 — EVALUASI & MISI ================= */
// 3-1 Kuis: Jupiter di kiri, kartu kuis dengan jawaban benar dan bintang hadiah.
async function s3a() {
  const bg = spaceBackground(W, H, { seed: 71, a: '#1a3a80', b: '#5a2a50', nebula: .55, center: [.25, .5] });
  const cam = camera({ pos: [0, 0, 30], target: [0, 0, 0], fov: 30, W, H });
  const L = v3.norm([.75, .3, .6]);
  over(bg, render3d(cam, [planet('jupiter', place([-7.4, -.9, 0], 5.6, rx(.12), ry(.6)), L, { atm: '#f3d3a8', atmK: .35 })]));
  const opt = (y, letter, w, ok) => `
    <rect x="700" y="${y}" width="440" height="78" rx="18" fill="${ok ? 'rgba(34,197,94,.16)' : 'rgba(148,174,255,.07)'}" stroke="${ok ? '#22c55e' : 'rgba(148,174,255,.28)'}" stroke-width="${ok ? 2.5 : 1.5}"/>
    <rect x="718" y="${y + 17}" width="44" height="44" rx="12" fill="${ok ? '#22c55e' : 'rgba(148,174,255,.14)'}"/>
    <text x="740" y="${y + 48}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="22" fill="#fff">${letter}</text>
    <rect x="782" y="${y + 33}" width="${w}" height="13" rx="6.5" fill="#dbe7ff" fill-opacity="${ok ? .9 : .45}"/>
    ${ok ? `<g filter="url(#glow)"><circle cx="1104" cy="${y + 39}" r="17" fill="#22c55e"/><path d="M1096,${y + 39} L1102,${y + 45} L1112,${y + 33}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''}`;
  const o = svg(`
    <g filter="url(#shadow)"><rect x="672" y="150" width="496" height="500" rx="30" fill="url(#card)" stroke="rgba(148,174,255,.3)" stroke-width="1.6"/></g>
    <circle cx="726" cy="214" r="28" fill="rgba(94,234,212,.15)" stroke="#5eead4" stroke-width="2"/>
    <text x="726" y="225" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="30" fill="#5eead4">?</text>
    <rect x="772" y="196" width="300" height="16" rx="8" fill="#dbe7ff" fill-opacity=".9"/>
    <rect x="772" y="224" width="220" height="12" rx="6" fill="#9db5ff" fill-opacity=".4"/>
    ${opt(282, 'A', 210, false)}${opt(378, 'B', 260, true)}${opt(474, 'C', 180, false)}
    <g filter="url(#glow)">${starAt(1100, 140, 64)}${starAt(1172, 196, 40, '#fde68a')}${starAt(1046, 92, 30, '#fde68a', .85)}</g>
    ${chip(980, 584, '+10', { color: '#facc15', icon: STAR(), size: 24 })}`);
  await save('slide-3-1-kuis', bg, o);
}

// 3-2 Apollo 13: lintasan "free-return" angka delapan Bumi–Bulan, titik ledakan tangki oksigen.
async function s3b() {
  const bg = spaceBackground(W, H, { seed: 81, a: '#16306a', b: '#3d1a50', nebula: .4 });
  const cam = camera({ pos: [0, 7.5, 21], target: [.4, -.4, 0], fov: 36, W, H });
  const L = v3.norm([-1, .35, .55]);
  const E = [-7.2, 0, 0], Mo = [7.6, 0, 0];
  const Me = place(E, 2.1, rx(.35), ry(faceLon(-40)));
  over(bg, render3d(cam, [planet('bumi', Me, L, { atm: '#7cc0ff', atmK: 1.1 }), planet('bulan', place(Mo, .7, ry(faceLon(0))), L)]));
  const se = cam.sphere(E, 2.1); limbGlow(bg, se.x, se.y, se.r, '#5aa8ff', .035, .7);
  const A = v3.add, legs = [
    bez(A(E, [1.7, 0, -1.4]), [-1, 0, -3.4], [3.6, 0, 2.8], A(Mo, [-.25, 0, 1.15])),
    bez(A(Mo, [-.25, 0, 1.15]), [10.4, 0, 2.6], [10.4, 0, -2.6], A(Mo, [-.25, 0, -1.15])),
    bez(A(Mo, [-.25, 0, -1.15]), [3.6, 0, -2.8], [-1, 0, 3.4], A(E, [1.7, 0, 1.4])),
  ].map((l) => l.map((p) => cam.project(p)));
  const boom = legs[0][31];
  glow(bg, W, H, boom[0], boom[1], 34, '#ff7a2f', 1.6, 1.3);
  glow(bg, W, H, boom[0], boom[1], 10, '#fff2d0', 4, 2);
  const arrow = (pts, i) => { const a = pts[i], b = pts[i + 2], ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    return `<path d="M-10,-8 L4,0 L-10,8" transform="translate(${a[0]} ${a[1]}) rotate(${ang})" fill="none" stroke="#ffd7a8" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`; };
  const o = svg(`
    <g filter="url(#glow)" fill="none" stroke-linecap="round">
      <path d="${polyPath(legs[0])}" stroke="#ffc58a" stroke-width="3.4"/>
      <path d="${polyPath(legs[1])}" stroke="#ffc58a" stroke-width="3.4" stroke-dasharray="10 9"/>
      <path d="${polyPath(legs[2])}" stroke="#7dd3fc" stroke-width="3.4"/>
      ${arrow(legs[0], 14)}${arrow(legs[2], 22).replace('#ffd7a8', '#bae6fd')}
    </g>
    <g transform="translate(${boom[0]} ${boom[1]})" filter="url(#soft)">
      ${Array.from({ length: 10 }, (_, i) => `<path d="M0,0 L${(Math.cos(i * .63) * (i % 2 ? 46 : 70)).toFixed(1)},${(Math.sin(i * .63) * (i % 2 ? 46 : 70)).toFixed(1)}" stroke="#ffb066" stroke-width="3" stroke-linecap="round"/>`).join('')}
    </g>
    ${chip(56, 56, '1970', { color: '#ffc58a', size: 24 })}`);
  await save('slide-3-2-apollo13', bg, o);
}

// 3-3 Mars Climate Orbiter: rencana orbit aman (hijau) vs lintasan nyata yang terlalu rendah (merah) hingga terbakar.
async function s3c() {
  const bg = spaceBackground(W, H, { seed: 91, a: '#2a1a4a', b: '#5a1f2a', nebula: .45, center: [.6, .3] });
  const cam = camera({ pos: [0, 0, 30], target: [0, 0, 0], fov: 30, W, H });
  const L = v3.norm([-.55, .55, .6]);
  const Mm = place([4.6, -7.7, 0], 8.6, rx(.5), ry(faceLon(-60)));
  const lay = render3d(cam, [planet('mars', Mm, L, { atm: '#ff9a70', atmK: .8 })]);
  halo(bg, lay, '#ff7a4a', 22, .45);
  over(bg, lay);
  const s = cam.sphere(xf(Mm, [0, 0, 0]), 8.6);
  const arc = (rad, a0, a1, n = 60) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [s.x + Math.cos(a) * rad, s.y - Math.sin(a) * rad]; });
  const plan = arc(s.r * 1.2, 160, 64);
  const act = Array.from({ length: 61 }, (_, i) => { const t = i / 60, a = (166 - 92 * t) * Math.PI / 180, rr = s.r * (1.26 - .27 * Math.sin(Math.min(1, t * 1.15) * Math.PI * .5)); return [s.x + Math.cos(a) * rr, s.y - Math.sin(a) * rr]; });
  const burn = act[50];
  glow(bg, W, H, burn[0], burn[1], 40, '#ff6a2a', 1.5, 1.2);
  glow(bg, W, H, burn[0], burn[1], 11, '#fff0c8', 3.6, 2);
  const o = svg(`
    <g fill="none" stroke-linecap="round" filter="url(#glow)">
      <path d="${polyPath(plan)}" stroke="#4ade80" stroke-width="3.4" stroke-dasharray="14 11"/>
      <path d="${polyPath(act.slice(0, 51))}" stroke="#f87171" stroke-width="3.6"/>
      <path d="${polyPath(act.slice(50))}" stroke="#fb923c" stroke-width="3.6" stroke-dasharray="3 9" stroke-opacity=".7"/>
    </g>
    <g filter="url(#glow)"><circle cx="${plan[60][0]}" cy="${plan[60][1]}" r="9" fill="#4ade80"/></g>
    ${chip(56, 56, '1999', { color: '#fca5a5', size: 24 })}
    ${chip(56, 120, 'lbf·s ≠ N·s', { color: '#fde68a', size: 24 })}`);
  await save('slide-3-3-mco', bg, o);
}

/* ================= SLIDE 4 — ARMADA ================= */
async function hero(name, id, { color, rim, a, b, seed, bgPlanet, bgPos, bgScale, chipText, chipIcon, yaw = 2.25, camPos = [-2.6, 3.1, 9.8], dist = 1, bodyY = 0, keyK = 1.6, rimK = .7, glowSize = 1 }) {
  const bg = spaceBackground(W, H, { seed, a, b, nebula: .75, center: [.5, .45] });
  const cam = camera({ pos: v3.mul(camPos, dist), target: [.3, -.35, 0], fov: 34, W, H });
  const L = v3.norm([.6, .7, -.35]);
  const Mx = place([0, bodyY, 0], 1, ry(yaw), rz(.08), rx(.04));
  const items = [ship(id, Mx, L, { rim, engine: color, keyK, rimK })];
  if (bgPlanet) items.unshift(planet(bgPlanet, place(bgPos, bgScale, rx(.45), ry(.8)), v3.norm([-.4, .5, .8]), { atm: bgPlanet === 'bumi' ? '#7cc0ff' : null }));
  // landasan hanggar: cincin berpendar di bawah pesawat
  const ring = (r, y) => polyPath(Array.from({ length: 97 }, (_, i) => { const t = i / 96 * Math.PI * 2; return cam.project([Math.cos(t) * r, y, Math.sin(t) * r]); })) + 'Z';
  const under = svg(`<g filter="url(#glow)" fill="none">
      <path d="${ring(3.6, -1.9)}" stroke="${color}" stroke-opacity=".55" stroke-width="3"/>
      <path d="${ring(2.7, -1.9)}" stroke="${color}" stroke-opacity=".25" stroke-width="2" stroke-dasharray="10 10"/>
    </g><path d="${ring(3.6, -1.9)}" fill="${color}" fill-opacity=".07"/>`);
  await svgInto(bg, W, H, under);
  const lay = render3d(cam, items);
  over(bg, lay);
  engineFx(bg, cam, id, Mx, color, { power: 1.05, len: 2.8, size: (id === 'nova' ? .55 : 1) * glowSize, layer: lay });
  const o = svg(chip(56, 56, chipText, { color: '#fde68a', icon: chipIcon, size: 24 }));
  await save(name, bg, o);
}

/* ================= latar statis halaman Daftar ================= */
async function galaxyStill() {
  const GW = 1920, GH = 1080;
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(path.join(ROOT, 'public/models/decor/galaxy_collision.glb'));
  const root = doc.getRoot();
  const node = root.listNodes().find((n) => n.getMesh());
  const Wm = node.getWorldMatrix();
  const prim = node.getMesh().listPrimitives()[0];
  const P = prim.getAttribute('POSITION'), C = prim.getAttribute('COLOR_0'), T = prim.listTargets();
  const N = P.getCount(), e = [0, 0, 0], d1 = [0, 0, 0], d2 = [0, 0, 0], col = [0, 0, 0, 1];
  // bingkai awal (tanpa morph): dua galaksi spiral terpisah, sesaat sebelum bertabrakan
  const pts = [];
  // pusat & bidang utama (PCA) — sama dengan cloudPlane() di app/utils/splash3d.js
  const base = []; for (let i = 0; i < N; i++) { P.getElement(i, e); base.push(xf(Wm, e)); }
  const ctr = v3.mul(base.reduce((a, p) => v3.add(a, p), [0, 0, 0]), 1 / N);
  const Cv = [0, 0, 0, 0, 0, 0];
  for (const p of base) { const d = v3.sub(p, ctr); Cv[0] += d[0] * d[0]; Cv[1] += d[0] * d[1]; Cv[2] += d[0] * d[2]; Cv[3] += d[1] * d[1]; Cv[4] += d[1] * d[2]; Cv[5] += d[2] * d[2]; }
  const cm = (x) => [Cv[0] * x[0] + Cv[1] * x[1] + Cv[2] * x[2], Cv[1] * x[0] + Cv[3] * x[1] + Cv[4] * x[2], Cv[2] * x[0] + Cv[4] * x[1] + Cv[5] * x[2]];
  const pw = (x, o) => { for (let k = 0; k < 40; k++) { x = cm(x); if (o) x = v3.sub(x, v3.mul(o, v3.dot(x, o))); x = v3.norm(x); } return x; };
  const e1 = pw(v3.norm([1, .3, .2])), e2 = pw(v3.norm([.2, 1, .3]), e1);
  const FACE = v3.norm([0, .75, .66]);
  let nrm = v3.norm(v3.cross(e1, e2)); if (v3.dot(nrm, FACE) < 0) nrm = v3.mul(nrm, -1);
  // rotasi Rodrigues: nrm → FACE
  const ax = v3.cross(nrm, FACE), sn = v3.len(ax), cs = v3.dot(nrm, FACE), k_ = sn > 1e-6 ? v3.mul(ax, 1 / sn) : [1, 0, 0];
  const rot = (p) => v3.add(v3.add(v3.mul(p, cs), v3.mul(v3.cross(k_, p), sn)), v3.mul(k_, v3.dot(k_, p) * (1 - cs)));
  for (let i = 0; i < N; i++) {
    P.getElement(i, e);
    const lp = [e[0], e[1], e[2]];
    C.getElement(i, col);
    pts.push([xf(Wm, lp), [col[0], col[1], col[2]]]);
  }
  const bg = spaceBackground(GW, GH, { seed: 5, a: '#1b2a6b', b: '#4a1d5a', nebula: .35, base: '#04060f' });
  const cam = camera({ pos: [0, 2.4, 12], target: [0, 0, 0], fov: 42, W: GW, H: GH }); // = kamera adegan 3D (splash3d.js)
  for (const [p, c] of pts) {
    const q = rot(v3.sub(p, ctr));
    const [x, y, z] = cam.project(q); if (z <= .1) continue;
    // bintang (ukuran .1) + pendar nebula (ukuran .6, redup) — sama dengan PointsMaterial di splash3d.js
    for (const [size, amp] of [[.1, 1.3], [.6, .055]]) {
      const r = Math.max(.8, size * (GH / 2) / z / 4);
      const R = Math.ceil(r * 2.6), ix = Math.floor(x), iy = Math.floor(y);
      for (let oy = -R; oy <= R; oy++) for (let ox = -R; ox <= R; ox++) {
        const px = ix + ox, py = iy + oy; if (px < 0 || py < 0 || px >= GW || py >= GH) continue;
        const g = Math.exp(-((px + .5 - x) ** 2 + (py + .5 - y) ** 2) / (r * r)) * amp;
        const k = (py * GW + px) * 3; bg[k] += c[0] * g; bg[k + 1] += c[1] * g; bg[k + 2] += c[2] * g;
      }
    }
  }
  const px = Buffer.alloc(GW * GH * 3);
  const { lin2srgb } = await import('./lib/raster.mjs');
  for (let i = 0; i < px.length; i++) { let x = bg[i]; x = x / (1 + Math.max(0, x - .8) * .9); px[i] = lin2srgb(x); }
  const sharp = (await import('sharp')).default;
  await sharp(px, { raw: { width: GW, height: GH, channels: 3 } }).webp({ quality: 80, effort: 5 }).toFile(path.join(ROOT, 'public/img/bg-galaxy.webp'));
  console.log('✓ bg-galaxy');
}

const STAR_ICON = STAR('#facc15');
const jobs = {
  'slide-1-1': s1a, 'slide-1-2': s1b, 'slide-1-3': s1c,
  'slide-2-1': s2a, 'slide-2-2': s2b, 'slide-2-3': s2c,
  'slide-3-1': s3a, 'slide-3-2': s3b, 'slide-3-3': s3c,
  'slide-4-1': () => hero('slide-4-1-astra', 'astra', { color: '#ffb25a', rim: '#7fb0ff', a: '#1d3a8a', b: '#6a3a2a', seed: 101, bgPlanet: 'bumi', bgPos: [14, 1.2, -27], bgScale: 4.2, chipText: 'Gratis', chipIcon: STAR_ICON }),
  'slide-4-2': () => hero('slide-4-2-orion', 'orion', { color: '#ff4a4a', rim: '#c7d2fe', rimK: .45, keyK: 2.1, glowSize: .7, a: '#3a1a5a', b: '#6b1f2f', seed: 102, bgPlanet: 'saturnus', bgPos: [14.5, 1.6, -29], bgScale: 4.4, chipText: '300', chipIcon: STAR_ICON }),
  'slide-4-3': () => hero('slide-4-3-nova', 'nova', { color: '#3fb6ff', rim: '#6fd0ff', a: '#0f3a7a', b: '#1a5a6a', seed: 103, bgPlanet: 'jupiter', bgPos: [15, 1.8, -29], bgScale: 4.8, chipText: '700', chipIcon: STAR_ICON, yaw: 2.4, dist: 1.22 }),
  'bg-galaxy': galaxyStill,
};
for (const [k, fn] of Object.entries(jobs)) if (want(k)) await fn();

// Mengubah model GLB unduhan (Sketchfab) di "3D Planet/" dan "3D Pesawat/" menjadi model siap-game di public/models/.
// Jalankan ulang setelah mengganti model sumber:  npm run models   (atau: npm run models -- mars nova black_hole)
//
// Planet
//  - Material spec-gloss lama → metal-rough (Three.js tidak lagi mendukung spec-gloss).
//  - Semua transform node dipanggang ke verteks; animasi, kamera, dan satelit bawaan model dibuang.
//  - Inti diproyeksikan ke bola satuan (radius 1) dan diorientasikan dari UV teksturnya:
//      kutub utara tekstur → +Y, bujur 0° → +X, timur → −Z  (sama dengan latLonToLocal di app/game/system.js),
//    sehingga POI sejarah (lintang/bujur) jatuh di lokasi yang benar pada peta tekstur.
//  - Cincin disejajarkan ke bidang ekuator; jari-jari dalam/luar disimpan di extras untuk bayangan cincin.
//  - Tekstur emisif & metal-rough dibuang (planet diterangi shader Matahari sendiri di game).
// Pesawat
//  - Hidung → −Z, atas → +Y, ukuran dinormalkan; penanda mesin (role "engine"), semburan api ("plume"),
//    dan cakram pijar mesin ("glow") ditandai lewat extras agar bisa dianimasikan sesuai gas.
// Semua
//  - Tekstur WebP ≤ 2048 px, mesh berat disederhanakan (meshoptimizer), kompresi EXT_meshopt_compression.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { metalRough, prune, dedup, weldPrimitive, simplifyPrimitive, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'models');

const PLANETS = [
  { id: 'merkurius', src: '3D Planet/mercury.glb', map: 'equirect' },
  { id: 'venus', src: '3D Planet/venus.glb', map: 'equirect' },
  { id: 'bumi', src: '3D Planet/earth.glb', map: 'equirect' },
  // Bulan memakai atlas (pita ekuator + dua cakram kutub): bujur 0° dipilih di pusat maria gelap (sisi dekat).
  { id: 'bulan', src: '3D Planet/moon.glb', map: 'atlas', band: 0.40, lon0: 'maria' },
  { id: 'mars', src: '3D Planet/mars.glb', map: 'equirect' },
  { id: 'jupiter', src: '3D Planet/jupiter.glb', map: 'equirect' },
  { id: 'saturnus', src: '3D Planet/saturn_planet.glb', map: 'equirect', ringFlatV: true,
    roles: { core: /^Material_50$/, cloud: /^Material_62$/, ring: /^Material_63$/, drop: /^Material_64$/ } },
  // Cincin Uranus & Neptunus = satu cakram bertekstur (…2_B) + awan partikel (…2_A, ratusan ribu segitiga lepas)
  // → partikel digabung jadi satu mesh lalu dijarangkan (lihat DUST_TRIS).
  { id: 'uranus', src: '3D Planet/uranus.glb', map: 'atlas', band: 0.48,
    roles: { core: /^uranus1_A$/, ring: /^uranus2_B$/, dust: /^uranus2_A$/, drop: /^miranda$/ } },
  { id: 'neptunus', src: '3D Planet/neptune.glb', map: 'atlas', band: 0.48,
    roles: { core: /^neptune1_A$/, ring: /^neptune2_B$/, dust: /^neptune2_A$/ } },
];
const DUST_TRIS = 40000;
const SHIPS = [
  // Astra Scout ← Space Shuttle Discovery (semburan api bawaan model dianimasikan sesuai gas)
  { id: 'astra', src: '3D Pesawat/space_shuttle_discovery.glb', size: 6.0, plume: /^Untitled101/, drop: /^Transbordador_Slot__6$/ },
  // Orion Glider ← Stealthy Space Tato (model sumber menghadap +Z → diputar 180°)
  { id: 'orion', src: '3D Pesawat/stealthy_space_tato.glb', size: 6.2, rotateY180: true, engineFromRear: true },
  // Nova Voyager ← SA-23 Starfury (interior & pilot sangat padat → disederhanakan)
  { id: 'nova', src: '3D Pesawat/sa-23_starfury.glb', size: 6.6, glow: /^Main_Glow$/, drop: /^Exhaust$/, simplify: 3500 },
];

// Dekorasi: lubang hitam untuk adegan pembuka, diletakkan di luar tata surya.
// Piringan akresi → bidang XZ (normal +Y), jari-jari piringan → 1. Material emisif dipertahankan (berpendar + bloom).
const DECOR = [
  { id: 'black_hole', src: '3D Planet/black_hole.glb', disk: /^ring/, drop: /^Planet$/, simplify: 16000, error: 0.00025 },
];

/* ---------------- util vektor ---------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const fmt = (a) => a.map((x) => (+x).toFixed(3)).join(', ');
const mean = (arr) => { const s = [0, 0, 0]; for (const p of arr) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return mul(s, 1 / Math.max(1, arr.length)); };
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

function pcaSmallest(P, c) {
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of P) { const d = sub(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += d[i] * d[j]; }
  const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const tr = C[0][0] + C[1][1] + C[2][2];
  const M = C.map((row, i) => row.map((x, j) => x + (i === j ? tr * 1e-7 : 0)));
  const D = det3(M);
  let v = norm([0.31, 0.83, 0.47]);
  for (let k = 0; k < 60; k++) { // iterasi pangkat invers → vektor eigen terkecil
    const r = [0, 1, 2].map((col) => det3(M.map((row, i) => row.map((x, j) => (j === col ? v[i] : x)))) / D);
    v = norm(r);
  }
  return v;
}

/* ---------------- akses mesh ---------------- */
function prims(node) { return node.getMesh() ? node.getMesh().listPrimitives() : []; }
function readAttr(node, sem) {
  const out = [];
  for (const p of prims(node)) { const a = p.getAttribute(sem); if (!a) continue; for (let i = 0; i < a.getCount(); i++) out.push(a.getElement(i, [])); }
  return out;
}
function mapAttr(node, sem, fn) {
  let base = 0;
  for (const p of prims(node)) {
    const a = p.getAttribute(sem); if (!a) continue;
    const el = [];
    for (let i = 0; i < a.getCount(); i++) a.setElement(i, fn(a.getElement(i, el).slice(), base + i));
    base += a.getCount();
  }
}
function flipWinding(node) {
  for (const p of prims(node)) {
    const I = p.getIndices(); if (!I) continue;
    const arr = I.getArray();
    for (let k = 0; k + 2 < arr.length; k += 3) { const t = arr[k + 1]; arr[k + 1] = arr[k + 2]; arr[k + 2] = t; }
    I.setArray(arr);
  }
}
const triCount = (node) => prims(node).reduce((s, p) => s + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
const matName = (node) => prims(node)[0]?.getMaterial()?.getName() || '';
const usesExt = (doc, name) => doc.getRoot().listExtensionsUsed().some((e) => e.extensionName === name);

// Panggang matriks dunia setiap node ber-mesh ke data verteks baru (tidak dibagi), lalu ratakan hierarki.
function bakeWorld(doc) {
  const root = doc.getRoot();
  const buffer = root.listBuffers()[0] || doc.createBuffer();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const out = [];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const M = node.getWorldMatrix();
    const a = [M[0], M[1], M[2], M[4], M[5], M[6], M[8], M[9], M[10]];
    const det = a[0] * (a[4] * a[8] - a[5] * a[7]) - a[3] * (a[1] * a[8] - a[2] * a[7]) + a[6] * (a[1] * a[5] - a[2] * a[4]);
    const inv = invert3(a);
    const nm = inv ? [inv[0], inv[3], inv[6], inv[1], inv[4], inv[7], inv[2], inv[5], inv[8]] : a;
    const newMesh = doc.createMesh(node.getName() || mesh.getName());
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue; // hanya TRIANGLES
      const np = doc.createPrimitive().setMaterial(prim.getMaterial());
      for (const sem of prim.listSemantics()) {
        const src = prim.getAttribute(sem); const n = src.getCount(), size = src.getElementSize();
        const arr = new Float32Array(n * size); const el = [];
        for (let i = 0; i < n; i++) {
          src.getElement(i, el);
          if (sem === 'POSITION') {
            const [x, y, z] = el;
            arr[i * 3] = M[0] * x + M[4] * y + M[8] * z + M[12];
            arr[i * 3 + 1] = M[1] * x + M[5] * y + M[9] * z + M[13];
            arr[i * 3 + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
          } else if (sem === 'NORMAL' || sem === 'TANGENT') {
            const m = sem === 'NORMAL' ? nm : a;
            const v = norm([m[0] * el[0] + m[3] * el[1] + m[6] * el[2], m[1] * el[0] + m[4] * el[1] + m[7] * el[2], m[2] * el[0] + m[5] * el[1] + m[8] * el[2]]);
            arr.set(v, i * size);
            if (size === 4) arr[i * 4 + 3] = (el[3] ?? 1) * (det < 0 ? -1 : 1);
          } else for (let k = 0; k < size; k++) arr[i * size + k] = el[k];
        }
        np.setAttribute(sem, doc.createAccessor().setType(src.getType()).setArray(arr).setBuffer(buffer));
      }
      const I = prim.getIndices();
      const count = I ? I.getCount() : prim.getAttribute('POSITION').getCount();
      const idx = new Uint32Array(count);
      for (let k = 0; k < count; k++) idx[k] = I ? I.getScalar(k) : k;
      if (det < 0) for (let k = 0; k + 2 < count; k += 3) { const t = idx[k + 1]; idx[k + 1] = idx[k + 2]; idx[k + 2] = t; }
      np.setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
      newMesh.addPrimitive(np);
    }
    out.push(doc.createNode(node.getName()).setMesh(newMesh));
  }
  for (const n of scene.listChildren()) scene.removeChild(n);
  for (const n of root.listNodes()) if (!out.includes(n)) n.dispose();
  for (const anim of root.listAnimations()) anim.dispose();
  for (const cam of root.listCameras()) cam.dispose();
  return out;
}
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-30) return null;
  const D = -(b * i - c * h), E = a * i - c * g, F = -(a * h - b * g), G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
  return [A / det, D / det, G / det, B / det, E / det, H / det, C / det, F / det, I / det];
}
function disposeNode(n) { const m = n.getMesh(); n.dispose(); if (m && !m.listParents().some((p) => p.propertyType === 'Node')) m.dispose(); }
// Gabungkan "sup segitiga" (partikel) dari beberapa node jadi satu mesh, ambil tiap segitiga ke-k sampai ≤ maxTris.
function mergeSubsample(doc, nodes, maxTris, name) {
  const buffer = doc.getRoot().listBuffers()[0];
  let total = 0; for (const n of nodes) total += triCount(n);
  const step = Math.max(1, Math.ceil(total / maxTris));
  const pos = [], nor = [], uv = []; let t = 0, material = null;
  for (const n of nodes) for (const p of prims(n)) {
    material = material || p.getMaterial();
    const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), T = p.getAttribute('TEXCOORD_0'), I = p.getIndices();
    const cnt = I ? I.getCount() : P.getCount();
    for (let k = 0; k + 2 < cnt; k += 3, t++) {
      if (t % step) continue;
      for (let j = 0; j < 3; j++) {
        const i = I ? I.getScalar(k + j) : k + j;
        pos.push(...P.getElement(i, [])); nor.push(...(N ? N.getElement(i, []) : [0, 1, 0])); uv.push(...(T ? T.getElement(i, []) : [0, 0]));
      }
    }
  }
  const prim = doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buffer))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buffer));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim));
  for (const n of nodes) disposeNode(n);
  console.log(`    partikel cincin ${nodes.length} mesh, ${Math.round(total)} → ${Math.round(pos.length / 9)} segitiga (1 dari ${step})`);
  return node;
}
function simplifyNode(node, maxTris, error) {
  const before = triCount(node);
  if (before <= maxTris) return null;
  for (const p of prims(node)) {
    weldPrimitive(p);
    const t = (p.getIndices() ? p.getIndices().getCount() : 0) / 3;
    if (t > maxTris * 0.2) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: Math.max(0.06, maxTris / before), error, lockBorder: false });
  }
  return [before, triCount(node)];
}

/* ---------------- planet ---------------- */
async function mariaU(tex, vMax) {
  // u (0..1) pusat kegelapan maria pada pita ekuator atlas Bulan
  const { data, info } = await sharp(Buffer.from(tex.getImage())).resize({ width: 512 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rows = Math.floor(info.height * vMax * 0.9);
  const colLum = new Float64Array(info.width);
  for (let x = 0; x < info.width; x++) { let s = 0; for (let y = Math.floor(rows * 0.1); y < rows; y++) s += data[y * info.width + x]; colLum[x] = s; }
  const avg = colLum.reduce((a, b) => a + b, 0) / info.width;
  let sx = 0, sy = 0;
  for (let x = 0; x < info.width; x++) { const w = Math.max(0, avg - colLum[x]); const a = (x + 0.5) / info.width * 2 * Math.PI; sx += w * Math.cos(a); sy += w * Math.sin(a); }
  return ((Math.atan2(sy, sx) / (2 * Math.PI)) + 1) % 1;
}

async function processPlanet(io, job) {
  const doc = await io.read(path.join(ROOT, job.src));
  if (usesExt(doc, 'KHR_materials_pbrSpecularGlossiness')) await doc.transform(metalRough());
  const nodes = bakeWorld(doc);
  const parts = { core: [], cloud: [], ring: [], dust: [] };
  for (const n of nodes) {
    let role = 'core';
    if (job.roles) { role = Object.keys(job.roles).find((k) => job.roles[k].test(matName(n))) || 'drop'; }
    if (role === 'drop') { disposeNode(n); continue; }
    parts[role].push(n);
  }
  if (parts.core.length !== 1) throw new Error(`${job.id}: harus tepat satu mesh inti, ditemukan ${parts.core.length}`);
  const core = parts.core[0];
  const P = readAttr(core, 'POSITION'), UV = readAttr(core, 'TEXCOORD_0');
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of P) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const c = mul(add(lo, hi), 0.5);
  const r = median(P.map((p) => len(sub(p, c))));
  let vmin = Infinity, vmax = -Infinity;
  for (const t of UV) { vmin = Math.min(vmin, t[1]); vmax = Math.max(vmax, t[1]); }
  const vMid = job.map === 'equirect' ? (vmin + vmax) / 2 : job.band / 2;
  const vSpan = job.map === 'equirect' ? vmax - vmin : job.band;

  // --- kutub utara ---
  // Tekstur pada file-file ini tersimpan "selatan di atas": klaster v-min = kutub selatan.
  let north;
  if (job.map === 'equirect') {
    const S = P.filter((_, i) => UV[i][1] < vmin + vSpan * 0.04), N = P.filter((_, i) => UV[i][1] > vmax - vSpan * 0.04);
    north = norm(sub(mean(N), mean(S)));
  } else {
    const bandIdx = P.map((_, i) => i).filter((i) => UV[i][1] < job.band);
    const axis = pcaSmallest(bandIdx.map((i) => P[i]), c);
    let bmin = Infinity, bmax = -Infinity; for (const i of bandIdx) { bmin = Math.min(bmin, UV[i][1]); bmax = Math.max(bmax, UV[i][1]); }
    const south = mean(bandIdx.filter((i) => UV[i][1] < bmin + (bmax - bmin) * 0.1).map((i) => P[i]));
    north = dot(axis, sub(south, c)) > 0 ? mul(axis, -1) : axis;
  }
  const inPlane = (d) => norm(sub(d, mul(north, dot(d, north))));

  // --- bujur 0° ---
  let uTarget = 0.5, cand = [];
  if (job.lon0 === 'maria') uTarget = await mariaU(prims(core)[0].getMaterial().getBaseColorTexture(), job.band);
  const pick = (tolU, tolV) => {
    const out = [];
    P.forEach((p, i) => {
      const [u, v] = UV[i];
      if (Math.abs(v - vMid) > vSpan * tolV) return;
      const du = Math.abs(((u - uTarget) % 1 + 1.5) % 1 - 0.5);
      if (du < tolU && u >= -0.01 && u <= 1.01) out.push(sub(p, c));
    });
    return out;
  };
  for (const tol of [[0.01, 0.05], [0.02, 0.08], [0.04, 0.12], [0.08, 0.2]]) { cand = pick(...tol); if (cand.length >= 3) break; }
  const lon0 = inPlane(mean(cand));

  // --- basis: X = bujur 0°, Y = utara, Z = −timur ---
  const east = cross(north, lon0);
  let mirror = false;
  const toLocal = (d) => [dot(d, lon0), dot(d, north), (mirror ? 1 : -1) * dot(d, east)];
  // cek arah UV: u harus naik ke timur (berlawanan jarum jam dilihat dari utara)
  const cs = [0, 0], sn = [0, 0];
  P.forEach((p, i) => {
    const [u, v] = UV[i];
    if (Math.abs(v - vMid) > vSpan * 0.15) return;
    const q = toLocal(sub(p, c)); const phi = Math.atan2(-q[2], q[0]); const a = 2 * Math.PI * u;
    cs[0] += Math.cos(phi - a); sn[0] += Math.sin(phi - a); cs[1] += Math.cos(phi + a); sn[1] += Math.sin(phi + a);
  });
  const coh = [Math.hypot(cs[0], sn[0]), Math.hypot(cs[1], sn[1])];
  if (coh[1] > coh[0] * 1.5) mirror = true;

  if (parts.dust.length) parts.ring.push(mergeSubsample(doc, parts.dust, DUST_TRIS, 'ringdust'));
  const xf = (p) => mul(toLocal(sub(p, c)), 1 / r);
  const xfN = (n) => norm(toLocal(n));
  for (const n of [...parts.core, ...parts.cloud, ...parts.ring]) {
    mapAttr(n, 'POSITION', xf); mapAttr(n, 'NORMAL', xfN);
    if (mirror) flipWinding(n);
    for (const p of prims(n)) if (p.getAttribute('TANGENT')) p.setAttribute('TANGENT', null);
  }
  // inti & awan → bola sempurna (normal = arah radial)
  mapAttr(core, 'POSITION', (p) => norm(p));
  { const Pn = readAttr(core, 'POSITION'); mapAttr(core, 'NORMAL', (_, i) => Pn[i]); }
  for (const cl of parts.cloud) {
    const rc = median(readAttr(cl, 'POSITION').map(len));
    mapAttr(cl, 'POSITION', (p) => mul(norm(p), rc));
    const Pc = readAttr(cl, 'POSITION'); mapAttr(cl, 'NORMAL', (_, i) => norm(Pc[i]));
  }

  // --- cincin: sejajarkan ke ekuator (normal → +Y), ukur jari-jari dalam/luar ---
  let ringInner = 0, ringOuter = 0, ringTilt = 0;
  if (parts.ring.length) {
    const RP = parts.ring.flatMap((n) => readAttr(n, 'POSITION'));
    let rn = pcaSmallest(RP, [0, 0, 0]); if (rn[1] < 0) rn = mul(rn, -1);
    ringTilt = Math.acos(Math.min(1, rn[1])) * 180 / Math.PI;
    if (ringTilt > 0.5) {
      const axis = norm(cross(rn, [0, 1, 0])), ang = Math.acos(Math.min(1, rn[1]));
      const cA = Math.cos(ang), sA = Math.sin(ang);
      const rot = (v) => add(add(mul(v, cA), mul(cross(axis, v), sA)), mul(axis, dot(axis, v) * (1 - cA))); // Rodrigues
      for (const n of parts.ring) { mapAttr(n, 'POSITION', rot); mapAttr(n, 'NORMAL', (v) => norm(rot(v))); }
    }
    const radial = parts.ring.flatMap((n) => readAttr(n, 'POSITION')).map((p) => Math.hypot(p[0], p[2])).sort((a, b) => a - b);
    ringInner = radial[Math.floor(radial.length * 0.005)]; ringOuter = radial[Math.floor(radial.length * 0.995)];
    if (job.ringFlatV) for (const n of parts.ring) mapAttr(n, 'TEXCOORD_0', (t) => [t[0], 0.5]);
  }

  // --- material: hanya warna dasar (+ normal map); emisif/metal-rough dibuang ---
  for (const m of doc.getRoot().listMaterials()) {
    m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]).setMetallicRoughnessTexture(null).setOcclusionTexture(null);
    m.setMetallicFactor(0).setRoughnessFactor(1);
  }

  // --- struktur akhir ---
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  for (const n of scene.listChildren()) scene.removeChild(n);
  const rootNode = doc.createNode(job.id).setExtras({ kind: 'planet', id: job.id, ringInner, ringOuter, mirrored: mirror });
  scene.addChild(rootNode);
  core.setName('core').setExtras({ role: 'core' }); rootNode.addChild(core);
  parts.cloud.forEach((n, k) => { n.setName(`cloud_${k}`).setExtras({ role: 'cloud' }); rootNode.addChild(n); });
  parts.ring.forEach((n, k) => { n.setName(n.getName() === 'ringdust' ? 'ringdust' : `ring_${k}`).setExtras({ role: 'ring' }); rootNode.addChild(n); });

  console.log(`  ${job.id.padEnd(9)} r=${r.toFixed(3)} utara(model)=[${fmt(north)}] bujur0=[${fmt(lon0)}] (${cand.length} verteks${job.lon0 === 'maria' ? `, u maria=${uTarget.toFixed(3)}` : ''})`
    + `  koherensi UV +${coh[0].toFixed(0)}/-${coh[1].toFixed(0)}${mirror ? ' → DICERMINKAN' : ''}`
    + (parts.ring.length ? `  cincin ${ringInner.toFixed(2)}–${ringOuter.toFixed(2)} R (miring ${ringTilt.toFixed(1)}° → disejajarkan)` : ''));
  return doc;
}

/* ---------------- pesawat ---------------- */
async function processShip(io, job) {
  const doc = await io.read(path.join(ROOT, job.src));
  if (usesExt(doc, 'KHR_materials_pbrSpecularGlossiness')) await doc.transform(metalRough());
  const nodes = bakeWorld(doc);
  const hull = [], glow = [], plume = [];
  for (const n of nodes) {
    const mn = matName(n);
    const P = readAttr(n, 'POSITION');
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of P) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
    const degenerate = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) < 1e-5;
    if ((job.drop && job.drop.test(mn)) || degenerate) { disposeNode(n); continue; }
    if (job.plume && job.plume.test(mn)) plume.push(n);
    else if (job.glow && job.glow.test(mn)) glow.push(n);
    else hull.push(n);
  }
  if (job.rotateY180) for (const n of [...hull, ...glow, ...plume]) { mapAttr(n, 'POSITION', (p) => [-p[0], p[1], -p[2]]); mapAttr(n, 'NORMAL', (v) => [-v[0], v[1], -v[2]]); mapAttr(n, 'TANGENT', (t) => [-t[0], t[1], -t[2], t[3]]); }
  const HP = hull.flatMap((n) => readAttr(n, 'POSITION'));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of HP) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const c = mul(add(lo, hi), 0.5), ext = sub(hi, lo);
  const s = job.size / Math.max(ext[0], ext[2]);
  for (const n of [...hull, ...glow, ...plume]) mapAttr(n, 'POSITION', (p) => mul(sub(p, c), s));
  const size = mul(ext, s);

  // penanda mesin
  const engines = [];
  for (const n of glow) engines.push(mean(readAttr(n, 'POSITION')));
  const plumeSets = [];
  for (const n of plume) {
    const P = readAttr(n, 'POSITION'); const m = mean(P);
    let set = plumeSets.find((g) => Math.abs(g.x - m[0]) < size[0] * 0.04);
    if (!set) { set = { x: m[0], nodes: [], pts: [] }; plumeSets.push(set); }
    set.nodes.push(n); set.pts.push(...P);
  }
  for (const set of plumeSets) {
    const m = mean(set.pts); let zmin = Infinity; for (const p of set.pts) zmin = Math.min(zmin, p[2]);
    set.pivot = [m[0], m[1], zmin]; engines.push(set.pivot);
  }
  if (job.engineFromRear) {
    const all = hull.flatMap((n) => readAttr(n, 'POSITION'));
    let zmax = -Infinity; for (const p of all) zmax = Math.max(zmax, p[2]);
    const rear = all.filter((p) => p[2] > zmax - size[2] * 0.035 && Math.abs(p[0]) < size[0] * 0.12);
    const m = mean(rear); engines.push([m[0], m[1], zmax]);
  }
  if (job.simplify) {
    let b = 0, a2 = 0;
    for (const n of hull) { const r = simplifyNode(n, job.simplify, 0.0012); if (r) { b += r[0]; a2 += r[1]; } }
    if (b) console.log(`    sederhanakan mesh padat ${Math.round(b)} → ${Math.round(a2)} segitiga`);
  }

  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  for (const n of scene.listChildren()) scene.removeChild(n);
  const rootNode = doc.createNode(job.id).setExtras({ kind: 'ship', id: job.id, size });
  scene.addChild(rootNode);
  hull.forEach((n) => { n.setExtras({ role: 'hull' }); rootNode.addChild(n); });
  glow.forEach((n, k) => { n.setName(`glow_${k}`).setExtras({ role: 'glow' }); rootNode.addChild(n); });
  plumeSets.forEach((set, k) => {
    const pv = doc.createNode(`plume_${k}`).setTranslation(set.pivot).setExtras({ role: 'plume' });
    for (const n of set.nodes) { mapAttr(n, 'POSITION', (p) => sub(p, set.pivot)); n.setExtras({ role: 'plumeMesh' }); pv.addChild(n); }
    rootNode.addChild(pv);
  });
  engines.forEach((p, k) => rootNode.addChild(doc.createNode(`engine_${k}`).setTranslation(p).setExtras({ role: 'engine' })));
  const tris = hull.reduce((sum, n) => sum + triCount(n), 0);
  console.log(`  ${job.id.padEnd(9)} ukuran ${fmt(size)}  ${Math.round(tris)} segitiga  mesin ${engines.length} (${engines.map((e) => `[${fmt(e)}]`).join(' ')})${plumeSets.length ? `  semburan ${plumeSets.length}` : ''}${glow.length ? `  pijar ${glow.length}` : ''}`);
  return doc;
}

/* ---------------- dekorasi ---------------- */
async function processDecor(io, job) {
  const doc = await io.read(path.join(ROOT, job.src));
  if (usesExt(doc, 'KHR_materials_pbrSpecularGlossiness')) await doc.transform(metalRough());
  const keep = [];
  for (const n of bakeWorld(doc)) { if (job.drop && job.drop.test(matName(n))) disposeNode(n); else keep.push(n); }
  const DP = keep.filter((n) => job.disk.test(matName(n))).flatMap((n) => readAttr(n, 'POSITION'));
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of DP) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
  const c = mul(add(lo, hi), 0.5);
  let nrm = pcaSmallest(DP, c); if (nrm[1] < 0) nrm = mul(nrm, -1);
  const tilt = Math.acos(Math.min(1, nrm[1]));
  const axis = tilt > 1e-4 ? norm(cross(nrm, [0, 1, 0])) : [1, 0, 0];
  const cA = Math.cos(tilt), sA = Math.sin(tilt);
  const rot = (v) => add(add(mul(v, cA), mul(cross(axis, v), sA)), mul(axis, dot(axis, v) * (1 - cA)));
  for (const n of keep) { mapAttr(n, 'POSITION', (p) => rot(sub(p, c))); mapAttr(n, 'NORMAL', (v) => norm(rot(v))); for (const p of prims(n)) if (p.getAttribute('TANGENT')) p.setAttribute('TANGENT', null); }
  const radial = keep.filter((n) => job.disk.test(matName(n))).flatMap((n) => readAttr(n, 'POSITION')).map((p) => Math.hypot(p[0], p[2])).sort((a, b) => a - b);
  const s = 1 / radial[Math.floor(radial.length * 0.995)];
  for (const n of keep) mapAttr(n, 'POSITION', (p) => mul(p, s));
  let b = 0, a2 = 0;
  for (const n of keep) { const r = simplifyNode(n, job.simplify, job.error); if (r) { b += r[0]; a2 += r[1]; } }
  for (const m of doc.getRoot().listMaterials()) m.setMetallicFactor(0).setRoughnessFactor(1).setMetallicRoughnessTexture(null);
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  for (const n of scene.listChildren()) scene.removeChild(n);
  const rootNode = doc.createNode(job.id).setExtras({ kind: 'decor', id: job.id });
  scene.addChild(rootNode);
  keep.forEach((n) => rootNode.addChild(n));
  const tris = keep.reduce((sum, n) => sum + triCount(n), 0);
  console.log(`  ${job.id.padEnd(10)} piringan miring ${(tilt * 180 / Math.PI).toFixed(1)}° → disejajarkan, ${keep.length} mesh, ${Math.round(tris)} segitiga${b ? ` (disederhanakan ${Math.round(b)} → ${Math.round(a2)})` : ''}`);
  return doc;
}

/* ---------------- utama ---------------- */
async function finish(io, doc, outFile, maxTex) {
  await doc.transform(
    dedup(),
    prune({ keepLeaves: true, keepAttributes: false }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTex, maxTex], quality: 86 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  await io.write(outFile, doc);
  return fs.statSync(outFile).size;
}

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const only = process.argv.slice(2);
let total = 0;
console.log('Planet:');
for (const job of PLANETS) {
  if (only.length && !only.includes(job.id)) continue;
  const doc = await processPlanet(io, job);
  const bytes = await finish(io, doc, path.join(OUT, 'planets', `${job.id}.glb`), 2048);
  total += bytes; console.log(`            → public/models/planets/${job.id}.glb  ${(bytes / 1048576).toFixed(2)} MB  (sumber ${(fs.statSync(path.join(ROOT, job.src)).size / 1048576).toFixed(1)} MB)`);
}
console.log('Pesawat:');
for (const job of SHIPS) {
  if (only.length && !only.includes(job.id)) continue;
  const doc = await processShip(io, job);
  const bytes = await finish(io, doc, path.join(OUT, 'ships', `${job.id}.glb`), 2048);
  total += bytes; console.log(`            → public/models/ships/${job.id}.glb  ${(bytes / 1048576).toFixed(2)} MB  (sumber ${(fs.statSync(path.join(ROOT, job.src)).size / 1048576).toFixed(1)} MB)`);
}
console.log('Dekorasi:');
for (const job of DECOR) {
  if (only.length && !only.includes(job.id)) continue;
  const doc = await processDecor(io, job);
  const bytes = await finish(io, doc, path.join(OUT, 'decor', `${job.id}.glb`), 1024);
  total += bytes; console.log(`            → public/models/decor/${job.id}.glb  ${(bytes / 1048576).toFixed(2)} MB  (sumber ${(fs.statSync(path.join(ROOT, job.src)).size / 1048576).toFixed(1)} MB)`);
}
console.log(`Total ${(total / 1048576).toFixed(1)} MB`);

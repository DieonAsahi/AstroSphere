// Pesawat (menghadap −Z). Utama: model GLB unduhan (public/models/ships, lihat scripts/optimize-models.mjs)
//   astra ← Space Shuttle Discovery, orion ← Stealthy Space Tato, nova ← SA-23 Starfury.
// Cadangan bila model gagal dimuat: model prosedural lama (teknik tekstur lambung dari Jelajah Antariksa).
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FLAME_VS, FLAME_FS } from './shaders.js';
import { clamp, smooth } from './util.js';
import { roleOf } from './models.js';
import { SHIPS } from '../data/ships.js';

let renderer = null, TEX_SIZE = 1024, GLOW_TEX = null, U = null, SHIP_MODELS = {};
export function initShipFactory(r, uniforms, touch) {
  renderer = r; U = uniforms; TEX_SIZE = touch ? 512 : 1024; GLOW_TEX = glowTexture();
}
export function setShipModels(models) { SHIP_MODELS = models || {}; }

// Api kerucut (shader) + cahaya pendar di titik-titik mesin
function engineFx(g, engines, def, withFlames = true) {
  const flames = [], sprites = [];
  const engCol = new THREE.Color(def.engine);
  const fr = .22 * def.glow * (def.flame ?? 1);
  for (const p of engines) {
    if (withFlames) {
      const fg = new THREE.ConeGeometry(fr, 1, 16, 1, true);
      fg.translate(0, .5, 0); fg.rotateX(Math.PI / 2);
      const fm = new THREE.ShaderMaterial({ vertexShader: FLAME_VS.replace('vY = position.y;', 'vY = position.z;'), fragmentShader: FLAME_FS,
        uniforms: { uColor: { value: engCol }, uPower: { value: 0 }, uTime: U.uTime },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const fl = new THREE.Mesh(fg, fm); fl.position.copy(p); g.add(fl); flames.push(fl);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: engCol.clone().multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(p); sp.scale.setScalar(def.glow * (def.flame ?? 1)); g.add(sp); sprites.push(sp);
  }
  return { flames, sprites };
}

// Pesawat dari model GLB. Peran (extras.role): engine = titik mesin, plume = semburan api bawaan model
// (diskalakan sesuai gas), glow = cakram pijar mesin (warnanya mengikuti gas).
function buildFromModel(def, model) {
  const g = new THREE.Group();
  const inst = model.clone(true);
  inst.position.set(0, 0, 0); inst.quaternion.identity(); inst.scale.setScalar(1);
  g.add(inst);
  const engines = [], plumes = [], glowMats = [];
  inst.traverse((o) => {
    const role = o.userData.role;
    if (role === 'engine') engines.push(o.position.clone());
    else if (role === 'plume') plumes.push(o);
    if (!o.isMesh) return;
    const r = roleOf(o);
    if (r === 'glow') {
      const base = new THREE.Color(def.engine);
      o.material = new THREE.MeshBasicMaterial({ color: base.clone(), side: THREE.DoubleSide });
      glowMats.push({ mat: o.material, base });
    } else if (r === 'plumeMesh') {
      const m = o.material.clone();
      m.blending = THREE.AdditiveBlending; m.depthWrite = false; m.transparent = true;
      if (m.emissiveMap == null && m.map) { m.emissiveMap = m.map; m.emissive = new THREE.Color('#ffffff'); }
      m.emissiveIntensity = 1.4;
      o.material = m;
    } else if (o.material) {
      o.material.envMapIntensity = 1.1;
    }
  });
  const { flames, sprites } = engineFx(g, engines, def, plumes.length === 0);
  return { group: g, flames, sprites, plumes, navLights: [], strobes: [], glowMats, spinners: [], def };
}
export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.75)');
  gr.addColorStop(.45, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const rng = (seed) => { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const gray = (v) => { const c = Math.round(clamp(v, 0, 1) * 255); return `rgb(${c},${c},${c})`; };
const shadeCss = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
function centerY(geo) { geo.computeBoundingBox(); const b = geo.boundingBox; geo.translate(0, -(b.min.y + b.max.y) / 2, 0); return geo; }
function centerX(geo) { geo.computeBoundingBox(); const b = geo.boundingBox; geo.translate(-(b.min.x + b.max.x) / 2, 0, 0); return geo; }
function uvs(geo, su, sv = su) { const a = geo.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * su, a.getY(i) * sv); return geo; }
const aniso = () => Math.min(8, renderer.capabilities.getMaxAnisotropy());
function canvasTex(w, h, draw, srgb = true, wrap = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso();
  return t;
}
function splitPlates(x, y, w, h, d, out, r, min) {
  if (d <= 0 || (w < min * 2 && h < min * 2) || (d < 4 && r() < .22)) { out.push([x, y, w, h]); return; }
  const vert = w > h * 1.3 ? true : h > w * 1.3 ? false : r() < .5;
  if (vert && w >= min * 2) { const s = Math.round(w * (.3 + r() * .4)); splitPlates(x, y, s, h, d - 1, out, r, min); splitPlates(x + s, y, w - s, h, d - 1, out, r, min); }
  else if (!vert && h >= min * 2) { const s = Math.round(h * (.3 + r() * .4)); splitPlates(x, y, w, s, d - 1, out, r, min); splitPlates(x, y + s, w, h - s, d - 1, out, r, min); }
  else out.push([x, y, w, h]);
}
const texCache = {};
function hullTex(key, o) {
  if (texCache[key]) return texCache[key];
  const S = TEX_SIZE, k = S / 1024, r = rng(o.seed);
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const C = mk(), B = mk(), Rg = mk(), E = o.glow ? mk() : null;
  const c = C.getContext('2d'), b = B.getContext('2d'), g = Rg.getContext('2d'), e = E && E.getContext('2d');
  c.fillStyle = o.base; c.fillRect(0, 0, S, S);
  b.fillStyle = gray(.5); b.fillRect(0, 0, S, S);
  g.fillStyle = gray(o.rough); g.fillRect(0, 0, S, S);
  if (e) { e.fillStyle = '#000'; e.fillRect(0, 0, S, S); }
  const plates = [];
  splitPlates(0, 0, S, S, 7, plates, r, (o.min || 48) * k);
  for (const [x, y, w, h] of plates) {
    const acc = o.accent && r() < (o.accentP || .06);
    c.fillStyle = acc ? o.accent : shadeCss(o.base, .9 + r() * .18);
    c.fillRect(x, y, w, h);
    g.fillStyle = gray(o.rough + (r() - .5) * .22); g.fillRect(x, y, w, h);
    b.fillStyle = gray(.5 + (r() - .5) * .08); b.fillRect(x, y, w, h);
    c.strokeStyle = o.line; c.lineWidth = 2 * k; c.strokeRect(x + k, y + k, w - 2 * k, h - 2 * k);
    b.strokeStyle = gray(.15); b.lineWidth = 3 * k; b.strokeRect(x + 1.5 * k, y + 1.5 * k, w - 3 * k, h - 3 * k);
    if (e && r() < .3) {
      e.strokeStyle = o.glow; e.lineWidth = 2.2 * k; e.beginPath();
      if (r() < .5) { e.moveTo(x + 2 * k, y + h - 2 * k); e.lineTo(x + w - 2 * k, y + h - 2 * k); } else { e.moveTo(x + w - 2 * k, y + 2 * k); e.lineTo(x + w - 2 * k, y + h - 2 * k); }
      e.stroke();
    }
    if (w > 70 * k && h > 70 * k && r() < .55) {
      c.fillStyle = shadeCss(o.base, .62); b.fillStyle = gray(.78);
      for (let t = x + 8 * k; t < x + w - 6 * k; t += 14 * k) for (const yy of [y + 6 * k, y + h - 8 * k]) { c.fillRect(t, yy, 2 * k, 2 * k); b.fillRect(t, yy, 2.4 * k, 2.4 * k); }
    }
    if (w > 90 * k && h > 60 * k && r() < .16) {
      const n = 4 + (r() * 5 | 0), vw = w * .5, vx = x + w * .25, vy = y + h * .28;
      for (let i = 0; i < n; i++) { const yy = vy + i * 7 * k; c.fillStyle = shadeCss(o.base, .32); c.fillRect(vx, yy, vw, 3 * k); b.fillStyle = gray(.1); b.fillRect(vx, yy, vw, 3 * k); g.fillStyle = gray(.8); g.fillRect(vx, yy, vw, 3 * k); }
    }
    if (w > 60 * k && h > 40 * k && r() < .07) {
      const hw = w * .4, hh = h * .4, hx = x + (w - hw) / 2, hy = y + (h - hh) / 2;
      c.strokeStyle = shadeCss(o.base, .55); c.lineWidth = 1.5 * k; c.strokeRect(hx, hy, hw, hh);
      b.strokeStyle = gray(.25); b.lineWidth = 2 * k; b.strokeRect(hx, hy, hw, hh);
    }
  }
  for (let i = 0; i < 110; i++) {
    const x = r() * S, y = r() * S, rad = (16 + r() * 90) * k;
    const gr = c.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(18,14,10,${.04 + r() * .06})`); gr.addColorStop(1, 'rgba(18,14,10,0)');
    c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const T = (cv, srgb) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso(); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return (texCache[key] = { map: T(C, true), bump: T(B), rough: T(Rg), emis: E ? T(E, true) : null });
}
function hullMaterial(tex, o = {}) {
  return new THREE.MeshPhysicalMaterial(Object.assign({
    map: tex.map, bumpMap: tex.bump, bumpScale: 1.2, roughnessMap: tex.rough, roughness: 1, metalness: .4,
    clearcoat: .2, clearcoatRoughness: .5,
    emissiveMap: tex.emis || null, emissive: tex.emis ? '#ffffff' : '#000000', emissiveIntensity: tex.emis ? 1 : 0,
  }, o));
}
function decalMat(w, h, draw) {
  return new THREE.MeshStandardMaterial({ map: canvasTex(w, h, draw), transparent: true, alphaTest: .35, roughness: .5, metalness: .1,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}
function nameDecal(text, color = '#1c2330', font = '700 92px "Chakra Petch", sans-serif') {
  return decalMat(1024, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = font; x.textBaseline = 'middle'; x.fillStyle = color; x.fillText(text, 20, h / 2 + 4); });
}
// Pita/garis warna yang dicat di atas lambung (stripe)
function stripeTex(base, stripe, n = 1) {
  return canvasTex(256, 64, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); x.fillStyle = stripe; for (let i = 0; i < n; i++) x.fillRect(0, h * (.15 + i * .5), w, h * .28); }, true, true);
}

export function buildShip(id) {
  const def = SHIPS[id];
  if (SHIP_MODELS[id]) return buildFromModel(def, SHIP_MODELS[id]);
  const g = new THREE.Group();
  const engines = [], navLights = [], strobes = [], glowMats = [], spinners = [];
  const add = (geo, mat, p, r, s, parent = g) => {
    const m = new THREE.Mesh(geo, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    if (r) m.rotation.set(r[0], r[1], r[2]);
    if (s) m.scale.set(s[0], s[1], s[2]);
    parent.add(m); return m;
  };
  const mirrorX = (m) => { const c = m.clone(); c.position.x *= -1; c.scale.x *= -1; c.rotation.y *= -1; c.rotation.z *= -1; m.parent.add(c); return c; };
  const pair = (geo, mat, p, r, s, parent) => { const m = add(geo, mat, p, r, s, parent); mirrorX(m); return m; };
  const zCyl = (rt, rb, h, seg = 20, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open).rotateX(Math.PI / 2);
  const extrude = (shape, depth, bevel = .02, seg = 1) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 24 });
  const flat = (shape, depth, bevel, seg) => centerY(extrude(shape, depth, bevel, seg).rotateX(Math.PI / 2));
  const vert = (shape, depth, bevel, seg) => centerX(extrude(shape, depth, bevel, seg).rotateY(-Math.PI / 2));
  const lamp = (p, color, list, size = .05, parent = g) => {
    const m = add(new THREE.SphereGeometry(size, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4) }), p, null, null, parent);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: new THREE.Color(color).multiplyScalar(1.6), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.setScalar(size * 10); m.add(s); list.push(m); return m;
  };
  const glowDisk = (r, p, color, parent = g) => {
    const base = new THREE.Color(color);
    const mat = new THREE.MeshBasicMaterial({ color: base.clone(), side: THREE.DoubleSide });
    glowMats.push({ mat, base });
    return add(new THREE.CircleGeometry(r, 28), mat, p, null, null, parent);
  };
  const metal = new THREE.MeshStandardMaterial({ color: '#9a98a2', metalness: .9, roughness: .42 });
  const burnt = new THREE.MeshStandardMaterial({ color: '#57506a', metalness: .85, roughness: .45, flatShading: true, side: THREE.DoubleSide });
  const black = new THREE.MeshStandardMaterial({ color: '#060709', roughness: .95, side: THREE.DoubleSide });

  if (id === 'astra') {
    /* ---------- ASTRA SCOUT: fighter putih-oranye, nacelle kembar di punggung, pod meriam ujung sayap ---------- */
    const hull = hullMaterial(hullTex('astra', { seed: 7, base: '#d6dade', line: 'rgba(40,48,58,.55)', rough: .55, accent: '#c3c9cf', accentP: .14, min: 40 }), { metalness: .3, clearcoat: .25 });
    const dark = hullMaterial(hullTex('astra-d', { seed: 11, base: '#3a3f47', line: 'rgba(0,0,0,.6)', rough: .6, min: 34 }), { metalness: .55, clearcoat: .15 });
    const orange = hullMaterial(hullTex('astra-o', { seed: 13, base: '#f07a28', line: 'rgba(80,30,6,.45)', rough: .5, accent: '#e06a1e', accentP: .2, min: 44 }), { metalness: .2, clearcoat: .35 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#0d1d28', metalness: .15, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, emissive: '#123a4c', emissiveIntensity: .5, envMapIntensity: 2.5, flatShading: true });
    const band = new THREE.MeshPhysicalMaterial({ map: stripeTex('#d6dade', '#f07a28', 2), roughness: .5, metalness: .2, clearcoat: .3 });
    // Badan bersegi enam (siluet bersudut seperti referensi) & hidung baji
    const prof = [[0, -2.7], [.22, -2.62], [.38, -2.2], [.5, -1.5], [.56, -.6], [.56, .5], [.5, 1.3], [.38, 1.85], [0, 1.95]].map(([r, y]) => new THREE.Vector2(r, y));
    add(uvs(new THREE.LatheGeometry(prof, 6).rotateX(-Math.PI / 2), 3, 2), hull, [0, 0, 0], [0, 0, Math.PI / 6], [1.15, .62, 1]).geometry.computeVertexNormals();
    // Panel oranye di punggung & samping hidung
    const sh = new THREE.Shape(); sh.moveTo(0, -2.5); sh.lineTo(.34, -2.0); sh.lineTo(.46, -.4); sh.lineTo(.4, 1.2); sh.lineTo(-.4, 1.2); sh.lineTo(-.46, -.4); sh.lineTo(-.34, -2.0); sh.closePath();
    add(uvs(flat(sh, .03, .012), .5), orange, [0, .32, 0], [0, 0, 0], [.95, 1, .95]);
    pair(new THREE.BoxGeometry(.04, .14, 1.6), orange, [.58, -.02, -.9], [0, .09, 0]);
    // Dua tanduk hidung
    pair(zCyl(.03, .045, .7, 8), dark, [.11, -.06, -2.95]);
    pair(zCyl(.012, .012, .3, 6), metal, [.11, -.06, -3.4]);
    // Kanopi bersegi
    add(new THREE.SphereGeometry(.34, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, .3, -1.35], null, [.85, .9, 2.1]);
    for (const dz of [-.35, .2]) add(new THREE.TorusGeometry(.26, .02, 4, 8, Math.PI), dark, [0, .3, -1.35 + dz]);
    // Nacelle mesin kembar di punggung (asupan heksagonal ke depan)
    for (const s of [1, -1]) {
      const nx = .78 * s;
      add(uvs(zCyl(.34, .36, 2.0, 6), 2, 1), band, [nx, .3, .55], [0, 0, Math.PI / 6]);
      add(zCyl(.3, .3, .06, 6, true), black, [nx, .3, -.47], [0, 0, Math.PI / 6]);
      add(new THREE.CircleGeometry(.27, 6), black, [nx, .3, -.45], [0, Math.PI, Math.PI / 6]);
      for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.5, .025, .04), dark, [nx, .3 - .15 + i * .1, -.44]);
      add(zCyl(.3, .25, .35, 16), dark, [nx, .3, 1.68]);
      add(zCyl(.24, .26, .3, 18, true), burnt, [nx, .3, 1.9]);
      glowDisk(.2, [nx, .3, 1.84], def.engine);
      engines.push(new THREE.Vector3(nx, .3, 2.05));
      add(new THREE.BoxGeometry(.5, .06, .9), dark, [nx * .72, .1, .4]); // penyangga nacelle
      // Sirip tegak di belakang nacelle (ujung oranye)
      const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(.75, 0); fs.lineTo(.95, .62); fs.lineTo(.7, .62); fs.closePath();
      const fin = add(vert(fs, .04, .012), hull, [nx + .1 * s, .55, 1.05], [0, 0, -.3 * s]);
      add(new THREE.BoxGeometry(.05, .14, .28), orange, [0, .56, .45], null, null, fin);
    }
    // Sayap sapu ke belakang dengan anhedral
    const ws = new THREE.Shape(); ws.moveTo(.45, -.35); ws.lineTo(2.45, .75); ws.lineTo(2.5, 1.2); ws.lineTo(.45, 1.45); ws.closePath();
    for (const s of [1, -1]) {
      const wg = new THREE.Group(); wg.position.set(0, -.12, 0); wg.rotation.z = -.16 * s; g.add(wg);
      const wm = add(uvs(flat(ws, .07, .025), .45), hull, null, null, [s, 1, 1], wg);
      add(new THREE.BoxGeometry(1.0, .085, .16), orange, [1.55 * s, .01, .22], [0, .52 * s, 0], null, wg);
      add(new THREE.BoxGeometry(.95, .09, .18), orange, [1.4 * s, 0, 1.3], [0, .1 * s, 0], null, wg);
      // Pod meriam ujung sayap + laras panjang
      add(uvs(zCyl(.13, .13, 1.15, 14), 1, 1), hull, [2.55 * s, 0, .75], null, null, wg);
      add(zCyl(.135, .135, .18, 14), orange, [2.55 * s, 0, .3], null, null, wg);
      add(new THREE.ConeGeometry(.13, .3, 14).rotateX(-Math.PI / 2), dark, [2.55 * s, 0, .04], null, null, wg);
      add(zCyl(.035, .035, 1.5, 8), dark, [2.55 * s, 0, -.85], null, null, wg);
      add(zCyl(.05, .05, .1, 8), metal, [2.55 * s, 0, -1.6], null, null, wg);
      lamp([2.55 * s, .12, 1.3], s > 0 ? '#40ff80' : '#ff3040', navLights, .05, wg);
      void wm;
    }
    // Saluran udara perut
    add(new THREE.BoxGeometry(.55, .22, 1.3), dark, [0, -.32, .1]);
    add(new THREE.BoxGeometry(.45, .14, .05), black, [0, -.32, -.56]);
    for (const s of [1, -1]) add(new THREE.BoxGeometry(.01, .12, .55), nameDecal('ASTRA · AS-12', '#f07a28'), [.61 * s, -.08, -1.65], [0, 0, 0]);
    lamp([0, -.42, -1.0], '#ff3040', strobes, .03);
    lamp([0, .62, 1.1], '#ffffff', strobes, .03);
  } else if (id === 'orion') {
    /* ---------- ORION GLIDER: gunmetal, hidung bercabang, pod mesin besar di samping ---------- */
    const hull = hullMaterial(hullTex('orion', { seed: 21, base: '#4a4e57', line: 'rgba(0,0,0,.6)', rough: .45, accent: '#40444c', accentP: .2, min: 36 }), { metalness: .7, clearcoat: .35, clearcoatRoughness: .3 });
    const dark = hullMaterial(hullTex('orion-d', { seed: 23, base: '#1d1f24', line: 'rgba(0,0,0,.7)', rough: .5, min: 28 }), { metalness: .7, clearcoat: .2 });
    const red = new THREE.MeshPhysicalMaterial({ color: '#c41e2a', roughness: .4, metalness: .3, clearcoat: .5, emissive: '#600008', emissiveIntensity: .35 });
    const light = hullMaterial(hullTex('orion-l', { seed: 27, base: '#8d929b', line: 'rgba(0,0,0,.5)', rough: .45, min: 36 }), { metalness: .6, clearcoat: .3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#160608', metalness: .2, roughness: .03, clearcoat: 1, emissive: '#3a0a10', emissiveIntensity: .7, envMapIntensity: 2.4 });
    // Tulang badan tengah
    const prof = [[0, -2.2], [.2, -2.1], [.34, -1.4], [.42, -.4], [.44, .8], [.4, 1.6], [.3, 2.05], [0, 2.1]].map(([r, y]) => new THREE.Vector2(r, y));
    add(uvs(new THREE.LatheGeometry(prof, 8).rotateX(-Math.PI / 2), 3, 2), hull, [0, 0, 0], [0, 0, Math.PI / 8], [1, .7, 1]);
    // Kanopi memanjang di punggung
    add(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass, [0, .22, -1.0], null, [.24, .26, .95]);
    add(new THREE.BoxGeometry(.06, .05, 1.8), dark, [0, .34, .3]);
    // Hidung bercabang dua (dua bilah tajam)
    const blade = new THREE.Shape(); blade.moveTo(0, -1.9); blade.lineTo(.2, -.2); blade.lineTo(.22, .9); blade.lineTo(-.05, .9); blade.lineTo(-.06, -.3); blade.closePath();
    for (const s of [1, -1]) {
      const b = add(flat(blade, .12, .03), hull, [.34 * s, -.04, -2.1], null, [s, 1, 1]);
      add(new THREE.BoxGeometry(.05, .14, .7), red, [.4 * s, .03, -2.15], [0, -.1 * s, 0]);
      void b;
    }
    // Bilah samping panjang (strake)
    const st = new THREE.Shape(); st.moveTo(0, -1.3); st.lineTo(.55, .2); st.lineTo(.6, 1.2); st.lineTo(0, 1.0); st.closePath();
    pair(uvs(flat(st, .05, .015), .5), dark, [.36, -.02, -.4]);
    // Sayap dalam penghubung pod
    const iw = new THREE.Shape(); iw.moveTo(.3, -.3); iw.lineTo(1.1, .2); iw.lineTo(1.1, 1.7); iw.lineTo(.3, 1.9); iw.closePath();
    pair(uvs(flat(iw, .08, .02), .5), hull, [0, -.05, 0]);
    // Pod mesin besar
    for (const s of [1, -1]) {
      const px = 1.3 * s;
      add(uvs(new THREE.BoxGeometry(.62, .55, 2.3), 1, 2), hull, [px, 0, .75]);
      add(new THREE.BoxGeometry(.64, .57, .2), red, [px, 0, .15]);
      add(new THREE.BoxGeometry(.64, .57, .1), red, [px, 0, 1.45]);
      add(new THREE.BoxGeometry(.5, .42, .06), black, [px, 0, -.42]);
      for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(.5, .025, .04), dark, [px, -.15 + i * .1, -.43]);
      add(new THREE.BoxGeometry(.64, .1, 1.6), dark, [px, .3, .9]);
      add(zCyl(.24, .27, .42, 12, true), burnt, [px, 0, 2.05]);
      glowDisk(.22, [px, 0, 1.95], def.engine);
      engines.push(new THREE.Vector3(px, 0, 2.25));
      // Sayap luar dari pod
      const ow = new THREE.Shape(); ow.moveTo(0, 0); ow.lineTo(1.25, .9); ow.lineTo(1.3, 1.25); ow.lineTo(0, 1.35); ow.closePath();
      add(uvs(flat(ow, .06, .02), .5), light, [px + .3 * s, -.05, .45], null, [s, 1, 1]);
      add(new THREE.BoxGeometry(.6, .07, .1), red, [px + 1.05 * s, -.05, 1.62], [0, .25 * s, 0]);
      lamp([px + 1.55 * s, -.05, 1.7], s > 0 ? '#40ff80' : '#ff3040', navLights);
      // Sirip ekor kecil miring keluar
      const tf = new THREE.Shape(); tf.moveTo(0, 0); tf.lineTo(.5, 0); tf.lineTo(.7, .45); tf.lineTo(.45, .45); tf.closePath();
      add(vert(tf, .035, .01), dark, [.42 * s, .3, 1.55], [0, 0, -.5 * s]);
    }
    for (const s of [1, -1]) add(new THREE.BoxGeometry(.01, .13, .62), nameDecal('ORION · OG-15', '#c41e2a'), [1.62 * s, .1, .9]);
    lamp([0, -.32, -.6], '#ff3040', strobes, .03); lamp([0, .45, 1.6], '#ffffff', strobes, .03);
  } else {
    /* ---------- NOVA VOYAGER: delta ramping, sayap sabit, garis neon biru ---------- */
    const skin = hullMaterial(hullTex('nova', { seed: 31, base: '#8c949f', line: 'rgba(10,14,22,.6)', rough: .4, accent: '#7d8590', accentP: .18, min: 34, glow: 'rgba(70,180,255,.9)' }),
      { metalness: .55, clearcoat: .45, clearcoatRoughness: .3, emissiveIntensity: .9 });
    const dark = hullMaterial(hullTex('nova-d', { seed: 37, base: '#262b33', line: 'rgba(0,0,0,.7)', rough: .5, min: 28 }), { metalness: .65, clearcoat: .3 });
    const glowCol = new THREE.Color(def.engine);
    const glowM = new THREE.MeshBasicMaterial({ color: glowCol.clone().multiplyScalar(2.4) });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#06223a', metalness: .15, roughness: .03, clearcoat: 1, emissive: '#1a6aa8', emissiveIntensity: .8, envMapIntensity: 2.5 });
    // Badan delta dengan hidung jarum
    const prof = [[0, -3.9], [.06, -3.6], [.2, -2.6], [.36, -1.4], [.48, -.2], [.5, .9], [.42, 1.7], [.3, 2.05], [0, 2.1]].map(([r, y]) => new THREE.Vector2(r, y));
    add(uvs(new THREE.LatheGeometry(prof, 24).rotateX(-Math.PI / 2), 3, 2), skin, null, null, [1.1, .55, 1]);
    // Sayap sabit (crescent) — diekstrusi lalu ditipiskan ke ujung
    const s = new THREE.Shape();
    s.moveTo(.3, -1.6); s.bezierCurveTo(1.0, -.8, 2.0, .2, 3.1, 1.45); s.lineTo(3.2, 1.85);
    s.bezierCurveTo(2.5, 1.55, 1.7, 1.45, 1.1, 1.7); s.lineTo(.3, 1.9);
    s.lineTo(-.3, 1.9); s.lineTo(-1.1, 1.7); s.bezierCurveTo(-1.7, 1.45, -2.5, 1.55, -3.2, 1.85); s.lineTo(-3.1, 1.45);
    s.bezierCurveTo(-2.0, .2, -1.0, -.8, -.3, -1.6); s.closePath();
    const eg = centerY(new THREE.ExtrudeGeometry(s, { depth: .12, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 3, curveSegments: 32 }).rotateX(Math.PI / 2));
    eg.deleteAttribute('normal'); eg.deleteAttribute('uv');
    const wing = mergeVertices(eg, 1e-4);
    const P = wing.attributes.position, uvA = new Float32Array(P.count * 2);
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), z = P.getZ(i), ax = Math.min(1, Math.abs(x) / 3.2); P.setY(i, P.getY(i) * (1 - .65 * ax) - .12 * ax * ax); uvA[i * 2] = x * .4; uvA[i * 2 + 1] = z * .4; }
    wing.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); wing.computeVertexNormals();
    add(wing, skin, [0, -.1, 0]);
    const wingY = (x) => -.1 + .1 * (1 - .65 * Math.min(1, Math.abs(x) / 3.2)) - .12 * (Math.abs(x) / 3.2) ** 2;
    // Kanopi biru bercahaya
    add(new THREE.SphereGeometry(1, 32, 16), glass, [0, .2, -1.25], null, [.3, .2, .95]);
    add(new THREE.TorusGeometry(.95, .012, 5, 40, Math.PI), dark, [0, .2, -1.25], [0, Math.PI / 2, 0], [1, .21, 1]);
    // Garis energi neon mengikuti badan & sayap
    const tube = (pts, r = .016) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))), 80, r, 6);
    for (const sx of [1, -1]) {
      add(tube([[.12 * sx, .12, -3.0], [.3 * sx, .2, -1.8], [.42 * sx, .24, -.4], [.46 * sx, .22, .9], [.38 * sx, .18, 1.8]]), glowM);
      add(tube([[.5 * sx, wingY(.5) + .06, -1.0], [1.3 * sx, wingY(1.3) + .05, -.2], [2.2 * sx, wingY(2.2) + .04, .7], [3.0 * sx, wingY(3.0) + .03, 1.5]]), glowM);
      add(tube([[1.2 * sx, wingY(1.2) + .05, 1.62], [2.0 * sx, wingY(2.0) + .04, 1.5], [2.9 * sx, wingY(2.9) + .03, 1.72]]), glowM);
      // Pod ujung sayap + antena
      const tx = 3.1 * sx, ty = wingY(3.1);
      add(uvs(zCyl(.09, .09, .9, 12), 1, 1), dark, [tx, ty, 1.55]);
      add(zCyl(.095, .095, .06, 12), glowM, [tx, ty, 1.2]);
      for (const k of [-.03, 0, .03]) add(new THREE.CylinderGeometry(.006, .006, .9, 4).rotateX(Math.PI / 2).rotateY(-.25 * sx), metal, [tx + .12 * sx + k, ty + .05, 2.3]);
      lamp([tx, ty, 1.05], sx > 0 ? '#40ff80' : '#ff3040', navLights, .05);
      // Mesin cincin di punggung belakang
      const ex = .58 * sx;
      add(uvs(zCyl(.24, .28, 1.2, 24), 2, 1), dark, [ex, .25, 1.15]);
      add(new THREE.TorusGeometry(.27, .045, 10, 28), glowM, [ex, .25, 1.78]);
      add(zCyl(.22, .24, .25, 20, true), burnt, [ex, .25, 1.88]);
      glowDisk(.2, [ex, .25, 1.8], def.engine);
      engines.push(new THREE.Vector3(ex, .25, 2.0));
      add(new THREE.ConeGeometry(.24, .4, 24).rotateX(-Math.PI / 2), skin, [ex, .25, .35]);
      // Antena tipis di depan mesin
      add(new THREE.CylinderGeometry(.005, .005, .7, 4), metal, [ex * .6, .55, .7], [.25, 0, .15 * sx]);
    }
    // Sirip tegak tunggal
    const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.lineTo(.9, 0); fs.lineTo(1.25, 1.0); fs.lineTo(.95, 1.0); fs.closePath();
    const fin = add(vert(fs, .05, .015), dark, [0, .2, 1.05]);
    add(new THREE.BoxGeometry(.06, .9, .025), glowM, [0, .5, .95], [.33, 0, 0], null, fin);
    // Lampu biru di perut
    for (const [x, z] of [[.35, -.4], [-.35, -.4], [0, .6]]) lamp([x, -.22, z], def.engine, strobes, .045);
    for (const sx of [1, -1]) add(new THREE.BoxGeometry(.01, .12, .7), nameDecal('NOVA · NV-18', '#bfe6ff'), [.53 * sx, -.02, -.9]);
  }

  // Api mesin & cahaya pendar (model prosedural: ukuran api bawaan, tanpa faktor def.flame)
  const { flames, sprites } = engineFx(g, engines, Object.assign({}, def, { flame: 1 }));
  return { group: g, flames, sprites, plumes: [], navLights, strobes, glowMats, spinners, def };
}
export { smooth };

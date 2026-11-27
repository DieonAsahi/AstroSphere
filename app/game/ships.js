// Pesawat (menghadap −Z) — hanya model GLB yang disiapkan (public/models/ships, lihat scripts/optimize-models.mjs):
//   astra ← Space Shuttle Discovery, orion ← Stealthy Space Tato, nova ← SA-23 Starfury.
// Model prosedural lama sudah dihapus: selama GLB belum selesai diunduh, pesawat berupa grup kosong
// (lihat `pending`), lalu engine menukarnya dengan model GLB begitu siap — tidak pernah ada dua model sekaligus.
//
// Api mesin: dua lapis kerucut "lathe" ber-shader (inti panas + selubung lembut) yang bergoyang, berdenyut,
// dan bergolak oleh derau; panjang/terang mengikuti gas, berlian kejut muncul saat turbo.
import * as THREE from 'three';
import { JET_VS, JET_FS } from './shaders.js';
import { roleOf } from './models.js';
import { SHIPS } from '../data/ships.js';

let U = null, GLOW_TEX = null, SHIP_MODELS = {};
export function initShipFactory(_renderer, uniforms) {
  U = uniforms; GLOW_TEX = glowTexture();
}
export function setShipModels(models) { SHIP_MODELS = models || {}; }

// Profil semburan (sumbu +Z, panjang 1): melebar sedikit setelah nosel lalu meruncing ke ujung.
let JET_GEO = null;
function jetGeometry() {
  if (JET_GEO) return JET_GEO;
  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push(new THREE.Vector2(Math.max(1e-3, (1 + .55 * t) * Math.pow(1 - t, .62)), t));
  }
  const g = new THREE.LatheGeometry(pts, 24);
  g.rotateX(Math.PI / 2); // sumbu Y lathe → +Z (ke belakang pesawat)
  // atribut t (0 = nosel, 1 = ujung) agar shader tidak bergantung pada skala
  const pos = g.attributes.position, t = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) t[i] = pos.getZ(i);
  g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
  return (JET_GEO = g);
}

function jetMaterial(color, layer, seed) {
  return new THREE.ShaderMaterial({
    vertexShader: JET_VS, fragmentShader: JET_FS,
    uniforms: {
      uColor: { value: color }, uPower: { value: 0 }, uBoost: { value: 0 }, uTime: U.uTime,
      uLayer: { value: layer }, uSeed: { value: seed }, uRad: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

// Api + cahaya pendar di setiap titik mesin
function engineFx(g, engines, def) {
  const flames = [], sprites = [];
  const engCol = new THREE.Color(def.engine);
  const fr = .22 * def.glow * (def.flame ?? 1);
  engines.forEach((p, i) => {
    const jet = new THREE.Group(); jet.position.copy(p);
    const core = new THREE.Mesh(jetGeometry(), jetMaterial(engCol, 0, i * 1.7));
    const halo = new THREE.Mesh(jetGeometry(), jetMaterial(engCol, 1, i * 1.7 + .6));
    core.renderOrder = 2; halo.renderOrder = 1;
    core.frustumCulled = halo.frustumCulled = false; // vertex shader menggeser verteks keluar dari bounding box
    jet.add(halo, core); g.add(jet);
    flames.push({ jet, core, halo, r: fr, seed: i * 1.7 });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: engCol.clone().multiplyScalar(2.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sp.position.copy(p); sp.scale.setScalar(def.glow * (def.flame ?? 1)); g.add(sp); sprites.push(sp);
  });
  return { flames, sprites, radius: fr };
}

/**
 * Perbarui api tiap frame.
 * @param {object} sm  hasil buildShip
 * @param {number} pw  daya total (gas + turbo), 0..~1.8
 * @param {number} thrust  tuas gas 0..1
 * @param {number} boost  turbo 0..1
 * @param {number} time  detik
 */
export function updateShipFx(sm, pw, thrust, boost, time) {
  const def = sm.def;
  for (const f of sm.flames) {
    // denyut halus dua frekuensi + sedikit beda fase per mesin → tidak kaku/serempak
    const pulse = 1 + Math.sin(time * 31 + f.seed * 3) * .035 + Math.sin(time * 53 + f.seed) * .025;
    const len = (.55 + thrust * 1.7 + boost * 2.9) * def.glow * pulse;
    const rad = f.r * (.8 + Math.min(1, pw) * .35 + boost * .25);
    const vis = pw > .02;
    f.jet.visible = vis;
    f.core.scale.set(rad, rad, len);
    f.halo.scale.set(rad * 1.75, rad * 1.75, len * 1.35);
    for (const m of [f.core.material, f.halo.material]) {
      m.uniforms.uPower.value = Math.min(1.5, .12 + pw);
      m.uniforms.uBoost.value = boost;
      m.uniforms.uRad.value = rad;
    }
  }
  for (const p of sm.plumes || []) p.visible = false; // semburan bawaan model diganti api shader
  const flick = .92 + Math.sin(time * 43) * .05 + Math.sin(time * 71) * .03;
  for (const s of sm.sprites) s.scale.setScalar(def.glow * (def.flame ?? 1) * (.42 + pw * .55) * flick);
  for (const gm of sm.glowMats) gm.mat.color.copy(gm.base).multiplyScalar(.5 + pw * 2.6);
}

// Pesawat dari model GLB. Peran (extras.role): engine = titik mesin, plume = semburan api bawaan model (disembunyikan),
// glow = cakram pijar mesin (warnanya mengikuti gas).
function buildFromModel(def, model) {
  const g = new THREE.Group();
  g.userData.isShip = true;
  const inst = model.clone(true);
  inst.position.set(0, 0, 0); inst.quaternion.identity(); inst.scale.setScalar(1);
  g.add(inst);
  const engines = [], plumes = [], glowMats = [];
  inst.traverse((o) => {
    const role = o.userData.role;
    if (role === 'engine') engines.push(o.position.clone());
    else if (role === 'plume') { plumes.push(o); o.visible = false; }
    if (!o.isMesh) return;
    const r = roleOf(o);
    if (r === 'glow') {
      const base = new THREE.Color(def.engine);
      o.material = new THREE.MeshBasicMaterial({ color: base.clone(), side: THREE.DoubleSide });
      glowMats.push({ mat: o.material, base });
    } else if (o.material && r !== 'plumeMesh') {
      o.material.envMapIntensity = 1.1;
      if (o.material.map) {
        o.material.map.colorSpace = THREE.SRGBColorSpace;
        o.material.map.needsUpdate = true;
      }
    }
  });
  if (!engines.length) {
    engines.push(new THREE.Vector3(0, 0, 2.4));
  }
  const { flames, sprites, radius } = engineFx(g, engines, def);
  return { group: g, flames, sprites, plumes, glowMats, engines, radius, def, pending: false };
}

function buildFallbackShip(def) {
  const g = new THREE.Group();
  g.userData.isShip = true;
  const geo = new THREE.ConeGeometry(0.8, 4.5, 6);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: def.color || '#38bdf8', roughness: 0.35, metalness: 0.8 });
  const m = new THREE.Mesh(geo, mat);
  g.add(m);
  const engines = [new THREE.Vector3(0, 0, 2.2)];
  const { flames, sprites, radius } = engineFx(g, engines, def);
  return { group: g, flames, sprites, plumes: [], glowMats: [], engines, radius, def, pending: true };
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

export function buildShip(id) {
  const def = SHIPS[id] || SHIPS.astra;
  if (SHIP_MODELS[def.id]) return buildFromModel(def, SHIP_MODELS[def.id]);
  return buildFallbackShip(def);
}

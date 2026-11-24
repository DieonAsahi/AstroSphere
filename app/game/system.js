// Pembangun tata surya: Matahari, planet (orbit Kepler + rotasi sumbu), satelit, cincin, sabuk asteroid,
// garis orbit, sumbu rotasi, dan POI sejarah yang menempel pada permukaan (body-fixed).
// Semua posisi & orientasi adalah FUNGSI WAKTU SIMULASI (hari), bukan akumulasi per frame (PRD §5.4, §6).
// Planet & Bulan memakai model GLB unduhan (public/models/planets) bila tersedia; tanpa model → shader prosedural.
import * as THREE from 'three';
import { PLANET_VS, PLANET_FS, ATMO_VS, ATMO_FS, RING_VS, RING_FS, SUN_VS, SUN_FS, CORONA_VS, CORONA_FS, TPLANET_VS, TPLANET_FS, TRING_FS } from './shaders.js';
import { DEG, TAU } from './util.js';
import { roleOf, whiteTexture, texMatrix } from './models.js';
import { SUN, PLANETS, MOONS, BELT, radiusOf } from '../data/solarSystem.js';
import { getEarthEventCoords } from '../data/earthHistoryCoords.js';

const col3 = (h) => new THREE.Color(h);

// Planet dari model GLB (sudah dinormalkan: radius 1, utara +Y, bujur 0° +X — lihat scripts/optimize-models.mjs).
// Material model diganti shader bertekstur yang diterangi Matahari (TPLANET_FS / TRING_FS).
// o: { sunPos, sunColor (objek uniform), center (Vector3 hidup), atmo (Color), ring {inner, outer, seed} dalam satuan R | null,
//      ringN, R, fragmentShader?, extraUniforms? }
export function texturedPlanet(model, o) {
  const group = new THREE.Group();
  const inst = model.clone(true);
  inst.position.set(0, 0, 0); inst.quaternion.identity(); inst.scale.setScalar(1);
  group.add(inst);
  const ringIn = o.ring ? o.ring.inner * o.R : 0, ringOut = o.ring ? o.ring.outer * o.R : 1;
  inst.traverse((m) => {
    if (!m.isMesh) return;
    const src = m.material, role = roleOf(m);
    const map = src.map || whiteTexture();
    if (role === 'ring') {
      const blend = !!src.transparent;
      m.material = new THREE.ShaderMaterial({ vertexShader: TPLANET_VS, fragmentShader: TRING_FS,
        uniforms: { uMap: { value: map }, uMapM: { value: texMatrix(src.map) }, uTint: { value: src.color.clone() }, uOpacity: { value: src.opacity ?? 1 },
          uAlphaTest: { value: src.alphaTest > 0 ? src.alphaTest : (blend ? .01 : 0) }, uCenter: { value: o.center }, uPR: { value: o.R },
          uSunPos: o.sunPos, uRingN: { value: o.ringN }, uSunColor: o.sunColor },
        transparent: blend, depthWrite: !blend, side: THREE.DoubleSide });
      m.renderOrder = 1;
    } else {
      const cloud = role === 'cloud';
      m.material = new THREE.ShaderMaterial({ vertexShader: TPLANET_VS, fragmentShader: o.fragmentShader || TPLANET_FS,
        uniforms: Object.assign({
          uMap: { value: map }, uMapM: { value: texMatrix(src.map) }, uTint: { value: src.color.clone() }, uOpacity: { value: src.opacity ?? 1 }, uCloud: { value: cloud ? 1 : 0 },
          uNormalMap: { value: src.normalMap || whiteTexture() }, uHasNormal: { value: src.normalMap ? 1 : 0 },
          uNormalScale: { value: src.normalScale ? src.normalScale.clone() : new THREE.Vector2(1, 1) },
          uSunPos: o.sunPos, uSunColor: o.sunColor, uAtmo: { value: o.atmo }, uCenter: { value: o.center },
          uHasRing: { value: o.ring ? 1 : 0 }, uRingIn: { value: ringIn }, uRingOut: { value: ringOut }, uRingN: { value: o.ringN }, uRingSeed: { value: o.ring?.seed ?? 0 },
        }, o.extraUniforms || {}),
        transparent: cloud, depthWrite: !cloud });
      if (cloud) m.renderOrder = 1;
    }
  });
  return group;
}

/**
 * Mengganti mesh planet prosedural dengan model GLB bertekstur secara mulus (Lazy Upgrade).
 */
export function upgradePlanetModel(body, model, U) {
  if (!body || !model || body.textured) return;
  const mu = model.userData || {};
  const ring = mu.ringOuter > 0 ? { inner: mu.ringInner, outer: mu.ringOuter, seed: body.ring?.seed ?? 1.7 } : body.ring;
  if (ring && body.ringMesh && mu.ringOuter > 0) {
    body.axis.remove(body.ringMesh);
    body.ringMesh = null;
  }
  const R = body.radius;
  const newSpinMesh = texturedPlanet(model, {
    sunPos: U.uSunPos,
    sunColor: U.uSunColor,
    center: body.pos,
    atmo: col3(body.atmo).multiplyScalar(body.atmoStr ? 1 : 0),
    ring,
    ringN: body.ringN,
    R,
  });
  newSpinMesh.scale.setScalar(R);
  newSpinMesh.rotation.copy(body.spinMesh.rotation);

  // Pertahankan wadah POI permukaan
  if (body.poiRoot) {
    newSpinMesh.add(body.poiRoot);
  }

  body.axis.remove(body.spinMesh);
  body.axis.add(newSpinMesh);

  // Bersihkan geometri dan material mesh prosedural lama dari memori WebGL
  const oldSpinMesh = body.spinMesh;
  if (oldSpinMesh) {
    if (oldSpinMesh.geometry) oldSpinMesh.geometry.dispose();
    if (oldSpinMesh.material) {
      if (Array.isArray(oldSpinMesh.material)) {
        oldSpinMesh.material.forEach((m) => m && m.dispose && m.dispose());
      } else if (oldSpinMesh.material.dispose) {
        oldSpinMesh.material.dispose();
      }
    }
  }

  body.spinMesh = newSpinMesh;
  body.mesh = newSpinMesh;
  body.textured = true;
  body.ring = ring;
}

// ---------- Model orbit Kepler (bidang orbit → ekliptika → Three.js Y-up: (x, y, z)dom → (x, z, −y)) ----------
function solveKepler(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 12; k++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d; if (Math.abs(d) < 1e-10) break;
  }
  return Number.isFinite(E) ? E : M; // fallback yang diketahui, tidak meneruskan NaN
}
function orbitToWorld(d, E, out) {
  const a = d.a, e = d.e;
  const xo = a * (Math.cos(E) - e), yo = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = d.peri * DEG, O = d.node * DEG, i = d.i * DEG;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), ci = Math.cos(i), si = Math.sin(i);
  const x = (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo;
  const y = (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo;
  const z = (sw * si) * xo + (cw * si) * yo;
  return out.set(x, z, -y);
}
export function planetPosition(d, tDays, out) {
  const n = TAU / (d.periodYears * 365.25);
  const M = ((d.M0 * DEG + n * tDays) % TAU + TAU) % TAU;
  return orbitToWorld(d, solveKepler(M, d.e), out);
}

export function buildSystem(scene, U, { touch, models = null }) {
  const bodies = [], byId = {};
  const sunLight = new THREE.DirectionalLight('#fff1dc', 2.6);
  scene.add(sunLight, sunLight.target);
  scene.add(new THREE.HemisphereLight('#4a62a0', '#0b0612', .5));

  // Matahari (tidak berskala)
  const sunR = SUN.radius;
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.ShaderMaterial({ vertexShader: SUN_VS, fragmentShader: SUN_FS, uniforms: { uTime: U.uTime } }));
  sun.scale.setScalar(sunR); scene.add(sun);
  const coronaScale = 6;
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: CORONA_VS, fragmentShader: CORONA_FS,
    uniforms: { uTime: U.uTime, uScale: { value: coronaScale } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(sunR * coronaScale); scene.add(corona);
  const sunBody = Object.assign({}, SUN, { pos: new THREE.Vector3(), isSun: true, mesh: sun, corona, approach: sunR * 3.2, spinMesh: sun });
  bodies.push(sunBody); byId[SUN.id] = sunBody;

  const geoHi = new THREE.SphereGeometry(1, touch ? 96 : 160, touch ? 64 : 100);
  const geoLo = new THREE.SphereGeometry(1, 72, 48);
  const geoAtm = new THREE.SphereGeometry(1, 96, 64);
  const orbitGroup = new THREE.Group(); scene.add(orbitGroup);
  const axisMat = new THREE.LineDashedMaterial({ color: '#a8edeb', dashSize: 1, gapSize: .6, transparent: true, opacity: .85, depthWrite: false });

  const makeBody = (d, isMoon) => {
    const R = radiusOf(d);
    const pos = new THREE.Vector3();
    const holder = new THREE.Group();          // translasi (revolusi)
    const axis = new THREE.Group();            // orientasi sumbu (kemiringan) — tidak ikut berputar
    axis.rotation.set(0, 0, (d.tilt || 0) * DEG);
    holder.add(axis); scene.add(holder);
    const ringN = new THREE.Vector3(0, 1, 0).applyEuler(axis.rotation);
    const model = models?.planets?.[d.id] || null;
    const mu = model ? model.userData : null;
    // Model bercincin membawa mesh cincinnya sendiri; jari-jari dari model dipakai untuk bayangan cincin & kamera.
    const ring = model ? (mu.ringOuter > 0 ? { inner: mu.ringInner, outer: mu.ringOuter, seed: d.ring?.seed ?? 1.7 } : null) : d.ring;
    let spinMesh;
    if (model) {
      spinMesh = texturedPlanet(model, { sunPos: U.uSunPos, sunColor: U.uSunColor, center: pos, atmo: col3(d.atmo).multiplyScalar(d.atmoStr ? 1 : 0), ring, ringN, R });
    } else {
      const mat = new THREE.ShaderMaterial({
        vertexShader: PLANET_VS, fragmentShader: PLANET_FS,
        uniforms: {
          uTime: U.uTime, uSunPos: U.uSunPos, uSunColor: U.uSunColor, uOct: U.uOct,
          uType: { value: d.type }, uC1: { value: col3(d.colors[0]) }, uC2: { value: col3(d.colors[1]) }, uC3: { value: col3(d.colors[2]) },
          uC4: { value: col3(d.colors[3]) }, uC5: { value: col3(d.colors[4]) },
          uSeed: { value: d.seed }, uRadius: { value: R }, uSea: { value: d.sea ?? .5 }, uClouds: { value: d.clouds ?? 0 },
          uCity: { value: d.city ?? 0 }, uBand: { value: d.band ?? 16 }, uStorm: { value: d.storm ?? 0 }, uBump: { value: d.bump ?? .03 },
          uAtmo: { value: col3(d.atmo).multiplyScalar(d.atmoStr ? 1 : 0) },
          uHasRing: { value: ring ? 1 : 0 }, uRingIn: { value: ring ? ring.inner * R : 0 }, uRingOut: { value: ring ? ring.outer * R : 1 },
          uRingN: { value: ringN }, uRingSeed: { value: ring ? ring.seed : 0 },
        },
      });
      spinMesh = new THREE.Mesh(isMoon ? geoLo : geoHi, mat);
    }
    spinMesh.scale.setScalar(R);
    axis.add(spinMesh);
    let atm = null, ringMesh = null;
    if (d.atmoStr > 0) {
      const Ra = R * d.atmoScale;
      atm = new THREE.Mesh(geoAtm, new THREE.ShaderMaterial({ vertexShader: ATMO_VS, fragmentShader: ATMO_FS,
        uniforms: { uR: { value: R }, uRa: { value: Ra }, uColor: { value: col3(d.atmo) }, uSunset: { value: col3('#ff8a4a') }, uSunPos: U.uSunPos, uStrength: { value: d.atmoStr } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      atm.scale.setScalar(Ra); atm.renderOrder = 2; axis.add(atm);
    }
    if (ring && !model) {
      const rg = new THREE.RingGeometry(ring.inner * R, ring.outer * R, 256, 6);
      ringMesh = new THREE.Mesh(rg, new THREE.ShaderMaterial({ vertexShader: RING_VS, fragmentShader: RING_FS,
        uniforms: { uCenter: { value: pos }, uIn: { value: ring.inner * R }, uOut: { value: ring.outer * R }, uSeed: { value: ring.seed },
          uPR: { value: R }, uOpacity: { value: ring.opacity }, uColor: { value: col3(ring.color) }, uColor2: { value: col3(ring.color2) },
          uSunPos: U.uSunPos, uRingN: { value: ringN }, uSunColor: U.uSunColor },
        transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      ringMesh.rotation.x = -Math.PI / 2; ringMesh.renderOrder = 1; axis.add(ringMesh);
    }
    // Garis sumbu rotasi (mengikuti orientasi fisik, bukan normal tekstur)
    const ax = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -R * 1.7, 0), new THREE.Vector3(0, R * 1.7, 0)]), axisMat.clone());
    ax.material.dashSize = R * .12; ax.material.gapSize = R * .07; ax.computeLineDistances(); ax.visible = false; axis.add(ax);
    // Wadah POI permukaan: anak dari mesh yang berputar (body-fixed)
    const poiRoot = new THREE.Group(); spinMesh.add(poiRoot);
    const body = Object.assign({}, d, { radius: R, pos, holder, axis, spinMesh, mesh: spinMesh, atm, ring, ringMesh, axisLine: ax, poiRoot, ringN, textured: !!model,
      color: d.color, approach: R * 6 + 60, isMoon: !!isMoon, spinPhase0: (d.seed * 1.37) % TAU });
    bodies.push(body); byId[d.id] = body;
    return body;
  };

  for (const d of PLANETS) {
    const b = makeBody(d, false);
    // Garis orbit elips dari model yang sama dengan posisi planet (Matahari di fokus)
    const pts = [], tmp = new THREE.Vector3();
    for (let k = 0; k <= 360; k++) pts.push(orbitToWorld(d, k / 360 * TAU, tmp).clone());
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#a8edeb', transparent: true, opacity: .12, depthWrite: false }));
    line.userData.id = d.id; orbitGroup.add(line); b.orbitLine = line;
    b.orbitPts = pts;
  }
  for (const m of MOONS) makeBody(m, true);

  // Sabuk asteroid
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pa = geo.attributes.position, v = new THREE.Vector3();
  const hsh = (x, y, z) => { const s = Math.sin(Math.round(x * 1000) * 12.9898 + Math.round(y * 1000) * 78.233 + Math.round(z * 1000) * 37.719) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); v.multiplyScalar(.72 + .5 * hsh(v.x, v.y, v.z)); pa.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals();
  const N = touch ? 1400 : 3000;
  const belt = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .95, metalness: .05, flatShading: true }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const mid = (BELT.inner + BELT.outer) / 2, w = (BELT.outer - BELT.inner) / 2;
  for (let i = 0; i < N; i++) {
    const a = Math.random() * TAU, r = mid + gauss() * w;
    p.set(Math.cos(a) * r, gauss() * BELT.half * .7, Math.sin(a) * r);
    e.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3); q.setFromEuler(e);
    const k = .5 + Math.pow(Math.random(), 5) * 9;
    s.set(k * (.7 + Math.random() * .6), k * (.6 + Math.random() * .5), k * (.7 + Math.random() * .6));
    m4.compose(p, q, s); belt.setMatrixAt(i, m4);
    c.setHSL(.07 + Math.random() * .04, .12 + Math.random() * .15, .22 + Math.random() * .2); belt.setColorAt(i, c);
  }
  belt.computeBoundingSphere(); scene.add(belt);

  return { bodies, byId, sunLight, orbitGroup, belt };
}

// Evaluasi posisi & orientasi SEMUA benda dari satu waktu (hari) — dipanggil tiap frame.
const _t = new THREE.Vector3();
export function updateBodies(bodies, byId, tDays) {
  for (const b of bodies) {
    if (b.isSun) { b.mesh.rotation.y = TAU * tDays / b.rotationDays; continue; }
    if (b.isMoon) continue;
    planetPosition(b, tDays, b.pos);
    b.holder.position.copy(b.pos);
    b.spinMesh.rotation.y = b.spinPhase0 + TAU * tDays / b.rotationDays;
  }
  for (const b of bodies) {
    if (!b.isMoon) continue;
    const p = byId[b.parent];
    const a = b.angle + TAU * tDays / b.orbitDays;
    _t.set(Math.cos(a) * b.orbit, 0, Math.sin(a) * b.orbit).applyAxisAngle(_x, b.incl * DEG);
    b.pos.copy(p.pos).add(_t);
    b.holder.position.copy(b.pos);
    // rotasi terkunci pasang surut: bujur 0° (sisi dekat, +X lokal) selalu menghadap induk
    b.spinMesh.rotation.y = Math.PI - a;
  }
}
const _x = new THREE.Vector3(1, 0, 0);

// POI permukaan dari lintang/bujur (body-fixed, ikut rotasi planet)
export function latLonToLocal(lat, lon, r = 1.004) {
  const la = lat * DEG, lo = lon * DEG;
  return new THREE.Vector3(Math.cos(la) * Math.cos(lo) * r, Math.sin(la) * r, -Math.cos(la) * Math.sin(lo) * r);
}

// Menghitung koordinat bola deterministik dengan prioritas koordinat geografis Bumi akurat & rumus Fibonacci Sphere
export function getEventCoords(e, index = 0, total = 30) {
  if (e && Number.isFinite(e.lat) && Number.isFinite(e.lon)) {
    return { lat: e.lat, lon: e.lon, isCalculated: false };
  }
  const earthCoords = getEarthEventCoords(e);
  if (earthCoords) {
    return { lat: earthCoords.lat, lon: earthCoords.lon, isCalculated: false };
  }
  let idx = index;
  if (e && typeof e.id === 'string') {
    let hash = 0;
    for (let i = 0; i < e.id.length; i++) {
      hash = ((hash << 5) - hash) + e.id.charCodeAt(i);
      hash |= 0;
    }
    idx = Math.abs(hash);
  }
  const n = Math.max(total, 24);
  const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio ~1.6180339887
  const goldenAngle = (2 - phi) * (2 * Math.PI); // ~2.399963 rad
  const step = (idx % n) / n;
  const y = (step * 1.64) - 0.82; // Hindari kutub langsung
  const radiusAtY = Math.sqrt(Math.max(0.01, 1 - y * y));
  const theta = (idx % n) * goldenAngle;
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  const lat = Math.asin(y) * (180 / Math.PI);
  const lon = Math.atan2(z, x) * (180 / Math.PI);
  return { lat, lon, isCalculated: true };
}

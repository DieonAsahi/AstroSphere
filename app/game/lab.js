// Laboratorium Fenomena (PRD §8–9): Matahari, Bumi, Bulan dalam satu model fisik yang konsisten (tidak berskala).
// - Peneduhan permukaan dihitung per piksel dari tumpang-tindih cakram sudut sumber & penghalang (PRD §8.3),
//   sehingga bayangan tetap benar dari semua POV, juga saat volume bayangan dimatikan.
// - Volume umbra/penumbra dibangun di ruang dunia dari garis Matahari→penghalang (bukan billboard).
// - phenomenonTime lokal; mengganti POV tidak mengubah fase.
// - Bumi & Bulan memakai model GLB bertekstur yang sama dengan tata surya (bila tersedia).
import * as THREE from 'three';
import { PLANET_VS, PLANET_FS, ATMO_VS, ATMO_FS, SUN_VS, SUN_FS, CORONA_VS, CORONA_FS, TPLANET_FS } from './shaders.js';
import { clamp, damp, DEG } from './util.js';
import { texturedPlanet } from './system.js';

export const LAB_DURATION = 120; // detik skenario (02:00)
const SUN_D = 1400, SUN_R = 80, EARTH_R = 30, MOON_R = 8.2, MOON_ORBIT = 110;

const ECLIPSE_GLSL = /* glsl */`
uniform vec3 uSrcPos; uniform float uSrcR; uniform vec3 uOccPos; uniform float uOccR; uniform float uRed;
float circleOverlap(float r1, float r2, float d){
  if (d >= r1 + r2) return 0.0;
  if (d <= abs(r1 - r2)) { float r = min(r1, r2); return 3.14159265 * r * r; }
  float a = r1*r1*acos(clamp((d*d + r1*r1 - r2*r2)/(2.0*d*r1), -1.0, 1.0));
  float b = r2*r2*acos(clamp((d*d + r2*r2 - r1*r1)/(2.0*d*r2), -1.0, 1.0));
  float c = 0.5*sqrt(max(0.0, (-d+r1+r2)*(d+r1-r2)*(d-r1+r2)*(d+r1+r2)));
  return a + b - c;
}
// x = bagian cakram Matahari yang masih terlihat dari P (1 = terang penuh), y = kedalaman di umbra (0 tepi … 1 sumbu)
vec2 eclipseInfo(vec3 P){
  vec3 toS = uSrcPos - P, toO = uOccPos - P;
  float dS = length(toS), dO = length(toO);
  if (dO >= dS || dot(toS, toO) <= 0.0) return vec2(1.0, 0.0);
  float aS = asin(clamp(uSrcR / dS, 0.0, 1.0));
  float aO = asin(clamp(uOccR / dO, 0.0, 1.0));
  float del = acos(clamp(dot(toS / dS, toO / dO), -1.0, 1.0));
  float light = clamp(1.0 - circleOverlap(aS, aO, del) / (3.14159265 * aS * aS), 0.0, 1.0);
  float deep = aO > aS ? clamp((aO - aS - del) / (aO - aS), 0.0, 1.0) : 0.0;
  return vec2(light, deep);
}
// Bulan merah: cahaya Matahari yang dibiaskan atmosfer Bumi ("semua matahari terbenam" sekaligus), dikalikan
// warna permukaan Bulan sehingga kawah & maria tetap terlihat. Lebih terang/jingga di tepi umbra, merah tua di tengah,
// plus pinggiran kebiruan tipis (ozon) tepat di batas umbra.
vec3 umbraLight(vec2 eI){
  float hid = 1.0 - eI.x;
  vec3 c = mix(vec3(0.60, 0.20, 0.06), vec3(0.26, 0.055, 0.018), smoothstep(0.0, 0.85, eI.y));
  float fringe = smoothstep(0.86, 0.985, hid) * (1.0 - smoothstep(0.985, 1.0, hid));
  return c * smoothstep(0.55, 1.0, hid) + vec3(0.03, 0.09, 0.12) * fringe;
}
`;
const LAB_FS = PLANET_FS
  .replace('void main(){', ECLIPSE_GLSL + '\nvoid main(){')
  .replace('diff *= rs;', 'vec2 eI = eclipseInfo(vWorldPos); float eL = eI.x; diff *= rs * eL;')
  .replace('col += emis;', 'col += emis; col += uRed * alb * umbraLight(eI) * term;');
const LAB_TFS = TPLANET_FS
  .replace('void main(){', ECLIPSE_GLSL + '\nvoid main(){')
  .replace('diff *= rs;', 'vec2 eI = eclipseInfo(vWorldPos); float eL = eI.x; diff *= rs * eL;')
  .replace('gl_FragColor = vec4(col, a);', 'col += uRed * alb * umbraLight(eI) * term * 1.6;\n  gl_FragColor = vec4(col, a);');

// Versi JS dari rumus yang sama → status gerhana di titik pengamat (tidak bergantung kamera)
export function eclipseAt(P, S, Rs, O, Ro) {
  const toS = S.clone().sub(P), toO = O.clone().sub(P);
  const dS = toS.length(), dO = toO.length();
  if (dO >= dS || toS.dot(toO) <= 0) return { light: 1, type: 'none' };
  const aS = Math.asin(clamp(Rs / dS, 0, 1)), aO = Math.asin(clamp(Ro / dO, 0, 1));
  const del = Math.acos(clamp(toS.divideScalar(dS).dot(toO.divideScalar(dO)), -1, 1));
  if (del >= aS + aO) return { light: 1, type: 'none' };
  let A;
  if (del <= Math.abs(aS - aO)) A = Math.PI * Math.min(aS, aO) ** 2;
  else {
    const r1 = aS, r2 = aO, d = del;
    A = r1 * r1 * Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)) + r2 * r2 * Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1))
      - .5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  }
  const light = clamp(1 - A / (Math.PI * aS * aS), 0, 1);
  const type = del <= aO - aS ? 'total' : del <= aS - aO ? 'cincin' : 'sebagian';
  return { light, type, covered: 1 - light };
}

function circleArea(r1, r2, d) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1));
  const b = r2 * r2 * Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
  return a + b - .5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
}

export function createLab(renderer, mainScene, uTime, models = null) {
  const scene = new THREE.Scene();
  scene.background = mainScene.background; scene.environment = mainScene.environment; scene.environmentIntensity = 1.2;
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .5, 20000);
  const sunPos = new THREE.Vector3(-SUN_D, 0, 0);
  const uSun = { value: sunPos };
  const sunColor = { value: new THREE.Color('#fff3e2') };
  scene.add(new THREE.AmbientLight('#26324a', .25));

  const sun = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ vertexShader: SUN_VS, fragmentShader: SUN_FS, uniforms: { uTime } }));
  sun.scale.setScalar(SUN_R); sun.position.copy(sunPos); scene.add(sun);
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: CORONA_VS, fragmentShader: CORONA_FS,
    uniforms: { uTime, uScale: { value: 5 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  corona.scale.setScalar(SUN_R * 5); corona.position.copy(sunPos); scene.add(corona);

  const planetMat = (o, occ, red = { value: 0 }) => new THREE.ShaderMaterial({ vertexShader: PLANET_VS, fragmentShader: LAB_FS, uniforms: {
    uTime, uSunPos: uSun, uSunColor: sunColor, uOct: { value: 5 },
    uType: { value: o.type }, uC1: { value: new THREE.Color(o.c[0]) }, uC2: { value: new THREE.Color(o.c[1]) }, uC3: { value: new THREE.Color(o.c[2]) }, uC4: { value: new THREE.Color(o.c[3]) }, uC5: { value: new THREE.Color(o.c[4]) },
    uSeed: { value: o.seed }, uRadius: { value: o.r }, uSea: { value: o.sea ?? .5 }, uClouds: { value: o.clouds ?? 0 }, uCity: { value: o.city ?? 0 },
    uBand: { value: 16 }, uStorm: { value: 0 }, uBump: { value: o.bump }, uAtmo: { value: new THREE.Color(o.atmo || '#000') },
    uHasRing: { value: 0 }, uRingIn: { value: 0 }, uRingOut: { value: 1 }, uRingN: { value: new THREE.Vector3(0, 1, 0) }, uRingSeed: { value: 0 },
    uSrcPos: uSun, uSrcR: { value: SUN_R }, uOccPos: { value: occ }, uOccR: { value: o.occR }, uRed: red,
  } });
  // Versi bertekstur: model GLB yang sama dengan tata surya + peneduhan gerhana per piksel
  const labTextured = (model, r, center, occ, occR, atmo, red = { value: 0 }) => texturedPlanet(model, {
    sunPos: uSun, sunColor, center, atmo: new THREE.Color(atmo), ring: null, ringN: new THREE.Vector3(0, 1, 0), R: r, fragmentShader: LAB_TFS,
    extraUniforms: { uSrcPos: uSun, uSrcR: { value: SUN_R }, uOccPos: { value: occ }, uOccR: { value: occR }, uRed: red },
  });
  const moonRed = { value: 0 };
  const earthPos = new THREE.Vector3(0, 0, 0), moonPos = new THREE.Vector3();
  const earthAxis = new THREE.Group(); earthAxis.rotation.z = 23.44 * DEG; scene.add(earthAxis);
  const earth = models?.planets?.bumi
    ? labTextured(models.planets.bumi, EARTH_R, earthPos, moonPos, MOON_R, '#4d9fff')
    : new THREE.Mesh(new THREE.SphereGeometry(1, 128, 80), planetMat({ type: 2, c: ['#03163a', '#0e6aa0', '#2d6a2f', '#a08a55', '#eef4ff'], seed: 3.7, r: EARTH_R, sea: .52, clouds: .55, city: 1, bump: .03, atmo: '#4d9fff', occR: MOON_R }, moonPos));
  earth.scale.setScalar(EARTH_R); earthAxis.add(earth);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ vertexShader: ATMO_VS, fragmentShader: ATMO_FS,
    uniforms: { uR: { value: EARTH_R }, uRa: { value: EARTH_R * 1.12 }, uColor: { value: new THREE.Color('#4d9fff') }, uSunset: { value: new THREE.Color('#ff8a4a') }, uSunPos: uSun, uStrength: { value: 1.1 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  atm.scale.setScalar(EARTH_R * 1.12); atm.renderOrder = 2; scene.add(atm);
  const moon = models?.planets?.bulan
    ? labTextured(models.planets.bulan, MOON_R, moonPos, earthPos, EARTH_R, '#000000', moonRed)
    : new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), planetMat({ type: 5, c: ['#5d5953', '#a19c94', '#3a3834', '#c9c4ba', '#000000'], seed: 21.1, r: MOON_R, bump: .05, occR: EARTH_R }, earthPos, moonRed));
  moon.scale.setScalar(MOON_R); scene.add(moon);

  // Lintasan Bulan
  const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * MOON_ORBIT, 0, Math.sin(a) * MOON_ORBIT)); }
  const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: '#a8edeb', dashSize: 4, gapSize: 3, transparent: true, opacity: .45 }));
  orbit.computeLineDistances(); scene.add(orbit);
  // Garis Matahari–Bumi (sumbu utama)
  const axisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([sunPos.clone().setX(-SUN_D + SUN_R * 1.2), new THREE.Vector3(400, 0, 0)]),
    new THREE.LineDashedMaterial({ color: '#efc58e', dashSize: 6, gapSize: 8, transparent: true, opacity: .35 }));
  axisLine.computeLineDistances(); scene.add(axisLine);

  // Volume bayangan (ruang dunia)
  const umbraMat = new THREE.MeshBasicMaterial({ color: '#03050a', transparent: true, opacity: .5, depthWrite: false, side: THREE.DoubleSide });
  const penMat = new THREE.MeshBasicMaterial({ color: '#7a8cb8', transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide });
  const umbra = new THREE.Mesh(new THREE.BufferGeometry(), umbraMat); umbra.renderOrder = 4;
  const pen = new THREE.Mesh(new THREE.BufferGeometry(), penMat); pen.renderOrder = 3;
  scene.add(pen, umbra);
  const _u = new THREE.Vector3(), _q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0);
  function shadowVolumes(O, Ro, lenU, lenP) {
    _u.copy(O).sub(sunPos); const D = _u.length(); _u.divideScalar(D);
    const Lu = Ro * D / (SUN_R - Ro), tanP = (SUN_R + Ro) / D;
    const lu = Math.min(Lu, lenU);
    const rEnd = Ro * (1 - lu / Lu);
    umbra.geometry.dispose(); umbra.geometry = new THREE.CylinderGeometry(Ro, rEnd, lu, 48, 1, true).translate(0, lu / 2, 0);
    pen.geometry.dispose(); pen.geometry = new THREE.CylinderGeometry(Ro, Ro + lenP * tanP, lenP, 48, 1, true).translate(0, lenP / 2, 0);
    _q.setFromUnitVectors(Y, _u);
    for (const m of [umbra, pen]) { m.position.copy(O); m.quaternion.copy(_q); }
    return { Lu, tanP, dir: _u.clone() };
  }

  const st = { type: 'matahari', t: LAB_DURATION * .25, playing: true, speed: 1, pov: 'samping', volume: true, labels: true, look: { yaw: .6, pitch: .35, dist: 420 } };
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), fov: 45, from: null, k: 1 };
  let status = { light: 1, type: 'none' }, diagram = null, marks = [], volInfo = null;
  const _m = new THREE.Vector3(), _a = new THREE.Vector3(), _s = new THREE.Vector3(), _e1 = new THREE.Vector3(), _e2 = new THREE.Vector3();
  function moonAt(t, out) { const a = moonAngle(t); return out.set(Math.cos(a) * MOON_ORBIT, 0, Math.sin(a) * MOON_ORBIT); }
  // Status gerhana + data diagram 2D untuk posisi Bulan M (tanpa efek samping pada adegan).
  function measure(M) {
    if (st.type === 'matahari') {
      // dilihat dari titik di permukaan Bumi yang menghadap Matahari: cakram Bulan bergeser melintasi cakram Matahari
      const n = _s.copy(sunPos).sub(earthPos).normalize().applyAxisAngle(Y, .05).normalize();
      const O = _a.copy(earthPos).addScaledVector(n, EARTH_R);
      const st0 = eclipseAt(O.clone(), sunPos, SUN_R, M, MOON_R);
      const dS = sunPos.clone().sub(O), dM = M.clone().sub(O);
      const aS = Math.asin(SUN_R / dS.length()), aM = Math.asin(MOON_R / dM.length());
      dS.normalize(); dM.normalize();
      _e1.crossVectors(dS, Y).normalize(); _e2.crossVectors(_e1, dS);
      const off = dM.sub(dS);
      return { status: st0, diagram: { kind: 'matahari', mx: -off.dot(_e1) / aS, my: off.dot(_e2) / aS, mr: aM / aS } };
    }
    // Gerhana Bulan: penampang bayangan Bumi sejauh Bulan (penumbra besar, umbra di dalamnya)
    _a.copy(earthPos).sub(sunPos); const D = _a.length(); _a.divideScalar(D);
    _m.copy(M).sub(earthPos); const along = _m.dot(_a);
    _m.addScaledVector(_a, -along);
    const ru = EARTH_R - along * (SUN_R - EARTH_R) / D, rp = EARTH_R + along * (SUN_R + EARTH_R) / D;
    const dist = _m.length();
    const type = dist >= rp + MOON_R ? 'none' : dist >= ru + MOON_R ? 'penumbra' : dist > ru - MOON_R ? 'sebagian' : 'total';
    const inU = circleArea(MOON_R, ru, dist) / (Math.PI * MOON_R * MOON_R);
    return { status: { type, covered: inU, light: 1 - inU }, diagram: { kind: 'bulan', mx: -_m.z / rp, my: _m.y / rp, mr: MOON_R / rp, ru: ru / rp } };
  }
  function computeMarks() {
    const N = 240, out = []; let cur = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N * LAB_DURATION, k = measure(moonAt(t, new THREE.Vector3())).status.type;
      if (!cur || cur.kind !== k) { if (cur) cur.to = i / N; cur = { kind: k, from: i / N, to: 1 }; out.push(cur); }
    }
    return out.filter((m) => m.kind !== 'none');
  }

  function moonAngle(t) {
    const x = (t - LAB_DURATION / 2) / LAB_DURATION; // −0,5..0,5
    return st.type === 'matahari' ? Math.PI - x * 0.95 : -x * 0.95;
  }
  function center() { return st.type === 'matahari' ? new THREE.Vector3(-MOON_ORBIT * .5, 0, 0) : new THREE.Vector3(MOON_ORBIT * .5, 0, 0); }
  function povTarget(pov) {
    const c = center();
    const primary = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(0, 0, 1);
    switch (pov) {
      case 'ikhtisar': return { pos: c.clone().addScaledVector(side, 330).addScaledVector(up, 210).addScaledVector(primary, 120), target: c, up, fov: 45 };
      case 'depan': return { pos: c.clone().addScaledVector(primary, st.type === 'matahari' ? -330 : 380).addScaledVector(up, 18), target: c, up, fov: 40 };
      case 'samping': return { pos: c.clone().addScaledVector(side, 360).addScaledVector(up, 12), target: c, up, fov: 42 };
      case 'atas': return { pos: c.clone().addScaledVector(up, 420).addScaledVector(side, 1), target: c, up: primary.clone(), fov: 42 };
      case 'pengamat': {
        const n = st.type === 'matahari' ? sunPos.clone().sub(earthPos).normalize() : moonPos.clone().sub(earthPos).normalize();
        n.applyAxisAngle(up, st.type === 'matahari' ? .05 : 0).normalize();
        const p = earthPos.clone().addScaledVector(n, EARTH_R + .6);
        return { pos: p, target: st.type === 'matahari' ? sunPos.clone() : moonPos.clone(), up: new THREE.Vector3(0, 1, 0), fov: st.type === 'matahari' ? 26 : 38 };
      }
      default: { // bebas
        const l = st.look; const p = new THREE.Vector3(Math.sin(l.yaw) * Math.cos(l.pitch), Math.sin(l.pitch), Math.cos(l.yaw) * Math.cos(l.pitch)).multiplyScalar(l.dist).add(c);
        return { pos: p, target: c, up, fov: 45 };
      }
    }
  }
  function setPOV(pov, instant) {
    st.pov = pov;
    cam.from = { pos: camera.position.clone(), quat: camera.quaternion.clone(), fov: camera.fov };
    cam.k = instant ? 1 : 0;
  }

  const labelPos = { matahari: sunPos.clone(), bumi: earthPos, bulan: moonPos, umbra: new THREE.Vector3(), penumbra: new THREE.Vector3() };
  function update(dt, reduceMotion) {
    if (st.playing) st.t = Math.min(LAB_DURATION, st.t + dt * st.speed);
    if (st.t >= LAB_DURATION) st.playing = false;
    const a = moonAngle(st.t);
    moonPos.set(Math.cos(a) * MOON_ORBIT, Math.sin(a * 0) * 0, Math.sin(a) * MOON_ORBIT);
    moon.position.copy(moonPos);
    moon.rotation.y = Math.PI - a; // sisi dekat (bujur 0°) menghadap Bumi
    earth.rotation.y = st.t * .02;
    moonRed.value = st.type === 'bulan' ? 1 : 0;
    // volume & status
    if (st.type === 'matahari') { volInfo = shadowVolumes(moonPos, MOON_R, 220, 210); labelPos.umbra.copy(moonPos).addScaledVector(volInfo.dir, 45); labelPos.penumbra.copy(moonPos).addScaledVector(volInfo.dir, 120).add(new THREE.Vector3(0, 30, 0)); }
    else { volInfo = shadowVolumes(earthPos, EARTH_R, 320, 260); labelPos.umbra.copy(earthPos).addScaledVector(volInfo.dir, 70); labelPos.penumbra.copy(earthPos).addScaledVector(volInfo.dir, 150).add(new THREE.Vector3(0, 52, 0)); }
    // dari permukaan Bumi, garis bantu & volume bayangan hanya mengganggu (tampak sebagai cincin hitam & garis putus)
    const fromEarth = st.pov === 'pengamat';
    umbra.visible = pen.visible = st.volume && !fromEarth;
    orbit.visible = axisLine.visible = !fromEarth;
    // titik pengamat & klasifikasi dari geometri fisik
    const r = measure(moonPos);
    status = r.status; diagram = r.diagram;
    // kamera
    const tgt = povTarget(st.pov);
    const m = new THREE.Matrix4().lookAt(tgt.pos, tgt.target, tgt.up);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    if (cam.k < 1 && cam.from) {
      cam.k = Math.min(1, cam.k + dt / (reduceMotion ? .01 : .6));
      const e = cam.k * cam.k * (3 - 2 * cam.k);
      camera.position.lerpVectors(cam.from.pos, tgt.pos, e);
      camera.quaternion.slerpQuaternions(cam.from.quat, q, e);
      camera.fov = cam.from.fov + (tgt.fov - cam.from.fov) * e;
    } else { camera.position.copy(tgt.pos); camera.quaternion.copy(q); camera.fov = damp(camera.fov, tgt.fov, 6, dt); }
    camera.aspect = innerWidth / innerHeight;
    camera.near = st.pov === 'pengamat' ? .05 : .5;
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    corona.quaternion.copy(camera.quaternion);
    atm.material.side = camera.position.distanceTo(earthPos) < EARTH_R * 1.12 ? THREE.BackSide : THREE.FrontSide;
  }
  function setType(type) { st.type = type; st.t = LAB_DURATION * .25; st.playing = true; setPOV(st.pov, false); marks = computeMarks(); }
  function replay() { st.t = 0; st.playing = true; }
  function lookDrag(dx, dy) { if (st.pov !== 'bebas') return; st.look.yaw -= dx * .006; st.look.pitch = clamp(st.look.pitch + dy * .006, -1.3, 1.3); }
  function zoom(f) { if (st.pov !== 'bebas') return; st.look.dist = clamp(st.look.dist * f, 120, 1600); }
  marks = computeMarks();
  return { scene, camera, st, update, setType, setPOV, replay, lookDrag, zoom, labelPos, get status() { return status; }, get diagram() { return diagram; }, get marks() { return marks; } };
}

// Misi kisah nyata Apollo 13 — adegan 3D sendiri (seperti lab gerhana) karena jarak Bumi–Bulan di dunia jelajah
// terlalu dekat untuk kisah 6 hari. Isi: Bumi & Bulan bertekstur, lintasan "angka 8" (free return: memutari Bulan lalu
// meluncur pulang), wahana Apollo sederhana (modul layanan + modul komando + modul pendarat), ledakan & kebocoran oksigen,
// dan kamera sinematik. Modul ini menjalankan waktu misi, posisi, dan sumber daya (store.mission);
// tugas & mini-game ada di components/panels/MissionPanel.vue.
import * as THREE from 'three';
import { texturedPlanet } from './system.js';
import { clamp, lerp } from './util.js';
import { APOLLO13 } from '../data/missions.js';

const EARTH_R = 45, MOON_R = 14, MOON = new THREE.Vector3(420, 0, 0);
const PATH = [[21, 1, -48], [60, 1.5, -44], [130, 1.5, -28], [210, 1.5, 0], [300, 1.5, 28], [372, 1.2, 34], [410, .8, 22], [436, 0, 12], [446, 0, -4],
  [434, -.5, -20], [404, -1, -28], [300, -1.5, -30], [210, -1.5, 0], [130, -1.5, 30], [60, -1.5, 42], [27, -1, 49]];
const TASKS = ['decide', 'power', 'burn', 'co2', 'reentry'];
const ease = (k) => k * k * (3 - 2 * k);

function softTexture(inner, outer) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  } catch { return null; }
}

export function createMission(mainScene, models, store, sfx) {
  const M = store.mission, D = APOLLO13;
  const scene = new THREE.Scene();
  scene.background = mainScene.background; scene.environment = mainScene.environment;
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .3, 30000);
  const sunPos = new THREE.Vector3(-4000, 900, 2600);
  const uSun = { value: sunPos }, sunColor = { value: new THREE.Color('#fff3e2') };
  scene.add(new THREE.AmbientLight('#2a3552', .45));
  const dl = new THREE.DirectionalLight('#fff3e2', 2.4); dl.position.copy(sunPos); scene.add(dl);

  // ---- Bumi & Bulan ----
  function body(model, R, center, atmo, fallback) {
    const g = model
      ? texturedPlanet(model, { sunPos: uSun, sunColor, center, atmo: new THREE.Color(atmo), ring: null, ringN: new THREE.Vector3(0, 1, 0), R })
      : new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ color: fallback, roughness: .9 }));
    g.scale.setScalar(R); g.position.copy(center); scene.add(g); return g;
  }
  const earth = body(models?.planets?.bumi, EARTH_R, new THREE.Vector3(), '#4d9fff', '#2f6fd0');
  const moon = body(models?.planets?.bulan, MOON_R, MOON.clone(), '#000000', '#9a9a9a');
  earth.rotation.z = 23.44 * Math.PI / 180;

  // ---- lintasan angka 8 (panjang busur seragam) ----
  const curve = new THREE.CatmullRomCurve3(PATH.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const N = 700, pts = curve.getSpacedPoints(N);
  const planGeo = new THREE.BufferGeometry().setFromPoints(pts);
  const plan = new THREE.Line(planGeo, new THREE.LineDashedMaterial({ color: '#8fb0ff', dashSize: 4, gapSize: 4, transparent: true, opacity: .35 }));
  plan.computeLineDistances(); scene.add(plan);
  const trailGeo = new THREE.BufferGeometry().setFromPoints(pts); trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: '#ffc947', transparent: true, opacity: .9 })); scene.add(trail);
  let iBoom = pts.findIndex((p) => p.length() >= 366); // ledakan: > 320.000 km dari Bumi if (iBoom < 0) iBoom = Math.round(N * .3);
  let iFar = 0; pts.forEach((p, i) => { if (p.length() > pts[iFar].length()) iFar = i; });
  const U = { boom: iBoom / N, far: iFar / N, co2: Math.min(.88, iFar / N + .07), end: .975 };
  const KM_PER = 400171 / (pts[iFar].length() - EARTH_R); // jarak dari permukaan Bumi; titik terjauh = rekor Apollo 13

  // ---- wahana Apollo sederhana (sumbu depan = +Y lalu diputar ke +Z untuk lookAt) ----
  const craft = new THREE.Group(); scene.add(craft);
  const stack = new THREE.Group(); stack.rotation.x = Math.PI / 2; craft.add(stack);
  const mat = (c, m, r, e) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r, emissive: e || '#000', emissiveIntensity: e ? .35 : 0 });
  const white = mat('#e8ecf2', .55, .35), grey = mat('#9aa3b2', .7, .4), dark = mat('#2b2f38', .6, .5), gold = mat('#d9a441', .85, .32, '#3a2400');
  const smGroup = new THREE.Group(), lm = new THREE.Group();
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 28), grey); sm.position.y = -1.0;
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(.35, .8, 1.0, 20, 1, true), dark); bell.position.y = -2.8;
  const scar = new THREE.Mesh(new THREE.BoxGeometry(.95, 1.5, .12), new THREE.MeshBasicMaterial({ color: '#140a06' })); scar.position.set(0, -.9, 1.17); scar.visible = false;
  smGroup.add(sm, bell, scar);
  const cm = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.5, 28), white); cm.position.y = 1.05;
  const asc = new THREE.Mesh(new THREE.CylinderGeometry(.7, .9, .9, 8), grey); asc.position.y = 2.25;
  const desc = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 1.8), gold); desc.position.y = 3.25;
  lm.add(asc, desc);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.3, 6), grey);
    leg.position.set(sx * 1.15, 3.85, sz * 1.15); leg.rotation.set(sz * .55, 0, -sx * .55); lm.add(leg);
  }
  stack.add(smGroup, cm, lm);
  const glowTex = softTexture('rgba(255,190,110,1)', 'rgba(255,120,40,0)');
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: '#ff9a4a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  glow.scale.setScalar(9); craft.add(glow);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture('rgba(255,255,255,1)', 'rgba(255,200,140,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  scene.add(flash);

  // ---- kebocoran oksigen (partikel putih-biru) ----
  const NV = 260, vPos = new Float32Array(NV * 3), vVel = new Float32Array(NV * 3), vAge = new Float32Array(NV).fill(99);
  const vGeo = new THREE.BufferGeometry(); vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
  const vMat = new THREE.PointsMaterial({ size: 1.3, map: softTexture('rgba(230,242,255,1)', 'rgba(200,225,255,0)'), color: '#d8ebff', transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false });
  const vent = new THREE.Points(vGeo, vMat); vent.frustumCulled = false; scene.add(vent);
  let vNext = 0, leak = 0;
  const _w = new THREE.Vector3(), _n = new THREE.Vector3(), _sq = new THREE.Quaternion();
  function updateVent(dt) {
    if (leak > 0) {
      let emit = leak * 140 * dt;
      scar.getWorldPosition(_w); _n.set(0, 0, 1).applyQuaternion(scar.getWorldQuaternion(_sq));
      while (emit-- > 0) {
        const i = vNext; vNext = (vNext + 1) % NV;
        vPos[i * 3] = _w.x; vPos[i * 3 + 1] = _w.y; vPos[i * 3 + 2] = _w.z;
        const s = 4 + Math.random() * 9 * leak;
        vVel[i * 3] = _n.x * s + (Math.random() - .5) * 3; vVel[i * 3 + 1] = _n.y * s + (Math.random() - .5) * 3; vVel[i * 3 + 2] = _n.z * s + (Math.random() - .5) * 3;
        vAge[i] = 0;
      }
    }
    let alive = 0;
    for (let i = 0; i < NV; i++) {
      if (vAge[i] > 3.5) { vPos[i * 3 + 1] = 1e6; continue; }
      vAge[i] += dt; alive++;
      vPos[i * 3] += vVel[i * 3] * dt; vPos[i * 3 + 1] += vVel[i * 3 + 1] * dt; vPos[i * 3 + 2] += vVel[i * 3 + 2] * dt;
    }
    vent.visible = alive > 0; vGeo.attributes.position.needsUpdate = true;
  }

  // ---- waktu misi ----
  // segmen bergerak: u dari→ke selama dur detik, jam misi c0→c1 (jam), lalu langkah berikutnya
  const SEG = {
    launch: { from: 0, to: U.boom, dur: 14, c0: 0, c1: D.clock.boom, next: 'boom' },
    coast2: { from: U.boom, to: U.far, dur: 9, c0: D.clock.burn, c1: D.clock.far, next: 'far' },
    coast3: { from: U.far, to: U.co2, dur: 3.5, c0: D.clock.far, c1: D.clock.co2, next: 'co2' },
    coast4: { from: U.co2, to: U.end, dur: 12, c0: D.clock.co2, c1: D.clock.reentry, next: 'reentry' },
    splash: { from: U.end, to: 1, dur: 3, c0: D.clock.reentry, c1: D.clock.splash, next: 'done' },
  };
  const CAM = { brief: 'wide', launch: 'follow', boom: 'close', decide: 'wide', power: 'follow', burn: 'follow', coast2: 'follow', far: 'moon', coast3: 'moon', co2: 'follow', coast4: 'follow', reentry: 'earth', splash: 'earth', done: 'wide' };
  let segT = 0, stepT = 0, shake = 0, flashT = 9;

  function reset() {
    Object.assign(M, { step: 'brief', u: 0, clock: 0, dist: 0, o2: 100, power: 100, co2: 4, cold: false, blackout: false, note: '', firstTry: {}, stars: 0, reward: 0 });
    smGroup.visible = lm.visible = true; scar.visible = false; leak = 0; vAge.fill(99); glow.material.opacity = 0; flash.material.opacity = 0;
    segT = 0; stepT = 0; place(0, true);
  }
  function go(step) {
    M.step = step; segT = 0; stepT = 0;
    if (step === 'boom') {
      M.o2 = 58; M.power = 52; leak = 1; scar.visible = true; shake = 1.2; flashT = 0;
      sfx.thump(); sfx.alarm?.(); setTimeout(() => sfx.alarm?.(), 450);
    }
    if (step === 'coast2') leak = .25;
    if (step === 'far') { M.blackout = true; sfx.storm?.(); }
    if (step === 'coast3') M.blackout = false;
    if (step === 'coast4') M.note = '';
    if (step === 'splash') M.note = '';
    if (step === 'done') { M.blackout = false; sfx.chime(); }
  }

  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _goal = new THREE.Vector3(), _look = new THREE.Vector3(), _side = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  const camLook = new THREE.Vector3(225, 0, 0);
  function place(u, snap) {
    curve.getPointAt(clamp(u, 0, 1), _p); curve.getTangentAt(clamp(u, 0, .999), _t);
    craft.position.copy(_p); craft.lookAt(_w.copy(_p).add(_t));
    trailGeo.setDrawRange(0, Math.max(0, Math.floor(u * N) + 1));
    M.dist = M.step === 'done' ? 0 : Math.round(Math.max(0, _p.length() - EARTH_R) * KM_PER);
    if (snap) { camGoal(); camera.position.copy(_goal); camLook.copy(_look); }
  }
  function camGoal() {
    const mode = CAM[M.step] || 'follow';
    _side.crossVectors(_t, UPV).normalize();
    if (mode === 'wide') { _goal.set(215, 290, 420); _look.set(210, -35, 0); }
    else if (mode === 'moon') { _goal.copy(MOON).add(_w.set(-75, 36, 62)); _look.copy(MOON).add(_w.set(12, -8, -4)); }
    else if (mode === 'close') { _goal.copy(_p).addScaledVector(_t, -9).addScaledVector(UPV, 3.5).addScaledVector(_side, 6); _look.copy(_p); }
    else if (mode === 'earth') { _goal.copy(_p).addScaledVector(_t, -20).addScaledVector(UPV, 8).addScaledVector(_side, 6); _look.copy(_p).addScaledVector(_t, 32); }
    else { // follow: di belakang-samping wahana, perlahan mengitari agar hidup
      const a = Math.sin(stepT * .25) * .6;
      _goal.copy(_p).addScaledVector(_t, -22).addScaledVector(UPV, 8).addScaledVector(_side, 10 * Math.cos(a)).addScaledVector(_t, 6 * Math.sin(a));
      _look.copy(_p).addScaledVector(_t, 14);
    }
  }

  function update(dt) {
    stepT += dt;
    earth.rotation.y += dt * .05;
    const seg = SEG[M.step];
    if (seg) {
      segT += dt;
      const k = Math.min(1, segT / seg.dur);
      M.u = lerp(seg.from, seg.to, M.step === 'launch' ? ease(k) : k);
      M.clock = lerp(seg.c0, seg.c1, k);
      if (M.step === 'coast4') {
        if (k > .55 && smGroup.visible) { smGroup.visible = false; M.note = 'Modul layanan dilepas. Kru memotretnya: satu sisinya hancur terbuka.'; }
        if (k > .85 && lm.visible) { lm.visible = false; M.note = 'Modul pendarat "Aquarius" dilepas. Sekoci ini sudah menyelamatkan mereka.'; }
      }
      if (k >= 1) go(seg.next);
    } else if (M.step === 'boom' && stepT > 3.8) go('decide');
    else if (M.step === 'far' && stepT > 9) go('coast3');
    // sumber daya: setelah ledakan oksigen & listrik terus berkurang; jauh lebih lambat setelah sistem dihemat.
    // CO2 naik sejak melewati Bulan sampai "kotak surat" terpasang. Tidak pernah habis — dramatis, tapi tidak menghukum.
    if (M.step !== 'brief' && M.step !== 'launch' && M.step !== 'boom' && M.step !== 'done') {
      const r = M.firstTry.power !== undefined ? .1 : .45;
      M.o2 = Math.max(12, M.o2 - r * .8 * dt); M.power = Math.max(10, M.power - r * 1.3 * dt);
    }
    if (['coast3', 'co2'].includes(M.step) && M.firstTry.co2 === undefined) M.co2 = Math.min(92, M.co2 + (M.step === 'coast3' ? 13 : 2.5) * dt);
    else if (M.firstTry.co2 !== undefined) M.co2 = Math.max(6, M.co2 - 20 * dt);
    // visual
    place(M.u, false);
    leak = Math.max(0, leak - dt * (M.step === 'boom' ? .05 : .02));
    updateVent(dt);
    flashT += dt;
    flash.position.copy(craft.position); flash.scale.setScalar(8 + flashT * 40); flash.material.opacity = Math.max(0, 1 - flashT / 1.1);
    glow.material.opacity = M.step === 'reentry' ? .55 + Math.sin(stepT * 9) * .15 : M.step === 'splash' ? Math.max(0, .7 - segT * .3) : 0;
    // kamera
    camGoal();
    const kk = 1 - Math.exp(-dt * (M.step === 'boom' ? 5 : 1.6));
    camera.position.lerp(_goal, kk); camLook.lerp(_look, kk);
    if (shake > 0) { camera.position.x += (Math.random() - .5) * shake; camera.position.y += (Math.random() - .5) * shake; shake = Math.max(0, shake - dt * .9); }
    camera.lookAt(camLook);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }

  /** Tugas selesai (dari panel). firstTry = berhasil pada percobaan pertama. */
  function complete(task, firstTry) {
    if (M.step !== task) return; // hanya tugas yang sedang tampil
    if (M.firstTry[task] === undefined) M.firstTry[task] = !!firstTry;
    const next = { decide: 'power', power: 'burn', burn: 'coast2', co2: 'coast4', reentry: 'splash' }[task];
    if (task === 'power') M.cold = true;
    if (next) go(next);
  }
  function starsNow() { const n = TASKS.filter((t) => M.firstTry[t]).length; return n >= 5 ? 3 : n >= 3 ? 2 : 1; }

  reset();
  return {
    scene, camera, update, reset, complete, starsNow,
    launch() { if (M.step === 'brief') go('launch'); },
    skipFar() { if (M.step === 'far') go('coast3'); },
    dispose() { scene.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}

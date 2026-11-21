// Misi kisah nyata Mars Climate Orbiter (1999) — adegan 3D: Mars + atmosfer, wahana MCO (panel surya hanya di satu
// sisi), lintasan rencana (± 226 km) vs nyata (± 57 km) yang menyimpang perlahan karena salah satuan, pengereman masuk
// orbit (wahana dibalik, mesin menghadap depan), terbakar di atmosfer, dan — saat sejarah diulang — masuk orbit.
// Antarmuka sama dengan game/mission.js (reset/update/complete/starsNow + launch, mark, investigate).
// Tugas & kartu ada di components/panels/McoPanel.vue. Ketinggian di gambar diperbesar agar terlihat.
import * as THREE from 'three';
import { texturedPlanet } from './system.js';
import { clamp, lerp } from './util.js';
import { MCO } from '../data/missions.js';

const R = 40, RP_PLAN = R + 12, RP_ACT = R + 1.5, ATMO = R * 1.06, KM_PER = 3390 / R, E = 1.35;
const TASKS = ['investigate', 'p0', 'p1', 'p2'];

function soft(inner, outer) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  } catch { return null; }
}
const polar = (rp, th) => { const p = rp * (1 + E), r = p / (1 + E * Math.cos(th)); return new THREE.Vector3(r * Math.cos(th), 0, r * Math.sin(th)); };
/** Lintasan datang: garis lurus dari jauh lalu berayun di sekitar Mars (periapsis di sisi +x, di balik Mars dilihat dari Bumi). */
function approach(pull) {
  const th0 = -2.05, pts = [];
  const a = polar(RP_PLAN, th0), b = polar(RP_PLAN, th0 + .02), dir = b.clone().sub(a).normalize();
  for (let k = 6; k >= 1; k--) pts.push(a.clone().addScaledVector(dir, -k * 110));
  for (let th = th0; th <= 2.05; th += .05) {
    const p = polar(RP_PLAN, th), r = p.length();
    const w = Math.pow(clamp(1 - (r - RP_PLAN) / 230, 0, 1), 2) * pull; // penyimpangan menumpuk mendekati Mars
    pts.push(p.setLength(r - (RP_PLAN - RP_ACT) * w));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
}

export function createMcoMission(mainScene, models, store, sfx) {
  const M = store.mission, D = MCO;
  const scene = new THREE.Scene();
  scene.background = mainScene.background; scene.environment = mainScene.environment;
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .3, 30000);
  const sunPos = new THREE.Vector3(-3000, 800, -1800);
  const uSun = { value: sunPos }, sunColor = { value: new THREE.Color('#fff3e2') };
  scene.add(new THREE.AmbientLight('#2a3552', .5));
  const dl = new THREE.DirectionalLight('#fff3e2', 2.4); dl.position.copy(sunPos); scene.add(dl);

  // ---- Mars + atmosfer tipis ----
  const marsC = new THREE.Vector3();
  const mars = models?.planets?.mars
    ? texturedPlanet(models.planets.mars, { sunPos: uSun, sunColor, center: marsC, atmo: new THREE.Color('#ff9a6a'), ring: null, ringN: new THREE.Vector3(0, 1, 0), R })
    : new THREE.Mesh(new THREE.SphereGeometry(1, 64, 40), new THREE.MeshStandardMaterial({ color: '#c1532f', roughness: .95 }));
  mars.scale.setScalar(R); scene.add(mars);
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(ATMO, 64, 40), new THREE.MeshBasicMaterial({ color: '#ff8a50', transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide }));
  scene.add(atmo);

  // ---- lintasan ----
  const planned = approach(0), actual = approach(1), N = 600;
  const pPts = planned.getSpacedPoints(N), aPts = actual.getSpacedPoints(N);
  const line = (pts, color, dashed, op) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dashed ? new THREE.LineDashedMaterial({ color, dashSize: 3, gapSize: 3, transparent: true, opacity: op }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity: op });
    const l = new THREE.Line(g, m); if (dashed) l.computeLineDistances(); l.visible = false; scene.add(l); return l;
  };
  const planLine = line(pPts, '#36d39a', true, .7), actLine = line(aPts, '#ff6b6b', false, .85);
  const fixGeo = new THREE.BufferGeometry().setFromPoints(aPts);
  const fixLine = new THREE.Line(fixGeo, new THREE.LineBasicMaterial({ color: '#ffc947', transparent: true, opacity: .95 })); fixLine.visible = false; scene.add(fixLine);
  const orbitPts = []; for (let i = 0; i <= 256; i++) { const th = i / 256 * Math.PI * 2; orbitPts.push(polar(RP_PLAN, th).setLength(RP_PLAN * 1.7 / (1 + .7 * Math.cos(th)))); }
  const orbitLine = line(orbitPts, '#8fb0ff', false, .6);
  const iPeri = (pts) => { let k = 0; pts.forEach((p, i) => { if (p.length() < pts[k].length()) k = i; }); return k / N; };
  const iDist = (pts, d) => { const k = pts.findIndex((p) => p.length() <= d); return (k < 0 ? 0 : k) / N; };
  const U = { pre: iDist(aPts, 150), periA: iPeri(aPts), periP: iPeri(pPts), burn: iDist(aPts, 75), preP: iDist(pPts, 150), burnP: iDist(pPts, 80) };

  // ---- wahana MCO ----
  const craft = new THREE.Group(); scene.add(craft);
  const body = new THREE.Group(); craft.add(body);
  const mat = (c, m, r, e) => new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r, emissive: e || '#000', emissiveIntensity: e ? .3 : 0 });
  const bus = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1.4), mat('#d4a33f', .85, .35, '#2a1a00'));
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.2, 6), mat('#9aa3b2', .7, .4)); arm.rotation.z = Math.PI / 2; arm.position.x = 1.3;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(5.2, .06, 1.8), mat('#22396f', .6, .3, '#0a1530')); wing.position.x = 4.5;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.9, 20, 10, 0, Math.PI * 2, 0, Math.PI * .32), mat('#eef0f4', .3, .5)); dish.position.y = .5; dish.rotation.x = Math.PI;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.22, .5, .7, 16, 1, true), mat('#2b2f38', .6, .5)); nozzle.rotation.x = Math.PI / 2; nozzle.position.z = -1.05;
  body.add(bus, arm, wing, dish, nozzle);
  const burnFx = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,230,180,1)', 'rgba(255,140,40,0)'), color: '#ffb066', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  burnFx.position.z = -1.9; burnFx.scale.setScalar(3); craft.add(burnFx);
  const heat = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,170,90,1)', 'rgba(255,60,20,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
  heat.scale.setScalar(9); craft.add(heat);
  const puffs = [1, -1].map((s) => { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); p.position.set(-.9 * s, .7, 0); p.scale.setScalar(1.2); craft.add(p); return p; });

  // ---- waktu ----
  const SEG = {
    cruise: { curve: 'a', from: 0, to: U.pre, dur: 12, d0: 0, d1: D.arriveDay - .4, next: 'arrive' },
    arrive: { curve: 'a', from: U.pre, to: U.periA, dur: 8, d0: D.arriveDay - .4, d1: D.arriveDay, next: 'wait' },
    retry: { curve: 'p', from: U.preP, to: U.periP, dur: 7, d0: D.arriveDay - .4, d1: D.arriveDay, next: 'orbit' },
    orbit: { curve: 'o', from: 0, to: .55, dur: 5, d0: D.arriveDay, d1: D.arriveDay + .3, next: 'done' },
  };
  const CAM = { brief: 'wide', cruise: 'follow', arrive: 'earth', wait: 'earth', lost: 'earth', investigate: 'top', fix: 'top', retry: 'earth', orbit: 'wide', done: 'wide' };
  let segT = 0, stepT = 0, puffT = 1, flip = 0, gone = false;
  const orbitCurve = new THREE.CatmullRomCurve3(orbitPts.slice(0, -1), true);

  function reset() {
    Object.assign(M, { step: 'brief', u: 0, clock: 0, dist: 0, alt: 0, amd: 0, pred: D.plannedKm, fixK: 0, blackout: false, note: '', firstTry: {}, stars: 0, reward: 0 });
    craft.visible = true; gone = false; flip = 0; segT = 0; stepT = 0;
    planLine.visible = actLine.visible = fixLine.visible = orbitLine.visible = false;
    place('a', 0, true);
  }
  function go(step) {
    M.step = step; segT = 0; stepT = 0;
    if (step === 'arrive') M.note = 'Mesin dibalik dan dinyalakan untuk mengerem…';
    if (step === 'wait') { M.note = ''; }
    if (step === 'investigate') { planLine.visible = true; actLine.visible = true; }
    if (step === 'fix') { fixLine.visible = true; }
    if (step === 'retry') { craft.visible = true; gone = false; heat.material.opacity = 0; actLine.visible = false; fixLine.visible = false; planLine.visible = true; M.note = 'Mencoba lagi dengan satuan yang benar…'; }
    if (step === 'orbit') { orbitLine.visible = true; M.note = 'Masuk orbit!'; sfx.chime(); }
    if (step === 'done') M.note = '';
  }

  const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _goal = new THREE.Vector3(), _look = new THREE.Vector3(), _w = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0), camLook = new THREE.Vector3();
  function curveOf(c) { return c === 'p' ? planned : c === 'o' ? orbitCurve : actual; }
  function place(c, u, snap) {
    const cv = curveOf(c);
    cv.getPointAt(clamp(u, 0, 1), _p); cv.getTangentAt(clamp(u, 0, .999), _t);
    craft.position.copy(_p);
    // saat mengerem wahana dibalik: mesin menghadap arah gerak
    craft.lookAt(_w.copy(_p).addScaledVector(_t, flip > .5 ? -1 : 1));
    const d = _p.length(), periKm = c === 'a' ? D.actualKm : D.plannedKm, rp = c === 'a' ? RP_ACT : RP_PLAN;
    M.alt = Math.round(periKm + Math.max(0, d - rp) * KM_PER);
    M.blackout = _p.x > 0 && Math.abs(_p.z) < R * 1.02; // tertutup Mars dilihat dari Bumi (arah −x)
    if (snap) { camGoal(); camera.position.copy(_goal); camLook.copy(_look); }
  }
  function camGoal() {
    const mode = CAM[M.step] || 'follow';
    if (mode === 'wide') { _goal.set(-170, 230, 330); _look.set(30, 0, 0); }
    else if (mode === 'top') { _goal.set(40, 260, 120); _look.set(30, 0, 0); }
    else if (mode === 'earth') { _goal.set(-150, 52, 70); _look.set(8, 0, -6); }
    else { _goal.copy(_p).addScaledVector(_t, -26).addScaledVector(UPV, 10); _look.copy(_p).lerp(marsC, .35); }
  }

  function update(dt) {
    stepT += dt;
    mars.rotation.y += dt * .03;
    const seg = SEG[M.step];
    if (seg) {
      segT += dt;
      const k = Math.min(1, segT / seg.dur);
      M.u = lerp(seg.from, seg.to, k);
      M.clock = lerp(seg.d0, seg.d1, k);
      if (M.step === 'cruise') { // pendorong kecil berkali-kali meluruskan wahana
        puffT -= dt; if (puffT <= 0) { puffT = .5 + Math.random() * .7; M.amd++; puffs[M.amd % 2].material.opacity = 1; }
      }
      const burnFrom = M.step === 'arrive' ? U.burn : M.step === 'retry' ? U.burnP : 2;
      flip = Math.min(1, Math.max(0, (M.u - burnFrom) * 30)) * (M.step === 'arrive' || M.step === 'retry' ? 1 : 0);
      if (M.step === 'orbit') flip = 0;
      burnFx.material.opacity = flip > .5 ? .8 + Math.random() * .2 : 0;
      if (M.step === 'arrive') {
        const d = _p.length();
        if (d < ATMO + 2) { heat.material.opacity = Math.min(1, heat.material.opacity + dt * 1.5); }
        if (k > .97 && !gone) { gone = true; craft.visible = false; }
      }
      if (k >= 1) go(seg.next);
    } else if (M.step === 'wait' && stepT > 6) { go('lost'); }
    if (seg) place(seg.curve, M.u, false);
    else if (M.step === 'brief') place('a', 0, false);
    for (const p of puffs) p.material.opacity = Math.max(0, p.material.opacity - dt * 4);
    // garis "jalur yang diperbaiki": dari nyata menuju rencana sesuai paket yang benar
    if (fixLine.visible) {
      const pos = fixGeo.attributes.position;
      for (let i = 0; i <= N; i++) { _w.copy(aPts[i]).lerp(pPts[i], M.fixK); pos.setXYZ(i, _w.x, _w.y, _w.z); }
      pos.needsUpdate = true;
    }
    camGoal();
    const kk = 1 - Math.exp(-dt * 1.6);
    camera.position.lerp(_goal, kk); camLook.lerp(_look, kk); camera.lookAt(camLook);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }

  function complete(task, firstTry) {
    if (M.step !== task) return;
    if (M.firstTry[task] === undefined) M.firstTry[task] = !!firstTry;
    if (task === 'investigate') go('fix');
    else if (task === 'fix') go('retry');
  }
  reset();
  return {
    scene, camera, update, reset, complete,
    starsNow() { const n = TASKS.filter((t) => M.firstTry[t]).length; return n >= 4 ? 3 : n >= 2 ? 2 : 1; },
    launch() { if (M.step === 'brief') { go('cruise'); actLine.visible = false; } },
    investigate() { if (M.step === 'lost') go('investigate'); },
    /** paket data: catat percobaan pertama & geser prakiraan ketinggian */
    mark(id, firstTry, fixK) { if (M.firstTry[id] === undefined) M.firstTry[id] = !!firstTry; M.fixK = fixK; M.pred = Math.round(lerp(D.actualKm, D.plannedKm, fixK)); },
    dispose() { scene.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}

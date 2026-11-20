// Mesin 3D AstroSphere — diporting dari Jelajah Antariksa lalu diperluas sesuai PRD AstroSphere v2.0.
// Konteks dunia: menu (beranda/hanggar), jelajah (terbang), observe (Planet & Sejarah), lab (Fenomena), frozen (Kuis/Peta/Profil).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SKY_VS, SKY_FS, STARS_VS, STARS_FS } from './shaders.js';
import { clamp, lerp, damp, smooth, dead, nextFrame, DEG, TAU, KM, fmtDist, fmtEta, fmtCoord, fmtDate, daysSinceJ2000, fmtSimDate, isTouchDevice } from './util.js';
import { buildSystem, updateBodies, latLonToLocal } from './system.js';
import { initShipFactory, buildShip, setShipModels } from './ships.js';
import { loadModels } from './models.js';
import { createLab, LAB_DURATION } from './lab.js';
import { createAudio } from './audio.js';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { BELT } from '../data/solarSystem.js';
import { HISTORY } from '../data/history.js';
import { store, saveSettings, readGameState, writeGameState } from '../composables/useGame.js';

export const TIME_RATE = 0.02;      // hari simulasi per detik (1 hari = 50 dtk) — satu faktor untuk rotasi & revolusi
export const RMAX = 8500;           // radius navigasi; peringatan mulai 0,8 R (PRD R02)

export function createEngine(el) {
  const isTouch = isTouchDevice();
  const settings = store.settings;
  const canvas = el.canvas;
  let renderer, composer, renderPass, bloomPass;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.5, 80000);
  // Lapisan latar: langit, bintang, dan lubang hitam di luar tata surya. Dirender lebih dulu dengan kamera ber-near jauh
  // (presisi depth cukup untuk objek ± 17.000 satuan), lalu tata surya digambar di atasnya setelah depth dibersihkan.
  const bgScene = new THREE.Scene();
  const bgCam = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 200, 200000);
  let skyTex = null, bgPass = null, blackHole = null;
  const U = { uTime: { value: 0 }, uSunPos: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color('#fff3e2') }, uOct: { value: settings.graphics === 'tinggi' ? 6 : 4 } };
  let sys = null, skyGroup, starsMat, dust, lab = null, models = null;
  const sfx = createAudio(() => store.settings.soundEnabled);
  const listeners = [];
  const on = (t, ev, fn, opt) => { t.addEventListener(ev, fn, opt); listeners.push([t, ev, fn, opt]); };

  // ---------- Renderer ----------
  function initRenderer() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setSize(innerWidth, innerHeight);
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    bgPass = new RenderPass(bgScene, bgCam); composer.addPass(bgPass);
    renderPass = new RenderPass(scene, camera); renderPass.clear = false; renderPass.clearDepth = true; composer.addPass(renderPass);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.5, 1.5); composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    applyQuality();
  }
  function applyQuality() {
    const hi = settings.graphics === 'tinggi';
    const pr = Math.min(devicePixelRatio || 1, hi ? (isTouch ? 1.5 : 2) : 1);
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    U.uOct.value = hi ? 6 : 4;
    if (starsMat) starsMat.uniforms.uPR.value = pr;
  }
  function bakeSky() {
    const size = isTouch || settings.graphics !== 'tinggi' ? 1024 : 2048;
    const skyScene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false });
    skyScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 96, 48), mat));
    const cubeRT = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    new THREE.CubeCamera(1, 1000, cubeRT).update(renderer, skyScene);
    skyTex = cubeRT.texture; bgScene.background = skyTex;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromCubemap(cubeRT.texture).texture; scene.environmentIntensity = 1.4;
    pmrem.dispose(); mat.dispose();
    skyGroup = new THREE.Group(); bgScene.add(skyGroup);
    const N = isTouch ? 2200 : 4200, R = 30000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
    const c = new THREE.Color(), v = new THREE.Vector3(), gN = new THREE.Vector3(.35, 1, -.2).normalize();
    for (let i = 0; i < N; i++) {
      v.randomDirection();
      if (Math.random() < .35) v.addScaledVector(gN, -v.dot(gN) * (0.85 + Math.random() * .15)).normalize();
      pos.set([v.x * R, v.y * R, v.z * R], i * 3);
      const t = Math.random(); c.set(t < .25 ? '#ffd2a1' : t < .7 ? '#ffffff' : t < .9 ? '#cfe0ff' : '#a9c8ff');
      const b = Math.pow(Math.random(), 3) * 1.6 + .25;
      col.set([c.r * b, c.g * b, c.b * b], i * 3);
      sz[i] = 1.2 + Math.pow(Math.random(), 4) * 3.2; ph[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    starsMat = new THREE.ShaderMaterial({ vertexShader: STARS_VS, fragmentShader: STARS_FS, uniforms: { uTime: U.uTime, uPR: { value: renderer.getPixelRatio() } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, starsMat); pts.frustumCulled = false; pts.renderOrder = -10; skyGroup.add(pts);
  }
  function buildDust() {
    const N = isTouch ? 500 : 900, B = 240, base = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) base[i] = Math.random() * B;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lines.frustumCulled = false; scene.add(lines);
    dust = { N, B, base, lines, g };
  }
  function updateDust(vel) {
    const { N, B, base, g } = dust, P = g.attributes.position.array, C = g.attributes.color.array;
    const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, hB = B / 2, sp = vel.length();
    const k = Math.min(0.07, 18 / Math.max(sp, 1)), inten = Math.min(1, .15 + sp / 60);
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const x = ((base[i3] - cx) % B + B) % B - hB, y = ((base[i3 + 1] - cy) % B + B) % B - hB, z = ((base[i3 + 2] - cz) % B + B) % B - hB;
      const d = Math.sqrt(x * x + y * y + z * z), f = smooth(hB, hB * .35, d) * smooth(2, 7, d) * inten, o = i * 6;
      P[o] = cx + x; P[o + 1] = cy + y; P[o + 2] = cz + z;
      P[o + 3] = cx + x + vel.x * k + .02; P[o + 4] = cy + y + vel.y * k; P[o + 5] = cz + z + vel.z * k;
      C[o] = .75 * f; C[o + 1] = .88 * f; C[o + 2] = f; C[o + 3] = 0; C[o + 4] = 0; C[o + 5] = 0;
    }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }

  // ---------- Lubang hitam: dekorasi pembuka di luar tata surya ----------
  // Jauh di luar batas navigasi (RMAX), sedikit di atas ekliptika; terlihat sebagai objek langit saat menjelajah.
  const BH_DIR = new THREE.Vector3(-.62, .3, -.72).normalize(), BH_DIST = 17000, BH_SIZE = 2600;
  const BH_POS = BH_DIR.clone().multiplyScalar(BH_DIST), bhNormal = new THREE.Vector3(0, 1, 0);
  function buildBlackHole() {
    const m = models?.decor?.black_hole; if (!m) return;
    blackHole = m.clone(true);
    blackHole.position.copy(BH_POS); blackHole.scale.setScalar(BH_SIZE);
    // piringan dilihat dari arah Matahari dengan kemiringan 14° (sudut dramatis, cincin cahaya tetap terbaca)
    const toSun = BH_DIR.clone().negate();
    const perp = new THREE.Vector3(0, 1, 0).projectOnPlane(toSun).normalize();
    bhNormal.copy(perp).multiplyScalar(Math.cos(14 * DEG)).addScaledVector(toSun, Math.sin(14 * DEG)).normalize();
    blackHole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bhNormal);
    bgScene.add(blackHole);
    bgScene.add(new THREE.AmbientLight('#ffffff', .9));
  }

  // ---------- Adegan pembuka: kamera mengitari lubang hitam lalu terbang ke pesawat ----------
  const intro = { on: false, flying: false, fast: false, t: 0, k: 0, ep: 0, hold: 3.6, fly: 4.4, snap: false,
    fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), prev: new THREE.Vector3(), vel: new THREE.Vector3() };
  const _iq = new THREE.Quaternion(), _im = new THREE.Matrix4();
  function introShot(t, pos, quat) {
    pos.copy(BH_DIR).negate().applyAxisAngle(bhNormal, -.32 + t * .045).multiplyScalar(BH_SIZE * 3.1).add(BH_POS);
    quat.setFromRotationMatrix(_im.lookAt(pos, BH_POS, bhNormal));
  }
  function startIntro() {
    if (!blackHole) return;
    Object.assign(intro, { on: true, flying: false, fast: false, t: 0, k: 0, ep: 0, snap: false });
    introShot(0, camera.position, camera.quaternion); intro.prev.copy(camera.position);
    store.intro = 'hold';
  }
  function beginIntroFlight() {
    if (settings.reduceMotion) { endIntro(); intro.snap = true; return; }
    intro.flying = true; intro.k = 0;
    intro.fromPos.copy(camera.position); intro.fromQuat.copy(camera.quaternion);
    store.intro = 'fly';
  }
  function endIntro() { intro.on = false; intro.flying = false; intro.vel.set(0, 0, 0); store.intro = false; trans.t = 1; }
  function skipIntro() { if (!intro.on) return; if (!intro.flying) beginIntroFlight(); intro.fast = true; }

  // ---------- Waktu & konteks ----------
  let gameTime = daysSinceJ2000();      // waktu jelajah (hari sejak J2000)
  let obsTime = gameTime;               // cabang waktu observasi (Planet & Sejarah)
  let snapshot = null;                  // checkpoint jelajah saat masuk mode belajar/overlay
  const worldMode = () => {
    if (store.phase === 'menu' || store.phase === 'loading') return 'menu';
    switch (store.mode) {
      case 'jelajah': return 'jelajah';
      case 'planet': case 'sejarah': return 'observe';
      case 'fenomena': return 'lab';
      case 'hanggar': return 'hangar';
      default: return 'frozen';
    }
  };
  const bodyTime = () => (worldMode() === 'observe' ? obsTime : gameTime);

  // ---------- Pesawat ----------
  const ship = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), rate: new THREE.Vector3(), throttle: 0, boost: 0, speed: 0, limited: false, braking: false };
  const shipRoot = new THREE.Group();
  let shipModel = null; const shipModels = {};
  let camMode = 'chase', target = null, nearest = null;
  const discovered = new Set(['matahari']);
  let sessionActive = false, shake = 0, msgTimer = 0, inBelt = false;
  const keys = {}, stick = { x: 0, y: 0 }, joy = { x: 0, y: 0 }, hold = {};
  const input = { pitch: 0, yaw: 0, roll: 0, vert: 0, boost: false, align: false };
  let pointerLocked = false, dragging = false, leavingLock = false;
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _e = new THREE.Euler(), _m = new THREE.Matrix4();
  const shipDef = () => SHIPS[store.progress.selectedShip] || SHIPS.astra;
  const camOffset = (d) => new THREE.Vector3(0, d.camY, d.camZ);

  function defaultPose() {
    const k = sys.byId.bumi;
    const toSun = _v.copy(k.pos).negate().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(toSun, up).normalize();
    const dir = new THREE.Vector3().addScaledVector(toSun, .55).addScaledVector(side, .8).addScaledVector(up, .14).normalize();
    const pos = k.pos.clone().addScaledVector(dir, k.radius * 6.5);
    const look = k.pos.clone().addScaledVector(side, k.radius * 3.6);
    return { pos, quat: new THREE.Quaternion().setFromRotationMatrix(_m.lookAt(pos, look, up)) };
  }
  function resetShip(pose) { ship.pos.copy(pose.pos); ship.quat.copy(pose.quat); ship.vel.set(0, 0, 0); ship.rate.set(0, 0, 0); ship.throttle = 0; ship.boost = 0; ship.braking = false; }
  function setShip(id) {
    if (!SHIPS[id]) id = 'astra';
    if (!shipModels[id]) shipModels[id] = buildShip(id);
    if (shipModel) shipRoot.remove(shipModel.group);
    shipModel = shipModels[id]; shipRoot.add(shipModel.group);
  }
  function readInput(dt) {
    const k = keys, t = hold;
    let yaw = ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    let pitch = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    yaw += dead(stick.x, .05) + dead(joy.x, .08);
    pitch += -dead(stick.y, .05) - dead(joy.y, .08);
    if (settings.invertY) pitch = -pitch;
    input.yaw = clamp(yaw, -1, 1); input.pitch = clamp(pitch, -1, 1);
    input.roll = ((k.KeyE || t.rollR) ? 1 : 0) - ((k.KeyQ || t.rollL) ? 1 : 0);
    input.vert = ((k.Space || k.KeyR || t.up) ? 1 : 0) - ((k.KeyC || k.KeyF || t.down) ? 1 : 0);
    input.boost = !!(k.ShiftLeft || k.ShiftRight || t.boost);
    input.align = !!(k.KeyG || t.align);
    if (k.KeyW) { ship.throttle = Math.min(1, ship.throttle + dt * .55); ship.braking = false; }
    if (k.KeyS) { ship.throttle = Math.max(-.3, ship.throttle - dt * .55); ship.braking = false; }
  }
  let wasBoost = false;
  function updateShip(dt) {
    const def = shipDef();
    let { pitch, yaw, roll } = input;
    if (input.align && target) {
      _qi.copy(ship.quat).invert();
      _v.copy(target.pos).sub(ship.pos).applyQuaternion(_qi).normalize();
      yaw = clamp(Math.atan2(_v.x, -_v.z) * 2.4, -1, 1); pitch = clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)) * 2.4, -1, 1);
    }
    const tr = def.turn;
    ship.rate.x = damp(ship.rate.x, pitch * 1.25 * tr, 6, dt);
    ship.rate.y = damp(ship.rate.y, -yaw * 1.0 * tr, 6, dt);
    ship.rate.z = damp(ship.rate.z, -roll * 2.0 * tr, 6, dt);
    _q.setFromEuler(_e.set(ship.rate.x * dt, ship.rate.y * dt, ship.rate.z * dt, 'XYZ'));
    ship.quat.multiply(_q).normalize();
    const wantBoost = input.boost && ship.throttle > .05;
    if (wantBoost && !wasBoost) sfx.whoosh();
    wasBoost = wantBoost;
    ship.boost = damp(ship.boost, wantBoost ? 1 : 0, wantBoost ? 1.6 : 3, dt);
    const boostMul = 1 + ship.boost * (def.boost - 1);
    const fwd = ship.throttle * def.speed * (ship.throttle > 0 ? boostMul : 1);
    const desired = _v.set(0, input.vert * def.speed * .35, -fwd).applyQuaternion(ship.quat);
    const alt = nearest ? nearest.alt : 1e9;
    const limit = 8 + Math.max(0, alt) * 1.15;
    ship.limited = desired.length() > limit && alt < 400;
    if (desired.length() > limit) desired.setLength(limit);
    if (ship.braking) { ship.vel.multiplyScalar(Math.exp(-dt * 3.2)); if (ship.vel.length() < .05) { ship.vel.set(0, 0, 0); ship.braking = false; } }
    else ship.vel.lerp(desired, 1 - Math.exp(-dt * def.accel * (ship.vel.length() > limit ? 3 : 1)));
    // Batas navigasi lembut (PRD R02): rem progresif komponen kecepatan keluar mulai 0,8 R
    const R = ship.pos.length();
    store.hud.boundary = R > RMAX * .8;
    if (R > RMAX * .8) {
      _v2.copy(ship.pos).divideScalar(R);
      const vn = ship.vel.dot(_v2);
      if (vn > 0) ship.vel.addScaledVector(_v2, -vn * smooth(RMAX * .8, RMAX, R) * Math.min(1, dt * 6));
      if (R > RMAX) { ship.pos.setLength(lerp(R, RMAX * .98, Math.min(1, dt * 1.5))); flashMsg('Batas navigasi — kembali ke zona aman'); }
    }
    ship.pos.addScaledVector(ship.vel, dt);
    for (const b of sys.bodies) {
      const minD = b.radius + (b.isSun ? 25 : 1.6);
      _v2.subVectors(ship.pos, b.pos); const d = _v2.length();
      if (d < minD) {
        if (d < 1e-3) _v2.set(0, 1, 0); else _v2.divideScalar(d);
        ship.pos.copy(b.pos).addScaledVector(_v2, minD);
        const vn = ship.vel.dot(_v2);
        if (vn < 0) { ship.vel.addScaledVector(_v2, -vn * 1.3); if (vn < -4) { shake = Math.min(1, -vn / 20); sfx.thump(); flashMsg(b.isSun ? 'Perisai panas aktif — menjauh dari Matahari' : 'Terlalu dekat dengan permukaan'); } }
      }
    }
    ship.speed = ship.vel.length();
  }
  function updateShipVisual(dt, time) {
    shipRoot.position.copy(ship.pos); shipRoot.quaternion.copy(ship.quat);
    if (!shipModel) return;
    const g = shipModel.group, wm = worldMode();
    g.rotation.z = damp(g.rotation.z, ship.rate.y * .35, 4, dt);
    g.rotation.x = damp(g.rotation.x, ship.rate.x * .08, 4, dt);
    const thrust = Math.max(0, ship.throttle), b = ship.boost, def = shipModel.def;
    const idle = wm === 'menu' || wm === 'hangar' ? .25 : 0;
    const pw = Math.max(idle, thrust) + b * .8;
    const fl = .9 + Math.sin(time * 43) * .06 + Math.sin(time * 71) * .04;
    for (const f of shipModel.flames) { f.material.uniforms.uPower.value = Math.min(1.4, .15 + pw); f.scale.set(1, 1, (.5 + thrust * 1.6 + b * 2.8) * def.glow * fl); }
    // semburan api bawaan model (Discovery): panjang mengikuti gas, padam saat gas nol
    for (const p of shipModel.plumes || []) { const w = .7 + .3 * Math.min(1, pw); p.scale.set(w, w, (.3 + thrust * .85 + b * 1.4) * fl); p.visible = pw > .03; }
    for (const s of shipModel.sprites) s.scale.setScalar(def.glow * (.42 + pw * .5) * fl);
    const blink = (time % 1.4) < .12;
    for (const n of shipModel.navLights) n.visible = blink;
    const st = time % 1.3, flash = st < .05 || (st > .14 && st < .19);
    for (const n of shipModel.strobes) n.visible = flash;
    for (const gm of shipModel.glowMats) gm.mat.color.copy(gm.base).multiplyScalar(.5 + pw * 2.6);
    shipRoot.visible = wm !== 'observe' && !(camMode === 'cockpit' && wm === 'jelajah');
  }

  // ---------- Kamera ----------
  const camQ = new THREE.Quaternion();
  const trans = { t: 1, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion() };
  let menuAngle = .6, viewShift = 0;
  const LOOK_DOWN = new THREE.Quaternion().setFromEuler(new THREE.Euler(-.05, 0, 0));
  const lookQ = new THREE.Quaternion(), _eL = new THREE.Euler(), UP = new THREE.Vector3(0, 1, 0), _up = new THREE.Vector3();
  const look = { yaw: 0, pitch: 0, zoom: 1, rmb: false, rmbT: 0, rmbMove: 0, touchId: null, tx: 0, ty: 0, drag: false };
  const obsCam = { yaw: .9, pitch: .22, dist: 3.4, drag: false };
  const lookActive = () => worldMode() === 'jelajah' && store.phase === 'playing' && (look.rmb || !!keys.KeyL || look.touchId !== null);
  function beginCamTransition() { trans.t = 0; trans.fromPos.copy(camera.position); trans.fromQuat.copy(camera.quaternion); }
  function focusBody() { return sys.byId[store.mode === 'sejarah' ? store.sejarah.body : store.focus] || sys.byId.bumi; }

  function updateCamera(dt, time) {
    const def = shipDef(), wm = worldMode();
    const tPos = _v, tQuat = _q;
    if (wm === 'menu' || wm === 'hangar') {
      if (!look.drag && look.touchId === null) menuAngle += dt * (settings.reduceMotion ? .03 : .1);
      const r = def.camZ * 1.05 * look.zoom * (wm === 'hangar' ? 1.15 : 1);
      _v2.set(Math.sin(menuAngle) * r, def.camY + .6 + Math.sin(time * .3) * .5, Math.cos(menuAngle) * r).applyQuaternion(ship.quat);
      tPos.copy(ship.pos).add(_v2);
      _up.copy(UP).applyQuaternion(ship.quat);
      tQuat.setFromRotationMatrix(_m.lookAt(tPos, ship.pos, _up));
      camQ.copy(ship.quat);
    } else if (wm === 'observe') {
      const b = focusBody();
      if (store.toggles.autoCam && !obsCam.drag && !settings.reduceMotion) obsCam.yaw += dt * .08;
      if (store.mode === 'sejarah' && store.toggles.follow && followDir) { const d = followDir(); if (d) { obsCam.yaw = damp(obsCam.yaw, Math.atan2(d.x, d.z), 4, dt); obsCam.pitch = damp(obsCam.pitch, Math.asin(clamp(d.y, -1, 1)), 4, dt); } }
      const dist = b.radius * obsCam.dist + (b.ring ? b.radius * b.ring.outer * .55 : 0);
      _v2.set(Math.sin(obsCam.yaw) * Math.cos(obsCam.pitch), Math.sin(obsCam.pitch), Math.cos(obsCam.yaw) * Math.cos(obsCam.pitch)).multiplyScalar(dist);
      tPos.copy(b.pos).add(_v2);
      tQuat.setFromRotationMatrix(_m.lookAt(tPos, b.pos, UP));
      // geser pandangan agar planet tidak tertutup panel kanan (desktop)
    } else if (wm === 'frozen') {
      tPos.copy(camera.position); tQuat.copy(camera.quaternion);
    } else {
      if (store.phase === 'playing') camQ.slerp(ship.quat, 1 - Math.exp(-dt * (camMode === 'cockpit' ? 30 : 5.5)));
      if (store.phase === 'playing' && !lookActive()) {
        look.yaw = damp(Math.atan2(Math.sin(look.yaw), Math.cos(look.yaw)), 0, 3.5, dt);
        look.pitch = damp(look.pitch, 0, 3.5, dt);
      }
      lookQ.setFromEuler(_eL.set(look.pitch, look.yaw, 0, 'YXZ'));
      if (camMode === 'cockpit') { tPos.set(0, .45, -1.2).applyQuaternion(ship.quat).add(ship.pos); tQuat.copy(camQ).multiply(lookQ); }
      else {
        const sN = clamp(ship.speed / 300, 0, 1);
        _v2.copy(camOffset(def)); _v2.z += sN * 2 + ship.boost * 2.5;
        _v2.multiplyScalar(look.zoom).applyQuaternion(lookQ).applyQuaternion(camQ);
        tPos.copy(ship.pos).add(_v2);
        tQuat.copy(camQ).multiply(lookQ).multiply(LOOK_DOWN);
        if (nearest) { const minD = nearest.radius + 1.2, d = tPos.distanceTo(nearest.pos); if (d < minD) tPos.sub(nearest.pos).setLength(minD).add(nearest.pos); }
      }
    }
    if (intro.snap) { camera.position.copy(tPos); camera.quaternion.copy(tQuat); intro.snap = false; }
    if (intro.on && wm === 'menu') {
      intro.t += dt;
      if (!intro.flying) {
        introShot(intro.t, camera.position, camera.quaternion);
        if (intro.t > intro.hold) beginIntroFlight();
      } else {
        // terbang melengkung di atas ekliptika (tidak menembus Matahari), kamera mengunci pesawat
        intro.k = Math.min(1, intro.k + dt * (intro.fast ? 3 : 1) / intro.fly);
        const k = intro.k, ep = k * k * k * (k * (k * 6 - 15) + 10);
        let er = Math.min(1, k / .38); er = er * er * (3 - 2 * er);
        intro.ep = ep;
        camera.position.lerpVectors(intro.fromPos, tPos, ep);
        camera.position.y += Math.sin(Math.PI * ep) * 2600;
        _iq.setFromRotationMatrix(_im.lookAt(camera.position, ship.pos, _up));
        camera.quaternion.slerpQuaternions(intro.fromQuat, _iq, er);
        if (k >= 1) endIntro();
      }
      if (dt > 0) intro.vel.copy(camera.position).sub(intro.prev).divideScalar(dt);
      intro.prev.copy(camera.position);
    } else if (trans.t < 1) {
      trans.t = Math.min(1, trans.t + dt / (settings.reduceMotion ? .2 : 1.2));
      const e = trans.t * trans.t * (3 - 2 * trans.t);
      camera.position.lerpVectors(trans.fromPos, tPos, e);
      camera.quaternion.slerpQuaternions(trans.fromQuat, tQuat, e);
    } else if (wm === 'menu' || wm === 'hangar') {
      const k = look.drag ? 8 : 3;
      camera.position.lerp(tPos, 1 - Math.exp(-dt * k)); camera.quaternion.slerp(tQuat, 1 - Math.exp(-dt * k));
    } else { camera.position.copy(tPos); camera.quaternion.copy(tQuat); }
    if (shake > 0) { camera.position.x += (Math.random() - .5) * shake * .6; camera.position.y += (Math.random() - .5) * shake * .6; shake = Math.max(0, shake - dt * 2.5); }
    if (wm === 'jelajah' && store.phase === 'playing' && ship.boost > .3) camera.position.addScaledVector(_v2.set(Math.random() - .5, Math.random() - .5, 0).applyQuaternion(camera.quaternion), ship.boost * .04);
    const narrow = 1 + Math.max(0, 1 - camera.aspect) * .5;
    let fovT = (wm === 'jelajah' ? 62 + clamp(ship.speed / 300, 0, 1) * 6 + ship.boost * 10 : wm === 'observe' ? 42 : 50) * narrow;
    if (intro.on) fovT = (intro.flying ? 50 + 24 * Math.sin(Math.PI * intro.ep) : 46) * narrow;
    camera.fov = damp(camera.fov, fovT, 3, dt);
    camera.near = camMode === 'cockpit' && wm === 'jelajah' ? .2 : .5;
    // geser tampilan: menu → pesawat ke kanan; observe/hanggar desktop → objek ke kiri (panel kanan 385 px)
    let wantShift = 0;
    if (innerWidth > 760) { if (wm === 'menu') wantShift = intro.on ? 0 : -innerWidth * .2; else if (wm === 'observe' || wm === 'hangar') wantShift = 200; }
    viewShift = damp(viewShift, wantShift, 3, dt);
    if (Math.abs(viewShift) > .5) camera.setViewOffset(innerWidth, innerHeight, viewShift, 0, innerWidth, innerHeight);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }

  // ---------- HUD: penanda planet, kompas ----------
  let compassCtx = null, compassW = 440, compassH = 40;
  function sizeCompass() {
    if (!el.compass) return;
    const small = isTouch || innerWidth < 760;
    compassW = Math.min(small ? 250 : 440, innerWidth * .62); compassH = 40;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    el.compass.width = Math.round(compassW * dpr); el.compass.height = Math.round(compassH * dpr);
    el.compass.style.width = compassW + 'px'; el.compass.style.height = compassH + 'px';
    compassCtx = el.compass.getContext('2d'); compassCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // Planet nyata selalu ditampilkan dengan namanya; jurnal mencatat mana yang sudah dikunjungi.
  const displayName = (b) => b.name;
  const TOTAL_DISC = () => sys.bodies.length + 1;
  function buildMarkers() {
    el.markers.querySelectorAll('.mk').forEach((n) => n.remove());
    for (const b of sys.bodies) {
      const m = document.createElement('div');
      m.className = 'mk' + (b.isSun ? ' sun' : ''); m.innerHTML = '<i></i><div class="mk-t"><b></b><span></span></div>'; m.style.display = 'none';
      el.markers.appendChild(m);
      b.mk = { el: m, name: m.querySelector('b'), dist: m.querySelector('span'), vis: false };
    }
  }
  const _p = new THREE.Vector3(), _oc = new THREE.Vector3(), _od = new THREE.Vector3();
  function isOccluded(b, dist) {
    _od.copy(b.pos).sub(camera.position).divideScalar(dist || 1);
    for (const o of sys.bodies) {
      if (o === b || o.radius < 3) continue;
      _oc.copy(o.pos).sub(camera.position);
      const t = _oc.dot(_od);
      if (t <= 0 || t >= dist - b.radius) continue;
      if (_oc.lengthSq() - t * t < o.radius * o.radius) return true;
    }
    return false;
  }
  function updateMarkers(slow) {
    const W = innerWidth, Hh = innerHeight, tanH = Math.tan(camera.fov * DEG / 2), show3 = worldMode() === 'jelajah' && store.phase === 'playing';
    let arrowShown = false; const placed = [];
    for (const b of sys.bodies) {
      const m = b.mk, dist = camera.position.distanceTo(b.pos);
      _p.copy(b.pos).project(camera);
      const onScreen = _p.z < 1 && Math.abs(_p.x) < 1.02 && Math.abs(_p.y) < 1.02;
      const pxR = b.radius / dist * (Hh / 2) / tanH, isT = b === target;
      const occ = onScreen && isOccluded(b, dist);
      const show = show3 && (!occ || isT) && onScreen && pxR < 60 && !(b.isMoon && dist > 1800 && !isT);
      if (!show) {
        if (m.vis) { m.el.style.display = 'none'; m.vis = false; }
        if (isT && show3 && !(onScreen && pxR >= 60)) {
          _v.copy(b.pos).sub(camera.position).applyQuaternion(_qi.copy(camera.quaternion).invert());
          let ax = _v.x, ay = _v.y; if (_v.z > 0 && Math.abs(ax) < 1e-3 && Math.abs(ay) < 1e-3) ay = -1;
          const ang = Math.atan2(-ay, ax), rx = W / 2 - 70, ry = Hh / 2 - 110;
          el.arrow.style.display = '';
          el.arrow.style.transform = `translate3d(${W / 2 + Math.cos(ang) * rx}px,${Hh / 2 + Math.sin(ang) * ry}px,0) rotate(${ang}rad)`;
          el.arrow.firstElementChild.style.transform = `rotate(${-ang}rad)`;
          arrowShown = true;
        }
        continue;
      }
      if (!m.vis) { m.el.style.display = ''; m.vis = true; m.last = ''; }
      const x = (_p.x * .5 + .5) * W, y = (-_p.y * .5 + .5) * Hh;
      m.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      m.el.style.setProperty('--s', Math.max(12, pxR * 2 + 12).toFixed(0) + 'px');
      m.cls = 'mk' + (b.isSun ? ' sun' : '') + (isT ? ' tgt' : '') + (discovered.has(b.id) ? '' : ' unk') + (occ ? ' occ' : '');
      placed.push({ m, x, y, pri: isT ? -1 : dist });
      if (slow || m.last === '') { if (m.name.textContent !== displayName(b)) m.name.textContent = displayName(b); m.dist.textContent = fmtDist(ship.pos.distanceTo(b.pos) - b.radius); m.last = 'x'; }
    }
    if (!arrowShown && el.arrow.style.display !== 'none') el.arrow.style.display = 'none';
    placed.sort((a, b) => a.pri - b.pri);
    const kept = [];
    for (const p of placed) {
      const clash = kept.some((k) => Math.abs(k.x - p.x) < 150 && Math.abs(k.y - p.y) < 30);
      const cls = p.m.cls + (clash ? ' nolabel' : '');
      if (p.m.el.className !== cls) p.m.el.className = cls;
      if (!clash) kept.push(p);
    }
  }
  const CARD = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
  const bearingOf = (p) => { const d = _v2.subVectors(p, ship.pos); return (Math.atan2(d.x, -d.z) / DEG + 360) % 360; };
  function drawCompass(heading) {
    const c = compassCtx; if (!c) return;
    const W = compassW, Hc = compassH;
    c.clearRect(0, 0, W, Hc);
    const span = W < 300 ? 90 : 120, ppd = W / span;
    c.lineWidth = 1; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    const start = Math.floor((heading - span / 2) / 5) * 5;
    for (let d = start; d <= heading + span / 2; d += 5) {
      const x = W / 2 + (d - heading) * ppd, dn = ((d % 360) + 360) % 360;
      const major = dn % 45 === 0, mid = dn % 15 === 0;
      c.globalAlpha = Math.max(0, 1 - Math.abs(x - W / 2) / (W / 2));
      c.strokeStyle = major ? 'rgba(223,246,255,.95)' : 'rgba(168,237,235,.55)';
      const h = major ? 11 : mid ? 7 : 4;
      c.beginPath(); c.moveTo(x + .5, Hc - 2); c.lineTo(x + .5, Hc - 2 - h); c.stroke();
      if (major) { c.fillStyle = dn === 0 ? '#efc58e' : '#dff6ff'; c.font = '700 12px "Chakra Petch", sans-serif'; c.fillText(CARD[dn / 45], x, Hc - 17); }
      else if (mid) { c.fillStyle = 'rgba(223,246,255,.55)'; c.font = '500 9px "JetBrains Mono", monospace'; c.fillText(String(dn).padStart(3, '0'), x, Hc - 16); }
    }
    c.globalAlpha = 1;
    const mark = (bearing, color, shape) => {
      let dd = ((bearing - heading + 540) % 360) - 180;
      const edge = Math.abs(dd) > span / 2 - 3; dd = clamp(dd, -span / 2 + 3, span / 2 - 3);
      const x = W / 2 + dd * ppd;
      c.fillStyle = color; c.beginPath();
      if (shape === 'sun') c.arc(x, 5, 3.2, 0, TAU);
      else if (edge) { const s = Math.sign(dd); c.moveTo(x + s * 6, 5); c.lineTo(x - s * 2, 0); c.lineTo(x - s * 2, 10); }
      else { c.moveTo(x, 10); c.lineTo(x - 5, 1); c.lineTo(x + 5, 1); }
      c.fill();
    };
    mark(bearingOf(sys.bodies[0].pos), '#ffc861', 'sun');
    if (target && !target.isSun) mark(bearingOf(target.pos), '#efc58e', 'tri');
    c.strokeStyle = '#a8edeb'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, Hc); c.lineTo(W / 2, Hc - 16); c.stroke();
  }

  let hudTick = 0;
  function updateHUD(dt) {
    if (worldMode() !== 'jelajah') { if (el.arrow.style.display !== 'none') el.arrow.style.display = 'none'; for (const b of sys.bodies) if (b.mk.vis) { b.mk.el.style.display = 'none'; b.mk.vis = false; } return; }
    hudTick += dt;
    const slow = hudTick > .08; if (slow) hudTick = 0;
    updateMarkers(slow);
    const fwd = _v.set(0, 0, -1).applyQuaternion(ship.quat);
    const heading = (Math.atan2(fwd.x, -fwd.z) / DEG + 360) % 360;
    const pitch = Math.asin(clamp(fwd.y, -1, 1)) / DEG;
    // bidik silang & kursor kemudi
    const right = _v2.set(1, 0, 0).applyQuaternion(ship.quat), upv = _up.copy(UP).applyQuaternion(ship.quat);
    if (el.horizon) el.horizon.style.transform = `rotate(${(-Math.atan2(-right.y, upv.y)).toFixed(3)}rad)`;
    const la = lookActive(), off = Math.abs(look.yaw) > .03 || Math.abs(look.pitch) > .03;
    let chx = 0, chy = 0, chVis = true;
    if (off) { _p.copy(ship.pos).addScaledVector(fwd, 600).project(camera); if (_p.z > 1 || Math.abs(_p.x) > 1.1 || Math.abs(_p.y) > 1.1) chVis = false; else { chx = _p.x * innerWidth / 2; chy = -_p.y * innerHeight / 2; } }
    if (el.crosshair) { el.crosshair.style.transform = `translate3d(${chx.toFixed(1)}px,${chy.toFixed(1)}px,0)`; el.crosshair.style.opacity = chVis ? '' : '0'; }
    if (store.look.active !== la) store.look.active = la;
    const cursorOn = (pointerLocked || dragging) && !la && !off && store.phase === 'playing';
    const rad = Math.min(innerWidth, innerHeight) * .22, cx = stick.x * rad, cy = stick.y * rad, cl = Math.hypot(cx, cy);
    if (el.cursor) { el.cursor.classList.toggle('on', cursorOn); el.cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`; }
    if (el.cursorLine) { el.cursorLine.classList.toggle('on', cursorOn && cl > 16); el.cursorLine.style.width = cl + 'px'; el.cursorLine.style.transform = `rotate(${Math.atan2(cy, cx)}rad)`; }
    drawCompass(heading);
    const sunB = sys.bodies[0];
    if (el.vignette) el.vignette.style.opacity = (1 - smooth(sunB.radius * 1.3, sunB.radius * 2.6, sunB.dist ?? 1e9)).toFixed(2);
    if (el.boostFx) el.boostFx.style.opacity = (ship.boost * .9).toFixed(2);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) store.msg.show = false; }
    if (!slow) return;
    const h = store.hud;
    h.hdg = String(Math.round(heading) % 360).padStart(3, '0') + '°';
    h.pit = (pitch >= 0 ? '+' : '−') + String(Math.abs(Math.round(pitch))).padStart(2, '0') + '°';
    h.speed = new Intl.NumberFormat('id-ID').format(Math.round(ship.speed * KM));
    const t = ship.throttle, z = .3 / 1.3 * 100;
    if (t >= 0) { h.thrLeft = z; h.thrWidth = t * (100 - z); } else { h.thrLeft = z + t / .3 * z; h.thrWidth = -t / .3 * z; }
    h.thrTxt = ship.braking ? 'Mengerem…' : t < -.01 ? `Mundur ${Math.round(-t / .3 * 100)}%` : `Dorongan ${Math.round(t * 100)}%`;
    h.boost = ship.boost > .3; h.limited = ship.limited;
    if (nearest) { h.near.name = displayName(nearest); h.near.kind = nearest.kind; h.near.dist = fmtDist(nearest.dist); h.near.alt = fmtDist(nearest.alt); }
    h.x = fmtCoord(ship.pos.x); h.y = fmtCoord(ship.pos.y); h.z = fmtCoord(ship.pos.z);
    if (target) {
      h.target.id = target.id; h.target.name = displayName(target);
      const d = ship.pos.distanceTo(target.pos) - target.radius;
      h.target.dist = fmtDist(d);
      const closing = ship.vel.dot(_v.copy(target.pos).sub(ship.pos).normalize());
      h.target.eta = closing > .5 ? fmtEta(d / closing) : '—';
    }
    h.disc = `${discovered.size}/${TOTAL_DISC()}`;
    h.simDate = fmtSimDate(gameTime);
  }

  // ---------- Pesan, banner, toast ----------
  let bannerT = null, toastT = null, savedT = null;
  function showBanner(kick, title, kind, desc) { Object.assign(store.banner, { show: true, kick, title, kind, desc }); clearTimeout(bannerT); bannerT = setTimeout(() => { store.banner.show = false; }, 6500); }
  function toast(html, ms = 4200) { store.toast.html = html; store.toast.show = true; clearTimeout(toastT); toastT = setTimeout(() => { store.toast.show = false; }, ms); }
  function flashMsg(text) { store.msg.text = text; store.msg.show = true; msgTimer = 2; }
  function flashSaved(label = 'Tersimpan') { store.saved.label = label; store.saved.show = true; clearTimeout(savedT); savedT = setTimeout(() => { store.saved.show = false; }, 1800); }

  // ---------- Pemindaian & target ----------
  function syncDiscovered() { store.discovered = [...discovered]; }
  function scanBodies() {
    let best = null, bestAlt = Infinity;
    const playing = worldMode() === 'jelajah' && store.phase === 'playing';
    for (const b of sys.bodies) {
      b.dist = ship.pos.distanceTo(b.pos); b.alt = b.dist - b.radius;
      if (b.alt < bestAlt) { bestAlt = b.alt; best = b; }
      const near = b.dist < b.approach;
      if (near && !b.inRange) { b.inRange = true; if (playing) onApproach(b); }
      else if (!near && b.dist > b.approach * 1.35) b.inRange = false;
    }
    nearest = best;
    const rxz = Math.hypot(ship.pos.x, ship.pos.z);
    const belt = rxz > BELT.inner && rxz < BELT.outer && Math.abs(ship.pos.y) < BELT.half * 1.3;
    if (belt && !inBelt && playing) {
      const isNew = !discovered.has(BELT.id);
      if (isNew) { discovered.add(BELT.id); syncDiscovered(); sfx.chime(); saveGame('Titik simpan'); toast(`<b>Penemuan baru</b> · ${BELT.name} dicatat di jurnal (${discovered.size}/${TOTAL_DISC()})`); }
      showBanner(isNew ? 'Penemuan baru' : 'Memasuki wilayah', BELT.name, BELT.kind, BELT.desc);
    }
    inBelt = belt;
  }
  function onApproach(b) {
    const isNew = !discovered.has(b.id);
    if (isNew) { discovered.add(b.id); syncDiscovered(); sfx.chime(); toast(`<b>Penemuan baru</b> · ${b.name} dicatat di jurnal (${discovered.size}/${TOTAL_DISC()})`); saveGame('Titik simpan'); }
    else sfx.approach();
    showBanner(isNew ? 'Penemuan baru' : 'Mendekati', b.name, b.kind, b.desc);
  }
  function setTarget(id, quiet) {
    const b = sys.byId[id]; if (!b) return;
    target = b; store.hud.target.id = id; store.hud.target.name = displayName(b);
    if (!quiet) { sfx.target(); toast(`Target navigasi: <b>${displayName(b)}</b> · tahan <kbd>G</kbd> untuk mengarahkan`, 2600); }
  }
  function cycleTarget(dir = 1) {
    const list = sys.bodies; let i = target ? list.indexOf(target) : -1;
    i = (i + dir + list.length) % list.length; setTarget(list[i].id);
  }

  // ---------- Simpan & muat ----------
  const r2 = (n) => Math.round(n * 100) / 100, r4 = (n) => Math.round(n * 1e4) / 1e4;
  function saveGame(label) {
    if (!sessionActive) return false;
    const src = snapshot || { pos: ship.pos, quat: ship.quat, gameTime };
    _e.setFromQuaternion(src.quat, 'XYZ');
    const ok = writeGameState({
      position: { x: r2(src.pos.x), y: r2(src.pos.y), z: r2(src.pos.z) }, rotation: { x: r4(_e.x), y: r4(_e.y), z: r4(_e.z) },
      gameTime: r4(src.gameTime ?? gameTime), lastSaved: new Date().toISOString(), discovered: [...discovered], nearest: nearest ? nearest.id : null,
      target: target ? target.id : null, ship: store.progress.selectedShip,
    });
    if (ok && label) flashSaved(label);
    refreshSaveMeta();
    return ok;
  }
  function applySave(s) {
    if (Number.isFinite(s.gameTime)) gameTime = s.gameTime;
    updateBodies(sys.bodies, sys.byId, gameTime);
    ship.pos.set(s.position.x, s.position.y, s.position.z);
    ship.quat.setFromEuler(_e.set(s.rotation.x, s.rotation.y, s.rotation.z, 'XYZ'));
    ship.vel.set(0, 0, 0); ship.rate.set(0, 0, 0); ship.throttle = 0; ship.boost = 0; ship.braking = false;
    discovered.clear(); discovered.add('matahari');
    if (Array.isArray(s.discovered)) for (const id of s.discovered) if (sys.byId[id] || id === BELT.id) discovered.add(id);
    syncDiscovered();
    if (s.target && sys.byId[s.target]) setTarget(s.target, true);
  }
  function refreshSaveMeta() {
    const s = readGameState();
    store.hasSave = !!s;
    if (s) {
      const nb = s.nearest && sys.byId[s.nearest];
      store.saveMeta = `Tersimpan ${fmtDate(s.lastSaved)}${nb ? ' · dekat ' + nb.name : ''} · ${Array.isArray(s.discovered) ? s.discovered.length : 1} penemuan`;
    }
  }

  // ---------- Snapshot konteks (PRD §10) ----------
  function takeSnapshot() {
    if (snapshot) return;
    snapshot = { pos: ship.pos.clone(), quat: ship.quat.clone(), vel: ship.vel.clone(), throttle: ship.throttle, gameTime, camPos: camera.position.clone(), camQuat: camera.quaternion.clone(), target: target ? target.id : null, camMode };
    obsTime = gameTime; // cabang waktu observasi
    store.obs.day = obsTime;
  }
  function restoreSnapshot() {
    if (!snapshot) return;
    const s = snapshot; snapshot = null;
    gameTime = s.gameTime; updateBodies(sys.bodies, sys.byId, gameTime);
    ship.pos.copy(s.pos); ship.quat.copy(s.quat); ship.vel.copy(s.vel); ship.throttle = s.throttle; ship.rate.set(0, 0, 0); ship.boost = 0;
    camQ.copy(ship.quat); camMode = s.camMode;
    for (const k in keys) keys[k] = false; for (const k in hold) hold[k] = false; joy.x = joy.y = 0; stick.x = stick.y = 0;
  }

  // ---------- Mode ----------
  function setMode(m, opts = {}) {
    if (!sys) return;
    const prev = store.mode;
    if (store.phase !== 'playing' && store.phase !== 'paused') return;
    if (m === prev && !opts.force) return;
    if (prev === 'jelajah') { takeSnapshot(); exitLock(); }
    store.phase = 'playing';
    store.mode = m;
    if (m === 'jelajah') { restoreSnapshot(); beginCamTransition(); clearPOIs(); orbitsVisible(false); for (const x of sys.bodies) if (x.axisLine) x.axisLine.visible = false; requestLock(); }
    else if (m === 'planet' || m === 'sejarah') {
      if (opts.body) { if (m === 'planet') store.focus = opts.body; else store.sejarah.body = opts.body; }
      const b = focusBody();
      if (!(prev === 'planet' || prev === 'sejarah') || opts.body) { obsCam.dist = b.ring ? 4.0 : 4.6; obsCam.pitch = .22; obsCam.yaw = .9; }
      beginCamTransition();
      applyObsToggles();
      if (m === 'sejarah') buildPOIs(); else clearPOIs();
    } else if (m === 'fenomena') {
      ensureLab(); clearPOIs();
      lab.setType(store.lab.type); lab.setPOV(store.lab.pov, true);
    } else if (m === 'hanggar') { beginCamTransition(); clearPOIs(); store.hangarPreview = store.progress.selectedShip; }
    else clearPOIs();
    sfx.click();
  }
  function orbitsVisible(v) { if (sys) sys.orbitGroup.visible = v; }
  function applyObsToggles() {
    const b = focusBody();
    orbitsVisible(store.toggles.orbit);
    for (const x of sys.bodies) if (x.axisLine) x.axisLine.visible = store.toggles.axis && x === b;
  }
  function focus(id) { if (store.mode === 'sejarah') { store.sejarah.body = id; buildPOIs(); } else store.focus = id; obsCam.dist = sys.byId[id]?.ring ? 4.0 : 4.6; beginCamTransition(); applyObsToggles(); }

  // ---------- POI sejarah (body-fixed) & lintasan non-permukaan ----------
  let pois = [], pathObj = null, pathLabel = null, followDir = null;
  function clearPOIs() {
    for (const p of pois) p.el.remove(); pois = [];
    if (pathObj) { pathObj.parent && pathObj.parent.remove(pathObj); pathObj = null; }
    if (pathLabel) { pathLabel.el.remove(); pathLabel = null; }
    followDir = null;
    if (sys) for (const x of sys.bodies) if (x.axisLine && store.mode !== 'planet' && store.mode !== 'sejarah') x.axisLine.visible = false;
  }
  function eraFilter(e) {
    const er = { semua: [-1e9, 1e9], kuno: [-1e9, 1609], teleskopik: [1610, 1956], antariksa: [1957, 1e9] }[store.sejarah.era] || [-1e9, 1e9];
    return e.year >= er[0] && e.year <= er[1];
  }
  function buildPOIs() {
    clearPOIs();
    const b = sys.byId[store.sejarah.body]; if (!b) return;
    const list = (HISTORY[b.id] || []).filter(eraFilter);
    for (const e of list) {
      if (e.lat == null) continue;
      const node = document.createElement('button');
      node.className = 'poi' + (e.id === store.sejarah.selected ? ' sel' : '');
      node.innerHTML = `<i></i><span><b>${e.actor}</b><em>${e.year} · ${e.title}</em></span>`;
      node.addEventListener('click', () => { store.sejarah.selected = e.id; selectEvent(e.id); });
      el.poi.appendChild(node);
      pois.push({ e, el: node, local: latLonToLocal(e.lat, e.lon), body: b });
    }
    selectEvent(store.sejarah.selected, true);
  }
  function selectEvent(id, quiet) {
    const b = sys.byId[store.sejarah.body]; if (!b) return;
    for (const p of pois) p.el.classList.toggle('sel', p.e.id === id);
    if (pathObj) { pathObj.parent && pathObj.parent.remove(pathObj); pathObj = null; }
    if (pathLabel) { pathLabel.el.remove(); pathLabel = null; }
    const e = (HISTORY[b.id] || []).find((x) => x.id === id);
    followDir = null;
    if (!e) return;
    const R = b.radius;
    if (e.lat != null) {
      const p = pois.find((x) => x.e.id === id);
      if (p) followDir = () => b.spinMesh.localToWorld(p.local.clone()).sub(b.pos).normalize();
      return;
    }
    let pts = null, anchor = null, label = '';
    if (e.locationType === 'flyby') {
      pts = [[-8, 1.6, 5], [-3, .6, 2.2], [-.6, .25, 1.6], [1.2, -.05, 1.5], [3.2, -.5, 2.0], [8, -1.6, -3]].map(([x, y, z]) => new THREE.Vector3(x * R, y * R, z * R));
      anchor = pts[3]; label = `Lintasan flyby · ${e.actor}`;
    } else if (e.locationType === 'orbit') {
      pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * R * 1.9, Math.sin(a) * R * .55, Math.sin(a) * R * 1.9)); }
      anchor = pts[20]; label = `Orbit wahana · ${e.actor}`;
    } else if (e.locationType === 'atmosphere') {
      pts = [[5, 2.4, 3], [2.6, 1.3, 1.6], [1.4, .7, .9], [.86, .44, .5]].map(([x, y, z]) => new THREE.Vector3(x * R, y * R, z * R));
      anchor = pts[1]; label = `Masuk atmosfer · ${e.actor}`;
    }
    if (pts) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(160)),
        new THREE.LineDashedMaterial({ color: '#a8edeb', dashSize: R * .12, gapSize: R * .08, transparent: true, opacity: .9, depthWrite: false }));
      line.computeLineDistances(); b.holder.add(line); pathObj = line;
      const node = document.createElement('div'); node.className = 'poi path';
      node.innerHTML = `<i></i><span><b>${label}</b><em>Bukan titik pendaratan</em></span>`;
      el.poi.appendChild(node); pathLabel = { el: node, local: anchor, body: b };
    }
    if (!quiet) sfx.click();
  }
  function focusLocation() {
    if (!followDir) return false;
    const d = followDir(); obsCam.yaw = Math.atan2(d.x, d.z); obsCam.pitch = Math.asin(clamp(d.y, -1, 1)); obsCam.dist = 2.3; beginCamTransition(); return true;
  }
  function updatePOIs() {
    if (store.mode !== 'sejarah' || worldMode() !== 'observe') return;
    const W = innerWidth, Hh = innerHeight;
    for (const p of pois) {
      const w = p.body.spinMesh.localToWorld(_v.copy(p.local));
      const n = _v2.copy(w).sub(p.body.pos).normalize();
      const facing = n.dot(_up.copy(camera.position).sub(w).normalize()) > .06;
      _p.copy(w).project(camera);
      const vis = facing && _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05;
      p.el.classList.toggle('far', !facing);
      p.el.style.display = vis ? '' : 'none';
      if (vis) p.el.style.transform = `translate3d(${((_p.x * .5 + .5) * W).toFixed(1)}px,${((-_p.y * .5 + .5) * Hh).toFixed(1)}px,0)`;
    }
    if (pathLabel) {
      const w = pathLabel.body.holder.localToWorld(_v.copy(pathLabel.local)); _p.copy(w).project(camera);
      const vis = _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05;
      pathLabel.el.style.display = vis ? '' : 'none';
      if (vis) pathLabel.el.style.transform = `translate3d(${((_p.x * .5 + .5) * W).toFixed(1)}px,${((-_p.y * .5 + .5) * Hh).toFixed(1)}px,0)`;
    }
  }
  const poiStatus = () => pois.map((p) => ({ id: p.e.id, far: p.el.classList.contains('far') }));

  // ---------- Laboratorium fenomena ----------
  const labLabels = {};
  function ensureLab() {
    if (lab) return;
    lab = createLab(renderer, { background: skyTex, environment: scene.environment }, U.uTime, models);
    for (const [k, name] of [['matahari', 'Matahari'], ['bumi', 'Bumi'], ['bulan', 'Bulan'], ['umbra', 'Umbra'], ['penumbra', 'Penumbra']]) {
      const n = document.createElement('div'); n.className = 'lab-lbl ' + k; n.textContent = name; el.labLabels.appendChild(n); labLabels[k] = n;
    }
  }
  function syncLabFromStore() {
    const s = store.lab;
    lab.st.playing = s.playing; lab.st.speed = s.speed; lab.st.volume = s.volume; lab.st.labels = s.labels;
  }
  function updateLabLabels() {
    const W = innerWidth, Hh = innerHeight;
    for (const [k, n] of Object.entries(labLabels)) {
      _p.copy(lab.labelPos[k]).project(lab.camera);
      const onScreen = _p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05;
      const isVol = k === 'umbra' || k === 'penumbra';
      const vis = store.lab.labels && onScreen && (!isVol || store.lab.volume) && lab.st.pov !== 'pengamat';
      n.style.display = vis ? '' : 'none';
      if (vis) n.style.transform = `translate3d(${((_p.x * .5 + .5) * W).toFixed(1)}px,${((-_p.y * .5 + .5) * Hh).toFixed(1)}px,0)`;
    }
  }

  // ---------- Input ----------
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);
  let lastUnlockPause = 0;
  on(window, 'keydown', (e) => {
    if (typing(e) && e.code !== 'Escape') return;
    if (store.modal) { if (e.code === 'Escape') store.modal = null; return; }
    keys[e.code] = true;
    const wm = worldMode();
    if (wm === 'jelajah' && store.phase === 'playing') {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      switch (e.code) {
        case 'KeyT': cycleTarget(e.shiftKey ? -1 : 1); break;
        case 'KeyV': toggleCam(); break;
        case 'KeyH': store.hudOff = !store.hudOff; break;
        case 'KeyO': orbitsVisible(!sys.orbitGroup.visible); toast(sys.orbitGroup.visible ? 'Garis orbit ditampilkan' : 'Garis orbit disembunyikan', 1600); break;
        case 'KeyX': stop(); break;
        case 'KeyM': setMode('peta'); break;
        case 'KeyJ': pause(); store.modal = 'journal'; break;
        case 'Escape': case 'KeyP': if (performance.now() - lastUnlockPause > 400) pause(); break;
      }
    } else if (store.phase === 'paused') {
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat && performance.now() - lastUnlockPause > 400) resume();
    } else if (store.phase === 'playing' && wm !== 'jelajah') {
      if (e.code === 'Escape' && !e.repeat) setMode(store.mode === 'fenomena' && store.lab.caller ? store.lab.caller : 'jelajah');
    }
  });
  on(window, 'keyup', (e) => { keys[e.code] = false; });
  on(window, 'blur', () => { for (const k in keys) keys[k] = false; for (const k in hold) hold[k] = false; look.rmb = false; look.drag = false; });
  function requestLock() {
    if (isTouch || !canvas.requestPointerLock || worldMode() !== 'jelajah') return;
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {}
  }
  function exitLock() { if (pointerLocked) { leavingLock = true; document.exitPointerLock(); } }
  function applyLookDelta(dx, dy, k) { look.yaw -= dx * k; look.pitch = clamp(look.pitch - dy * k * (settings.invertY ? -1 : 1), -1.35, 1.35); }
  let lastTouchT = 0;
  on(canvas, 'mousedown', (e) => {
    if (performance.now() - lastTouchT < 800) return;
    const wm = worldMode();
    if ((wm === 'menu' || wm === 'hangar' || wm === 'observe' || wm === 'lab') && e.button === 0) { look.drag = true; obsCam.drag = true; return; }
    if (wm !== 'jelajah' || store.phase !== 'playing') return;
    if (e.button === 2) { look.rmb = true; look.rmbT = performance.now(); look.rmbMove = 0; return; }
    if (e.button !== 0) return;
    if (!pointerLocked) { requestLock(); dragging = true; }
  });
  on(window, 'mouseup', (e) => {
    if (e.button === 0) { look.drag = false; obsCam.drag = false; if (dragging) { dragging = false; if (!pointerLocked) stick.x = stick.y = 0; } }
    if (e.button === 2 && look.rmb) { look.rmb = false; if (performance.now() - look.rmbT < 220 && look.rmbMove < 6) stick.x = stick.y = 0; }
  });
  on(window, 'mousemove', (e) => {
    const wm = worldMode();
    if (look.drag && (wm === 'menu' || wm === 'hangar')) { menuAngle -= e.movementX * .006; return; }
    if (obsCam.drag && wm === 'observe') { obsCam.yaw -= e.movementX * .006; obsCam.pitch = clamp(obsCam.pitch + e.movementY * .005, -1.4, 1.4); return; }
    if (obsCam.drag && wm === 'lab') { lab.lookDrag(e.movementX, e.movementY); return; }
    if (wm !== 'jelajah' || store.phase !== 'playing') return;
    if (lookActive()) { look.rmbMove += Math.abs(e.movementX) + Math.abs(e.movementY); applyLookDelta(e.movementX, e.movementY, .0042 * settings.sensitivity); return; }
    if (!(pointerLocked || dragging)) return;
    const k = .0024 * settings.sensitivity;
    stick.x += e.movementX * k; stick.y += e.movementY * k;
    const l = Math.hypot(stick.x, stick.y); if (l > 1) { stick.x /= l; stick.y /= l; }
  });
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(canvas, 'wheel', (e) => {
    const wm = worldMode();
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    if (wm === 'menu' || wm === 'hangar' || lookActive()) { look.zoom = clamp(look.zoom * f, .6, 2.6); return; }
    if (wm === 'observe') { obsCam.dist = clamp(obsCam.dist * f, 1.25, 14); return; }
    if (wm === 'lab') { lab.zoom(f); return; }
    if (wm !== 'jelajah' || store.phase !== 'playing') return;
    ship.throttle = clamp(ship.throttle - Math.sign(e.deltaY) * .05, -.3, 1); ship.braking = false;
  }, { passive: false });
  on(canvas, 'pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    lastTouchT = performance.now();
    if (look.touchId !== null) return;
    look.touchId = e.pointerId; look.tx = e.clientX; look.ty = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  on(canvas, 'pointermove', (e) => {
    if (e.pointerId !== look.touchId) return;
    const dx = e.clientX - look.tx, dy = e.clientY - look.ty; look.tx = e.clientX; look.ty = e.clientY;
    const wm = worldMode();
    if (wm === 'menu' || wm === 'hangar') menuAngle -= dx * .008;
    else if (wm === 'observe') { obsCam.yaw -= dx * .007; obsCam.pitch = clamp(obsCam.pitch + dy * .006, -1.4, 1.4); }
    else if (wm === 'lab') lab.lookDrag(dx, dy);
    else if (wm === 'jelajah') applyLookDelta(dx, dy, .006);
  });
  const endTouch = (e) => { if (e.pointerId === look.touchId) { look.touchId = null; lastTouchT = performance.now(); } };
  on(canvas, 'pointerup', endTouch); on(canvas, 'pointercancel', endTouch);
  let lockedAt = 0;
  on(document, 'pointerlockchange', () => {
    pointerLocked = document.pointerLockElement === canvas;
    if (pointerLocked) { dragging = false; lockedAt = performance.now(); }
    if (!pointerLocked) {
      stick.x = stick.y = 0; look.rmb = false;
      if (leavingLock) { leavingLock = false; return; }
      if (performance.now() - lockedAt < 400) return; // kunci langsung dilepas browser (mis. webview) — jangan jeda
      if (worldMode() === 'jelajah' && store.phase === 'playing') { lastUnlockPause = performance.now(); pause(); }
    }
  });
  on(window, 'pagehide', () => saveGame());
  on(window, 'beforeunload', () => saveGame());
  on(document, 'visibilitychange', () => {
    if (document.hidden) { saveGame(); if (worldMode() === 'jelajah' && store.phase === 'playing') pause(); if (sfx.ctx) sfx.ctx.suspend(); }
    else if (sfx.ctx && settings.soundEnabled) sfx.ctx.resume();
  });
  on(window, 'resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    if (renderer) { renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); }
    sizeCompass();
  });

  // ---------- Alur permainan ----------
  function startGame(fromSave) {
    if (!sys) return;
    if (intro.on) endIntro();
    sfx.init();
    snapshot = null;
    if (fromSave) { const s = readGameState(); if (s) applySave(s); else { resetShip(defaultPose()); } }
    else { gameTime = daysSinceJ2000(); updateBodies(sys.bodies, sys.byId, gameTime); resetShip(defaultPose()); discovered.clear(); discovered.add('matahari'); syncDiscovered(); setTarget('mars', true); }
    for (const b of sys.bodies) b.inRange = false;
    inBelt = false; sessionActive = true;
    if (!target) setTarget('mars', true);
    setShip(store.progress.selectedShip);
    store.mode = 'jelajah'; store.phase = 'playing';
    saveGame();
    camQ.copy(ship.quat); beginCamTransition();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    requestLock();
    if (!fromSave) setTimeout(() => showBanner('Selamat datang, penjelajah', 'Tata Surya', 'Orbit Bumi', 'Tekan W untuk melaju. Dekati planet untuk mencatatnya di jurnal, atau buka dock di bawah untuk belajar.'), 900);
  }
  function pause() {
    if (store.phase !== 'playing') return;
    store.phase = 'paused'; saveGame('Tersimpan'); exitLock();
    for (const k in hold) hold[k] = false; joy.x = joy.y = 0;
  }
  function resume() {
    if (store.phase !== 'paused') return;
    store.modal = null; store.phase = 'playing';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (store.mode === 'jelajah') requestLock();
  }
  function toMenu() {
    if (store.mode !== 'jelajah') { store.phase = 'playing'; setMode('jelajah'); }
    saveGame(); sessionActive = false; exitLock();
    store.modal = null; store.phase = 'menu'; store.mode = 'jelajah';
    refreshSaveMeta(); beginCamTransition(); clearPOIs();
  }
  function toggleCam() { camMode = camMode === 'chase' ? 'cockpit' : 'chase'; store.camMode = camMode; toast(camMode === 'chase' ? 'Kamera: pandangan belakang' : 'Kamera: kokpit', 1500); }
  function stop() {
    if (store.mode !== 'jelajah') setMode('jelajah');
    ship.throttle = 0; ship.braking = true; flashMsg('Berhenti — dorongan dan kecepatan menuju nol');
  }

  // Lapisan latar (langit + bintang + lubang hitam) dulu, lalu tata surya di atasnya dengan depth dibersihkan.
  function renderWorld() {
    bgCam.copy(camera); bgCam.near = 200; bgCam.far = 200000; bgCam.updateProjectionMatrix();
    if (settings.graphics === 'tinggi') { composer.render(); return; }
    renderer.autoClear = false; renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.clearDepth(); renderer.render(scene, camera);
    renderer.autoClear = true;
  }

  // ---------- Loop ----------
  const timer = new THREE.Timer();
  let time = 0, autosaveT = 0, labTick = 0;
  function loop(ts) {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), .05);
    time += dt; U.uTime.value = time;
    const wm = worldMode();
    if (wm === 'jelajah' && store.phase === 'playing') gameTime += dt * TIME_RATE;
    if (wm === 'observe' && store.phase === 'playing') { obsTime += dt * TIME_RATE * store.obs.mul; labTick += dt; if (labTick > .1) { labTick = 0; store.obs.day = obsTime; store.obs.date = fmtSimDate(obsTime); } }
    if (wm === 'lab') {
      syncLabFromStore();
      lab.update(store.phase === 'playing' ? dt : 0, settings.reduceMotion);
      // geser pandangan lab agar objek tidak tertutup panel kanan (desktop)
      if (innerWidth > 760) lab.camera.setViewOffset(innerWidth, innerHeight, 190, 0, innerWidth, innerHeight); else lab.camera.clearViewOffset();
      lab.camera.updateProjectionMatrix();
      labTick += dt; if (labTick > .08) { labTick = 0; store.lab.t = lab.st.t; store.lab.playing = lab.st.playing; store.lab.status = lab.status.type; store.lab.covered = lab.status.covered || 0; }
      // lab punya langitnya sendiri: lapisan latar dimatikan, pass utama membersihkan layar sendiri
      bgPass.enabled = false; renderPass.clear = true; renderPass.clearDepth = false;
      renderPass.scene = lab.scene; renderPass.camera = lab.camera;
      if (settings.graphics === 'tinggi') composer.render(); else renderer.render(lab.scene, lab.camera);
      renderPass.scene = scene; renderPass.camera = camera;
      bgPass.enabled = true; renderPass.clear = false; renderPass.clearDepth = true;
      updateLabLabels();
      for (const n of Object.values(labLabels)) n.parentElement.style.display = '';
      return;
    }
    if (lab) el.labLabels.style.display = 'none';
    const tB = bodyTime();
    updateBodies(sys.bodies, sys.byId, tB);
    sys.belt.rotation.y = TAU * tB / (4.6 * 365.25);
    scanBodies();
    if (wm === 'jelajah' && store.phase === 'playing') {
      readInput(dt); updateShip(dt);
      autosaveT += dt; if (autosaveT > 10) { autosaveT = 0; saveGame('Simpan otomatis'); }
    }
    updateShipVisual(dt, time);
    updateCamera(dt, time);
    skyGroup.position.copy(camera.position);
    sys.bodies[0].corona.quaternion.copy(camera.quaternion);
    updateDust(wm === 'jelajah' && store.phase === 'playing' ? ship.vel : intro.flying ? intro.vel : _v.set(0, 0, 0));
    if (blackHole && !settings.reduceMotion) blackHole.rotateY(dt * .025);
    // cahaya Matahari untuk pesawat + gerhana oleh planet
    _v.copy(ship.pos).normalize();
    sys.sunLight.position.copy(ship.pos).addScaledVector(_v, -50); sys.sunLight.target.position.copy(ship.pos);
    let lightF = 1; const toSunLen = ship.pos.length();
    for (const b of sys.bodies) {
      if (b.isSun) continue;
      _v2.copy(b.pos).sub(ship.pos);
      const t = _v2.dot(_v.set(-ship.pos.x, -ship.pos.y, -ship.pos.z).divideScalar(toSunLen || 1));
      if (t <= 0 || t > toSunLen) continue;
      lightF = Math.min(lightF, smooth(b.radius * .92, b.radius * 1.06, Math.sqrt(Math.max(0, _v2.lengthSq() - t * t))));
    }
    sys.sunLight.intensity = 2.6 * (.04 + .96 * lightF);
    const sunB = sys.bodies[0];
    _v.copy(sunB.pos).sub(camera.position); const sd = _v.length();
    const facing = clamp(_v.divideScalar(sd || 1).dot(_v2.set(0, 0, -1).applyQuaternion(camera.quaternion)), 0, 1);
    const glare = (1 - smooth(sunB.radius * 2, sunB.radius * 10, sd)) * (.35 + .65 * facing);
    renderer.toneMappingExposure = damp(renderer.toneMappingExposure, 1 - glare * .55, 2.5, dt);
    for (const b of sys.bodies) if (b.atm) b.atm.material.side = camera.position.distanceTo(b.pos) < b.radius * b.atmoScale ? THREE.BackSide : THREE.FrontSide;
    renderWorld();
    updateHUD(dt); updatePOIs();
    sfx.update(wm === 'jelajah' && store.phase === 'playing', ship);
  }

  // ---------- Boot ----------
  const setLoad = (p, text) => { store.loading.p = p; store.loading.text = text; };
  async function boot() {
    store.phase = 'loading'; store.mode = 'jelajah'; store.loading.error = '';
    try {
      setLoad(.08, 'Menyiapkan mesin grafis…'); await nextFrame();
      initRenderer();
      initShipFactory(renderer, U, isTouch);
      setLoad(.16, 'Melukis nebula dan bintang…'); await nextFrame(); await nextFrame();
      bakeSky();
      setLoad(.22, 'Memuat model 3D planet & pesawat…'); await nextFrame();
      models = await loadModels((f, done, n) => setLoad(.22 + f * .38, `Memuat model 3D planet & pesawat… ${done}/${n}`));
      setShipModels(models.ships);
      buildBlackHole();
      setLoad(.62, 'Menghitung orbit delapan planet…'); await nextFrame();
      sys = buildSystem(scene, U, { touch: isTouch, models });
      updateBodies(sys.bodies, sys.byId, gameTime);
      orbitsVisible(false);
      buildDust();
      scene.add(shipRoot);
      setLoad(.72, 'Merakit armada pesawat…'); await nextFrame();
      setShip(store.progress.selectedShip);
      const s = readGameState();
      if (s) applySave(s); else resetShip(defaultPose());
      if (!target) setTarget('mars', true);
      buildMarkers(); sizeCompass(); refreshSaveMeta(); syncDiscovered();
      setLoad(.84, 'Mengompilasi shader…'); await nextFrame();
      updateShipVisual(0, 0);
      updateCamera(1, 0);
      camera.position.copy(ship.pos).add(_v.set(Math.sin(menuAngle) * 11, 3, Math.cos(menuAngle) * 11).applyQuaternion(ship.quat));
      camera.lookAt(ship.pos);
      const warm = new THREE.Group(); warm.position.copy(ship.pos); scene.add(warm);
      for (const id of SHIP_IDS) if (id !== store.progress.selectedShip) { shipModels[id] = buildShip(id); warm.add(shipModels[id].group); }
      try { await renderer.compileAsync(scene, camera); await renderer.compileAsync(bgScene, bgCam); } catch (e) { console.warn(e); }
      for (const id of SHIP_IDS) if (id !== store.progress.selectedShip) warm.remove(shipModels[id].group);
      scene.remove(warm);
      setLoad(1, 'Siap diluncurkan');
      startIntro(); // web dibuka → adegan lubang hitam dulu (bila modelnya ada), lalu terbang ke pesawat
      timer.update();
      renderer.setAnimationLoop(loop);
      await nextFrame(); await nextFrame();
      trans.t = 1;
      store.phase = 'menu'; // loader ditutup setelah frame pertama benar-benar dirender
    } catch (err) {
      console.error(err);
      store.loading.error = 'WebGL tidak tersedia atau gagal dimulai: ' + (err && err.message ? err.message : err) + '. Gunakan browser modern yang mendukung WebGL2.';
    }
  }

  // ---------- API untuk UI ----------
  const api = {
    boot, startGame, pause, resume, toMenu, setMode, stop, toggleCam, cycleTarget, setTarget, focus, selectEvent, focusLocation, buildPOIs, poiStatus, skipIntro,
    applyObsToggles,
    setShip(id) { setShip(id); },
    previewShip(id) { setShip(id); store.hangarPreview = id; },
    applySettings() { saveSettings(); applyQuality(); sfx.init(); sfx.setEnabled(settings.soundEnabled); },
    toggleSound() { settings.soundEnabled = !settings.soundEnabled; sfx.init(); sfx.setEnabled(settings.soundEnabled); saveSettings(); },
    click() { sfx.click(); }, chime() { sfx.chime(); }, correct() { sfx.correct(); }, wrong() { sfx.wrong(); },
    get touch() { return { joy, hold }; },
    setThrottle(v) { ship.throttle = clamp(v, -.3, 1); ship.braking = false; },
    get throttle() { return ship.throttle; },
    // Fenomena
    lab: {
      setType(t) { ensureLab(); store.lab.type = t; lab.setType(t); store.lab.playing = true; },
      setPOV(p) { ensureLab(); store.lab.pov = p; lab.setPOV(p, false); },
      replay() { ensureLab(); lab.replay(); store.lab.playing = true; },
      resetCam() { ensureLab(); if (lab.st.pov === 'bebas') { lab.st.look.yaw = .6; lab.st.look.pitch = .35; lab.st.look.dist = 420; } lab.setPOV(lab.st.pov, false); },
      scrub(t) { ensureLab(); lab.st.t = clamp(t, 0, LAB_DURATION); store.lab.t = lab.st.t; },
      get duration() { return LAB_DURATION; },
    },
    // Peta sistem
    mapData() {
      if (!sys) return null;
      const fwd = _v.set(0, 0, -1).applyQuaternion(snapshot ? snapshot.quat : ship.quat);
      const sp = snapshot ? snapshot.pos : ship.pos;
      return {
        bodies: sys.bodies.map((b) => ({ id: b.id, name: discovered.has(b.id) ? b.name : b.name, x: b.pos.x, z: b.pos.z, r: b.radius, color: b.color, isSun: !!b.isSun, isMoon: !!b.isMoon, found: discovered.has(b.id) })),
        orbits: sys.bodies.filter((b) => b.orbitPts).map((b) => ({ id: b.id, pts: b.orbitPts.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.z]) })),
        ship: { x: sp.x, z: sp.z, heading: Math.atan2(fwd.x, -fwd.z) },
        target: target ? target.id : null, belt: [BELT.inner, BELT.outer], rmax: RMAX,
      };
    },
    orbitSummary(id) {
      const b = sys && sys.byId[id]; if (!b || !b.orbitPts) return null;
      return { pts: b.orbitPts.filter((_, i) => i % 6 === 0).map((p) => [p.x, p.z]), pos: [b.pos.x, b.pos.z] };
    },
    get _debug() { return { cam: camera.position.toArray(), camQ: camera.quaternion.toArray(), ship: ship.pos.toArray(), earth: sys?.byId.bumi.pos.toArray(), exposure: renderer?.toneMappingExposure, fov: camera.fov, mode: worldMode() }; },
    dispose() {
      if (renderer) { renderer.setAnimationLoop(null); composer && composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
      for (const [t, ev, fn, opt] of listeners) t.removeEventListener(ev, fn, opt);
    },
  };
  return api;
}

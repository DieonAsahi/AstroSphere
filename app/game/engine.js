// Mesin 3D AstroSphere (Three.js). Dunia baru dimuat saat pemain masuk (layar awal tanpa WebGL).
// Konteks: menu (memuat/belum bermain), jelajah (terbang), observe (Planet, Sejarah, fenomena planet), lab (gerhana Bumi),
// hangar (pratinjau pesawat), frozen (Kuis/Peta/Profil — dirender hemat).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SKY_VS, SKY_FS, STARS_VS, STARS_FS } from './shaders.js';
import { clamp, lerp, damp, smooth, dead, nextFrame, DEG, TAU, KM, fmtDist, fmtEta, fmtInt, daysSinceJ2000, fmtSimDate, dateFromDays, isTouchDevice } from './util.js';
import { buildSystem, updateBodies, latLonToLocal, getEventCoords, upgradePlanetModel } from './system.js';
import { initShipFactory, buildShip, setShipModels } from './ships.js';
import { loadCoreModels, loadSingleModel, REMAINING_PLANET_IDS, loadDecor } from './models.js';
import { createLab, LAB_DURATION } from './lab.js';
import { createAudio } from './audio.js';
import { createHazards } from './hazards.js';
import { createMission } from './mission.js';
import { createMcoMission } from './missionMco.js';
import { SHIPS, SHIP_IDS } from '../data/ships.js';
import { BELT, PLANETS } from '../data/solarSystem.js';
import { resolveKeymap } from '../data/keymap.js';
import { PHENOMENA } from '../data/phenomena.js';
import { HISTORY } from '../data/history.js';
import { store, saveSettings, readGameState, writeGameState, refreshSaveInfo, rewardEvent } from '../composables/useGame.js';

export const TIME_RATE = 0.02;      // hari simulasi per detik (1 hari = 50 dtk) — satu faktor untuk rotasi & revolusi
export const RMAX = 8500;           // radius navigasi; peringatan mulai 0,8 R (PRD R02)
const PLANET_IDS = new Set(PLANETS.map((p) => p.id));

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
  let sys = null, skyGroup, starsMat, dust, lab = null, models = null, mission = null;
  const missionMods = {}; // adegan misi kisah nyata, dibuat sekali per misi
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
    const pr = Math.min(devicePixelRatio || 1, hi ? 1.25 : 1.0);
    renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
    U.uOct.value = hi ? 5 : 3;
    if (bloomPass) bloomPass.enabled = hi;
    if (starsMat) starsMat.uniforms.uPR.value = pr;
    if (hi && !blackHole && !bhLoading) loadBlackHole();
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
    const N = isTouch || settings.graphics !== 'tinggi' ? 240 : 360, B = 240, base = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) base[i] = Math.random() * B;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    lines.frustumCulled = false; scene.add(lines);
    dust = { N, B, base, lines, g };
  }
  function updateDust(vel) {
    if (!dust) return;
    if (ship.speed < 5) {
      if (dust.lines.visible) dust.lines.visible = false;
      return;
    }
    if (!dust.lines.visible) dust.lines.visible = true;
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

  // ---------- Lubang hitam: dekorasi langit di luar tata surya ----------
  // Jauh di luar batas navigasi (RMAX). Dimuat beberapa detik setelah permainan dimulai agar layar awal & pemuatan tetap ringan.
  const BH_DIR = new THREE.Vector3(-.62, .3, -.72).normalize(), BH_DIST = 17000, BH_SIZE = 2600;
  const BH_POS = BH_DIR.clone().multiplyScalar(BH_DIST), bhNormal = new THREE.Vector3(0, 1, 0);
  let bhLoading = false;
  async function loadBlackHole() {
    if (settings.graphics !== 'tinggi' || bhLoading || blackHole || !renderer) return;
    bhLoading = true;
    const m = await loadDecor('black_hole'); if (!m) { bhLoading = false; return; }
    m.position.copy(BH_POS); m.scale.setScalar(BH_SIZE);
    const toSun = BH_DIR.clone().negate();
    const perp = new THREE.Vector3(0, 1, 0).projectOnPlane(toSun).normalize();
    bhNormal.copy(perp).multiplyScalar(Math.cos(14 * DEG)).addScaledVector(toSun, Math.sin(14 * DEG)).normalize();
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bhNormal);
    // kompilasi shader di adegan sementara dulu (asinkron), baru dipindah ke lapisan latar — tanpa patah-patah
    const amb = new THREE.AmbientLight('#ffffff', .9), tmp = new THREE.Scene(); tmp.add(m, amb);
    try { await renderer.compileAsync(tmp, bgCam); } catch {}
    bgScene.add(m, amb); blackHole = m;
  }

  // ---------- Waktu & konteks ----------
  let gameTime = daysSinceJ2000();      // waktu jelajah (hari sejak J2000)
  let obsTime = gameTime;               // cabang waktu observasi (Planet & Sejarah)
  let snapshot = null;                  // checkpoint jelajah saat masuk mode belajar/overlay
  const worldMode = () => {
    if (store.phase === 'splash' || store.phase === 'guide') return 'menu';
    switch (store.mode) {
      case 'jelajah': return 'jelajah';
      case 'planet': case 'sejarah': return 'observe';
      case 'fenomena': return 'lab';
      case 'misi': return 'misi';
      case 'hanggar': return 'hangar';
      default: return 'frozen';
    }
  };
  const bodyTime = () => (worldMode() === 'observe' ? obsTime : gameTime);

  // ---------- Pesawat ----------
  const ship = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), rate: new THREE.Vector3(), throttle: 0, boost: 0, speed: 0, limited: false, braking: false, yaw: 0, pitch: 0 };
  const shipRoot = new THREE.Group();
  let shipModel = null; const shipModels = {};
  let camMode = 'chase', target = null, nearest = null;
  const discovered = new Set(['matahari']);
  let sessionActive = false, shake = 0, msgTimer = 0, inBelt = false;
  let hazards = null, shipLight = 1; // peristiwa antariksa (game/hazards.js) & faktor cahaya Matahari di pesawat
  const keys = {}, stick = { x: 0, y: 0 }, joy = { x: 0, y: 0 }, hold = {};
  const input = { pitch: 0, yaw: 0, strafe: 0, boost: false, align: false };
  let keymap = resolveKeymap(settings.keys);
  const act = (id) => { for (const c of keymap[id] || []) if (keys[c]) return true; return false; };
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
  function resetShip(pose) {
    ship.pos.copy(pose.pos);
    _e.setFromQuaternion(pose.quat, 'YXZ');
    ship.yaw = _e.y;
    ship.pitch = clamp(_e.x, -1.35, 1.35);
    ship.quat.setFromEuler(_e.set(ship.pitch, ship.yaw, 0, 'YXZ'));
    ship.vel.set(0, 0, 0); ship.rate.set(0, 0, 0); ship.throttle = 0; ship.boost = 0; ship.braking = false; ship.brakeHold = false;
  }
  async function ensureShipModel(id) {
    if (!id || !SHIPS[id] || models?.ships?.[id]) return;
    const m = await loadSingleModel('ships', id);
    if (m && models?.ships) {
      models.ships[id] = m;
      setShipModels(models.ships);
      shipModels[id] = buildShip(id);
      if (shipModel && (store.progress.selectedShip === id || store.hangarPreview === id)) {
        shipRoot.remove(shipModel.group);
        shipModel = shipModels[id];
        shipRoot.add(shipModel.group);
      }
    }
  }
  function setShip(id) {
    if (!SHIPS[id]) id = 'astra';
    if (!shipModels[id]) shipModels[id] = buildShip(id);
    if (shipModel) shipRoot.remove(shipModel.group);
    shipModel = shipModels[id]; shipRoot.add(shipModel.group);
    ensureShipModel(id);
  }
  function readInput(dt) {
    const t = hold;
    // Kontrol Yaw: Tombol belok (A/D, Q/E, panah kiri/kanan) atau analog jempol horizontal
    const turnL = act('turnL') || act('left') || !!t.turnL;
    const turnR = act('turnR') || act('right') || !!t.turnR;
    let yaw = (turnR ? 1 : 0) - (turnL ? 1 : 0) + dead(joy.x, .12);

    let pitch = (act('up') || t.up ? 1 : 0) - (act('down') || t.down ? 1 : 0) - dead(joy.y, .12);
    if (settings.invertY) pitch = -pitch;

    input.yaw = clamp(yaw, -1, 1);
    input.pitch = clamp(pitch, -1, 1);
    input.strafe = 0; // HAPUS geser samping (pesawat tidak boleh melayang menyamping)
    input.boost = act('turbo') || !!t.boost;
    input.align = !!keys.KeyG;

    const fwd = act('forward') || !!t.gas, back = act('back'), brake = act('brake') || !!t.brake;
    if (store.autopilot && (input.yaw || input.pitch || back || brake)) autopilotOff(true);
    if (fwd) { ship.throttle = Math.min(1, ship.throttle + dt * .8); ship.braking = false; }
    if (back) { ship.throttle = Math.max(-.3, ship.throttle - dt * .8); ship.braking = false; }
    ship.brakeHold = brake;
    if (brake) ship.throttle = damp(ship.throttle, 0, 4, dt);
  }
  let wasBoost = false;
  function updateShip(dt) {
    const def = shipDef();
    const broken = store.event.damaged;
    let { pitch, yaw } = input;
    const ap = store.autopilot && target;
    if ((input.align || ap) && target) {
      _qi.copy(ship.quat).invert();
      _v.copy(target.pos).sub(ship.pos).applyQuaternion(_qi).normalize();
      yaw = clamp(Math.atan2(_v.x, -_v.z) * 2.4, -1, 1); pitch = clamp(Math.atan2(_v.y, Math.hypot(_v.x, _v.z)) * 2.4, -1, 1);
    }
    if (ap) {
      // terbang otomatis: menghadap tujuan, melaju, turbo saat masih jauh, melambat menjelang tiba
      const d = ship.pos.distanceTo(target.pos) - target.radius, facing = -_v.z;
      const want = facing > .9 ? clamp((d - target.approach * .5) / 700, .2, 1) : .12;
      ship.throttle = damp(ship.throttle, want, 2.2, dt); ship.braking = false;
      input.boost = facing > .97 && d > 1600 && !broken;
    }

    const tr = def.turn;

    // Rate rotasi: pitch mengelilingi sumbu X, yaw mengelilingi sumbu Y
    ship.rate.x = damp(ship.rate.x, pitch * 1.15 * tr, 8, dt);
    ship.rate.y = damp(ship.rate.y, -yaw * 1.35 * tr, 8, dt);
    ship.rate.z = 0; // Fisika murni tanpa gimbal drift roll

    // Integrasi sudut yaw & pitch Euler murni: roll fisika selalu 0 sehingga anti-mendongak/anti-gimbal drift
    ship.yaw += ship.rate.y * dt;
    ship.yaw = Math.atan2(Math.sin(ship.yaw), Math.cos(ship.yaw));
    ship.pitch = clamp(ship.pitch + ship.rate.x * dt, -1.35, 1.35);

    ship.quat.setFromEuler(_e.set(ship.pitch, ship.yaw, 0, 'YXZ'));

    const wantBoost = input.boost && ship.throttle > .05 && !broken;
    if (wantBoost && !wasBoost) sfx.whoosh();
    wasBoost = wantBoost;
    ship.boost = damp(ship.boost, wantBoost ? 1 : 0, wantBoost ? 1.6 : 3, dt);
    const boostMul = 1 + ship.boost * (def.boost - 1);
    const fwd = ship.throttle * def.speed * (ship.throttle > 0 ? boostMul : 1) * (broken ? .6 : 1);

    // Fisika realistis roket antariksa: dorongan hanya maju/mundur searah moncong pesawat (tanpa geser samping)
    const desired = _v.set(0, 0, -fwd).applyQuaternion(ship.quat);
    const alt = nearest ? nearest.alt : 1e9;
    const limit = 8 + Math.max(0, alt) * 1.15;
    ship.limited = desired.length() > limit && alt < 400;
    if (desired.length() > limit) desired.setLength(limit);
    if (ship.braking || ship.brakeHold) { ship.vel.multiplyScalar(Math.exp(-dt * (ship.braking ? 3.4 : 2.2))); if (ship.vel.length() < .05) { ship.vel.set(0, 0, 0); ship.braking = false; } }
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
    // Efek visual miring sayap (banking roll) halus saat memutar moncong kiri/kanan HANYA pada mesh 3D anak
    g.rotation.z = damp(g.rotation.z, -input.yaw * .45, 6, dt);
    g.rotation.x = damp(g.rotation.x, ship.rate.x * .05, 5, dt);
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
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // sudut kamera relatif arah Matahari: planet selalu tampak dari sisi yang terang (bukan bola gelap)
  function viewAngles(b, view) {
    _v2.copy(b.pos).negate().normalize();
    const ys = Math.atan2(_v2.x, _v2.z);
    if (view === 'sun') return { yaw: ys + .32, pitch: .1 };
    if (view === 'top') return { yaw: ys + .5, pitch: 1.15 };
    if (view === 'wide') return { yaw: ys + .45, pitch: .32 };
    return { yaw: ys + .62, pitch: .2 };
  }
  function frameBody(b) { const a = viewAngles(b, 'info'); obsCam.yaw = a.yaw; obsCam.pitch = a.pitch; obsCam.dist = b.ring ? 4.0 : 4.6; }

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
      if (pheno.view && !obsCam.drag) { const a = viewAngles(b, pheno.view); obsCam.yaw += wrapA(a.yaw - obsCam.yaw) * (1 - Math.exp(-dt * 2.5)); obsCam.pitch = damp(obsCam.pitch, a.pitch, 2.5, dt); }
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
    if (trans.t < 1) {
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
    camera.fov = damp(camera.fov, fovT, 3, dt);
    camera.near = camMode === 'cockpit' && wm === 'jelajah' ? .2 : .5;
    // geser tampilan di desktop agar objek tidak tertutup kartu kanan (lebar min(400px, 36vw))
    let wantShift = 0;
    if (innerWidth > 760 && (wm === 'observe' || wm === 'hangar')) wantShift = Math.min(400, innerWidth * .36) / 2 + 12;
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
    compassW = Math.min(small ? 200 : 420, innerWidth * (small ? .5 : .6)); compassH = 40;
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
      c.strokeStyle = major ? 'rgba(241,244,255,.95)' : 'rgba(170,180,222,.5)';
      const h = major ? 11 : mid ? 7 : 4;
      c.beginPath(); c.moveTo(x + .5, Hc - 2); c.lineTo(x + .5, Hc - 2 - h); c.stroke();
      if (major) { c.fillStyle = dn === 0 ? '#ffc947' : '#f1f4ff'; c.font = '600 13px Fredoka, sans-serif'; c.fillText(CARD[dn / 45], x, Hc - 17); }
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
    mark(bearingOf(sys.bodies[0].pos), '#ff9f43', 'sun');
    if (target && !target.isSun) mark(bearingOf(target.pos), '#ffc947', 'tri');
    c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2, Hc); c.lineTo(W / 2, Hc - 16); c.stroke();
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
    // bidik silang (bergeser saat pandangan bebas)
    const la = lookActive(), off = Math.abs(look.yaw) > .03 || Math.abs(look.pitch) > .03;
    let chx = 0, chy = 0, chVis = true;
    if (off) { _p.copy(ship.pos).addScaledVector(fwd, 600).project(camera); if (_p.z > 1 || Math.abs(_p.x) > 1.1 || Math.abs(_p.y) > 1.1) chVis = false; else { chx = _p.x * innerWidth / 2; chy = -_p.y * innerHeight / 2; } }
    if (el.crosshair) { el.crosshair.style.transform = `translate3d(${chx.toFixed(1)}px,${chy.toFixed(1)}px,0)`; el.crosshair.style.opacity = chVis ? '' : '0'; }
    if (store.look.active !== la) store.look.active = la;
    drawCompass(heading);
    const sunB = sys.bodies[0];
    if (el.vignette) el.vignette.style.opacity = (1 - smooth(sunB.radius * 1.3, sunB.radius * 2.6, sunB.dist ?? 1e9)).toFixed(2);
    if (el.boostFx) el.boostFx.style.opacity = (ship.boost * .9).toFixed(2);
    if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) store.msg.show = false; }

    // Sinkronisasi analog stick kemudi ke HUD pada 60 FPS (mulus tanpa lag)
    if (!store.hud.stick) store.hud.stick = { x: 0, y: 0 };
    store.hud.stick.x = damp(store.hud.stick.x, input.yaw, 18, dt);
    store.hud.stick.y = damp(store.hud.stick.y, input.pitch, 18, dt);

    if (!slow) return;
    const h = store.hud;
    h.hdg = String(Math.round(heading) % 360).padStart(3, '0') + '°';
    h.pit = (pitch >= 0 ? '+' : '−') + String(Math.abs(Math.round(pitch))).padStart(2, '0') + '°';
    h.speed = new Intl.NumberFormat('id-ID').format(Math.round(ship.speed * KM));
    h.thr = Math.round(ship.throttle * 100); h.braking = ship.braking || ship.brakeHold;
    h.boost = ship.boost > .3; h.limited = ship.limited;

    // Pemicu Pesan Jarak Planet (Zona Hijau):
    // HANYA muncul ketika jarak pesawat <= 4x radius observasi/pendekatan planet tersebut.
    // Di luar ambang jarak tersebut, status kedekatan dimatikan agar layar lapang.
    const inApproachZone = nearest && (nearest.dist <= nearest.approach * 4 || nearest.alt <= nearest.approach * 4);
    if (inApproachZone) {
      h.near.isApproaching = true;
      h.near.id = nearest.id;
      h.near.name = displayName(nearest);
      h.near.dist = fmtDist(nearest.alt);
    } else {
      h.near.isApproaching = false;
      h.near.id = '';
      h.near.name = '—';
      h.near.dist = '—';
    }
    if (target) {
      h.target.id = target.id; h.target.name = displayName(target);
      const d = ship.pos.distanceTo(target.pos) - target.radius;
      h.target.dist = fmtDist(d);
      const closing = ship.vel.dot(_v.copy(target.pos).sub(ship.pos).normalize());
      h.target.eta = closing > .5 ? fmtEta(d / closing) : '—';
    }
    h.disc = `${discovered.size}/${TOTAL_DISC()}`;
  }

  // ---------- Pesan, banner, toast ----------
  let bannerT = null, toastT = null, savedT = null;
  function showBanner(kick, title) { toast(`<b>${title}</b> · ${kick}`, 2600); }
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
      if (isNew) { discovered.add(BELT.id); syncDiscovered(); sfx.chime(); saveGame('Tersimpan'); toast(`<b>Penemuan baru</b> · ${BELT.name} — kartu baru di Jurnal`, 3000); }
      if (!isNew) showBanner('Memasuki wilayah', BELT.name);
    }
    inBelt = belt;
  }
  function onApproach(b) {
    const isNew = !discovered.has(b.id);
    if (isNew) { discovered.add(b.id); syncDiscovered(); saveGame('Tersimpan'); }
    if (isNew) sfx.chime(); else sfx.approach();
    if (hazards && hazards.onApproach(b)) { if (isNew) toast(`<b>Penemuan baru</b> · ${b.name} — kartu baru di Jurnal`, 3000); return; }
    // saat terbang otomatis, hanya planet tujuan yang menghentikan pesawat
    if ((PLANET_IDS.has(b.id) || b.isSun) && !(store.autopilot && target && target !== b)) { arrive(b, isNew); return; }
    if (isNew) toast(`<b>Penemuan baru</b> · ${b.name} — kartu baru di Jurnal`, 3000);
  }
  // Mendekati planet: pesawat berhenti sendiri dan menawarkan tampilan planet (Ya → mode Planet, Tidak → lanjut terbang)
  let approachShownAt = 0;
  function arrive(b, isNew) {
    autopilotOff();
    ship.throttle = 0; ship.braking = true;
    approachShownAt = performance.now();
    const ph = PHENOMENA[b.id];
    Object.assign(store.approach, { show: true, id: b.id, name: b.name, kind: b.kind, color: b.color, desc: (b.desc || '').split('. ')[0].replace(/\.$/, '') + '.', pheno: ph ? ph.title : '', isNew });
  }
  function autopilotOff(manual) { if (!store.autopilot) return; store.autopilot = false; if (manual) toast('Kemudi manual', 1300); }
  function flyTo(id) {
    const b = sys.byId[id]; if (!b) return;
    if (store.mode !== 'jelajah') setMode('jelajah');
    setTarget(id, true); store.autopilot = true; b.inRange = false; store.approach.show = false;
    toast(`Terbang otomatis ke <b>${b.name}</b>`, 2400);
  }
  function setTarget(id, quiet) {
    const b = sys.byId[id]; if (!b) return;
    target = b; store.hud.target.id = id; store.hud.target.name = displayName(b);
    if (!quiet) { sfx.target(); toast(`Tujuan: <b>${displayName(b)}</b>`, 1800); }
  }
  function cycleTarget(dir = 1) {
    const list = sys.bodies; let i = target ? list.indexOf(target) : -1;
    i = (i + dir + list.length) % list.length; setTarget(list[i].id);
  }

  // ---------- Simpan & muat ----------
  const r2 = (n) => Math.round(n * 100) / 100, r4 = (n) => Math.round(n * 1e4) / 1e4;
  function saveGame(label) {
    if (!sessionActive) return false;
    const src = snapshot || { pos: ship.pos, quat: ship.quat, gameTime, yaw: ship.yaw, pitch: ship.pitch };
    _e.setFromQuaternion(src.quat, 'YXZ');
    const ok = writeGameState({
      position: { x: r2(src.pos.x), y: r2(src.pos.y), z: r2(src.pos.z) }, rotation: { x: r4(_e.x), y: r4(_e.y), z: 0 },
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
    ship.yaw = (s.rotation && s.rotation.y) || 0;
    ship.pitch = clamp((s.rotation && s.rotation.x) || 0, -1.35, 1.35);
    ship.quat.setFromEuler(_e.set(ship.pitch, ship.yaw, 0, 'YXZ'));
    ship.vel.set(0, 0, 0); ship.rate.set(0, 0, 0); ship.throttle = 0; ship.boost = 0; ship.braking = false;
    discovered.clear(); discovered.add('matahari');
    if (Array.isArray(s.discovered)) for (const id of s.discovered) if (sys.byId[id] || id === BELT.id) discovered.add(id);
    syncDiscovered();
    if (s.target && sys.byId[s.target]) setTarget(s.target, true);
  }
  function refreshSaveMeta() { refreshSaveInfo(); }

  // ---------- Snapshot konteks (PRD §10) ----------
  function takeSnapshot() {
    if (snapshot) return;
    snapshot = { pos: ship.pos.clone(), quat: ship.quat.clone(), yaw: ship.yaw, pitch: ship.pitch, vel: ship.vel.clone(), throttle: ship.throttle, gameTime, camPos: camera.position.clone(), camQuat: camera.quaternion.clone(), target: target ? target.id : null, camMode };
    obsTime = gameTime; // cabang waktu observasi
    store.obs.day = obsTime;
  }
  function restoreSnapshot() {
    if (!snapshot) return;
    const s = snapshot; snapshot = null;
    gameTime = s.gameTime; updateBodies(sys.bodies, sys.byId, gameTime);
    ship.pos.copy(s.pos); ship.quat.copy(s.quat); ship.yaw = s.yaw ?? 0; ship.pitch = s.pitch ?? 0; ship.vel.copy(s.vel); ship.throttle = s.throttle; ship.rate.set(0, 0, 0); ship.boost = 0;
    camQ.copy(ship.quat); camMode = s.camMode;
    for (const k in keys) keys[k] = false; for (const k in hold) hold[k] = false; joy.x = joy.y = 0; stick.x = stick.y = 0;
  }

  // ---------- Mode ----------
  function setMode(m, opts = {}) {
    if (!sys) return;
    const prev = store.mode;
    if (store.phase !== 'playing' && store.phase !== 'paused') return;
    if (m === prev && !opts.force) return;
    if (prev === 'jelajah') takeSnapshot();
    if (pheno.id && m !== 'planet') stopPheno(true);
    // tombol "Kembali": Sejarah → Planet; Kuis/Fenomena/dll. yang dibuka dari Planet/Sejarah → kembali ke sana
    const learn = prev === 'planet' || prev === 'sejarah';
    store.backTo = m === 'sejarah' ? (PLANET_IDS.has(opts.body || store.sejarah.body) ? 'planet' : null) : (learn && m !== 'jelajah' && m !== 'planet' ? prev : null);
    store.approach.show = false;
    store.phase = 'playing';
    store.mode = m;
    if (m === 'jelajah') { restoreSnapshot(); beginCamTransition(); clearPOIs(); orbitsVisible(false); for (const x of sys.bodies) if (x.axisLine) x.axisLine.visible = false; }
    else if (m === 'planet' || m === 'sejarah') {
      if (opts.body) { if (m === 'planet') store.focus = opts.body; else store.sejarah.body = opts.body; }
      const b = focusBody();
      if (!(prev === 'planet' || prev === 'sejarah') || opts.body) frameBody(b);
      if (!pheno.id) store.obs.mul = 1;
      beginCamTransition();
      applyObsToggles();
      if (m === 'sejarah') buildPOIs(); else clearPOIs();
    } else if (m === 'fenomena') {
      ensureLab(); clearPOIs();
      lab.setType(store.lab.type); lab.setPOV(store.lab.pov, true); store.lab.marks = lab.marks;
    } else if (m === 'misi') {
      clearPOIs();
      const id = opts.mission || store.mission.id || 'apollo13';
      store.mission.id = id;
      mission = missionMods[id] ||= (id === 'mco' ? createMcoMission : createMission)({ background: skyTex, environment: scene.environment }, models, store, sfx);
      mission.reset();
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
  function focus(id) { if (!sys.byId[id]) return; if (store.mode === 'sejarah') { store.sejarah.body = id; buildPOIs(); } else store.focus = id; frameBody(sys.byId[id]); beginCamTransition(); applyObsToggles(); }
  function back() {
    if (store.mode === 'planet' && pheno.id) { stopPheno(); return; }
    const to = store.backTo;
    if (to === 'planet') setMode('planet', { body: store.mode === 'sejarah' && PLANET_IDS.has(store.sejarah.body) ? store.sejarah.body : store.focus });
    else if (to) setMode(to);
    else setMode('jelajah');
  }

  // ---------- Fenomena per planet (di mode Planet) ----------
  const pheno = { id: null, def: null, view: null, spin: 0, t0: 0, tick: 0, prevDec: null };
  let pinMesh = null;
  const _q2 = new THREE.Quaternion();
  function moonsVisible(parent, v) { for (const x of sys.bodies) if (x.isMoon && x.parent === parent) x.holder.visible = v; }
  function startPheno(id) {
    const def = PHENOMENA[id], b = sys.byId[id]; if (!def || def.lab || !b) return;
    if (store.mode !== 'planet' || store.focus !== id) setMode('planet', { body: id, force: true });
    Object.assign(pheno, { id, def, view: def.view, t0: obsTime, spin: obsTime, tick: 1, prevDec: null });
    store.obs.mul = def.mul;
    Object.assign(store.pheno, { on: true, id, playing: true, line1: '', line2: '', state: '' });
    obsCam.dist = def.view === 'wide' ? 8 : def.view === 'top' ? 3.4 : b.ring ? 4.6 : 3.8;
    if (def.show === 'pin') {
      if (!pinMesh) {
        pinMesh = new THREE.Group();
        const dot = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff6b6b' }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(.075, .1, 32), new THREE.MeshBasicMaterial({ color: '#ff6b6b', side: THREE.DoubleSide, transparent: true, opacity: .8 }));
        ring.rotation.y = Math.PI / 2; pinMesh.add(dot, ring);
      }
      pinMesh.position.copy(latLonToLocal(0, 0, 1.02)); b.spinMesh.add(pinMesh);
    }
    moonsVisible(id, def.mul <= 200);
    beginCamTransition(); sfx.click();
  }
  function stopPheno(silent) {
    if (!pheno.id) return;
    const b = sys.byId[pheno.id];
    if (pinMesh && pinMesh.parent) pinMesh.parent.remove(pinMesh);
    moonsVisible(pheno.id, true);
    Object.assign(pheno, { id: null, def: null, view: null });
    store.obs.mul = 1; store.pheno.on = false; store.pheno.id = '';
    if (!silent && b) { frameBody(b); beginCamTransition(); }
  }
  function updatePheno(dt) {
    const b = sys.byId[pheno.id], def = pheno.def; if (!b) return;
    // rotasi yang terlalu cepat diperlambat khusus tampilan (≤ 0,6 putaran/detik) agar tidak berkedip
    pheno.spin += dt * TIME_RATE * Math.min(store.obs.mul, .6 * b.rotationDays / TIME_RATE);
    b.spinMesh.rotation.y = b.spinPhase0 + TAU * pheno.spin / b.rotationDays;
    pheno.tick += dt; if (pheno.tick < .12) return; pheno.tick = 0;
    const P = store.pheno, days = Math.max(0, obsTime - pheno.t0);
    const toSun = _v.copy(b.pos).negate().normalize();
    const axis = _v2.set(0, 1, 0).applyQuaternion(b.spinMesh.getWorldQuaternion(_q2));
    if (def.show === 'pin' && pinMesh) {
      const nrm = pinMesh.getWorldPosition(_p).sub(b.pos).normalize();
      const day = nrm.dot(toSun) > 0;
      P.state = day ? 'siang' : 'malam';
      P.line1 = day ? 'Siang di titik merah' : 'Malam di titik merah';
      P.line2 = `${fmtInt(days)} hari Bumi berlalu`;
    } else if (def.show === 'season') {
      const dec = Math.asin(clamp(axis.dot(toSun), -1, 1)) / DEG;
      const rising = pheno.prevDec == null ? dec >= 0 : dec >= pheno.prevDec; pheno.prevDec = dec;
      P.state = dec > 8 ? 'panas' : dec < -8 ? 'dingin' : rising ? 'semi' : 'gugur';
      P.line1 = `Musim ${P.state} di belahan utara`;
      P.line2 = `Kutub utara ${dec >= 0 ? 'condong ke' : 'menjauhi'} Matahari ${Math.abs(dec).toFixed(0)}° · ${(days / 365.25).toFixed(1).replace('.', ',')} tahun`;
    } else if (def.show === 'spins') {
      P.state = '';
      P.line1 = `Jupiter berputar ${fmtInt(Math.floor(days / b.rotationDays))} kali`;
      P.line2 = `Io mengitari Jupiter ${fmtInt(Math.floor(days / 1.769))} kali`;
    } else {
      const year = dateFromDays(obsTime).getUTCFullYear(), frac = days / (b.periodYears * 365.25);
      P.line1 = `Tahun ${year}`;
      if (b.id === 'saturnus') { const B = Math.abs(Math.asin(clamp(axis.dot(toSun), -1, 1)) / DEG); P.state = B < 3 ? 'tipis' : ''; P.line2 = B < 3 ? 'Cincin sejajar Matahari — nyaris hilang!' : `Cincin terbuka ${B.toFixed(0)}° ke arah Matahari`; }
      else { P.state = frac >= 1 ? 'selesai' : ''; P.line2 = frac >= 1 ? 'Satu putaran orbit selesai!' : `${Math.round(frac * 100)}% satu putaran orbit`; }
    }
  }

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
  let currentHistoryList = [];
  function buildPOIs(customList) {
    clearPOIs();
    const b = sys.byId[store.sejarah.body]; if (!b) return;
    const rawList = customList || store.sejarah.events || (HISTORY[b.id] || []);
    const list = rawList.filter(eraFilter);
    currentHistoryList = list;
    list.forEach((e, i) => {
      const coords = getEventCoords(e, i, list.length);
      const node = document.createElement('button');
      node.className = 'poi' + (e.id === store.sejarah.selected ? ' sel' : '');
      const actorLabel = e.nama_wahana || e.actor || 'Observasi';
      const yearLabel = e.year || e.tahun_kejadian || '—';
      const titleLabel = e.judul || e.title || '';
      const icon = document.createElement('i');
      const span = document.createElement('span');
      const bEl = document.createElement('b');
      bEl.textContent = actorLabel;
      const emEl = document.createElement('em');
      emEl.textContent = `${yearLabel} · ${titleLabel}`;
      span.appendChild(bEl);
      span.appendChild(emEl);
      node.appendChild(icon);
      node.appendChild(span);
      node.addEventListener('click', () => { store.sejarah.selected = e.id; selectEvent(e.id); });
      el.poi.appendChild(node);
      pois.push({ e, el: node, local: latLonToLocal(coords.lat, coords.lon), body: b, coords });
    });
    selectEvent(store.sejarah.selected, true);
  }
  function selectEvent(id, quiet) {
    const b = sys.byId[store.sejarah.body]; if (!b) return;
    for (const p of pois) p.el.classList.toggle('sel', p.e.id === id);
    if (pathObj) { pathObj.parent && pathObj.parent.remove(pathObj); pathObj = null; }
    if (pathLabel) { pathLabel.el.remove(); pathLabel = null; }
    const e = currentHistoryList.find((x) => x.id === id) || (HISTORY[b.id] || []).find((x) => x.id === id);
    followDir = null;
    if (!e) return;
    const p = pois.find((x) => x.e.id === id);
    if (p) {
      followDir = () => b.spinMesh.localToWorld(p.local.clone()).sub(b.pos).normalize();
      if (!quiet) sfx.click();
      return;
    }
    const R = b.radius;
    let pts = null, anchor = null, label = '';
    if (e.locationType === 'flyby') {
      pts = [[-8, 1.6, 5], [-3, .6, 2.2], [-.6, .25, 1.6], [1.2, -.05, 1.5], [3.2, -.5, 2.0], [8, -1.6, -3]].map(([x, y, z]) => new THREE.Vector3(x * R, y * R, z * R));
      anchor = pts[3]; label = `Lintasan flyby · ${e.actor || e.nama_wahana}`;
    } else if (e.locationType === 'orbit') {
      pts = []; for (let i = 0; i <= 128; i++) { const a = i / 128 * TAU; pts.push(new THREE.Vector3(Math.cos(a) * R * 1.9, Math.sin(a) * R * .55, Math.sin(a) * R * 1.9)); }
      anchor = pts[20]; label = `Orbit wahana · ${e.actor || e.nama_wahana}`;
    } else if (e.locationType === 'atmosphere') {
      pts = [[5, 2.4, 3], [2.6, 1.3, 1.6], [1.4, .7, .9], [.86, .44, .5]].map(([x, y, z]) => new THREE.Vector3(x * R, y * R, z * R));
      anchor = pts[1]; label = `Masuk atmosfer · ${e.actor || e.nama_wahana}`;
    }
    if (pts) {
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(160)),
        new THREE.LineDashedMaterial({ color: '#a8edeb', dashSize: R * .12, gapSize: R * .08, transparent: true, opacity: .9, depthWrite: false }));
      line.computeLineDistances(); b.holder.add(line); pathObj = line;
      const node = document.createElement('div'); node.className = 'poi path';
      const icon = document.createElement('i');
      const span = document.createElement('span');
      const bEl = document.createElement('b');
      bEl.textContent = label;
      const emEl = document.createElement('em');
      emEl.textContent = 'Bukan titik pendaratan';
      span.appendChild(bEl);
      span.appendChild(emEl);
      node.appendChild(icon);
      node.appendChild(span);
      el.poi.appendChild(node); pathLabel = { el: node, local: anchor, body: b };
    }
    if (!quiet) sfx.click();
  }
  function focusLocation() {
    if (!followDir) {
      const b = sys.byId[store.sejarah.body];
      const p = pois.find((x) => x.e.id === store.sejarah.selected) || pois[0];
      if (b && p) {
        followDir = () => b.spinMesh.localToWorld(p.local.clone()).sub(b.pos).normalize();
      }
    }
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
  // Keyboard memakai pemetaan aksi (data/keymap.js, bisa diubah pemain). Mouse hanya untuk melihat sekeliling.
  const typing = (e) => e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable);
  const isAct = (id, code) => (keymap[id] || []).includes(code);
  const FLY = ['forward', 'back', 'left', 'right', 'turnL', 'turnR', 'up', 'down', 'turbo', 'brake', 'stop'];
  on(window, 'keydown', (e) => {
    if (store.capturing) return; // Profil → Kontrol sedang merekam tombol baru
    if (typing(e) && e.code !== 'Escape') return;
    if (store.modal) { if (e.code === 'Escape') store.modal = null; return; }
    const wm = worldMode();
    keys[e.code] = true;
    if (wm === 'jelajah' && store.phase === 'playing') {
      // cegah gulir halaman & pintasan browser (Ctrl = rem)
      if (FLY.some((id) => isAct(id, e.code)) || ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code) || e.ctrlKey) e.preventDefault();
      if (e.repeat) return;
      if (store.event.result && ['Enter', 'Escape', 'Space', 'NumpadEnter'].includes(e.code)) { store.event.result = null; keys[e.code] = false; return; }
      if (store.approach.show) {
        // Jeda aman ~350 ms setelah kartu pendekatan muncul dan abaikan penahanan berulang (e.repeat)
        // agar tombol gas Enter yang sedang ditahan tidak langsung memicu pilihan secara tak sengaja
        if (performance.now() - approachShownAt < 350 || e.repeat) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'KeyY') { keys[e.code] = false; api.approachYes(); return; }
        if (e.code === 'Escape' || e.code === 'KeyN' || isAct('back', e.code)) { api.approachNo(); return; }
      }
      if (isAct('stop', e.code)) { stop(); return; }
      if (isAct('map', e.code)) { setMode('peta'); return; }
      switch (e.code) {
        case 'KeyT': cycleTarget(e.shiftKey ? -1 : 1); break;
        case 'KeyV': toggleCam(); break;
        case 'KeyH': store.hudOff = !store.hudOff; break;
        case 'KeyO': orbitsVisible(!sys.orbitGroup.visible); toast(sys.orbitGroup.visible ? 'Garis orbit tampil' : 'Garis orbit disembunyikan', 1400); break;
        case 'KeyJ': pause(); store.modal = 'journal'; break;
        case 'Escape': case 'KeyP': pause(); break;
      }
    } else if (store.phase === 'paused') {
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) resume();
    } else if (store.phase === 'playing' && wm !== 'jelajah') {
      if (e.code === 'Escape' && !e.repeat) back();
    }
  });
  on(window, 'keyup', (e) => { keys[e.code] = false; });
  on(window, 'blur', () => { for (const k in keys) keys[k] = false; for (const k in hold) hold[k] = false; look.rmb = false; look.drag = false; });
  function applyLookDelta(dx, dy, k) { look.yaw -= dx * k; look.pitch = clamp(look.pitch - dy * k * (settings.invertY ? -1 : 1), -1.35, 1.35); }
  let lastTouchT = 0;
  on(canvas, 'mousedown', (e) => {
    if (performance.now() - lastTouchT < 800) return;
    const wm = worldMode();
    if ((wm === 'menu' || wm === 'hangar' || wm === 'observe' || wm === 'lab') && e.button === 0) { look.drag = true; obsCam.drag = true; return; }
    if (wm === 'jelajah' && store.phase === 'playing' && (e.button === 0 || e.button === 2)) look.rmb = true; // seret = lihat sekeliling
  });
  on(window, 'mouseup', (e) => {
    if (e.button === 0) { look.drag = false; obsCam.drag = false; }
    if (e.button === 0 || e.button === 2) look.rmb = false;
  });
  on(window, 'mousemove', (e) => {
    const wm = worldMode();
    if (look.drag && (wm === 'menu' || wm === 'hangar')) { menuAngle -= e.movementX * .006; return; }
    if (obsCam.drag && wm === 'observe') { obsCam.yaw -= e.movementX * .006; obsCam.pitch = clamp(obsCam.pitch + e.movementY * .005, -1.4, 1.4); return; }
    if (obsCam.drag && wm === 'lab') { lab.lookDrag(e.movementX, e.movementY); return; }
    if (wm === 'jelajah' && store.phase === 'playing' && look.rmb) applyLookDelta(e.movementX, e.movementY, .0042 * settings.sensitivity);
  });
  on(canvas, 'contextmenu', (e) => e.preventDefault());
  on(canvas, 'wheel', (e) => {
    const wm = worldMode();
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.1 : 1 / 1.1;
    if (wm === 'menu' || wm === 'hangar' || wm === 'jelajah') { look.zoom = clamp(look.zoom * f, .6, 2.4); return; }
    if (wm === 'observe') { obsCam.dist = clamp(obsCam.dist * f, 1.25, 14); return; }
    if (wm === 'lab') lab.zoom(f);
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
  on(window, 'pagehide', () => saveGame());
  // Ctrl = rem: tanya dulu sebelum tab tertutup tak sengaja (mis. Ctrl+W) saat sedang terbang
  on(window, 'beforeunload', (e) => { saveGame(); if (sessionActive && store.phase === 'playing' && store.mode === 'jelajah') { e.preventDefault(); e.returnValue = ''; } });
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
    sfx.init();
    snapshot = null;
    if (fromSave) { const s = readGameState(); if (s) applySave(s); else { resetShip(defaultPose()); } }
    else { gameTime = daysSinceJ2000(); updateBodies(sys.bodies, sys.byId, gameTime); resetShip(defaultPose()); discovered.clear(); discovered.add('matahari'); syncDiscovered(); setTarget('mars', true); }
    // planet yang sudah dekat saat mulai (mis. Bumi) dicatat diam-diam — tidak langsung memunculkan tawaran
    for (const b of sys.bodies) { b.inRange = ship.pos.distanceTo(b.pos) < b.approach; if (b.inRange) discovered.add(b.id); }
    syncDiscovered();
    inBelt = false; sessionActive = true; hazards?.reset();
    if (!target) setTarget('mars', true);
    setShip(store.progress.selectedShip);
    store.mode = 'jelajah'; store.phase = 'playing'; store.autopilot = false; store.approach.show = false; store.backTo = null;
    saveGame();
    camQ.copy(ship.quat); beginCamTransition();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    running(true);
    if (settings.graphics === 'tinggi') setTimeout(loadBlackHole, 3000);
    setTimeout(queueBackgroundPlanets, 1500);
  }
  let loopOn = false;
  function running(onOff) {
    if (!renderer) return;
    if (onOff && !loopOn) { timer.update(); renderer.setAnimationLoop(loop); loopOn = true; }
    else if (!onOff && loopOn) { renderer.setAnimationLoop(null); loopOn = false; }
  }
  function pause() {
    if (store.phase !== 'playing') return;
    store.phase = 'paused'; saveGame('Tersimpan'); store.approach.show = false;
    for (const k in hold) hold[k] = false; joy.x = joy.y = 0;
  }
  function resume() {
    if (store.phase !== 'paused') return;
    store.modal = null; store.phase = 'playing';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // Keluar ke layar awal: simpan, lalu hentikan loop render (layar awal tidak memakai WebGL)
  function toSplash() {
    if (store.mode !== 'jelajah') { store.phase = 'playing'; setMode('jelajah'); }
    saveGame(); sessionActive = false;
    store.modal = null; store.approach.show = false; store.autopilot = false;
    store.phase = 'splash'; store.screen = 'welcome'; store.mode = 'jelajah';
    refreshSaveMeta(); clearPOIs(); running(false);
  }
  function toggleCam() { camMode = camMode === 'chase' ? 'cockpit' : 'chase'; store.camMode = camMode; toast(camMode === 'chase' ? 'Kamera: pandangan belakang' : 'Kamera: kokpit', 1500); }
  function stop() {
    if (store.mode !== 'jelajah') setMode('jelajah');
    autopilotOff(); ship.throttle = 0; ship.braking = true; flashMsg('Berhenti');
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

  // Auto-FPS Guard: Jika mode 'tinggi' berjalan < 30 FPS selama 3 detik berturut-turut, otomatis turunkan ke 'rendah'
  let fpsFrames = 0, fpsTimer = 0, lowFpsSecs = 0;
  function checkFpsGuard(dt) {
    if (settings.graphics !== 'tinggi' || store.phase !== 'playing') {
      lowFpsSecs = 0; fpsFrames = 0; fpsTimer = 0;
      return;
    }
    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer >= 1.0) {
      const currentFps = fpsFrames / fpsTimer;
      fpsFrames = 0;
      fpsTimer = 0;
      if (currentFps < 30) {
        lowFpsSecs++;
        if (lowFpsSecs >= 3) {
          settings.graphics = 'rendah';
          saveSettings();
          applyQuality();
          toast('Mode grafis disesuaikan agar terbang lebih mulus', 3500);
          lowFpsSecs = 0;
        }
      } else {
        lowFpsSecs = 0;
      }
    }
  }

  // ---------- Loop ----------
  const timer = new THREE.Timer();
  let time = 0, autosaveT = 0, labTick = 0, idleN = 0;
  function loop(ts) {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), .05);
    time += dt; U.uTime.value = time;
    checkFpsGuard(dt);
    const wm = worldMode();
    // layar yang menutupi dunia (jeda, kuis, peta, profil): render cukup ± 20 fps
    if ((store.phase === 'paused' || wm === 'frozen') && (++idleN % 3)) return;
    if (wm === 'jelajah' && store.phase === 'playing') gameTime += dt * TIME_RATE;
    if (wm === 'observe' && store.phase === 'playing') { obsTime += dt * TIME_RATE * store.obs.mul; labTick += dt; if (labTick > .1) { labTick = 0; store.obs.day = obsTime; store.obs.date = fmtSimDate(obsTime); } }
    if (wm === 'lab') {
      syncLabFromStore();
      lab.update(store.phase === 'playing' ? dt : 0, settings.reduceMotion);
      // geser pandangan lab agar objek tidak tertutup panel kanan (desktop)
      if (innerWidth > 760) lab.camera.setViewOffset(innerWidth, innerHeight, 190, 0, innerWidth, innerHeight); else lab.camera.clearViewOffset();
      lab.camera.updateProjectionMatrix();
      labTick += dt; if (labTick > .08) { labTick = 0; store.lab.t = lab.st.t; store.lab.playing = lab.st.playing; store.lab.status = lab.status.type; store.lab.covered = lab.status.covered || 0; store.lab.dia = lab.diagram ? { ...lab.diagram } : null; }
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
    if (wm === 'misi' && mission) {
      // misi kisah nyata punya adegan & langitnya sendiri (seperti lab)
      mission.update(store.phase === 'playing' ? dt : 0);
      bgPass.enabled = false; renderPass.clear = true; renderPass.clearDepth = false;
      renderPass.scene = mission.scene; renderPass.camera = mission.camera;
      if (settings.graphics === 'tinggi') composer.render(); else renderer.render(mission.scene, mission.camera);
      renderPass.scene = scene; renderPass.camera = camera;
      bgPass.enabled = true; renderPass.clear = false; renderPass.clearDepth = true;
      if (lab) el.labLabels.style.display = 'none';
      return;
    }
    if (lab) el.labLabels.style.display = 'none';
    const tB = bodyTime();
    updateBodies(sys.bodies, sys.byId, tB);
    if (wm === 'observe' && pheno.id) updatePheno(dt);
    sys.belt.rotation.y = TAU * tB / (4.6 * 365.25);
    scanBodies();
    if (wm === 'jelajah' && store.phase === 'playing') {
      readInput(dt); updateShip(dt); hazards?.update(dt);
      autosaveT += dt; if (autosaveT > 10) { autosaveT = 0; saveGame('Simpan otomatis'); }
    }
    else hazards?.idle(wm === 'jelajah');
    updateShipVisual(dt, time);
    updateCamera(dt, time);
    skyGroup.position.copy(camera.position);
    sys.bodies[0].corona.quaternion.copy(camera.quaternion);
    updateDust(wm === 'jelajah' && store.phase === 'playing' ? ship.vel : _v.set(0, 0, 0));
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
    sys.sunLight.intensity = 2.6 * (.04 + .96 * lightF); shipLight = lightF;
    const sunB = sys.bodies[0];
    _v.copy(sunB.pos).sub(camera.position); const sd = _v.length();
    const facing = clamp(_v.divideScalar(sd || 1).dot(_v2.set(0, 0, -1).applyQuaternion(camera.quaternion)), 0, 1);
    const glare = (1 - smooth(sunB.radius * 2, sunB.radius * 10, sd)) * (.35 + .65 * facing);
    renderer.toneMappingExposure = damp(renderer.toneMappingExposure, 1 - glare * .55, 2.5, dt);
    // Distance culling atmosfer planet: jika jarak > 25x radius, sembunyikan atmosfer untuk menghemat GPU
    for (const b of sys.bodies) {
      if (b.atm) {
        const dCam = camera.position.distanceTo(b.pos);
        if (dCam > b.radius * 25) {
          b.atm.visible = false;
        } else {
          b.atm.visible = true;
          b.atm.material.side = dCam < b.radius * b.atmoScale ? THREE.BackSide : THREE.FrontSide;
        }
      }
    }
    renderWorld();
    updateHUD(dt); updatePOIs();
    sfx.update(wm === 'jelajah' && store.phase === 'playing', ship);
  }

  let bgPlanetsLoading = false;
  async function queueBackgroundPlanets() {
    if (bgPlanetsLoading || !sys || !models) return;
    bgPlanetsLoading = true;
    for (const id of REMAINING_PLANET_IDS) {
      if (models.planets[id]) continue;
      // Jeda di antara muat model agar game tetap stabil 60 FPS
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const model = await loadSingleModel('planets', id);
        if (model) {
          models.planets[id] = model;
          if (sys?.byId[id]) {
            upgradePlanetModel(sys.byId[id], model, U);
          }
        }
      } catch (err) {
        console.warn(`[AstroSphere] Gagal memuat model planet ${id} di latar belakang:`, err);
      }
    }
  }

  // ---------- Boot ----------
  const setLoad = (p, text) => { store.loading.p = p; store.loading.text = text; };
  let booting = null;
  const boot = () => (booting ||= doBoot());
  async function doBoot() {
    store.loading.error = ''; store.ready = false;
    try {
      setLoad(.04, 'Menyiapkan mesin grafis'); await nextFrame();
      initRenderer();
      initShipFactory(renderer, U, isTouch);
      setLoad(.1, 'Menaburkan bintang'); await nextFrame();
      bakeSky();
      setLoad(.14, 'Memuat Bumi, Bulan & pesawat');
      models = await loadCoreModels(store.progress.selectedShip || 'astra', (f) => setLoad(.14 + f * .56, 'Memuat Bumi, Bulan & pesawat'));
      setShipModels(models.ships);
      setLoad(.72, 'Menghitung orbit'); await nextFrame();
      sys = buildSystem(scene, U, { touch: isTouch, models });
      updateBodies(sys.bodies, sys.byId, gameTime);
      orbitsVisible(false);
      buildDust();
      scene.add(shipRoot);
      hazards = createHazards({
        scene, camera, ship, sys, store, sfx, markersEl: el.markers, toast,
        shakeBy: (v) => { if (!settings.reduceMotion) shake = Math.max(shake, v); },
        stopAutopilot: () => autopilotOff(false), getLight: () => shipLight, reward: rewardEvent,
      });
      setLoad(.8, 'Merakit pesawat'); await nextFrame();
      setShip(store.progress.selectedShip);
      const s = readGameState();
      if (s) applySave(s); else resetShip(defaultPose());
      if (!target) setTarget('mars', true);
      buildMarkers(); sizeCompass(); refreshSaveMeta(); syncDiscovered();
      setLoad(.88, 'Menyiapkan tampilan'); await nextFrame();
      updateShipVisual(0, 0);
      updateCamera(1, 0);
      camera.position.copy(ship.pos).add(_v.set(Math.sin(menuAngle) * 11, 3, Math.cos(menuAngle) * 11).applyQuaternion(ship.quat));
      camera.lookAt(ship.pos);
      const warm = new THREE.Group(); warm.position.copy(ship.pos); scene.add(warm);
      const curShip = store.progress.selectedShip || 'astra';
      if (!shipModels[curShip]) shipModels[curShip] = buildShip(curShip);
      warm.add(shipModels[curShip].group);
      try { await renderer.compileAsync(scene, camera); await renderer.compileAsync(bgScene, bgCam); } catch (e) { console.warn(e); }
      warm.remove(shipModels[curShip].group);
      scene.remove(warm);
      trans.t = 1;
      setLoad(1, 'Siap terbang');
      store.ready = true;
    } catch (err) {
      console.error(err);
      booting = null;
      store.loading.error = 'Dunia 3D gagal dimuat: ' + (err && err.message ? err.message : err) + '. Pakai browser terbaru yang mendukung WebGL2.';
    }
  }

  // ---------- API untuk UI ----------
  const api = {
    hazard: (kind) => hazards?.trigger(kind),
    boot, startGame, pause, resume, toSplash, setMode, back, stop, toggleCam, cycleTarget, setTarget, focus, selectEvent, focusLocation, buildPOIs, poiStatus,
    applyObsToggles, flyTo,
    approachYes() { const id = store.approach.id; store.approach.show = false; if (id) setMode('planet', { body: id }); },
    approachNo() { store.approach.show = false; },
    pheno: { start: startPheno, stop: () => stopPheno(), restart() { if (!pheno.id) return; obsTime = pheno.t0; pheno.spin = pheno.t0; pheno.prevDec = null; store.obs.mul = pheno.def.mul; store.pheno.playing = true; },
      toggle() { if (!pheno.id) return; store.pheno.playing = !store.pheno.playing; store.obs.mul = store.pheno.playing ? pheno.def.mul : 0; } },
    setShip(id) { setShip(id); },
    previewShip(id) { setShip(id); store.hangarPreview = id; },
    applySettings() { saveSettings(); keymap = resolveKeymap(settings.keys); if (renderer) applyQuality(); sfx.init(); sfx.setEnabled(settings.soundEnabled); },
    toggleSound() { settings.soundEnabled = !settings.soundEnabled; sfx.init(); sfx.setEnabled(settings.soundEnabled); saveSettings(); },
    click() { sfx.click(); }, chime() { sfx.chime(); }, correct() { sfx.correct(); }, wrong() { sfx.wrong(); },
    get touch() { return { joy, hold }; },
    setThrottle(v) { ship.throttle = clamp(v, -.3, 1); ship.braking = false; },
    setBoost(onOff) { hold.boost = !!onOff; },
    setBrake(onOff) { hold.brake = !!onOff; if (onOff) ship.braking = true; },
    setSteer(x, y) { joy.x = clamp(x, -1, 1); joy.y = clamp(y, -1, 1); },
    get throttle() { return ship.throttle; },
    // Misi kisah nyata (Apollo 13)
    mission: {
      launch() { mission?.launch(); },
      complete(task, firstTry) { mission?.complete(task, firstTry); },
      skipFar() { mission?.skipFar(); },
      reset() { mission?.reset(); },
      starsNow() { return mission ? mission.starsNow() : 1; },
      investigate() { mission?.investigate?.(); },
      mark(id, firstTry, fixK) { mission?.mark?.(id, firstTry, fixK); },
    },
    // Fenomena
    lab: {
      setType(t) { ensureLab(); store.lab.type = t; lab.setType(t); store.lab.playing = true; store.lab.marks = lab.marks; },
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
        bodies: sys.bodies.map((b) => ({ id: b.id, name: b.name, kind: b.kind, x: b.pos.x, z: b.pos.z, r: b.radius, color: b.color, isSun: !!b.isSun, isMoon: !!b.isMoon, found: discovered.has(b.id), d: Math.max(0, sp.distanceTo(b.pos) - b.radius) })),
        orbits: sys.bodies.filter((b) => b.orbitPts).map((b) => ({ id: b.id, pts: b.orbitPts.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.z]) })),
        ship: { x: sp.x, z: sp.z, heading: Math.atan2(fwd.x, -fwd.z) },
        target: target ? target.id : null, belt: [BELT.inner, BELT.outer], rmax: RMAX, cruise: shipDef().speed * shipDef().boost,
      };
    },
    orbitSummary(id) {
      const b = sys && sys.byId[id]; if (!b || !b.orbitPts) return null;
      return { pts: b.orbitPts.filter((_, i) => i % 6 === 0).map((p) => [p.x, p.z]), pos: [b.pos.x, b.pos.z] };
    },
    get _debug() { return { cam: camera.position.toArray(), camQ: camera.quaternion.toArray(), ship: ship.pos.toArray(), earth: sys?.byId.bumi.pos.toArray(), exposure: renderer?.toneMappingExposure, fov: camera.fov, mode: worldMode() }; },
    dispose() {
      hazards?.dispose();
      if (renderer) { renderer.setAnimationLoop(null); composer && composer.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
      for (const [t, ev, fn, opt] of listeners) t.removeEventListener(ev, fn, opt);
    },
  };
  return api;
}

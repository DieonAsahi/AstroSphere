// Peristiwa antariksa saat terbang — membuat penjelajahan lebih menantang, tetap mendidik (teks: data/events.js).
// 1) Badai Matahari: peringatan 30 dtk → badai 22 dtk. Aman bila pesawat berada di bayangan planet/satelit
//    (faktor cahaya dihitung mesin dari garis pesawat → Matahari). Penanda "Berlindung" menunjuk sisi malam benda terdekat.
// 2) Sampah antariksa: di sekitar orbit Bumi, serpihan satelit melintas & mengarah ke pesawat selama 18 dtk;
//    hindari dengan geser (A/D), putar (Q/E), atau naik/turun. Tiap tabrakan mengurangi perisai.
// Perisai 0 → pesawat rusak (turbo mati, gas maks 60%) sampai mendekati planet/satelit mana pun.
import * as THREE from 'three';
import { fmtDist } from './util.js';
import { EVENTS } from '../data/events.js';

const STORM_WARN = 30, STORM_LEN = 22, STORM_DRAIN = 5.5;
const DEB_WARN = 4, DEB_LEN = 18, DEB_RATE = 2.6, DEB_DMG = 15, DEB_OK = 3, HIT_R = 3.6;
const rnd = (a, b) => a + Math.random() * (b - a);

export function createHazards({ scene, camera, ship, sys, store, sfx, markersEl, toast, shakeBy, stopAutopilot, getLight, reward }) {
  const ev = store.event;
  let flight = 0, nextStorm = rnd(150, 220), nextDebris = 50, cur = null, beepT = 0, factI = Math.floor(Math.random() * 4);
  const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

  // ---- penanda tempat berlindung (DOM, di lapisan penanda HUD) ----
  const mk = document.createElement('div');
  mk.className = 'hz-mk'; mk.innerHTML = '<i></i><b></b>'; mk.style.display = 'none';
  markersEl?.appendChild(mk);
  const mkLabel = mk.querySelector('b');

  // ---- partikel badai (garis oranye mengalir menjauhi Matahari) ----
  const NS = 240, BOX = 240;
  const sPos = new Float32Array(NS * 6), sOff = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) { sOff[i * 3] = rnd(-BOX, BOX); sOff[i * 3 + 1] = rnd(-BOX * .6, BOX * .6); sOff[i * 3 + 2] = rnd(-BOX, BOX); }
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const sMat = new THREE.LineBasicMaterial({ color: '#ffb066', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const streaks = new THREE.LineSegments(sGeo, sMat); streaks.frustumCulled = false; streaks.visible = false; scene.add(streaks);

  // ---- serpihan (instanced: pecahan logam + panel surya) ----
  const MAXF = 60, MAXP = 24;
  const fragGeo = new THREE.IcosahedronGeometry(1, 0), panelGeo = new THREE.BoxGeometry(1, 1, 1);
  const fragMat = new THREE.MeshStandardMaterial({ color: '#9aa1ad', metalness: .6, roughness: .45, flatShading: true });
  const panelMat = new THREE.MeshStandardMaterial({ color: '#2d4a8f', metalness: .7, roughness: .3, emissive: '#0b1630', emissiveIntensity: .6 });
  const frags = new THREE.InstancedMesh(fragGeo, fragMat, MAXF), panels = new THREE.InstancedMesh(panelGeo, panelMat, MAXP);
  for (const m of [frags, panels]) { m.frustumCulled = false; m.count = 0; m.visible = false; scene.add(m); }
  const pieces = [];

  function shelterPoint(b, out) { return out.copy(b.pos).normalize().multiplyScalar(b.radius * 1.7 + 4).add(b.pos); }
  function pickShelter() {
    let best = null, bs = Infinity;
    for (const b of sys.bodies) {
      if (b.isSun || !(b.radius > 2.5) || b.active === false) continue;
      const d = shelterPoint(b, _p).distanceTo(ship.pos);
      const score = d + (b.radius < 10 ? 400 : 0); // bayangan satelit kecil sempit → utamakan planet
      if (score < bs) { bs = score; best = b; }
    }
    return best && shelterPoint(best, _p).distanceTo(ship.pos) < 4200 ? best : null;
  }
  function nearEarth() {
    const e = sys.byId.bumi; if (!e || e.active === false) return false;
    const alt = ship.pos.distanceTo(e.pos) - e.radius;
    return alt > 20 && alt < 320 && ship.speed > 4;
  }

  function begin(kind, extra) {
    cur = { kind, phase: 'warn', t: kind === 'badai' ? STORM_WARN : DEB_WARN, expo: 0, hits: 0, broke: false, acc: 0, ...extra };
    Object.assign(ev, { kind, phase: 'warn', left: Math.ceil(cur.t), safe: false, hits: 0, expo: 0, shelterName: extra?.shelter?.name || '' });
    stopAutopilot(); sfx.alarm?.(); beepT = 0;
  }
  function breakShip() {
    if (ev.damaged) return;
    ev.damaged = true; ev.shield = 0; if (cur) cur.broke = true;
    sfx.thump(); shakeBy(1); toast('<b>Sistem pesawat rusak!</b> Turbo mati', 2600);
  }
  function finish(ok) {
    const c = cur, E = EVENTS[c.kind];
    cur = null; ev.phase = ''; ev.kind = ''; ev.expo = 0;
    clearPieces(); mk.style.display = 'none';
    const r = ok ? (reward?.(c.kind) || 0) : 0;
    const miss = c.kind === 'badai' ? 'Kamu terlalu lama terkena radiasi. Lain kali, langsung terbang ke penanda bayangan.'
      : `Kamu tertabrak ${c.hits} kali. Coba bergeser lebih cepat dengan A/D atau naik-turun.`;
    ev.result = { kind: c.kind, ok, title: ok ? 'Selamat!' : c.broke ? 'Pesawat rusak' : 'Hampir saja', text: ok ? E.ok : c.broke ? E.fail : miss, fact: E.facts[factI++ % E.facts.length], reward: r, hits: c.hits };
    if (ok) sfx.chime(); else sfx.wrong?.();
    if (c.kind === 'badai') nextStorm = flight + rnd(300, 460); else nextDebris = flight + rnd(240, 320);
  }

  // ---- serpihan ----
  function spawnPiece(aimed) {
    const sp = ship.vel.length();
    const dir = sp > 5 ? ship.vel.clone().normalize() : new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.quat), up = new THREE.Vector3(0, 1, 0).applyQuaternion(ship.quat);
    const pos = ship.pos.clone().addScaledVector(dir, rnd(170, 260)).addScaledVector(right, rnd(-45, 45)).addScaledVector(up, rnd(-28, 28));
    let vel;
    if (aimed) {
      const tHit = rnd(2.4, 3.6);
      const tgt = ship.pos.clone().addScaledVector(ship.vel, tHit).addScaledVector(right, rnd(-6, 6)).addScaledVector(up, rnd(-4, 4));
      vel = tgt.sub(pos).divideScalar(tHit);
    } else vel = right.clone().multiplyScalar((Math.random() < .5 ? -1 : 1) * rnd(14, 30)).addScaledVector(dir, -rnd(5, 18)); // serpihan melintas di jalur depan
    const panel = Math.random() < .28;
    const nP = pieces.filter((p) => p.panel === panel).length;
    if (nP >= (panel ? MAXP : MAXF)) return;
    const k = rnd(.8, 1.9);
    pieces.push({
      panel, pos, vel, life: 0, hit: false,
      q: new THREE.Quaternion().random(), axis: new THREE.Vector3().randomDirection(), w: rnd(.6, 2.6),
      s: panel ? new THREE.Vector3(2.6 * k, .12, 1.3 * k) : new THREE.Vector3(k, k * rnd(.4, .9), k * rnd(.6, 1.4)),
      r: panel ? 1.4 * k : k,
    });
  }
  function clearPieces() { pieces.length = 0; frags.count = 0; panels.count = 0; frags.visible = panels.visible = false; }
  function updatePieces(dt) {
    let nf = 0, np = 0;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.life += dt; p.pos.addScaledVector(p.vel, dt);
      p.q.multiply(_q.setFromAxisAngle(p.axis, p.w * dt));
      const d = p.pos.distanceTo(ship.pos);
      if (!p.hit && d < HIT_R + p.r) {
        p.hit = true; cur.hits++; ev.hits = cur.hits; ev.flash++;
        ev.shield = Math.max(0, ev.shield - DEB_DMG);
        sfx.hit?.(); shakeBy(.7);
        if (ev.shield <= 0) breakShip();
        pieces.splice(i, 1); continue;
      }
      if (p.life > 9 || d > 520) { pieces.splice(i, 1); continue; }
      _m.compose(p.pos, p.q, p.s);
      if (p.panel) panels.setMatrixAt(np++, _m); else frags.setMatrixAt(nf++, _m);
    }
    frags.count = nf; panels.count = np;
    frags.visible = nf > 0; panels.visible = np > 0;
    frags.instanceMatrix.needsUpdate = true; panels.instanceMatrix.needsUpdate = true;
  }

  // ---- partikel badai ----
  function updateStreaks(dt, k) {
    streaks.visible = k > .01; sMat.opacity = k;
    if (!streaks.visible) return;
    const dir = _v.copy(ship.pos).normalize(), step = 260 * dt, len = 18;
    for (let i = 0; i < NS; i++) {
      const j = i * 3;
      let ox = sOff[j] + dir.x * step, oy = sOff[j + 1] + dir.y * step, oz = sOff[j + 2] + dir.z * step;
      if (ox * dir.x + oy * dir.y + oz * dir.z > BOX) { ox -= dir.x * BOX * 2; oy -= dir.y * BOX * 2; oz -= dir.z * BOX * 2; }
      sOff[j] = ox; sOff[j + 1] = oy; sOff[j + 2] = oz;
      const o = i * 6, x = ship.pos.x + ox, y = ship.pos.y + oy, z = ship.pos.z + oz;
      sPos[o] = x; sPos[o + 1] = y; sPos[o + 2] = z;
      sPos[o + 3] = x - dir.x * len; sPos[o + 4] = y - dir.y * len; sPos[o + 5] = z - dir.z * len;
    }
    sGeo.attributes.position.needsUpdate = true;
  }

  // ---- penanda bayangan: proyeksi ke layar, menempel di tepi bila di luar layar ----
  function updateMarker(b) {
    if (!b) { mk.style.display = 'none'; return; }
    shelterPoint(b, _p);
    const dist = _p.distanceTo(ship.pos);
    _p.project(camera);
    let x = _p.x, y = _p.y;
    const behind = _p.z > 1;
    if (behind) { x = -x; y = -y; }
    const off = behind || Math.abs(x) > .9 || Math.abs(y) > .84;
    if (off) { const m = Math.max(Math.abs(x) / .9, Math.abs(y) / .84, 1e-4); x /= m; y /= m; }
    const W = innerWidth, H = innerHeight, sx = (x * .5 + .5) * W, sy = (-y * .5 + .5) * H;
    mk.style.display = '';
    mk.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
    mk.style.setProperty('--a', `${Math.atan2(sy - H / 2, sx - W / 2).toFixed(3)}rad`);
    mk.classList.toggle('edge', off && !ev.safe);
    mk.classList.toggle('safe', ev.safe);
    mk.classList.toggle('lft', sx > W * .7);
    mkLabel.textContent = ev.safe ? 'Aman di bayangan' : `Bayangan ${b.name} · ${fmtDist(dist)}`;
  }

  return {
    /** Satu langkah saat terbang (fase jelajah & bermain). */
    update(dt) {
      flight += dt;
      if (!cur) {
        if (!ev.damaged && ev.shield < 100) ev.shield = Math.min(100, ev.shield + 3 * dt);
        updateStreaks(dt, 0); mk.style.display = 'none';
        if (store.settings.events && !store.approach.show && !ev.result) {
          if (flight > nextStorm) { const sh = pickShelter(); if (sh) begin('badai', { shelter: sh }); else nextStorm = flight + 30; }
          else if (flight > nextDebris && nearEarth()) begin('sampah');
        }
        return;
      }
      cur.t -= dt; ev.left = Math.max(0, Math.ceil(cur.t));
      if (cur.kind === 'badai') {
        const L = getLight();
        ev.safe = L < .35;
        if (cur.phase === 'warn') {
          beepT -= dt; if (beepT <= 0) { sfx.alarm?.(); beepT = cur.t < 10 ? 1.2 : 2.5; }
          updateStreaks(dt, cur.t < 6 ? (6 - cur.t) / 6 * .2 : 0);
          if (cur.t <= 0) { cur.phase = 'active'; ev.phase = 'active'; cur.t = STORM_LEN; ev.left = STORM_LEN; sfx.storm?.(); shakeBy(.5); }
        } else {
          if (L > .05) {
            ev.shield = Math.max(0, ev.shield - STORM_DRAIN * L * dt); cur.expo += L * dt;
            if (L > .5) shakeBy(.08 * L);
            if (ev.shield <= 0) breakShip();
          }
          ev.expo = L;
          updateStreaks(dt, .25 + .55 * L);
          if (cur.t <= 0) { updateStreaks(dt, 0); finish(cur.expo < STORM_LEN * .4 && !cur.broke); return; }
        }
        updateMarker(cur.shelter);
      } else {
        if (cur.phase === 'warn') {
          if (cur.t <= 0) { cur.phase = 'active'; ev.phase = 'active'; cur.t = DEB_LEN; ev.left = DEB_LEN; }
        } else {
          cur.acc += dt * DEB_RATE;
          while (cur.acc >= 1) { cur.acc -= 1; spawnPiece(Math.random() < .32); }
          updatePieces(dt);
          if (cur.t <= 0) { finish(cur.hits <= DEB_OK && !cur.broke); return; }
        }
      }
    },
    /** Dunia berhenti (jeda) atau bukan mode terbang: efek disembunyikan kecuali saat jeda di mode terbang. */
    idle(keep) {
      if (keep) return;
      mk.style.display = 'none'; streaks.visible = false; frags.visible = panels.visible = false;
    },
    /** Mendekati benda: perbaiki pesawat. Mengembalikan true bila peristiwa sedang berlangsung (tawaran planet ditunda). */
    onApproach(b) {
      if (ev.damaged && !b.isSun) {
        ev.damaged = false; ev.shield = 100;
        toast('<b>Perisai pesawat pulih 100%!</b>', 3000); sfx.chime();
      }
      return !!cur;
    },
    busy: () => !!cur,
    _pieces: () => pieces, // untuk uji otomatis
    reset() {
      cur = null; flight = 0; nextStorm = rnd(150, 220); nextDebris = 50;
      clearPieces(); updateStreaks(0, 0); mk.style.display = 'none';
      Object.assign(ev, { kind: '', phase: '', left: 0, shelterName: '', safe: false, shield: 100, damaged: false, hits: 0, expo: 0, result: null });
    },
    /** Untuk uji/pengembang: paksa peristiwa ('badai' | 'sampah'). */
    trigger(kind) {
      if (cur) return false;
      if (kind === 'badai') { const sh = pickShelter(); if (!sh) return false; begin('badai', { shelter: sh }); return true; }
      if (kind === 'sampah') { begin('sampah'); return true; }
      return false;
    },
    dispose() {
      mk.remove(); scene.remove(streaks, frags, panels);
      sGeo.dispose(); sMat.dispose(); fragGeo.dispose(); panelGeo.dispose(); fragMat.dispose(); panelMat.dispose();
    },
  };
}

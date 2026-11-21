// Latar hidup layar awal: satu kanvas WebGL 1 kecil (tanpa Three.js) yang menggambar Bumi berputar,
// Matahari, atau lubang hitam. Gambar statis di bawahnya tetap tampil sampai frame pertama siap,
// dan menjadi cadangan bila WebGL tidak ada, shader gagal, atau perangkat terlalu lambat.
// Hemat: maks 30 fps, resolusi diperkecil per adegan, berhenti saat tab tersembunyi (rAF), turun kualitas
// otomatis bila frame lambat, dan konteks GPU dilepas saat layar awal ditutup.
import { VERT, EARTH_FS, SUN_FS, HOLE_FS } from './backdropShaders.js';
import { noiseRGBA, NOISE_SIZE } from './noise.js';
import { coverMap, sunLayout, holeLayout, EARTH_LAT, EARTH_SPIN } from './backdropLayout.js';

const SCENES = { earth: { scale: 1 }, sun: { scale: .75 }, hole: { scale: .6 } };
const FRAME_MS = 1000 / 30;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {(visible: boolean) => void} onVisible  dipanggil untuk memudarkan kanvas masuk/keluar
 * @param {{ quality?: number }} [opts]  skala resolusi awal (mis. .8 untuk mode grafis Hemat)
 * @returns {{ setScene(name: 'earth'|'sun'|'hole'): void, dispose(): void } | null}
 */
export function createLiveBackdrop(canvas, onVisible, { quality: q0 = 1 } = {}) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch { gl = null; }
  if (!gl) return null;
  const deriv = !!gl.getExtension('OES_standard_derivatives');
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 2048;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

  // derau (unit 1)
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NOISE_SIZE, NOISE_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, noiseRGBA());
  texParams(gl.REPEAT, gl.REPEAT, gl.LINEAR);

  function texParams(ws, wt, min) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, ws); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  // ---- program ----
  const progs = {};
  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src.replace(/[^\t\n\r\x20-\x7e]/g, '')); // GLSL ES 1.0: hanya ASCII (komentar berbahasa Indonesia aman)
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS) && !gl.isContextLost()) { console.warn('[AstroSphere] shader latar gagal:', gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  function program(name) {
    if (name in progs) return progs[name];
    const v = compile(gl.VERTEX_SHADER, VERT), f = compile(gl.FRAGMENT_SHADER, name === 'earth' ? EARTH_FS(deriv) : name === 'sun' ? SUN_FS : HOLE_FS);
    let p = null; const u = {};
    if (v && f) {
      p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn('[AstroSphere] shader latar gagal ditautkan:', gl.getProgramInfoLog(p)); p = null; }
      else for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    }
    return (progs[name] = p ? { p, u } : null);
  }

  // ---- tekstur Bumi (unit 0), diunduh saat pertama dibutuhkan ----
  let earthLoad = null;
  function loadEarth() {
    if (earthLoad) return earthLoad;
    const big = maxTex >= 4096 && Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2) > 1400;
    earthLoad = new Promise((res) => {
      const img = new Image(); img.decoding = 'async';
      img.onload = () => {
        if (dead) return res(false);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        if (deriv) { gl.generateMipmap(gl.TEXTURE_2D); texParams(gl.REPEAT, gl.CLAMP_TO_EDGE, gl.LINEAR_MIPMAP_LINEAR); }
        else texParams(gl.REPEAT, gl.CLAMP_TO_EDGE, gl.LINEAR);
        res(true);
      };
      img.onerror = () => res(false);
      img.src = big ? '/img/earth-band-4k.webp' : '/img/earth-band-2k.webp';
    });
    return earthLoad;
  }

  // ---- gambar ----
  let cur = null, want = null, raf = 0, last = 0, dead = false, quality = q0;
  const clock = { earth: 0, sun: 0, hole: 0 };
  const set = (u, k, fn, ...v) => { if (u[k]) gl[fn](u[k], ...v); };
  function draw(name) {
    const pr = program(name); if (!pr) return false;
    const dpr = Math.min(devicePixelRatio || 1, 1.5), k = SCENES[name].scale * quality * dpr;
    const W = Math.max(2, Math.round(canvas.clientWidth * k)), H = Math.max(2, Math.round(canvas.clientHeight * k));
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.useProgram(pr.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = pr.u, t = clock[name];
    set(u, 'uRes', 'uniform2f', W, H); set(u, 'uTime', 'uniform1f', t);
    set(u, 'uMap', 'uniform3f', ...coverMap(W, H, name === 'earth'));
    if (name === 'earth') {
      set(u, 'uTex', 'uniform1i', 0); set(u, 'uLat', 'uniform2f', EARTH_LAT[0], EARTH_LAT[1]); set(u, 'uRot', 'uniform1f', t * EARTH_SPIN);
    } else if (name === 'sun') {
      const L = sunLayout(W, H); set(u, 'uNoise', 'uniform1i', 1); set(u, 'uC', 'uniform2f', L.cx, L.cy); set(u, 'uR', 'uniform1f', L.r);
    } else {
      const L = holeLayout(W, H); set(u, 'uNoise', 'uniform1i', 1); set(u, 'uC', 'uniform2f', L.cx, L.cy); set(u, 'uS', 'uniform1f', L.s); set(u, 'uROut', 'uniform1f', L.rout);
    }
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }

  // Penjaga kinerja: rata-rata jarak antar-frame terlalu besar → turunkan resolusi; masih lambat → kembali ke gambar statis.
  let nFrames = 0, sumDt = 0;
  function governor(dt) {
    if (dt > .25) return; // baru kembali dari tab tersembunyi
    if (++nFrames <= 8) return;
    sumDt += dt;
    if (nFrames < 48) return;
    const avg = sumDt / (nFrames - 8); nFrames = 0; sumDt = 0;
    if (avg < .055) return;
    if (quality > .6) { quality *= .7; return; }
    off = true; stopLoop(); // perangkat terlalu lambat: tetap pakai gambar statis
  }
  let off = false;
  function stopLoop() { cur = null; want = null; onVisible(false); cancelAnimationFrame(raf); raf = 0; }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!cur || now - last < FRAME_MS - 4) return;
    const dt = last ? (now - last) / 1000 : 0; last = now;
    clock[cur] += Math.min(dt, .1);
    if (!draw(cur)) { cur = null; onVisible(false); return; }
    governor(dt);
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  /** Ganti adegan; null = sembunyikan kanvas (gambar statis yang tampil). */
  async function setScene(name) {
    if (dead || off || want === name) return;
    want = name;
    onVisible(false);
    if (cur) await wait(420); // tunggu kanvas memudar sebelum mengganti adegan
    if (want !== name || dead) return;
    if (!name || !SCENES[name]) { cur = null; return; }
    if (name === 'earth' && !(await loadEarth())) { if (want === name) cur = null; return; }
    if (want !== name || dead) return;
    cur = name; last = 0; nFrames = 0; sumDt = 0;
    if (!draw(name)) { cur = null; return; }
    if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => { if (want === name && cur === name && !dead) onVisible(true); });
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; stopLoop(); });
  return {
    setScene,
    dispose() { dead = true; cancelAnimationFrame(raf); raf = 0; cur = null; try { gl.getExtension('WEBGL_lose_context')?.loseContext(); } catch {} },
  };
}

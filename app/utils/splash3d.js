// Latar 3D layar Masuk & Daftar (Three.js) memakai model GLB yang disiapkan di public/models/decor/:
//   'sun'    → Matahari (sun.glb) berputar + granulasi, spikula, prominensa, suar (solar flare), dan CME.
//   'galaxy' → tabrakan galaksi Bima Sakti × Andromeda (galaxy_collision.glb, awan bintang + animasi morph).
// Hemat: Three.js & model baru diunduh saat layar ini dibuka, maks 30 fps, resolusi diperkecil, berhenti saat tab
// tersembunyi, turun kualitas otomatis bila lambat (lalu kembali ke gambar statis), konteks GPU dilepas saat ditutup.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { coverMap, sunLayout } from './backdropLayout.js';

const FRAME_MS = 1000 / 30;
const SCALE = { sun: .85, galaxy: .85 };

/* ------------------------------------------------------------------ shader Matahari ---- */
const CORE_VS = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vO;
void main(){
  vUv = uv; vO = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
// Fotosfer: tekstur model + granulasi seluler 3D yang "mendidih", penggelapan tepi, dan titik suar.
const CORE_FS = /* glsl */`
uniform sampler2D uMap; uniform float uTime; uniform vec3 uFlareDir; uniform float uFlare; uniform float uGran;
varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vO;
vec3 hash3(vec3 p){
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
vec2 cells(vec3 x, float t){
  vec3 i = floor(x), f = fract(x); float d1 = 8.0, d2 = 8.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int l = -1; l <= 1; l++) {
    vec3 g = vec3(float(l), float(j), float(k));
    vec3 o = hash3(i + g); o = 0.5 + 0.38 * sin(t + 6.2831 * o);
    vec3 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return vec2(sqrt(d1), sqrt(d2));
}
void main(){
  vec3 N = normalize(vN), V = normalize(vV);
  float mu = clamp(dot(N, V), 0.0, 1.0);
  vec3 tex = texture2D(uMap, vUv).rgb;
  float gran = 1.0;
  if (uGran > 0.5) {
    vec2 c = cells(vO * 120.0, uTime * 0.3);
    float inside = smoothstep(0.0, 0.35, c.y - c.x);
    gran = mix(0.84, 1.06, inside) * (0.94 + 0.1 * (1.0 - c.x));
    gran = mix(1.0, gran, smoothstep(0.15, 0.55, mu));
  }
  vec3 col = tex * gran;
  col *= (0.3 + 0.7 * pow(mu, 0.6)) * mix(vec3(1.0, 0.52, 0.28), vec3(1.0), pow(mu, 0.45));
  float fd = length(N - uFlareDir);
  col += vec3(1.0, 0.93, 0.78) * uFlare * (1.85 * exp(-fd * fd * 1400.0) + 0.42 * exp(-fd * fd * 110.0));
  gl_FragColor = vec4(col * 0.96, 1.0);
  #include <colorspace_fragment>
}`;

// Lapisan tepi (bidang menghadap kamera, koordinat kutub; r = 1 di tepi piringan):
// korona, spikula (rambut plasma pendek), prominensa (busur plasma), suar di tepi, dan CME (gelembung plasma yang meluas).
const LIMB_VS = /* glsl */`
varying vec2 vP;
void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LIMB_FS = /* glsl */`
uniform float uTime; uniform float uFlare; uniform float uFlareAng;
uniform float uCme; uniform float uCmeAng; uniform vec4 uProm[4]; uniform float uDetail;
varying vec2 vP;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n2(p); p = p * 2.07 + vec2(3.1, 1.7); a *= 0.5; } return s; }
float angDiff(float a, float b){ float d = a - b; return atan(sin(d), cos(d)); }
void main(){
  vec2 p = vP;
  float r = length(p);
  if (r > 4.0) discard;
  float a = atan(p.y, p.x);
  vec2 dir = p / max(r, 1e-4);
  float h = r - 1.0;
  float outside = smoothstep(0.994, 1.002, r);
  vec3 col = vec3(0.0);

  // korona: pendar hangat yang cepat meredup + berkas (streamer) yang bergerak pelan
  float streak = fbm(dir * 3.2 + vec2(uTime * 0.02, 0.0));
  float hh = max(h, 0.0);
  float cor = exp(-hh * 9.0) * (0.5 + 0.7 * streak) * 0.3 + exp(-hh * 4.0) * (0.45 + 0.6 * streak) * 0.012;
  col += vec3(1.0, 0.62, 0.3) * cor * outside;

  // spikula: rambut plasma rapat setinggi ±0,8–2,5% jari-jari, berkedip
  float hair = n2(dir * 210.0 + vec2(0.0, uTime * 0.8));
  float hgt = 0.008 + 0.017 * n2(dir * 52.0 + vec2(uTime * 0.22, 7.0));
  float spic = (1.0 - smoothstep(0.0, hgt, h)) * pow(hair, 2.0) * step(0.0, h);
  col += vec3(1.0, 0.36, 0.14) * spic * 1.1 * uDetail;
  // kromosfer tipis tepat di tepi piringan
  col += vec3(1.0, 0.42, 0.18) * exp(-abs(h) * 220.0) * 0.55;

  // prominensa: busur plasma bertumpu di dua titik kaki, aliran plasma bergerak di sepanjang busur
  for (int i = 0; i < 4; i++) {
    vec4 P = uProm[i]; // x = sudut pusat, y = setengah lebar (rad), z = tinggi, w = tebal
    float d = angDiff(a, P.x);
    if (abs(d) > P.y * 1.2) continue;
    float s = clamp(d / P.y * 0.5 + 0.5, 0.0, 1.0);
    float wob = 1.0 + 0.07 * sin(uTime * 0.35 + float(i) * 2.1) + 0.05 * (n2(vec2(s * 4.0, uTime * 0.2 + float(i))) - 0.5);
    float rr = 1.0 + P.z * wob * sin(3.14159 * s);
    float k = P.z * 3.14159 / (2.0 * P.y) * cos(3.14159 * s) / r;
    float dp = (r - rr) / sqrt(1.0 + k * k);
    float thick = P.w * (0.8 + 0.7 * n2(vec2(s * 7.0, float(i) * 5.0)));
    float body = exp(-pow(dp / thick, 2.0));
    float haze = exp(-abs(dp) / (thick * 2.4)) * 0.3;          // selubung lembut → plasma, bukan kawat
    float fil = fbm(vec2(s * 20.0 - uTime * 0.45, dp / thick * 0.8 + float(i) * 3.0));
    float brk = smoothstep(0.28, 0.75, fil);                    // serat plasma terputus-putus
    float feet = smoothstep(0.0, 0.1, s) * (1.0 - smoothstep(0.9, 1.0, s)) * (1.0 - smoothstep(P.z * 1.05, P.z * 1.45, h)); // tidak melewati puncak busur
    col += vec3(1.0, 0.3, 0.1) * (body * (0.3 + 1.05 * brk) + haze * fil) * feet * outside * 1.25;
  }

  // suar (solar flare) di tepi: kilat terang singkat
  float fa = angDiff(a, uFlareAng);
  float fl = exp(-(fa * fa) * 900.0 - h * h * 1800.0) * 2.2 + exp(-(fa * fa) * 60.0 - max(h, 0.0) * 9.0) * 0.5;
  col += vec3(1.0, 0.92, 0.75) * fl * uFlare;

  // CME: awan plasma berbentuk kipas yang menyembur dari titik suar, melebar sambil menjauh lalu memudar
  if (uCme > 0.0 && uCme < 1.0) {
    vec2 cd = vec2(cos(uCmeAng), sin(uCmeAng));
    float pr = uCme;
    float along = dot(p, cd), lat = cd.x * p.y - cd.y * p.x;
    if (along > 0.97) {
      float front = 1.02 + 1.7 * pr;
      float width = 0.04 + 0.42 * max(0.0, along - 1.0);
      float cone = exp(-pow(lat / width, 2.0));
      float band = exp(-pow((along - front) / (0.1 + 0.3 * pr), 2.0));
      float trail = smoothstep(1.0, 1.12, along) * (1.0 - smoothstep(front - 0.15, front + 0.15, along)) * 0.25; // materi tipis di belakang muka CME
      float streaks = fbm(vec2(lat / width * 2.6, along * 2.2 - uTime * 0.35));
      float fade = pow(1.0 - pr, 1.5) * smoothstep(0.0, 0.08, pr);
      col += vec3(1.0, 0.62, 0.36) * cone * (band + trail) * (0.3 + 0.9 * streaks) * fade * outside * 0.42;
    }
  }
  gl_FragColor = vec4(col * 0.74, 1.0);
  #include <colorspace_fragment>
}`;

/* ------------------------------------------------------------------ util ---- */
function softDisc() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.65)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function starField(n, radius, seed = 7) {
  let s = seed; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, q = Math.sqrt(1 - u * u);
    pos.set([q * Math.cos(th) * radius, u * radius, q * Math.sin(th) * radius], i * 3);
    const b = .35 + Math.pow(r(), 3) * .9, warm = r();
    col.set([b * (warm > .7 ? 1 : .85), b * .9, b * (warm < .3 ? 1.05 : .85)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false }));
}
const loadGLB = (url) => new Promise((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(url, res, undefined, rej));

/* ------------------------------------------------------------------ adegan Matahari ---- */
async function buildSun(detail) {
  const gltf = await loadGLB('/models/decor/sun.glb');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 400);
  const pivot = new THREE.Group(); pivot.rotation.z = -7.25 * Math.PI / 180; // kemiringan sumbu Matahari
  const spin = new THREE.Group(); pivot.add(spin); scene.add(pivot);
  const root = gltf.scene; root.scale.setScalar(.1); spin.add(root); // model berjari-jari 10 → 1

  const uni = { uTime: { value: 0 }, uFlareDir: { value: new THREE.Vector3(0, 0, 1) }, uFlare: { value: 0 }, uGran: { value: detail ? 1 : 0 } };
  let shell = null;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const role = o.userData.role || o.parent?.userData.role;
    const map = o.material.map || o.material.emissiveMap;
    if (map) map.colorSpace = THREE.SRGBColorSpace;
    if (role === 'shell') {
      shell = o;
      o.material = new THREE.MeshBasicMaterial({ map, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false });
    } else {
      o.material = new THREE.ShaderMaterial({ vertexShader: CORE_VS, fragmentShader: CORE_FS, uniforms: { ...uni, uMap: { value: map } } });
    }
  });

  // x = sudut pusat (rad, 0 = kanan, π/2 = atas), y = setengah lebar kaki (rad), z = tinggi busur (× jari-jari), w = tebal
  const PROM = [
    new THREE.Vector4(1.86, .07, .12, .018),
    new THREE.Vector4(2.32, .045, .08, .014),
    new THREE.Vector4(2.78, .1, .15, .022),
    new THREE.Vector4(1.52, .04, .065, .012),
  ];
  const limbU = {
    uTime: uni.uTime, uFlare: uni.uFlare, uFlareAng: { value: 2.3 },
    uCme: { value: -1 }, uCmeAng: { value: 2.3 }, uProm: { value: PROM }, uDetail: { value: detail ? 1 : .5 },
  };
  const limb = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShaderMaterial({
    vertexShader: LIMB_VS, fragmentShader: LIMB_FS, uniforms: limbU,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  limb.renderOrder = 5; scene.add(limb);
  const stars = starField(1400, 120); stars.renderOrder = -1; scene.add(stars);

  // siklus peristiwa: suar → CME (±16 dtk), sudut berganti di tepi yang terlihat (kiri-atas piringan)
  const ANG = [2.25, 1.95, 2.6, 2.05, 2.45];
  let cycle = 0;
  return {
    scene, camera,
    layout(W, H) {
      const [s, ox, oy] = coverMap(W, H), L = sunLayout(W, H);
      const cx = ox + L.cx * s, cy = oy + L.cy * s, rpx = L.r * s;
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const k = (H / 2) / (rpx * tanH), d = Math.sqrt(1 + k * k);
      camera.aspect = W / H; camera.position.set(0, 0, d); camera.lookAt(0, 0, 0);
      camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H); camera.updateProjectionMatrix();
      const limbR = d / Math.sqrt(d * d - 1);
      limb.scale.setScalar(limbR); // bidang lokal ±4 → r = 1 tepat di siluet piringan
    },
    update(t) {
      uni.uTime.value = t;
      spin.rotation.y = t * (2 * Math.PI / 240);          // satu putaran ±4 menit
      if (shell) shell.rotation.z = -t * .006;           // selubung plasma bergeser berlawanan → permukaan "bergolak"
      const T = 16, c = Math.floor(t / T), ct = t - c * T;
      if (c !== cycle) cycle = c;
      const ang = ANG[((c % ANG.length) + ANG.length) % ANG.length];
      limbU.uFlareAng.value = ang; limbU.uCmeAng.value = ang;
      const fl = ct < .25 ? ct / .25 : Math.exp(-(ct - .25) * 1.6);
      uni.uFlare.value = Math.max(0, fl) * (ct < 6 ? 1 : 0);
      uni.uFlareDir.value.set(Math.cos(ang) * .985, Math.sin(ang) * .985, .17).normalize();
      limbU.uCme.value = ct > .5 && ct < 11.5 ? (ct - .5) / 11 : -1;
    },
    dispose() { scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material) { o.material.map?.dispose?.(); o.material.uniforms?.uMap?.value?.dispose?.(); o.material.dispose?.(); } }); },
  };
}

/* ------------------------------------------------------------------ adegan tabrakan galaksi ---- */
// Arah normal bidang galaksi setelah diorientasikan (kamera di +Z sedikit di atas → kemiringan ±37°).
export const GALAXY_FACE = new THREE.Vector3(0, .75, .66).normalize();
/** Pusat & normal bidang utama awan titik (PCA: vektor eigen terkecil dari kovarians posisi dunia). */
export function cloudPlane(points) {
  const a = points.geometry.attributes.position, m = points.matrixWorld, v = new THREE.Vector3();
  const n = a.count, c = new THREE.Vector3();
  for (let i = 0; i < n; i++) c.add(v.fromBufferAttribute(a, i).applyMatrix4(m));
  c.divideScalar(n);
  const C = [0, 0, 0, 0, 0, 0]; // xx xy xz yy yz zz
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(a, i).applyMatrix4(m).sub(c);
    C[0] += v.x * v.x; C[1] += v.x * v.y; C[2] += v.x * v.z; C[3] += v.y * v.y; C[4] += v.y * v.z; C[5] += v.z * v.z;
  }
  const mul = (x) => new THREE.Vector3(C[0] * x.x + C[1] * x.y + C[2] * x.z, C[1] * x.x + C[3] * x.y + C[4] * x.z, C[2] * x.x + C[4] * x.y + C[5] * x.z);
  const power = (x, ortho) => { for (let k = 0; k < 40; k++) { x = mul(x); if (ortho) x.addScaledVector(ortho, -x.dot(ortho)); x.normalize(); } return x; };
  const e1 = power(new THREE.Vector3(1, .3, .2).normalize());
  const e2 = power(new THREE.Vector3(.2, 1, .3).normalize(), e1);
  const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
  if (normal.dot(GALAXY_FACE) < 0) normal.negate();
  return { center: c, normal };
}
async function buildGalaxy(detail) {
  const gltf = await loadGLB('/models/decor/galaxy_collision.glb');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 500);
  const hold = new THREE.Group(); scene.add(hold);
  hold.add(gltf.scene);
  const disc = softDisc();
  let pts = null;
  gltf.scene.traverse((o) => {
    if (!o.isPoints) return;
    pts = o;
    o.frustumCulled = false;
    o.material = new THREE.PointsMaterial({
      size: .1, map: disc, color: new THREE.Color().setRGB(1.6, 1.6, 1.6), vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
  });
  // pendar nebula: titik besar & redup memakai geometri + bobot morph yang sama (ikut bergerak saat bertabrakan)
  let haze = null;
  if (pts && detail) {
    haze = new THREE.Points(pts.geometry, new THREE.PointsMaterial({
      size: .6, map: disc, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    haze.frustumCulled = false;
    haze.position.copy(pts.position); haze.quaternion.copy(pts.quaternion); haze.scale.copy(pts.scale);
    haze.morphTargetInfluences = pts.morphTargetInfluences; haze.morphTargetDictionary = pts.morphTargetDictionary;
    pts.parent.add(haze);
  }
  // Pusatkan awan bintang & hadapkan bidang tabrakan ke kamera (miring ±37°) — tanpa ini kedua galaksi terlihat
  // dari samping (tipis seperti garis). Bidang dicari dengan PCA dari posisi bintang awal.
  gltf.scene.updateMatrixWorld(true);
  const { center: ctr, normal } = cloudPlane(pts);
  const orient = new THREE.Group(), spinG = new THREE.Group();
  orient.quaternion.setFromUnitVectors(normal, GALAXY_FACE);
  hold.remove(gltf.scene); hold.add(orient); orient.add(spinG); spinG.add(gltf.scene);
  gltf.scene.position.sub(ctr);
  const stars = starField(1600, 160, 11); scene.add(stars);

  const mixer = new THREE.AnimationMixer(gltf.scene);
  const clip = gltf.animations[0];
  const act = clip ? mixer.clipAction(clip) : null;
  if (act) { act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; act.timeScale = .45; act.play(); }
  const dur = clip ? clip.duration / .45 : 1;
  let last = 0;
  return {
    scene, camera,
    layout(W, H) {
      camera.aspect = W / H;
      const portrait = W / H < 1;
      camera.position.set(0, 2.4, portrait ? 17 : 12);
      camera.lookAt(0, 0, 0);
      // Pada desktop/tablet (> 768px), form Daftar berada di kanan sehingga pusat galaksi digeser ke kiri
      if (W > 768 && !portrait) {
        const shiftX = Math.min(210, Math.round(W * 0.16));
        camera.setViewOffset(W, H, shiftX, 0, W, H);
      } else if (camera.view && camera.view.enabled) {
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
    },
    update(t) {
      const dt = Math.max(0, Math.min(.1, t - last)); last = t;
      spinG.quaternion.setFromAxisAngle(normal, t * .02);   // berputar pelan di bidangnya sendiri
      hold.rotation.x = Math.sin(t * .05) * .05;
      hold.rotation.y = Math.sin(t * .037) * .08;
      // satu siklus tabrakan (±44 dtk): muncul perlahan → bertabrakan → memudar → ulang dari awal
      const ph = act ? act.time / .45 / dur : 0;
      if (act) {
        mixer.update(dt);
        const end = act.time >= clip.duration - 1e-3;
        if (end) { act.reset(); act.play(); }
      }
      const fadeIn = Math.min(1, ph * 12), fadeOut = 1 - Math.max(0, (ph - .9) / .1);
      const op = Math.min(fadeIn, fadeOut);
      if (pts) pts.material.opacity = op;
      if (haze) haze.material.opacity = .07 * op;
    },
    dispose() { mixer.stopAllAction(); disc.dispose(); scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); },
  };
}

/* ------------------------------------------------------------------ pengendali ---- */
/**
 * @param {HTMLCanvasElement} canvas
 * @param {(visible: boolean) => void} onVisible
 * @param {{ quality?: number }} [opts]
 * @returns {{ setScene(name: 'sun'|'galaxy'|null): Promise<void>, dispose(): void } | null}
 */
export function createSplash3D(canvas, onVisible, { quality: q0 = 1 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true, depth: true, stencil: false, powerPreference: 'low-power' });
  } catch { return null; }
  renderer.setClearColor('#04060f', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const detail = q0 >= 1;
  const built = {}, building = {};
  let cur = null, want = null, raf = 0, last = 0, dead = false, off = false, quality = q0;
  const clock = { sun: 0, galaxy: 0 };

  let sized = '';
  function size(name) {
    const dpr = Math.min(devicePixelRatio || 1, 1.5) * SCALE[name] * quality;
    const W = Math.max(2, canvas.clientWidth), H = Math.max(2, canvas.clientHeight);
    const key = `${name}|${W}|${H}|${dpr.toFixed(3)}`;
    if (key === sized) return; // ubah ukuran buffer hanya bila berubah (menetapkan canvas.width mengosongkan buffer)
    sized = key;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    built[name].layout(W, H);
  }
  function draw(name) {
    const sc = built[name]; if (!sc) return false;
    size(name); sc.update(clock[name]);
    renderer.render(sc.scene, sc.camera);
    return true;
  }
  let nFrames = 0, sumDt = 0;
  function governor(dt) {
    if (dt > .25) return;
    if (++nFrames <= 8) return;
    sumDt += dt;
    if (nFrames < 48) return;
    const avg = sumDt / (nFrames - 8); nFrames = 0; sumDt = 0;
    if (avg < .055) return;
    if (quality > .55) { quality *= .7; return; }
    off = true; cur = null; want = null; onVisible(false); cancelAnimationFrame(raf); raf = 0;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!cur || now - last < FRAME_MS - 4) return;
    const dt = last ? (now - last) / 1000 : 0; last = now;
    clock[cur] += Math.min(dt, .1);
    if (!draw(cur)) { cur = null; onVisible(false); return; }
    governor(dt);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function ensure(name) {
    if (built[name]) return true;
    building[name] ||= (name === 'sun' ? buildSun(detail) : buildGalaxy(detail))
      .then((s) => { if (dead) { s.dispose(); return false; } built[name] = s; return true; })
      .catch((e) => { console.warn('[AstroSphere] latar 3D gagal dimuat:', e); return false; });
    return building[name];
  }
  async function preloadAll() {
    if (dead || off) return false;
    const W = Math.max(2, canvas.clientWidth || innerWidth);
    const H = Math.max(2, canvas.clientHeight || innerHeight);
    await Promise.all(['sun', 'galaxy'].map(async (name) => {
      const ok = await ensure(name);
      if (!ok || dead || !built[name]) return;
      const sc = built[name];
      sc.layout(W, H);
      sc.update(0.01);
      try {
        await renderer.compileAsync(sc.scene, sc.camera);
      } catch {
        try { renderer.compile(sc.scene, sc.camera); } catch {}
      }
    }));
    return !dead;
  }
  async function setScene(name) {
    if (dead || off || want === name) return;
    want = name;
    onVisible(false);
    if (cur) await wait(200);
    if (want !== name || dead) return;
    cur = null;
    if (!name || !(name in SCALE)) return;
    if (!(await ensure(name)) || want !== name || dead) return;
    cur = name; last = 0; nFrames = 0; sumDt = 0;
    try { if (!draw(name)) { cur = null; return; } } catch (e) { console.warn(e); cur = null; return; }
    if (!raf) raf = requestAnimationFrame(frame);
    requestAnimationFrame(() => { if (want === name && cur === name && !dead) onVisible(true); });
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); dead = true; cur = null; cancelAnimationFrame(raf); onVisible(false); });
  return {
    setScene,
    preloadAll,
    /** Unduh model lebih awal (mis. saat kursor di atas tombol Masuk/Daftar). */
    prefetch(name) { if (!dead && name in SCALE) ensure(name); },
    dispose() {
      dead = true; cancelAnimationFrame(raf); raf = 0; cur = null;
      for (const k in built) built[k].dispose();
      renderer.dispose(); try { renderer.forceContextLoss(); } catch {}
    },
  };
}

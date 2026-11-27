// Shader GLSL — diporting tanpa perubahan dari Jelajah Antariksa (index.html).
// Planet, atmosfer, cincin, Matahari, korona, langit, bintang, dan api mesin.

export const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm(vec3 p, int oct){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 8; i++){
    if (i >= oct) break;
    s += a * snoise(p);
    p = p * 2.03 + vec3(3.1, 1.7, 4.3);
    a *= 0.5;
  }
  return s;
}
float hash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 hash33(vec3 p){ p = fract(p * vec3(0.1031, 0.1030, 0.0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }
vec2 raySphere(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - r*r; float h = b*b - cc;
  if (h < 0.0) return vec2(-1.0, -1.0);
  h = sqrt(h); return vec2(-b - h, -b + h);
}
float ringDensity(float x, float s){
  float d = 0.55 + 0.22*sin(x*38.0 + s) + 0.14*sin(x*97.0 + s*2.3) + 0.09*sin(x*231.0 + s*5.1);
  d *= smoothstep(0.0, 0.06, x) * smoothstep(1.0, 0.9, x);
  d *= 1.0 - 0.9*smoothstep(0.03, 0.0, abs(x - 0.58));
  d *= 1.0 - 0.5*smoothstep(0.015, 0.0, abs(x - 0.83));
  return clamp(d, 0.0, 1.0);
}
`;

export const PLANET_VS = /* glsl */`
varying vec3 vObj; varying vec3 vWorldPos; varying vec3 vN; varying vec3 vCenter;
void main(){
  vObj = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const PLANET_FS = /* glsl */`
uniform int uType;
uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uC4; uniform vec3 uC5;
uniform float uSeed; uniform float uRadius; uniform float uTime; uniform float uSea; uniform float uClouds;
uniform float uCity; uniform float uBand; uniform float uStorm; uniform float uBump; uniform float uOct;
uniform vec3 uSunPos; uniform vec3 uSunColor; uniform vec3 uAtmo;
uniform float uHasRing; uniform float uRingIn; uniform float uRingOut; uniform vec3 uRingN; uniform float uRingSeed;
varying vec3 vObj; varying vec3 vWorldPos; varying vec3 vN; varying vec3 vCenter;
${GLSL_NOISE}
float craters(vec3 p){
  vec3 i = floor(p), f = fract(p);
  float h = 0.0;
  for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++){
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    if (o.z < 0.4) continue;
    float rad = 0.18 + 0.3 * o.x * o.x;
    float d = length(g + o - f) / rad;
    if (d < 1.0) h += (d*d - 1.0) * rad;
    h += 0.35 * rad * exp(-pow((d - 1.0) * 3.5, 2.0));
  }
  return h;
}
vec3 perturbN(vec3 pos, vec3 n, float h){
  vec3 dpdx = dFdx(pos), dpdy = dFdy(pos);
  float dhdx = dFdx(h), dhdy = dFdy(h);
  vec3 r1 = cross(dpdy, n), r2 = cross(n, dpdx);
  float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhdx * r1 + dhdy * r2);
  return normalize(abs(det) * n - grad);
}
void main(){
  vec3 p = normalize(vObj);
  vec3 sp = p + vec3(uSeed, uSeed * 1.7, uSeed * 0.3);
  int oct = int(uOct);
  vec3 N = normalize(vN);
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float camAlt = length(cameraPosition - vCenter) - uRadius;
  float nearF = 1.0 - smoothstep(0.0, uRadius * 0.8, camAlt);
  vec3 alb = vec3(0.5); float h = 0.0; float spec = 0.0; vec3 emis = vec3(0.0); float cloud = 0.0; float night = 0.0;
  float rocky = 1.0;

  if (uType == 0) {
    float w = fbm(sp * 1.4, 3);
    float b = fbm(sp * 2.2 + w * 0.9, oct) * 0.5 + 0.5;
    float dunes = sin(p.y * 46.0 + fbm(sp * 5.0, 3) * 7.0) * 0.5 + 0.5;
    float canyon = pow(1.0 - abs(snoise(sp * 3.2 + w * 1.3)), 7.0);
    alb = mix(uC1, uC2, smoothstep(0.25, 0.62, b));
    alb = mix(alb, uC3, smoothstep(0.55, 0.85, b) * 0.8);
    alb = mix(alb, uC5, canyon * 0.75);
    alb *= 0.9 + 0.1 * dunes;
    float ice = smoothstep(0.87, 0.94, abs(p.y) + w * 0.05);
    alb = mix(alb, uC4, ice);
    float det = fbm(sp * 22.0, 3);
    h = b - canyon * 0.6 + dunes * 0.02 + det * 0.08;
    alb *= 0.93 + 0.07 * det;
  } else if (uType == 1) {
    rocky = 0.0;
    float warp = fbm(vec3(p.x * 1.5, p.y * 5.0, p.z * 1.5) + sp, 4);
    float lat = p.y + warp * 0.07;
    float bands = sin(lat * uBand + fbm(sp * vec3(1.0, 6.0, 1.0), 3) * 1.3) * 0.5 + 0.5;
    float bands2 = sin(lat * uBand * 2.3 + warp * 3.0) * 0.5 + 0.5;
    alb = mix(uC1, uC2, smoothstep(0.2, 0.8, bands));
    alb = mix(alb, uC3, smoothstep(0.35, 0.85, bands2) * 0.85);
    float fine = fbm(vec3(p.x * 4.0, p.y * 18.0, p.z * 4.0) + warp * 2.0 + vec3(uTime * 0.004, 0.0, 0.0), max(oct - 1, 2)) * 0.5 + 0.5;
    alb = mix(alb, uC4, smoothstep(0.65, 0.92, fine) * 0.28);
    vec3 sc = normalize(vec3(0.6, -0.3, 0.74));
    float sd = distance(p, sc);
    float sw = fbm(p * 9.0 + sd * 6.0, 3);
    float storm = smoothstep(0.2, 0.07, sd + sw * 0.03) * uStorm;
    alb = mix(alb, uC5, storm * 0.95);
    h = fine * 0.3;
    spec = 0.04;
  } else if (uType == 2) {
    float w = fbm(sp * 1.1, 3);
    float e = fbm(sp * 1.7 + w * 0.7, oct) * 0.5 + 0.5;
    float det = fbm(sp * 16.0, 3);
    e += det * 0.025;
    float land = smoothstep(uSea, uSea + 0.012, e);
    float depth = clamp((uSea - e) * 7.0, 0.0, 1.0);
    vec3 ocean = mix(uC2, uC1, smoothstep(0.0, 0.6, depth));
    float hl = clamp((e - uSea) / (1.0 - uSea) * 2.4, 0.0, 1.0);
    float lat = abs(p.y);
    float moist = fbm(sp * 3.3 + 9.1, 3) * 0.5 + 0.5;
    vec3 landC = mix(uC3, uC4, smoothstep(0.35, 0.7, moist + hl * 0.35));
    landC = mix(landC, vec3(0.42, 0.38, 0.34), smoothstep(0.45, 0.7, hl));
    landC = mix(landC, vec3(0.95), smoothstep(0.74, 0.9, hl));
    alb = mix(ocean, landC, land);
    float ice = smoothstep(0.78, 0.88, lat + w * 0.1);
    alb = mix(alb, uC5, ice);
    spec = (1.0 - land) * (1.0 - ice);
    h = land * (hl * 0.8 + det * 0.1);
    float cityN = snoise(sp * 70.0) * 0.5 + 0.5;
    float cityM = snoise(sp * 6.0) * 0.5 + 0.5;
    float cityG = snoise(sp * 260.0) * 0.5 + 0.5;
    night = uCity * land * (1.0 - ice) * (1.0 - smoothstep(0.35, 0.6, hl)) * smoothstep(0.6, 0.8, cityN) * smoothstep(0.5, 0.72, cityM) * (0.35 + 0.65 * smoothstep(0.45, 0.75, cityG));
    if (uClouds > 0.0) {
      vec3 cp = sp * 2.2 + vec3(uTime * 0.004, 0.0, -uTime * 0.003);
      float cw = fbm(cp * 0.6, 2);
      float cl = fbm(cp + cw * 1.2, 5) * 0.5 + 0.5 + fbm(cp * 7.0, 3) * 0.07 + (nearF > 0.0 ? fbm(cp * 30.0, 3) * 0.06 * nearF : 0.0);
      float lb = 0.65 + 0.35 * abs(sin(p.y * 3.2 + cw));
      cloud = smoothstep(0.6 - uClouds * 0.22, 0.8 - uClouds * 0.2, cl * lb) * 0.95;
    }
  } else if (uType == 3) {
    float w = fbm(sp * 2.0, 3);
    float b = fbm(sp * 3.0 + w, oct) * 0.5 + 0.5;
    float cr = pow(1.0 - abs(snoise(sp * 4.0 + w * 1.5)), 28.0);
    float cr2 = pow(1.0 - abs(snoise(sp * 11.0 + w)), 34.0) * 0.7;
    alb = mix(uC1, uC2, smoothstep(0.3, 0.8, b));
    float lava = clamp(cr + cr2, 0.0, 1.0);
    lava = max(lava, smoothstep(0.27, 0.2, b));
    float pulse = 0.8 + 0.2 * sin(uTime * 1.5 + b * 30.0);
    emis = mix(uC3, uC4, lava * lava) * lava * 2.4 * pulse;
    alb *= 1.0 - lava * 0.85;
    h = b - lava * 0.4;
  } else if (uType == 4) {
    float w = fbm(sp * 1.5, 3);
    float b = fbm(sp * 2.5 + w, oct) * 0.5 + 0.5;
    float crev = pow(1.0 - abs(snoise(sp * 3.0 + w * 2.5)), 40.0);
    float crev2 = pow(1.0 - abs(snoise(sp * 9.0 + w * 3.0)), 60.0) * 0.5;
    float c = clamp(crev + crev2, 0.0, 1.0);
    float frost = fbm(sp * 12.0, 3);
    alb = mix(uC1, uC2, smoothstep(0.3, 0.75, b));
    alb = mix(alb, uC4, smoothstep(0.6, 0.3, b) * 0.45);
    alb = mix(alb, uC3, c * 0.55);
    alb *= 0.9 + 0.1 * frost;
    spec = 0.35;
    h = b + frost * 0.06 - c * 0.05;
  } else {
    float b = fbm(sp * 2.5, oct) * 0.5 + 0.5;
    float c1 = craters(sp * 5.0);
    float c2 = craters(sp * 12.0 + 3.0) * 0.6;
    alb = mix(uC1, uC2, smoothstep(0.3, 0.7, b));
    alb = mix(alb, uC3, smoothstep(0.5, 0.75, fbm(sp * 1.2, 3) * 0.5 + 0.5) * 0.6);
    float cr = c1 + c2;
    alb *= 0.85 + cr * 0.5;
    alb = max(alb, vec3(0.0));
    h = b * 0.4 + cr * 0.6;
  }
  // Detail tambahan saat dekat permukaan
  if (nearF > 0.0 && rocky > 0.5) {
    float d2 = fbm(sp * 90.0, 3);
    float d3 = snoise(sp * 320.0);
    h += (d2 * 0.02 + d3 * 0.004) * nearF;
    alb *= 1.0 + (d2 * 0.1 + d3 * 0.04) * nearF;
  }
  float farF = 1.0 - smoothstep(4.0, 24.0, length(cameraPosition - vCenter) / uRadius) * 0.85;
  vec3 Nb = perturbN(vWorldPos, N, h * uBump * uRadius * farF);
  float ndlG = dot(N, L);
  float term = smoothstep(-0.08, 0.25, ndlG);
  float diff = max(dot(Nb, L), 0.0) * term;
  // bayangan cincin
  float rs = 1.0;
  if (uHasRing > 0.5) {
    float den = dot(L, uRingN);
    if (abs(den) > 1e-4) {
      float t = dot(vCenter - vWorldPos, uRingN) / den;
      if (t > 0.0) {
        float rr = length(vWorldPos + L * t - vCenter);
        float x = (rr - uRingIn) / (uRingOut - uRingIn);
        if (x > 0.0 && x < 1.0) rs = 1.0 - ringDensity(x, uRingSeed) * 0.75;
      }
    }
  }
  diff *= rs;
  vec3 col = alb * (uSunColor * diff * 0.98 + vec3(0.014, 0.016, 0.022));
  vec3 H = normalize(L + V);
  col += uSunColor * pow(max(dot(N, H), 0.0), 80.0) * spec * term * rs * 0.9;
  if (cloud > 0.0) {
    float cd = max(dot(N, L), 0.0) * term * rs;
    col = mix(col, vec3(0.96, 0.97, 1.0) * (cd * 0.95 + 0.012), cloud);
    night *= 1.0 - cloud;
  }
  float dark = 1.0 - smoothstep(-0.15, 0.1, ndlG);
  col += vec3(1.0, 0.72, 0.38) * night * dark * 0.9;
  col += emis;
  float fr = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  col += uAtmo * fr * smoothstep(-0.3, 0.6, ndlG) * 0.22;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const ATMO_VS = /* glsl */`
varying vec3 vWorldPos; varying vec3 vCenter;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const ATMO_FS = /* glsl */`
uniform float uR; uniform float uRa; uniform vec3 uColor; uniform vec3 uSunset; uniform vec3 uSunPos; uniform float uStrength;
varying vec3 vWorldPos; varying vec3 vCenter;
vec2 raySphere(vec3 ro, vec3 rd, vec3 c, float r){
  vec3 oc = ro - c; float b = dot(oc, rd); float cc = dot(oc, oc) - r*r; float h = b*b - cc;
  if (h < 0.0) return vec2(-1.0, -1.0);
  h = sqrt(h); return vec2(-b - h, -b + h);
}
void main(){
  vec3 ro = cameraPosition; vec3 rd = normalize(vWorldPos - ro);
  vec2 ta = raySphere(ro, rd, vCenter, uRa);
  if (ta.y < 0.0) discard;
  float t0 = max(ta.x, 0.0), t1 = ta.y;
  vec2 tp = raySphere(ro, rd, vCenter, uR);
  bool hit = tp.x > 0.0;
  if (hit) t1 = min(t1, tp.x);
  float len = max(t1 - t0, 0.0);
  float dens = len / (2.0 * sqrt(uRa*uRa - uR*uR));
  vec3 mid = ro + rd * (t0 + t1) * 0.5;
  vec3 n = normalize(mid - vCenter);
  vec3 L = normalize(uSunPos - mid);
  float ndl = dot(n, L);
  float light = smoothstep(-0.35, 0.55, ndl);
  vec3 col = mix(uSunset, uColor, smoothstep(-0.1, 0.45, ndl));
  float mie = pow(max(dot(rd, L), 0.0), 10.0) * 0.6;
  float I = pow(clamp(dens, 0.0, 1.0), 1.6) * light * uStrength;
  if (hit) {
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    I *= 0.12 * rim;
  }
  col = col * I * 1.2 + uSunset * mie * dens * light;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const RING_VS = /* glsl */`
varying vec3 vWorldPos;
void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPos = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`;
export const RING_FS = /* glsl */`
uniform vec3 uCenter; uniform float uIn; uniform float uOut; uniform float uSeed; uniform float uPR; uniform float uOpacity;
uniform vec3 uColor; uniform vec3 uColor2; uniform vec3 uSunPos; uniform vec3 uRingN; uniform vec3 uSunColor;
varying vec3 vWorldPos;
${GLSL_NOISE}
void main(){
  float r = length(vWorldPos - uCenter);
  float x = (r - uIn) / (uOut - uIn);
  if (x < 0.0 || x > 1.0) discard;
  float dens = ringDensity(x, uSeed);
  float fine = hash13(vec3(floor(r * 2.5), uSeed, 1.0));
  dens *= 0.7 + 0.6 * fine;
  vec3 L = normalize(uSunPos - vWorldPos);
  vec2 hs = raySphere(vWorldPos, L, uCenter, uPR);
  float sh = (hs.y > 0.0) ? 0.05 : 1.0;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float lit = (dot(uRingN, L) * dot(uRingN, V) > 0.0) ? 1.0 : 0.45;
  vec3 col = mix(uColor2, uColor, fine) * uSunColor * (0.05 + 1.05 * sh * lit);
  gl_FragColor = vec4(col, clamp(dens * uOpacity, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SUN_VS = PLANET_VS;
export const SUN_FS = /* glsl */`
uniform float uTime; uniform float uStorm; uniform float uFlare; uniform vec3 uActive;
varying vec3 vObj; varying vec3 vWorldPos; varying vec3 vN; varying vec3 vCenter;
${GLSL_NOISE}
void main(){
  vec3 p = normalize(vObj);
  float n = fbm(p * 3.5 + vec3(0.0, uTime * 0.03, 0.0), 3);
  float g = fbm(p * 14.0 + vec3(uTime * 0.05), 2);
  float cells = 0.5 + 0.5 * n + 0.25 * g;
  vec3 col = mix(vec3(1.0, 0.36, 0.05), vec3(1.0, 0.76, 0.34), smoothstep(0.2, 0.8, cells));
  col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.75, 1.1, cells));
  float spot = smoothstep(0.64, 0.72, fbm(p * 2.0 + 11.0, 3) * 0.5 + 0.5);
  col *= 1.0 - spot * 0.5;
  // Badai Matahari (fenomena): wilayah aktif terang + bintik gelap + kilat suar. uActive = arah satuan (ruang objek),
  // nol di luar fenomena (juga di lab gerhana yang tidak mengisi uniform ini) sehingga blok ini dilewati.
  float ad = dot(p, uActive);
  if (ad > 0.85) {
    float reg = smoothstep(0.9, 0.985, ad) * uStorm;
    float umb = smoothstep(0.6, 0.78, fbm(p * 22.0 + 3.0, 2) * 0.5 + 0.5) * smoothstep(0.955, 0.985, ad);
    col *= 1.0 - umb * 0.75 * uStorm;
    col += vec3(1.0, 0.82, 0.5) * reg * (0.18 + 0.3 * g);
    col += vec3(1.0, 0.97, 0.92) * (smoothstep(0.975, 0.998, ad) * 3.0 + smoothstep(0.9, 1.0, ad) * 0.5) * uFlare;
  }
  float mu = max(dot(normalize(vN), normalize(cameraPosition - vWorldPos)), 0.0);
  col *= 0.55 + 0.45 * sqrt(mu);
  gl_FragColor = vec4(col * 2.2, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const CORONA_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const CORONA_FS = /* glsl */`
uniform float uTime; uniform float uScale; uniform float uCme; uniform float uCmeAng; uniform float uProm; uniform float uFlare;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p) * uScale;
  if (r > uScale) discard;
  float a = atan(p.y, p.x);
  float rr = max(r - 1.0, 0.0);
  float glow = exp(-rr * 1.7) * 0.9 + exp(-rr * 0.45) * 0.2;
  float rays = pow(snoise(vec3(cos(a) * 3.0, sin(a) * 3.0, uTime * 0.05)) * 0.5 + 0.5, 3.0);
  float rays2 = snoise(vec3(cos(a) * 9.0, sin(a) * 9.0, uTime * 0.08 + 5.0)) * 0.5 + 0.5;
  float cor = glow * (0.75 + 0.6 * rays + 0.25 * rays2);
  cor *= smoothstep(uScale, uScale * 0.65, r);
  vec3 col = mix(vec3(1.0, 0.42, 0.1), vec3(1.0, 0.85, 0.6), exp(-rr * 1.2)) * cor * 1.5;
  // Badai Matahari (fenomena): prominensa di tepi, kilat suar, lalu CME berbentuk kipas yang melebar sambil menjauh.
  // uCmeAng = sudut layar wilayah aktif. Semua nol di luar fenomena.
  if (uProm + uFlare + uCme > 0.0) {
    vec2 q = p * uScale;
    vec2 cd = vec2(cos(uCmeAng), sin(uCmeAng));
    float along = dot(q, cd), lat = cd.x * q.y - cd.y * q.x;
    vec2 lq = vec2(lat, along - 1.0);
    float arc = abs(length(lq) - 0.2);
    float ptex = fbm(vec3(lq * 12.0, uTime * 0.5), 2) * 0.5 + 0.5;
    float ak = arc / 0.035;
    col += vec3(1.0, 0.34, 0.12) * exp(-ak * ak) * step(0.0, lq.y) * (0.5 + 0.9 * ptex) * uProm * 1.8;
    col += vec3(1.0, 0.9, 0.75) * exp(-length(q - cd * 1.02) * 5.0) * uFlare * 1.6;
    if (uCme > 0.0 && uCme < 1.0 && along > 0.95) {
      float front = 1.05 + 3.4 * uCme;
      float width = 0.1 + 0.55 * max(0.0, along - 1.0);
      float lk = lat / width, sk = (along - front) / (0.12 + 0.3 * uCme);
      float cone = exp(-lk * lk);
      float shell = exp(-sk * sk);
      float fill = smoothstep(1.0, front, along) * step(along, front) * 0.3;
      float streaks = fbm(vec3(lat / width * 2.5, along * 2.0 - uTime * 0.4, 1.7), 3) * 0.5 + 0.5;
      float fade = pow(1.0 - uCme, 1.3) * smoothstep(0.0, 0.06, uCme);
      col += vec3(1.0, 0.86, 0.68) * cone * (shell + fill) * (0.4 + 0.9 * streaks) * fade * 1.3;
    }
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const SKY_VS = /* glsl */`
varying vec3 vDir;
void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
export const SKY_FS = /* glsl */`
varying vec3 vDir;
${GLSL_NOISE}
vec3 starField(vec3 d, float scale, float density, float bright){
  vec3 p = d * scale; vec3 id = floor(p); vec3 f = fract(p) - 0.5;
  float h = hash13(id);
  if (h > density) return vec3(0.0);
  vec3 o = (hash33(id) - 0.5) * 0.6;
  float s = smoothstep(0.5, 0.0, length(f - o));
  s *= s;
  float t = hash13(id + 13.1);
  vec3 tint = t < 0.3 ? vec3(1.0, 0.8, 0.6) : (t < 0.75 ? vec3(1.0) : vec3(0.7, 0.82, 1.0));
  return tint * s * bright * (0.3 + 0.7 * hash13(id + 4.2));
}
void main(){
  vec3 d = normalize(vDir);
  vec3 gN = normalize(vec3(0.35, 1.0, -0.2));
  float gla = dot(d, gN);
  float band = exp(-gla * gla * 14.0);
  float n1 = fbm(d * 1.6 + 2.3, 5) * 0.5 + 0.5;
  float n2 = fbm(d * 3.2 + n1 * 1.2 + 7.1, 5) * 0.5 + 0.5;
  float n3 = fbm(d * 6.5 - 3.3, 4) * 0.5 + 0.5;
  vec3 col = vec3(0.0012, 0.0016, 0.004);
  float nebA = smoothstep(0.5, 0.84, n1) * (0.55 + 0.45 * n2);
  col += mix(vec3(0.09, 0.015, 0.15), vec3(0.4, 0.07, 0.28), n2) * nebA * 0.5;
  float nebB = smoothstep(0.56, 0.88, fbm(d * 2.2 - 5.2, 5) * 0.5 + 0.5);
  col += mix(vec3(0.01, 0.07, 0.13), vec3(0.04, 0.28, 0.33), n3) * nebB * 0.42;
  col += vec3(0.19, 0.17, 0.23) * band * (0.35 + 0.65 * n2) * 0.32;
  col *= 1.0 - smoothstep(0.45, 0.75, n3) * band * 0.65;
  vec3 core = normalize(vec3(-0.8, 0.1, 0.55));
  col += vec3(0.45, 0.32, 0.22) * pow(max(dot(d, core), 0.0), 12.0) * band * 0.6;
  col += starField(d, 320.0, 0.03, 0.5);
  col += starField(d, 700.0, 0.02 + band * 0.18, 0.28) * (0.5 + band);
  gl_FragColor = vec4(col, 1.0);
}`;

export const STARS_VS = /* glsl */`
attribute float aSize; attribute vec3 aColor; attribute float aPhase;
uniform float uTime; uniform float uPR;
varying vec3 vColor;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.78 + 0.22 * sin(uTime * (0.8 + aPhase * 2.0) + aPhase * 50.0);
  vColor = aColor * tw;
  gl_PointSize = aSize * uPR;
}`;
export const STARS_FS = /* glsl */`
varying vec3 vColor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d); a *= a;
  gl_FragColor = vec4(vColor * a, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ---------- Api mesin pesawat (ships.js) ----------
   Kerucut lathe sumbu +Z; aT = 0 di nosel, 1 di ujung. uLayer 0 = inti panas, 1 = selubung lembut.
   Vertex: ujung bergoyang oleh derau + denyut radial yang merambat ke belakang.
   Fragment: derau fbm bergulir sepanjang semburan, ekor "koyak", inti putih-panas, berlian kejut saat turbo. */
export const JET_VS = /* glsl */`
attribute float aT;
uniform float uTime; uniform float uPower; uniform float uBoost; uniform float uSeed; uniform float uLayer;
varying float vT; varying float vAng; varying vec3 vN; varying vec3 vV;
float jh1(float n){ return fract(sin(n) * 43758.5453); }
float jn1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(jh1(i), jh1(i + 1.0), f) * 2.0 - 1.0; }
void main(){
  vT = aT;
  vec3 p = position;
  vAng = atan(p.y, p.x);
  float t = aT;
  float sp = uTime * (5.0 + 4.0 * uLayer + 4.0 * uBoost) + uSeed * 7.0;
  float sway = t * t * (0.5 + 0.45 * uLayer);
  p.x += jn1(t * 2.6 - sp * 0.55) * sway;
  p.y += jn1(t * 2.6 - sp * 0.55 + 17.0) * sway;
  p.xy *= 1.0 + 0.11 * sin(t * 13.0 - uTime * 36.0 + uSeed) * t;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
export const JET_FS = /* glsl */`
uniform vec3 uColor; uniform float uPower; uniform float uBoost; uniform float uTime; uniform float uSeed; uniform float uLayer;
varying float vT; varying float vAng; varying vec3 vN; varying vec3 vV;
float jhash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float jnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(jhash(i), jhash(i + vec2(1.0, 0.0)), f.x), mix(jhash(i + vec2(0.0, 1.0)), jhash(i + vec2(1.0, 1.0)), f.x), f.y); }
float jfbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * jnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
void main(){
  float t = clamp(vT, 0.0, 1.0);
  float edge = abs(dot(normalize(vN), normalize(vV)));
  vec2 ap = vec2(cos(vAng), sin(vAng));
  float spd = 8.0 + 6.0 * uLayer + 9.0 * uBoost;
  float n1 = jfbm(vec2(ap.x * 1.6 + ap.y * 1.3 + uSeed, t * (5.0 + 3.0 * uLayer) - uTime * spd));
  float n2 = jfbm(vec2(ap.y * 2.1 - ap.x + uSeed * 2.0, t * 9.0 - uTime * spd * 1.45));
  float turb = 0.5 * (n1 + n2);
  float body = pow(1.0 - t, 1.2 + 0.6 * uLayer);
  float core = pow(edge, 1.15 + 1.4 * uLayer);
  float tear = smoothstep(0.0, 0.35, (1.0 - t) * 1.25 - (turb - 0.5) * 0.95 * t);
  float a = body * core * tear * (0.5 + 1.0 * turb) * uPower;
  float diamonds = (1.0 - uLayer) * uBoost * smoothstep(0.55, 1.0, edge) * pow(max(0.0, cos(t * 31.4 - uTime * 3.0)), 6.0) * (1.0 - t);
  a += diamonds * 0.8;
  vec3 hot = vec3(1.0, 0.96, 0.88);
  vec3 col = mix(uColor, hot, pow(1.0 - t, 4.0) * (1.0 - uLayer * 0.7) * smoothstep(0.3, 1.0, edge));
  col = mix(col, uColor * vec3(1.0, 0.72, 0.66), smoothstep(0.45, 1.0, t) * 0.5);
  col *= a * mix(2.4, 0.85, uLayer);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/* ---------- Planet bertekstur (model GLB unduhan) ----------
   Tekstur warna (+ normal map) dari model, tetapi pencahayaan tetap model Matahari yang sama dengan
   PLANET_FS: terminator lembut, sisi malam gelap, bayangan cincin, dan pendar atmosfer di tepi.
   Baris `diff *= rs;` dan `gl_FragColor = vec4(col, a);` dipakai sebagai titik sisip shader lab gerhana. */
export const TPLANET_VS = /* glsl */`
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vN;
void main(){
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vN = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
export const TPLANET_FS = /* glsl */`
uniform sampler2D uMap; uniform mat3 uMapM; uniform vec3 uTint; uniform float uOpacity; uniform float uCloud;
uniform sampler2D uNormalMap; uniform float uHasNormal; uniform vec2 uNormalScale;
uniform vec3 uSunPos; uniform vec3 uSunColor; uniform vec3 uAtmo; uniform vec3 uCenter;
uniform float uHasRing; uniform float uRingIn; uniform float uRingOut; uniform vec3 uRingN; uniform float uRingSeed;
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vN;
${GLSL_NOISE}
vec3 perturbMap(vec3 pos, vec3 n, vec3 mapN, vec2 uv){
  vec3 q0 = dFdx(pos), q1 = dFdy(pos);
  vec2 st0 = dFdx(uv), st1 = dFdy(uv);
  vec3 q1p = cross(q1, n), q0p = cross(n, q0);
  vec3 T = q1p * st0.x + q0p * st1.x, B = q1p * st0.y + q0p * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float s = det == 0.0 ? 0.0 : inversesqrt(det);
  return normalize(T * (mapN.x * s) + B * (mapN.y * s) + n * mapN.z);
}
void main(){
  vec2 uv = (uMapM * vec3(vUv, 1.0)).xy;
  vec4 tex = texture2D(uMap, uv);
  vec3 alb = tex.rgb * uTint;
  vec3 Ng = normalize(vWorldPos - uCenter);
  vec3 N = normalize(vN);
  if (uHasNormal > 0.5) {
    vec3 mapN = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0; mapN.xy *= uNormalScale;
    N = perturbMap(vWorldPos, N, mapN, uv);
  }
  vec3 L = normalize(uSunPos - vWorldPos);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndlG = dot(Ng, L);
  float term = smoothstep(-0.08, 0.25, ndlG);
  float diff = max(dot(N, L), 0.0) * term;
  float rs = 1.0;
  if (uHasRing > 0.5) {
    float den = dot(L, uRingN);
    if (abs(den) > 1e-4) {
      float t = dot(uCenter - vWorldPos, uRingN) / den;
      if (t > 0.0) {
        float rr = length(vWorldPos + L * t - uCenter);
        float x = (rr - uRingIn) / (uRingOut - uRingIn);
        if (x > 0.0 && x < 1.0) rs = 1.0 - ringDensity(x, uRingSeed) * 0.75;
      }
    }
  }
  diff *= rs;
  vec3 col = alb * (uSunColor * diff * 0.98 + vec3(0.015, 0.017, 0.024));
  float fr = pow(1.0 - max(dot(Ng, V), 0.0), 4.0);
  col += uAtmo * fr * smoothstep(-0.3, 0.6, ndlG) * 0.22;
  float a = uCloud > 0.5 ? tex.a * uOpacity : 1.0;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// Cincin bertekstur dari model: warna/alfa dari tekstur, bayangan planet & sisi gelap seperti RING_FS.
export const TRING_FS = /* glsl */`
uniform sampler2D uMap; uniform mat3 uMapM; uniform vec3 uTint; uniform float uOpacity; uniform float uAlphaTest;
uniform vec3 uCenter; uniform float uPR; uniform vec3 uSunPos; uniform vec3 uRingN; uniform vec3 uSunColor;
varying vec2 vUv; varying vec3 vWorldPos; varying vec3 vN;
${GLSL_NOISE}
void main(){
  vec4 tex = texture2D(uMap, (uMapM * vec3(vUv, 1.0)).xy);
  float a = tex.a * uOpacity;
  if (a < uAlphaTest) discard;
  vec3 L = normalize(uSunPos - vWorldPos);
  vec2 hs = raySphere(vWorldPos, L, uCenter, uPR);
  float sh = (hs.y > 0.0) ? 0.05 : 1.0;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float lit = (dot(uRingN, L) * dot(uRingN, V) > 0.0) ? 1.0 : 0.45;
  vec3 col = tex.rgb * uTint * uSunColor * (0.05 + 1.05 * sh * lit);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

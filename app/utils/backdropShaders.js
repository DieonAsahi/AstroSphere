// Shader latar hidup layar awal (WebGL 1, tanpa Three.js). Satu segitiga layar penuh per adegan.
// Semua adegan memakai "koordinat gambar" 1920×1080 yang sama dengan gambar statis di public/img,
// jadi frame pertama WebGL menimpa gambar statis tanpa lompatan. Padanan JS-nya ada di scripts/render-backdrops.mjs.
//   earth : Bumi berputar (tekstur pita lintang ±62°), hanya cakram Bumi — langit tetap dari gambar statis.
//   sun   : Matahari dengan granulasi bergerak, bintik, kromosfer, prominensa, dan korona.
//   hole  : lubang hitam Schwarzschild (lintasan cahaya ditekuk) dengan piringan akresi yang berputar.

export const VERT = `attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const HEAD = `
precision highp float;
uniform vec2 uRes;   // ukuran kanvas (px perangkat)
uniform vec3 uMap;   // s, offX, offY  → koordinat gambar = (fragAtas − off) / s
uniform float uTime;
vec2 imgCoord(){ return (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uMap.yz) / uMap.x; }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 toneExp(vec3 c){ return pow(1.0 - exp(-max(c, vec3(0.0))), vec3(1.0 / 2.2)); }
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float stars(vec2 p){
  vec2 g = p / 1080.0 * 200.0; vec2 i = floor(g);
  if (hash12(i) > 0.05) return 0.0;
  vec2 dd = g - (i + 0.2 + 0.6 * hash22(i + 7.7));
  return (pow(hash12(i + 3.1), 5.0) * 1.3 + 0.1) * exp(-dot(dd, dd) * 60.0);
}
`;

const NOISE = `
uniform sampler2D uNoise;
float n3(vec3 x){
  vec3 p = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  vec2 uv = p.xy + vec2(37.0, 17.0) * p.z + f.xy;
  vec2 rg = texture2D(uNoise, (uv + 0.5) / 256.0).rg;
  return mix(rg.x, rg.y, f.z);
}
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 3; i++) { s += a * n3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s / 0.875; }
`;

/* ---------- Bumi: cakrawala dari orbit rendah, Indonesia di tengah, berputar perlahan ---------- */
export const EARTH_FS = (deriv) => `${deriv ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV 1\n' : ''}${HEAD}
uniform sampler2D uTex;  // pita lintang, utara di atas
uniform vec2 uLat;       // (lintang atas, lintang bawah) dalam radian
uniform float uRot;      // putaran (radian)
void main(){
  vec2 p = imgCoord();
  float nx = (p.x - 960.0) / 1500.0, ny = (2120.0 - p.y) / 1500.0, rr = nx * nx + ny * ny;
  if (rr >= 1.0) { gl_FragColor = vec4(0.0); return; }
  float nz = sqrt(1.0 - rr); vec3 n = vec3(nx, ny, nz);
  vec3 L = normalize(vec3(0.62, 0.55, 0.38));
  float k = 1140.0 / 1500.0;
  vec3 V0 = vec3(0.0, k, sqrt(1.0 - k * k));
  vec3 right = vec3(1.0, 0.0, 0.0), up = cross(V0, right);
  const float la0 = -0.05235988, lo0 = 2.0245819;
  vec3 P0 = vec3(cos(la0) * cos(lo0), sin(la0), -cos(la0) * sin(lo0));
  vec3 N0 = vec3(-sin(la0) * cos(lo0), cos(la0), sin(la0) * sin(lo0));
  vec3 E0 = vec3(-sin(lo0), 0.0, -cos(lo0));
  vec3 q = dot(n, V0) * P0 + dot(n, up) * N0 + dot(n, right) * E0;
  float lat = asin(clamp(q.y, -1.0, 1.0)), lon = atan(-q.z, q.x) - uRot;
  vec2 uv = vec2(lon / 6.2831853 + 0.5, (uLat.x - lat) / (uLat.x - uLat.y));
#ifdef HAS_DERIV
  float u1 = fract(uv.x), u2 = fract(uv.x + 0.5) - 0.5;
  uv.x = fwidth(u1) <= fwidth(u2) + 1e-5 ? u1 : u2;
#endif
  vec3 t = pow(texture2D(uTex, uv).rgb, vec3(2.2));
  float ndl = dot(n, L), day = smoothstep(-0.12, 0.35, ndl);
  float ocean = clamp((t.b - max(t.r, t.g) * 0.9) * 4.0, 0.0, 1.0) * (1.0 - clamp((t.r + t.g + t.b) / 3.0 - 0.6, 0.0, 1.0) * 3.0);
  vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(0.0, dot(n, Hh)), 70.0) * ocean * 1.4 * day;
  float fres = pow(1.0 - nz, 3.0);
  vec3 c = t * (vec3(0.03, 0.035, 0.06) + 1.05 * day * max(0.0, ndl * 0.7 + 0.3));
  float haze = fres * (0.25 + 0.75 * day), dusk = exp(-(ndl - 0.02) * (ndl - 0.02) * 60.0) * 0.25;
  c = c * (1.0 - haze * 0.6) + haze * vec3(0.25, 0.55, 1.1) + dusk * vec3(0.9, 0.45, 0.2) + spec * vec3(0.9, 0.9, 0.85);
  float edge = 1.0 - smoothstep(0.996, 1.0, sqrt(rr));
  gl_FragColor = vec4(pow(aces(c), vec3(1.0 / 2.2)) * edge, edge);
}`;

/* ---------- Matahari: piringan besar menyilang dari kanan-bawah ---------- */
export const SUN_FS = `${HEAD}${NOISE}
uniform vec2 uC;     // pusat Matahari (koordinat gambar)
uniform float uR;    // jari-jari (px gambar)
// x = jarak sel terdekat, y = sel kedua, z = acak milik sel terdekat (variasi terang tiap butir)
vec3 worley(vec2 x, float t){
  vec2 i = floor(x), f = fract(x); float d1 = 8.0, d2 = 8.0, h1 = 0.0;
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) {
    vec2 g = vec2(float(a), float(b)), hh = hash22(i + g);
    vec2 o = 0.5 + 0.38 * sin(t + 6.2831853 * hh);
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; h1 = hh.x; } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2), h1);
}
float spot(vec2 q, vec2 c, float r, float clat){ return length((q - c) * vec2(clat, 1.0)) / r; }
vec3 surface(vec2 d, float rad){
  float mu = sqrt(max(0.0, 1.0 - rad * rad));
  float lat = asin(clamp(d.y, -1.0, 1.0)), lon = atan(d.x, max(mu, 1e-4)) + uTime * 0.002;
  vec2 q = vec2(lon, lat); float clat = cos(lat);
  vec3 w = worley(q * vec2(44.0 * clat, 44.0), uTime * 0.35);
  float gran = smoothstep(0.0, 0.5, w.y - w.x) * (0.7 + 0.3 * w.z);
  float warp = fbm3(vec3(q * 4.0, 1.0 + uTime * 0.008));
  float meso = fbm3(vec3(q * 10.0 + warp * 1.6, uTime * 0.012));
  float s1 = spot(q, vec2(-0.367, 0.582), 0.034, clat), s2 = spot(q, vec2(-0.30, 0.565), 0.017, clat);
  float um = max(1.0 - smoothstep(0.35, 0.55, s1), 1.0 - smoothstep(0.35, 0.55, s2));
  float pe = max(1.0 - smoothstep(0.85, 1.12, s1), 1.0 - smoothstep(0.85, 1.12, s2));
  float fac = smoothstep(0.52, 0.72, meso) * pow(1.0 - mu, 1.4) * 0.5;
  vec3 base = mix(vec3(0.42, 0.075, 0.01), vec3(1.5, 0.48, 0.07), pow(mu, 0.7)) * (0.68 + 0.56 * mu);
  float I = (0.9 + 0.16 * gran) * (0.62 + 0.7 * meso) + fac;
  I *= (1.0 - 0.5 * pe) * (1.0 - 0.85 * um);
  return base * I;
}
float prom(vec2 d, float a0, float sz){
  vec2 foot = vec2(cos(a0), sin(a0)), tang = vec2(-foot.y, foot.x);
  vec2 rel = d - foot;
  vec2 q = vec2(dot(rel, tang), dot(rel, foot)) / sz;
  if (q.y < -0.3 || q.y > 1.8 || abs(q.x) > 1.9) return 0.0;
  q += (vec2(n3(vec3(q * 3.0, uTime * 0.08)), n3(vec3(q * 3.0 + 7.0, uTime * 0.08))) - 0.5) * 0.35;
  float arch = abs(length(q - vec2(0.0, -0.25)) - 0.95);
  float dens = exp(-arch * arch / 0.012) * smoothstep(-0.05, 0.12, q.y);
  float fil = 0.55 + 0.45 * n3(vec3(atan(q.y + 0.25, q.x) * 9.0, length(q) * 22.0, uTime * 0.25));
  return dens * fil;
}
vec3 outer(vec2 d, float rad){
  float h = rad - 1.0, ang = atan(d.y, d.x);
  float streak = 0.55 + 0.45 * fbm3(vec3(cos(ang) * 3.0 + 10.0, sin(ang) * 3.0, h * 0.6 - uTime * 0.015));
  float cor = exp(-h * 18.0) * 0.7 + exp(-h * 6.0) * 0.22 * streak + exp(-h * 2.2) * 0.025;
  vec3 col = cor * vec3(1.0, 0.36, 0.07);
  float chH = 0.006 + 0.010 * n3(vec3(ang * 260.0, h * 40.0, uTime * 0.6));
  col += (1.0 - smoothstep(chH * 0.6, chH, h)) * vec3(1.3, 0.28, 0.06);
  float pr = prom(d, 1.2566, 0.10) + prom(d, 1.7104, 0.16) * 1.2 + prom(d, 2.2340, 0.12) + prom(d, 2.7576, 0.13) * 0.9;
  return col + pr * vec3(2.2, 0.45, 0.08);
}
void main(){
  vec2 p = imgCoord();
  vec2 d = (p - uC) / uR; d.y = -d.y;
  float rad = length(d), e = 1.5 / (uMap.x * uR);
  vec3 col = vec3(0.002, 0.0015, 0.005) + vec3(1.0, 0.95, 0.9) * stars(p) * smoothstep(1.9, 3.2, rad);
  if (rad < 1.0 - e) col += surface(d, rad);
  else if (rad > 1.0 + e) col += outer(d, rad);
  else {
    vec2 dn = d / rad;
    col += mix(surface(dn * (1.0 - e), 1.0 - e), outer(dn * (1.0 + e), 1.0 + e), smoothstep(1.0 - e, 1.0 + e, rad));
  }
  gl_FragColor = vec4(toneExp(col), 1.0);
}`;

/* ---------- Lubang hitam: geodesik Schwarzschild (r_s = 1), kamera sedikit di atas bidang piringan ---------- */
export const HOLE_FS = `${HEAD}${NOISE}
uniform vec2 uC;      // pusat bayangan (koordinat gambar)
uniform float uS;     // jari-jari bayangan (px gambar)
uniform float uROut;  // tepi luar piringan
const float RIN = 2.9;
vec3 disk(vec2 hp, float hr, vec3 v, out float a){
  float ang = atan(hp.y, hp.x);
  float tw = ang + 4.2 / sqrt(hr) - uTime * 0.12;
  vec2 cs = vec2(cos(tw), sin(tw));
  float n1 = fbm(vec3(cs * 2.2 + vec2(hr * 0.9, 0.0), hr * 0.35));
  float n2 = fbm3(vec3(cs * 6.0 + vec2(hr * 3.1, 0.0), hr * 1.7 + 4.0));
  float bands = 0.62 + 0.38 * sin(hr * 4.1 + n1 * 9.0 + n2 * 5.0) * (0.4 + 0.6 * n2);
  float temp = pow(RIN / hr, 0.9);
  vec3 vd = normalize(vec3(-hp.y, 0.0, hp.x));
  float beam = pow(clamp(1.0 + 0.6 * dot(vd, -normalize(v)), 0.2, 2.0), 3.0);
  float fade = smoothstep(RIN, RIN + 0.5, hr) * (1.0 - smoothstep(uROut - 4.5, uROut, hr));
  float I = (0.3 + n1 * 0.9) * bands * temp * beam * fade * 0.85;
  a = clamp(fade * (0.35 + n1 * 0.75) * (0.6 + 0.4 * temp), 0.0, 0.96);
  return I * mix(vec3(1.1, 0.26, 0.012), vec3(1.7, 0.75, 0.16), temp * temp);
}
void main(){
  vec2 p = imgCoord();
  const float D = 26.0, inc = 0.15708;
  vec3 cam = vec3(0.0, sin(inc) * D, -cos(inc) * D);
  vec3 fwd = normalize(-cam);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd)), up = cross(fwd, right);
  vec2 sc = vec2(p.x - uC.x, uC.y - p.y) / uS * 0.1004;
  vec3 v = normalize(fwd + right * sc.x + up * sc.y);
  vec3 pos = cam;
  float RS = uROut + 2.0;
  vec3 col = vec3(0.0); float alpha = 1.0; float captured = 0.0;
  float bq = dot(pos, v), cq = dot(pos, pos) - RS * RS, disc = bq * bq - cq;
  if (disc > 0.0) {
    pos += v * max(-bq - sqrt(disc), 0.0);
    vec3 hv = cross(pos, v); float h2 = dot(hv, hv);
    for (int i = 0; i < 160; i++) {
      float r = length(pos);
      if (r < 1.0) { captured = 1.0; break; }
      if (r > RS + 0.5 && dot(pos, v) > 0.0) break;
      float dt = clamp(0.07 * r, 0.03, 0.45) * (r > 6.0 ? 1.0 : 0.6);
      float r2 = r * r;
      v -= 1.5 * h2 * pos / (r2 * r2 * r) * dt;
      vec3 np = pos + v * dt;
      if ((pos.y > 0.0) != (np.y > 0.0)) {
        vec2 hp = mix(pos.xz, np.xz, pos.y / (pos.y - np.y));
        float hr = length(hp);
        if (hr > RIN && hr < uROut) { float a; vec3 c = disk(hp, hr, v, a); col += alpha * a * c; alpha *= 1.0 - a; }
      }
      pos = np;
      if (alpha < 0.02) break;
    }
  }
  if (captured < 0.5) col += alpha * (vec3(0.0015, 0.0015, 0.005) + vec3(0.95, 0.95, 1.0) * stars(p) * 0.8);
  gl_FragColor = vec4(toneExp(col), 1.0);
}`;

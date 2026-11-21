// Tekstur derau 256×256 (RGBA8) untuk latar hidup di layar awal.
// R = derau acak per texel, G = R yang digeser (+37, +17): derau 3D cukup dengan satu pembacaan tekstur
// (trik "irisan-z": irisan z+1 = irisan z digeser). B/A = derau kedua yang bebas (cadangan).
// Dipakai juga oleh scripts/render-backdrops.mjs agar gambar statis cocok dengan versi WebGL.
export const NOISE_SIZE = 256;

export function noiseRGBA(seed = 20251121) {
  const N = NOISE_SIZE, d = new Uint8Array(N * N * 4);
  let s = seed >>> 0;
  const rnd = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < N * N; i++) { d[i * 4] = (rnd() * 256) | 0; d[i * 4 + 2] = (rnd() * 256) | 0; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const o = (y * N + x) * 4, src = (((y + 17) & (N - 1)) * N + ((x + 37) & (N - 1))) * 4;
    d[o + 1] = d[src]; d[o + 3] = d[src + 2];
  }
  return d;
}

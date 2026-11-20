// Pemuat model 3D GLB (hasil scripts/optimize-models.mjs di public/models): kompresi meshopt + tekstur WebP.
// Model gagal dimuat → dicatat di `failed`, dan game memakai planet/pesawat prosedural sebagai cadangan.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SHIP_IDS } from '../data/ships.js';

export const PLANET_MODEL_IDS = ['merkurius', 'venus', 'bumi', 'bulan', 'mars', 'jupiter', 'saturnus', 'uranus', 'neptunus'];
export const DECOR_MODEL_IDS = ['black_hole']; // lubang hitam adegan pembuka (di luar tata surya)

export async function loadModels(onProgress = () => {}) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const jobs = [...PLANET_MODEL_IDS.map((id) => ['planets', id]), ...SHIP_IDS.map((id) => ['ships', id]), ...DECOR_MODEL_IDS.map((id) => ['decor', id])];
  const out = { planets: {}, ships: {}, decor: {}, failed: [] };
  const frac = jobs.map(() => 0);
  let done = 0;
  const report = () => onProgress(frac.reduce((a, b) => a + b, 0) / jobs.length, done, jobs.length);
  await Promise.all(jobs.map(([kind, id], i) => new Promise((resolve) => {
    const finish = () => { frac[i] = 1; done++; report(); resolve(); };
    loader.load(`/models/${kind}/${id}.glb`,
      (gltf) => {
        // akar node berisi extras (kind, id, ringInner/Outer, size) → userData
        const root = gltf.scene.children.length === 1 ? gltf.scene.children[0] : gltf.scene;
        root.updateMatrixWorld(true);
        out[kind][id] = root;
        finish();
      },
      (e) => { if (e.total) { frac[i] = Math.min(.99, e.loaded / e.total); report(); } },
      (err) => { console.warn(`[AstroSphere] Model ${kind}/${id} gagal dimuat — memakai versi prosedural.`, err); out.failed.push(`${kind}/${id}`); finish(); });
  })));
  return out;
}

// Peran sebuah mesh (extras.role dari skrip optimasi). Primitive ganda → Mesh anak dari Group bernode → cek induk.
export function roleOf(o) { return o.userData.role || o.parent?.userData.role || ''; }

let WHITE = null;
export function whiteTexture() {
  if (!WHITE) { WHITE = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); WHITE.colorSpace = THREE.SRGBColorSpace; WHITE.needsUpdate = true; }
  return WHITE;
}
export function texMatrix(tex) {
  if (!tex) return new THREE.Matrix3();
  if (tex.matrixAutoUpdate) tex.updateMatrix();
  return tex.matrix;
}

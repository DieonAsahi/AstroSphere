// Pemuat model 3D GLB (hasil scripts/optimize-models.mjs di public/models): kompresi meshopt + tekstur WebP.
// Model gagal dimuat → dicatat di `failed`, dan game memakai planet/pesawat prosedural sebagai cadangan.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { SHIP_IDS } from '../data/ships.js';

export const ALL_PLANET_IDS = ['bumi', 'bulan', 'merkurius', 'venus', 'mars', 'jupiter', 'saturnus', 'uranus', 'neptunus'];
export const CORE_PLANET_IDS = ALL_PLANET_IDS;
export const REMAINING_PLANET_IDS = [];
export const PLANET_MODEL_IDS = ALL_PLANET_IDS;
export const DECOR_MODEL_IDS = ['black_hole']; // lubang hitam di langit (di luar tata surya), dimuat belakangan

let loader = null;
function getLoader() {
  if (!loader) {
    loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}
const modelCache = new Map();
const pendingLoads = new Map();

function loadCachedModel(kind, id, onProgress) {
  const key = `${kind}/${id}`;
  if (modelCache.has(key)) {
    onProgress?.(1);
    return Promise.resolve(modelCache.get(key));
  }
  if (pendingLoads.has(key)) {
    return pendingLoads.get(key).then((root) => {
      onProgress?.(1);
      return root;
    });
  }
  const job = new Promise((resolve) => {
    getLoader().load(
      `/models/${kind}/${id}.glb`,
      (gltf) => {
        const root = gltf.scene.children.length === 1 ? gltf.scene.children[0] : gltf.scene;
        root.updateMatrixWorld(true);
        modelCache.set(key, root);
        pendingLoads.delete(key);
        onProgress?.(1);
        resolve(root);
      },
      (e) => {
        if (e.total && onProgress) onProgress(Math.min(.99, e.loaded / e.total));
      },
      (err) => {
        console.warn(`[AstroSphere] Model ${key} gagal dimuat — memakai versi prosedural.`, err);
        pendingLoads.delete(key);
        onProgress?.(1);
        resolve(null);
      }
    );
  });
  pendingLoads.set(key, job);
  return job;
}

/**
 * Muat satu model GLB spesifik (planet atau kapal) dengan cache memori.
 */
export function loadSingleModel(kind, id) {
  return loadCachedModel(kind, id);
}

/**
 * Pemuatan model inti: Bumi, Bulan, dan seluruh pesawat aktif secara paralel di awal permainan.
 */
export async function loadCoreModels(shipInput = SHIP_IDS, onProgress = () => {}) {
  const list = Array.isArray(shipInput) ? shipInput : [shipInput];
  const shipIds = [...new Set([...SHIP_IDS, ...list.filter((id) => SHIP_IDS.includes(id))])];
  const jobs = [
    ...ALL_PLANET_IDS.map((id) => ['planets', id]),
    ...shipIds.map((id) => ['ships', id]),
  ];
  const out = { planets: {}, ships: {}, decor: {}, failed: [] };
  const frac = jobs.map(() => 0);
  let done = 0;
  const report = () => onProgress(frac.reduce((a, b) => a + b, 0) / jobs.length, done, jobs.length);

  await Promise.all(jobs.map(async ([kind, id], i) => {
    const root = await loadCachedModel(kind, id, (f) => {
      frac[i] = f;
      report();
    });
    if (root) out[kind][id] = root;
    else out.failed.push(`${kind}/${id}`);
    frac[i] = 1;
    done++;
    report();
  }));

  return out;
}

/**
 * Kompatibilitas fungsi pemuatan bawaan (mengunduh model inti & seluruh pesawat).
 */
export async function loadModels(onProgress = () => {}) {
  return loadCoreModels(SHIP_IDS, onProgress);
}

// Dekorasi (mis. lubang hitam) dimuat setelah permainan berjalan agar layar awal tetap ringan.
export function loadDecor(id) {
  const loader = getLoader();
  return new Promise((resolve) => loader.load(`/models/decor/${id}.glb`,
    (gltf) => { const root = gltf.scene.children.length === 1 ? gltf.scene.children[0] : gltf.scene; root.updateMatrixWorld(true); resolve(root); },
    undefined, (err) => { console.warn(`[AstroSphere] Dekorasi ${id} gagal dimuat.`, err); resolve(null); }));
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

// Model latar layar Masuk/Daftar → public/models/decor/ (dipanggil: node scripts/optimize-backdrops.mjs)
//  - sun.glb              ← "3D Planet/sun.glb" (inti + selubung plasma). Animasi bawaan dibuang (rotasi diatur di kode),
//                           tekstur → WebP 1024 px, kompresi meshopt.
//  - galaxy_collision.glb ← "3D Planet/galaxy_collision_1-_milky_way_x.glb" (awan 30.000 bintang + 44 morph target
//                           tabrakan Bima Sakti × Andromeda). Bintang dijarangkan, posisi dikuantisasi 16-bit,
//                           kompresi meshopt → dari ±16 MB menjadi ±1–2 MB. Animasi bobot morph dipertahankan.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress, meshopt, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'models', 'decor');
const STAR_KEEP = Number(process.env.STAR_KEEP || 12000);
const TARGET_STEP = 2;

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});

async function sun() {
  const doc = await io.read(path.join(ROOT, '3D Planet/sun.glb'));
  const root = doc.getRoot();
  for (const a of root.listAnimations()) a.dispose();
  // penanda peran untuk kode: inti & selubung
  for (const n of root.listNodes()) {
    if (/^UnstableStarCore$/.test(n.getName())) n.setExtras({ role: 'core' });
    if (/^UnstableStarref$/.test(n.getName())) n.setExtras({ role: 'shell' });
  }
  for (const m of root.listMaterials()) m.setExtensions?.(); // material diganti shader di kode
  await doc.transform(
    prune(), dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 84 }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  await io.write(path.join(OUT, 'sun.glb'), doc);
}

async function galaxy() {
  const doc = await io.read(path.join(ROOT, '3D Planet/galaxy_collision_1-_milky_way_x.glb'));
  const root = doc.getRoot();
  const mesh = root.listMeshes()[0], prim = mesh.listPrimitives()[0];
  const pos = prim.getAttribute('POSITION'), col = prim.getAttribute('COLOR_0');
  const N = pos.getCount();
  // penjarangan merata (deterministik) agar bentuk kedua galaksi tetap utuh
  const step = N / Math.min(N, STAR_KEEP), keep = [];
  for (let f = 0; f < N; f += step) keep.push(Math.floor(f));
  const pick = (acc) => {
    const n = acc.getElementSize(), src = acc.getArray(), Out = src.constructor, out = new Out(keep.length * n);
    keep.forEach((k, i) => { for (let c = 0; c < n; c++) out[i * n + c] = src[k * n + c]; });
    acc.setArray(out);
  };
  pick(pos); if (col) pick(col);
  // Animasi bawaan: kunci k (k ≥ 1) = morph target k−1 berbobot 1 (berurutan, interpolasi linear).
  // Ambil setiap target ke-TARGET_STEP saja lalu susun ulang kunci animasinya → gerak tetap mulus, data jauh lebih kecil.
  const targets = prim.listTargets();
  const anim = root.listAnimations()[0], samp = anim.listSamplers()[0];
  const times = samp.getInput().getArray();
  const keepT = [];
  for (let i = targets.length - 1; i >= 0; i -= TARGET_STEP) keepT.unshift(i); // selalu simpan target terakhir (galaksi menyatu)
  targets.forEach((t, i) => { if (!keepT.includes(i)) { prim.removeTarget(t); t.dispose(); } });
  const K = keepT.length;
  const inT = new Float32Array(K + 1), outW = new Float32Array((K + 1) * K);
  keepT.forEach((ti, j) => { inT[j + 1] = times[ti + 1]; outW[(j + 1) * K + j] = 1; });
  samp.getInput().setArray(inT); samp.getOutput().setArray(outW);
  mesh.setWeights(new Array(K).fill(0));
  for (const t of prim.listTargets()) for (const sem of t.listSemantics()) pick(t.getAttribute(sem));
  await doc.transform(
    prune(), dedup(),
    quantize({ quantizePosition: 16, quantizeColor: 8 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(path.join(OUT, 'galaxy_collision.glb'), doc);
  console.log(`galaxy: ${N} → ${keep.length} bintang, ${targets.length} → ${prim.listTargets().length} morph target`);
}

await sun();
await galaxy();
console.log('selesai');

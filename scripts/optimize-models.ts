import * as fs from 'fs';
import * as path from 'path';
import { Document, NodeIO } from '@gltf-transform/core';
import { dedup, prune, resample, weld } from '@gltf-transform/functions';

const RAW_MODELS_DIR = path.resolve(process.cwd(), 'raw-assets/models');
const OUTPUT_MODELS_DIR = path.resolve(process.cwd(), 'public/assets/models');

/**
 * Memastikan direktori output model tersedia
 */
export function ensureModelDirs(): void {
  if (!fs.existsSync(OUTPUT_MODELS_DIR)) {
    fs.mkdirSync(OUTPUT_MODELS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RAW_MODELS_DIR)) {
    fs.mkdirSync(RAW_MODELS_DIR, { recursive: true });
  }
}

/**
 * Optimasi berkas model 3D glTF/GLB menggunakan gltf-transform
 */
export async function optimizeGltfModel(
  inputPath: string,
  outputPath: string,
): Promise<{ originalSizeKb: number; optimizedSizeKb: number }> {
  const io = new NodeIO();

  const originalStat = fs.statSync(inputPath);
  const originalSizeKb = Math.round(originalStat.size / 1024);

  // Baca dokumen glTF/GLB
  const document = await io.read(inputPath);

  // Terapkan alur transformasi pengoptimalan:
  // 1. prune: hapus node, tekstur, atau material yang tidak terpakai
  // 2. dedup: hilangkan duplikasi accessor, buffer view, dan material
  // 3. resample: kurangi keyframe animasi berlebih
  // 4. weld: gabungkan vertex ganda dengan toleransi mikro untuk efisiensi render
  await document.transform(
    prune(),
    dedup(),
    resample(),
    weld({ tolerance: 0.0001 }),
  );

  // Tulis kembali model GLB biner teroptimasi
  await io.write(outputPath, document);

  const optimizedStat = fs.statSync(outputPath);
  const optimizedSizeKb = Math.round(optimizedStat.size / 1024);

  return {
    originalSizeKb,
    optimizedSizeKb,
  };
}

/**
 * Menghasilkan model baseline GLB sederhana (probes/satelit mini) bila belum ada model mentah
 */
export async function generateBaselineGlb(
  outputPath: string,
  name: string,
): Promise<void> {
  const io = new NodeIO();
  const document = new Document();
  const buffer = document.createBuffer();
  const scene = document.createScene(name);

  // Buat mesh tetrahedral/piramida sederhana untuk penanda wahana/POI
  const positionAccessor = document
    .createAccessor()
    .setType('VEC3')
    .setArray(
      new Float32Array([
        0,
        1,
        0, // puncak
        -1,
        -1,
        1, // kiri depan
        1,
        -1,
        1, // kanan depan
        0,
        -1,
        -1, // belakang
      ]),
    )
    .setBuffer(buffer);

  const indicesAccessor = document
    .createAccessor()
    .setType('SCALAR')
    .setArray(
      new Uint16Array([
        0,
        1,
        2, // sisi depan
        0,
        2,
        3, // sisi kanan
        0,
        3,
        1, // sisi kiri
        1,
        3,
        2, // dasar
      ]),
    )
    .setBuffer(buffer);

  const material = document
    .createMaterial(name)
    .setBaseColorFactor([0.8, 0.4, 0.1, 1.0])
    .setMetallicFactor(0.8)
    .setRoughnessFactor(0.3);

  const primitive = document
    .createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setIndices(indicesAccessor)
    .setMaterial(material);

  const mesh = document.createMesh(name).addPrimitive(primitive);
  const node = document.createNode(name).setMesh(mesh);
  scene.addChild(node);

  await io.write(outputPath, document);
}

/**
 * Alur utama eksekusi optimasi model
 */
export async function runModelOptimization(): Promise<void> {
  console.log('🚀 [AstroSphere] Memulai alur optimasi model 3D glTF/GLB...');
  ensureModelDirs();

  // Buat sample model satelit jika belum ada berkas di raw
  const sampleProbeRaw = path.join(RAW_MODELS_DIR, 'voyager_probe_raw.glb');
  if (!fs.existsSync(sampleProbeRaw)) {
    console.log('📦 Membuat model wahana dasar sebagai sampel pengujian...');
    await generateBaselineGlb(sampleProbeRaw, 'VoyagerProbe');
  }

  const modelFiles = fs
    .readdirSync(RAW_MODELS_DIR)
    .filter((f) => /\.(glb|gltf)$/i.test(f));

  for (const file of modelFiles) {
    const slug = path.basename(file, path.extname(file)).replace(/_raw$/, '');
    const inputPath = path.join(RAW_MODELS_DIR, file);
    const outputPath = path.join(OUTPUT_MODELS_DIR, `${slug}.glb`);

    console.log(`\n🛸 Mengoptimasi model: ${file} -> ${slug}.glb`);
    const { originalSizeKb, optimizedSizeKb } = await optimizeGltfModel(
      inputPath,
      outputPath,
    );
    console.log(
      `   Ukuran asli: ${originalSizeKb} KB -> Teroptimasi: ${optimizedSizeKb} KB`,
    );
  }

  console.log(
    '\n✅ [AstroSphere] Optimasi model selesai! Berkas siap di public/assets/models/',
  );
}

// Jalankan langsung alur optimasi
runModelOptimization().catch((err) => {
  console.error('❌ Gagal menjalankan optimasi model:', err);
  process.exit(1);
});

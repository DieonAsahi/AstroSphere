import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export interface TextureTierConfig {
  tier: 'high' | 'mid' | 'low';
  width: number;
  height: number;
  quality: number;
}

export const TEXTURE_TIERS: TextureTierConfig[] = [
  { tier: 'high', width: 4096, height: 2048, quality: 85 },
  { tier: 'mid', width: 2048, height: 1024, quality: 80 },
  { tier: 'low', width: 1024, height: 512, quality: 70 },
];

const RAW_DIR = path.resolve(process.cwd(), 'raw-assets/textures');
const OUTPUT_BASE = path.resolve(process.cwd(), 'public/assets/textures');

/**
 * Memastikan direktori output untuk setiap tingkatan kualitas tersedia
 */
export function ensureOutputDirs(): void {
  for (const { tier } of TEXTURE_TIERS) {
    const dir = path.join(OUTPUT_BASE, tier);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Mengompresi satu berkas gambar equirectangular menjadi tiga tingkatan resolusi WebP
 */
export async function optimizeSingleTexture(
  inputPath: string,
  slug: string,
): Promise<{ tier: string; path: string; sizeKb: number }[]> {
  ensureOutputDirs();
  const results = [];

  for (const tierConfig of TEXTURE_TIERS) {
    const outputFilename = `${slug}.webp`;
    const outputPath = path.join(OUTPUT_BASE, tierConfig.tier, outputFilename);

    await sharp(inputPath)
      .resize(tierConfig.width, tierConfig.height, {
        fit: 'cover',
        withoutEnlargement: false,
      })
      .webp({
        quality: tierConfig.quality,
        effort: 4,
      })
      .toFile(outputPath);

    const stat = fs.statSync(outputPath);
    const sizeKb = Math.round(stat.size / 1024);

    results.push({
      tier: tierConfig.tier,
      path: outputPath,
      sizeKb,
    });
  }

  return results;
}

/**
 * Menghasilkan tekstur equirectangular prosedural sintetis (SVG -> WebP)
 * bila berkas mentah belum disediakan secara manual.
 */
export async function generateSyntheticRawTexture(
  slug: string,
  type: 'mars' | 'jupiter' | 'earth' | 'moon' | 'generic',
): Promise<string> {
  const rawDir = RAW_DIR;
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const rawFilePath = path.join(rawDir, `${slug}_raw.png`);
  if (fs.existsSync(rawFilePath)) {
    return rawFilePath;
  }

  // Buat SVG 2:1 equirectangular dengan palet astronomi ilmiah
  let svgContent = '';
  if (type === 'mars') {
    svgContent = `
      <svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="marsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#80351f"/>
            <stop offset="25%" stop-color="#b8532f"/>
            <stop offset="50%" stop-color="#c1440e"/>
            <stop offset="75%" stop-color="#8d3016"/>
            <stop offset="100%" stop-color="#4d1b0d"/>
          </linearGradient>
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
            <feColorMatrix type="matrix" values="0.8 0 0 0 0.1  0 0.3 0 0 0.05  0 0 0.2 0 0  0 0 0 0.4 0"/>
            <feComposite in2="SourceGraphic" in="gl" operator="arithmetic" k1="0.5" k2="0.8" k3="0.2" k4="0"/>
          </filter>
        </defs>
        <rect width="2048" height="1024" fill="url(#marsGrad)"/>
        <!-- Fitur Olympus Mons di lintang 18.65, bujur 226.2 (sekitar x=1286, y=417) -->
        <circle cx="1286" cy="417" r="60" fill="#df6b3b" opacity="0.85"/>
        <circle cx="1286" cy="417" r="25" fill="#5c2010" opacity="0.9"/>
        <!-- Kawah & dataran tinggi Tharsis -->
        <ellipse cx="1400" cy="550" rx="150" ry="80" fill="#a03b1e" opacity="0.5"/>
        <ellipse cx="600" cy="400" rx="200" ry="90" fill="#6a2310" opacity="0.6"/>
      </svg>
    `;
  } else if (type === 'jupiter') {
    svgContent = `
      <svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="jupGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#8a735e"/>
            <stop offset="15%" stop-color="#b59e86"/>
            <stop offset="30%" stop-color="#6e4f3c"/>
            <stop offset="45%" stop-color="#d6be9a"/>
            <stop offset="55%" stop-color="#5a3824"/>
            <stop offset="70%" stop-color="#cca885"/>
            <stop offset="85%" stop-color="#7e5a42"/>
            <stop offset="100%" stop-color="#554438"/>
          </linearGradient>
        </defs>
        <rect width="2048" height="1024" fill="url(#jupGrad)"/>
        <!-- Badai Merah Raksasa di lintang -22, bujur 270 (sekitar x=1536, y=637) -->
        <ellipse cx="1536" cy="637" rx="90" ry="50" fill="#b93b22" opacity="0.9"/>
        <ellipse cx="1536" cy="637" rx="40" ry="20" fill="#e0694a" opacity="0.95"/>
        <!-- Pita awan garis-garis -->
        <rect x="0" y="300" width="2048" height="30" fill="#e4d1b8" opacity="0.4"/>
        <rect x="0" y="480" width="2048" height="40" fill="#e4d1b8" opacity="0.5"/>
        <rect x="0" y="680" width="2048" height="25" fill="#f0dfc8" opacity="0.4"/>
      </svg>
    `;
  } else if (type === 'earth') {
    svgContent = `
      <svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="2048" height="1024" fill="#1b3f68"/>
        <!-- Benua disederhanakan -->
        <path d="M400,200 Q500,220 520,380 Q450,450 380,350 Z" fill="#2d5e37"/>
        <path d="M500,450 Q600,550 560,700 Q480,720 460,550 Z" fill="#3b6934"/>
        <path d="M1000,200 Q1200,180 1350,300 Q1250,450 1050,400 Z" fill="#466436"/>
        <path d="M1100,420 Q1200,500 1180,680 Q1050,650 1080,480 Z" fill="#6d603a"/>
        <circle cx="1550" cy="650" r="120" fill="#6d5e38"/>
        <!-- Kutub es -->
        <rect x="0" y="0" width="2048" height="60" fill="#e8f4f8" opacity="0.85"/>
        <rect x="0" y="964" width="2048" height="60" fill="#e8f4f8" opacity="0.85"/>
      </svg>
    `;
  } else {
    // Moon / generic cratered rocky surface
    svgContent = `
      <svg width="2048" height="1024" xmlns="http://www.w3.org/2000/svg">
        <rect width="2048" height="1024" fill="#585c63"/>
        <circle cx="400" cy="300" r="140" fill="#3b3e44" opacity="0.7"/>
        <circle cx="1200" cy="600" r="180" fill="#383c42" opacity="0.75"/>
        <circle cx="800" cy="450" r="80" fill="#35393f" opacity="0.8"/>
        <circle cx="1600" cy="350" r="100" fill="#35393f" opacity="0.8"/>
        <circle cx="700" cy="750" r="30" fill="#757a82" opacity="0.9"/>
      </svg>
    `;
  }

  await sharp(Buffer.from(svgContent)).png().toFile(rawFilePath);

  return rawFilePath;
}

/**
 * Alur utama pemrosesan tekstur
 */
export async function runTextureOptimization(): Promise<void> {
  console.log('🌌 [AstroSphere] Memulai alur optimasi tekstur...');
  ensureOutputDirs();

  const rawDir = RAW_DIR;
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  // Target dasar tata surya AstroSphere
  const baselinePlanets: Array<{
    slug: string;
    type: 'mars' | 'jupiter' | 'earth' | 'moon' | 'generic';
  }> = [
    { slug: 'mars', type: 'mars' },
    { slug: 'jupiter', type: 'jupiter' },
    { slug: 'earth', type: 'earth' },
    { slug: 'moon', type: 'moon' },
  ];

  for (const planet of baselinePlanets) {
    const rawPath = await generateSyntheticRawTexture(planet.slug, planet.type);
    console.log(`\n🪐 Memproses tekstur: ${planet.slug} (${rawPath})`);
    const results = await optimizeSingleTexture(rawPath, planet.slug);
    for (const r of results) {
      console.log(
        `   - Tier [${r.tier.toUpperCase()}]: ${r.sizeKb} KB -> ${r.path}`,
      );
    }
  }

  // Proses berkas gambar mentah tambahan yang ada di rawDir
  const customFiles = fs
    .readdirSync(rawDir)
    .filter(
      (f) => /\.(png|jpe?g|webp|tiff)$/i.test(f) && !f.endsWith('_raw.png'),
    );

  if (customFiles.length > 0) {
    console.log(`\n📂 Ditemukan ${customFiles.length} berkas mentah kustom:`);
    for (const file of customFiles) {
      const slug = path.basename(file, path.extname(file));
      const fullPath = path.join(rawDir, file);
      console.log(`   Memproses ${file} sebagai ${slug}...`);
      await optimizeSingleTexture(fullPath, slug);
    }
  }

  console.log(
    '\n✅ [AstroSphere] Optimasi tekstur selesai! Tekstur siap di public/assets/textures/',
  );
}

// Jalankan langsung alur optimasi
runTextureOptimization().catch((err) => {
  console.error('❌ Gagal menjalankan optimasi tekstur:', err);
  process.exit(1);
});

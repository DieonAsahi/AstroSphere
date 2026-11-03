import * as fs from 'fs';
import * as path from 'path';
import bodies from '../src/data/bodies.json';
import pois from '../src/data/pois.json';

interface CelestialBodyRaw {
  id: string;
  slug: string;
  name: string;
  type: 'star' | 'planet' | 'dwarf_planet' | 'moon';
  parentId?: string | null;
  diameterKm: number | null;
  massKg: number | null;
  rotationPeriodH: number | null;
  axialTiltDeg: number | null;
  semiMajorAxisAu: number | null;
  eccentricity: number | null;
  inclinationDeg: number | null;
  orbitPeriodDays: number | null;
  textureUrls?: {
    low?: string;
    mid?: string;
    high?: string;
  };
  description: string;
  sources: string[];
}

interface PointOfInterestRaw {
  id: string;
  bodyId: string;
  slug: string;
  name: string;
  type: 'gunung' | 'badai' | 'kawah' | 'lembah' | 'lainnya';
  lat: number;
  lon: number;
  historyText: string;
  dimensions: Array<{
    label: string;
    nilai: number | null;
    satuan: string;
    sumber?: string;
  }>;
  terrainAsset?: string;
  particleConfig?: Record<string, unknown>;
  sources: string[];
}

function escapeSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function escapeSqlNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'NULL';
  return Number.isFinite(num) ? num.toString() : 'NULL';
}

function escapeSqlJson(data: unknown): string {
  if (data === null || data === undefined) return 'NULL';
  const jsonStr = JSON.stringify(data).replace(/'/g, "''");
  return `'${jsonStr}'::jsonb`;
}

export function buildSeedSql(): string {
  const lines: string[] = [];

  lines.push(
    '-- ============================================================================',
  );
  lines.push('-- ASTROSPHERE - SUPABASE SEED DATA');
  lines.push('-- Dihasilkan otomatis oleh scripts/build-seed.ts');
  lines.push(`-- Tanggal generasi: ${new Date().toISOString()}`);
  lines.push(
    '-- Berdasarkan sumber data MVP: src/data/bodies.json & src/data/pois.json',
  );
  lines.push(
    '-- ============================================================================',
  );
  lines.push('');

  // 1. CELESTIAL BODIES
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );
  lines.push('-- 1. BENDA LANGIT (CELESTIAL BODIES)');
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );

  const typedBodies = bodies as CelestialBodyRaw[];
  for (let i = 0; i < typedBodies.length; i++) {
    const b = typedBodies[i];
    // Tentukan parent_id relasional: Bintang (sun) tidak punya parent, satelit (moon) mengorbit bumi, planet mengorbit matahari
    let parentId: string | null = null;
    if (b.type === 'moon') {
      parentId = b.parentId ?? 'earth';
    } else if (b.type === 'planet' || b.type === 'dwarf_planet') {
      parentId = 'sun';
    }

    lines.push(
      `INSERT INTO public.celestial_bodies (id, slug, name, type, parent_id, diameter_km, mass_kg, rotation_period_h, axial_tilt_deg, semi_major_axis_au, eccentricity, inclination_deg, orbit_period_days, description, sort_order, is_published) VALUES (` +
        `${escapeSqlString(b.id)}, ` +
        `${escapeSqlString(b.slug)}, ` +
        `${escapeSqlString(b.name)}, ` +
        `'${b.type}'::public.celestial_body_type, ` +
        `${escapeSqlString(parentId)}, ` +
        `${escapeSqlNumber(b.diameterKm)}, ` +
        `${escapeSqlNumber(b.massKg)}, ` +
        `${escapeSqlNumber(b.rotationPeriodH)}, ` +
        `${escapeSqlNumber(b.axialTiltDeg)}, ` +
        `${escapeSqlNumber(b.semiMajorAxisAu)}, ` +
        `${escapeSqlNumber(b.eccentricity)}, ` +
        `${escapeSqlNumber(b.inclinationDeg)}, ` +
        `${escapeSqlNumber(b.orbitPeriodDays)}, ` +
        `${escapeSqlString(b.description)}, ` +
        `${i + 1}, ` +
        `true` +
        `) ON CONFLICT (id) DO UPDATE SET ` +
        `slug = EXCLUDED.slug, ` +
        `name = EXCLUDED.name, ` +
        `type = EXCLUDED.type, ` +
        `parent_id = EXCLUDED.parent_id, ` +
        `diameter_km = EXCLUDED.diameter_km, ` +
        `mass_kg = EXCLUDED.mass_kg, ` +
        `rotation_period_h = EXCLUDED.rotation_period_h, ` +
        `axial_tilt_deg = EXCLUDED.axial_tilt_deg, ` +
        `semi_major_axis_au = EXCLUDED.semi_major_axis_au, ` +
        `eccentricity = EXCLUDED.eccentricity, ` +
        `inclination_deg = EXCLUDED.inclination_deg, ` +
        `orbit_period_days = EXCLUDED.orbit_period_days, ` +
        `description = EXCLUDED.description, ` +
        `sort_order = EXCLUDED.sort_order, ` +
        `is_published = EXCLUDED.is_published, ` +
        `updated_at = now();`,
    );
  }

  lines.push('');

  // 2. POINTS OF INTEREST
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );
  lines.push('-- 2. TITIK MINAT (POINTS OF INTEREST)');
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );

  const typedPois = pois as PointOfInterestRaw[];
  for (const p of typedPois) {
    lines.push(
      `INSERT INTO public.points_of_interest (id, body_id, slug, name, type, lat, lon, history_text, dimensions, particle_config, sources, is_published) VALUES (` +
        `${escapeSqlString(p.id)}, ` +
        `${escapeSqlString(p.bodyId)}, ` +
        `${escapeSqlString(p.slug)}, ` +
        `${escapeSqlString(p.name)}, ` +
        `'${p.type}'::public.poi_type, ` +
        `${escapeSqlNumber(p.lat)}, ` +
        `${escapeSqlNumber(p.lon)}, ` +
        `${escapeSqlString(p.historyText)}, ` +
        `${escapeSqlJson(p.dimensions)}, ` +
        `${escapeSqlJson(p.particleConfig ?? null)}, ` +
        `${escapeSqlJson(p.sources)}, ` +
        `true` +
        `) ON CONFLICT (id) DO UPDATE SET ` +
        `body_id = EXCLUDED.body_id, ` +
        `slug = EXCLUDED.slug, ` +
        `name = EXCLUDED.name, ` +
        `type = EXCLUDED.type, ` +
        `lat = EXCLUDED.lat, ` +
        `lon = EXCLUDED.lon, ` +
        `history_text = EXCLUDED.history_text, ` +
        `dimensions = EXCLUDED.dimensions, ` +
        `particle_config = EXCLUDED.particle_config, ` +
        `sources = EXCLUDED.sources, ` +
        `is_published = EXCLUDED.is_published, ` +
        `updated_at = now();`,
    );
  }

  lines.push('');

  // 3. ASSETS (MIGRASI DARI TEKSTUR & POI DENGAN QUALITY TIER)
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );
  lines.push('-- 3. ASET BERJENJANG KUALITAS (ASSETS - FR-12)');
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );

  for (const b of typedBodies) {
    const defaultLow = `/assets/textures/low/${b.id}.jpg`;
    const defaultMid = `/assets/textures/mid/${b.id}.jpg`;
    const defaultHigh = `/assets/textures/high/${b.id}.jpg`;

    const textureMap: Array<{
      tier: 'rendah' | 'sedang' | 'tinggi';
      url: string;
    }> = [
      { tier: 'rendah', url: b.textureUrls?.low || defaultLow },
      { tier: 'sedang', url: b.textureUrls?.mid || defaultMid },
      { tier: 'tinggi', url: b.textureUrls?.high || defaultHigh },
    ];

    for (const t of textureMap) {
      lines.push(
        `INSERT INTO public.assets (body_id, poi_id, asset_type, quality_tier, file_url, license, attribution, version) VALUES (` +
          `${escapeSqlString(b.id)}, ` +
          `NULL, ` +
          `'tekstur'::public.asset_type, ` +
          `'${t.tier}'::public.quality_tier, ` +
          `${escapeSqlString(t.url)}, ` +
          `'Domain Publik / NASA', ` +
          `'NASA Solar System Exploration Archives', ` +
          `1` +
          `);`,
      );
    }
  }

  for (const p of typedPois) {
    if (p.terrainAsset) {
      lines.push(
        `INSERT INTO public.assets (body_id, poi_id, asset_type, quality_tier, file_url, license, attribution, version) VALUES (` +
          `NULL, ` +
          `${escapeSqlString(p.id)}, ` +
          `'terrain'::public.asset_type, ` +
          `'tinggi'::public.quality_tier, ` +
          `${escapeSqlString(p.terrainAsset)}, ` +
          `'Domain Publik / USGS MOLA', ` +
          `'USGS Astrogeology Science Center MOLA Topography', ` +
          `1` +
          `);`,
      );
    }

    if (p.particleConfig) {
      lines.push(
        `INSERT INTO public.assets (body_id, poi_id, asset_type, quality_tier, file_url, license, attribution, version) VALUES (` +
          `NULL, ` +
          `${escapeSqlString(p.id)}, ` +
          `'partikel'::public.asset_type, ` +
          `'tinggi'::public.quality_tier, ` +
          `'/assets/particles/${p.id}.json', ` +
          `'Domain Publik', ` +
          `'AstroSphere Prosedural GPU Simulation', ` +
          `1` +
          `);`,
      );
    }
  }

  lines.push('');

  // 4. SAMPLE DATA: KUIS PER POI (FR-10)
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );
  lines.push('-- 4. CONTOH KUIS EDUKASI & EVALUASI BELAJAR (FR-10)');
  lines.push(
    '-- ----------------------------------------------------------------------------',
  );

  const quizOlympusId = 'a1b2c3d4-e5f6-47a8-b9c0-112233445566';
  lines.push(
    `INSERT INTO public.quizzes (id, poi_id, title, description, is_published) VALUES (` +
      `'${quizOlympusId}', ` +
      `'mars-olympus-mons', ` +
      `'Kuis Geologi Olympus Mons', ` +
      `'Uji pemahamanmu tentang gunung api perisai terbesar di Tata Surya.', ` +
      `true` +
      `) ON CONFLICT (id) DO NOTHING;`,
  );

  lines.push(
    `INSERT INTO public.quiz_questions (quiz_id, question_text, options, correct_option_id, explanation, sort_order) VALUES ` +
      `(` +
      `'${quizOlympusId}', ` +
      `'Mengapa Olympus Mons bisa tumbuh hingga ketinggian lebih dari 21 km dibanding gunung di Bumi?', ` +
      `'[{"id":"a","text":"Karena Mars tidak memiliki lempeng tektonik yang bergerak"},{"id":"b","text":"Karena gravitasi Mars lebih kuat dari Bumi"},{"id":"c","text":"Karena atmosfer Mars tersusun dari lava"},{"id":"d","text":"Karena tumbukan komet raksasa"}]'::jsonb, ` +
      `'a', ` +
      `'Tanpa lempeng tektonik aktif di Mars, kerak tetap diam di atas titik panas magma, sehingga letusan lava basaltik terus bertumpuk di lokasi yang sama selama ratusan juta tahun.', ` +
      `1` +
      `), ` +
      `(` +
      `'${quizOlympusId}', ` +
      `'Berapa perkiraan rata-rata kemiringan lereng gunung Olympus Mons?', ` +
      `'[{"id":"a","text":"Sekitar 45 derajat"},{"id":"b","text":"Sekitar 5 derajat (sangat landai)"},{"id":"c","text":"Sekitar 80 derajat"},{"id":"d","text":"Sekitar 25 derajat"}]'::jsonb, ` +
      `'b', ` +
      `'Sebagai gunung berapi perisai (shield volcano), lelehan lava basal yang encer membentuk lereng yang sangat luas dan landai dengan sudut rata-rata hanya ~5 derajat.', ` +
      `2` +
      `) ON CONFLICT DO NOTHING;`,
  );

  const quizSpotId = 'b2c3d4e5-f6a7-48b9-c0d1-223344556677';
  lines.push(
    `INSERT INTO public.quizzes (id, poi_id, title, description, is_published) VALUES (` +
      `'${quizSpotId}', ` +
      `'jupiter-great-red-spot', ` +
      `'Kuis Atmosfer Badai Merah Raksasa', ` +
      `'Uji pengetahuanmu tentang pusaran antisiklonik raksasa Jupiter.', ` +
      `true` +
      `) ON CONFLICT (id) DO NOTHING;`,
  );

  lines.push(
    `INSERT INTO public.quiz_questions (quiz_id, question_text, options, correct_option_id, explanation, sort_order) VALUES ` +
      `(` +
      `'${quizSpotId}', ` +
      `'Ke arah mana pusaran Badai Merah Raksasa berputar sebagaimana diamati dari belahan selatan Jupiter?', ` +
      `'[{"id":"a","text":"Searah jarum jam"},{"id":"b","text":"Berlawanan arah jarum jam (antisiklonik)"},{"id":"c","text":"Tegak lurus terhadap kutub"},{"id":"d","text":"Tidak berputar"}]'::jsonb, ` +
      `'b', ` +
      `'Badai Merah Raksasa adalah antisiklon bertekanan tinggi di belahan bumi selatan Jupiter, sehingga gaya Coriolis menyebabkannya berputar berlawanan arah jarum jam.', ` +
      `1` +
      `) ON CONFLICT DO NOTHING;`,
  );

  lines.push('');
  lines.push('-- Selesai membangkitkan seed data');

  return lines.join('\n');
}

// Eksekusi pembuatan berkas seed.sql
const sql = buildSeedSql();
const outputPath = path.resolve(process.cwd(), 'supabase', 'seed.sql');
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(
  `[AstroSphere] Seed SQL berhasil dibuat di: ${outputPath} (${sql.length} byte)`,
);

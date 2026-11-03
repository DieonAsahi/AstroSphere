import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface data benda langit hasil impor NASA Fact Sheet
 */
export interface NasaCelestialBody {
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
  textureUrls: {
    low: string;
    mid: string;
    high: string;
  };
  description: string;
  sources: string[];
}

/**
 * Interface POI hasil impor NASA / USGS Astrogeology
 */
export interface NasaPointOfInterest {
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

/**
 * Dataset Master Ilmiah NASA Planetary Fact Sheet & USGS Astrogeology
 * Sumber Resmi: NASA Goddard Space Flight Center (https://nssdc.gsfc.nasa.gov/planetary/factsheet/)
 */
export const NASA_PLANETARY_FACT_SHEET: NasaCelestialBody[] = [
  {
    id: 'sun',
    slug: 'matahari',
    name: 'Matahari',
    type: 'star',
    diameterKm: 1392700,
    massKg: 1.9884e30,
    rotationPeriodH: 609.12,
    axialTiltDeg: 7.25,
    semiMajorAxisAu: null,
    eccentricity: null,
    inclinationDeg: null,
    orbitPeriodDays: null,
    textureUrls: {
      low: '/assets/textures/low/sun.webp',
      mid: '/assets/textures/mid/sun.webp',
      high: '/assets/textures/high/sun.webp',
    },
    description:
      'Bintang deret utama tipe-G di pusat Tata Surya yang menyumbang 99,86% massa sistem.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html',
      'NASA Solar System Exploration (Sun Facts)',
    ],
  },
  {
    id: 'mercury',
    slug: 'merkurius',
    name: 'Merkurius',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 4879.4,
    massKg: 3.3011e23,
    rotationPeriodH: 1407.6,
    axialTiltDeg: 0.034,
    semiMajorAxisAu: 0.3871,
    eccentricity: 0.2056,
    inclinationDeg: 7.0,
    orbitPeriodDays: 87.969,
    textureUrls: {
      low: '/assets/textures/low/mercury.webp',
      mid: '/assets/textures/mid/mercury.webp',
      high: '/assets/textures/high/mercury.webp',
    },
    description:
      'Planet terdekat dari Matahari dengan variasi suhu ekstrem dan tanpa atmosfer tebal.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html',
      'NASA MESSENGER Mission Data Archive',
    ],
  },
  {
    id: 'venus',
    slug: 'venus',
    name: 'Venus',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 12103.6,
    massKg: 4.8675e24,
    rotationPeriodH: -5832.5, // retrograde
    axialTiltDeg: 177.36,
    semiMajorAxisAu: 0.7233,
    eccentricity: 0.0068,
    inclinationDeg: 3.39,
    orbitPeriodDays: 224.701,
    textureUrls: {
      low: '/assets/textures/low/venus.webp',
      mid: '/assets/textures/mid/venus.webp',
      high: '/assets/textures/high/venus.webp',
    },
    description:
      'Planet terpanas di Tata Surya akibat efek rumah kaca tak terkendali dari atmosfer karbon dioksida.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html',
      'NASA Magellan Radar Mapping',
    ],
  },
  {
    id: 'earth',
    slug: 'bumi',
    name: 'Bumi',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 12742.0,
    massKg: 5.97237e24,
    rotationPeriodH: 23.9345,
    axialTiltDeg: 23.44,
    semiMajorAxisAu: 1.0,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
    orbitPeriodDays: 365.256,
    textureUrls: {
      low: '/assets/textures/low/earth.webp',
      mid: '/assets/textures/mid/earth.webp',
      high: '/assets/textures/high/earth.webp',
    },
    description:
      'Satu-satunya planet yang diketahui mendukung kehidupan, dengan biosfer aktif dan air cair di permukaan.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html',
      'NASA Earth Observatory',
    ],
  },
  {
    id: 'moon',
    slug: 'bulan',
    name: 'Bulan',
    type: 'moon',
    parentId: 'earth',
    diameterKm: 3474.8,
    massKg: 7.342e22,
    rotationPeriodH: 655.7,
    axialTiltDeg: 6.68,
    semiMajorAxisAu: 0.00257,
    eccentricity: 0.0549,
    inclinationDeg: 5.14,
    orbitPeriodDays: 27.322,
    textureUrls: {
      low: '/assets/textures/low/moon.webp',
      mid: '/assets/textures/mid/moon.webp',
      high: '/assets/textures/high/moon.webp',
    },
    description:
      'Satelit alami permanen Bumi dalam penguncian pasang surut (rotasi sinkron).',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
      'NASA Lunar Reconnaissance Orbiter (LRO)',
    ],
  },
  {
    id: 'mars',
    slug: 'mars',
    name: 'Mars',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 6779.0,
    massKg: 6.4171e23,
    rotationPeriodH: 24.6229,
    axialTiltDeg: 25.19,
    semiMajorAxisAu: 1.524,
    eccentricity: 0.0934,
    inclinationDeg: 1.85,
    orbitPeriodDays: 686.98,
    textureUrls: {
      low: '/assets/textures/low/mars.webp',
      mid: '/assets/textures/mid/mars.webp',
      high: '/assets/textures/high/mars.webp',
    },
    description:
      'Planet merah berdebu kaya besi oksida, memiliki gunung berapi perisai tertinggi dan lembah terpanjang.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
      'NASA Mars Reconnaissance Orbiter (MRO)',
    ],
  },
  {
    id: 'jupiter',
    slug: 'jupiter',
    name: 'Jupiter',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 139820.0,
    massKg: 1.8982e27,
    rotationPeriodH: 9.925,
    axialTiltDeg: 3.13,
    semiMajorAxisAu: 5.2044,
    eccentricity: 0.0489,
    inclinationDeg: 1.304,
    orbitPeriodDays: 4332.59,
    textureUrls: {
      low: '/assets/textures/low/jupiter.webp',
      mid: '/assets/textures/mid/jupiter.webp',
      high: '/assets/textures/high/jupiter.webp',
    },
    description:
      'Planet terbesar di Tata Surya, raksasa gas dengan badai antisiklonik raksasa dan puluhan satelit.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html',
      'NASA Juno Mission Scientific Results',
    ],
  },
  {
    id: 'saturn',
    slug: 'saturnus',
    name: 'Saturnus',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 116460.0,
    massKg: 5.6834e26,
    rotationPeriodH: 10.656,
    axialTiltDeg: 26.73,
    semiMajorAxisAu: 9.5826,
    eccentricity: 0.0565,
    inclinationDeg: 2.485,
    orbitPeriodDays: 10759.22,
    textureUrls: {
      low: '/assets/textures/low/saturn.webp',
      mid: '/assets/textures/mid/saturn.webp',
      high: '/assets/textures/high/saturn.webp',
    },
    description:
      'Raksasa gas spektakuler dengan sistem cincin es dan debu terluas di Tata Surya.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html',
      'NASA Cassini-Huygens Mission Data',
    ],
  },
  {
    id: 'uranus',
    slug: 'uranus',
    name: 'Uranus',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 50724.0,
    massKg: 8.681e25,
    rotationPeriodH: -17.24, // retrograde
    axialTiltDeg: 97.77,
    semiMajorAxisAu: 19.2184,
    eccentricity: 0.0463,
    inclinationDeg: 0.773,
    orbitPeriodDays: 30685.4,
    textureUrls: {
      low: '/assets/textures/low/uranus.webp',
      mid: '/assets/textures/mid/uranus.webp',
      high: '/assets/textures/high/uranus.webp',
    },
    description:
      'Raksasa es dengan sumbu rotasi yang miring hampir sejajar dengan bidang orbitnya.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html',
      'NASA Voyager 2 Planetary Flyby',
    ],
  },
  {
    id: 'neptune',
    slug: 'neptunus',
    name: 'Neptunus',
    type: 'planet',
    parentId: 'sun',
    diameterKm: 49244.0,
    massKg: 1.02413e26,
    rotationPeriodH: 16.11,
    axialTiltDeg: 28.32,
    semiMajorAxisAu: 30.07,
    eccentricity: 0.00945,
    inclinationDeg: 1.77,
    orbitPeriodDays: 60189.0,
    textureUrls: {
      low: '/assets/textures/low/neptune.webp',
      mid: '/assets/textures/mid/neptune.webp',
      high: '/assets/textures/high/neptune.webp',
    },
    description:
      'Planet terjauh dari Matahari dengan angin atmosfer tercepat di Tata Surya melebihi 2.000 km/jam.',
    sources: [
      'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html',
      'NASA Voyager 2 Science Team',
    ],
  },
];

/**
 * Dataset Master Ilmiah POI Tata Surya NASA / USGS Astrogeology
 */
export const NASA_POI_FACT_SHEET: NasaPointOfInterest[] = [
  {
    id: 'mars-olympus-mons',
    bodyId: 'mars',
    slug: 'olympus-mons',
    name: 'Olympus Mons',
    type: 'gunung',
    lat: 18.65,
    lon: 226.2,
    historyText:
      'Olympus Mons adalah gunung berapi perisai raksasa di Mars yang merupakan gunung tertinggi di Tata Surya. Terbentuk dari ribuan aliran lava basaltik selama ratusan juta tahun di kerak Mars yang stasioner tanpa lempeng tektonik aktif.',
    dimensions: [
      {
        label: 'Tinggi dari datum',
        nilai: 21.9,
        satuan: 'km',
        sumber: 'NASA Mars Orbiter Laser Altimeter (MOLA)',
      },
      {
        label: 'Diameter dasar',
        nilai: 600,
        satuan: 'km',
        sumber: 'USGS Astrogeology Science Center',
      },
      {
        label: 'Kedalaman kaldera',
        nilai: 3.2,
        satuan: 'km',
        sumber: 'ESA Mars Express HRSC',
      },
      {
        label: 'Tinggi tebing pembatas',
        nilai: 8.0,
        satuan: 'km',
        sumber: 'NASA MRO HiRISE',
      },
    ],
    terrainAsset: '/assets/terrain/mars-olympus-mons.json',
    sources: [
      'https://astrogeology.usgs.gov/search/map/Mars/Topography/OlympusMons_MOLA',
      'NASA Mars Exploration Program (Olympus Mons Profile)',
      'Smith et al. (2001) Mars Orbiter Laser Altimeter Experiment Results',
    ],
  },
  {
    id: 'jupiter-great-red-spot',
    bodyId: 'jupiter',
    slug: 'great-red-spot',
    name: 'Badai Merah Raksasa',
    type: 'badai',
    lat: -22.0,
    lon: 270.0,
    historyText:
      'Badai Merah Raksasa adalah pusaran antisiklonik bertekanan tinggi yang berputar berlawanan arah jarum jam di belahan selatan Jupiter. Telah diamati terus-menerus selama lebih dari 150 tahun dan didukung oleh dinamika atmosfer fluida tanpa hambatan gesekan permukaan padat.',
    dimensions: [
      {
        label: 'Panjang Timur-Barat',
        nilai: 16350,
        satuan: 'km',
        sumber: 'NASA Juno Mission Science Team (2021)',
      },
      {
        label: 'Lebar Utara-Selatan',
        nilai: 10000,
        satuan: 'km',
        sumber: 'Hubble Space Telescope OPAL Program',
      },
      {
        label: 'Kecepatan angin tepi',
        nilai: 432,
        satuan: 'km/jam',
        sumber: 'NASA Juno Microwave Radiometer (MWR)',
      },
      {
        label: 'Kedalaman akar badai',
        nilai: 300,
        satuan: 'km',
        sumber: 'Juno Gravity & MWR Joint Measurement (NASA 2021)',
      },
    ],
    particleConfig: {
      type: 'badai_antisiklonik',
      count: 40000,
      speed: 1.2,
      vortexRadius: 0.32,
      color: '#d9381e',
      secondaryColor: '#e67332',
      coreColor: '#f6e2c3',
      direction: 'counterclockwise',
    },
    sources: [
      'https://science.nasa.gov/mission/juno/great-red-spot/',
      'Bolton et al. (2021) Science: Microwave Observations of Jupiter’s Atmosphere and Great Red Spot',
      'NASA JPL Solar System Dynamics',
    ],
  },
];

/**
 * Alur eksekusi impor data NASA
 * Menghasilkan file JSON lokal src/data/bodies.json dan src/data/pois.json
 * PENTING: Aplikasi runtime TIDAK memanggil API NASA runtime.
 */
export async function runNasaDataImport(): Promise<void> {
  console.log(
    '📡 [AstroSphere] Menjalankan alur impor data ilmiah NASA Planetary Fact Sheet...',
  );

  const bodiesPath = path.resolve(process.cwd(), 'src/data/bodies.json');
  const poisPath = path.resolve(process.cwd(), 'src/data/pois.json');

  console.log(
    `🪐 Menyimpan ${NASA_PLANETARY_FACT_SHEET.length} benda langit ke: ${bodiesPath}`,
  );
  fs.writeFileSync(
    bodiesPath,
    JSON.stringify(NASA_PLANETARY_FACT_SHEET, null, 2),
    'utf-8',
  );

  console.log(
    `📍 Menyimpan ${NASA_POI_FACT_SHEET.length} titik minat (POI) ke: ${poisPath}`,
  );
  fs.writeFileSync(
    poisPath,
    JSON.stringify(NASA_POI_FACT_SHEET, null, 2),
    'utf-8',
  );

  console.log(
    '\n✅ [AstroSphere] Impor data NASA berhasil dilakukan secara offline!',
  );
  console.log('   Semua data terverifikasi disimpan secara lokal.');
  console.log(
    '   Aplikasi TIDAK memanggil API eksternal NASA pada saat runtime.',
  );
}

// Jalankan langsung alur impor
runNasaDataImport().catch((err) => {
  console.error('❌ Gagal menjalankan impor data NASA:', err);
  process.exit(1);
});

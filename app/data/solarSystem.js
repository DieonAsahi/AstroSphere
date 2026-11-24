// Data tata surya AstroSphere.
// - Radius rata-rata, rotasi sideris, dan periode orbit: tabel NASA JPL (PRD §6.4).
//   Radius dalam satuan dunia = km / 398,2 sehingga RASIO diameter antarplanet tetap nyata.
// - Elemen orbit Kepler (e, i, Ω, ω, M0 pada J2000) adalah nilai rata-rata J2000 yang dibulatkan;
//   sumbu semi-mayor (a) DIPADATKAN agar semua planet bisa dijelajahi. Ini model edukasi, bukan ephemeris.
// - Kemiringan sumbu (obliquity) memakai konvensi periode positif: Venus (177,4°) dan Uranus (97,8°)
//   berotasi retrograd karena sumbunya terbalik, bukan karena periodenya diberi tanda negatif.
// type shader: 0 gurun, 1 raksasa gas/awan, 2 mirip Bumi, 3 vulkanik, 4 es, 5 berkawah

const R = (km) => km / 398.18755; // km → satuan dunia

export const SUN = {
  id: 'matahari', name: 'Matahari', kind: 'Bintang induk · tipe G2V', radius: 230,
  radiusKm: 695700, rotationDays: 25.38, color: '#ffc861',
  desc: 'Bintang yang menyumbang 99,86% massa tata surya. Ukuran Matahari di game tidak berskala agar planet tetap terlihat.',
  facts: [['Radius rata-rata', '695.700 km'], ['Rotasi (ekuator)', '± 25,4 hari'], ['Suhu permukaan', '± 5.500 °C'], ['Umur', '± 4,6 miliar tahun']],
  sumber_referensi: 'NASA Solar System Exploration',
};

export const PLANETS = [
  { id: 'merkurius', name: 'Merkurius', order: 1, kind: 'Planet kebumian', type: 5, radiusKm: 2439.4, rotationDays: 58.6462, periodYears: 0.2408467,
    a: 720, e: 0.2056, i: 7.0, node: 48.3, peri: 29.1, M0: 174.8, tilt: 0.03, seed: 4.1,
    colors: ['#4d4843', '#958f87', '#3a3632', '#b8b1a7', '#000000'], atmo: '#9aa0a8', atmoScale: 1, atmoStr: 0, bump: .05,
    color: '#a39d95', moons: 0,
    desc: 'Planet terkecil dan terdekat dengan Matahari. Permukaannya penuh kawah, hampir tanpa atmosfer, dengan suhu yang berayun ekstrem.',
    facts: [['Radius rata-rata', '2.439,4 km'], ['Rotasi sideris', '58,646 hari'], ['Periode orbit', '0,241 tahun (± 88 hari)'], ['Kemiringan sumbu', '0,03°'], ['Satelit alami', 'Tidak ada']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'venus', name: 'Venus', order: 2, kind: 'Planet kebumian', type: 1, radiusKm: 6051.8, rotationDays: 243.018, periodYears: 0.61519726,
    a: 1000, e: 0.0068, i: 3.39, node: 76.7, peri: 54.9, M0: 50.1, tilt: 177.36, seed: 8.2,
    colors: ['#e9d4a4', '#d2ae76', '#b48852', '#f7ecd2', '#c9a36a'], atmo: '#ffd9a0', atmoScale: 1.06, atmoStr: 1.0, band: 7, storm: 0, bump: .002,
    color: '#e3bb76', moons: 0,
    desc: 'Tertutup awan asam sulfat yang tebal. Efek rumah kaca dari atmosfer CO₂ menjadikannya planet terpanas. Berotasi retrograd sangat lambat.',
    facts: [['Radius rata-rata', '6.051,8 km'], ['Rotasi sideris', '243,018 hari (retrograd)'], ['Periode orbit', '0,615 tahun (± 225 hari)'], ['Kemiringan sumbu', '177,4°'], ['Satelit alami', 'Tidak ada']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'bumi', name: 'Bumi', order: 3, kind: 'Planet kebumian', type: 2, radiusKm: 6371.0084, rotationDays: 0.99726968, periodYears: 1.0000174,
    a: 1320, e: 0.0167, i: 0.0, node: 0, peri: 114.2, M0: 357.5, tilt: 23.44, seed: 3.7,
    colors: ['#03163a', '#0e6aa0', '#2d6a2f', '#a08a55', '#eef4ff'], atmo: '#4d9fff', atmoScale: 1.13, atmoStr: 1.15, sea: .52, clouds: .6, city: 1, bump: .03,
    color: '#3a86d8', moons: 1,
    desc: 'Satu-satunya planet yang diketahui memiliki kehidupan. Samudra menutupi sekitar 71% permukaannya; sumbunya miring 23,4° sehingga ada musim.',
    facts: [['Radius rata-rata', '6.371,0 km'], ['Rotasi sideris', '0,997 hari (23 j 56 m)'], ['Periode orbit', '1,000 tahun'], ['Kemiringan sumbu', '23,44°'], ['Satelit alami', '1 · Bulan']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'mars', name: 'Mars', order: 4, kind: 'Planet kebumian', type: 0, radiusKm: 3389.5, rotationDays: 1.02595676, periodYears: 1.8808476,
    a: 1680, e: 0.0934, i: 1.85, node: 49.6, peri: 286.5, M0: 19.4, tilt: 25.19, seed: 7.9,
    colors: ['#5a2210', '#ad4a2c', '#d8865a', '#f3e6d6', '#6e2c16'], atmo: '#ff9c66', atmoScale: 1.04, atmoStr: .5, bump: .04,
    color: '#c1502e', moons: 2,
    desc: 'Planet merah berdebu oksida besi, rumah gunung api terbesar (Olympus Mons) dan ngarai raksasa Valles Marineris.',
    facts: [['Radius rata-rata', '3.389,5 km'], ['Rotasi sideris', '1,026 hari'], ['Periode orbit', '1,881 tahun'], ['Kemiringan sumbu', '25,19°'], ['Satelit alami', '2 · Phobos, Deimos']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'jupiter', name: 'Jupiter', order: 5, kind: 'Raksasa gas', type: 1, radiusKm: 69911, rotationDays: 0.41354, periodYears: 11.862615,
    a: 3150, e: 0.0489, i: 1.30, node: 100.5, peri: 273.9, M0: 20.0, tilt: 3.13, seed: 5.2,
    colors: ['#ecdcc2', '#c7925f', '#7d4a2c', '#fbf3e6', '#b3402a'], atmo: '#f5cfa0', atmoScale: 1.04, atmoStr: .75, band: 16, storm: 1, bump: .004,
    color: '#d9a066', moons: 95,
    desc: 'Planet terbesar. Pita awannya digerakkan angin kencang, dan Bintik Merah Besar adalah badai yang telah bertahan ratusan tahun.',
    facts: [['Radius rata-rata', '69.911 km'], ['Rotasi sideris', '0,414 hari (± 9 j 56 m)'], ['Periode orbit', '11,86 tahun'], ['Kemiringan sumbu', '3,13°'], ['Satelit besar', 'Io, Europa, Ganymede, Callisto']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'saturnus', name: 'Saturnus', order: 6, kind: 'Raksasa gas bercincin', type: 1, radiusKm: 58232, rotationDays: 0.44401, periodYears: 29.447498,
    a: 4350, e: 0.0565, i: 2.49, node: 113.7, peri: 339.4, M0: 317.0, tilt: 26.73, seed: 9.6,
    colors: ['#f3e2b3', '#d9ba7c', '#b08a52', '#fff6dc', '#caa467'], atmo: '#ffe2a8', atmoScale: 1.04, atmoStr: .7, band: 24, storm: 0, bump: .003,
    ring: { inner: 1.24, outer: 2.27, color: '#e6cfa0', color2: '#a88f68', opacity: .9, seed: 1.7 },
    color: '#e8d29a', moons: 146,
    desc: 'Cincin megahnya tersusun dari miliaran bongkah es dan batu. Kerapatannya lebih kecil dari air.',
    facts: [['Radius rata-rata', '58.232 km'], ['Rotasi sideris', '0,444 hari'], ['Periode orbit', '29,45 tahun'], ['Kemiringan sumbu', '26,73°'], ['Satelit terbesar', 'Titan']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'uranus', name: 'Uranus', order: 7, kind: 'Raksasa es', type: 1, radiusKm: 25362, rotationDays: 0.71833, periodYears: 84.016846,
    a: 5450, e: 0.0457, i: 0.77, node: 74.0, peri: 96.9, M0: 142.2, tilt: 97.77, seed: 12.4,
    colors: ['#c6edf1', '#a3dbe4', '#82c3d1', '#e6f8fa', '#9fd8e2'], atmo: '#bff4ff', atmoScale: 1.05, atmoStr: .8, band: 6, storm: 0, bump: .002,
    ring: { inner: 1.64, outer: 2.0, color: '#7f8a90', color2: '#4a5257', opacity: .35, seed: 6.1 },
    color: '#9fe3e8', moons: 28,
    desc: 'Raksasa es kebiruan yang sumbunya miring hampir 98°, sehingga planet ini seolah berguling di orbitnya.',
    facts: [['Radius rata-rata', '25.362 km'], ['Rotasi sideris', '0,718 hari (retrograd)'], ['Periode orbit', '84,02 tahun'], ['Kemiringan sumbu', '97,77°'], ['Satelit alami', '28 diketahui']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
  { id: 'neptunus', name: 'Neptunus', order: 8, kind: 'Raksasa es', type: 1, radiusKm: 24622, rotationDays: 0.67125, periodYears: 164.79132,
    a: 6450, e: 0.0113, i: 1.77, node: 131.8, peri: 273.2, M0: 256.2, tilt: 28.32, seed: 14.9,
    colors: ['#4067d4', '#2c4ab4', '#1d3184', '#86a6f2', '#101c58'], atmo: '#6f8cff', atmoScale: 1.05, atmoStr: .9, band: 10, storm: .7, bump: .002,
    color: '#4256c9', moons: 16,
    desc: 'Planet terjauh, biru pekat karena metana. Anginnya tercepat di tata surya, lebih dari 2.000 km/jam.',
    facts: [['Radius rata-rata', '24.622 km'], ['Rotasi sideris', '0,671 hari'], ['Periode orbit', '164,79 tahun'], ['Kemiringan sumbu', '28,32°'], ['Satelit terbesar', 'Triton']],
    sumber_referensi: 'NASA Planetary Fact Sheet' },
];

// Satelit: orbit sirkular relatif induk pada saat yang sama (jarak dipadatkan, periode nyata)
export const MOONS = [
  { id: 'bulan', name: 'Bulan', parent: 'bumi', kind: 'Satelit Bumi', type: 5, radiusKm: 1737.4, orbit: 64, orbitDays: 27.3217, incl: 5.1, angle: 1.0, tilt: 6.68, rotationDays: 27.3217, seed: 21.1,
    colors: ['#5d5953', '#a19c94', '#3a3834', '#c9c4ba', '#000000'], atmo: '#9aa0a8', atmoScale: 1, atmoStr: 0, bump: .05, color: '#c9c4ba',
    desc: 'Satu-satunya satelit alami Bumi. Selalu menghadapkan sisi yang sama karena rotasinya terkunci pasang surut.',
    sumber_referensi: 'NASA Solar System Exploration' },
  { id: 'io', name: 'Io', parent: 'jupiter', kind: 'Satelit Jupiter', type: 3, radiusKm: 1821.6, orbit: 265, orbitDays: 1.769, incl: .05, angle: .4, tilt: 0, rotationDays: 1.769, seed: 31.3,
    colors: ['#3a2a10', '#d8c25a', '#ff6a12', '#ffd84a', '#000000'], atmo: '#ffd84a', atmoScale: 1, atmoStr: 0, bump: .05, color: '#d8c25a',
    desc: 'Benda paling aktif secara vulkanik di tata surya, dengan ratusan gunung api belerang.',
    sumber_referensi: 'NASA Solar System Exploration' },
  { id: 'europa', name: 'Europa', parent: 'jupiter', kind: 'Satelit Jupiter', type: 4, radiusKm: 1560.8, orbit: 330, orbitDays: 3.551, incl: .47, angle: 2.2, tilt: 0, rotationDays: 3.551, seed: 33.7,
    colors: ['#d8e4ea', '#f7fbff', '#8a5a4a', '#b8cad6', '#000000'], atmo: '#cfe8ff', atmoScale: 1.02, atmoStr: .2, bump: .04, color: '#e6eef3',
    desc: 'Kerak es dengan retakan kemerahan; diduga menyimpan samudra air asin di bawahnya.',
    sumber_referensi: 'NASA Solar System Exploration' },
  { id: 'ganymede', name: 'Ganymede', parent: 'jupiter', kind: 'Satelit Jupiter', type: 5, radiusKm: 2634.1, orbit: 405, orbitDays: 7.155, incl: .2, angle: 3.9, tilt: 0, rotationDays: 7.155, seed: 35.2,
    colors: ['#6b6258', '#a99e90', '#4e463e', '#cfc6ba', '#000000'], atmo: '#b09a86', atmoScale: 1, atmoStr: 0, bump: .05, color: '#a99e90',
    desc: 'Satelit terbesar di tata surya — lebih besar dari Merkurius — dan punya medan magnet sendiri.',
    sumber_referensi: 'NASA Solar System Exploration' },
  { id: 'callisto', name: 'Callisto', parent: 'jupiter', kind: 'Satelit Jupiter', type: 5, radiusKm: 2410.3, orbit: 490, orbitDays: 16.689, incl: .2, angle: 5.3, tilt: 0, rotationDays: 16.689, seed: 41.9,
    colors: ['#3e362f', '#7a6e62', '#2a241f', '#a3968a', '#000000'], atmo: '#b09a86', atmoScale: 1, atmoStr: 0, bump: .06, color: '#7a6e62',
    desc: 'Permukaan tertua dan paling banyak kawah di tata surya.',
    sumber_referensi: 'NASA Solar System Exploration' },
  { id: 'titan', name: 'Titan', parent: 'saturnus', kind: 'Satelit Saturnus', type: 1, radiusKm: 2574.7, orbit: 520, orbitDays: 15.945, incl: .35, angle: 2.7, tilt: 0, rotationDays: 15.945, seed: 51.5,
    colors: ['#d99a4a', '#c27f35', '#a4652a', '#e8b46a', '#c27f35'], atmo: '#ffb060', atmoScale: 1.08, atmoStr: 1.0, band: 4, storm: 0, bump: .002, color: '#d99a4a',
    desc: 'Satu-satunya satelit dengan atmosfer tebal; memiliki danau metana dan etana cair.',
    sumber_referensi: 'NASA Solar System Exploration' },
];

export const BELT = { id: 'sabuk', name: 'Sabuk Asteroid', kind: 'Sabuk utama', inner: 2150, outer: 2600, half: 60, color: '#8a7f74',
  desc: 'Jutaan bongkah batuan di antara orbit Mars dan Jupiter. Ceres, planet kerdil terbesar di sabuk ini, berada di sini.' };

export const BODY_ORDER = ['matahari', ...PLANETS.map((p) => p.id)];
export const radiusOf = (d) => R(d.radiusKm);

// Warna tampilan per benda (untuk chip, jurnal, peta)
export const COLOR_OF = Object.fromEntries([[SUN.id, SUN.color], ...PLANETS.map((p) => [p.id, p.color]), ...MOONS.map((m) => [m.id, m.color]), [BELT.id, BELT.color]]);
export const NAME_OF = Object.fromEntries([[SUN.id, SUN.name], ...PLANETS.map((p) => [p.id, p.name]), ...MOONS.map((m) => [m.id, m.name]), [BELT.id, BELT.name]]);

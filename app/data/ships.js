// Tiga pesawat AstroSphere (PRD R11): Astra Scout gratis, Orion Glider 300 bintang, Nova Voyager 700 bintang.
// Model 3D: GLB unduhan (public/models/ships, kredit di app/data/credits.js), dioptimasi oleh scripts/optimize-models.mjs:
//   Astra Scout  — Space Shuttle Discovery (semburan api bawaan model mengikuti tuas gas)
//   Orion Glider — Stealthy Space Tato (lambung siluman, satu mesin utama)
//   Nova Voyager — SA-23 Starfury (rangka X, empat pod mesin berpijar)
// flame = faktor ukuran api kerucut per mesin (disesuaikan dengan ukuran nosel model).
export const SHIPS = {
  astra: {
    id: 'astra', name: 'Astra Scout', cls: 'Pengorbit ulang-alik', length: '37 m', price: 0,
    speed: 70, accel: 1.5, turn: 1.15, boost: 4.5, engine: '#ffb25a', glow: 1.1, flame: 1, camY: 1.9, camZ: 8.6,
    desc: 'Berbasis Space Shuttle Discovery (OV-103), pengorbit NASA yang terbang 39 kali (1984–2011) dan meluncurkan Teleskop Hubble pada 1990. Semburan apinya memanjang mengikuti tuas gas.',
    stats: { Kecepatan: .62, Kelincahan: .92, Akselerasi: .85, 'Daya boost': .7 },
  },
  orion: {
    id: 'orion', name: 'Orion Glider', cls: 'Peluncur siluman', length: '15 m', price: 300,
    speed: 82, accel: 1.25, turn: .95, boost: 5.2, engine: '#ff4a4a', glow: 1.25, flame: 1.15, camY: 2.3, camZ: 10.4,
    desc: 'Lambung siluman hitam bersayap berlian dengan kokpit kaca biru dan satu mesin utama besar di buritan. Dirancang untuk perjalanan jauh yang senyap.',
    stats: { Kecepatan: .8, Kelincahan: .66, Akselerasi: .72, 'Daya boost': .88 },
  },
  nova: {
    id: 'nova', name: 'Nova Voyager', cls: 'Kapal ekspedisi', length: '18 m', price: 700,
    speed: 96, accel: 1.15, turn: .9, boost: 5.6, engine: '#3fb6ff', glow: 1.2, flame: .5, camY: 2.5, camZ: 11.8,
    desc: 'Rangka berbentuk X dengan empat pod mesin di ujung lengan yang berpijar biru saat dipacu. Kecepatan jelajah tertinggi di armada.',
    stats: { Kecepatan: .96, Kelincahan: .7, Akselerasi: .68, 'Daya boost': 1 },
  },
};
export const SHIP_IDS = Object.keys(SHIPS);

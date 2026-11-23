// Lapisan penerjemah & pengambil data publik Supabase dengan fallback aman ke berkas lokal app/data/*.js
import { reactive, computed } from 'vue';
import { getSupabaseClient, isSupabaseConfigured } from '~/utils/supabaseClient.js';
import { PLANETS, SUN, MOONS } from '~/data/solarSystem.js';
import { HISTORY } from '~/data/history.js';
import { PHENOMENA } from '~/data/phenomena.js';
import { QUIZ } from '~/data/quiz.js';
import { SHIPS } from '~/data/ships.js';
import { MYTHS } from '~/data/learning.js';

// Pemetaan dua arah ID Planet: Nuxt (lokal) <-> Supabase (bahasa Inggris)
export const LOCAL_TO_SUPABASE_PLANET = {
  merkurius: 'mercury',
  venus: 'venus',
  bumi: 'earth',
  mars: 'mars',
  jupiter: 'jupiter',
  saturnus: 'saturn',
  uranus: 'uranus',
  neptunus: 'neptune',
  matahari: 'sun',
  bulan: 'moon',
};

export const SUPABASE_TO_LOCAL_PLANET = Object.fromEntries(
  Object.entries(LOCAL_TO_SUPABASE_PLANET).map(([k, v]) => [v, k])
);

export const toSupabasePlanetId = (id) => LOCAL_TO_SUPABASE_PLANET[id] || id;
export const toLocalPlanetId = (id) => SUPABASE_TO_LOCAL_PLANET[id] || id;

// Pemetaan ID Pesawat
export const LOCAL_TO_SUPABASE_SHIP = {
  astra: 'astra-scout',
  orion: 'orion-glider',
  nova: 'nova-voyager',
};

export const SUPABASE_TO_LOCAL_SHIP = Object.fromEntries(
  Object.entries(LOCAL_TO_SUPABASE_SHIP).map(([k, v]) => [v, k])
);

export const toSupabaseShipId = (id) => LOCAL_TO_SUPABASE_SHIP[id] || id;
export const toLocalShipId = (id) => SUPABASE_TO_LOCAL_SHIP[id] || id;

// Helper untuk membangun data ilmiah bawaan (fallback jika belum ada di DB)
function getFallbackScientificData(planetId) {
  const p = PLANETS.find((x) => x.id === planetId);
  if (!p) return null;
  const isEarth = p.id === 'bumi';
  const retro = (p.tilt || 0) > 90;
  const nf = (n, d = 1) => (n != null ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '—');
  const rotText = p.rotationDays < 2 ? `${nf(p.rotationDays * 24)} jam` : `${nf(p.rotationDays, 1)} hari`;
  const orbText = p.periodYears < 2 ? `${nf(p.periodYears * 365.25, 0)} hari` : `${nf(p.periodYears, 2)} tahun`;

  return {
    planet_id: toSupabasePlanetId(p.id),
    local_id: p.id,
    nama: p.name,
    urutan_planet: p.order,
    deskripsi_materi: p.desc,
    diameter_km: p.radiusKm * 2,
    perbandingan_bumi: isEarth ? 'Standar acuan (1,00×)' : `${nf((p.radiusKm * 2) / (6371.0084 * 2), 2)}× ukuran Bumi`,
    periode_rotasi: rotText,
    subteks_rotasi: retro ? 'Rotasi berlawanan arah (retrograd)' : 'Rotasi searah orbit (prograd)',
    periode_orbit: orbText,
    subteks_orbit: `Waktu revolusi mengitari Matahari (${nf(p.periodYears, 2)} tahun)`,
    kemiringan_sumbu: `${nf(p.tilt, 2)}°`,
    suhu_rata_c: p.id === 'venus' ? '465 °C' : p.id === 'merkurius' ? '167 °C' : p.id === 'bumi' ? '15 °C' : p.id === 'mars' ? '-65 °C' : '-110 °C',
    rentang_suhu: p.id === 'merkurius' ? 'Rentang ekstrem −180 °C hingga 430 °C' : p.id === 'venus' ? 'Konstan siang & malam akibat efek rumah kaca' : 'Bervariasi sesuai musim dan letak lintang',
    usia_planet: '± 4,5 miliar tahun',
    subteks_usia: 'Terbentuk bersamaan dengan pembentukan Tata Surya',
    judul_rotasi: retro ? 'Arah Rotasi Terbalik (Retrograd)' : 'Arah Rotasi Searah (Prograd)',
    deskripsi_rotasi: retro
      ? `Karena kemiringan sumbunya mencapai ${nf(p.tilt, 1)}°, planet ini berputar terbalik dibandingkan mayoritas planet lain. Di sini Matahari terbit dari barat.`
      : `Planet berotasi searah jarum jam relatif terhadap kutub utara ekliptika dengan kemiringan sumbu ${nf(p.tilt, 1)}°.`,
  };
}

// State terpusat (singleton reaktif)
const state = reactive({
  loading: false,
  loaded: false,
  fromSupabase: false,
  error: null,
  planets: {},          // key: local_id & supabase_id
  historyEvents: {},    // key: local_id -> array event
  phenomena: {},        // key: local_id
  questions: {},        // key: local_id -> array soal
  ships: {},            // key: local_id
  myths: [],            // array mitos/fakta
});

export async function fetchAllPublicContent(force = false) {
  // Jika sudah sukses dimuat dari Supabase dan bukan paksa muat ulang, lewati
  if (state.loaded && state.fromSupabase && !force) return state;
  if (state.loading) return state;

  state.loading = true;
  state.error = null;

  const client = getSupabaseClient();
  if (!client) {
    // Mode offline / fallback lokal jika konfigurasi Supabase tidak ditemukan
    populateWithFallback();
    state.loading = false;
    state.loaded = true;
    state.fromSupabase = false;
    return state;
  }

  try {
    const [planetsRes, historyRes, phenoRes, questionsRes, shipsRes, mythsRes] = await Promise.all([
      client.from('planets').select('*').eq('is_active', true).order('urutan_planet'),
      client.from('history_events').select('*').order('tahun_kejadian'),
      client.from('phenomena').select('*').eq('is_active', true),
      client.from('questions').select('*').order('created_at'),
      client.from('ships').select('*'),
      client.from('myths').select('*').eq('is_active', true).order('created_at'),
    ]);

    // Audit galat Supabase tanpa ditelan diam-diam
    let tableErrorCount = 0;
    if (planetsRes.error) {
      console.warn('[AstroSphere Supabase Error] planets:', planetsRes.error.message);
      tableErrorCount++;
    }
    if (historyRes.error) {
      console.warn('[AstroSphere Supabase Error] history_events:', historyRes.error.message);
      tableErrorCount++;
    }
    if (phenoRes.error) {
      console.warn('[AstroSphere Supabase Error] phenomena:', phenoRes.error.message);
      tableErrorCount++;
    }
    if (questionsRes.error) {
      console.warn('[AstroSphere Supabase Error] questions:', questionsRes.error.message);
      tableErrorCount++;
    }
    if (shipsRes.error) {
      console.warn('[AstroSphere Supabase Error] ships:', shipsRes.error.message);
      tableErrorCount++;
    }
    if (mythsRes.error) {
      console.warn('[AstroSphere Supabase Error] myths:', mythsRes.error.message);
      tableErrorCount++;
    }

    // 1. Petakan Planet (Simpan di dua kunci: ID lokal dan ID Supabase agar lookup selalu berhasil)
    if (planetsRes.data && planetsRes.data.length > 0) {
      const pMap = {};
      for (const row of planetsRes.data) {
        const localId = toLocalPlanetId(row.planet_id);
        const fb = getFallbackScientificData(localId) || {};
        const planetItem = {
          ...fb,
          ...row,
          local_id: localId,
        };
        pMap[localId] = planetItem;
        if (row.planet_id && row.planet_id !== localId) {
          pMap[row.planet_id] = planetItem;
        }
      }
      state.planets = pMap;
    } else {
      fillPlanetsFallback();
    }

    // 2. Petakan History Events
    if (historyRes.data && historyRes.data.length > 0) {
      const hMap = {};
      for (const row of historyRes.data) {
        const localId = toLocalPlanetId(row.planet_id);
        if (!hMap[localId]) hMap[localId] = [];
        const eventItem = {
          id: row.event_id,
          planet_id: row.planet_id,
          local_planet_id: localId,
          year: row.tahun_kejadian,
          tahun_kejadian: row.tahun_kejadian,
          era_label: row.era_label || 'Sejarah & Bentang Alam',
          title: row.judul,
          judul: row.judul,
          kategori_poi: row.kategori_poi || 'Titik Observasi',
          locationType: row.kategori_poi || 'surface',
          actor: row.nama_wahana || 'Wahana Antariksa',
          nama_wahana: row.nama_wahana || '',
          karakteristik_fisik: row.karakteristik_fisik || '',
          body: row.ringkasan_singkat || row.deskripsi?.slice(0, 120) || '',
          ringkasan_singkat: row.ringkasan_singkat || '',
          detail: row.deskripsi || '',
          deskripsi: row.deskripsi || '',
          gambar_url: row.gambar_url || '',
          sumber_referensi: row.sumber_referensi || '',
        };
        hMap[localId].push(eventItem);
        if (row.planet_id && row.planet_id !== localId) {
          if (!hMap[row.planet_id]) hMap[row.planet_id] = [];
          hMap[row.planet_id].push(eventItem);
        }
      }
      state.historyEvents = hMap;
    } else {
      fillHistoryFallback();
    }

    // 3. Petakan Fenomena
    if (phenoRes.data && phenoRes.data.length > 0) {
      const phMap = {};
      for (const row of phenoRes.data) {
        const localId = toLocalPlanetId(row.planet_id);
        const localPh = PHENOMENA[localId] || {};
        const phenoItem = {
          ...localPh,
          phenomenon_id: row.phenomenon_id,
          planet_id: row.planet_id,
          title: row.judul || localPh.title,
          judul: row.judul || localPh.title,
          short: row.deskripsi_edukatif || row.deskripsi_singkat || localPh.short,
          deskripsi_edukatif: row.deskripsi_edukatif || row.deskripsi_singkat || localPh.short,
          tombol_aksi_label: row.tombol_aksi_label || localPh.tombol_aksi_label || 'Putar Simulasi Fenomena',
          tipe_animasi: row.tipe_animasi || localPh.tipe_animasi || 'CUSTOM_ALIGNMENT',
          konfigurasi_visual: row.konfigurasi_visual || localPh.konfigurasi_visual || {},
          penjelasan_matahari: row.penjelasan_matahari || row.konfigurasi_visual?.penjelasan_matahari || '',
          penjelasan_bulan: row.penjelasan_bulan || row.konfigurasi_visual?.penjelasan_bulan || '',
          judul_matahari: row.judul_matahari || row.konfigurasi_visual?.judul_matahari || '',
          judul_bulan: row.judul_bulan || row.konfigurasi_visual?.judul_bulan || '',
          is_active: row.is_active !== false,
        };
        phMap[localId] = phenoItem;
        if (row.planet_id && row.planet_id !== localId) {
          phMap[row.planet_id] = phenoItem;
        }
      }
      state.phenomena = phMap;
    } else {
      fillPhenomenaFallback();
    }

    // 4. Petakan Soal Kuis
    if (questionsRes.data && questionsRes.data.length > 0) {
      const qMap = {};
      for (const row of questionsRes.data) {
        const localId = toLocalPlanetId(row.planet_id);
        if (!qMap[localId]) qMap[localId] = { topic: `Kuis ${localId}`, questions: [] };

        let options = [];
        if (Array.isArray(row.opsi)) {
          options = row.opsi;
        } else if (Array.isArray(row.pilihan_jawaban)) {
          options = row.pilihan_jawaban;
        } else if (row.pilihan_a != null) {
          options = [row.pilihan_a, row.pilihan_b, row.pilihan_c, row.pilihan_d].filter(Boolean);
        }

        let answer = 0;
        if (Number.isInteger(row.kunci_jawaban)) {
          answer = row.kunci_jawaban;
        } else if (typeof row.jawaban_benar === 'string') {
          const map = { A: 0, B: 1, C: 2, D: 3 };
          answer = map[row.jawaban_benar.toUpperCase()] ?? 0;
        }

        const qItem = {
          id: row.question_id,
          text: row.soal || row.pertanyaan || row.teks_soal || '',
          options,
          answer,
          explanation: row.pembahasan_edukatif || row.penjelasan || row.penjelasan_pembahasan || '',
          points: row.bobot_poin || row.poin_hadiah || 50,
        };
        qMap[localId].questions.push(qItem);
        if (row.planet_id && row.planet_id !== localId) {
          if (!qMap[row.planet_id]) qMap[row.planet_id] = { topic: `Kuis ${row.planet_id}`, questions: [] };
          qMap[row.planet_id].questions.push(qItem);
        }
      }
      state.questions = qMap;
    } else {
      fillQuestionsFallback();
    }

    // 5. Petakan Pesawat
    if (shipsRes.data && shipsRes.data.length > 0) {
      const sMap = {};
      for (const row of shipsRes.data) {
        const localId = toLocalShipId(row.ship_id);
        const localS = SHIPS[localId] || {};
        const shipItem = {
          ...localS,
          name: row.nama || localS.name,
          desc: row.deskripsi || localS.desc,
          price: row.harga_poin ?? row.biaya_bintang ?? localS.price ?? 0,
          length: row.panjang_meter ? `${row.panjang_meter} m` : localS.length,
        };
        sMap[localId] = shipItem;
        if (row.ship_id && row.ship_id !== localId) {
          sMap[row.ship_id] = shipItem;
        }
      }
      state.ships = sMap;
    } else {
      fillShipsFallback();
    }

    // 6. Petakan Mitos atau Fakta (public.myths)
    if (mythsRes.data && mythsRes.data.length > 0) {
      state.myths = mythsRes.data.map((row) => ({
        id: row.slug || row.myth_id,
        myth_id: row.myth_id,
        s: row.pernyataan,
        pernyataan: row.pernyataan,
        fact: row.is_fact,
        is_fact: row.is_fact,
        why: row.penjelasan,
        penjelasan: row.penjelasan,
        src: row.sumber_referensi || 'NASA',
        sumber_referensi: row.sumber_referensi || 'NASA',
        points: row.bobot_poin || 10,
        body: row.benda_langit || 'bumi',
        is_active: row.is_active !== false,
      }));
    } else {
      fillMythsFallback();
    }

    const hasAnyLiveSuccess = (planetsRes.data?.length > 0) || (historyRes.data?.length > 0) || (phenoRes.data?.length > 0) || (questionsRes.data?.length > 0) || (mythsRes.data?.length > 0);
    state.fromSupabase = hasAnyLiveSuccess;
    state.loaded = true;

    if (hasAnyLiveSuccess) {
      const totalEvents = Object.values(state.historyEvents).flat().length;
      const totalQuizzes = Object.values(state.questions).reduce((acc, q) => acc + (q.questions?.length || 0), 0);
      console.info(`[AstroSphere] Data LIVE Supabase berhasil dimuat: ${planetsRes.data?.length || 0} planet, ${phenoRes.data?.length || 0} fenomena, ${totalEvents} sejarah/POI, ${totalQuizzes} soal kuis, ${shipsRes.data?.length || 0} pesawat, ${state.myths.length} mitos/fakta.`);
    } else if (tableErrorCount > 0) {
      console.warn('[AstroSphere] Kueri Supabase mengembalikan galat pada seluruh tabel, menggunakan data cadangan lokal.');
    }
  } catch (err) {
    console.warn('[AstroSphere] Gagal mengambil data Supabase, menggunakan data lokal:', err);
    state.error = err.message || String(err);
    populateWithFallback();
    state.fromSupabase = false;
    state.loaded = true;
  } finally {
    state.loading = false;
  }

  return state;
}

function fillPlanetsFallback() {
  const pMap = {};
  for (const p of PLANETS) {
    const item = getFallbackScientificData(p.id);
    pMap[p.id] = item;
    const supId = toSupabasePlanetId(p.id);
    if (supId !== p.id) pMap[supId] = item;
  }
  state.planets = pMap;
}

function fillHistoryFallback() {
  const hMap = {};
  for (const [planetId, list] of Object.entries(HISTORY)) {
    const items = list.map((e) => ({
      ...e,
      tahun_kejadian: e.year,
      judul: e.title,
      ringkasan_singkat: e.body,
      deskripsi: e.detail || e.body,
      kategori_poi: e.locationType || 'Titik Observasi',
      nama_wahana: e.actor || '',
      karakteristik_fisik: '',
      gambar_url: '',
      sumber_referensi: 'NASA / Arsip Sejarah Antariksa',
      era_label: e.year < 1609 ? 'Kuno' : e.year < 1957 ? 'Teleskopik' : 'Era Antariksa',
    }));
    hMap[planetId] = items;
    const supId = toSupabasePlanetId(planetId);
    if (supId !== planetId) hMap[supId] = items;
  }
  state.historyEvents = hMap;
}

function fillPhenomenaFallback() {
  const phMap = { ...PHENOMENA };
  for (const [k, v] of Object.entries(PHENOMENA)) {
    const supId = toSupabasePlanetId(k);
    if (supId !== k) phMap[supId] = v;
  }
  state.phenomena = phMap;
}

function fillQuestionsFallback() {
  const qMap = { ...QUIZ };
  for (const [k, v] of Object.entries(QUIZ)) {
    const supId = toSupabasePlanetId(k);
    if (supId !== k) qMap[supId] = v;
  }
  state.questions = qMap;
}

function fillShipsFallback() {
  const sMap = { ...SHIPS };
  for (const [k, v] of Object.entries(SHIPS)) {
    const supId = toSupabaseShipId(k);
    if (supId !== k) sMap[supId] = v;
  }
  state.ships = sMap;
}

function fillMythsFallback() {
  state.myths = MYTHS.map((m) => ({
    ...m,
    is_fact: m.fact,
    pernyataan: m.s,
    penjelasan: m.why,
    sumber_referensi: m.src,
    bobot_poin: 10,
    is_active: true,
  }));
}

function populateWithFallback() {
  fillPlanetsFallback();
  fillHistoryFallback();
  fillPhenomenaFallback();
  fillQuestionsFallback();
  fillShipsFallback();
  fillMythsFallback();
}

// Inisialisasi awal dengan data fallback aman agar state langsung terisi secara reaktif sejak detik pertama
populateWithFallback();

export function useSupabaseContent() {
  return {
    state,
    fetchAllPublicContent,
    loadAll: fetchAllPublicContent,
    fetchAll: fetchAllPublicContent,
    isLoaded: computed(() => state.loaded),
    isLoading: computed(() => state.loading),
    fromSupabase: computed(() => state.fromSupabase),
    getPlanet: (id) => {
      if (!id) return null;
      const localId = toLocalPlanetId(id);
      return state.planets[localId] || state.planets[id] || getFallbackScientificData(localId) || getFallbackScientificData(id) || null;
    },
    getHistory: (id) => {
      if (!id) return [];
      const localId = toLocalPlanetId(id);
      return state.historyEvents[localId] || state.historyEvents[id] || HISTORY[localId] || HISTORY[id] || [];
    },
    getPhenomenon: (id) => {
      if (!id) return null;
      const localId = toLocalPlanetId(id);
      return state.phenomena[localId] || state.phenomena[id] || PHENOMENA[localId] || PHENOMENA[id] || null;
    },
    getQuiz: (id) => {
      if (!id) return null;
      const localId = toLocalPlanetId(id);
      return state.questions[localId] || state.questions[id] || QUIZ[localId] || QUIZ[id] || null;
    },
    getShips: () => (Object.keys(state.ships).length ? state.ships : SHIPS),
    getMyths: () => (state.myths.length ? state.myths : MYTHS),
    myths: computed(() => (state.myths.length ? state.myths : MYTHS)),
  };
}

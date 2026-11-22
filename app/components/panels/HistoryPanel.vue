<script setup>
// Mode Sejarah: Lini masa per benda langit dengan dukungan data Supabase & Fallback Lokal.
// Fitur:
// 1. Filter 2 Tingkat:
//    - Khusus Bumi: Tingkat 1 (6 Zaman Baku + Semua Zaman), Tingkat 2 jika Zaman Modern (Rentang 1 Abad).
//    - Planet Lain: Filter Era Fleksibel (Semua, Kuno, Teleskopik, Era Antariksa).
// 2. Alur Navigasi: Daftar Kartu Lini Masa <-> Jendela Detail Terstruktur.
// 3. Detail Lengkap: Foto/Banner, 4 Baris Metadata, Deskripsi Narasi, Memorial Gugur Tugas, Sumber Referensi, & Aksi 3D.
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { store, game, showToast } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { isSafeMediaUrl } from '~/utils/mediaSecurity.js';
import { getEventCoords } from '~/game/system.js';
import { ERAS, LOCATION_LABEL } from '~/data/history.js';
import { PLANETS, MOONS } from '~/data/solarSystem.js';

const { getHistory } = useSupabaseContent();

const body = computed(() => store.sejarah.body);
const info = computed(() => PLANETS.find((p) => p.id === body.value) || MOONS.find((m) => m.id === body.value));
const isEarth = computed(() => body.value === 'bumi');

// Mode Tampilan: 'list' (daftar kartu) atau 'detail' (detail satu peristiwa)
const viewMode = ref('list');

// Definisi Filter Tingkat 1 untuk Bumi (6 Zaman Baku + Pilihan Semua)
const EARTH_ERAS = [
  { id: 'semua', label: 'Semua Zaman', min: -Infinity, max: Infinity },
  { id: 'awal_purba', label: 'Awal Bumi & Purba', sub: '≤ 250 Jt SM', min: -Infinity, max: -250000000 },
  { id: 'dinosaurus', label: 'Dinosaurus & Kapur', sub: '250–66 Jt SM', min: -250000000, max: -66000000 },
  { id: 'manusia_purba', label: 'Manusia Purba & Batu', sub: '66 Jt–3000 SM', min: -66000000, max: -3000 },
  { id: 'kuno_kenabian', label: 'Peradaban Kuno & Kenabian', sub: '3000 SM–500 M', min: -3000, max: 500 },
  { id: 'pertengahan_nusantara', label: 'Pertengahan & Nusantara', sub: '500–1499 M', min: 500, max: 1499 },
  { id: 'modern', label: 'Zaman Modern', sub: '1500–Kini', min: 1500, max: Infinity },
];

// Definisi Filter Tingkat 2 untuk Zaman Modern (Rentang 1 Abad)
const MODERN_CENTURIES = [
  { id: 'semua', label: 'Semua Abad Modern', min: 1500, max: Infinity },
  { id: '1500-1599', label: '1500 – 1599 (Abad 16)', min: 1500, max: 1599 },
  { id: '1600-1699', label: '1600 – 1699 (Abad 17)', min: 1600, max: 1699 },
  { id: '1700-1799', label: '1700 – 1799 (Abad 18)', min: 1700, max: 1799 },
  { id: '1800-1899', label: '1800 – 1899 (Abad 19)', min: 1800, max: 1899 },
  { id: '1900-1999', label: '1900 – 1999 (Abad 20)', min: 1900, max: 1999 },
  { id: '2000-now', label: '2000 – Sekarang (Abad 21)', min: 2000, max: Infinity },
];

const selectedEarthEra = ref('semua');
const selectedCentury = ref('semua');
const selectedNonEarthEra = ref(store.sejarah.era || 'semua');

// Ambil seluruh peristiwa untuk planet aktif
const allEvents = computed(() => getHistory(body.value) || []);
const totalCount = computed(() => allEvents.value.length);

// Saring daftar berdasarkan filter aktif
const filteredList = computed(() => {
  const events = allEvents.value;
  if (!events.length) return [];

  if (isEarth.value) {
    const eraConfig = EARTH_ERAS.find((e) => e.id === selectedEarthEra.value) || EARTH_ERAS[0];

    // Jika memilih Zaman Modern, terapkan filter Tingkat 2
    if (selectedEarthEra.value === 'modern') {
      const centConfig = MODERN_CENTURIES.find((c) => c.id === selectedCentury.value) || MODERN_CENTURIES[0];
      return events.filter((e) => e.year >= centConfig.min && e.year <= centConfig.max);
    }

    return events.filter((e) => e.year >= eraConfig.min && e.year <= eraConfig.max);
  }

  // Untuk planet selain Bumi
  const era = ERAS.find((e) => e.id === selectedNonEarthEra.value) || ERAS[0];
  return events.filter((e) => e.year >= era.from && e.year <= era.to);
});

// Peristiwa yang sedang dipilih
const currentEvent = computed(() => {
  if (store.sejarah.selected) {
    const found = allEvents.value.find((e) => e.id === store.sejarah.selected);
    if (found) return found;
  }
  return filteredList.value[0] || allEvents.value[0] || null;
});

// Format Tahun yang human-friendly
function formatYear(yr) {
  if (yr == null) return '—';
  const num = Number(yr);
  if (isNaN(num)) return String(yr);
  if (num <= -1000000) return `± ${(Math.abs(num) / 1000000).toLocaleString('id-ID')} Juta Tahun SM`;
  if (num <= -1000) return `± ${(Math.abs(num) / 1000).toLocaleString('id-ID')} Ribu Tahun SM`;
  if (num < 0) return `${Math.abs(num)} SM`;
  return `${num} M`;
}

// Label Singkat Era untuk non-Bumi
const ERA_SHORT = { semua: 'Semua', kuno: 'Kuno', teleskopik: 'Teleskop', antariksa: 'Era antariksa' };

// Pelacakan status sisi jauh planet dari game engine
const far = ref({});
let pollTimer = 0;
const scroller = ref(null);

function scrollToSelected() {
  nextTick(() => {
    const elNode = scroller.value?.querySelector('.ev-card.is-active');
    if (elNode) {
      elNode.scrollIntoView({ block: 'nearest', behavior: store.settings.reduceMotion ? 'auto' : 'smooth' });
    }
  });
}

function handleKeyDown(e) {
  if (e.code === 'Escape' && viewMode.value === 'detail') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    backToList();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown, true);
  pollTimer = setInterval(() => {
    const s = game()?.poiStatus() || [];
    far.value = Object.fromEntries(s.map((x) => [x.id, x.far]));
  }, 500);
  nextTick(() => {
    game()?.buildPOIs(filteredList.value);
  });
  scrollToSelected();
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true);
  if (pollTimer) clearInterval(pollTimer);
});

watch(() => store.sejarah.selected, scrollToSelected);

// Aksi memilih kartu
function selectCard(eventItem, openDetail = true) {
  store.sejarah.selected = eventItem.id;
  game()?.selectEvent(eventItem.id);
  if (openDetail) {
    viewMode.value = 'detail';
  }
}

// Kembali ke tampilan daftar
function backToList() {
  viewMode.value = 'list';
  scrollToSelected();
}

// Watch pergantian filter untuk menyinkronkan ke Game POI Three.js
watch([selectedEarthEra, selectedCentury, selectedNonEarthEra], async () => {
  if (isEarth.value) {
    store.sejarah.era = selectedEarthEra.value === 'modern' ? 'antariksa' : selectedEarthEra.value;
  } else {
    store.sejarah.era = selectedNonEarthEra.value;
  }

  // Pilih item pertama dari hasil filter jika item lama tidak ada di filter
  if (!filteredList.value.some((e) => e.id === store.sejarah.selected)) {
    store.sejarah.selected = filteredList.value[0]?.id || null;
  }
  await nextTick();
  game()?.buildPOIs(filteredList.value);
});

// Keterangan titik lokasi (mendukung 100% data Supabase & fallback via Fibonacci Sphere)
function where(e) {
  if (!e) return '—';
  const coords = getEventCoords(e);
  const la = `${Math.abs(coords.lat).toFixed(1)}° ${coords.lat >= 0 ? 'LU' : 'LS'}`;
  const lo = `${(coords.lon > 180 ? 360 - coords.lon : coords.lon).toFixed(1)}° ${coords.lon > 180 ? 'BB' : 'BT'}`;
  return `${la}, ${lo}${far.value[e.id] ? ' · di sisi jauh' : ''}`;
}

// Arahkan kamera 3D ke lokasi
function focusLoc() {
  if (!game()?.focusLocation()) {
    showToast('Kamera memutar ke posisi peristiwa di permukaan planet.');
  }
}
</script>

<template>
  <div>
    <!-- Judul Panggung Kiri Atas -->
    <div class="stage-title">
      <span class="tag">{{ totalCount }} peristiwa</span>
      <h1 class="h1">{{ info?.name }}</h1>
    </div>

    <!-- Bilah Waktu Observasi Kiri Bawah -->
    <div class="stage-bottom">
      <PanelsTimeBar :body="body !== 'bulan' ? body : ''" />
    </div>

    <!-- Panel Sisi Kanan: Lini Masa Sejarah -->
    <aside class="sheet card" aria-label="Lini masa sejarah">
      <div ref="scroller" class="sbody scroll">

        <!-- ========================================== -->
        <!-- MODE 1: DAFTAR KARTU LINI MASA (LIST VIEW) -->
        <!-- ========================================== -->
        <template v-if="viewMode === 'list'">
          <div class="header-sec">
            <h2 class="h3">Lini Masa Sejarah</h2>
            <p class="small">Pengamatan astronomi, pendaratan wahana, dan peristiwa penting di {{ info?.name }}.</p>
          </div>

          <!-- FILTER TINGKAT 1: KHUSUS BUMI (6 ZAMAN BAKU) -->
          <div v-if="isEarth" class="filter-group">
            <span class="filter-label">Filter Tingkat 1: Periode Zaman</span>
            <div class="hscroll" role="tablist" aria-label="Pilih Zaman">
              <button
                v-for="e in EARTH_ERAS"
                :key="e.id"
                class="chip"
                role="tab"
                :aria-selected="selectedEarthEra === e.id"
                :class="{ on: selectedEarthEra === e.id }"
                @click="selectedEarthEra = e.id"
              >
                <span>{{ e.label }}</span>
                <small v-if="e.sub" class="chip-sub">{{ e.sub }}</small>
              </button>
            </div>
          </div>

          <!-- FILTER TINGKAT 2: KHUSUS SAAT ZAMAN MODERN TERPILIH DI BUMI -->
          <div v-if="isEarth && selectedEarthEra === 'modern'" class="filter-group sub-filter">
            <span class="filter-label"><UiIcon name="sejarah" :size="13" /> Filter Tingkat 2: Rentang Abad Modern</span>
            <div class="hscroll" role="tablist" aria-label="Pilih Abad">
              <button
                v-for="c in MODERN_CENTURIES"
                :key="c.id"
                class="chip sm"
                role="tab"
                :aria-selected="selectedCentury === c.id"
                :class="{ on: selectedCentury === c.id }"
                @click="selectedCentury = c.id"
              >
                {{ c.label }}
              </button>
            </div>
          </div>

          <!-- FILTER NON-BUMI: 4 ERA ASTRONOMI STANDAR -->
          <div v-if="!isEarth" class="filter-group">
            <span class="filter-label">Periode Observasi</span>
            <div class="hscroll" role="tablist" aria-label="Pilih era">
              <button
                v-for="e in ERAS"
                :key="e.id"
                class="chip"
                role="tab"
                :aria-selected="selectedNonEarthEra === e.id"
                :class="{ on: selectedNonEarthEra === e.id }"
                @click="selectedNonEarthEra = e.id"
              >
                {{ ERA_SHORT[e.id] || e.label }}
              </button>
            </div>
          </div>

          <!-- DAFTAR KARTU VERTIKAL -->
          <ol class="tl">
            <li v-if="!filteredList.length" class="empty-state card flat">
              <UiIcon name="info" :size="24" />
              <p>Belum ada peristiwa pada rentang zaman/era ini. Silakan pilih era atau abad lainnya.</p>
            </li>

            <li
              v-for="e in filteredList"
              :key="e.id"
              class="ev-card"
              :class="{
                'is-active': e.id === store.sejarah.selected,
                'is-memorial': e.memorial
              }"
              @click="selectCard(e, true)"
            >
              <!-- Penanda Garis Waktu & Tahun -->
              <div class="ev-header">
                <span class="ev-year num">{{ formatYear(e.year || e.tahun_kejadian) }}</span>
                <span class="badge-tag" :class="{ 'tag-memorial': e.memorial }">
                  {{ e.kategori_poi || (e.memorial ? 'Kenangan Pahlawan' : 'Observasi') }}
                </span>
              </div>

              <!-- Isi Ringkas Kartu -->
              <div class="ev-body">
                <div class="ev-thumb" v-if="e.gambar_url && isSafeMediaUrl(e.gambar_url)">
                  <img :src="e.gambar_url" :alt="e.judul || e.title" loading="lazy" />
                </div>
                <div class="ev-text">
                  <h3 class="ev-title">{{ e.judul || e.title }}</h3>
                  <div class="ev-meta">
                    <span class="ev-actor">{{ e.nama_wahana || e.actor }}</span>
                    <span v-if="e.karakteristik_fisik" class="ev-dot">·</span>
                    <span v-if="e.karakteristik_fisik" class="ev-char">{{ e.karakteristik_fisik }}</span>
                  </div>
                  <p class="ev-desc">{{ e.ringkasan_singkat || e.body }}</p>
                </div>
              </div>

              <!-- Baris Aksi Kartu -->
              <div class="ev-footer">
                <button
                  type="button"
                  class="btn-detail-link"
                  @click.stop="selectCard(e, true)"
                >
                  Buka Detail <UiIcon name="lanjut" :size="14" />
                </button>
                <span v-if="e.lat != null" class="ev-coords-pill">
                  <UiIcon name="target" :size="13" /> Titik Permukaan
                </span>
              </div>
            </li>
          </ol>
        </template>

        <!-- ============================================== -->
        <!-- MODE 2: JENDELA DETAIL TERSTRUKTUR (DETAIL VIEW) -->
        <!-- ============================================== -->
        <template v-else-if="viewMode === 'detail' && currentEvent">
          <div class="detail-container">
            <!-- Tombol Navigasi Kembali -->
            <button type="button" class="btn sm ghost back-btn" @click="backToList">
              <UiIcon name="kembali" :size="16" />
              <span>Kembali ke Lini Masa</span>
            </button>

            <!-- Media Foto / Gambar Peristiwa -->
            <div class="detail-media">
              <div v-if="currentEvent.gambar_url && isSafeMediaUrl(currentEvent.gambar_url)" class="media-frame">
                <img :src="currentEvent.gambar_url" :alt="currentEvent.judul || currentEvent.title" class="media-img" />
              </div>
              <div v-else class="media-placeholder">
                <UiIcon :name="currentEvent.memorial ? 'bintang-o' : 'target'" :size="36" />
                <span>Dokumentasi Observasi Antariksa</span>
              </div>
            </div>

            <!-- Header Detail -->
            <div class="detail-header">
              <div class="detail-badge-row">
                <span class="badge-tag" :class="{ 'tag-memorial': currentEvent.memorial }">
                  {{ currentEvent.kategori_poi || (currentEvent.memorial ? 'Kenangan Pahlawan' : 'Observasi Ilmiah') }}
                </span>
                <span class="detail-year num">{{ formatYear(currentEvent.year || currentEvent.tahun_kejadian) }}</span>
              </div>
              <h2 class="h2 detail-title">{{ currentEvent.judul || currentEvent.title }}</h2>
            </div>

            <!-- 4 Baris Metadata Terstruktur -->
            <div class="meta-box card flat">
              <div class="meta-item">
                <span class="meta-label">Kategori POI</span>
                <span class="meta-val">{{ currentEvent.kategori_poi || currentEvent.locationType || 'Observasi Ilmiah' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Status / Era</span>
                <span class="meta-val">{{ currentEvent.era_label || (isEarth ? 'Zaman Modern' : 'Era Antariksa') }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Wahana / Tokoh</span>
                <span class="meta-val">{{ currentEvent.nama_wahana || currentEvent.actor || '—' }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Karakteristik Fisik / Titik</span>
                <span class="meta-val">{{ currentEvent.karakteristik_fisik || where(currentEvent) }}</span>
              </div>
            </div>

            <!-- Kartu Kenangan (Memorial) Jika Ada -->
            <div v-if="currentEvent.memorial" class="memo-card card flat">
              <div class="memo-header">
                <UiIcon name="bintang-o" :size="16" />
                <b>Mengenang Gugur Tugas Antariksa ({{ currentEvent.memorial.date }})</b>
              </div>
              <div class="memo-sec">
                <b>Penyebab Teknis:</b>
                <p>{{ currentEvent.memorial.cause }}</p>
              </div>
              <div class="memo-sec lesson">
                <b>Pelajaran Berharga:</b>
                <p>{{ currentEvent.memorial.lesson }}</p>
              </div>
              <div class="memo-crew">
                <b>Daftar Nama Awak:</b>
                <ul>
                  <li v-for="name in currentEvent.memorial.crew" :key="name">{{ name }}</li>
                </ul>
              </div>
            </div>

            <!-- Narasi & Deskripsi Lengkap -->
            <div class="detail-narrative">
              <h4 class="narrative-heading">Uraian Sejarah</h4>
              <p class="narrative-lead">{{ currentEvent.ringkasan_singkat || currentEvent.body }}</p>
              <p v-if="currentEvent.deskripsi || currentEvent.detail" class="narrative-body">
                {{ currentEvent.deskripsi || currentEvent.detail }}
              </p>
            </div>

            <!-- Sumber Referensi -->
            <div class="ref-box">
              <span class="ref-label">Sumber Referensi Terverifikasi:</span>
              <p class="ref-val">{{ currentEvent.sumber_referensi || 'NASA / Arsip Eksplorasi Antariksa Internasional' }}</p>
            </div>

            <!-- Aksi Interaktif 3D -->
            <div class="detail-actions">
              <button class="btn primary" @click="focusLoc">
                <UiIcon name="target" :size="16" />
                <span>Lihat di 3D</span>
              </button>
              <UiToggle
                v-if="currentEvent.lat != null"
                v-model="store.toggles.follow"
                label="Kamera ikuti rotasi planet"
              />
            </div>
          </div>
        </template>

        <p class="fine">Data tersinkronisasi dengan Supabase & katalog lokal AstroSphere.</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.header-sec {
  margin-bottom: 8px;
}
.header-sec h2 {
  margin: 0 0 2px 0;
}
.header-sec .small {
  margin: 0;
  color: var(--faint);
  line-height: 1.4;
}

/* Filter Styling */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}
.filter-group.sub-filter {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: rgba(59, 108, 240, 0.08);
  border: 1px solid rgba(59, 108, 240, 0.2);
}
.filter-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: var(--faint);
}
.chip-sub {
  font-size: 10px;
  opacity: 0.75;
  margin-left: 4px;
}
.chip.sm {
  padding: 4px 9px;
  font-size: 12px;
}

/* Garis Waktu & Daftar Kartu */
.tl {
  list-style: none;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 12px 16px;
  margin: 8px 0 0 0;
}
.tl::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  border-radius: 2px;
  background: var(--line);
}

.ev-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--r-md);
  background: var(--surface-1);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ev-card::before {
  content: "";
  position: absolute;
  left: -17px;
  top: 18px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--bg);
  border: 2px solid var(--line-2);
  transition: all 0.2s;
}
.ev-card:hover {
  background: var(--surface-2);
  border-color: rgba(94, 209, 255, 0.4);
  transform: translateX(2px);
}
.ev-card.is-active {
  border-color: var(--sky);
  background: var(--surface-2);
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
}
.ev-card.is-active::before {
  background: var(--blue);
  border-color: var(--sky);
  box-shadow: 0 0 0 4px rgba(59, 108, 240, 0.35);
}

/* Memorial Card Style */
.ev-card.is-memorial::before {
  border-color: #cfd6ee;
}
.ev-card.is-memorial.is-active::before {
  background: #cfd6ee;
  border-color: #ffffff;
  box-shadow: 0 0 0 4px rgba(207, 214, 238, 0.2);
}
.ev-card.is-memorial .ev-year {
  color: #cfd6ee;
}

.ev-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ev-year {
  font-weight: 700;
  font-size: 15px;
  color: var(--sky);
  font-family: var(--display);
}
.badge-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(94, 209, 255, 0.12);
  color: var(--sky);
  border: 1px solid rgba(94, 209, 255, 0.25);
  text-transform: capitalize;
}
.badge-tag.tag-memorial {
  background: rgba(207, 214, 238, 0.12);
  color: #cfd6ee;
  border-color: rgba(207, 214, 238, 0.3);
}

.ev-body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.ev-thumb {
  flex: none;
  width: 58px;
  height: 58px;
  border-radius: var(--r-sm);
  overflow: hidden;
  border: 1px solid var(--line);
}
.ev-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.ev-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}
.ev-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text);
}
.ev-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ev-actor {
  font-weight: 500;
  color: var(--sky);
}
.ev-desc {
  margin: 3px 0 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ev-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px dashed var(--line);
  font-size: 12px;
}
.btn-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--sky);
  cursor: pointer;
  transition: transform 0.15s;
}
.btn-detail-link:hover {
  transform: translateX(3px);
  color: #fff;
}
.ev-coords-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--faint);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 13.5px;
}

/* ============================ */
/* MODE DETAIL STYLING */
/* ============================ */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.back-btn {
  align-self: flex-start;
  gap: 6px;
  font-size: 13px;
}

.detail-media {
  width: 100%;
  border-radius: var(--r-md);
  overflow: hidden;
  border: 1px solid var(--line);
}
.media-frame {
  width: 100%;
  max-height: 180px;
  overflow: hidden;
  position: relative;
}
.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.media-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 28px 16px;
  background: radial-gradient(circle at 50% 50%, rgba(59, 108, 240, 0.15) 0%, rgba(13, 17, 34, 0.8) 100%);
  color: var(--sky);
  font-size: 12.5px;
  font-weight: 500;
  border-radius: var(--r-md);
}

.detail-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.detail-year {
  font-weight: 700;
  font-size: 17px;
  color: var(--sky);
}
.detail-title {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}

/* 4 Baris Metadata Terstruktur */
.meta-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--r-md);
  background: var(--surface-2);
}
.meta-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  line-height: 1.4;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.meta-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}
.meta-label {
  color: var(--faint);
  font-weight: 500;
  flex: none;
}
.meta-val {
  color: var(--text);
  font-weight: 600;
  text-align: right;
  word-break: break-word;
}

/* Memorial */
.memo-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--r-md);
  background: rgba(207, 214, 238, 0.06);
  border: 1px solid rgba(207, 214, 238, 0.2);
}
.memo-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cfd6ee;
  font-size: 13px;
}
.memo-sec {
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}
.memo-sec b {
  color: #cfd6ee;
  display: block;
  margin-bottom: 2px;
}
.memo-sec.lesson {
  padding: 6px 8px;
  border-radius: var(--r-sm);
  background: rgba(54, 211, 154, 0.08);
  border: 1px solid rgba(54, 211, 154, 0.2);
}
.memo-sec.lesson b {
  color: var(--green);
}
.memo-crew ul {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 0 0;
  padding: 0;
}
.memo-crew li {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--surface-3);
  font-size: 11.5px;
  color: var(--text);
}

/* Narasi */
.detail-narrative {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.narrative-heading {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.narrative-lead {
  margin: 0;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.5;
}
.narrative-body {
  margin: 0;
  font-size: 13.5px;
  color: var(--muted);
  line-height: 1.55;
}

/* Rujukan / Sumber */
.ref-box {
  padding: 8px 10px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  border-left: 3px solid var(--sky);
}
.ref-label {
  display: block;
  font-size: 11px;
  color: var(--faint);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
}
.ref-val {
  margin: 2px 0 0 0;
  font-size: 12.5px;
  color: var(--muted);
}

/* Aksi 3D */
.detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.detail-actions :deep(.trow) {
  min-height: 0;
  gap: 8px;
  font-size: 13px;
}

.fine {
  font-size: 11.5px;
  color: var(--faint);
  text-align: center;
  padding: 6px 0 2px 0;
  margin: 0;
}

@media (max-width: 760px) {
  .tl {
    padding-left: 14px;
  }
  .ev-card {
    padding: 10px 12px;
  }
  .ev-thumb {
    width: 48px;
    height: 48px;
  }
  .detail-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

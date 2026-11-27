<script setup>
// Mode Sejarah: Lini masa per benda langit dengan dukungan data live Supabase & Fallback Lokal.
// Fitur:
// 1. Filter Horizontal Slide:
//    - Khusus Bumi: Tingkat 1 (6 Zaman Baku + Semua Zaman), Tingkat 2 jika Zaman Modern (Rentang 1 Abad).
//    - Planet Lain: Filter Era Fleksibel (Semua, Kuno, Teleskopik, Era Antariksa).
// 2. Alur Navigasi: Daftar Kartu Lini Masa <-> Jendela Detail Terstruktur.
// 3. Detail Lengkap: Foto/Banner, 4 Baris Metadata, Deskripsi Narasi, Memorial Gugur Tugas, Sumber Referensi, & Aksi 3D.
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { store, game, showToast } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { isSafeMediaUrl } from '~/utils/mediaSecurity.js';
import { LOCATION_LABEL } from '~/data/history.js';
import { PLANETS, MOONS } from '~/data/solarSystem.js';

const { getHistory, loadAll } = useSupabaseContent();

const body = computed(() => store.sejarah.body);
const info = computed(() => PLANETS.find((p) => p.id === body.value) || MOONS.find((m) => m.id === body.value));
const isEarth = computed(() => body.value === 'bumi');

// Mode Tampilan: 'list' (daftar kartu) atau 'detail' (detail satu peristiwa)
const viewMode = ref('list');

// Pelacakan gambar yang gagal dimuat agar tidak menampilkan broken image icon
const brokenImages = ref({});
function onImageError(id) {
  if (id) brokenImages.value[id] = true;
}

const selectedEra = ref(store.sejarah.era || 'semua');

// Ambil seluruh peristiwa aktif untuk planet secara reaktif dari Supabase composable
const allEvents = computed(() => (getHistory(body.value) || []).filter((e) => e.is_active !== false));
const totalCount = computed(() => allEvents.value.length);

// Ekstrak era unik dari data peristiwa planet secara dinamis (100% cocok dengan era_label di database)
const availableEras = computed(() => {
  const events = allEvents.value || [];
  const map = new Map();

  for (const e of events) {
    const rawLabel = (e.era_label || '').trim() || (isEarth.value ? 'Zaman Sejarah' : 'Observasi & Geologi');
    if (!map.has(rawLabel)) {
      map.set(rawLabel, {
        id: rawLabel,
        label: rawLabel,
        count: 0,
        minYear: Infinity,
      });
    }
    const item = map.get(rawLabel);
    item.count += 1;
    const yr = e.year != null ? Number(e.year) : (e.tahun_kejadian != null ? Number(e.tahun_kejadian) : 0);
    if (!isNaN(yr) && yr < item.minYear) {
      item.minYear = yr;
    }
  }

  // Urutkan era secara kronologis berdasarkan minYear (era tertua lebih dulu)
  const sorted = Array.from(map.values()).sort((a, b) => a.minYear - b.minYear);

  // Tab pertama selalu "Semua Zaman" (Bumi) atau "Semua Periode" (Non-Bumi)
  const defaultLabel = isEarth.value ? 'Semua Zaman' : 'Semua Periode';
  return [
    { id: 'semua', label: defaultLabel, count: events.length },
    ...sorted,
  ];
});

// Navigasi horizontal bar dengan roda mouse dan klik
function handleHWheel(e) {
  if (e.deltaY !== 0) {
    e.currentTarget.scrollLeft += e.deltaY;
  }
}

function selectEra(eraId, evt) {
  selectedEra.value = eraId;
  evt?.currentTarget?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

// Saring daftar berdasarkan filter aktif
const filteredList = computed(() => {
  const events = allEvents.value;
  if (!events.length) return [];

  let list = events;
  if (selectedEra.value !== 'semua') {
    list = list.filter((e) => (e.era_label || '').trim() === selectedEra.value);
  }

  return list;
});

// Peristiwa yang sedang dipilih
const currentEvent = computed(() => {
  if (store.sejarah.selected) {
    const found = allEvents.value.find((e) => e.id === store.sejarah.selected);
    if (found) return found;
  }
  return null;
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
  // Muat data live Supabase bila belum ada
  loadAll();

  // Bersihkan pilihan saat pertama kali masuk mode Sejarah
  resetSelection();

  window.addEventListener('keydown', handleKeyDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown, true);
  resetSelection();
});

watch(() => store.sejarah.selected, scrollToSelected);

// Aksi memilih kartu
function selectCard(eventItem, openDetail = true) {
  // Jika kartu yang sama diklik lagi saat di tampilan daftar, batalkan pilihan (toggle bersih)
  if (store.sejarah.selected === eventItem.id && viewMode.value === 'list') {
    resetSelection();
    return;
  }
  store.sejarah.selected = eventItem.id;
  game()?.selectEvent(eventItem.id);
  if (openDetail) {
    viewMode.value = 'detail';
  }
}

// Batalkan pilihan peristiwa dan bersihkan titik POI di bola Bumi
function resetSelection() {
  store.sejarah.selected = null;
  game()?.selectEvent(null);
  game()?.clearPOIs();
}

// Kembali ke tampilan daftar
function backToList() {
  viewMode.value = 'list';
  scrollToSelected();
}

// Watch pergantian filter: bersihkan titik POI dan reset pilihan (ATURAN 1)
watch(selectedEra, () => {
  store.sejarah.era = selectedEra.value;
  resetSelection();
  viewMode.value = 'list';
});

// Watch pergantian planet (body) untuk mereset filter dan bersihkan titik
watch(body, () => {
  selectedEra.value = 'semua';
  resetSelection();
  viewMode.value = 'list';
});

// Watch perubahan daftar ketika data Supabase baru selesai dimuat
watch(filteredList, (newList) => {
  if (store.sejarah.selected && !newList.some((e) => e.id === store.sejarah.selected)) {
    resetSelection();
  }
});

// Keterangan titik lokasi / karakteristik fisik
function where(e) {
  if (!e) return '—';
  return e.karakteristik_fisik || 'Observasi Permukaan / Eksplorasi';
}

// Teks narasi lengkap (menghindari duplikasi bila sama dengan ringkasan singkat)
const narrativeBodyText = computed(() => {
  const ev = currentEvent.value;
  if (!ev) return '';
  const bodyText = (ev.deskripsi || ev.detail || '').trim();
  const leadText = (ev.ringkasan_singkat || ev.body || '').trim();
  if (bodyText === leadText) return '';
  return bodyText;
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Fitur Unduh PDF via invisible iframe siap cetak / simpan PDF dengan layout rapi
function downloadPdf() {
  if (!currentEvent.value) return;
  const ev = currentEvent.value;
  const planetName = info.value?.name || body.value || 'Tata Surya';
  const yearText = formatYear(ev.year || ev.tahun_kejadian);
  const title = ev.judul || ev.title || 'Peristiwa Sejarah';
  const category = ev.kategori_poi || ev.locationType || (ev.memorial ? 'Kenangan Pahlawan' : 'Observasi Ilmiah');
  const era = ev.era_label || (isEarth.value ? 'Zaman Modern' : 'Era Antariksa');
  const actor = ev.nama_wahana || ev.actor || '—';
  const characteristic = ev.karakteristik_fisik || '';
  const lead = ev.ringkasan_singkat || ev.body || '';
  const narrative = ev.deskripsi || ev.detail || '';
  const refSource = ev.sumber_referensi || 'NASA / Arsip Eksplorasi Antariksa Internasional';
  const imageUrl = isSafeMediaUrl(ev.gambar_url) && !brokenImages.value[ev.id] ? ev.gambar_url.trim() : '';

  showToast('Mempersiapkan dokumen PDF untuk dicetak/disimpan...');

  let iframe = document.getElementById('astrosphere-pdf-iframe');
  if (iframe) iframe.remove();

  iframe = document.createElement('iframe');
  iframe.id = 'astrosphere-pdf-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - AstroSphere</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap">
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Poppins', sans-serif;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.6;
      font-size: 13px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand {
      font-size: 20px;
      font-weight: 600;
      color: #0369a1;
      letter-spacing: -0.02em;
    }
    .brand span {
      color: #0284c7;
      font-weight: 400;
    }
    .doc-type {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 12px;
      color: #475569;
      font-weight: 500;
    }
    .meta-micro {
      font-size: 11px;
      font-weight: 600;
      color: #0284c7;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      color: #0f172a;
      line-height: 1.3;
      margin: 0 0 16px 0;
    }
    .event-image-container {
      width: 100%;
      margin: 0 0 16px 0;
      text-align: center;
    }
    .event-img {
      width: 100%;
      max-height: 220px;
      object-fit: cover;
      border-radius: 10px;
      display: block;
    }
    .meta-card {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .meta-card td {
      padding: 8px 14px;
      font-size: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .meta-card tr:last-child td {
      border-bottom: none;
    }
    .meta-label {
      width: 150px;
      color: #64748b;
      font-weight: 600;
    }
    .meta-val {
      color: #0f172a;
      font-weight: 500;
    }
    .meta-val.cat {
      color: #0284c7;
      font-weight: 600;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0369a1;
      margin: 20px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #0284c7;
    }
    .lead-text {
      font-size: 13.5px;
      font-weight: 500;
      color: #1e293b;
      line-height: 1.65;
      margin: 0 0 10px 0;
    }
    .body-text {
      font-size: 13px;
      color: #334155;
      line-height: 1.65;
      margin: 0 0 14px 0;
    }
    .ref-box {
      margin-top: 24px;
      padding: 10px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .ref-title {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .ref-text {
      margin: 3px 0 0 0;
      font-size: 12px;
      color: #334155;
      line-height: 1.5;
    }
    .footer {
      margin-top: 36px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Astro<span>Sphere</span></div>
      <div class="doc-type">Arsip Lini Masa Eksplorasi Antariksa</div>
    </div>
    <div class="header-right">
      Planet ${escapeHtml(planetName)} · ${escapeHtml(yearText)}
    </div>
  </div>

  <div class="meta-micro">${escapeHtml(planetName.toUpperCase())} · SEJARAH & OBSERVASI // ${escapeHtml(yearText)}</div>
  <h1>${escapeHtml(title)}</h1>

  ${imageUrl ? `
  <div class="event-image-container">
    <img id="pdf-event-img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" class="event-img">
  </div>` : ''}

  <table class="meta-card">
    <tr>
      <td class="meta-label">Kategori:</td>
      <td class="meta-val cat">${escapeHtml(category)}</td>
    </tr>
    <tr>
      <td class="meta-label">Status / Era:</td>
      <td class="meta-val">${escapeHtml(era)}</td>
    </tr>
    <tr>
      <td class="meta-label">Wahana / Tokoh:</td>
      <td class="meta-val">${escapeHtml(actor)}</td>
    </tr>
    ${characteristic && characteristic !== '—' ? `
    <tr>
      <td class="meta-label">Karakteristik:</td>
      <td class="meta-val">${escapeHtml(characteristic)}</td>
    </tr>` : ''}
  </table>

  <div class="section-title">Deskripsi Ilmiah & Sejarah</div>
  ${lead ? `<p class="lead-text">${escapeHtml(lead)}</p>` : ''}
  ${narrative && narrative !== lead ? `<p class="body-text">${escapeHtml(narrative)}</p>` : ''}

  <div class="ref-box">
    <div class="ref-title">Sumber Referensi:</div>
    <div class="ref-text">${escapeHtml(refSource)}</div>
  </div>

  <div class="footer">
    <div>Dokumen Resmi Arsip Sejarah AstroSphere</div>
    <div>Dicetak: ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
</body>
</html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print error:', e);
    }
  };

  const imgEl = doc.getElementById('pdf-event-img');
  if (imgEl && !imgEl.complete) {
    let triggered = false;
    const onDone = () => {
      if (triggered) return;
      triggered = true;
      triggerPrint();
    };
    imgEl.onload = onDone;
    imgEl.onerror = onDone;
    setTimeout(onDone, 1200);
  } else {
    setTimeout(triggerPrint, 350);
  }
}
</script>

<template>
  <div>
    <!-- Judul Panggung Kiri Atas (Seragam PlanetPanel.vue) -->
    <div class="stage-title">
      <span class="stage-eyebrow">LINI MASA SEJARAH · {{ totalCount }} PERISTIWA</span>
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
            <div class="header-title-row">
              <h2 class="h3">Lini Masa Sejarah</h2>
            </div>
            <p class="small">Pengamatan astronomi, pendaratan wahana, dan peristiwa penting di {{ info?.name }}.</p>
          </div>

          <!-- FILTER PERIODE ZAMAN / OBSERVASI (HORIZONTAL SLIDE BAR SATU BARIS FIGMA) -->
          <div v-if="availableEras.length > 1" class="filter-group">
            <span class="filter-label">{{ isEarth ? 'Periode Zaman' : 'Periode Observasi & Bentang Alam' }}</span>
            <div class="filter-slide-bar" role="tablist" :aria-label="isEarth ? 'Pilih Zaman' : 'Pilih Periode'" @wheel.passive="handleHWheel">
              <button
                v-for="e in availableEras"
                :key="e.id"
                class="filter-slide-btn"
                role="tab"
                :aria-selected="selectedEra === e.id"
                :class="{ on: selectedEra === e.id }"
                @click="selectEra(e.id, $event)"
              >
                <span>{{ e.label }}</span>
              </button>
            </div>
          </div>

          <!-- DAFTAR KARTU VERTIKAL GAYA FIGMA -->
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

              <!-- Banner Gambar Ramping 16:9 di Atas Isi Kartu -->
              <div
                v-if="e.gambar_url && isSafeMediaUrl(e.gambar_url) && !brokenImages[e.id]"
                class="ev-card-banner"
              >
                <img
                  :src="e.gambar_url"
                  :alt="e.judul || e.title"
                  loading="lazy"
                  @error="onImageError(e.id)"
                />
              </div>

              <!-- Isi Teks Kartu -->
              <div class="ev-text">
                <h3 class="ev-title">{{ e.judul || e.title }}</h3>
                <div v-if="(e.nama_wahana || e.actor) || (e.karakteristik_fisik && e.karakteristik_fisik !== '—')" class="ev-meta">
                  <span v-if="e.nama_wahana || e.actor" class="ev-actor-chip">{{ e.nama_wahana || e.actor }}</span>
                  <span v-if="e.karakteristik_fisik && e.karakteristik_fisik !== '—'" class="ev-char">{{ e.karakteristik_fisik }}</span>
                </div>
                <p class="ev-desc">{{ e.ringkasan_singkat || e.body }}</p>
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
              </div>
            </li>
          </ol>
        </template>

        <!-- ============================================== -->
        <!-- MODE 2: JENDELA DETAIL TERSTRUKTUR (DETAIL VIEW) -->
        <!-- ============================================== -->
        <template v-else-if="viewMode === 'detail' && currentEvent">
          <div class="detail-container">
            <!-- 1. Header Atas: Tombol Kembali, Mikro-label, dan Judul Tegas -->
            <button type="button" class="back-btn" @click="backToList">
              <UiIcon name="kembali" :size="16" />
              <span>Kembali ke Lini Masa</span>
            </button>

            <div class="detail-title-block">
              <span class="detail-micro-label">
                {{ (info?.name || body || 'TATA SURYA').toUpperCase() }} · SEJARAH & OBSERVASI // {{ formatYear(currentEvent.year || currentEvent.tahun_kejadian) }}
              </span>
              <h2 class="detail-title">{{ currentEvent.judul || currentEvent.title }}</h2>
            </div>

            <!-- 2. Gambar (Hanya Tampil Jika URL Valid & Berhasil Load) -->
            <div
              v-if="currentEvent.gambar_url && isSafeMediaUrl(currentEvent.gambar_url) && !brokenImages[currentEvent.id]"
              class="detail-media"
            >
              <img
                :src="currentEvent.gambar_url"
                :alt="currentEvent.judul || currentEvent.title"
                class="media-img"
                @error="onImageError(currentEvent.id)"
              />
            </div>

            <!-- 3. Kotak Metadata Key-Value Bersih Rapi -->
            <div class="meta-box">
              <div class="meta-item">
                <span class="meta-label">Kategori:</span>
                <span class="meta-val meta-cat">{{ currentEvent.kategori_poi || currentEvent.locationType || (currentEvent.memorial ? 'Kenangan Pahlawan' : 'Observasi Ilmiah') }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Status / Era:</span>
                <span class="meta-val">{{ currentEvent.era_label || (isEarth ? 'Zaman Modern' : 'Era Antariksa') }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">Wahana / Tokoh:</span>
                <span class="meta-val">{{ currentEvent.nama_wahana || currentEvent.actor || '—' }}</span>
              </div>
              <div v-if="currentEvent.karakteristik_fisik" class="meta-item">
                <span class="meta-label">Karakteristik:</span>
                <span class="meta-val">{{ currentEvent.karakteristik_fisik }}</span>
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

            <!-- 4. Bagian Deskripsi Mengalir (Tanpa Kotak Berlebih) -->
            <div class="desc-section">
              <div class="desc-header">
                <span class="desc-bullet"></span>
                <span class="desc-title">DESKRIPSI ILMIAH & SEJARAH</span>
              </div>
              <div class="desc-content">
                <p v-if="currentEvent.ringkasan_singkat" class="desc-lead">
                  {{ currentEvent.ringkasan_singkat }}
                </p>
                <p v-if="narrativeBodyText" class="desc-body">
                  {{ narrativeBodyText }}
                </p>
              </div>
            </div>

            <!-- 5. Kotak Sumber Referensi -->
            <div class="ref-box">
              <span class="ref-label">SUMBER REFERENSI:</span>
              <p class="ref-val">{{ currentEvent.sumber_referensi || 'NASA / Arsip Eksplorasi Antariksa Internasional' }}</p>
            </div>

            <!-- 6. Tombol Unduh PDF -->
            <button
              type="button"
              class="btn-download-pdf"
              title="Unduh catatan peristiwa sejarah ini sebagai dokumen PDF"
              @click="downloadPdf"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Unduh PDF</span>
            </button>
          </div>
        </template>

        <p class="fine">Data tersinkronisasi dengan katalog AstroSphere.</p>
        <UiScrollHint :target="scroller" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Judul Panggung Kiri Atas (Seragam PlanetPanel.vue) */
.stage-title {
  position: fixed;
  left: calc(var(--gap) + var(--safe-l));
  top: calc(var(--top) + 46px + var(--safe-t));
  z-index: 21;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.stage-title > * {
  pointer-events: auto;
}
.stage-eyebrow {
  display: block;
  font-family: var(--display);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #38bdf8;
  margin: 0 0 4px 0;
  line-height: 1.2;
}
.stage-title .h1 {
  margin: 0;
  font-family: var(--display);
  font-size: clamp(24px, 2.4vw, 30px);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #fff;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.55);
}

/* Sheet Observatorium Kaca Gelap */
.sheet {
  border-radius: 14px !important;
  background: rgba(10, 14, 28, 0.92) !important;
  border: 1px solid rgba(148, 174, 255, 0.16) !important;
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.sheet .sbody {
  padding: 18px 16px !important;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sheet .sbody > * {
  flex-shrink: 0;
}
.sheet .sbody.scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 174, 255, 0.25) transparent;
}
.sheet .sbody.scroll::-webkit-scrollbar {
  width: 5px;
}
.sheet .sbody.scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 174, 255, 0.25);
  border-radius: 3px;
}
.sheet .sbody.scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 174, 255, 0.4);
}

/* Header section */
.header-sec {
  margin-bottom: 4px;
}
.header-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.header-sec .h3 {
  margin: 0 0 4px 0;
  font-family: var(--display);
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
}
.header-sec .small {
  margin: 0;
  font-size: 13px;
  color: var(--faint);
  line-height: 1.45;
}

/* Filter Styling: Horizontal Slide Bar Figma Style */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}
.filter-group.sub-filter {
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(14, 165, 233, 0.06);
  border: 1px solid rgba(14, 165, 233, 0.18);
}
.filter-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 600;
  color: #94a3b8;
}
.filter-slide-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 174, 255, 0.14);
  overflow-x: auto;
  flex-wrap: nowrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}
.filter-slide-bar::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
.filter-slide-btn {
  flex: 0 0 auto;
  white-space: nowrap;
  border-radius: 7px;
  padding: 6px 12px;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 500;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.18s ease;
  user-select: none;
}
.filter-slide-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.06);
}
.filter-slide-btn.on {
  background: #0ea5e9;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
}
.filter-slide-btn.sm {
  padding: 5px 10px;
  font-size: 11.5px;
}

/* Garis Waktu & Daftar Kartu Gaya Figma */
.tl {
  list-style: none;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0 12px 18px;
  margin: 6px 0 0 0;
}
.tl::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  border-radius: 2px;
  background: rgba(56, 189, 248, 0.22);
}
.ev-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ev-card::before {
  content: "";
  position: absolute;
  left: -18px;
  top: 18px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #0b1024;
  border: 2px solid rgba(148, 174, 255, 0.4);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.ev-card:hover {
  background: rgba(22, 33, 62, 0.85);
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.15);
  transform: translateX(2px);
}
.ev-card.is-active {
  background: rgba(15, 23, 42, 0.88);
  border-color: rgba(56, 189, 248, 0.65);
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.22), inset 0 0 12px rgba(56, 189, 248, 0.08);
}
.ev-card.is-active::before {
  background: #0ea5e9;
  border-color: #38bdf8;
  box-shadow: 0 0 10px #38bdf8, 0 0 0 3px rgba(56, 189, 248, 0.25);
}
.ev-card.is-memorial::before {
  border-color: #cfd6ee;
}
.ev-card.is-memorial.is-active::before {
  background: #cfd6ee;
  border-color: #ffffff;
  box-shadow: 0 0 10px #cfd6ee, 0 0 0 3px rgba(207, 214, 238, 0.2);
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
  font-weight: 600;
  font-size: 15px;
  color: #38bdf8;
  font-family: var(--display);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.badge-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.25);
  text-transform: capitalize;
}
.badge-tag.tag-memorial {
  background: rgba(207, 214, 238, 0.12);
  color: #cfd6ee;
  border-color: rgba(207, 214, 238, 0.3);
}
.ev-card-banner {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 125px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(148, 174, 255, 0.16);
  background: rgba(11, 16, 36, 0.6);
  margin-top: 2px;
}
.ev-card-banner img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.ev-card:hover .ev-card-banner img {
  transform: scale(1.03);
}
.ev-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  width: 100%;
}
.ev-title {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.35;
  color: #f1f5f9;
}
.ev-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px 8px;
  font-size: 12px;
  color: #94a3b8;
  margin: 3px 0;
}
.ev-actor-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  font-size: 11.5px;
  font-weight: 500;
  max-width: 100%;
}
.ev-actor-chip + .ev-char::before {
  content: "·";
  margin-right: 6px;
  color: rgba(148, 174, 255, 0.4);
  font-weight: bold;
}
.ev-char {
  color: #94a3b8;
  font-size: 11.5px;
  word-break: break-word;
}
.ev-desc {
  margin: 3px 0 0 0;
  font-size: 13px;
  color: #94a3b8;
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
  padding-top: 8px;
  border-top: 1px dashed rgba(148, 174, 255, 0.16);
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
  font-weight: 500;
  color: #38bdf8;
  cursor: pointer;
  transition: transform 0.15s;
}
.btn-detail-link:hover {
  transform: translateX(3px);
  color: #fff;
}

/* Detail View */
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.back-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  height: 36px;
  padding: 0 14px;
  font-family: var(--font);
  font-size: 13px;
  font-weight: 500;
  background: rgba(148, 174, 255, 0.08);
  border: 1px solid rgba(148, 174, 255, 0.18);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.18s ease;
}
.back-btn:hover {
  background: rgba(148, 174, 255, 0.16);
  border-color: rgba(148, 174, 255, 0.32);
  color: #fff;
}
.detail-title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.detail-micro-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #94a3b8;
  text-transform: uppercase;
}
.detail-title {
  margin: 0;
  font-size: clamp(20px, 2.2vw, 24px);
  font-weight: 600;
  line-height: 1.25;
  color: #f8fafc;
}
.detail-media {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 174, 255, 0.16);
  background: rgba(15, 23, 42, 0.6);
}
.media-img {
  width: 100%;
  max-height: 190px;
  object-fit: cover;
  display: block;
}
.meta-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 174, 255, 0.14);
}
.meta-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
  line-height: 1.45;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.meta-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}
.meta-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  flex: none;
  width: 110px;
}
.meta-val {
  font-size: 12.5px;
  color: #f1f5f9;
  font-weight: 500;
  text-align: right;
  word-break: break-word;
  flex: 1;
}
.meta-val.meta-cat {
  color: #38bdf8;
  font-weight: 500;
}
.memo-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(207, 214, 238, 0.06);
  border: 1px solid rgba(207, 214, 238, 0.2);
}
.memo-header {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cfd6ee;
  font-size: 13px;
  font-weight: 600;
}
.memo-sec {
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.45;
}
.memo-sec b {
  color: #cfd6ee;
  display: block;
  margin-bottom: 2px;
  font-weight: 600;
}
.memo-sec.lesson {
  padding: 6px 8px;
  border-radius: 6px;
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
  border-radius: 6px;
  background: rgba(148, 174, 255, 0.1);
  border: 1px solid rgba(148, 174, 255, 0.16);
  font-size: 11.5px;
  color: #f1f5f9;
  font-weight: 500;
}
.desc-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 2px;
}
.desc-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.desc-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #38bdf8;
  flex: none;
}
.desc-title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #94a3b8;
  text-transform: uppercase;
}
.desc-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.desc-lead {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: #e2e8f0;
  font-weight: 500;
}
.desc-body {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.65;
  color: #cbd5e1;
}
.ref-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 174, 255, 0.14);
}
.ref-label {
  display: block;
  font-size: 10.5px;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}
.ref-val {
  margin: 4px 0 0 0;
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.5;
  word-break: break-word;
}
.btn-download-pdf {
  width: 100%;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(14, 165, 233, 0.08);
  color: #38bdf8;
  font-weight: 500;
  font-size: 13.5px;
  font-family: var(--font);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 4px;
}
.btn-download-pdf:hover {
  background: rgba(14, 165, 233, 0.18);
  border-color: rgba(56, 189, 248, 0.6);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.2);
}
.fine {
  font-size: 11.5px;
  color: var(--faint);
  text-align: center;
  padding: 6px 0 2px 0;
  margin: 0;
}

@media (max-width: 760px) {
  .stage-title {
    left: calc(var(--gap) + var(--safe-l));
    top: calc(var(--top) + 46px + var(--safe-t));
  }
  .stage-title .h1 {
    font-size: clamp(24px, 2.4vw, 30px);
  }
  .sheet {
    left: 0;
    right: 0;
    width: auto;
    top: auto;
    bottom: 0;
    height: min(52vh, 480px);
    border-radius: 20px 20px 0 0 !important;
  }
  .sheet .sbody {
    padding: 14px 14px 22px !important;
    gap: 10px;
  }
  .tl {
    padding-left: 14px;
  }
  .ev-card {
    padding: 10px 12px;
  }
  .ev-card-banner {
    max-height: 115px;
  }
}
@media (max-height: 540px) and (orientation: landscape) {
  .stage-title {
    left: calc(var(--gap) + var(--safe-l)) !important;
    top: calc(44px + var(--safe-t)) !important;
    max-width: calc(100vw - min(285px, 43vw) - 30px) !important;
  }
  .sheet {
    left: auto !important;
    right: calc(10px + var(--safe-r)) !important;
    top: calc(44px + var(--safe-t)) !important;
    bottom: calc(10px + var(--safe-b)) !important;
    width: min(285px, 43vw) !important;
    height: auto !important;
    border-radius: 12px !important;
    border-bottom: 1px solid rgba(148, 174, 255, 0.16) !important;
    padding: 10px 12px !important;
  }
  .sbody {
    padding: 0 !important;
    gap: 8px !important;
  }
  .ev-card-banner {
    max-height: 90px !important;
  }
  .h3 {
    font-size: 15px !important;
  }
  .small {
    font-size: 11.5px !important;
    line-height: 1.4 !important;
  }
  .filter-slide-bar button {
    height: 26px !important;
    padding: 0 8px !important;
    font-size: 11px !important;
  }
  .evt-row {
    padding: 8px 10px !important;
    gap: 8px !important;
    border-radius: 8px !important;
  }
  .evt-title {
    font-size: 12.5px !important;
  }
  .evt-body {
    font-size: 11.5px !important;
  }
  .btn-back-list,
  .btn-focus-poi,
  .btn-download-pdf {
    height: 34px !important;
    min-height: 34px !important;
    font-size: 12px !important;
  }
}
</style>

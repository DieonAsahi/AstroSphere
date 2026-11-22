<script setup>
// Halaman Pengelola Sejarah & POI (/admin/history) — Filter 6 Zaman Baku Bumi & Pratinjau PLY-03 / PLY-04
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError } from '~/utils/adminAuth.js';
import { uploadAdminAsset } from '~/utils/adminStorage.js';
import { isSafeMediaUrl } from '~/utils/mediaSecurity.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const uploadingImage = ref(false);
const error = ref('');
const notification = ref(null);

const events = ref([]);
const selectedPlanet = ref('all');
const selectedEra = ref('all');
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 8;

// Modal CRUD & Pratinjau
const modalOpen = ref(false);
const isEditing = ref(false);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PLY03' | 'PLY04'
const deletingEvent = ref(null);
const importModalOpen = ref(false);
const importText = ref('');
const importError = ref('');

const PLANET_OPTIONS = [
  { id: 'earth', name: 'Bumi' },
  { id: 'mars', name: 'Mars' },
  { id: 'venus', name: 'Venus' },
  { id: 'mercury', name: 'Merkurius' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturnus' },
  { id: 'uranus', name: 'Uranus' },
  { id: 'neptune', name: 'Neptunus' },
];

const EARTH_6_ZAMAN = [
  { id: 'awal_purba', label: 'Zaman Awal Bumi & Purba (≤ 250 Jt SM)', min: -Infinity, max: -250000000 },
  { id: 'dinosaurus', label: 'Zaman Dinosaurus & Kapur (250–66 Jt SM)', min: -250000000, max: -66000000 },
  { id: 'manusia_purba', label: 'Zaman Manusia Purba & Batu (66 Jt–3000 SM)', min: -66000000, max: -3000 },
  { id: 'kuno_kenabian', label: 'Zaman Peradaban Kuno & Kenabian (3000 SM–500 M)', min: -3000, max: 500 },
  { id: 'pertengahan_nusantara', label: 'Zaman Pertengahan & Nusantara (500–1499 M)', min: 500, max: 1499 },
  { id: 'modern', label: 'Zaman Modern (1500–Sekarang)', min: 1500, max: Infinity },
];

const DEFAULT_EVENT = {
  planet_id: 'earth',
  era_label: 'Zaman Modern (1500–Sekarang)',
  tahun_kejadian: 1969,
  kategori_poi: 'Pendaratan & Eksplorasi Permukaan',
  judul: '',
  ringkasan_singkat: '',
  nama_wahana: '',
  karakteristik_fisik: '',
  deskripsi: '',
  gambar_url: '',
  sumber_referensi: 'NASA / Arsip Eksplorasi Antariksa',
};

const formData = ref({ ...DEFAULT_EVENT });

async function loadHistoryEvents() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Klien Supabase belum terkonfigurasi.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('history_events')
      .select('*')
      .order('tahun_kejadian', { ascending: true });

    if (fetchErr) throw fetchErr;
    events.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Gagal memuat catatan sejarah.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadHistoryEvents();
}

// Penyaringan Daftar
const filteredEvents = computed(() => {
  return events.value.filter((e) => {
    if (selectedPlanet.value !== 'all' && e.planet_id !== selectedPlanet.value) {
      return false;
    }

    if (selectedEra.value !== 'all') {
      const z = EARTH_6_ZAMAN.find((x) => x.id === selectedEra.value);
      if (z && (e.tahun_kejadian < z.min || e.tahun_kejadian > z.max)) {
        return false;
      }
    }

    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      return (
        e.judul?.toLowerCase().includes(q) ||
        e.ringkasan_singkat?.toLowerCase().includes(q) ||
        e.nama_wahana?.toLowerCase().includes(q)
      );
    }

    return true;
  });
});

const totalPages = computed(() => Math.ceil(filteredEvents.value.length / itemsPerPage) || 1);
const paginatedEvents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredEvents.value.slice(start, start + itemsPerPage);
});

function openCreateModal() {
  isEditing.value = false;
  formData.value = { ...DEFAULT_EVENT };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function openEditModal(eventItem) {
  isEditing.value = true;
  formData.value = {
    event_id: eventItem.event_id,
    planet_id: eventItem.planet_id,
    era_label: eventItem.era_label || '',
    tahun_kejadian: Number(eventItem.tahun_kejadian || 0),
    kategori_poi: eventItem.kategori_poi || 'Titik Observasi',
    judul: eventItem.judul || '',
    ringkasan_singkat: eventItem.ringkasan_singkat || '',
    nama_wahana: eventItem.nama_wahana || '',
    karakteristik_fisik: eventItem.karakteristik_fisik || '',
    deskripsi: eventItem.deskripsi || '',
    gambar_url: eventItem.gambar_url || '',
    sumber_referensi: eventItem.sumber_referensi || '',
  };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

async function handleSave() {
  const client = getSupabaseClient();
  if (!client) return;

  if (formData.value.gambar_url && !isSafeMediaUrl(formData.value.gambar_url)) {
    showNotification('error', 'URL foto tidak valid atau berisiko keamanan (hanya tautan HTTPS resmi atau unggah berkas langsung yang diizinkan).');
    return;
  }

  saving.value = true;
  try {
    const payload = {
      planet_id: formData.value.planet_id,
      era_label: formData.value.era_label,
      tahun_kejadian: Number(formData.value.tahun_kejadian),
      kategori_poi: formData.value.kategori_poi,
      judul: formData.value.judul,
      ringkasan_singkat: formData.value.ringkasan_singkat,
      nama_wahana: formData.value.nama_wahana,
      karakteristik_fisik: formData.value.karakteristik_fisik,
      deskripsi: formData.value.deskripsi,
      gambar_url: formData.value.gambar_url,
      sumber_referensi: formData.value.sumber_referensi,
    };

    if (isEditing.value && formData.value.event_id) {
      const { error: updErr } = await client
        .from('history_events')
        .update(payload)
        .eq('event_id', formData.value.event_id);
      if (updErr) throw updErr;
      showNotification('success', `Peristiwa "${formData.value.judul}" berhasil diperbarui.`);
    } else {
      const { error: insErr } = await client
        .from('history_events')
        .insert(payload);
      if (insErr) throw insErr;
      showNotification('success', `Peristiwa "${formData.value.judul}" berhasil ditambahkan.`);
    }

    closeModal();
    await loadHistoryEvents();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Gagal menyimpan peristiwa.'));
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!deletingEvent.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const { error: delErr } = await client
      .from('history_events')
      .delete()
      .eq('event_id', deletingEvent.value.event_id);

    if (delErr) throw delErr;
    showNotification('success', `Peristiwa "${deletingEvent.value.judul}" telah dihapus.`);
    deletingEvent.value = null;
    await loadHistoryEvents();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Gagal menghapus peristiwa.'));
  } finally {
    saving.value = false;
  }
}

async function handleImageUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  uploadingImage.value = true;
  const res = await uploadAdminAsset(file, 'history');
  uploadingImage.value = false;

  if (res.ok) {
    formData.value.gambar_url = res.url;
    showNotification('success', 'Foto peristiwa berhasil diunggah ke Storage.');
  } else {
    showNotification('error', res.error || 'Gagal mengunggah foto.');
  }
}

// Ekspor & Impor
function exportJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredEvents.value, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `history_events_${Date.now()}.json`);
  dlAnchor.click();
}

function exportCsv() {
  if (!filteredEvents.value.length) return;
  const headers = ['event_id', 'planet_id', 'era_label', 'tahun_kejadian', 'kategori_poi', 'judul', 'ringkasan_singkat', 'nama_wahana', 'karakteristik_fisik', 'deskripsi', 'gambar_url', 'sumber_referensi'];
  const rows = filteredEvents.value.map((e) => headers.map((h) => `"${String(e[h] || '').replace(/"/g, '""')}"`).join(','));
  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows].join('\n'));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', csvContent);
  dlAnchor.setAttribute('download', `history_events_${Date.now()}.csv`);
  dlAnchor.click();
}

async function handleImportSubmit() {
  importError.value = '';
  if (!importText.value.trim()) {
    importError.value = 'Silakan tempelkan data JSON yang valid.';
    return;
  }

  try {
    const parsed = JSON.parse(importText.value);
    if (!Array.isArray(parsed)) {
      importError.value = 'Format JSON harus berupa array objek peristiwa.';
      return;
    }

    const client = getSupabaseClient();
    if (!client) return;

    saving.value = true;
    const cleanRows = parsed.map((row) => ({
      planet_id: row.planet_id || 'earth',
      era_label: row.era_label || 'Zaman Modern',
      tahun_kejadian: Number(row.tahun_kejadian || 2000),
      kategori_poi: row.kategori_poi || 'Titik Observasi',
      judul: row.judul || 'Peristiwa Baru',
      ringkasan_singkat: row.ringkasan_singkat || '',
      nama_wahana: row.nama_wahana || '',
      karakteristik_fisik: row.karakteristik_fisik || '',
      deskripsi: row.deskripsi || '',
      gambar_url: row.gambar_url || '',
      sumber_referensi: row.sumber_referensi || '',
    }));

    const { error: insErr } = await client.from('history_events').upsert(cleanRows);
    if (insErr) throw insErr;

    showNotification('success', `Berhasil mengimpor ${cleanRows.length} catatan sejarah.`);
    importModalOpen.value = false;
    importText.value = '';
    await loadHistoryEvents();
  } catch (err) {
    importError.value = err.message || 'Gagal memproses data impor.';
  } finally {
    saving.value = false;
  }
}

function showNotification(type, msg) {
  notification.value = { type, msg };
  setTimeout(() => {
    notification.value = null;
  }, 3500);
}

function formatYear(yr) {
  if (yr == null) return '—';
  const num = Number(yr);
  if (num <= -1000000) return `± ${(Math.abs(num) / 1000000).toLocaleString('id-ID')} Jt SM`;
  if (num <= -1000) return `± ${(Math.abs(num) / 1000).toLocaleString('id-ID')} Rb SM`;
  if (num < 0) return `${Math.abs(num)} SM`;
  return `${num} M`;
}

onMounted(() => {
  loadHistoryEvents();
});
</script>

<template>
  <div class="admin-history-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Sejarah &amp; POI Eksplorasi</h1>
        <p class="page-desc">Kelola lini masa misi luar angkasa, penemuan teleskopik, serta pendaratan wahana antarplanet.</p>
      </div>
      <div class="head-actions">
        <button class="btn-head primary" @click="openCreateModal">
          <UiIcon name="plus" :size="16" /> Tambah Peristiwa
        </button>
        <button class="btn-head line" @click="exportJson">
          Ekspor JSON
        </button>
        <button class="btn-head line" @click="exportCsv">
          Ekspor CSV
        </button>
        <button class="btn-head ghost" @click="importModalOpen = true">
          Impor Data
        </button>
      </div>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <!-- BILAH FILTER PLANET & 6 ZAMAN BAKU BUMI -->
    <div class="card-section filters-bar">
      <div class="filter-field">
        <label>Filter Planet</label>
        <select v-model="selectedPlanet" class="adm-select">
          <option value="all">Semua Planet ({{ events.length }})</option>
          <option v-for="p in PLANET_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
        </select>
      </div>

      <div class="filter-field">
        <label>Filter 6 Zaman Baku Bumi</label>
        <select v-model="selectedEra" class="adm-select">
          <option value="all">Semua Zaman</option>
          <option v-for="z in EARTH_6_ZAMAN" :key="z.id" :value="z.id">{{ z.label }}</option>
        </select>
      </div>

      <div class="filter-field search">
        <label>Pencarian</label>
        <input v-model="searchQuery" type="text" placeholder="Cari judul, wahana..." class="adm-input" />
      </div>
    </div>

    <!-- TABEL CATATAN SEJARAH -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat catatan sejarah dari Supabase…</p>
      </div>

      <div v-else-if="!filteredEvents.length" class="empty-state">
        <UiIcon name="info" :size="24" />
        <p>Tidak ada peristiwa yang cocok dengan filter atau kata kunci pencarian.</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 110px;">Tahun</th>
            <th style="width: 100px;">Planet</th>
            <th>Judul Peristiwa</th>
            <th>Kategori POI</th>
            <th>Wahana / Tokoh</th>
            <th style="width: 70px; text-align: center;">Foto</th>
            <th style="width: 140px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in paginatedEvents" :key="e.event_id">
            <td>
              <span class="year-badge">{{ formatYear(e.tahun_kejadian) }}</span>
            </td>
            <td>
              <span class="planet-badge capitalize">{{ e.planet_id }}</span>
            </td>
            <td>
              <div class="event-title-cell">
                <b>{{ e.judul }}</b>
                <small>{{ e.ringkasan_singkat || e.deskripsi?.slice(0, 70) }}…</small>
              </div>
            </td>
            <td>
              <span class="poi-tag">{{ e.kategori_poi }}</span>
            </td>
            <td>{{ e.nama_wahana || '—' }}</td>
            <td style="text-align: center;">
              <span v-if="e.gambar_url" class="has-img" title="Memiliki foto"><UiIcon name="cek" :size="16" /></span>
              <span v-else class="no-img">—</span>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-action edit" title="Ubah" @click="openEditModal(e)">
                  <UiIcon name="atur" :size="14" />
                </button>
                <button type="button" class="btn-action del" title="Hapus" @click="deletingEvent = e">
                  <UiIcon name="silang" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINASI -->
      <div v-if="totalPages > 1" class="pagination-bar">
        <span>Halaman {{ currentPage }} dari {{ totalPages }}</span>
        <div class="page-btns">
          <button :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <button :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>
    </div>

    <!-- MODAL EDIT / TAMBAH & PRATINJAU -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ isEditing ? 'Ubah Peristiwa Sejarah' : 'Tambah Peristiwa Baru' }}</h3>
            <p class="modal-sub">Kolom bersih tanpa koordinat lat/lng manual (sesuai spesifikasi PRD).</p>
          </div>
          <div class="modal-mode-tabs">
            <button :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button :class="{ on: modalViewMode === 'PLY03' }" @click="modalViewMode = 'PLY03'">Pratinjau PLY-03 (Kartu)</button>
            <button :class="{ on: modalViewMode === 'PLY04' }" @click="modalViewMode = 'PLY04'">Pratinjau PLY-04 (Detail)</button>
            <button class="btn-close-modal" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <!-- FORMULIR INPUT -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div class="grid-2">
            <label class="field">
              <span>Target Planet</span>
              <select v-model="formData.planet_id" class="adm-select" required>
                <option v-for="p in PLANET_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
              </select>
            </label>
            <label class="field">
              <span>Tahun Kejadian (Negatif untuk SM)</span>
              <input v-model.number="formData.tahun_kejadian" type="number" required placeholder="misal: 1969 atau -3000" />
            </label>
          </div>

          <div class="grid-2">
            <label class="field">
              <span>Status / Era Sejarah</span>
              <input v-model="formData.era_label" type="text" placeholder="misal: Zaman Modern / Era Antariksa" required />
            </label>
            <label class="field">
              <span>Kategori POI / Jenis Observasi</span>
              <input v-model="formData.kategori_poi" type="text" placeholder="misal: Pendaratan Permukaan / Orbit" required />
            </label>
          </div>

          <label class="field">
            <span>Judul Peristiwa Sejarah</span>
            <input v-model="formData.judul" type="text" placeholder="Judul misi atau observasi bersejarah..." required />
          </label>

          <div class="grid-2">
            <label class="field">
              <span>Nama Wahana Antariksa / Tokoh Pengamat</span>
              <input v-model="formData.nama_wahana" type="text" placeholder="misal: Apollo 11 (NASA) / Galileo Galilei" />
            </label>
            <label class="field">
              <span>Karakteristik Fisik / Titik Observasi</span>
              <input v-model="formData.karakteristik_fisik" type="text" placeholder="misal: Kawah Jezero / Mare Tranquillitatis" />
            </label>
          </div>

          <label class="field">
            <span>Ringkasan Singkat (PLY-03)</span>
            <textarea v-model="formData.ringkasan_singkat" rows="2" placeholder="Cuplikan ringkas untuk kartu linimasa..." required />
          </label>

          <label class="field">
            <span>Uraian Narasi Lengkap (PLY-04)</span>
            <textarea v-model="formData.deskripsi" rows="4" placeholder="Uraian mendalam sejarah, tujuan, temuan ilmiah..." required />
          </label>

          <!-- UPLOAD GAMBAR KE SUPABASE STORAGE -->
          <div class="upload-section">
            <span class="field-label">Foto / Media Ilustrasi Peristiwa</span>
            <div class="upload-row">
              <input v-model="formData.gambar_url" type="text" placeholder="https://... atau unggah berkas" class="input-url" />
              <label class="btn-upload-file">
                <input type="file" accept="image/*" class="sr-only" @change="handleImageUpload" />
                <span>{{ uploadingImage ? 'Mengunggah…' : 'Unggah Foto' }}</span>
              </label>
            </div>
            <div v-if="formData.gambar_url && isSafeMediaUrl(formData.gambar_url)" class="img-preview-mini">
              <img :src="formData.gambar_url" alt="Pratinjau Foto" />
            </div>
          </div>

          <label class="field">
            <span>Sumber Referensi Terverifikasi</span>
            <input v-model="formData.sumber_referensi" type="text" placeholder="misal: NASA Historical Data / ESA Archives" />
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving || uploadingImage">
              {{ saving ? 'Menyimpan…' : (isEditing ? 'Simpan Perubahan' : 'Buat Peristiwa Baru') }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU LAYAR SISWA PLY-03 (KARTU LINIMASA) -->
        <div v-else-if="modalViewMode === 'PLY03'" class="modal-body preview-body scroll">
          <div class="preview-ply03-card">
            <div class="ply03-header">
              <span class="ply03-year">{{ formatYear(formData.tahun_kejadian) }}</span>
              <span class="ply03-tag">{{ formData.kategori_poi }}</span>
            </div>
            <div class="ply03-content">
              <div v-if="formData.gambar_url && isSafeMediaUrl(formData.gambar_url)" class="ply03-thumb">
                <img :src="formData.gambar_url" alt="Thumb" />
              </div>
              <div>
                <b class="ply03-title">{{ formData.judul || 'Judul Peristiwa' }}</b>
                <span class="ply03-actor">{{ formData.nama_wahana }}</span>
                <p class="ply03-desc">{{ formData.ringkasan_singkat || 'Ringkasan singkat linimasa peristiwa...' }}</p>
              </div>
            </div>
            <span class="ply03-cta">Buka Detail →</span>
          </div>
        </div>

        <!-- PRATINJAU LAYAR SISWA PLY-04 (DETAIL LENGKAP) -->
        <div v-else-if="modalViewMode === 'PLY04'" class="modal-body preview-body scroll">
          <div class="preview-ply04-detail">
            <div v-if="formData.gambar_url && isSafeMediaUrl(formData.gambar_url)" class="ply04-media">
              <img :src="formData.gambar_url" alt="Foto Besar" />
            </div>

            <div class="ply04-meta-box">
              <div class="meta-row"><span>Kategori POI</span><b>{{ formData.kategori_poi }}</b></div>
              <div class="meta-row"><span>Status / Era</span><b>{{ formData.era_label }}</b></div>
              <div class="meta-row"><span>Wahana / Tokoh</span><b>{{ formData.nama_wahana || '—' }}</b></div>
              <div class="meta-row"><span>Karakteristik Fisik</span><b>{{ formData.karakteristik_fisik || '—' }}</b></div>
            </div>

            <h2 class="ply04-title">{{ formData.judul }}</h2>
            <p class="ply04-lead">{{ formData.ringkasan_singkat }}</p>
            <p class="ply04-desc">{{ formData.deskripsi }}</p>

            <div class="ply04-ref">
              <small>Sumber Referensi Terverifikasi:</small>
              <p>{{ formData.sumber_referensi || 'NASA / Arsip Astronomi' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI HAPUS -->
    <div v-if="deletingEvent" class="modal-backdrop" @click.self="deletingEvent = null">
      <div class="modal-card small">
        <h3 class="modal-title">Hapus Peristiwa Sejarah?</h3>
        <p class="modal-desc">Apakah Anda yakin ingin menghapus peristiwa <b>"{{ deletingEvent.judul }}"</b>? Tindakan ini tidak dapat dibatalkan.</p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="deletingEvent = null">Batal</button>
          <button type="button" class="btn-danger" :disabled="saving" @click="handleDelete">
            {{ saving ? 'Menghapus…' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL IMPOR MASSAL JSON -->
    <div v-if="importModalOpen" class="modal-backdrop" @click.self="importModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Impor Massal Catatan Sejarah (JSON)</h3>
          <button class="btn-close-modal" @click="importModalOpen = false"><UiIcon name="tutup" :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="hint">Tempelkan array objek JSON dengan kolom: planet_id, era_label, tahun_kejadian, kategori_poi, judul, ringkasan_singkat, nama_wahana, deskripsi, gambar_url, sumber_referensi.</p>
          <textarea v-model="importText" rows="10" placeholder="[ { &quot;planet_id&quot;: &quot;earth&quot;, &quot;judul&quot;: &quot;...&quot; } ]" class="import-textarea" />
          <p v-if="importError" class="error-text">{{ importError }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="importModalOpen = false">Batal</button>
          <button type="button" class="btn-save" :disabled="saving" @click="handleImportSubmit">
            {{ saving ? 'Mengimpor…' : 'Proses Impor' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-history-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
}
.page-desc {
  margin: 4px 0 0 0;
  font-size: 13.5px;
  color: #64748b;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-head.primary { background-color: #2563eb; color: #ffffff; }
.btn-head.primary:hover { background-color: #1d4ed8; }
.btn-head.line { background-color: #ffffff; border-color: #cbd5e1; color: #334155; }
.btn-head.line:hover { background-color: #f1f5f9; }
.btn-head.ghost { background-color: #f1f5f9; color: #475569; }

/* Filters Bar */
.filters-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.filter-field label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}
.filter-field.search {
  flex: 1;
  min-width: 200px;
}
.adm-select, .adm-input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #0f172a;
  font-size: 13.5px;
}

/* Table */
.table-wrap {
  padding: 0;
  overflow-x: auto;
}
.adm-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13.5px;
}
.adm-table th {
  background-color: #f8fafc;
  padding: 12px 16px;
  font-weight: 600;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
}
.adm-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}
.adm-table tbody tr:hover {
  background-color: #f8fafc;
}
.year-badge {
  font-weight: 700;
  color: #2563eb;
  font-size: 13px;
}
.planet-badge {
  padding: 2px 7px;
  border-radius: 4px;
  background-color: #eff6ff;
  color: #1d4ed8;
  font-size: 11.5px;
  font-weight: 600;
}
.event-title-cell b {
  display: block;
  color: #0f172a;
}
.event-title-cell small {
  color: #64748b;
  font-size: 12px;
}
.poi-tag {
  font-size: 12px;
  color: #475569;
}
.has-img { color: #16a34a; }
.no-img { color: #94a3b8; }

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}
.btn-action {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #ffffff;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #64748b;
}
.btn-action.edit:hover { background-color: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.btn-action.del:hover { background-color: #fef2f2; color: #dc2626; border-color: #fecaca; }

.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-top: 1px solid #f1f5f9;
  font-size: 13px;
  color: #64748b;
}
.page-btns {
  display: flex;
  gap: 8px;
}
.page-btns button {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  font-size: 12.5px;
  cursor: pointer;
}
.page-btns button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal & Form */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-card {
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  background-color: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}
.modal-card.small {
  max-width: 440px;
  padding: 24px;
}
.modal-header {
  padding: 18px 22px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-title { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.modal-mode-tabs { display: flex; align-items: center; gap: 6px; }
.modal-mode-tabs button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.modal-mode-tabs button.on {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; padding: 4px; }

.modal-body {
  padding: 20px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
}

.upload-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label { font-size: 12.5px; color: #334155; font-weight: 500; }
.upload-row { display: flex; gap: 8px; }
.input-url { flex: 1; padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; }
.btn-upload-file {
  padding: 8px 14px;
  border-radius: 6px;
  background-color: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.sr-only { display: none; }
.img-preview-mini {
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
.img-preview-mini img { width: 100%; height: 100%; object-fit: cover; }

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }

/* Pratinjau PLY-03 / PLY-04 */
.preview-body { background-color: #0b1021; color: #ffffff; border-radius: 0 0 14px 14px; }
.preview-ply03-card {
  background-color: #121833;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ply03-header { display: flex; align-items: center; justify-content: space-between; }
.ply03-year { font-size: 16px; font-weight: 700; color: #5ed1ff; }
.ply03-tag { font-size: 11px; padding: 2px 7px; border-radius: 4px; background: rgba(94, 209, 255, 0.15); color: #5ed1ff; }
.ply03-content { display: flex; gap: 12px; align-items: flex-start; }
.ply03-thumb { width: 60px; height: 60px; border-radius: 6px; overflow: hidden; flex: none; }
.ply03-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ply03-title { font-size: 15px; color: #ffffff; display: block; }
.ply03-actor { font-size: 12px; color: #5ed1ff; }
.ply03-desc { margin: 4px 0 0; font-size: 13px; color: #a6b2de; }
.ply03-cta { font-size: 12px; font-weight: 600; color: #5ed1ff; align-self: flex-end; }

.preview-ply04-detail { display: flex; flex-direction: column; gap: 12px; }
.ply04-media { width: 100%; max-height: 200px; border-radius: 10px; overflow: hidden; }
.ply04-media img { width: 100%; height: 100%; object-fit: cover; }
.ply04-meta-box {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.meta-row { display: flex; justify-content: space-between; font-size: 12.5px; }
.meta-row span { color: #a6b2de; }
.meta-row b { color: #ffffff; }
.ply04-title { margin: 0; font-size: 18px; color: #ffffff; }
.ply04-lead { margin: 0; font-size: 14px; color: #ffffff; font-weight: 500; }
.ply04-desc { margin: 0; font-size: 13px; color: #a6b2de; line-height: 1.5; }
.ply04-ref { padding: 8px 12px; border-left: 3px solid #5ed1ff; background: rgba(255, 255, 255, 0.04); font-size: 12px; }

.import-textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 12px; }
.error-text { color: #dc2626; font-size: 13px; margin: 4px 0 0 0; }
</style>

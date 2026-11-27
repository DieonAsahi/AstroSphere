<script setup>
// Halaman Pengelola Bank Soal Mitos atau Fakta (/admin/myths) — Selaras dengan MythGame.vue
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError, downloadSafeCsv, parseAdminJsonBatch } from '~/utils/adminAuth.js';
import { COLOR_OF } from '~/data/solarSystem.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const BODY_OPTIONS = [
  { id: 'matahari', name: 'Matahari' },
  { id: 'merkurius', name: 'Merkurius' },
  { id: 'venus', name: 'Venus' },
  { id: 'bumi', name: 'Bumi' },
  { id: 'mars', name: 'Mars' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturnus', name: 'Saturnus' },
  { id: 'uranus', name: 'Uranus' },
  { id: 'neptunus', name: 'Neptunus' },
  { id: 'bulan', name: 'Bulan' },
  { id: 'io', name: 'Io' },
  { id: 'europa', name: 'Europa' },
  { id: 'ganymede', name: 'Ganymede' },
  { id: 'callisto', name: 'Callisto' },
  { id: 'titan', name: 'Titan' },
  { id: 'sabuk', name: 'Sabuk Asteroid' },
];

const BODY_MAP = Object.fromEntries(BODY_OPTIONS.map((b) => [b.id, b.name]));
const ALLOWED_BODY_IDS = new Set(BODY_OPTIONS.map((b) => b.id));

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const togglingId = ref('');
const error = ref('');
const notification = ref(null);

const myths = ref([]);
const selectedBody = ref('all');
const selectedType = ref('all'); // 'all' | 'fact' | 'myth'
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 8;

// Modal CRUD & Pratinjau
const modalOpen = ref(false);
const isEditing = ref(false);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'
const formError = ref('');
const deletingMyth = ref(null);
const importModalOpen = ref(false);
const importText = ref('');
const importError = ref('');

// State simulasi pratinjau siswa
const previewChoice = ref(null);

const DEFAULT_MYTH = {
  slug: '',
  benda_langit: 'bumi',
  pernyataan: '',
  is_fact: false,
  penjelasan: '',
  sumber_referensi: 'NASA',
  bobot_poin: 10,
  is_active: true,
};

const formData = ref({ ...DEFAULT_MYTH });

const bodyName = (id) => BODY_MAP[id] || id || 'Bumi';
const bodyColor = (id) => COLOR_OF[id] || '#38bdf8';

const factCount = computed(() => myths.value.filter((m) => m.is_fact).length);
const mythCount = computed(() => myths.value.filter((m) => !m.is_fact).length);

async function loadMyths() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('myths')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    myths.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Tidak bisa memuat daftar pernyataan.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadMyths();
}

const filteredMyths = computed(() => {
  return myths.value.filter((m) => {
    if (selectedBody.value !== 'all' && m.benda_langit !== selectedBody.value) {
      return false;
    }
    if (selectedType.value === 'fact' && !m.is_fact) {
      return false;
    }
    if (selectedType.value === 'myth' && m.is_fact) {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      return (
        m.pernyataan?.toLowerCase().includes(q) ||
        m.penjelasan?.toLowerCase().includes(q) ||
        m.slug?.toLowerCase().includes(q) ||
        m.sumber_referensi?.toLowerCase().includes(q) ||
        bodyName(m.benda_langit).toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const totalPages = computed(() => Math.ceil(filteredMyths.value.length / itemsPerPage) || 1);
const paginatedMyths = computed(() => {
  const safePage = Math.min(currentPage.value, totalPages.value);
  const start = (safePage - 1) * itemsPerPage;
  return filteredMyths.value.slice(start, start + itemsPerPage);
});

watch(totalPages, (tp) => {
  if (currentPage.value > tp) {
    currentPage.value = Math.max(1, tp);
  }
});

function resetFilters() {
  selectedBody.value = 'all';
  selectedType.value = 'all';
  searchQuery.value = '';
  currentPage.value = 1;
}

function openCreateModal() {
  isEditing.value = false;
  formError.value = '';
  previewChoice.value = null;
  formData.value = {
    ...DEFAULT_MYTH,
    benda_langit: selectedBody.value !== 'all' ? selectedBody.value : 'bumi',
  };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function openEditModal(item) {
  isEditing.value = true;
  formError.value = '';
  previewChoice.value = null;
  formData.value = {
    myth_id: item.myth_id,
    slug: item.slug || '',
    benda_langit: item.benda_langit || 'bumi',
    pernyataan: item.pernyataan || '',
    is_fact: Boolean(item.is_fact),
    penjelasan: item.penjelasan || '',
    sumber_referensi: item.sumber_referensi || 'NASA',
    bobot_poin: Number(item.bobot_poin || 10),
    is_active: item.is_active !== false,
  };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function closeModal() {
  if (saving.value) return;
  modalOpen.value = false;
  formError.value = '';
}

function closeImportModal() {
  if (saving.value) return;
  importModalOpen.value = false;
}

function parseStrictMythBool(raw) {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') {
    if (raw === 1) return true;
    if (raw === 0) return false;
  }
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase();
    if (['true', '1', 'fakta', 'benar', 'yes'].includes(clean)) return true;
    if (['false', '0', 'mitos', 'salah', 'no'].includes(clean)) return false;
  }
  return null;
}

function sanitizeSlug(raw) {
  const clean = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean || null;
}

const confirmStatusTarget = ref(null);

function openStatusModal(item) {
  if (togglingId.value === item.myth_id) return;
  const isCurrentlyActive = item.is_active !== false;
  confirmStatusTarget.value = {
    item,
    nextState: !isCurrentlyActive,
  };
}

async function confirmToggleActive() {
  if (!confirmStatusTarget.value) return;
  const { item, nextState } = confirmStatusTarget.value;
  if (togglingId.value === item.myth_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  togglingId.value = item.myth_id;

  try {
    const { error: updErr } = await client
      .from('myths')
      .update({ is_active: nextState })
      .eq('myth_id', item.myth_id);

    if (updErr) throw updErr;
    item.is_active = nextState;
    confirmStatusTarget.value = null;
    showNotification('success', `Pernyataan berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
  } catch (err) {
    confirmStatusTarget.value = null;
    showNotification('error', formatSupabaseError(err, 'Tidak bisa memperbarui status pernyataan.'));
  } finally {
    togglingId.value = '';
  }
}

async function handleSave() {
  formError.value = '';
  if (!ALLOWED_BODY_IDS.has(formData.value.benda_langit)) {
    formError.value = 'Entitas benda langit tidak valid.';
    return;
  }
  if (!formData.value.pernyataan?.trim()) {
    formError.value = 'Teks pernyataan Mitos atau Fakta wajib diisi.';
    return;
  }
  if (!formData.value.penjelasan?.trim()) {
    formError.value = 'Penjelasan ilmiah wajib diisi.';
    return;
  }
  const pts = Number(formData.value.bobot_poin);
  if (!Number.isFinite(pts) || pts < 1) {
    formError.value = 'Bobot poin hadiah minimal 1 bintang.';
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const payload = {
      slug: sanitizeSlug(formData.value.slug),
      benda_langit: formData.value.benda_langit,
      pernyataan: formData.value.pernyataan.trim(),
      is_fact: Boolean(formData.value.is_fact),
      penjelasan: formData.value.penjelasan.trim(),
      sumber_referensi: formData.value.sumber_referensi?.trim() || 'NASA',
      bobot_poin: Math.floor(pts),
      is_active: formData.value.is_active !== false,
    };

    if (isEditing.value && formData.value.myth_id) {
      const { error: updErr } = await client
        .from('myths')
        .update(payload)
        .eq('myth_id', formData.value.myth_id);
      if (updErr) throw updErr;
      showNotification('success', 'Pernyataan Mitos atau Fakta berhasil diperbarui.');
    } else {
      const { error: insErr } = await client.from('myths').insert(payload);
      if (insErr) throw insErr;
      showNotification('success', 'Pernyataan Mitos atau Fakta baru berhasil ditambahkan.');
    }

    saving.value = false;
    closeModal();
    await loadMyths();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Tidak bisa memperbarui pernyataan.');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!deletingMyth.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const { error: delErr } = await client
      .from('myths')
      .delete()
      .eq('myth_id', deletingMyth.value.myth_id);

    if (delErr) throw delErr;
    showNotification('success', 'Pernyataan Mitos atau Fakta berhasil dihapus.');
    deletingMyth.value = null;
    await loadMyths();
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Tidak bisa menghapus pernyataan.'));
  } finally {
    saving.value = false;
  }
}

function exportCsv() {
  if (!filteredMyths.value.length) {
    showNotification('error', 'Tidak ada data Mitos/Fakta untuk diekspor.');
    return;
  }
  const headers = ['myth_id', 'slug', 'benda_langit', 'is_fact', 'pernyataan', 'penjelasan', 'sumber_referensi', 'bobot_poin', 'is_active'];
  const rows = filteredMyths.value.map((m) => [
    m.myth_id,
    m.slug || '',
    m.benda_langit,
    m.is_fact ? 'true' : 'false',
    m.pernyataan || '',
    m.penjelasan || '',
    m.sumber_referensi || 'NASA',
    m.bobot_poin || 10,
    m.is_active !== false ? 'true' : 'false',
  ]);
  downloadSafeCsv(`astrosphere_myths_${Date.now()}.csv`, headers, rows);
  showNotification('success', `Berhasil mengekspor ${filteredMyths.value.length} pernyataan ke CSV.`);
}

async function handleImportSubmit() {
  importError.value = '';
  if (!importText.value.trim()) {
    importError.value = 'Silakan tempelkan array JSON pernyataan yang valid.';
    return;
  }

  try {
    const batch = parseAdminJsonBatch(importText.value, 'Format JSON harus berupa array objek yang tidak kosong.');
    if (!batch.ok) {
      importError.value = batch.error;
      return;
    }
    const parsed = batch.rows;

    const cleanRows = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];

      const bodyId = String(row.benda_langit || 'bumi').toLowerCase().trim();
      if (!ALLOWED_BODY_IDS.has(bodyId)) {
        importError.value = `Baris ${i + 1}: benda_langit "${row.benda_langit}" tidak valid (harus salah satu dari 16 entitas).`;
        return;
      }

      if (!row.pernyataan?.trim() || !row.penjelasan?.trim()) {
        importError.value = `Baris ${i + 1}: pernyataan dan penjelasan wajib diisi.`;
        return;
      }

      const parsedIsFact = parseStrictMythBool(row.is_fact);
      if (parsedIsFact === null) {
        importError.value = `Baris ${i + 1}: is_fact "${row.is_fact}" tidak valid (gunakan boolean true/false, 0/1, atau "fakta"/"mitos").`;
        return;
      }

      const rawPts = row.bobot_poin;
      const parsedPts = rawPts !== undefined && rawPts !== null && String(rawPts).trim() !== ''
        ? Number(rawPts)
        : 10;
      if (!Number.isFinite(parsedPts) || !Number.isInteger(parsedPts) || parsedPts < 1) {
        importError.value = `Baris ${i + 1}: bobot_poin "${rawPts}" harus berupa angka bulat minimal 1.`;
        return;
      }

      const isActiveParsed = row.is_active === undefined || row.is_active === null
        ? true
        : (parseStrictMythBool(row.is_active) ?? false);

      cleanRows.push({
        slug: sanitizeSlug(row.slug),
        benda_langit: bodyId,
        pernyataan: row.pernyataan.trim(),
        is_fact: parsedIsFact,
        penjelasan: row.penjelasan.trim(),
        sumber_referensi: row.sumber_referensi?.trim() || 'NASA',
        bobot_poin: parsedPts,
        is_active: isActiveParsed,
      });
    }

    const client = getSupabaseClient();
    if (!client) return;

    saving.value = true;
    const { error: insErr } = await client.from('myths').insert(cleanRows);
    if (insErr) throw insErr;

    showNotification('success', `Berhasil mengimpor ${cleanRows.length} pernyataan Mitos/Fakta.`);
    importModalOpen.value = false;
    importText.value = '';
    await loadMyths();
  } catch (err) {
    importError.value = formatSupabaseError(err, 'Tidak bisa menambahkan data impor.');
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

onMounted(() => {
  loadMyths();
});
</script>

<template>
  <div class="admin-myths-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Mitos atau Fakta</h1>
        <p class="page-desc">Kelola pernyataan miskonsepsi populer dan fakta ilmiah astronomi beserta hadiah bintangnya.</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-head line" @click="exportCsv">
          Ekspor CSV
        </button>
        <button type="button" class="btn-head ghost" @click="importModalOpen = true">
          Impor Massal
        </button>
        <button type="button" class="btn-head line" :disabled="refreshing" @click="handleRefresh">
          <UiIcon name="ulang" :size="15" :class="{ 'spin-active': refreshing }" />
          <span>Segarkan</span>
        </button>
        <button type="button" class="btn-head primary" @click="openCreateModal">
          <UiIcon name="plus" :size="16" />
          <span>Tambah Pernyataan</span>
        </button>
      </div>
    </div>

    <!-- Notifikasi & Galat -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- RINGKASAN TIPE -->
    <div class="summary-pills">
      <button type="button" class="sum-chip" :class="{ active: selectedType === 'all' }" @click="selectedType = 'all'; currentPage = 1">
        Semua Pernyataan <b>{{ myths.length }}</b>
      </button>
      <button type="button" class="sum-chip fact" :class="{ active: selectedType === 'fact' }" @click="selectedType = 'fact'; currentPage = 1">
        <UiIcon name="cek" :size="14" />
        Fakta Ilmiah <b>{{ factCount }}</b>
      </button>
      <button type="button" class="sum-chip myth" :class="{ active: selectedType === 'myth' }" @click="selectedType = 'myth'; currentPage = 1">
        <UiIcon name="silang" :size="14" />
        Mitos Belaka <b>{{ mythCount }}</b>
      </button>
    </div>

    <!-- FILTERS -->
    <div class="card-section filters-bar">
      <div class="filter-field">
        <label>Syarat Penemuan Benda Langit</label>
        <select v-model="selectedBody" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua Benda Langit</option>
          <option v-for="b in BODY_OPTIONS" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>
      </div>

      <div class="filter-field">
        <label>Klasifikasi</label>
        <select v-model="selectedType" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua (Mitos &amp; Fakta)</option>
          <option value="fact">Fakta Ilmiah</option>
          <option value="myth">Mitos Belaka</option>
        </select>
      </div>

      <div class="filter-field search">
        <label>Pencarian Pernyataan</label>
        <input v-model="searchQuery" type="text" placeholder="Cari pernyataan, penjelasan, slug..." class="adm-input" @input="currentPage = 1" />
      </div>

      <button type="button" class="btn-head line" @click="resetFilters">Reset</button>
    </div>

    <!-- TABEL -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat daftar pernyataan…</p>
      </div>

      <div v-else-if="!filteredMyths.length" class="empty-state">
        <UiIcon name="info" :size="26" />
        <p>Belum ada pernyataan yang sesuai dengan filter saat ini.</p>
        <div class="empty-actions">
          <button v-if="myths.length" type="button" class="btn-head line" @click="resetFilters">Tampilkan Semua</button>
          <button type="button" class="btn-head primary" @click="openCreateModal">Tambah Pernyataan</button>
        </div>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 135px;">Benda Langit</th>
            <th>Pernyataan &amp; Penjelasan Ilmiah</th>
            <th style="width: 110px;">Kategori</th>
            <th style="width: 90px;">Poin</th>
            <th style="width: 96px; text-align: center;">Status</th>
            <th style="width: 110px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in paginatedMyths" :key="m.myth_id">
            <td>
              <div class="entity-pill">
                <span class="dot" :style="{ backgroundColor: bodyColor(m.benda_langit) }" />
                <span>{{ bodyName(m.benda_langit) }}</span>
              </div>
            </td>
            <td>
              <div class="myth-cell">
                <b>{{ m.pernyataan }}</b>
                <p>{{ m.penjelasan }}</p>
                <small>Ref: {{ m.sumber_referensi || 'NASA' }}<span v-if="m.slug"> · {{ m.slug }}</span></small>
              </div>
            </td>
            <td>
              <span class="verdict-tag" :class="m.is_fact ? 'fact' : 'myth'">
                <UiIcon :name="m.is_fact ? 'cek' : 'silang'" :size="13" />
                {{ m.is_fact ? 'Fakta' : 'Mitos' }}
              </span>
            </td>
            <td>
              <span class="points-tag">+{{ m.bobot_poin || 10 }} ★</span>
            </td>
            <td style="text-align: center;">
              <button
                type="button"
                class="adm-switch-btn"
                :class="{ on: m.is_active !== false }"
                :disabled="togglingId === m.myth_id"
                :title="m.is_active !== false ? 'Klik untuk menonaktifkan pernyataan' : 'Klik untuk mengaktifkan pernyataan'"
                @click="openStatusModal(m)"
              >
                <span class="adm-switch-track" aria-hidden="true">
                  <span class="adm-switch-thumb" />
                </span>
                <span class="adm-switch-label">{{ togglingId === m.myth_id ? '…' : (m.is_active !== false ? 'Aktif' : 'Nonaktif') }}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-action edit" title="Ubah &amp; Pratinjau" @click="openEditModal(m)">
                  <UiIcon name="edit" :size="14" />
                </button>
                <button type="button" class="btn-action del" title="Hapus Pernyataan" @click="deletingMyth = m">
                  <UiIcon name="hapus" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredMyths.length > itemsPerPage" class="pagination-bar">
        <span>Menampilkan {{ paginatedMyths.length }} dari {{ filteredMyths.length }} pernyataan</span>
        <div class="page-btns">
          <button type="button" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>
    </div>

    <!-- MODAL TAMBAH / EDIT & PRATINJAU -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ isEditing ? 'Ubah Pernyataan' : 'Tambah Pernyataan Baru' }}</h3>
            <p class="modal-sub">Tersinkron langsung ke permainan "Mitos atau Fakta?" siswa.</p>
          </div>
          <div class="modal-mode-tabs">
            <button type="button" :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button type="button" :class="{ on: modalViewMode === 'PREVIEW' }" @click="modalViewMode = 'PREVIEW'; previewChoice = null">Pratinjau Siswa</button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>

          <div class="grid-2">
            <label class="field">
              <span>Benda Langit Terkait *</span>
              <select v-model="formData.benda_langit" class="adm-select" required>
                <option v-for="b in BODY_OPTIONS" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </label>
            <div class="field">
              <span>Status Kebenaran *</span>
              <div class="truth-toggle">
                <button
                  type="button"
                  class="truth-btn"
                  :class="{ on: !formData.is_fact, myth: !formData.is_fact }"
                  @click="formData.is_fact = false"
                >
                  <UiIcon name="silang" :size="14" /> Mitos (Salah)
                </button>
                <button
                  type="button"
                  class="truth-btn"
                  :class="{ on: formData.is_fact, fact: formData.is_fact }"
                  @click="formData.is_fact = true"
                >
                  <UiIcon name="cek" :size="14" /> Fakta (Benar)
                </button>
              </div>
            </div>
          </div>

          <label class="field">
            <span>Teks Pernyataan *</span>
            <textarea v-model="formData.pernyataan" rows="2" placeholder="misal: Venus lebih panas daripada Merkurius..." required />
          </label>

          <label class="field">
            <span>Penjelasan Ilmiah &amp; Pembahasan *</span>
            <textarea v-model="formData.penjelasan" rows="3" placeholder="Jelaskan fakta sains mengapa pernyataan ini mitos atau fakta..." required />
          </label>

          <div class="grid-3">
            <label class="field">
              <span>Sumber Referensi</span>
              <input v-model="formData.sumber_referensi" type="text" placeholder="NASA" />
            </label>
            <label class="field">
              <span>Hadiah Bintang *</span>
              <input v-model.number="formData.bobot_poin" type="number" min="1" max="500" required />
            </label>
            <label class="field">
              <span>Slug Unik (Opsional)</span>
              <input v-model="formData.slug" type="text" placeholder="misal: venus-panas" />
            </label>
          </div>

          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan pernyataan ini di permainan Mitos atau Fakta</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : (isEditing ? 'Simpan Perubahan' : 'Tambah Pernyataan') }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU SIMULASI MITOS / FAKTA -->
        <div v-else class="modal-body preview-body scroll">
          <div class="pv-top">
            <span class="pv-badge">SIMULASI MITOS ATAU FAKTA · {{ bodyName(formData.benda_langit).toUpperCase() }}</span>
            <button type="button" class="pv-reset-btn" @click="previewChoice = null">
              <UiIcon name="ulang" :size="13" /> Reset Simulasi
            </button>
          </div>

          <div
            class="pv-myth-card"
            :class="{
              answered: previewChoice !== null,
              ok: previewChoice !== null && previewChoice === formData.is_fact,
              bad: previewChoice !== null && previewChoice !== formData.is_fact,
            }"
          >
            <p class="pv-statement">{{ formData.pernyataan || 'Teks pernyataan akan tampil di sini…' }}</p>
            <span v-if="previewChoice !== null" class="pv-verdict-badge" :class="formData.is_fact ? 'f' : 'm'">
              <UiIcon :name="formData.is_fact ? 'cek' : 'silang'" :size="15" />
              {{ formData.is_fact ? 'Fakta Ilmiah' : 'Mitos Belaka' }}
            </span>
          </div>

          <div v-if="previewChoice === null" class="pv-pick-row">
            <button type="button" class="pv-pick-btn m" @click="previewChoice = false">
              <UiIcon name="silang" :size="16" /> Mitos
            </button>
            <button type="button" class="pv-pick-btn f" @click="previewChoice = true">
              <UiIcon name="cek" :size="16" /> Fakta
            </button>
          </div>

          <div v-else class="pv-fb-box" :class="{ ok: previewChoice === formData.is_fact }">
            <div class="pv-fb-head">
              <b>
                <UiIcon :name="previewChoice === formData.is_fact ? 'cek' : 'silang'" :size="15" />
                {{ previewChoice === formData.is_fact ? 'Jawaban Benar!' : 'Belum Tepat' }}
              </b>
              <span v-if="previewChoice === formData.is_fact" class="pv-rw">+{{ formData.bobot_poin || 10 }} Bintang</span>
            </div>
            <p>{{ formData.penjelasan || 'Penjelasan ilmiah tampil setelah siswa menjawab.' }}</p>
            <small>Referensi: {{ formData.sumber_referensi || 'NASA' }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI HAPUS -->
    <div v-if="deletingMyth" class="modal-backdrop" @click.self="!saving && (deletingMyth = null)">
      <div class="modal-card small">
        <h3 class="modal-title">Hapus Pernyataan?</h3>
        <p class="modal-desc">Apakah Anda yakin ingin menghapus pernyataan <b>"{{ deletingMyth.pernyataan }}"</b>?</p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="saving" @click="deletingMyth = null">Batal</button>
          <button type="button" class="btn-danger" :disabled="saving" @click="handleDelete">
            {{ saving ? 'Menghapus…' : 'Ya, Hapus' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI STATUS -->
    <div v-if="confirmStatusTarget" class="modal-backdrop" @click.self="!togglingId && (confirmStatusTarget = null)">
      <div class="modal-card adm-confirm-card small">
        <h3 class="modal-title">
          {{ confirmStatusTarget.nextState ? 'Aktifkan Pernyataan?' : 'Nonaktifkan Pernyataan?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="confirmStatusTarget.nextState">
            Ingin mengaktifkan kembali pernyataan ini agar tampil di permainan Mitos atau Fakta?
          </template>
          <template v-else>
            Ingin menonaktifkan pernyataan ini? Pernyataan tidak akan muncul di permainan publik hingga diaktifkan kembali.
          </template>
        </p>
        <p class="adm-confirm-quote">"{{ confirmStatusTarget.item.pernyataan }}"</p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="!!togglingId" @click="confirmStatusTarget = null">Batal</button>
          <button
            type="button"
            :class="confirmStatusTarget.nextState ? 'btn-save' : 'btn-warn'"
            :disabled="!!togglingId"
            @click="confirmToggleActive"
          >
            {{ togglingId ? 'Memproses…' : (confirmStatusTarget.nextState ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan') }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL IMPOR MASSAL JSON -->
    <div v-if="importModalOpen" class="modal-backdrop" @click.self="closeImportModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Impor Massal Mitos atau Fakta (JSON)</h3>
          <button type="button" class="btn-close-modal" :disabled="saving" @click="closeImportModal"><UiIcon name="tutup" :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="hint">Tempelkan array objek JSON dengan kolom: <code>benda_langit</code>, <code>pernyataan</code>, <code>is_fact</code> (boolean), <code>penjelasan</code>, <code>sumber_referensi</code>, <code>bobot_poin</code>, <code>slug</code>, <code>is_active</code>.</p>
          <textarea v-model="importText" rows="9" placeholder='[ { "benda_langit": "mars", "pernyataan": "...", "is_fact": true, "penjelasan": "..." } ]' class="import-textarea" />
          <p v-if="importError" class="error-text">{{ importError }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="saving" @click="closeImportModal">Batal</button>
          <button type="button" class="btn-save" :disabled="saving" @click="handleImportSubmit">
            {{ saving ? 'Mengimpor…' : 'Proses Impor' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-myths-page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-head { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.btn-head.primary { background: #2563eb; color: #ffffff; }
.btn-head.primary:hover { background: #1d4ed8; }
.btn-head.line { background: #ffffff; border-color: #cbd5e1; color: #334155; }
.btn-head.line:hover { background: #f8fafc; }
.btn-head.ghost { background: #eff6ff; color: #2563eb; }
.btn-head.ghost:hover { background: #dbeafe; }

.spin-active { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dash-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.dash-alert.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.dash-alert.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

.summary-pills { display: flex; gap: 10px; flex-wrap: wrap; }
.sum-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer; transition: all .15s; }
.sum-chip b { font-weight: 600; color: #0f172a; }
.sum-chip.active { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.sum-chip.fact.active { border-color: #16a34a; background: #f0fdf4; color: #15803d; }
.sum-chip.myth.active { border-color: #dc2626; background: #fef2f2; color: #b91c1c; }

.card-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
.filters-bar { display: flex; align-items: flex-end; gap: 14px; padding: 14px 18px; flex-wrap: wrap; }
.filter-field { display: flex; flex-direction: column; gap: 4px; min-width: 190px; }
.filter-field.search { flex: 1; min-width: 220px; }
.filter-field label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
.adm-select, .adm-input { height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background: #ffffff; color: #0f172a; }

.table-wrap { overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.adm-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.entity-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500; color: #0f172a; }
.entity-pill .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }

.myth-cell b { display: block; color: #0f172a; font-size: 14px; font-weight: 600; line-height: 1.4; }
.myth-cell p { margin: 3px 0; font-size: 12.5px; color: #64748b; line-height: 1.45; }
.myth-cell small { font-size: 11.5px; color: #94a3b8; }

.verdict-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.verdict-tag.fact { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.verdict-tag.myth { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.points-tag { font-size: 12px; font-weight: 600; color: #b45309; background: #fef3c7; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
.status-toggle-btn { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid transparent; cursor: pointer; background: #f1f5f9; color: #94a3b8; }
.status-toggle-btn.on { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }

.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.btn-action { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; display: grid; place-items: center; cursor: pointer; color: #64748b; }
.btn-action.edit:hover { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.btn-action.del:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }

.loading-state, .empty-state { padding: 44px 20px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #e2e8f0; border-top-color: #2563eb; animation: spin 0.8s linear infinite; }
.empty-actions { display: flex; gap: 8px; margin-top: 4px; }

.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
.page-btns { display: flex; align-items: center; gap: 8px; }
.page-btns button { padding: 5px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 12.5px; cursor: pointer; }
.page-btns button:disabled { opacity: 0.5; cursor: not-allowed; }
.page-ind { font-size: 12.5px; font-weight: 500; color: #334155; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 720px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
.modal-card.small { max-width: 440px; padding: 24px; gap: 12px; }
.modal-desc { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.5; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.modal-mode-tabs { display: flex; align-items: center; gap: 6px; }
.modal-mode-tabs button { padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-weight: 500; cursor: pointer; color: #475569; }
.modal-mode-tabs button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-close-modal { border: none !important; background: none !important; color: #94a3b8; cursor: pointer; padding: 4px !important; }

.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; }
.field input, .field select { min-height: 38px; height: 38px; padding: 0 12px; }

.truth-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.truth-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 13px; font-weight: 500; color: #475569; cursor: pointer; }
.truth-btn.myth.on { background: #fef2f2; border-color: #dc2626; color: #dc2626; }
.truth-btn.fact.on { background: #f0fdf4; border-color: #16a34a; color: #16a34a; }

.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }

/* Pratinjau Gelap Simulasi */
.preview-body { background: #0b1021; color: #ffffff; }
.pv-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pv-badge { font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 0.06em; }
.pv-reset-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 6px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #e2e8f0; font-size: 12px; cursor: pointer; }

.pv-myth-card {
  background: rgba(18, 25, 52, 0.9);
  border: 1px solid rgba(148, 174, 255, 0.22);
  border-radius: 14px;
  padding: 24px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.pv-myth-card.ok { border-color: rgba(54, 211, 154, 0.55); background: rgba(16, 46, 38, 0.45); }
.pv-myth-card.bad { border-color: rgba(248, 113, 113, 0.55); background: rgba(58, 22, 30, 0.45); }
.pv-statement { margin: 0; font-size: 16px; font-weight: 500; color: #ffffff; line-height: 1.5; }
.pv-verdict-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.pv-verdict-badge.f { background: rgba(54, 211, 154, 0.15); color: #36d39a; }
.pv-verdict-badge.m { background: rgba(248, 113, 113, 0.15); color: #f87171; }

.pv-pick-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pv-pick-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.16); color: #fff; }
.pv-pick-btn.m { background: rgba(239, 68, 68, 0.16); }
.pv-pick-btn.f { background: rgba(34, 197, 94, 0.16); }

.pv-fb-box { padding: 14px 16px; border-radius: 10px; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.28); display: flex; flex-direction: column; gap: 6px; }
.pv-fb-box.ok { background: rgba(54, 211, 154, 0.1); border-color: rgba(54, 211, 154, 0.28); }
.pv-fb-head { display: flex; align-items: center; justify-content: space-between; }
.pv-fb-head b { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: #fff; }
.pv-rw { font-size: 12px; font-weight: 600; color: #fbbf24; }
.pv-fb-box p { margin: 0; font-size: 13px; color: #e2e8f0; line-height: 1.5; }
.pv-fb-box small { font-size: 11.5px; color: #94a3b8; }

.hint { margin: 0; font-size: 12.5px; color: #64748b; }
.import-textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; background-color: #ffffff; color: #0f172a; }
.error-text { color: #dc2626; font-size: 13px; margin: 0; }

@media (max-width: 640px) {
  .grid-2,
  .grid-3,
  .truth-toggle,
  .pv-pick-row {
    grid-template-columns: 1fr;
  }
}
</style>

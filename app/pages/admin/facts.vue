<script setup>
// Halaman Pengelola Kartu Fakta "Tahukah Kamu?" (/admin/facts) — 16 Entitas Jurnal Penjelajah
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError, downloadSafeCsv, parseAdminJsonBatch } from '~/utils/adminAuth.js';
import { COLOR_OF } from '~/data/solarSystem.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const BODY_OPTIONS = [
  { id: 'matahari', name: 'Matahari', group: 'Bintang' },
  { id: 'merkurius', name: 'Merkurius', group: 'Planet' },
  { id: 'venus', name: 'Venus', group: 'Planet' },
  { id: 'bumi', name: 'Bumi', group: 'Planet' },
  { id: 'mars', name: 'Mars', group: 'Planet' },
  { id: 'jupiter', name: 'Jupiter', group: 'Planet' },
  { id: 'saturnus', name: 'Saturnus', group: 'Planet' },
  { id: 'uranus', name: 'Uranus', group: 'Planet' },
  { id: 'neptunus', name: 'Neptunus', group: 'Planet' },
  { id: 'bulan', name: 'Bulan', group: 'Satelit' },
  { id: 'io', name: 'Io', group: 'Satelit' },
  { id: 'europa', name: 'Europa', group: 'Satelit' },
  { id: 'ganymede', name: 'Ganymede', group: 'Satelit' },
  { id: 'callisto', name: 'Callisto', group: 'Satelit' },
  { id: 'titan', name: 'Titan', group: 'Satelit' },
  { id: 'sabuk', name: 'Sabuk Asteroid', group: 'Sabuk Asteroid' },
];

const BODY_MAP = Object.fromEntries(BODY_OPTIONS.map((b) => [b.id, b]));
const ALLOWED_BODY_IDS = new Set(BODY_OPTIONS.map((b) => b.id));

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const togglingId = ref('');
const error = ref('');
const notification = ref(null);

const facts = ref([]);
const selectedBody = ref('all');
const selectedStatus = ref('all');
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

// Modal CRUD & Pratinjau
const modalOpen = ref(false);
const isEditing = ref(false);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'
const formError = ref('');
const deletingFact = ref(null);
const importModalOpen = ref(false);
const importText = ref('');
const importError = ref('');

const DEFAULT_FACT = {
  body_id: 'bumi',
  judul: '',
  isi_fakta: '',
  sumber_referensi: 'NASA',
  urutan: 1,
  is_active: true,
};

const formData = ref({ ...DEFAULT_FACT });

function bodyName(id) {
  return BODY_MAP[id]?.name || id;
}

function bodyGroup(id) {
  return BODY_MAP[id]?.group || 'Benda Langit';
}

function bodyColor(id) {
  return COLOR_OF[id] || '#38bdf8';
}

const bodyCountMap = computed(() => {
  const counts = {};
  for (const b of BODY_OPTIONS) counts[b.id] = 0;
  for (const f of facts.value) {
    if (counts[f.body_id] != null) counts[f.body_id] += 1;
  }
  return counts;
});

async function loadFacts() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('facts')
      .select('*')
      .order('body_id', { ascending: true })
      .order('urutan', { ascending: true });

    if (fetchErr) throw fetchErr;
    facts.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Tidak bisa memuat data kartu fakta.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadFacts();
}

const filteredFacts = computed(() => {
  return facts.value.filter((f) => {
    if (selectedBody.value !== 'all' && f.body_id !== selectedBody.value) {
      return false;
    }
    if (selectedStatus.value === 'active' && f.is_active === false) {
      return false;
    }
    if (selectedStatus.value === 'inactive' && f.is_active !== false) {
      return false;
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      return (
        f.judul?.toLowerCase().includes(q) ||
        f.isi_fakta?.toLowerCase().includes(q) ||
        f.sumber_referensi?.toLowerCase().includes(q) ||
        bodyName(f.body_id).toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const totalPages = computed(() => Math.ceil(filteredFacts.value.length / itemsPerPage) || 1);
const paginatedFacts = computed(() => {
  const safePage = Math.min(currentPage.value, totalPages.value);
  const start = (safePage - 1) * itemsPerPage;
  return filteredFacts.value.slice(start, start + itemsPerPage);
});

watch(totalPages, (tp) => {
  if (currentPage.value > tp) {
    currentPage.value = Math.max(1, tp);
  }
});

function selectBodyFilter(bodyId) {
  selectedBody.value = bodyId;
  currentPage.value = 1;
}

function resetFilters() {
  selectedBody.value = 'all';
  selectedStatus.value = 'all';
  searchQuery.value = '';
  currentPage.value = 1;
}

function nextOrderForBody(bodyId) {
  const matching = facts.value.filter((f) => f.body_id === bodyId);
  if (!matching.length) return 1;
  return Math.max(...matching.map((f) => Number(f.urutan) || 0)) + 1;
}

function openCreateModal() {
  isEditing.value = false;
  formError.value = '';
  const initialBody = selectedBody.value !== 'all' ? selectedBody.value : 'bumi';
  formData.value = {
    ...DEFAULT_FACT,
    body_id: initialBody,
    urutan: nextOrderForBody(initialBody),
  };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function openEditModal(fact) {
  isEditing.value = true;
  formError.value = '';
  formData.value = {
    fact_id: fact.fact_id,
    body_id: fact.body_id,
    judul: fact.judul || '',
    isi_fakta: fact.isi_fakta || '',
    sumber_referensi: fact.sumber_referensi || 'NASA',
    urutan: Number(fact.urutan || 1),
    is_active: fact.is_active !== false,
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

const confirmStatusTarget = ref(null);

function openStatusModal(fact) {
  if (togglingId.value === fact.fact_id) return;
  const isCurrentlyActive = fact.is_active !== false;
  confirmStatusTarget.value = {
    item: fact,
    nextState: !isCurrentlyActive,
  };
}

async function confirmToggleActive() {
  if (!confirmStatusTarget.value) return;
  const { item: fact, nextState } = confirmStatusTarget.value;
  if (togglingId.value === fact.fact_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  togglingId.value = fact.fact_id;

  try {
    const { error: updErr } = await client
      .from('facts')
      .update({ is_active: nextState })
      .eq('fact_id', fact.fact_id);

    if (updErr) throw updErr;
    fact.is_active = nextState;
    confirmStatusTarget.value = null;
    showNotification('success', `Kartu fakta "${fact.judul}" berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
  } catch (err) {
    confirmStatusTarget.value = null;
    showNotification('error', formatSupabaseError(err, 'Tidak bisa memperbarui status kartu fakta.'));
  } finally {
    togglingId.value = '';
  }
}

async function handleSave() {
  formError.value = '';
  if (!ALLOWED_BODY_IDS.has(formData.value.body_id)) {
    formError.value = 'Entitas benda langit tidak valid.';
    return;
  }
  if (!formData.value.judul?.trim()) {
    formError.value = 'Judul singkat fakta wajib diisi.';
    return;
  }
  if (!formData.value.isi_fakta?.trim()) {
    formError.value = 'Isi kalimat fakta wajib diisi.';
    return;
  }
  if (!Number.isFinite(Number(formData.value.urutan)) || Number(formData.value.urutan) < 1) {
    formError.value = 'Urutan kartu minimal bernilai 1.';
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const payload = {
      body_id: formData.value.body_id,
      judul: formData.value.judul.trim(),
      isi_fakta: formData.value.isi_fakta.trim(),
      sumber_referensi: formData.value.sumber_referensi?.trim() || 'NASA',
      urutan: Math.floor(Number(formData.value.urutan)),
      is_active: formData.value.is_active !== false,
    };

    if (isEditing.value && formData.value.fact_id) {
      const { error: updErr } = await client
        .from('facts')
        .update(payload)
        .eq('fact_id', formData.value.fact_id);
      if (updErr) throw updErr;
      showNotification('success', `Kartu fakta "${payload.judul}" berhasil diperbarui.`);
    } else {
      const { error: insErr } = await client.from('facts').insert(payload);
      if (insErr) throw insErr;
      showNotification('success', `Kartu fakta "${payload.judul}" berhasil ditambahkan.`);
    }

    saving.value = false;
    closeModal();
    await loadFacts();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Tidak bisa memperbarui kartu fakta.');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!deletingFact.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const { error: delErr } = await client
      .from('facts')
      .delete()
      .eq('fact_id', deletingFact.value.fact_id);

    if (delErr) throw delErr;
    showNotification('success', `Kartu fakta "${deletingFact.value.judul}" telah dihapus.`);
    deletingFact.value = null;
    await loadFacts();
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value);
    }
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Tidak bisa menghapus kartu fakta.'));
  } finally {
    saving.value = false;
  }
}

function exportCsv() {
  if (!filteredFacts.value.length) {
    showNotification('error', 'Tidak ada data kartu fakta untuk diekspor.');
    return;
  }
  const headers = ['fact_id', 'body_id', 'urutan', 'judul', 'isi_fakta', 'sumber_referensi', 'is_active'];
  const rows = filteredFacts.value.map((f) => [
    f.fact_id,
    f.body_id,
    f.urutan ?? 1,
    f.judul || '',
    f.isi_fakta || '',
    f.sumber_referensi || 'NASA',
    f.is_active !== false ? 'true' : 'false',
  ]);
  downloadSafeCsv(`astrosphere_facts_${Date.now()}.csv`, headers, rows);
  showNotification('success', `Berhasil mengekspor ${filteredFacts.value.length} kartu fakta ke CSV.`);
}

async function handleImportSubmit() {
  importError.value = '';
  if (!importText.value.trim()) {
    importError.value = 'Silakan tempelkan array JSON kartu fakta yang valid.';
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
      const bId = String(row.body_id || '').toLowerCase().trim();
      if (!ALLOWED_BODY_IDS.has(bId)) {
        importError.value = `Baris ${i + 1}: body_id "${row.body_id}" tidak valid.`;
        return;
      }
      if (!row.judul?.trim() || !row.isi_fakta?.trim()) {
        importError.value = `Baris ${i + 1}: judul dan isi_fakta wajib diisi.`;
        return;
      }

      const rawUrutan = row.urutan;
      const parsedUrutan = rawUrutan !== undefined && rawUrutan !== null && String(rawUrutan).trim() !== ''
        ? Number(rawUrutan)
        : 1;
      if (!Number.isFinite(parsedUrutan) || !Number.isInteger(parsedUrutan) || parsedUrutan < 1) {
        importError.value = `Baris ${i + 1}: urutan "${rawUrutan}" harus berupa angka bulat minimal 1.`;
        return;
      }

      const isActiveRaw = row.is_active;
      const isActive = isActiveRaw === undefined || isActiveRaw === null
        ? true
        : (typeof isActiveRaw === 'string'
          ? !['false', '0', 'no', 'nonaktif'].includes(isActiveRaw.trim().toLowerCase())
          : Boolean(isActiveRaw));

      cleanRows.push({
        body_id: bId,
        judul: row.judul.trim(),
        isi_fakta: row.isi_fakta.trim(),
        sumber_referensi: row.sumber_referensi?.trim() || 'NASA',
        urutan: parsedUrutan,
        is_active: isActive,
      });
    }

    const client = getSupabaseClient();
    if (!client) return;

    saving.value = true;
    const { error: insErr } = await client.from('facts').insert(cleanRows);
    if (insErr) throw insErr;

    showNotification('success', `Berhasil mengimpor ${cleanRows.length} kartu fakta.`);
    importModalOpen.value = false;
    importText.value = '';
    await loadFacts();
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
  loadFacts();
});
</script>

<template>
  <div class="admin-facts-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen "Tahukah Kamu?"</h1>
        <p class="page-desc">Kelola kartu fakta kosmik untuk 16 entitas benda langit yang tampil di Jurnal Penjelajah.</p>
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
          <span>Tambah Fakta</span>
        </button>
      </div>
    </div>

    <!-- Notifikasi -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- DISTRIBUSI KARTU PER ENTITAS -->
    <div class="card-section dist-card">
      <div class="dist-head">
        <span class="dist-title">Distribusi Kartu per Entitas (Klik untuk menyaring)</span>
        <button v-if="selectedBody !== 'all'" type="button" class="btn-reset-link" @click="selectBodyFilter('all')">
          Reset Entitas
        </button>
      </div>
      <div class="dist-grid">
        <button
          v-for="b in BODY_OPTIONS"
          :key="b.id"
          type="button"
          class="dist-chip"
          :class="{ active: selectedBody === b.id, empty: bodyCountMap[b.id] === 0 }"
          @click="selectBodyFilter(selectedBody === b.id ? 'all' : b.id)"
        >
          <span class="dist-dot" :style="{ backgroundColor: bodyColor(b.id) }" />
          <span class="dist-name">{{ b.name }}</span>
          <span class="dist-count">{{ bodyCountMap[b.id] }} kartu</span>
        </button>
      </div>
    </div>

    <!-- FILTERS -->
    <div class="card-section filters-bar">
      <div class="filter-field">
        <label>Entitas Benda Langit</label>
        <select v-model="selectedBody" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua Entitas ({{ facts.length }})</option>
          <option v-for="b in BODY_OPTIONS" :key="b.id" :value="b.id">{{ b.name }} ({{ b.group }})</option>
        </select>
      </div>

      <div class="filter-field">
        <label>Status Publikasi</label>
        <select v-model="selectedStatus" class="adm-select" @change="currentPage = 1">
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <div class="filter-field search">
        <label>Pencarian Kartu Fakta</label>
        <input v-model="searchQuery" type="text" placeholder="Cari judul fakta, isi, atau referensi..." class="adm-input" @input="currentPage = 1" />
      </div>

      <button type="button" class="btn-head line" @click="resetFilters">
        Reset
      </button>
    </div>

    <!-- TABEL KARTU FAKTA -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat kartu fakta…</p>
      </div>

      <div v-else-if="!filteredFacts.length" class="empty-state">
        <UiIcon name="info" :size="26" />
        <p>Belum ada kartu fakta yang cocok dengan filter atau kata kunci pencarian.</p>
        <div class="empty-actions">
          <button v-if="facts.length" type="button" class="btn-head line" @click="resetFilters">Tampilkan Semua</button>
          <button type="button" class="btn-head primary" @click="openCreateModal">Tambah Kartu Pertama</button>
        </div>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 72px;">Urut</th>
            <th style="width: 145px;">Entitas</th>
            <th>Judul &amp; Penjelasan Singkat</th>
            <th style="width: 150px;">Referensi</th>
            <th style="width: 96px; text-align: center;">Status</th>
            <th style="width: 110px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in paginatedFacts" :key="f.fact_id">
            <td>
              <span class="order-badge">#{{ f.urutan }}</span>
            </td>
            <td>
              <div class="entity-pill">
                <span class="dist-dot" :style="{ backgroundColor: bodyColor(f.body_id) }" />
                <span>{{ bodyName(f.body_id) }}</span>
              </div>
            </td>
            <td>
              <div class="fact-cell">
                <b>{{ f.judul }}</b>
                <p>{{ f.isi_fakta }}</p>
              </div>
            </td>
            <td>
              <span class="ref-tag">{{ f.sumber_referensi || 'NASA' }}</span>
            </td>
            <td style="text-align: center;">
              <button
                type="button"
                class="adm-switch-btn"
                :class="{ on: f.is_active !== false }"
                :disabled="togglingId === f.fact_id"
                :title="f.is_active !== false ? 'Klik untuk menonaktifkan fakta' : 'Klik untuk mengaktifkan fakta'"
                @click="openStatusModal(f)"
              >
                <span class="adm-switch-track" aria-hidden="true">
                  <span class="adm-switch-thumb" />
                </span>
                <span class="adm-switch-label">{{ togglingId === f.fact_id ? '…' : (f.is_active !== false ? 'Aktif' : 'Nonaktif') }}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-action edit" title="Ubah &amp; Pratinjau" @click="openEditModal(f)">
                  <UiIcon name="edit" :size="14" />
                </button>
                <button type="button" class="btn-action del" title="Hapus Fakta" @click="deletingFact = f">
                  <UiIcon name="hapus" :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINASI -->
      <div v-if="filteredFacts.length > itemsPerPage" class="pagination-bar">
        <span>Menampilkan {{ paginatedFacts.length }} dari {{ filteredFacts.length }} kartu fakta</span>
        <div class="page-btns">
          <button type="button" :disabled="currentPage <= 1" @click="currentPage--">Sebelumnya</button>
          <span class="page-ind">Hal {{ currentPage }} / {{ totalPages }}</span>
          <button type="button" :disabled="currentPage >= totalPages" @click="currentPage++">Selanjutnya</button>
        </div>
      </div>
    </div>

    <!-- MODAL EDIT / TAMBAH & PRATINJAU KARTU FAKTA -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ isEditing ? 'Ubah Kartu Fakta' : 'Tambah Kartu Fakta Baru' }}</h3>
            <p class="modal-sub">Tampil di Jurnal Penjelajah &amp; tombol "Tahukah kamu?" pada panel planet.</p>
          </div>
          <div class="modal-mode-tabs">
            <button type="button" :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button type="button" :class="{ on: modalViewMode === 'PREVIEW' }" @click="modalViewMode = 'PREVIEW'">Pratinjau Kartu</button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <!-- FORMULIR INPUT -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>

          <div class="grid-2">
            <label class="field">
              <span>Entitas Benda Langit *</span>
              <select v-model="formData.body_id" class="adm-select" required>
                <option v-for="b in BODY_OPTIONS" :key="b.id" :value="b.id">{{ b.name }} ({{ b.group }})</option>
              </select>
            </label>
            <label class="field">
              <span>Urutan Tampil *</span>
              <input v-model.number="formData.urutan" type="number" min="1" max="99" required />
            </label>
          </div>

          <label class="field">
            <span>Judul / Angka Mengejutkan *</span>
            <input v-model="formData.judul" type="text" placeholder="misal: 99,86% atau Menyimpan es" required />
          </label>

          <label class="field">
            <span>Isi Penjelasan Fakta Singkat *</span>
            <textarea v-model="formData.isi_fakta" rows="3" placeholder="Tuliskan satu hingga dua kalimat fakta ilmiah yang mudah dipahami siswa..." required />
          </label>

          <label class="field">
            <span>Sumber Referensi</span>
            <input v-model="formData.sumber_referensi" type="text" placeholder="misal: NASA / NASA JPL" />
          </label>

          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan kartu fakta ini (ditampilkan di Jurnal Penjelajah)</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : (isEditing ? 'Simpan Perubahan' : 'Tambah Fakta') }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU KARTU JURNAL SISWA -->
        <div v-else class="modal-body preview-body scroll">
          <div class="pv-entity-bar">
            <span class="pv-entity-dot" :style="{ backgroundColor: bodyColor(formData.body_id) }" />
            <div>
              <b class="pv-entity-name">{{ bodyName(formData.body_id) }}</b>
              <span class="pv-entity-sub">{{ bodyGroup(formData.body_id) }} · Urutan #{{ formData.urutan }}</span>
            </div>
          </div>

          <article class="pv-fact-card" :style="{ '--c': bodyColor(formData.body_id) }">
            <div class="pv-fc-head">
              <span class="pv-fc-lbl">TAHUKAH KAMU?</span>
              <span class="pv-fc-step">Kartu #{{ formData.urutan }}</span>
            </div>
            <h3 class="pv-fc-title">{{ formData.judul || 'Judul Fakta Singkat' }}</h3>
            <p class="pv-fc-text">{{ formData.isi_fakta || 'Kalimat penjelasan fakta ilmiah akan tampil di sini.' }}</p>
            <div class="pv-fc-foot">
              <span>Sumber rujukan: {{ formData.sumber_referensi || 'NASA' }}</span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI HAPUS -->
    <div v-if="deletingFact" class="modal-backdrop" @click.self="!saving && (deletingFact = null)">
      <div class="modal-card small">
        <h3 class="modal-title">Hapus Kartu Fakta?</h3>
        <p class="modal-desc">Apakah Anda yakin ingin menghapus kartu <b>"{{ deletingFact.judul }}"</b> pada entitas {{ bodyName(deletingFact.body_id) }}?</p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="saving" @click="deletingFact = null">Batal</button>
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
          {{ confirmStatusTarget.nextState ? 'Aktifkan Kartu Fakta?' : 'Nonaktifkan Kartu Fakta?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="confirmStatusTarget.nextState">
            Ingin mengaktifkan kembali kartu fakta <b>"{{ confirmStatusTarget.item.judul }}"</b> agar tampil di Jurnal Penjelajah?
          </template>
          <template v-else>
            Ingin menonaktifkan kartu fakta <b>"{{ confirmStatusTarget.item.judul }}"</b>? Kartu ini akan disembunyikan sementara dari Jurnal Penjelajah.
          </template>
        </p>
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
          <h3 class="modal-title">Impor Massal Kartu Fakta (JSON)</h3>
          <button type="button" class="btn-close-modal" :disabled="saving" @click="closeImportModal"><UiIcon name="tutup" :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="hint">Tempelkan array objek JSON dengan kolom: <code>body_id</code>, <code>judul</code>, <code>isi_fakta</code>, <code>sumber_referensi</code>, <code>urutan</code>, <code>is_active</code>.</p>
          <textarea v-model="importText" rows="9" placeholder='[ { "body_id": "bumi", "judul": "71% Air", "isi_fakta": "...", "sumber_referensi": "NASA", "urutan": 4 } ]' class="import-textarea" />
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
.admin-facts-page { display: flex; flex-direction: column; gap: 18px; }
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

.card-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }

/* Distribusi Entitas */
.dist-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.dist-head { display: flex; align-items: center; justify-content: space-between; }
.dist-title { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
.btn-reset-link { border: none; background: none; color: #2563eb; font-size: 12.5px; font-weight: 500; cursor: pointer; }
.dist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(145px, 1fr)); gap: 8px; }
.dist-chip { display: flex; align-items: center; gap: 7px; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; cursor: pointer; text-align: left; transition: all .15s; }
.dist-chip:hover { border-color: #93c5fd; background: #eff6ff; }
.dist-chip.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 1px #2563eb; }
.dist-chip.empty { background: #fffbeb; border-color: #fde68a; }
.dist-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
.dist-name { font-size: 12.5px; font-weight: 500; color: #0f172a; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dist-count { font-size: 11px; font-weight: 500; color: #2563eb; white-space: nowrap; }

/* Filters */
.filters-bar { display: flex; align-items: flex-end; gap: 14px; padding: 14px 18px; flex-wrap: wrap; }
.filter-field { display: flex; flex-direction: column; gap: 4px; min-width: 190px; }
.filter-field.search { flex: 1; min-width: 220px; }
.filter-field label { font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; }
.adm-select, .adm-input { height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background: #ffffff; color: #0f172a; }

/* Table */
.table-wrap { overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.adm-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.order-badge { padding: 3px 8px; border-radius: 6px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 600; }
.entity-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 999px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500; color: #0f172a; }
.fact-cell b { display: block; color: #0f172a; font-size: 14px; font-weight: 600; }
.fact-cell p { margin: 2px 0 0; font-size: 12.5px; color: #64748b; line-height: 1.45; }
.ref-tag { font-size: 12px; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-weight: 500; }

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
.modal-card { width: 100%; max-width: 680px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
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
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; }
.field input, .field select { min-height: 38px; height: 38px; padding: 0 12px; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }

/* Pratinjau Gelap */
.preview-body { background: #0b1021; color: #ffffff; }
.pv-entity-bar { display: flex; align-items: center; gap: 10px; }
.pv-entity-dot { width: 24px; height: 24px; border-radius: 50%; flex: none; }
.pv-entity-name { display: block; font-size: 15px; font-weight: 600; color: #ffffff; }
.pv-entity-sub { font-size: 12px; color: #94a3b8; }

.pv-fact-card {
  background: linear-gradient(155deg, rgba(20, 29, 64, 0.92), rgba(11, 16, 38, 0.96));
  border: 1px solid rgba(148, 174, 255, 0.22);
  border-top: 3px solid var(--c, #38bdf8);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pv-fc-head { display: flex; align-items: center; justify-content: space-between; }
.pv-fc-lbl { font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 0.08em; }
.pv-fc-step { font-size: 12px; color: #94a3b8; }
.pv-fc-title { margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; line-height: 1.3; }
.pv-fc-text { margin: 0; font-size: 14px; color: #dbeafe; line-height: 1.6; }
.pv-fc-foot { padding-top: 10px; border-top: 1px solid rgba(148, 174, 255, 0.14); font-size: 12px; color: #94a3b8; }

.hint { margin: 0; font-size: 12.5px; color: #64748b; }
.import-textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; background-color: #ffffff; color: #0f172a; }
.error-text { color: #dc2626; font-size: 13px; margin: 0; }
</style>

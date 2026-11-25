<script setup>
// Halaman Pengelola Bank Soal Kuis (/admin/quizzes) — CRUD, Pratinjau Kuis Siswa, & Ekspor/Impor
import { ref, computed, watch, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError, downloadSafeCsv, parseAdminJsonBatch } from '~/utils/adminAuth.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const togglingId = ref('');
const error = ref('');
const formError = ref('');
const notification = ref(null);

const questions = ref([]);
const selectedPlanet = ref('all');
const searchQuery = ref('');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 8;

// Modal CRUD & Pratinjau
const modalOpen = ref(false);
const isEditing = ref(false);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'
const deletingQuestion = ref(null);
const confirmStatusTarget = ref(null);
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

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const DEFAULT_QUESTION = {
  planet_id: 'earth',
  soal: '',
  opsi: ['', '', '', ''],
  kunci_jawaban: 0,
  bobot_poin: 50,
  pembahasan_edukatif: '',
  is_active: true,
};

const formData = ref({ ...DEFAULT_QUESTION });

async function loadQuestions() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    questions.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Tidak bisa memuat bank soal.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadQuestions();
}

// Penyaringan Daftar
const filteredQuestions = computed(() => {
  return questions.value.filter((q) => {
    if (selectedPlanet.value !== 'all' && q.planet_id !== selectedPlanet.value) {
      return false;
    }
    if (searchQuery.value) {
      const s = searchQuery.value.toLowerCase();
      const inOptions = Array.isArray(q.opsi) ? q.opsi.some((opt) => String(opt).toLowerCase().includes(s)) : false;
      return q.soal?.toLowerCase().includes(s) || q.pembahasan_edukatif?.toLowerCase().includes(s) || inOptions;
    }
    return true;
  });
});

const ALLOWED_PLANET_IDS = new Set(PLANET_OPTIONS.map((p) => p.id));

const totalPages = computed(() => Math.ceil(filteredQuestions.value.length / itemsPerPage) || 1);
const paginatedQuestions = computed(() => {
  const safePage = Math.min(Math.max(1, currentPage.value), totalPages.value);
  const start = (safePage - 1) * itemsPerPage;
  return filteredQuestions.value.slice(start, start + itemsPerPage);
});

watch([selectedPlanet, searchQuery], () => {
  currentPage.value = 1;
});

watch(totalPages, (tp) => {
  if (currentPage.value > tp) {
    currentPage.value = tp;
  }
});

function openCreateModal() {
  formError.value = '';
  isEditing.value = false;
  formData.value = { ...DEFAULT_QUESTION, opsi: ['', '', '', ''] };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function openEditModal(q) {
  formError.value = '';
  isEditing.value = true;
  let cleanOptions = ['', '', '', ''];
  if (Array.isArray(q.opsi)) {
    cleanOptions = [q.opsi[0] || '', q.opsi[1] || '', q.opsi[2] || '', q.opsi[3] || ''];
  } else if (q.pilihan_a != null) {
    cleanOptions = [q.pilihan_a || '', q.pilihan_b || '', q.pilihan_c || '', q.pilihan_d || ''];
  }

  let cleanAnswer = 0;
  if (Number.isInteger(q.kunci_jawaban)) cleanAnswer = q.kunci_jawaban;
  else if (typeof q.jawaban_benar === 'string') {
    cleanAnswer = { A: 0, B: 1, C: 2, D: 3 }[q.jawaban_benar.toUpperCase()] ?? 0;
  }

  formData.value = {
    question_id: q.question_id,
    planet_id: q.planet_id,
    soal: q.soal || q.teks_soal || '',
    opsi: cleanOptions,
    kunci_jawaban: cleanAnswer,
    bobot_poin: Number(q.bobot_poin || q.poin_hadiah || 50),
    pembahasan_edukatif: q.pembahasan_edukatif || q.penjelasan_pembahasan || '',
    is_active: q.is_active !== false,
  };
  modalViewMode.value = 'EDIT';
  modalOpen.value = true;
}

function openStatusModal(q) {
  if (togglingId.value === q.question_id) return;
  const isCurrentlyActive = q.is_active !== false;
  confirmStatusTarget.value = {
    item: q,
    nextState: !isCurrentlyActive,
  };
}

async function confirmToggleActive() {
  if (!confirmStatusTarget.value) return;
  const { item: q, nextState } = confirmStatusTarget.value;
  if (togglingId.value === q.question_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  togglingId.value = q.question_id;

  try {
    const { error: updErr } = await client
      .from('questions')
      .update({ is_active: nextState })
      .eq('question_id', q.question_id);

    if (updErr) throw updErr;
    q.is_active = nextState;
    confirmStatusTarget.value = null;
    showNotification('success', `Soal kuis berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
  } catch (err) {
    confirmStatusTarget.value = null;
    showNotification('error', formatSupabaseError(err, 'Tidak bisa memperbarui status soal.'));
  } finally {
    togglingId.value = '';
  }
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

async function handleSave() {
  formError.value = '';
  if (!ALLOWED_PLANET_IDS.has(formData.value.planet_id)) {
    formError.value = 'Target planet tidak valid.';
    return;
  }
  const soalTrimmed = (formData.value.soal || '').trim();
  if (!soalTrimmed) {
    formError.value = 'Teks pertanyaan soal wajib diisi.';
    return;
  }
  const cleanOpsi = Array.isArray(formData.value.opsi)
    ? formData.value.opsi.slice(0, 4).map((o) => String(o ?? '').trim())
    : [];
  if (cleanOpsi.length !== 4 || cleanOpsi.some((o) => !o)) {
    formError.value = 'Keempat opsi jawaban (A, B, C, D) wajib diisi lengkap.';
    return;
  }
  const ansIdx = Number(formData.value.kunci_jawaban);
  if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx > 3) {
    formError.value = 'Kunci jawaban harus dipilih antara Opsi A (0) hingga D (3).';
    return;
  }
  const pts = Number(formData.value.bobot_poin);
  if (!Number.isFinite(pts) || pts < 1) {
    formError.value = 'Bobot poin hadiah minimal bernilai 1.';
    return;
  }
  const explanationTrimmed = (formData.value.pembahasan_edukatif || '').trim();
  if (!explanationTrimmed) {
    formError.value = 'Pembahasan ilmiah & edukatif wajib diisi.';
    return;
  }

  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const payload = {
      planet_id: formData.value.planet_id,
      soal: soalTrimmed,
      opsi: cleanOpsi,
      kunci_jawaban: ansIdx,
      bobot_poin: Math.round(pts),
      pembahasan_edukatif: explanationTrimmed,
      is_active: formData.value.is_active !== false,
    };

    if (isEditing.value && formData.value.question_id) {
      const { error: updErr } = await client
        .from('questions')
        .update(payload)
        .eq('question_id', formData.value.question_id);
      if (updErr) throw updErr;
      showNotification('success', 'Soal kuis berhasil diperbarui.');
    } else {
      const { error: insErr } = await client
        .from('questions')
        .insert(payload);
      if (insErr) throw insErr;
      showNotification('success', 'Soal kuis baru berhasil ditambahkan.');
    }

    saving.value = false;
    closeModal();
    await loadQuestions();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Tidak bisa memperbarui soal kuis.');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (!deletingQuestion.value) return;
  const client = getSupabaseClient();
  if (!client) return;

  saving.value = true;
  try {
    const { error: delErr } = await client
      .from('questions')
      .delete()
      .eq('question_id', deletingQuestion.value.question_id);

    if (delErr) throw delErr;
    showNotification('success', 'Soal kuis telah dihapus.');
    deletingQuestion.value = null;
    await loadQuestions();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Tidak bisa menghapus soal.'));
  } finally {
    saving.value = false;
  }
}

// Ekspor & Impor
function exportJson() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredQuestions.value, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute('href', dataStr);
  dlAnchor.setAttribute('download', `quiz_questions_${Date.now()}.json`);
  dlAnchor.click();
}

function exportCsv() {
  if (!filteredQuestions.value.length) return;
  const headers = ['question_id', 'planet_id', 'soal', 'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'kunci_jawaban', 'bobot_poin', 'pembahasan_edukatif', 'is_active'];
  const rows = filteredQuestions.value.map((q) => {
    const opts = Array.isArray(q.opsi) ? q.opsi : [];
    return [
      q.question_id,
      q.planet_id,
      q.soal || '',
      opts[0] || '',
      opts[1] || '',
      opts[2] || '',
      opts[3] || '',
      q.kunci_jawaban,
      q.bobot_poin || 50,
      q.pembahasan_edukatif || '',
      q.is_active !== false ? 'true' : 'false',
    ];
  });
  downloadSafeCsv(`quiz_questions_${Date.now()}.csv`, headers, rows);
}

async function handleImportSubmit() {
  importError.value = '';
  if (!importText.value.trim()) {
    importError.value = 'Silakan tempelkan data JSON yang valid.';
    return;
  }

  try {
    const batch = parseAdminJsonBatch(importText.value, 'Format JSON harus berupa array objek soal yang tidak kosong.');
    if (!batch.ok) {
      importError.value = batch.error;
      return;
    }
    const parsed = batch.rows;

    const cleanRows = [];
    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];

      const planetId = String(row.planet_id || '').toLowerCase().trim();
      if (!ALLOWED_PLANET_IDS.has(planetId)) {
        importError.value = `Baris ${i + 1}: planet_id "${row.planet_id}" tidak valid.`;
        return;
      }

      const soalText = String(row.soal ?? '').trim();
      if (!soalText) {
        importError.value = `Baris ${i + 1}: teks pertanyaan (soal) wajib diisi.`;
        return;
      }

      const rawOpts = Array.isArray(row.opsi)
        ? row.opsi
        : [row.opsi_a, row.opsi_b, row.opsi_c, row.opsi_d];
      if (!Array.isArray(rawOpts) || rawOpts.length < 4) {
        importError.value = `Baris ${i + 1}: wajib memiliki 4 pilihan jawaban (array opsi atau opsi_a..opsi_d).`;
        return;
      }
      const cleanOpts = rawOpts.slice(0, 4).map((o) => String(o ?? '').trim());
      if (cleanOpts.some((o) => !o)) {
        importError.value = `Baris ${i + 1}: keempat pilihan jawaban (A–D) wajib diisi non-kosong.`;
        return;
      }

      const rawAns = row.kunci_jawaban;
      const ans = rawAns !== undefined && rawAns !== null && String(rawAns).trim() !== ''
        ? Number(rawAns)
        : NaN;
      if (!Number.isInteger(ans) || ans < 0 || ans > 3) {
        importError.value = `Baris ${i + 1}: kunci_jawaban "${rawAns}" harus berupa integer 0–3.`;
        return;
      }

      const rawPts = row.bobot_poin;
      const pts = rawPts !== undefined && rawPts !== null && String(rawPts).trim() !== ''
        ? Number(rawPts)
        : 50;
      if (!Number.isFinite(pts) || pts < 1) {
        importError.value = `Baris ${i + 1}: bobot_poin "${rawPts}" harus berupa angka minimal 1.`;
        return;
      }

      const isActiveRaw = row.is_active;
      const isActive = isActiveRaw === undefined || isActiveRaw === null
        ? true
        : (typeof isActiveRaw === 'string'
          ? !['false', '0', 'no', 'nonaktif'].includes(isActiveRaw.trim().toLowerCase())
          : Boolean(isActiveRaw));

      const pembahasanText = String(row.pembahasan_edukatif ?? '').trim();
      if (!pembahasanText) {
        importError.value = `Baris ${i + 1}: pembahasan_edukatif wajib diisi.`;
        return;
      }

      cleanRows.push({
        planet_id: planetId,
        soal: soalText,
        opsi: cleanOpts,
        kunci_jawaban: ans,
        bobot_poin: Math.round(pts),
        pembahasan_edukatif: pembahasanText,
        is_active: isActive,
      });
    }

    const client = getSupabaseClient();
    if (!client) return;

    saving.value = true;
    const { error: insErr } = await client.from('questions').insert(cleanRows);
    if (insErr) throw insErr;

    showNotification('success', `Berhasil mengimpor ${cleanRows.length} soal kuis.`);
    importModalOpen.value = false;
    importText.value = '';
    await loadQuestions();
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
  loadQuestions();
});
</script>

<template>
  <div class="admin-quizzes-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Bank Soal Kuis Astronomi</h1>
        <p class="page-desc">Kelola soal evaluasi per planet, kunci jawaban, bobot hadiah bintang, dan pembahasan edukatif.</p>
      </div>
      <div class="head-actions">
        <button class="btn-head primary" @click="openCreateModal">
          <UiIcon name="plus" :size="16" /> Tambah Soal
        </button>
        <button class="btn-head line" @click="exportJson">
          Ekspor JSON
        </button>
        <button class="btn-head line" @click="exportCsv">
          Ekspor CSV
        </button>
        <button class="btn-head ghost" @click="importModalOpen = true">
          Impor Soal
        </button>
      </div>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- FILTERS -->
    <div class="card-section filters-bar">
      <div class="filter-field">
        <label>Filter Planet</label>
        <select v-model="selectedPlanet" class="adm-select">
          <option value="all">Semua Planet ({{ questions.length }})</option>
          <option v-for="p in PLANET_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
        </select>
      </div>

      <div class="filter-field search">
        <label>Pencarian Soal</label>
        <input v-model="searchQuery" type="text" placeholder="Cari pertanyaan, opsi, pembahasan..." class="adm-input" />
      </div>
    </div>

    <!-- TABEL SOAL KUIS -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat bank soal kuis…</p>
      </div>

      <div v-else-if="!filteredQuestions.length" class="empty-state">
        <UiIcon name="info" :size="24" />
        <p>Belum ada soal kuis yang cocok dengan filter ini.</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 96px;">Planet</th>
            <th style="width: 42%; min-width: 320px;">Pertanyaan Soal</th>
            <th style="width: 18%; min-width: 150px;">Kunci Jawaban</th>
            <th style="width: 105px;">Bobot Poin</th>
            <th style="width: 24%; min-width: 210px;">Pembahasan Edukatif</th>
            <th style="width: 128px; text-align: center;">Status</th>
            <th style="width: 92px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in paginatedQuestions" :key="q.question_id">
            <td>
              <span class="planet-badge capitalize">{{ q.planet_id }}</span>
            </td>
            <td>
              <b class="q-text">{{ q.soal }}</b>
            </td>
            <td>
              <span class="ans-badge">
                Opsi {{ OPTION_LABELS[q.kunci_jawaban] }}: {{ q.opsi?.[q.kunci_jawaban] || '—' }}
              </span>
            </td>
            <td>
              <span class="points-tag">+{{ q.bobot_poin || 50 }} Bintang</span>
            </td>
            <td>
              <p class="desc-clamp">{{ q.pembahasan_edukatif || '—' }}</p>
            </td>
            <td style="text-align: center;">
              <button
                type="button"
                class="adm-switch-btn"
                :class="{ on: q.is_active !== false }"
                :disabled="togglingId === q.question_id"
                :title="q.is_active !== false ? 'Klik untuk menonaktifkan soal' : 'Klik untuk mengaktifkan soal'"
                @click="openStatusModal(q)"
              >
                <span class="adm-switch-track" aria-hidden="true">
                  <span class="adm-switch-thumb" />
                </span>
                <span class="adm-switch-label">{{ togglingId === q.question_id ? '…' : (q.is_active !== false ? 'Aktif' : 'Nonaktif') }}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-action edit" title="Ubah Soal" @click="openEditModal(q)">
                  <UiIcon name="edit" :size="14" />
                </button>
                <button type="button" class="btn-action del" title="Hapus Soal" @click="deletingQuestion = q">
                  <UiIcon name="hapus" :size="14" />
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

    <!-- MODAL EDIT / TAMBAH & PRATINJAU KUIS -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ isEditing ? 'Ubah Soal Kuis' : 'Tambah Soal Kuis Baru' }}</h3>
            <p class="modal-sub">Pertanyaan evaluasi ilmiah astronomi</p>
          </div>
          <div class="modal-mode-tabs">
            <button type="button" :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button type="button" :class="{ on: modalViewMode === 'PREVIEW' }" @click="modalViewMode = 'PREVIEW'">Pratinjau Kuis Siswa</button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <!-- FORMULIR INPUT SOAL -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>
          <div class="grid-2">
            <label class="field">
              <span>Target Planet</span>
              <select v-model="formData.planet_id" class="adm-select" required>
                <option v-for="p in PLANET_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
              </select>
            </label>
            <label class="field">
              <span>Bobot Poin Hadiah (Bintang)</span>
              <input v-model.number="formData.bobot_poin" type="number" min="10" max="500" required />
            </label>
          </div>

          <label class="field">
            <span>Teks Pertanyaan Soal</span>
            <textarea v-model="formData.soal" rows="2" placeholder="Tuliskan pertanyaan yang jelas dan edukatif..." required />
          </label>

          <!-- 4 PILIHAN OPSI -->
          <div class="options-box">
            <span class="fs-title">Pilihan Jawaban &amp; Kunci Jawaban Benar</span>
            <div v-for="(lbl, idx) in OPTION_LABELS" :key="lbl" class="option-row">
              <input
                type="radio"
                :name="'correct-opt'"
                :value="idx"
                v-model="formData.kunci_jawaban"
                :id="'opt-' + idx"
                class="radio-key"
              />
              <label :for="'opt-' + idx" class="opt-label">{{ lbl }}</label>
              <input
                v-model="formData.opsi[idx]"
                type="text"
                :placeholder="'Isi teks pilihan ' + lbl"
                class="opt-input"
                required
              />
            </div>
            <small class="hint">Pilih tombol radio di samping kiri opsi yang merupakan <b>kunci jawaban benar</b>.</small>
          </div>

          <label class="field">
            <span>Pembahasan Ilmiah &amp; Edukatif</span>
            <textarea v-model="formData.pembahasan_edukatif" rows="3" placeholder="Penjelasan mengapa jawaban tersebut benar untuk dibaca siswa setelah menjawab..." required />
          </label>

          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan soal ini (muncul di Kuis Planet siswa)</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : (isEditing ? 'Simpan Perubahan' : 'Buat Soal Baru') }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU KUIS SISWA -->
        <div v-else class="modal-body preview-body scroll">
          <div class="preview-quiz-card">
            <span class="pv-badge">Kuis {{ formData.planet_id.toUpperCase() }} · Hadiah +{{ formData.bobot_poin }} Bintang</span>
            <h3 class="pv-question">{{ formData.soal || 'Contoh teks pertanyaan kuis...' }}</h3>

            <div class="pv-options-list">
              <div
                v-for="(lbl, idx) in OPTION_LABELS"
                :key="lbl"
                class="pv-opt-btn"
                :class="{ 'is-correct': idx === formData.kunci_jawaban }"
              >
                <b>{{ lbl }}</b>
                <span>{{ formData.opsi[idx] || '(Pilihan belum diisi)' }}</span>
                <UiIcon v-if="idx === formData.kunci_jawaban" name="cek" :size="16" class="check-ic" />
              </div>
            </div>

            <div class="pv-expl-box">
              <b>Pembahasan Edukatif:</b>
              <p>{{ formData.pembahasan_edukatif || 'Penjelasan ilmiah akan muncul di sini setelah kuis dijawab.' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI HAPUS -->
    <div v-if="deletingQuestion" class="modal-backdrop" @click.self="!saving && (deletingQuestion = null)">
      <div class="modal-card small">
        <h3 class="modal-title">Hapus Soal Kuis?</h3>
        <p class="modal-desc">Apakah Anda yakin ingin menghapus pertanyaan ini dari bank soal <b>{{ deletingQuestion.planet_id }}</b>?</p>
        <p class="q-snippet">"{{ deletingQuestion.soal }}"</p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="saving" @click="deletingQuestion = null">Batal</button>
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
          {{ confirmStatusTarget.nextState ? 'Aktifkan Soal Kuis?' : 'Nonaktifkan Soal Kuis?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="confirmStatusTarget.nextState">
            Ingin mengaktifkan kembali Soal Kuis ini agar muncul di Kuis Planet <b>{{ confirmStatusTarget.item.planet_id }}</b>?
          </template>
          <template v-else>
            Ingin menonaktifkan Soal Kuis ini dari bank soal <b>{{ confirmStatusTarget.item.planet_id }}</b>? Soal tidak akan keluar pada sesi kuis siswa hingga diaktifkan kembali.
          </template>
        </p>
        <p class="adm-confirm-quote">"{{ confirmStatusTarget.item.soal }}"</p>
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
          <h3 class="modal-title">Impor Massal Soal Kuis (JSON)</h3>
          <button type="button" class="btn-close-modal" :disabled="saving" @click="closeImportModal"><UiIcon name="tutup" :size="18" /></button>
        </div>
        <div class="modal-body">
          <p class="hint">Tempelkan array objek JSON dengan format: planet_id, soal, opsi (array 4 pilihan), kunci_jawaban (0-3), bobot_poin, pembahasan_edukatif.</p>
          <textarea v-model="importText" rows="10" placeholder="[ { &quot;planet_id&quot;: &quot;earth&quot;, &quot;soal&quot;: &quot;...&quot;, &quot;opsi&quot;: [&quot;A&quot;,&quot;B&quot;,&quot;C&quot;,&quot;D&quot;], &quot;kunci_jawaban&quot;: 0 } ]" class="import-textarea" />
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
.admin-quizzes-page { display: flex; flex-direction: column; gap: 20px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn-head { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; }
.btn-head.primary { background: #2563eb; color: #fff; }
.btn-head.line { background: #fff; border-color: #cbd5e1; color: #334155; }
.btn-head.ghost { background: #f1f5f9; color: #475569; }
.dash-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.dash-alert.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.dash-alert.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

.filters-bar { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.filter-field { display: flex; flex-direction: column; gap: 6px; }
.filter-field label { font-size: 12px; font-weight: 500; color: #64748b; text-transform: uppercase; }
.filter-field.search { flex: 1; min-width: 200px; }
.adm-select, .adm-input { padding: 0 12px; height: 38px; border-radius: 8px; border: 1px solid #cbd5e1; background: #ffffff; color: #0f172a; font-family: inherit; font-size: 13.5px; }

.table-wrap { padding: 0; overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 500; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.adm-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.planet-badge { padding: 2px 7px; border-radius: 4px; background: #eff6ff; color: #1d4ed8; font-size: 11.5px; font-weight: 500; white-space: nowrap; }
.q-text { color: #0f172a; font-size: 13.5px; font-weight: 600; line-height: 1.48; display: block; min-width: 280px; }
.ans-badge { font-size: 12px; font-weight: 500; color: #16a34a; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 3px 8px; border-radius: 4px; display: inline-block; white-space: normal; line-height: 1.35; }
.points-tag { font-size: 12px; font-weight: 500; color: #d97706; background: #fffbeb; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.desc-clamp { margin: 0; font-size: 12.5px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.btn-action { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; display: grid; place-items: center; cursor: pointer; color: #64748b; }
.btn-action.edit:hover { background: #eff6ff; color: #2563eb; }
.btn-action.del:hover { background: #fef2f2; color: #dc2626; }

.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #f1f5f9; font-size: 13px; color: #64748b; }
.page-btns { display: flex; gap: 8px; }
.page-btns button { padding: 5px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 12.5px; cursor: pointer; }
.page-btns button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 760px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.modal-card.small { max-width: 440px; padding: 24px; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.modal-mode-tabs { display: flex; align-items: center; gap: 6px; }
.modal-mode-tabs button { padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-weight: 500; cursor: pointer; color: #475569; }
.modal-mode-tabs button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; }

.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; }
.field input, .field select { min-height: 38px; height: 38px; padding: 0 12px; }

.options-box { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
.fs-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #2563eb; }
.option-row { display: flex; align-items: center; gap: 10px; }
.radio-key { width: 18px; height: 18px; accent-color: #16a34a; cursor: pointer; }
.opt-label { width: 24px; font-weight: 600; font-size: 14px; color: #0f172a; }
.opt-input { flex: 1; height: 38px; padding: 0 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; }
.hint { font-size: 11.5px; color: #64748b; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.q-snippet { font-size: 13px; color: #64748b; font-style: italic; background: #f8fafc; padding: 10px; border-radius: 6px; }

/* Pratinjau Kuis Siswa */
.preview-body { background: #0b1021; color: #fff; border-radius: 0 0 14px 14px; }
.preview-quiz-card { display: flex; flex-direction: column; gap: 14px; padding: 10px; }
.pv-badge { font-size: 11.5px; color: #5ed1ff; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
.pv-question { margin: 0; font-size: 17px; line-height: 1.4; color: #fff; }
.pv-options-list { display: flex; flex-direction: column; gap: 8px; }
.pv-opt-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 13.5px;
  color: #e2e8f0;
}
.pv-opt-btn.is-correct {
  background: rgba(54, 211, 154, 0.12);
  border-color: rgba(54, 211, 154, 0.4);
  color: #36d39a;
}
.check-ic { margin-left: auto; color: #36d39a; }
.pv-expl-box { padding: 12px 14px; border-radius: 8px; background: rgba(94, 209, 255, 0.08); border: 1px solid rgba(94, 209, 255, 0.2); font-size: 13px; }
.pv-expl-box b { display: block; color: #5ed1ff; margin-bottom: 2px; }
.pv-expl-box p { margin: 0; color: #e2e8f0; line-height: 1.45; }

.import-textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: inherit; font-size: 13px; background-color: #ffffff; color: #0f172a; }
.error-text { color: #dc2626; font-size: 13px; margin: 4px 0 0 0; }
.status-toggle-btn { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid transparent; cursor: pointer; background: #f1f5f9; color: #94a3b8; }
.status-toggle-btn.on { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }
</style>

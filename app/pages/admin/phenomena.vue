<script setup>
// Halaman Pengelola Fenomena (/admin/phenomena) — Simulasi Gerhana & Penyelarasan Orbit
import { ref, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError } from '~/utils/adminAuth.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const error = ref('');
const notification = ref(null);

const phenomena = ref([]);
const editingPheno = ref(null);

const ANIMATION_TYPES = [
  { id: 'SOLAR_ECLIPSE', label: 'Gerhana Matahari (Solar Eclipse)' },
  { id: 'LUNAR_ECLIPSE', label: 'Gerhana Bulan Total (Lunar Eclipse)' },
  { id: 'MOON_PHASES', label: 'Siklus 8 Fase Bulan (Moon Phases)' },
  { id: 'GALILEAN_TRANSIT', label: 'Transit Satelit Galilea (Jupiter)' },
  { id: 'CUSTOM_ALIGNMENT', label: 'Penyelarasan Orbit Kustom (Custom Alignment)' },
];

const formData = ref({
  phenomenon_id: '',
  planet_id: 'earth',
  judul: '',
  tombol_aksi_label: 'Putar Simulasi',
  tipe_animasi: 'SOLAR_ECLIPSE',
  deskripsi_edukatif: '',
  is_active: true,
  konfigurasi_visual: {
    durationSeconds: 20,
    cameraZoomDistance: 35,
    showUmbraPenumbra: true,
  },
});

async function loadPhenomena() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Klien Supabase belum terkonfigurasi.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('phenomena')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchErr) throw fetchErr;
    phenomena.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Gagal memuat daftar fenomena.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadPhenomena();
}

async function toggleActive(item) {
  const client = getSupabaseClient();
  if (!client) return;

  const nextState = !item.is_active;
  item.is_active = nextState;

  try {
    const { error: updErr } = await client
      .from('phenomena')
      .update({ is_active: nextState })
      .eq('phenomenon_id', item.phenomenon_id);

    if (updErr) throw updErr;
    showNotification('success', `Status aktif fenomena "${item.judul}" diperbarui.`);
  } catch (err) {
    item.is_active = !nextState;
    showNotification('error', formatSupabaseError(err, 'Gagal memperbarui status aktif.'));
  }
}

function openEditModal(item) {
  editingPheno.value = item;
  formData.value = {
    phenomenon_id: item.phenomenon_id,
    planet_id: item.planet_id,
    judul: item.judul || '',
    tombol_aksi_label: item.tombol_aksi_label || 'Putar Simulasi',
    tipe_animasi: item.tipe_animasi || 'SOLAR_ECLIPSE',
    deskripsi_edukatif: item.deskripsi_edukatif || '',
    is_active: item.is_active !== false,
    konfigurasi_visual: {
      durationSeconds: item.konfigurasi_visual?.durationSeconds || 20,
      cameraZoomDistance: item.konfigurasi_visual?.cameraZoomDistance || 35,
      showUmbraPenumbra: item.konfigurasi_visual?.showUmbraPenumbra !== false,
    },
  };
}

function closeModal() {
  editingPheno.value = null;
}

async function handleSave() {
  const client = getSupabaseClient();
  if (!client || !editingPheno.value) return;

  saving.value = true;
  try {
    const payload = {
      judul: formData.value.judul,
      tombol_aksi_label: formData.value.tombol_aksi_label,
      tipe_animasi: formData.value.tipe_animasi,
      deskripsi_edukatif: formData.value.deskripsi_edukatif,
      konfigurasi_visual: formData.value.konfigurasi_visual,
      is_active: formData.value.is_active,
    };

    const { error: saveErr } = await client
      .from('phenomena')
      .update(payload)
      .eq('phenomenon_id', editingPheno.value.phenomenon_id);

    if (saveErr) throw saveErr;

    showNotification('success', `Fenomena "${formData.value.judul}" berhasil disimpan.`);
    closeModal();
    await loadPhenomena();
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Gagal menyimpan perubahan fenomena.'));
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
  loadPhenomena();
});
</script>

<template>
  <div class="admin-phenomena-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Laboratorium Fenomena &amp; Penyelarasan Orbit</h1>
        <p class="page-desc">Konfigurasi animasi gerhana Matahari/Bulan, transit satelit, dan penjelasan ilmiah interaktif.</p>
      </div>
      <button class="btn-refresh" :disabled="refreshing" @click="handleRefresh">
        <UiIcon name="ulang" :size="16" :class="{ 'spin-active': refreshing }" />
        <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan Data' }}</span>
      </button>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <!-- TABEL FENOMENA -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat data fenomena dari Supabase…</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 100px;">Planet</th>
            <th>Judul Fenomena</th>
            <th>Tipe Animasi</th>
            <th>Deskripsi Edukatif</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th style="width: 100px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in phenomena" :key="item.phenomenon_id">
            <td>
              <span class="planet-badge capitalize">{{ item.planet_id }}</span>
            </td>
            <td>
              <div class="pheno-title-cell">
                <b>{{ item.judul }}</b>
                <small>Aksi: {{ item.tombol_aksi_label || 'Putar Simulasi' }}</small>
              </div>
            </td>
            <td>
              <span class="anim-tag">{{ item.tipe_animasi }}</span>
            </td>
            <td>
              <p class="desc-clamp">{{ item.deskripsi_edukatif }}</p>
            </td>
            <td style="text-align: center;">
              <button
                type="button"
                class="status-toggle-btn"
                :class="{ on: item.is_active !== false }"
                @click="toggleActive(item)"
              >
                {{ item.is_active !== false ? 'Aktif' : 'Nonaktif' }}
              </button>
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-edit" @click="openEditModal(item)">
                <UiIcon name="atur" :size="15" /> Ubah
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDIT FENOMENA -->
    <div v-if="editingPheno" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Ubah Fenomena: {{ formData.judul }}</h3>
            <p class="modal-sub">Planet {{ formData.planet_id }}</p>
          </div>
          <button class="btn-close-modal" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
        </div>

        <form class="modal-body scroll" @submit.prevent="handleSave">
          <label class="field">
            <span>Judul Fenomena</span>
            <input v-model="formData.judul" type="text" required />
          </label>

          <div class="grid-2">
            <label class="field">
              <span>Label Tombol Aksi Simulasi</span>
              <input v-model="formData.tombol_aksi_label" type="text" required />
            </label>
            <label class="field">
              <span>Tipe Animasi Simulasi</span>
              <select v-model="formData.tipe_animasi" class="adm-select" required>
                <option v-for="t in ANIMATION_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
              </select>
            </label>
          </div>

          <label class="field">
            <span>Deskripsi Edukatif Siswa</span>
            <textarea v-model="formData.deskripsi_edukatif" rows="3" required />
          </label>

          <!-- KONFIGURASI VISUAL -->
          <div class="config-box">
            <span class="fs-title">Konfigurasi Visual Simulasi 3D</span>
            <div class="grid-2">
              <label class="field">
                <span>Durasi Siklus Simulasi (Detik)</span>
                <input v-model.number="formData.konfigurasi_visual.durationSeconds" type="number" min="5" max="120" />
              </label>
              <label class="field">
                <span>Jarak Zoom Kamera (Unit 3D)</span>
                <input v-model.number="formData.konfigurasi_visual.cameraZoomDistance" type="number" min="10" max="100" />
              </label>
            </div>
            <label class="checkbox-row">
              <input v-model="formData.konfigurasi_visual.showUmbraPenumbra" type="checkbox" />
              <span>Tampilkan kerucut bayangan geometri (Umbra &amp; Penumbra)</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-phenomena-page { display: flex; flex-direction: column; gap: 20px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 700; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.btn-refresh { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
.table-wrap { padding: 0; overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
.adm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.planet-badge { padding: 2px 7px; border-radius: 4px; background: #eff6ff; color: #1d4ed8; font-size: 11.5px; font-weight: 600; }
.pheno-title-cell b { display: block; color: #0f172a; }
.pheno-title-cell small { color: #64748b; font-size: 12px; }
.anim-tag { font-size: 11.5px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155; font-family: monospace; }
.desc-clamp { margin: 0; font-size: 13px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.status-toggle-btn { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; border: 1px solid transparent; cursor: pointer; background: #f1f5f9; color: #94a3b8; }
.status-toggle-btn.on { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.btn-edit { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 12.5px; font-weight: 600; cursor: pointer; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 680px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
.modal-title { margin: 0; font-size: 17px; font-weight: 700; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; text-transform: capitalize; }
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; }
.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; }

.config-box { display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
.fs-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #2563eb; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
</style>

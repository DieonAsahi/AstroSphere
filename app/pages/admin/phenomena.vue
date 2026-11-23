<script setup>
// Halaman Pengelola Fenomena (/admin/phenomena) — Simulasi Gerhana & Penyelarasan Orbit 8 Planet
import { ref, computed, onMounted } from 'vue';
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
const selectedPlanet = ref('all');
const editingPheno = ref(null);
const isCreating = ref(false);

const PLANET_OPTIONS = [
  { id: 'mercury', name: 'Merkurius' },
  { id: 'venus', name: 'Venus' },
  { id: 'earth', name: 'Bumi' },
  { id: 'mars', name: 'Mars' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturnus' },
  { id: 'uranus', name: 'Uranus' },
  { id: 'neptune', name: 'Neptunus' },
];

const ANIMATION_TYPES = [
  { id: 'SOLAR_ECLIPSE', label: 'Gerhana Matahari (Solar Eclipse)' },
  { id: 'LUNAR_ECLIPSE', label: 'Gerhana Bulan Total (Lunar Eclipse)' },
  { id: 'MOON_PHASES', label: 'Siklus 8 Fase Bulan (Moon Phases)' },
  { id: 'GALILEAN_TRANSIT', label: 'Transit Satelit Galilea (Jupiter)' },
  { id: 'CUSTOM_ALIGNMENT', label: 'Penyelarasan Orbit Kustom (Custom Alignment)' },
];

const DEFAULT_FORM = {
  phenomenon_id: '',
  planet_id: 'earth',
  judul: '',
  tombol_aksi_label: 'Putar Simulasi Fenomena',
  tipe_animasi: 'CUSTOM_ALIGNMENT',
  deskripsi_edukatif: '',
  penjelasan_matahari: '',
  penjelasan_bulan: '',
  is_active: true,
};

const formData = ref({ ...DEFAULT_FORM });

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

const filteredPhenomena = computed(() => {
  if (selectedPlanet.value === 'all') return phenomena.value;
  return phenomena.value.filter((p) => p.planet_id === selectedPlanet.value);
});

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

function openCreateModal() {
  isCreating.value = true;
  editingPheno.value = { phenomenon_id: null };
  formData.value = {
    ...DEFAULT_FORM,
    planet_id: selectedPlanet.value !== 'all' ? selectedPlanet.value : 'mercury',
  };
}

function openEditModal(item) {
  isCreating.value = false;
  editingPheno.value = item;
  formData.value = {
    phenomenon_id: item.phenomenon_id,
    planet_id: item.planet_id,
    judul: item.judul || '',
    tombol_aksi_label: item.tombol_aksi_label || 'Putar Simulasi Fenomena',
    tipe_animasi: item.tipe_animasi || 'CUSTOM_ALIGNMENT',
    deskripsi_edukatif: item.deskripsi_edukatif || '',
    penjelasan_matahari: item.penjelasan_matahari || item.konfigurasi_visual?.penjelasan_matahari || '',
    penjelasan_bulan: item.penjelasan_bulan || item.konfigurasi_visual?.penjelasan_bulan || '',
    is_active: item.is_active !== false,
  };
}

function closeModal() {
  editingPheno.value = null;
  isCreating.value = false;
}

async function handleSave() {
  const client = getSupabaseClient();
  if (!client || !editingPheno.value) return;

  saving.value = true;
  try {
    const visualConfig = editingPheno.value?.konfigurasi_visual || {};
    visualConfig.penjelasan_matahari = formData.value.penjelasan_matahari;
    visualConfig.penjelasan_bulan = formData.value.penjelasan_bulan;

    const payload = {
      planet_id: formData.value.planet_id,
      judul: formData.value.judul,
      tombol_aksi_label: formData.value.tombol_aksi_label,
      tipe_animasi: formData.value.tipe_animasi,
      deskripsi_edukatif: formData.value.deskripsi_edukatif,
      penjelasan_matahari: formData.value.penjelasan_matahari,
      penjelasan_bulan: formData.value.penjelasan_bulan,
      konfigurasi_visual: visualConfig,
      is_active: formData.value.is_active,
    };

    if (isCreating.value) {
      const { error: insErr } = await client.from('phenomena').insert(payload);
      if (insErr) throw insErr;
      showNotification('success', `Fenomena baru "${formData.value.judul}" berhasil ditambahkan.`);
    } else {
      const { error: saveErr } = await client
        .from('phenomena')
        .update(payload)
        .eq('phenomenon_id', editingPheno.value.phenomenon_id);
      if (saveErr) throw saveErr;
      showNotification('success', `Fenomena "${formData.value.judul}" berhasil disimpan.`);
    }

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
        <h1 class="page-title">Laboratorium Fenomena Astronomi &amp; Gerhana</h1>
        <p class="page-desc">Kelola simulasi edukatif, narasi ilmiah, dan penjelasan interaktif untuk seluruh 8 planet Tata Surya.</p>
      </div>
      <div class="head-actions">
        <button class="btn-primary-action" @click="openCreateModal">
          <UiIcon name="tambah" :size="16" />
          <span>Tambah Fenomena</span>
        </button>
        <button class="btn-refresh" :disabled="refreshing" @click="handleRefresh">
          <UiIcon name="ulang" :size="16" :class="{ 'spin-active': refreshing }" />
          <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan Data' }}</span>
        </button>
      </div>
    </div>

    <!-- Alert Notifikasi -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <!-- FILTER PER PLANET -->
    <div class="filter-strip">
      <label class="filter-label">Filter Planet:</label>
      <div class="planet-tabs">
        <button
          class="pt-btn"
          :class="{ active: selectedPlanet === 'all' }"
          @click="selectedPlanet = 'all'"
        >
          Semua ({{ phenomena.length }})
        </button>
        <button
          v-for="p in PLANET_OPTIONS"
          :key="p.id"
          class="pt-btn"
          :class="{ active: selectedPlanet === p.id }"
          @click="selectedPlanet = p.id"
        >
          {{ p.name }}
        </button>
      </div>
    </div>

    <!-- TABEL FENOMENA -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat data fenomena dari Supabase…</p>
      </div>

      <div v-else-if="!filteredPhenomena.length" class="empty-state">
        <p>Belum ada data fenomena untuk kategori planet ini.</p>
        <button class="btn-outline" @click="openCreateModal">Buat Fenomena Baru</button>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 120px;">Planet</th>
            <th>Judul Fenomena &amp; Tombol Aksi</th>
            <th>Tipe Animasi</th>
            <th>Deskripsi Edukatif</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th style="width: 100px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredPhenomena" :key="item.phenomenon_id">
            <td>
              <span class="planet-badge capitalize">{{ item.planet_id }}</span>
            </td>
            <td>
              <div class="pheno-title-cell">
                <b>{{ item.judul }}</b>
                <small>Label Tombol: "{{ item.tombol_aksi_label || 'Putar Simulasi Fenomena' }}"</small>
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
                :title="item.is_active !== false ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'"
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

    <!-- MODAL EDIT / TAMBAH FENOMENA -->
    <div v-if="editingPheno" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">{{ isCreating ? 'Tambah Fenomena Baru' : `Ubah Fenomena: ${formData.judul}` }}</h3>
            <p class="modal-sub">Target Planet: {{ formData.planet_id.toUpperCase() }}</p>
          </div>
          <button class="btn-close-modal" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
        </div>

        <form class="modal-body scroll" @submit.prevent="handleSave">
          <div class="grid-2">
            <label class="field">
              <span>Target Planet</span>
              <select v-model="formData.planet_id" class="adm-select" :disabled="!isCreating" required>
                <option v-for="p in PLANET_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
              </select>
            </label>
            <label class="field">
              <span>Tipe Animasi Simulasi</span>
              <select v-model="formData.tipe_animasi" class="adm-select" required>
                <option v-for="t in ANIMATION_TYPES" :key="t.id" :value="t.id">{{ t.label }}</option>
              </select>
            </label>
          </div>

          <label class="field">
            <span>Judul Fenomena (Tampil di Heading / Kartu Observasi)</span>
            <input v-model="formData.judul" type="text" placeholder="misal: Gerhana Matahari & Bulan / Hari Paling Singkat" required />
          </label>

          <label class="field">
            <span>Label Tombol Aksi Simulasi</span>
            <input v-model="formData.tombol_aksi_label" type="text" placeholder="misal: Buka Laboratorium Gerhana / Putar Simulasi" required />
          </label>

          <label class="field">
            <span>Deskripsi Edukatif Utama Siswa</span>
            <textarea v-model="formData.deskripsi_edukatif" rows="3" placeholder="Uraian ringkas fenomena yang dibaca siswa saat observasi planet..." required />
          </label>

          <!-- KHUSUS PLANET BUMI: PENJELASAN LABORATORIUM GERHANA -->
          <div v-if="formData.planet_id === 'earth'" class="earth-eclipse-box">
            <span class="fs-title"><UiIcon name="matahari" :size="14" /> Penjelasan Edukatif Laboratorium Gerhana (Bumi)</span>
            <p class="fs-sub">Teks ini langsung tercermin di kartu penjelasan interaktif saat siswa mengamati Gerhana Matahari atau Gerhana Bulan.</p>
            <div class="field">
              <span>Penjelasan Gerhana Matahari ("Kenapa bisa pas menutup?")</span>
              <textarea v-model="formData.penjelasan_matahari" rows="2" placeholder="Matahari sekitar 400 kali lebih lebar dari Bulan, tapi juga sekitar 400 kali lebih jauh..." />
            </div>
            <div class="field">
              <span>Penjelasan Gerhana Bulan ("Kenapa Bulan jadi merah?")</span>
              <textarea v-model="formData.penjelasan_bulan" rows="2" placeholder="Cahaya Matahari menembus atmosfer Bumi. Biru dihamburkan, merah dibelokkan sampai ke Bulan..." />
            </div>
          </div>

          <!-- STATUS AKTIF -->
          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan fenomena ini (dapat diobservasi oleh siswa di tampilan publik)</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : (isCreating ? 'Tambah Fenomena' : 'Simpan Perubahan') }}
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
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; align-items: center; gap: 10px; }
.btn-primary-action { display: inline-flex; align-items: center; gap: 6px; background: #2563eb; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background .15s; }
.btn-primary-action:hover { background: #1d4ed8; }
.btn-refresh { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }

.filter-strip { display: flex; align-items: center; gap: 12px; background: #fff; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; overflow-x: auto; }
.filter-label { font-size: 12.5px; font-weight: 500; color: #475569; white-space: nowrap; }
.planet-tabs { display: flex; gap: 6px; }
.pt-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12.5px; font-weight: 500; color: #475569; cursor: pointer; white-space: nowrap; transition: all .15s; }
.pt-btn:hover { background: #eff6ff; color: #1d4ed8; }
.pt-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 500; }

.table-wrap { padding: 0; overflow-x: auto; background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 500; color: #475569; border-bottom: 1px solid #e2e8f0; }
.adm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.planet-badge { padding: 3px 8px; border-radius: 4px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 500; text-transform: capitalize; }
.pheno-title-cell b { display: block; color: #0f172a; font-size: 14px; }
.pheno-title-cell small { color: #64748b; font-size: 12px; margin-top: 2px; display: block; }
.anim-tag { font-size: 11.5px; background: #f1f5f9; padding: 3px 7px; border-radius: 4px; color: #334155; font-family: monospace; font-weight: 500; }
.desc-clamp { margin: 0; font-size: 13px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.45; }

.status-toggle-btn { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid transparent; cursor: pointer; background: #f1f5f9; color: #94a3b8; }
.status-toggle-btn.on { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.btn-edit { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 12.5px; font-weight: 500; cursor: pointer; }

.empty-state { padding: 40px; text-align: center; color: #64748b; }
.empty-state p { margin: 0 0 12px 0; }
.btn-outline { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 13px; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 680px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; }
.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; }

.earth-eclipse-box { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 8px; background: #f0f7ff; border: 1px solid #c7dfff; }
.fs-title { font-size: 12.5px; font-weight: 600; color: #1d4ed8; display: inline-flex; align-items: center; gap: 6px; }
.fs-sub { margin: 0; font-size: 12px; color: #64748b; line-height: 1.4; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
</style>

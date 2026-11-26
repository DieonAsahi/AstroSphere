<script setup>
// Halaman Pengelola Bulan & Satelit Alami (/admin/moons) — Kolom Observasi & Pratinjau Halaman Satelit
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError } from '~/utils/adminAuth.js';
import { MOONS } from '~/data/solarSystem.js';

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

const moons = ref([]);
const editingMoon = ref(null);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'

const EMPTY_FORM = {
  planet_id: '',
  urutan_planet: 9,
  nama: '',
  body_type: 'moon',
  parent_planet_id: 'earth',
  kategori_planet: 'MOON',
  diameter_km: 3000,
  perbandingan_bumi: '0.27× Ukuran Bumi',
  periode_rotasi: '27.3 Hari Bumi',
  subteks_rotasi: 'Terkunci Pasang Surut',
  periode_orbit: '27.3 Hari Bumi',
  subteks_orbit: 'Mengelilingi Planet Induk',
  kemiringan_sumbu: '0°',
  suhu_rata_c: '-20 °C',
  rentang_suhu: 'Rentang suhu permukaan',
  usia_planet: '± 4,5 miliar tahun',
  subteks_usia: 'Terbentuk bersama Tata Surya',
  judul_rotasi: 'Sinkronisasi Pasang Surut',
  deskripsi_rotasi: '',
  deskripsi_materi: '',
  sumber_referensi: 'NASA Solar System Exploration',
  is_active: true,
};

const formData = ref({ ...EMPTY_FORM });

const PARENT_OPTIONS = [
  { id: 'earth', name: 'Bumi' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturnus' },
];

function getParentName(parentId) {
  const p = PARENT_OPTIONS.find((x) => x.id === parentId);
  if (p) return p.name;
  if (parentId === 'bumi') return 'Bumi';
  if (parentId === 'saturnus') return 'Saturnus';
  return parentId || '—';
}

function getLocalMoonFallback(slug) {
  const m = MOONS.find((x) => x.id === slug || (slug === 'moon' && x.id === 'bulan'));
  return m || null;
}

async function loadMoons() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('planets')
      .select('*')
      .order('urutan_planet', { ascending: true });

    if (fetchErr) throw fetchErr;

    const moonList = (data || []).filter(
      (p) => p.body_type === 'moon' || ['moon', 'io', 'europa', 'ganymede', 'callisto', 'titan'].includes(p.planet_id)
    );

    // Jika database live belum di-seed, gunakan fallback MOONS
    if (!moonList.length) {
      moons.value = MOONS.map((m, idx) => ({
        planet_id: m.id === 'bulan' ? 'moon' : m.id,
        urutan_planet: 9 + idx,
        nama: m.name,
        body_type: 'moon',
        parent_planet_id: m.parent === 'bumi' ? 'earth' : m.parent === 'saturnus' ? 'saturn' : m.parent,
        kategori_planet: 'MOON',
        diameter_km: m.radiusKm * 2,
        perbandingan_bumi: `${((m.radiusKm * 2) / 12742).toFixed(2)}× ukuran Bumi`,
        periode_rotasi: `${m.rotationDays.toFixed(1)} hari`,
        subteks_rotasi: 'Terkunci Pasang Surut',
        periode_orbit: `${m.orbitDays.toFixed(1)} hari`,
        subteks_orbit: `Mengelilingi ${m.parent ? m.parent.charAt(0).toUpperCase() + m.parent.slice(1) : 'Induk'}`,
        kemiringan_sumbu: `${(m.tilt || 0).toFixed(1)}°`,
        suhu_rata_c: m.id === 'bulan' ? '-20 °C' : m.id === 'titan' ? '-179 °C' : '-130 °C',
        rentang_suhu: m.id === 'bulan' ? 'Rentang ekstrem −130 °C s/d 120 °C' : 'Rentang suhu permukaan satelit',
        usia_planet: '± 4,5 miliar tahun',
        subteks_usia: 'Terbentuk bersama Tata Surya',
        judul_rotasi: 'Sinkronisasi Pasang Surut',
        deskripsi_rotasi: 'Bulan berputar dengan periode yang sinkron dengan orbitnya.',
        deskripsi_materi: m.desc,
        sumber_referensi: m.sumber_referensi || 'NASA Solar System Exploration',
        is_active: true,
      }));
    } else {
      moons.value = moonList;
    }
  } catch (err) {
    error.value = formatSupabaseError(err, 'Tidak bisa memuat data bulan/satelit.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadMoons();
}

const confirmStatusTarget = ref(null);

function openStatusModal(moon) {
  if (togglingId.value === moon.planet_id) return;
  const isCurrentlyActive = moon.is_active !== false;
  confirmStatusTarget.value = {
    item: moon,
    nextState: !isCurrentlyActive,
  };
}

async function confirmToggleActive() {
  if (!confirmStatusTarget.value) return;
  const { item: moon, nextState } = confirmStatusTarget.value;
  if (togglingId.value === moon.planet_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  togglingId.value = moon.planet_id;

  try {
    const { error: updErr } = await client
      .from('planets')
      .update({ is_active: nextState, updated_at: new Date().toISOString() })
      .eq('planet_id', moon.planet_id);

    if (updErr) throw updErr;
    moon.is_active = nextState;
    confirmStatusTarget.value = null;
    showNotification('success', `Satelit ${moon.nama} berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
  } catch (err) {
    showNotification('error', formatSupabaseError(err, 'Gagal memperbarui status ketersediaan satelit.'));
  } finally {
    togglingId.value = '';
  }
}

function cancelToggleActive() {
  confirmStatusTarget.value = null;
}

function openEditModal(moon) {
  editingMoon.value = moon;
  modalViewMode.value = 'EDIT';
  formError.value = '';

  formData.value = {
    planet_id: moon.planet_id,
    urutan_planet: Number(moon.urutan_planet ?? 9),
    nama: moon.nama || '',
    body_type: 'moon',
    parent_planet_id: moon.parent_planet_id || 'earth',
    kategori_planet: 'MOON',
    diameter_km: Number(moon.diameter_km || 0),
    perbandingan_bumi: moon.perbandingan_bumi || '',
    periode_rotasi: moon.periode_rotasi || '',
    subteks_rotasi: moon.subteks_rotasi || '',
    periode_orbit: moon.periode_orbit || '',
    subteks_orbit: moon.subteks_orbit || '',
    kemiringan_sumbu: moon.kemiringan_sumbu || '0°',
    suhu_rata_c: moon.suhu_rata_c || '',
    rentang_suhu: moon.rentang_suhu || '',
    usia_planet: moon.usia_planet || '± 4,5 miliar tahun',
    subteks_usia: moon.subteks_usia || 'Terbentuk bersama Tata Surya',
    judul_rotasi: moon.judul_rotasi || 'Sinkronisasi Pasang Surut',
    deskripsi_rotasi: moon.deskripsi_rotasi || '',
    deskripsi_materi: moon.deskripsi_materi || '',
    sumber_referensi: moon.sumber_referensi || 'NASA Solar System Exploration',
    is_active: moon.is_active !== false,
  };
}

function closeModal() {
  editingMoon.value = null;
  formError.value = '';
}

async function handleSave() {
  formError.value = '';

  if (!formData.value.nama.trim()) {
    formError.value = 'Nama satelit wajib diisi.';
    return;
  }
  if (!formData.value.deskripsi_materi.trim()) {
    formError.value = 'Ringkasan materi satelit wajib diisi.';
    return;
  }

  saving.value = true;
  const client = getSupabaseClient();
  if (!client) {
    formError.value = 'Layanan basis data tidak tersedia.';
    saving.value = false;
    return;
  }

  try {
    const payload = {
      nama: formData.value.nama.trim(),
      body_type: 'moon',
      parent_planet_id: formData.value.parent_planet_id,
      kategori_planet: 'MOON',
      diameter_km: Number(formData.value.diameter_km) || 0,
      perbandingan_bumi: formData.value.perbandingan_bumi.trim(),
      periode_rotasi: formData.value.periode_rotasi.trim(),
      subteks_rotasi: formData.value.subteks_rotasi.trim(),
      periode_orbit: formData.value.periode_orbit.trim(),
      subteks_orbit: formData.value.subteks_orbit.trim(),
      kemiringan_sumbu: formData.value.kemiringan_sumbu.trim(),
      suhu_rata_c: formData.value.suhu_rata_c.trim(),
      rentang_suhu: formData.value.rentang_suhu.trim(),
      usia_planet: formData.value.usia_planet.trim(),
      subteks_usia: formData.value.subteks_usia.trim(),
      judul_rotasi: formData.value.judul_rotasi.trim(),
      deskripsi_rotasi: formData.value.deskripsi_rotasi.trim(),
      deskripsi_materi: formData.value.deskripsi_materi.trim(),
      sumber_referensi: formData.value.sumber_referensi.trim() || 'NASA Solar System Exploration',
      is_active: formData.value.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await client
      .from('planets')
      .update(payload)
      .eq('planet_id', editingMoon.value.planet_id);

    if (saveErr) throw saveErr;

    showNotification('success', `Data Satelit ${payload.nama} berhasil diperbarui.`);
    saving.value = false;
    closeModal();
    await loadMoons();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Gagal menyimpan perubahan materi satelit.');
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
  loadMoons();
});
</script>

<template>
  <div class="admin-moons-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Bulan &amp; Satelit Alami</h1>
        <p class="page-desc">Kelola ringkasan materi, data fisik, planet induk, dan status ketersediaan 6 satelit alami di simulasi publik.</p>
      </div>
      <button class="btn-refresh" :disabled="refreshing" @click="handleRefresh">
        <UiIcon name="ulang" :size="16" :class="{ 'spin-active': refreshing }" />
        <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan Data' }}</span>
      </button>
    </div>

    <!-- Notifikasi Sukses / Error -->
    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- TABEL 6 BULAN / SATELIT ALAMI -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat data satelit alami…</p>
      </div>

      <div v-else-if="!moons.length" class="empty-state">
        <p>Belum ada data bulan yang dimuat.</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 70px;">Urutan</th>
            <th>Nama Satelit</th>
            <th>Planet Induk</th>
            <th>Diameter (km)</th>
            <th>Rotasi &amp; Orbit</th>
            <th>Suhu Rata-rata</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th style="width: 100px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in moons" :key="m.planet_id">
            <td>
              <span class="order-badge">#{{ m.urutan_planet }}</span>
            </td>
            <td>
              <div class="moon-name-cell">
                <b>{{ m.nama }}</b>
                <small>Slug: {{ m.planet_id }}</small>
              </div>
            </td>
            <td>
              <span class="parent-badge">{{ getParentName(m.parent_planet_id) }}</span>
            </td>
            <td>{{ Number(m.diameter_km || 0).toLocaleString('id-ID') }} km</td>
            <td>
              <div class="small-meta">
                <span>Rotasi: {{ m.periode_rotasi || '—' }}</span>
                <span>Orbit: {{ m.periode_orbit || '—' }}</span>
              </div>
            </td>
            <td>{{ m.suhu_rata_c || '—' }}</td>
            <td style="text-align: center;">
              <button
                type="button"
                class="adm-switch-btn"
                :class="{ on: m.is_active !== false }"
                :disabled="togglingId === m.planet_id"
                :title="m.is_active !== false ? 'Klik untuk menonaktifkan satelit' : 'Klik untuk mengaktifkan satelit'"
                @click="openStatusModal(m)"
              >
                <span class="adm-switch-track" aria-hidden="true">
                  <span class="adm-switch-thumb" />
                </span>
                <span class="adm-switch-label">{{ togglingId === m.planet_id ? '…' : (m.is_active !== false ? 'Aktif' : 'Nonaktif') }}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-edit" title="Ubah Materi Satelit" @click="openEditModal(m)">
                <UiIcon name="edit" :size="15" /> Ubah
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDIT & PRATINJAU HALAMAN BULAN -->
    <div v-if="editingMoon" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Ubah Materi: Satelit {{ formData.nama }}</h3>
            <p class="modal-sub">Konfigurasi ringkasan materi dan metrik observasi halaman satelit.</p>
          </div>
          <div class="modal-mode-tabs">
            <button
              type="button"
              class="tab-btn"
              :class="{ active: modalViewMode === 'EDIT' }"
              @click="modalViewMode = 'EDIT'"
            >
              Formulir Edit
            </button>
            <button
              type="button"
              class="tab-btn"
              :class="{ active: modalViewMode === 'PREVIEW' }"
              @click="modalViewMode = 'PREVIEW'"
            >
              Pratinjau Observasi
            </button>
            <button type="button" class="btn-close" aria-label="Tutup" @click="closeModal">
              <UiIcon name="tutup" :size="16" />
            </button>
          </div>
        </div>

        <!-- NOTIFIKASI ERROR FORMULIR -->
        <div v-if="formError" class="modal-alert error">
          <UiIcon name="silang" :size="16" />
          <span>{{ formError }}</span>
        </div>

        <!-- MODE 1: FORMULIR EDIT -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body" @submit.prevent="handleSave">
          <div class="form-grid">
            <div class="field-group span-2">
              <label class="adm-label">Nama Satelit</label>
              <input v-model="formData.nama" type="text" class="adm-input" required />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Planet Induk</label>
              <select v-model="formData.parent_planet_id" class="adm-select" required>
                <option v-for="p in PARENT_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
              </select>
            </div>

            <div class="field-group span-4">
              <label class="adm-label">Ringkasan Materi Edukatif</label>
              <textarea v-model="formData.deskripsi_materi" rows="4" class="adm-textarea" required />
              <small class="field-hint">Ditampilkan di panel observasi satelit pada simulasi 3D publik.</small>
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Diameter Ekuator (km)</label>
              <input v-model.number="formData.diameter_km" type="number" class="adm-input" required />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Perbandingan Ukuran Bumi</label>
              <input v-model="formData.perbandingan_bumi" type="text" class="adm-input" placeholder="contoh: 0.27× ukuran Bumi" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Periode Rotasi Poros</label>
              <input v-model="formData.periode_rotasi" type="text" class="adm-input" placeholder="contoh: 27.3 Hari Bumi" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Subteks Rotasi</label>
              <input v-model="formData.subteks_rotasi" type="text" class="adm-input" placeholder="contoh: Terkunci Pasang Surut" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Periode Orbit Mengitari Induk</label>
              <input v-model="formData.periode_orbit" type="text" class="adm-input" placeholder="contoh: 27.3 Hari Bumi" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Subteks Orbit</label>
              <input v-model="formData.subteks_orbit" type="text" class="adm-input" placeholder="contoh: Mengelilingi Bumi" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Kemiringan Sumbu</label>
              <input v-model="formData.kemiringan_sumbu" type="text" class="adm-input" placeholder="contoh: 6.68°" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Suhu Rata-rata</label>
              <input v-model="formData.suhu_rata_c" type="text" class="adm-input" placeholder="contoh: -20 °C" />
            </div>

            <div class="field-group span-4">
              <label class="adm-label">Rentang Suhu Permukaan</label>
              <input v-model="formData.rentang_suhu" type="text" class="adm-input" placeholder="contoh: Rentang ekstrem −130 °C hingga 120 °C" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Judul Dinamika Rotasi</label>
              <input v-model="formData.judul_rotasi" type="text" class="adm-input" placeholder="contoh: Sinkronisasi Pasang Surut" />
            </div>

            <div class="field-group span-2">
              <label class="adm-label">Sumber Referensi Ilmiah</label>
              <input v-model="formData.sumber_referensi" type="text" class="adm-input" placeholder="NASA Solar System Exploration" />
            </div>

            <div class="field-group span-4">
              <label class="adm-label">Deskripsi Rotasi &amp; Orbit</label>
              <textarea v-model="formData.deskripsi_rotasi" rows="2" class="adm-textarea" placeholder="Jelaskan fenomena rotasi atau gravitasi pasang surut satelit ini..." />
            </div>

            <div class="field-group span-4 checkbox-row">
              <label class="checkbox-label">
                <input v-model="formData.is_active" type="checkbox" class="adm-checkbox" />
                <span>Aktif di Publik (Bila dinonaktifkan, satelit disembunyikan di 3D dan bertanda Sedang Perbaikan di Peta)</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              <UiIcon v-if="saving" name="ulang" :size="16" class="spin-active" />
              <span>{{ saving ? 'Menyimpan Perubahan…' : 'Simpan Materi Satelit' }}</span>
            </button>
          </div>
        </form>

        <!-- MODE 2: PRATINJAU OBSERVASI -->
        <div v-else class="modal-body preview-body">
          <div class="preview-stage-eyebrow">SATELIT ALAMI {{ getParentName(formData.parent_planet_id).toUpperCase() }}</div>
          <h2 class="preview-title">{{ formData.nama }}</h2>

          <div class="preview-section">
            <h4 class="preview-sec-head">RINGKASAN SATELIT</h4>
            <p class="preview-desc">{{ formData.deskripsi_materi || 'Belum ada ringkasan materi.' }}</p>
          </div>

          <div class="preview-section">
            <h4 class="preview-sec-head">DATA ILMIAH OBSERVASI</h4>
            <div class="preview-grid">
              <div class="p-card">
                <span class="p-label">Diameter Ekuator</span>
                <b class="p-val">{{ Number(formData.diameter_km || 0).toLocaleString('id-ID') }} km</b>
                <small class="p-sub">{{ formData.perbandingan_bumi || '—' }}</small>
              </div>
              <div class="p-card">
                <span class="p-label">Periode Rotasi</span>
                <b class="p-val">{{ formData.periode_rotasi || '—' }}</b>
                <small class="p-sub">{{ formData.subteks_rotasi || '—' }}</small>
              </div>
              <div class="p-card">
                <span class="p-label">Periode Orbit</span>
                <b class="p-val">{{ formData.periode_orbit || '—' }}</b>
                <small class="p-sub">{{ formData.subteks_orbit || '—' }}</small>
              </div>
              <div class="p-card">
                <span class="p-label">Kemiringan Sumbu</span>
                <b class="p-val">{{ formData.kemiringan_sumbu || '0°' }}</b>
                <small class="p-sub">Terhadap bidang orbit</small>
              </div>
              <div class="p-card">
                <span class="p-label">Suhu Rata-Rata</span>
                <b class="p-val">{{ formData.suhu_rata_c || '—' }}</b>
                <small class="p-sub">{{ formData.rentang_suhu || 'Rentang suhu permukaan' }}</small>
              </div>
              <div class="p-card">
                <span class="p-label">Usia Geologis</span>
                <b class="p-val">{{ formData.usia_planet || '± 4,5 miliar tahun' }}</b>
                <small class="p-sub">{{ formData.subteks_usia || 'Terbentuk bersama Tata Surya' }}</small>
              </div>
            </div>
            <div class="preview-src">
              <UiIcon name="info" :size="12" />
              <span>Sumber data: {{ formData.sumber_referensi || 'NASA Solar System Exploration' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL KONFIRMASI STATUS -->
    <div v-if="confirmStatusTarget" class="modal-backdrop" @click.self="cancelToggleActive">
      <div class="modal-card modal-confirm">
        <div class="modal-header">
          <h3 class="modal-title">Konfirmasi Perubahan Ketersediaan</h3>
          <button type="button" class="btn-close" aria-label="Tutup" @click="cancelToggleActive">
            <UiIcon name="tutup" :size="16" />
          </button>
        </div>
        <div class="modal-body confirm-content">
          <p>
            Apakah Anda yakin ingin <b>{{ confirmStatusTarget.nextState ? 'mengaktifkan kembali' : 'menonaktifkan' }}</b> satelit
            <span class="text-highlight">{{ confirmStatusTarget.item.nama }}</span>?
          </p>
          <p class="confirm-hint">
            <span v-if="!confirmStatusTarget.nextState">Satelit ini akan disembunyikan dari simulasi 3D publik dan ditandai sebagai <em>Sedang Perbaikan</em> pada peta navigasi.</span>
            <span v-else>Satelit ini akan segera dapat dikunjungi dan diteliti kembali oleh seluruh pemain secara publik.</span>
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="cancelToggleActive">Batal</button>
          <button
            type="button"
            class="btn-save"
            :class="{ 'btn-danger': !confirmStatusTarget.nextState }"
            :disabled="togglingId === confirmStatusTarget.item.planet_id"
            @click="confirmToggleActive"
          >
            <UiIcon v-if="togglingId === confirmStatusTarget.item.planet_id" name="ulang" :size="16" class="spin-active" />
            <span>{{ confirmStatusTarget.nextState ? 'Aktifkan Satelit' : 'Nonaktifkan Satelit' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-moons-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-family: 'Poppins', sans-serif;
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
}

.page-desc {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #94a3b8;
  margin: 4px 0 0;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh:hover:not(:disabled) {
  background: rgba(51, 65, 85, 0.7);
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.3);
}

.spin-active {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.dash-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  border-radius: 8px;
}

.dash-alert.success {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.dash-alert.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.card-section {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 12px;
  overflow: hidden;
}

.table-wrap {
  overflow-x: auto;
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #94a3b8;
  font-family: 'Poppins', sans-serif;
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(148, 163, 184, 0.2);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}

.adm-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  text-align: left;
}

.adm-table th {
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.6);
  color: #94a3b8;
  font-weight: 500;
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  white-space: nowrap;
}

.adm-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  color: #cbd5e1;
  vertical-align: middle;
}

.adm-table tr:hover td {
  background: rgba(30, 41, 59, 0.35);
}

.order-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
}

.moon-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.moon-name-cell b {
  color: #f8fafc;
  font-weight: 600;
}

.moon-name-cell small {
  font-size: 11px;
  color: #64748b;
}

.parent-badge {
  display: inline-block;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.small-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11.5px;
  color: #94a3b8;
}

.adm-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #94a3b8;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
}

.adm-switch-track {
  width: 34px;
  height: 18px;
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.25);
  position: relative;
  transition: background 0.2s ease;
}

.adm-switch-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #cbd5e1;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s ease;
}

.adm-switch-btn.on .adm-switch-track {
  background: rgba(34, 197, 94, 0.4);
}

.adm-switch-btn.on .adm-switch-thumb {
  transform: translateX(16px);
  background: #22c55e;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.25);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-edit:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
}

/* MODAL STYLES */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: min(840px, 100%);
  max-height: 90vh;
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.modal-title {
  font-family: 'Poppins', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}

.modal-sub {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0;
}

.modal-mode-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-btn {
  padding: 6px 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.7);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.15);
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.35);
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  color: #f1f5f9;
  background: rgba(148, 163, 184, 0.1);
}

.modal-alert.error {
  margin: 12px 20px 0;
  padding: 10px 14px;
  border-radius: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.span-2 {
  grid-column: span 2;
}

.span-4 {
  grid-column: span 4;
}

.adm-label {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: #cbd5e1;
}

.adm-input,
.adm-select,
.adm-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.15s ease;
}

.adm-input:focus,
.adm-select:focus,
.adm-textarea:focus {
  border-color: #38bdf8;
}

.field-hint {
  font-size: 11px;
  color: #64748b;
}

.checkbox-row {
  margin-top: 6px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Poppins', sans-serif;
  font-size: 12.5px;
  color: #cbd5e1;
  cursor: pointer;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel {
  padding: 8px 16px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.2);
  cursor: pointer;
}

.btn-cancel:hover {
  background: rgba(148, 163, 184, 0.08);
  color: #f1f5f9;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  background: #38bdf8;
  color: #0f172a;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.btn-save:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
}

/* PREVIEW BODY */
.preview-body {
  background: rgba(10, 14, 32, 0.95);
  border-radius: 8px;
  margin: 12px;
  border: 1px solid rgba(148, 174, 255, 0.15);
}

.preview-stage-eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #38bdf8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-title {
  font-family: 'Poppins', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: #f8fafc;
  margin: 4px 0 16px;
}

.preview-section {
  margin-bottom: 20px;
}

.preview-sec-head {
  font-family: 'Poppins', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.preview-desc {
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  line-height: 1.6;
  color: #cbd5e1;
  margin: 0;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.p-card {
  padding: 10px 12px;
  background: rgba(30, 41, 59, 0.45);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.p-label {
  font-size: 10.5px;
  color: #94a3b8;
  text-transform: uppercase;
}

.p-val {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
}

.p-sub {
  font-size: 10.5px;
  color: #64748b;
}

.preview-src {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  margin-top: 10px;
}

/* CONFIRM MODAL */
.modal-confirm {
  width: min(440px, 100%);
}

.confirm-content {
  font-family: 'Poppins', sans-serif;
  font-size: 13.5px;
  color: #cbd5e1;
  line-height: 1.6;
}

.text-highlight {
  color: #38bdf8;
  font-weight: 600;
}

.confirm-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .span-2,
  .span-4 {
    grid-column: span 1;
  }
  .preview-grid {
    grid-template-columns: 1fr;
  }
}
</style>

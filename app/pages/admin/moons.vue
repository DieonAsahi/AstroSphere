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
              :class="{ on: modalViewMode === 'EDIT' }"
              @click="modalViewMode = 'EDIT'"
            >
              Formulir
            </button>
            <button
              type="button"
              :class="{ on: modalViewMode === 'PREVIEW' }"
              @click="modalViewMode = 'PREVIEW'"
            >
              Pratinjau Observasi
            </button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal">
              <UiIcon name="tutup" :size="18" />
            </button>
          </div>
        </div>

        <!-- NOTIFIKASI ERROR FORMULIR -->
        <div v-if="formError" class="dash-alert error" role="alert">
          <UiIcon name="silang" :size="16" />
          <span>{{ formError }}</span>
        </div>

        <!-- MODE 1: FORMULIR EDIT -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <!-- BAGIAN 1: IDENTITAS & MATERI -->
          <div class="form-section">
            <span class="fs-title">1. Identitas &amp; Deskripsi Materi</span>
            <div class="grid-2">
              <label class="field">
                <span>Nama Satelit</span>
                <input v-model="formData.nama" required type="text" />
              </label>
              <label class="field">
                <span>Planet Induk</span>
                <select v-model="formData.parent_planet_id" required>
                  <option v-for="p in PARENT_OPTIONS" :key="p.id" :value="p.id">Planet {{ p.name }}</option>
                </select>
              </label>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>Kategori Objek</span>
                <input value="Satelit Alami (MOON)" type="text" disabled />
              </label>
              <label class="field">
                <span>Sumber Referensi Ilmiah</span>
                <input v-model="formData.sumber_referensi" type="text" placeholder="misal: NASA Solar System Exploration" />
              </label>
            </div>
            <label class="field">
              <span>Uraian Ringkasan Materi Edukatif</span>
              <textarea v-model="formData.deskripsi_materi" required rows="3" placeholder="Ringkasan materi edukatif untuk dipelajari pengguna pada simulasi 3D..." />
            </label>
          </div>

          <!-- BAGIAN 2: DIMENSI & SKALA -->
          <div class="form-section">
            <span class="fs-title">2. Dimensi Fisik &amp; Skala</span>
            <div class="grid-2">
              <label class="field">
                <span>Diameter Ekuator (km)</span>
                <input v-model.number="formData.diameter_km" required type="number" />
              </label>
              <label class="field">
                <span>Perbandingan Skala Ukuran Bumi</span>
                <input v-model="formData.perbandingan_bumi" type="text" placeholder="misal: 0.27× ukuran Bumi" />
              </label>
            </div>
          </div>

          <!-- BAGIAN 3: 6 METRIK DATA ILMIAH OBSERVASI -->
          <div class="form-section">
            <span class="fs-title">3. 6 Metrik Data Ilmiah Observasi</span>
            <div class="grid-2">
              <label class="field">
                <span>1. Periode Rotasi Poros</span>
                <input v-model="formData.periode_rotasi" type="text" placeholder="misal: 27.3 Hari Bumi" />
              </label>
              <label class="field">
                <span>Subteks Rotasi</span>
                <input v-model="formData.subteks_rotasi" type="text" placeholder="misal: Terkunci Pasang Surut" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>2. Periode Orbit Mengitari Induk</span>
                <input v-model="formData.periode_orbit" type="text" placeholder="misal: 27.3 Hari Bumi" />
              </label>
              <label class="field">
                <span>Subteks Orbit</span>
                <input v-model="formData.subteks_orbit" type="text" placeholder="misal: Mengelilingi Bumi" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>3. Kemiringan Sumbu (Tilt)</span>
                <input v-model="formData.kemiringan_sumbu" type="text" placeholder="misal: 6.68°" />
              </label>
              <label class="field">
                <span>4. Suhu Rata-rata</span>
                <input v-model="formData.suhu_rata_c" type="text" placeholder="misal: -20 °C" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>Rentang Suhu Permukaan</span>
                <input v-model="formData.rentang_suhu" type="text" placeholder="misal: Rentang ekstrem −130 °C hingga 120 °C" />
              </label>
              <label class="field">
                <span>5. Usia Geologis</span>
                <input v-model="formData.usia_planet" type="text" placeholder="misal: ± 4,5 miliar tahun" />
              </label>
            </div>

            <label class="field">
              <span>Subteks Usia Geologis</span>
              <input v-model="formData.subteks_usia" type="text" placeholder="misal: Terbentuk bersama Tata Surya" />
            </label>
          </div>

          <!-- BAGIAN 4: ARAH & DINAMIKA ROTASI -->
          <div class="form-section">
            <span class="fs-title">4. Penjelasan Arah &amp; Dinamika Rotasi</span>
            <label class="field">
              <span>Judul Dinamika Rotasi</span>
              <input v-model="formData.judul_rotasi" type="text" placeholder="misal: Sinkronisasi Pasang Surut" />
            </label>
            <label class="field">
              <span>Deskripsi Penjelasan Rotasi &amp; Orbit</span>
              <textarea v-model="formData.deskripsi_rotasi" rows="2" placeholder="Penjelasan fenomena rotasi atau gravitasi pasang surut satelit ini..." />
            </label>
          </div>

          <!-- STATUS AKTIF DI SIMULASI PUBLIK -->
          <div class="form-section">
            <span class="fs-title">5. Status Simulasi Publik</span>
            <label class="checkbox-label">
              <input v-model="formData.is_active" type="checkbox" class="adm-checkbox" />
              <span>Aktif di Simulasi Publik (Bila dinonaktifkan, satelit disembunyikan dari 3D dan ditandai Sedang Perbaikan pada navigasi)</span>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              <UiIcon v-if="saving" name="ulang" :size="16" class="spin-active" />
              <span>{{ saving ? 'Menyimpan Perubahan…' : 'Simpan Materi Satelit' }}</span>
            </button>
          </div>
        </form>

        <!-- MODE 2: PRATINJAU OBSERVASI (TETAP GELAP) -->
        <div v-else class="modal-body preview-body scroll">
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
    <div v-if="confirmStatusTarget" class="modal-backdrop" @click.self="!togglingId && cancelToggleActive()">
      <div class="modal-card adm-confirm-card small">
        <h3 class="modal-title">
          {{ confirmStatusTarget.nextState ? 'Aktifkan Satelit?' : 'Nonaktifkan Satelit?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="confirmStatusTarget.nextState">
            Ingin mengaktifkan kembali <b>Satelit {{ confirmStatusTarget.item.nama }}</b> agar objek 3D tampil kembali di ruang angkasa dan dapat dikunjungi?
          </template>
          <template v-else>
            Ingin menonaktifkan <b>Satelit {{ confirmStatusTarget.item.nama }}</b>? Objek 3D akan disembunyikan sementara dan ditandai <b>Sedang Perbaikan</b> di Peta Tata Surya.
          </template>
        </p>
        <div class="modal-footer">
          <button type="button" class="btn-cancel" :disabled="!!togglingId" @click="cancelToggleActive">Batal</button>
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
  </div>
</template>

<style scoped>
.admin-moons-page {
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
  font-weight: 600;
  color: #0f172a;
}

.page-desc {
  margin: 4px 0 0 0;
  font-size: 13.5px;
  color: #64748b;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-refresh:hover:not(:disabled) {
  background-color: #f1f5f9;
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
  border-radius: 8px;
  font-size: 13.5px;
}

.dash-alert.success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
}

.dash-alert.error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #b91c1c;
}

.card-section {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.table-wrap {
  padding: 0;
  overflow-x: auto;
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #cbd5e1;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
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
  font-weight: 500;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.adm-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  vertical-align: middle;
}

.adm-table tbody tr:hover {
  background-color: #f8fafc;
}

.order-badge {
  font-weight: 600;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.moon-name-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.moon-name-cell b {
  display: block;
  color: #0f172a;
}

.moon-name-cell small {
  color: #94a3b8;
  font-size: 11.5px;
}

.parent-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  background-color: #f1f5f9;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
}

.small-meta span {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.btn-edit {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 6px;
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-edit:hover {
  background-color: #dbeafe;
}

/* MODAL STYLES */
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

.modal-header {
  padding: 18px 22px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
}

.modal-sub {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #64748b;
}

.modal-mode-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-mode-tabs button {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  font-size: 12.5px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-mode-tabs button.on {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.btn-close-modal {
  border: none;
  background: none;
  padding: 6px;
  cursor: pointer;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-modal:hover {
  color: #0f172a;
}

.modal-body {
  padding: 20px 22px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
}

.fs-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #2563eb;
  letter-spacing: 0.03em;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: #334155;
  font-weight: 500;
}

.field input,
.field textarea,
.field select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  font-family: inherit;
  color: #0f172a;
  background-color: #ffffff;
}

.field input,
.field select {
  min-height: 38px;
  height: 38px;
  padding: 0 12px;
}

.field input:disabled {
  background-color: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  outline: none;
  border-color: #2563eb;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: #334155;
  font-weight: 500;
  cursor: pointer;
  line-height: 1.45;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.btn-cancel {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-cancel:hover {
  background-color: #f1f5f9;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  background-color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-save:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.btn-warn {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  background-color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 0.15s;
}

.btn-warn:hover:not(:disabled) {
  background-color: #dc2626;
}

/* CONFIRM MODAL */
.adm-confirm-card {
  max-width: 440px;
}
.adm-confirm-card.small {
  padding: 22px 24px;
}

.modal-desc {
  margin: 10px 0 20px 0;
  font-size: 13.5px;
  color: #475569;
  line-height: 1.5;
}

.modal-desc b {
  font-weight: 600;
  color: #0f172a;
}

/* PREVIEW BODY (TETAP GELAP) */
.preview-body {
  background-color: #0b1021;
  border-radius: 0 0 14px 14px;
}

.preview-stage-eyebrow {
  font-size: 11px;
  font-weight: 600;
  color: #5ed1ff;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-title {
  font-size: 24px;
  font-weight: 600;
  color: #ffffff;
  margin: 4px 0 16px;
}

.preview-section {
  margin-bottom: 16px;
}

.preview-sec-head {
  font-size: 11px;
  font-weight: 600;
  color: #a6b2de;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin: 0 0 8px;
}

.preview-desc {
  font-size: 13.5px;
  line-height: 1.55;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.p-label {
  font-size: 10.5px;
  color: #a6b2de;
  text-transform: uppercase;
}

.p-val {
  font-size: 14.5px;
  font-weight: 600;
  color: #5ed1ff;
  margin: 2px 0;
}

.p-sub {
  font-size: 11px;
  color: #a6b2de;
}

.preview-src {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
  margin-top: 10px;
}

@media (max-width: 640px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .preview-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>

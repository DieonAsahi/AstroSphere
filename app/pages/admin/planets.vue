<script setup>
// Halaman Pengelola Planet (/admin/planets) — Kolom Bersih PLY-02 & Pratinjau Observasi
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
const togglingId = ref('');
const error = ref('');
const formError = ref('');
const notification = ref(null);

const planets = ref([]);
const editingPlanet = ref(null);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'

const EMPTY_FORM = {
  planet_id: '',
  urutan_planet: 1,
  nama: '',
  kategori_planet: 'TERRESTRIAL',
  diameter_km: 10000,
  perbandingan_bumi: '1.00× Ukuran Bumi',
  periode_rotasi: '24 Jam',
  subteks_rotasi: 'Rotasi searah orbit (prograd)',
  periode_orbit: '365 Hari',
  subteks_orbit: '1 Tahun Kalender',
  kemiringan_sumbu: '23.4°',
  suhu_rata_c: '15 °C',
  rentang_suhu: 'Rentang sedang di permukaan',
  usia_planet: '± 4,5 miliar tahun',
  subteks_usia: 'Terbentuk bersama Tata Surya',
  judul_rotasi: 'Arah Rotasi Searah (Prograd)',
  deskripsi_rotasi: '',
  deskripsi_materi: '',
  sumber_referensi: 'NASA Planetary Fact Sheet',
  is_active: true,
};

const formData = ref({ ...EMPTY_FORM });

async function loadPlanets() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Klien Supabase belum terkonfigurasi.';
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
    planets.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Gagal memuat daftar planet.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadPlanets();
}

async function toggleActive(planet) {
  if (togglingId.value === planet.planet_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  const nextState = !planet.is_active;
  planet.is_active = nextState;
  togglingId.value = planet.planet_id;

  try {
    const { error: updErr } = await client
      .from('planets')
      .update({ is_active: nextState, updated_at: new Date().toISOString() })
      .eq('planet_id', planet.planet_id);

    if (updErr) throw updErr;
    showNotification('success', `Status aktif ${planet.nama} berhasil diubah.`);
  } catch (err) {
    planet.is_active = !nextState; // Kembalikan jika gagal
    showNotification('error', formatSupabaseError(err, 'Gagal memperbarui status aktif.'));
  } finally {
    togglingId.value = '';
  }
}

function openEditModal(planet) {
  formError.value = '';
  editingPlanet.value = planet;
  formData.value = {
    planet_id: planet.planet_id,
    urutan_planet: Number(planet.urutan_planet ?? 1),
    nama: planet.nama || '',
    kategori_planet: planet.kategori_planet || 'TERRESTRIAL',
    diameter_km: Number(planet.diameter_km || 0),
    perbandingan_bumi: planet.perbandingan_bumi || '',
    periode_rotasi: planet.periode_rotasi || '',
    subteks_rotasi: planet.subteks_rotasi || '',
    periode_orbit: planet.periode_orbit || '',
    subteks_orbit: planet.subteks_orbit || '',
    kemiringan_sumbu: planet.kemiringan_sumbu || '',
    suhu_rata_c: planet.suhu_rata_c || '',
    rentang_suhu: planet.rentang_suhu || '',
    usia_planet: planet.usia_planet || '',
    subteks_usia: planet.subteks_usia || '',
    judul_rotasi: planet.judul_rotasi || '',
    deskripsi_rotasi: planet.deskripsi_rotasi || '',
    deskripsi_materi: planet.deskripsi_materi || '',
    sumber_referensi: planet.sumber_referensi || 'NASA Planetary Fact Sheet',
    is_active: planet.is_active !== false,
  };
  modalViewMode.value = 'EDIT';
}

function closeModal() {
  if (saving.value) return;
  editingPlanet.value = null;
  formError.value = '';
}

async function handleSave() {
  formError.value = '';
  if (!formData.value.nama?.trim()) {
    formError.value = 'Nama planet wajib diisi.';
    return;
  }
  const orderVal = Number(formData.value.urutan_planet);
  if (!Number.isInteger(orderVal) || orderVal < 1 || orderVal > 8) {
    formError.value = 'Urutan planet harus berupa bilangan bulat antara 1 hingga 8.';
    return;
  }
  const diameterVal = Number(formData.value.diameter_km);
  if (!Number.isFinite(diameterVal) || diameterVal <= 0) {
    formError.value = 'Diameter planet harus berupa angka lebih besar dari 0 km.';
    return;
  }

  const client = getSupabaseClient();
  if (!client || !editingPlanet.value) return;

  saving.value = true;
  try {
    const payload = {
      urutan_planet: orderVal,
      nama: formData.value.nama.trim(),
      kategori_planet: formData.value.kategori_planet,
      diameter_km: diameterVal,
      perbandingan_bumi: (formData.value.perbandingan_bumi || '').trim(),
      periode_rotasi: (formData.value.periode_rotasi || '').trim(),
      subteks_rotasi: (formData.value.subteks_rotasi || '').trim(),
      periode_orbit: (formData.value.periode_orbit || '').trim(),
      subteks_orbit: (formData.value.subteks_orbit || '').trim(),
      kemiringan_sumbu: (formData.value.kemiringan_sumbu || '').trim(),
      suhu_rata_c: (formData.value.suhu_rata_c || '').trim(),
      rentang_suhu: (formData.value.rentang_suhu || '').trim(),
      usia_planet: (formData.value.usia_planet || '').trim(),
      subteks_usia: (formData.value.subteks_usia || '').trim(),
      judul_rotasi: (formData.value.judul_rotasi || '').trim(),
      deskripsi_rotasi: (formData.value.deskripsi_rotasi || '').trim(),
      deskripsi_materi: (formData.value.deskripsi_materi || '').trim(),
      sumber_referensi: formData.value.sumber_referensi?.trim() || 'NASA Planetary Fact Sheet',
      is_active: formData.value.is_active,
      updated_at: new Date().toISOString(),
    };

    const { error: saveErr } = await client
      .from('planets')
      .update(payload)
      .eq('planet_id', editingPlanet.value.planet_id);

    if (saveErr) throw saveErr;

    showNotification('success', `Data Planet ${payload.nama} berhasil diperbarui.`);
    saving.value = false;
    closeModal();
    await loadPlanets();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Gagal menyimpan perubahan planet.');
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
  loadPlanets();
});
</script>

<template>
  <div class="admin-planets-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Planet &amp; Katalog Observasi</h1>
        <p class="page-desc">Kelola ringkasan materi, 6 kotak ilmiah observasi PLY-02, dan ketersediaan planet di simulasi publik.</p>
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

    <!-- TABEL 8 PLANET UTAMA -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat data planet dari Supabase…</p>
      </div>

      <div v-else-if="!planets.length" class="empty-state">
        <p>Belum ada data planet yang dimuat.</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 70px;">Urutan</th>
            <th>Nama Planet</th>
            <th>Kategori</th>
            <th>Diameter (km)</th>
            <th>Rotasi &amp; Orbit</th>
            <th>Suhu Rata-rata</th>
            <th style="width: 100px; text-align: center;">Status</th>
            <th style="width: 100px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in planets" :key="p.planet_id">
            <td>
              <span class="order-badge">#{{ p.urutan_planet }}</span>
            </td>
            <td>
              <div class="planet-name-cell">
                <b>Planet {{ p.nama }}</b>
                <small>Slug: {{ p.planet_id }}</small>
              </div>
            </td>
            <td>
              <span class="cat-tag">{{ p.kategori_planet || 'TERRESTRIAL' }}</span>
            </td>
            <td>{{ Number(p.diameter_km || 0).toLocaleString('id-ID') }} km</td>
            <td>
              <div class="small-meta">
                <span>Rotasi: {{ p.periode_rotasi || '—' }}</span>
                <span>Orbit: {{ p.periode_orbit || '—' }}</span>
              </div>
            </td>
            <td>{{ p.suhu_rata_c || '—' }}</td>
            <td style="text-align: center;">
              <button
                type="button"
                class="status-toggle-btn"
                :class="{ on: p.is_active !== false }"
                :disabled="togglingId === p.planet_id"
                :title="p.is_active !== false ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'"
                @click="toggleActive(p)"
              >
                {{ togglingId === p.planet_id ? '…' : (p.is_active !== false ? 'Aktif' : 'Nonaktif') }}
              </button>
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-edit" @click="openEditModal(p)">
                <UiIcon name="atur" :size="15" /> Ubah
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDIT & PRATINJAU OBSERVASI PLY-02 -->
    <div v-if="editingPlanet" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Ubah Materi: Planet {{ formData.nama }}</h3>
            <p class="modal-sub">Konfigurasi kolom bersih PLY-02 (Tanpa parameter 3D/Navigasi).</p>
          </div>
          <div class="modal-mode-tabs">
            <button type="button" :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button type="button" :class="{ on: modalViewMode === 'PREVIEW' }" @click="modalViewMode = 'PREVIEW'">Pratinjau PLY-02</button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <!-- FORMULIR INPUT -->
        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>
          <!-- BAGIAN 1: IDENTITAS & MATERI -->
          <div class="form-section">
            <span class="fs-title">1. Identitas &amp; Deskripsi Materi</span>
            <div class="grid-2">
              <label class="field">
                <span>Nama Planet</span>
                <input v-model="formData.nama" required type="text" />
              </label>
              <label class="field">
                <span>Urutan Planet dari Matahari (1-8)</span>
                <input v-model.number="formData.urutan_planet" required type="number" min="1" max="8" />
              </label>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>Kategori Planet</span>
                <select v-model="formData.kategori_planet">
                  <option value="TERRESTRIAL">Terestrial / Batuan (TERRESTRIAL)</option>
                  <option value="GAS_GIANT">Raksasa Gas (GAS_GIANT)</option>
                  <option value="ICE_GIANT">Raksasa Es (ICE_GIANT)</option>
                </select>
              </label>
              <label class="field">
                <span>Sumber Referensi Ilmiah</span>
                <input v-model="formData.sumber_referensi" type="text" placeholder="misal: NASA Planetary Fact Sheet" />
              </label>
            </div>
            <label class="field">
              <span>Uraian Materi Pembelajaran Edukasi (PLY-02)</span>
              <textarea v-model="formData.deskripsi_materi" rows="3" placeholder="Ringkasan materi inti planet untuk dipelajari siswa..." />
            </label>
          </div>

          <!-- BAGIAN 2: DIMENSI & SKALA -->
          <div class="form-section">
            <span class="fs-title">2. Dimensi Fisik &amp; Skala</span>
            <div class="grid-2">
              <label class="field">
                <span>Diameter Planet (km)</span>
                <input v-model.number="formData.diameter_km" required type="number" />
              </label>
              <label class="field">
                <span>Perbandingan Skala Ukuran Bumi</span>
                <input v-model="formData.perbandingan_bumi" type="text" placeholder="misal: 1,00× Ukuran Bumi" />
              </label>
            </div>
          </div>

          <!-- BAGIAN 3: 6 KOTAK DATA ILMIAH OBSERVASI (PLY-02) -->
          <div class="form-section">
            <span class="fs-title">3. 6 Kotak Data Ilmiah Observasi (PLY-02)</span>
            <div class="grid-2">
              <label class="field">
                <span>1. Periode Rotasi</span>
                <input v-model="formData.periode_rotasi" type="text" placeholder="misal: 24,6 Jam" />
              </label>
              <label class="field">
                <span>Subteks Rotasi</span>
                <input v-model="formData.subteks_rotasi" type="text" placeholder="misal: Waktu 1 kali putaran pada sumbunya" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>2. Periode Orbit (Revolusi)</span>
                <input v-model="formData.periode_orbit" type="text" placeholder="misal: 687 Hari" />
              </label>
              <label class="field">
                <span>Subteks Orbit</span>
                <input v-model="formData.subteks_orbit" type="text" placeholder="misal: Waktu mengelilingi Matahari" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>3. Kemiringan Sumbu (Tilt)</span>
                <input v-model="formData.kemiringan_sumbu" type="text" placeholder="misal: 25,2°" />
              </label>
              <label class="field">
                <span>4. Suhu Rata-rata</span>
                <input v-model="formData.suhu_rata_c" type="text" placeholder="misal: -65 °C" />
              </label>
            </div>

            <div class="grid-2">
              <label class="field">
                <span>Rentang Suhu Ekstrem</span>
                <input v-model="formData.rentang_suhu" type="text" placeholder="misal: -125 °C hingga 20 °C" />
              </label>
              <label class="field">
                <span>5. Usia Planet</span>
                <input v-model="formData.usia_planet" type="text" placeholder="misal: ± 4,5 miliar tahun" />
              </label>
            </div>

            <label class="field">
              <span>Subteks Usia Planet</span>
              <input v-model="formData.subteks_usia" type="text" placeholder="misal: Terbentuk bersama Tata Surya" />
            </label>
          </div>

          <!-- BAGIAN 4: ARAH & DINAMIKA ROTASI -->
          <div class="form-section">
            <span class="fs-title">4. Penjelasan Arah &amp; Dinamika Rotasi</span>
            <label class="field">
              <span>Judul Dinamika Rotasi</span>
              <input v-model="formData.judul_rotasi" type="text" placeholder="misal: Arah Rotasi Searah (Prograd)" />
            </label>
            <label class="field">
              <span>Deskripsi Penjelasan Arah Rotasi</span>
              <textarea v-model="formData.deskripsi_rotasi" rows="2" placeholder="Penjelasan apakah planet berputar searah jarum jam atau retrograd..." />
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : 'Simpan Perubahan Planet' }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU LAYAR SISWA PLY-02 -->
        <div v-else class="modal-body preview-body scroll">
          <div class="preview-card-ply02">
            <div class="pv-header">
              <span class="pv-tag">Planet ke-{{ formData.urutan_planet }} dari Matahari</span>
              <h2 class="pv-name">Planet {{ formData.nama }}</h2>
              <p class="pv-desc">{{ formData.deskripsi_materi }}</p>
            </div>

            <!-- 6 KOTAK OBSERVASI -->
            <div class="pv-grid-6">
              <div class="pv-box">
                <small>Diameter</small>
                <b>{{ Number(formData.diameter_km).toLocaleString('id-ID') }} km</b>
                <span class="sub">{{ formData.perbandingan_bumi }}</span>
              </div>
              <div class="pv-box">
                <small>Periode Rotasi</small>
                <b>{{ formData.periode_rotasi }}</b>
                <span class="sub">{{ formData.subteks_rotasi }}</span>
              </div>
              <div class="pv-box">
                <small>Periode Orbit</small>
                <b>{{ formData.periode_orbit }}</b>
                <span class="sub">{{ formData.subteks_orbit }}</span>
              </div>
              <div class="pv-box">
                <small>Kemiringan Sumbu</small>
                <b>{{ formData.kemiringan_sumbu }}</b>
                <span class="sub">Sudut inklinasi</span>
              </div>
              <div class="pv-box">
                <small>Suhu Rata-rata</small>
                <b>{{ formData.suhu_rata_c }}</b>
                <span class="sub">{{ formData.rentang_suhu }}</span>
              </div>
              <div class="pv-box">
                <small>Usia Planet</small>
                <b>{{ formData.usia_planet }}</b>
                <span class="sub">{{ formData.subteks_usia }}</span>
              </div>
            </div>

            <!-- KOTAK ROTASI -->
            <div class="pv-rot-box">
              <b>{{ formData.judul_rotasi }}</b>
              <p>{{ formData.deskripsi_rotasi }}<span v-if="formData.sumber_referensi"> — {{ formData.sumber_referensi }}</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-planets-page {
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
}
.btn-refresh:hover:not(:disabled) {
  background-color: #f1f5f9;
}

.dash-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13.5px;
}
.dash-alert.success { background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
.dash-alert.error { background-color: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }

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
  font-weight: 500;
  color: #475569;
  border-bottom: 1px solid #e2e8f0;
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
.planet-name-cell b {
  display: block;
  color: #0f172a;
}
.planet-name-cell small {
  color: #94a3b8;
  font-size: 11.5px;
}
.cat-tag {
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

.status-toggle-btn {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  background-color: #f1f5f9;
  color: #94a3b8;
}
.status-toggle-btn.on {
  background-color: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
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
}
.btn-edit:hover {
  background-color: #dbeafe;
}

/* Modal */
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
.field input, .field textarea {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  font-size: 13.5px;
  color: #0f172a;
  background-color: #ffffff;
}
.field input:focus, .field textarea:focus {
  outline: none;
  border-color: #2563eb;
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
}
.btn-save {
  padding: 8px 18px;
  border-radius: 6px;
  border: none;
  background-color: #2563eb;
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
}
.btn-save:hover:not(:disabled) {
  background-color: #1d4ed8;
}

/* Pratinjau PLY-02 */
.preview-body {
  background-color: #0b1021;
  border-radius: 0 0 14px 14px;
}
.preview-card-ply02 {
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.pv-header .pv-tag {
  font-size: 11px;
  text-transform: uppercase;
  color: #5ed1ff;
  letter-spacing: 0.05em;
  font-weight: 500;
}
.pv-header .pv-name {
  margin: 4px 0 6px 0;
  font-size: 24px;
  font-weight: 600;
}
.pv-header .pv-desc {
  margin: 0;
  font-size: 13.5px;
  color: #a6b2de;
  line-height: 1.5;
}
.pv-grid-6 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.pv-box {
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
}
.pv-box small {
  font-size: 11px;
  color: #a6b2de;
}
.pv-box b {
  font-size: 14.5px;
  color: #5ed1ff;
  margin: 2px 0;
}
.pv-box .sub {
  font-size: 11px;
  color: #a6b2de;
}
.pv-rot-box {
  background-color: rgba(94, 209, 255, 0.08);
  border: 1px solid rgba(94, 209, 255, 0.25);
  border-radius: 8px;
  padding: 12px 14px;
}
.pv-rot-box b {
  display: block;
  color: #5ed1ff;
  font-size: 14px;
  margin-bottom: 4px;
}
.pv-rot-box p {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
  line-height: 1.45;
}

@media (max-width: 640px) {
  .grid-2 { grid-template-columns: 1fr; }
  .pv-grid-6 { grid-template-columns: 1fr 1fr; }
}
</style>

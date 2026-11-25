<script setup>
// Halaman Pengelola Hanggar Pesawat (/admin/ships) — Sinkron dengan HangarPanel.vue & engine.js
import { ref, computed, onMounted } from 'vue';
import { getSupabaseClient } from '~/utils/supabaseClient.js';
import { formatSupabaseError, downloadSafeCsv } from '~/utils/adminAuth.js';
import { KM } from '~/game/util.js';

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const togglingId = ref('');
const error = ref('');
const notification = ref(null);

const ships = ref([]);
const editingShip = ref(null);
const modalViewMode = ref('EDIT'); // 'EDIT' | 'PREVIEW'
const formError = ref('');

const formData = ref({
  ship_id: 'astra',
  urutan_tier: 1,
  nama: '',
  kelas_pesawat: '',
  panjang_meter: 37,
  harga_poin: 0,
  kecepatan_jelajah: 70,
  kecepatan_turbo: 4.5,
  akselerasi: 1.5,
  kelincahan: 1.15,
  bar_speed: 62,
  bar_agility: 92,
  bar_accel: 85,
  bar_boost: 70,
  deskripsi: '',
  is_active: true,
});

const previewCruiseKm = computed(() => Math.round((Number(formData.value.kecepatan_jelajah) || 70) * KM).toLocaleString('id-ID'));
const previewBoostKm = computed(() => Math.round((Number(formData.value.kecepatan_jelajah) || 70) * (Number(formData.value.kecepatan_turbo) || 4.5) * KM).toLocaleString('id-ID'));

function parseBar(val, fallback) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return n <= 1 ? Math.round(n * 100) : Math.min(100, Math.max(0, Math.round(n)));
}

async function loadShips() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Klien Supabase belum terkonfigurasi.';
    loading.value = false;
    return;
  }

  error.value = '';
  try {
    const { data, error: fetchErr } = await client
      .from('ships')
      .select('*')
      .order('urutan_tier', { ascending: true });

    if (fetchErr) throw fetchErr;
    ships.value = data || [];
  } catch (err) {
    error.value = formatSupabaseError(err, 'Gagal memuat daftar pesawat hanggar.');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function handleRefresh() {
  refreshing.value = true;
  await loadShips();
}

function openEditModal(ship) {
  formError.value = '';
  editingShip.value = ship;
  const sb = ship.statistik_bar && typeof ship.statistik_bar === 'object' ? ship.statistik_bar : {};

  formData.value = {
    ship_id: ship.ship_id,
    urutan_tier: Number(ship.urutan_tier || 1),
    nama: ship.nama || '',
    kelas_pesawat: ship.kelas_pesawat || '',
    panjang_meter: Number(ship.panjang_meter || 20),
    harga_poin: Number(ship.harga_poin ?? 0),
    kecepatan_jelajah: Number(ship.kecepatan_jelajah ?? 70),
    kecepatan_turbo: Number(ship.kecepatan_turbo ?? 4.5),
    akselerasi: Number(ship.akselerasi ?? 1.5),
    kelincahan: Number(ship.kelincahan ?? 1.15),
    bar_speed: parseBar(sb.speed ?? sb.Kecepatan, 70),
    bar_agility: parseBar(sb.agility ?? sb.Kelincahan, 75),
    bar_accel: parseBar(sb.accel ?? sb.Akselerasi, 75),
    bar_boost: parseBar(sb.boost ?? sb['Daya boost'], 75),
    deskripsi: ship.deskripsi || '',
    is_active: ship.is_active !== false,
  };
  modalViewMode.value = 'EDIT';
}

function closeModal() {
  if (saving.value) return;
  editingShip.value = null;
  formError.value = '';
}

async function toggleActive(ship) {
  if (togglingId.value === ship.ship_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  const nextState = !(ship.is_active !== false);
  ship.is_active = nextState;
  togglingId.value = ship.ship_id;

  try {
    const { error: updErr } = await client
      .from('ships')
      .update({ is_active: nextState })
      .eq('ship_id', ship.ship_id);

    if (updErr) throw updErr;
    showNotification('success', `Armada ${ship.nama} diubah menjadi ${nextState ? 'Aktif' : 'Nonaktif'}.`);
  } catch (err) {
    ship.is_active = !nextState;
    showNotification('error', formatSupabaseError(err, 'Gagal memperbarui status pesawat.'));
  } finally {
    togglingId.value = '';
  }
}

function isBlankNumber(val) {
  return val === '' || val === null || val === undefined || !Number.isFinite(Number(val));
}

async function handleSave() {
  formError.value = '';
  if (!formData.value.nama?.trim()) {
    formError.value = 'Nama pesawat wajib diisi.';
    return;
  }
  if (!formData.value.kelas_pesawat?.trim()) {
    formError.value = 'Kelas pesawat wajib diisi.';
    return;
  }
  if (!formData.value.deskripsi?.trim()) {
    formError.value = 'Deskripsi pesawat wajib diisi.';
    return;
  }
  if (isBlankNumber(formData.value.panjang_meter) || Number(formData.value.panjang_meter) <= 0) {
    formError.value = 'Panjang pesawat harus berupa angka valid lebih besar dari 0 meter.';
    return;
  }
  if (isBlankNumber(formData.value.harga_poin) || Number(formData.value.harga_poin) < 0) {
    formError.value = 'Harga bintang wajib diisi angka valid (>= 0) dan tidak boleh kosong.';
    return;
  }
  if (
    isBlankNumber(formData.value.kecepatan_jelajah) ||
    Number(formData.value.kecepatan_jelajah) <= 0 ||
    isBlankNumber(formData.value.kecepatan_turbo) ||
    Number(formData.value.kecepatan_turbo) < 1
  ) {
    formError.value = 'Kecepatan jelajah (> 0) dan pengali turbo (>= 1) harus valid.';
    return;
  }
  if (
    isBlankNumber(formData.value.akselerasi) ||
    Number(formData.value.akselerasi) <= 0 ||
    isBlankNumber(formData.value.kelincahan) ||
    Number(formData.value.kelincahan) <= 0
  ) {
    formError.value = 'Nilai akselerasi dan kelincahan harus valid dan lebih besar dari 0.';
    return;
  }
  const barKeys = ['bar_speed', 'bar_agility', 'bar_accel', 'bar_boost'];
  for (const k of barKeys) {
    const val = formData.value[k];
    if (isBlankNumber(val) || Number(val) < 0 || Number(val) > 100) {
      formError.value = 'Keempat nilai indikator bar statistik harus berada di rentang 0 hingga 100.';
      return;
    }
  }

  const client = getSupabaseClient();
  if (!client || !editingShip.value) return;

  const clampBar = (n) => Math.min(100, Math.max(0, Math.round(Number(n))));

  saving.value = true;
  try {
    const payload = {
      nama: formData.value.nama.trim(),
      kelas_pesawat: formData.value.kelas_pesawat.trim(),
      panjang_meter: Math.round(Number(formData.value.panjang_meter)),
      harga_poin: Math.max(0, Math.round(Number(formData.value.harga_poin))),
      kecepatan_jelajah: Number(formData.value.kecepatan_jelajah),
      kecepatan_turbo: Number(formData.value.kecepatan_turbo),
      akselerasi: Number(formData.value.akselerasi),
      kelincahan: Number(formData.value.kelincahan),
      statistik_bar: {
        speed: clampBar(formData.value.bar_speed),
        agility: clampBar(formData.value.bar_agility),
        accel: clampBar(formData.value.bar_accel),
        boost: clampBar(formData.value.bar_boost),
      },
      deskripsi: formData.value.deskripsi.trim(),
      is_active: formData.value.is_active !== false,
    };

    const { error: saveErr } = await client
      .from('ships')
      .update(payload)
      .eq('ship_id', editingShip.value.ship_id);

    if (saveErr) throw saveErr;

    showNotification('success', `Spesifikasi pesawat ${payload.nama} berhasil diperbarui.`);
    saving.value = false;
    closeModal();
    await loadShips();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Gagal menyimpan perubahan pesawat.');
  } finally {
    saving.value = false;
  }
}

function exportCsv() {
  if (!ships.value.length) {
    showNotification('error', 'Belum ada data armada pesawat.');
    return;
  }
  const headers = [
    'ship_id', 'urutan_tier', 'nama', 'kelas_pesawat', 'panjang_meter', 'harga_poin',
    'kecepatan_jelajah', 'kecepatan_turbo', 'akselerasi', 'kelincahan',
    'bar_speed', 'bar_agility', 'bar_accel', 'bar_boost', 'deskripsi', 'is_active',
  ];
  const rows = ships.value.map((s) => {
    const sb = s.statistik_bar || {};
    return [
      s.ship_id,
      s.urutan_tier,
      s.nama || '',
      s.kelas_pesawat || '',
      s.panjang_meter,
      s.harga_poin,
      s.kecepatan_jelajah,
      s.kecepatan_turbo,
      s.akselerasi,
      s.kelincahan,
      parseBar(sb.speed, 70),
      parseBar(sb.agility, 70),
      parseBar(sb.accel, 70),
      parseBar(sb.boost, 70),
      s.deskripsi || '',
      s.is_active !== false ? 'true' : 'false',
    ];
  });
  downloadSafeCsv(`astrosphere_ships_${Date.now()}.csv`, headers, rows);
  showNotification('success', `Berhasil mengekspor ${ships.value.length} armada ke CSV.`);
}

function showNotification(type, msg) {
  notification.value = { type, msg };
  setTimeout(() => {
    notification.value = null;
  }, 3500);
}

onMounted(() => {
  loadShips();
});
</script>

<template>
  <div class="admin-ships-page">
    <div class="page-head">
      <div>
        <h1 class="page-title">Manajemen Hanggar Pesawat</h1>
        <p class="page-desc">Atur harga bintang, kelas, spesifikasi fisika penerbangan 3D, dan bar statistik armada penjelajah.</p>
      </div>
      <div class="head-actions">
        <button type="button" class="btn-head line" @click="exportCsv">
          Ekspor CSV
        </button>
        <button type="button" class="btn-head line" :disabled="refreshing" @click="handleRefresh">
          <UiIcon name="ulang" :size="15" :class="{ 'spin-active': refreshing }" />
          <span>{{ refreshing ? 'Memperbarui…' : 'Segarkan Data' }}</span>
        </button>
      </div>
    </div>

    <div v-if="notification" class="dash-alert" :class="notification.type" role="status">
      <UiIcon :name="notification.type === 'success' ? 'cek' : 'silang'" :size="18" />
      <span>{{ notification.msg }}</span>
    </div>

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
    </div>

    <!-- TABEL ARMADA HANGGAR -->
    <div class="card-section table-wrap">
      <div v-if="loading" class="loading-state">
        <div class="spinner" />
        <p>Memuat data armada pesawat dari Supabase…</p>
      </div>

      <div v-else-if="!ships.length" class="empty-state">
        <UiIcon name="hanggar" :size="28" />
        <p>Belum ada data armada pesawat di tabel <code>public.ships</code>. Jalankan <code>structure.sql</code> terlebih dahulu.</p>
      </div>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th style="width: 72px;">Tier</th>
            <th>Pesawat &amp; Kelas</th>
            <th style="width: 110px;">Panjang</th>
            <th style="width: 140px;">Harga Pembukaan</th>
            <th style="width: 210px;">Jelajah &amp; Turbo (3D)</th>
            <th style="width: 96px; text-align: center;">Status</th>
            <th style="width: 110px; text-align: right;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in ships" :key="s.ship_id">
            <td>
              <span class="tier-badge">T{{ s.urutan_tier }}</span>
            </td>
            <td>
              <div class="ship-cell">
                <b>{{ s.nama }}</b>
                <small>{{ s.kelas_pesawat || 'Pesawat Eksplorasi' }} · ID: <code>{{ s.ship_id }}</code></small>
              </div>
            </td>
            <td>{{ s.panjang_meter }} m</td>
            <td>
              <span class="price-pill" :class="{ free: Number(s.harga_poin) === 0 }">
                <UiIcon name="bintang" :size="13" />
                {{ Number(s.harga_poin) === 0 ? 'Gratis (Starter)' : `${s.harga_poin} Bintang` }}
              </span>
            </td>
            <td>
              <div class="perf-cell">
                <span>{{ Math.round((Number(s.kecepatan_jelajah) || 70) * KM).toLocaleString('id-ID') }} km/s jelajah</span>
                <small>Turbo ×{{ s.kecepatan_turbo }} ({{ Math.round((Number(s.kecepatan_jelajah) || 70) * (Number(s.kecepatan_turbo) || 4.5) * KM).toLocaleString('id-ID') }} km/s)</small>
              </div>
            </td>
            <td style="text-align: center;">
              <button
                type="button"
                class="status-toggle-btn"
                :class="{ on: s.is_active !== false }"
                :disabled="togglingId === s.ship_id"
                :title="s.is_active !== false ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'"
                @click="toggleActive(s)"
              >
                {{ togglingId === s.ship_id ? '…' : (s.is_active !== false ? 'Aktif' : 'Nonaktif') }}
              </button>
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn-edit" @click="openEditModal(s)">
                <UiIcon name="atur" :size="14" /> Ubah
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL EDIT & PRATINJAU KARTU HANGGAR -->
    <div v-if="editingShip" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">Ubah Armada: {{ formData.nama }}</h3>
            <p class="modal-sub">ID Model 3D: <code>{{ formData.ship_id }}</code> · Tier {{ formData.urutan_tier }}</p>
          </div>
          <div class="modal-mode-tabs">
            <button type="button" :class="{ on: modalViewMode === 'EDIT' }" @click="modalViewMode = 'EDIT'">Formulir</button>
            <button type="button" :class="{ on: modalViewMode === 'PREVIEW' }" @click="modalViewMode = 'PREVIEW'">Pratinjau Hanggar</button>
            <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
          </div>
        </div>

        <form v-if="modalViewMode === 'EDIT'" class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>

          <!-- BAGIAN 1: IDENTITAS & HARGA -->
          <div class="form-section">
            <span class="fs-title">1. Identitas &amp; Ekonomi Armada</span>
            <div class="grid-2">
              <label class="field">
                <span>Nama Pesawat *</span>
                <input v-model="formData.nama" type="text" required />
              </label>
              <label class="field">
                <span>Kelas Pesawat *</span>
                <input v-model="formData.kelas_pesawat" type="text" placeholder="misal: Pengorbit ulang-alik" required />
              </label>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>Panjang Pesawat (meter) *</span>
                <input v-model.number="formData.panjang_meter" type="number" min="1" max="500" required />
              </label>
              <label class="field">
                <span>Harga Bintang untuk Membuka *</span>
                <input v-model.number="formData.harga_poin" type="number" min="0" max="50000" required />
              </label>
            </div>
            <label class="field">
              <span>Deskripsi Pesawat (HangarPanel) *</span>
              <textarea v-model="formData.deskripsi" rows="3" required />
            </label>
          </div>

          <!-- BAGIAN 2: PERFORMA FISIKA 3D -->
          <div class="form-section">
            <span class="fs-title">2. Parameter Fisika Penerbangan 3D (engine.js)</span>
            <div class="grid-2">
              <label class="field">
                <span>Kecepatan Jelajah (Unit Mesin) *</span>
                <input v-model.number="formData.kecepatan_jelajah" type="number" step="0.5" min="1" required />
                <small class="field-hint">Tampil sebagai {{ previewCruiseKm }} km/s</small>
              </label>
              <label class="field">
                <span>Pengali Pendorong Turbo (×) *</span>
                <input v-model.number="formData.kecepatan_turbo" type="number" step="0.1" min="1" required />
                <small class="field-hint">Turbo maksimal {{ previewBoostKm }} km/s</small>
              </label>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>Akselerasi (accel) *</span>
                <input v-model.number="formData.akselerasi" type="number" step="0.05" min="0.1" required />
              </label>
              <label class="field">
                <span>Kelincahan Kemudi (turn) *</span>
                <input v-model.number="formData.kelincahan" type="number" step="0.05" min="0.1" required />
              </label>
            </div>
          </div>

          <!-- BAGIAN 3: 4 BAR STATISTIK (0-100) -->
          <div class="form-section">
            <span class="fs-title">3. Indikator Bar Statistik Visual (0 – 100)</span>
            <div class="bars-editor">
              <div class="bar-input-row">
                <label>Kecepatan</label>
                <input v-model.number="formData.bar_speed" type="range" min="0" max="100" />
                <input v-model.number="formData.bar_speed" type="number" min="0" max="100" class="num-input" />
              </div>
              <div class="bar-input-row">
                <label>Kelincahan</label>
                <input v-model.number="formData.bar_agility" type="range" min="0" max="100" />
                <input v-model.number="formData.bar_agility" type="number" min="0" max="100" class="num-input" />
              </div>
              <div class="bar-input-row">
                <label>Akselerasi</label>
                <input v-model.number="formData.bar_accel" type="range" min="0" max="100" />
                <input v-model.number="formData.bar_accel" type="number" min="0" max="100" class="num-input" />
              </div>
              <div class="bar-input-row">
                <label>Daya Boost</label>
                <input v-model.number="formData.bar_boost" type="range" min="0" max="100" />
                <input v-model.number="formData.bar_boost" type="number" min="0" max="100" class="num-input" />
              </div>
            </div>
          </div>

          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan pesawat ini (tersedia di Hanggar 3D siswa)</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>

        <!-- PRATINJAU KARTU HANGGAR SISWA -->
        <div v-else class="modal-body preview-body scroll">
          <div class="pv-hangar-card">
            <div class="pv-hc-head">
              <div>
                <h3 class="pv-ship-title">{{ formData.nama }}</h3>
                <p class="pv-ship-sub">{{ formData.kelas_pesawat }} · {{ formData.panjang_meter }} m</p>
              </div>
              <span class="pv-price-badge">
                <UiIcon name="bintang" :size="13" />
                {{ Number(formData.harga_poin) === 0 ? 'Gratis' : `${formData.harga_poin} Bintang` }}
              </span>
            </div>

            <p class="pv-ship-desc">{{ formData.deskripsi }}</p>

            <div class="pv-speed-grid">
              <div class="pv-speed-box">
                <small>Jelajah Maksimal</small>
                <b>{{ previewCruiseKm }} <small>km/s</small></b>
              </div>
              <div class="pv-speed-box turbo">
                <small>Pendorong Turbo</small>
                <b>{{ previewBoostKm }} <small>km/s</small></b>
              </div>
            </div>

            <div class="pv-stats-list">
              <div class="pv-stat-row">
                <span>Kecepatan</span>
                <div class="pv-track"><i :style="{ width: Math.min(100, Math.max(0, formData.bar_speed)) + '%' }" /></div>
                <small>{{ formData.bar_speed }}%</small>
              </div>
              <div class="pv-stat-row">
                <span>Kelincahan</span>
                <div class="pv-track"><i :style="{ width: Math.min(100, Math.max(0, formData.bar_agility)) + '%' }" /></div>
                <small>{{ formData.bar_agility }}%</small>
              </div>
              <div class="pv-stat-row">
                <span>Akselerasi</span>
                <div class="pv-track"><i :style="{ width: Math.min(100, Math.max(0, formData.bar_accel)) + '%' }" /></div>
                <small>{{ formData.bar_accel }}%</small>
              </div>
              <div class="pv-stat-row">
                <span>Daya boost</span>
                <div class="pv-track"><i :style="{ width: Math.min(100, Math.max(0, formData.bar_boost)) + '%' }" /></div>
                <small>{{ formData.bar_boost }}%</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-ships-page { display: flex; flex-direction: column; gap: 18px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-head { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all .15s; }
.btn-head.line { background: #ffffff; border-color: #cbd5e1; color: #334155; }
.btn-head.line:hover { background: #f8fafc; }

.spin-active { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.dash-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.dash-alert.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.dash-alert.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

.card-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; }
.table-wrap { overflow-x: auto; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 600; color: #475569; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
.adm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.tier-badge { padding: 4px 10px; border-radius: 6px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; }
.ship-cell b { display: block; color: #0f172a; font-size: 14.5px; font-weight: 600; }
.ship-cell small { color: #64748b; font-size: 12px; }

.price-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; background: #fef3c7; color: #b45309; font-size: 12px; font-weight: 600; }
.price-pill.free { background: #f0fdf4; color: #16a34a; }

.perf-cell span { display: block; color: #0f172a; font-size: 13px; font-weight: 500; }
.perf-cell small { font-size: 12px; color: #64748b; }

.status-toggle-btn { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; border: 1px solid transparent; cursor: pointer; background: #f1f5f9; color: #94a3b8; }
.status-toggle-btn.on { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
.btn-edit { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 12.5px; font-weight: 500; cursor: pointer; }

.loading-state, .empty-state { padding: 44px 20px; text-align: center; color: #64748b; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.spinner { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #e2e8f0; border-top-color: #2563eb; animation: spin 0.8s linear infinite; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 720px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.modal-mode-tabs { display: flex; align-items: center; gap: 6px; }
.modal-mode-tabs button { padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-weight: 500; cursor: pointer; color: #475569; }
.modal-mode-tabs button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.btn-close-modal { border: none !important; background: none !important; color: #94a3b8; cursor: pointer; padding: 4px !important; }

.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.form-section { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
.fs-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #2563eb; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea { padding: 8px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background: #fff; }
.field-hint { font-size: 11.5px; color: #2563eb; font-weight: 500; }

.bars-editor { display: flex; flex-direction: column; gap: 10px; }
.bar-input-row { display: grid; grid-template-columns: 100px 1fr 72px; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; color: #334155; }
.bar-input-row input[type="range"] { accent-color: #2563eb; }
.num-input { padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 13px; text-align: center; }

.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }
.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }

/* Pratinjau Hanggar Gelap */
.preview-body { background: #0b1021; color: #ffffff; }
.pv-hangar-card { background: rgba(16, 23, 52, 0.9); border: 1px solid rgba(148, 174, 255, 0.22); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.pv-hc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.pv-ship-title { margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; }
.pv-ship-sub { margin: 3px 0 0; font-size: 13px; color: #94a3b8; }
.pv-price-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 8px; background: rgba(234, 179, 8, 0.14); border: 1px solid rgba(234, 179, 8, 0.3); color: #fbbf24; font-size: 12px; font-weight: 600; }
.pv-ship-desc { margin: 0; font-size: 13.5px; color: #dbeafe; line-height: 1.55; }

.pv-speed-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pv-speed-box { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 12px; }
.pv-speed-box small { display: block; font-size: 11.5px; color: #94a3b8; }
.pv-speed-box b { font-size: 17px; font-weight: 600; color: #ffffff; }
.pv-speed-box.turbo b { color: #38bdf8; }
.pv-speed-box b small { display: inline; font-size: 12px; font-weight: 500; color: inherit; }

.pv-stats-list { display: flex; flex-direction: column; gap: 8px; }
.pv-stat-row { display: grid; grid-template-columns: 95px 1fr 40px; align-items: center; gap: 10px; font-size: 12.5px; color: #cbd5e1; }
.pv-track { height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.09); overflow: hidden; }
.pv-track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #38bdf8, #818cf8); }
.pv-stat-row small { text-align: right; color: #94a3b8; }
</style>

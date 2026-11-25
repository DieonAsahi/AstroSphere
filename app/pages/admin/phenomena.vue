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
const togglingId = ref('');
const error = ref('');
const formError = ref('');
const notification = ref(null);

const phenomena = ref([]);
const selectedPlanet = ref('all');
const editingPheno = ref(null);
const confirmStatusTarget = ref(null);

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

const VISUAL_VIEW_OPTIONS = [
  { id: 'top', label: 'Atas (Top-Down)' },
  { id: 'sun', label: 'Arah Matahari (Sun)' },
  { id: 'wide', label: 'Sudut Lebar (Wide)' },
];

const VISUAL_SHOW_OPTIONS = [
  { id: 'pin', label: 'Pin Lokasi Ekuator' },
  { id: 'season', label: 'Siklus Musim (Season)' },
  { id: 'spins', label: 'Penghitung Rotasi (Spins)' },
  { id: 'years', label: 'Siklus Tahun (Years)' },
];

const createDefaultGuess = () => ({ q: '', opts: ['', '', ''], a: 0, why: '', points: 10 });

const DEFAULT_FORM = {
  phenomenon_id: '',
  planet_id: 'earth',
  judul: '',
  tombol_aksi_label: 'Putar Simulasi Fenomena',
  tipe_animasi: 'CUSTOM_ALIGNMENT',
  deskripsi_edukatif: '',
  sumber_referensi: 'NASA',
  judul_matahari: 'Kenapa bisa pas menutup?',
  penjelasan_matahari: '',
  judul_bulan: 'Kenapa Bulan jadi merah?',
  penjelasan_bulan: '',
  visual_mul: 400,
  visual_view: 'top',
  visual_show: 'pin',
  tebak_single: createDefaultGuess(),
  tebak_solar: createDefaultGuess(),
  tebak_lunar: createDefaultGuess(),
  is_active: true,
};

const formData = ref({ ...DEFAULT_FORM, tebak_single: createDefaultGuess(), tebak_solar: createDefaultGuess(), tebak_lunar: createDefaultGuess() });

async function loadPhenomena() {
  const client = getSupabaseClient();
  if (!client) {
    error.value = 'Layanan data belum siap. Muat ulang halaman.';
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
    error.value = formatSupabaseError(err, 'Tidak bisa memuat data fenomena.');
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

function openStatusModal(item) {
  if (togglingId.value === item.phenomenon_id) return;
  const isCurrentlyActive = item.is_active !== false;
  confirmStatusTarget.value = {
    item,
    nextState: !isCurrentlyActive,
  };
}

async function confirmToggleActive() {
  if (!confirmStatusTarget.value) return;
  const { item, nextState } = confirmStatusTarget.value;
  if (togglingId.value === item.phenomenon_id) return;
  const client = getSupabaseClient();
  if (!client) return;

  togglingId.value = item.phenomenon_id;

  try {
    const { error: updErr } = await client
      .from('phenomena')
      .update({ is_active: nextState })
      .eq('phenomenon_id', item.phenomenon_id);

    if (updErr) throw updErr;
    item.is_active = nextState;
    confirmStatusTarget.value = null;
    showNotification('success', `Fenomena "${item.judul}" berhasil ${nextState ? 'diaktifkan kembali' : 'dinonaktifkan'}.`);
  } catch (err) {
    confirmStatusTarget.value = null;
    showNotification('error', formatSupabaseError(err, 'Tidak bisa memperbarui status data.'));
  } finally {
    togglingId.value = '';
  }
}

function parseGuessObject(raw) {
  if (!raw || typeof raw !== 'object') return createDefaultGuess();
  const opts = Array.isArray(raw.opts) ? [raw.opts[0] || '', raw.opts[1] || '', raw.opts[2] || ''] : ['', '', ''];
  return {
    q: raw.q || '',
    opts,
    a: Number.isInteger(raw.a) ? raw.a : 0,
    why: raw.why || '',
    points: Number(raw.points) > 0 ? Number(raw.points) : 10,
  };
}

function buildGuessPayload(g) {
  if (!g || !g.q?.trim()) return null;
  return {
    q: g.q.trim(),
    opts: [(g.opts?.[0] || '').trim(), (g.opts?.[1] || '').trim(), (g.opts?.[2] || '').trim()],
    a: Number(g.a) || 0,
    why: g.why?.trim() || '',
    points: Number(g.points) > 0 ? Number(g.points) : 10,
  };
}

function validateGuessBlock(g, label) {
  if (!g || !g.q?.trim()) return '';
  const opts = [g.opts?.[0]?.trim(), g.opts?.[1]?.trim(), g.opts?.[2]?.trim()];
  if (opts.some((opt) => !opt)) {
    return `${label}: jika pertanyaan diisi, ketiga opsi jawaban (A, B, C) wajib diisi.`;
  }
  const ansIdx = Number(g.a);
  if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx > 2) {
    return `${label}: pilihan jawaban benar harus Opsi A, B, atau C.`;
  }
  return '';
}

function openEditModal(item) {
  formError.value = '';
  editingPheno.value = item;
  const kv = item.konfigurasi_visual && typeof item.konfigurasi_visual === 'object' ? item.konfigurasi_visual : {};
  const td = item.tebak_dulu && typeof item.tebak_dulu === 'object' ? item.tebak_dulu : {};

  formData.value = {
    phenomenon_id: item.phenomenon_id,
    planet_id: item.planet_id,
    judul: item.judul || '',
    tombol_aksi_label: item.tombol_aksi_label || 'Putar Simulasi Fenomena',
    tipe_animasi: item.tipe_animasi || 'CUSTOM_ALIGNMENT',
    deskripsi_edukatif: item.deskripsi_edukatif || '',
    sumber_referensi: item.sumber_referensi || kv.sumber_referensi || 'NASA',
    judul_matahari: kv.judul_matahari || 'Kenapa bisa pas menutup?',
    penjelasan_matahari: item.penjelasan_matahari || kv.penjelasan_matahari || '',
    judul_bulan: kv.judul_bulan || 'Kenapa Bulan jadi merah?',
    penjelasan_bulan: item.penjelasan_bulan || kv.penjelasan_bulan || '',
    visual_mul: Number(kv.mul || 400),
    visual_view: kv.view || 'top',
    visual_show: kv.show || 'pin',
    tebak_single: item.planet_id !== 'earth' ? parseGuessObject(td.q ? td : null) : createDefaultGuess(),
    tebak_solar: item.planet_id === 'earth' ? parseGuessObject(td['gerhana-matahari']) : createDefaultGuess(),
    tebak_lunar: item.planet_id === 'earth' ? parseGuessObject(td['gerhana-bulan']) : createDefaultGuess(),
    is_active: item.is_active !== false,
  };
}

function closeModal() {
  if (saving.value) return;
  editingPheno.value = null;
  formError.value = '';
}

async function handleSave() {
  formError.value = '';
  if (!PLANET_OPTIONS.some((p) => p.id === formData.value.planet_id)) {
    formError.value = 'Target planet tidak valid.';
    return;
  }
  if (!ANIMATION_TYPES.some((t) => t.id === formData.value.tipe_animasi)) {
    formError.value = 'Tipe animasi simulasi tidak valid.';
    return;
  }
  if (!formData.value.judul?.trim()) {
    formError.value = 'Judul fenomena wajib diisi.';
    return;
  }
  if (!formData.value.tombol_aksi_label?.trim()) {
    formError.value = 'Label tombol aksi wajib diisi.';
    return;
  }
  if (!formData.value.deskripsi_edukatif?.trim()) {
    formError.value = 'Deskripsi edukatif wajib diisi.';
    return;
  }

  if (formData.value.planet_id === 'earth') {
    const solarErr = validateGuessBlock(formData.value.tebak_solar, 'Tebak Dulu (Gerhana Matahari)');
    if (solarErr) {
      formError.value = solarErr;
      return;
    }
    const lunarErr = validateGuessBlock(formData.value.tebak_lunar, 'Tebak Dulu (Gerhana Bulan)');
    if (lunarErr) {
      formError.value = lunarErr;
      return;
    }
  } else {
    const singleErr = validateGuessBlock(formData.value.tebak_single, 'Tebak Dulu');
    if (singleErr) {
      formError.value = singleErr;
      return;
    }
  }

  const client = getSupabaseClient();
  if (!client || !editingPheno.value) return;

  saving.value = true;
  try {
    const existingKv = editingPheno.value?.konfigurasi_visual && typeof editingPheno.value.konfigurasi_visual === 'object'
      ? { ...editingPheno.value.konfigurasi_visual }
      : {};

    if (formData.value.planet_id === 'earth') {
      existingKv.lab = true;
      existingKv.judul_matahari = formData.value.judul_matahari?.trim() || 'Kenapa bisa pas menutup?';
      existingKv.judul_bulan = formData.value.judul_bulan?.trim() || 'Kenapa Bulan jadi merah?';
      existingKv.penjelasan_matahari = (formData.value.penjelasan_matahari || '').trim();
      existingKv.penjelasan_bulan = (formData.value.penjelasan_bulan || '').trim();
    } else {
      existingKv.mul = Number(formData.value.visual_mul) || 400;
      existingKv.view = formData.value.visual_view || 'top';
      existingKv.show = formData.value.visual_show || 'pin';
    }

    let tebakPayload = null;
    if (formData.value.planet_id === 'earth') {
      const s = buildGuessPayload(formData.value.tebak_solar);
      const l = buildGuessPayload(formData.value.tebak_lunar);
      if (s || l) {
        tebakPayload = {};
        if (s) tebakPayload['gerhana-matahari'] = s;
        if (l) tebakPayload['gerhana-bulan'] = l;
      }
    } else {
      tebakPayload = buildGuessPayload(formData.value.tebak_single);
    }

    const payload = {
      planet_id: formData.value.planet_id,
      judul: formData.value.judul.trim(),
      tombol_aksi_label: formData.value.tombol_aksi_label.trim(),
      tipe_animasi: formData.value.tipe_animasi,
      deskripsi_edukatif: formData.value.deskripsi_edukatif.trim(),
      penjelasan_matahari: (formData.value.penjelasan_matahari || '').trim(),
      penjelasan_bulan: (formData.value.penjelasan_bulan || '').trim(),
      sumber_referensi: formData.value.sumber_referensi?.trim() || 'NASA',
      tebak_dulu: tebakPayload,
      konfigurasi_visual: existingKv,
      is_active: formData.value.is_active,
    };

    const { error: saveErr } = await client
      .from('phenomena')
      .update(payload)
      .eq('phenomenon_id', editingPheno.value.phenomenon_id);
    if (saveErr) throw saveErr;
    showNotification('success', `Fenomena "${payload.judul}" berhasil disimpan.`);

    saving.value = false;
    closeModal();
    await loadPhenomena();
  } catch (err) {
    formError.value = formatSupabaseError(err, 'Tidak bisa memperbarui data fenomena.');
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

    <div v-if="error" class="dash-alert error" role="alert">
      <UiIcon name="silang" :size="18" />
      <span>{{ error }}</span>
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
        <p>Memuat data fenomena…</p>
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
            <th style="width: 130px; text-align: right;">Aksi</th>
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
                class="adm-switch-btn"
                :class="{ on: item.is_active !== false }"
                :disabled="togglingId === item.phenomenon_id"
                :title="item.is_active !== false ? 'Klik untuk menonaktifkan fenomena' : 'Klik untuk mengaktifkan fenomena'"
                @click="openStatusModal(item)"
              >
                <span class="adm-switch-track" aria-hidden="true">
                  <span class="adm-switch-thumb" />
                </span>
                <span class="adm-switch-label">{{ togglingId === item.phenomenon_id ? '…' : (item.is_active !== false ? 'Aktif' : 'Nonaktif') }}</span>
              </button>
            </td>
            <td style="text-align: right;">
              <div class="row-actions">
                <button type="button" class="btn-action edit" title="Ubah Fenomena" @click="openEditModal(item)">
                  <UiIcon name="edit" :size="14" />
                </button>
              </div>
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
            <p class="modal-sub">Target Planet: {{ formData.planet_id.toUpperCase() }}</p>
          </div>
          <button type="button" class="btn-close-modal" :disabled="saving" @click="closeModal"><UiIcon name="tutup" :size="18" /></button>
        </div>

        <form class="modal-body scroll" @submit.prevent="handleSave">
          <div v-if="formError" class="dash-alert error" role="alert">
            <UiIcon name="silang" :size="16" />
            <span>{{ formError }}</span>
          </div>
          <div class="grid-2">
            <label class="field">
              <span>Target Planet</span>
              <select v-model="formData.planet_id" class="adm-select" disabled required>
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

          <label class="field">
            <span>Sumber Referensi Ilmiah</span>
            <input v-model="formData.sumber_referensi" type="text" placeholder="misal: NASA / NASA JPL" />
          </label>

          <!-- KHUSUS PLANET BUMI: PENJELASAN LABORATORIUM GERHANA & TEBAK DULU -->
          <div v-if="formData.planet_id === 'earth'" class="earth-eclipse-box">
            <span class="fs-title"><UiIcon name="matahari" :size="14" /> Penjelasan Laboratorium Gerhana (Bumi)</span>
            <p class="fs-sub">Teks ini langsung tercermin di kartu penjelasan interaktif saat siswa mengamati Gerhana Matahari atau Gerhana Bulan.</p>
            <label class="field">
              <span>Judul Kartu Gerhana Matahari</span>
              <input v-model="formData.judul_matahari" type="text" placeholder="Kenapa bisa pas menutup?" />
            </label>
            <label class="field">
              <span>Penjelasan Gerhana Matahari</span>
              <textarea v-model="formData.penjelasan_matahari" rows="2" placeholder="Matahari sekitar 400 kali lebih lebar dari Bulan..." />
            </label>
            <label class="field">
              <span>Judul Kartu Gerhana Bulan</span>
              <input v-model="formData.judul_bulan" type="text" placeholder="Kenapa Bulan jadi merah?" />
            </label>
            <label class="field">
              <span>Penjelasan Gerhana Bulan</span>
              <textarea v-model="formData.penjelasan_bulan" rows="2" placeholder="Cahaya Matahari menembus atmosfer Bumi..." />
            </label>

            <div class="guess-box">
              <span class="fs-title">Tebak Dulu: Gerhana Matahari</span>
              <label class="field">
                <span>Pertanyaan</span>
                <input v-model="formData.tebak_solar.q" type="text" placeholder="Pertanyaan tebak dulu gerhana matahari..." />
              </label>
              <div class="grid-3">
                <label v-for="i in 3" :key="'s' + i" class="field">
                  <span>Opsi {{ ['A', 'B', 'C'][i - 1] }}</span>
                  <input v-model="formData.tebak_solar.opts[i - 1]" type="text" />
                </label>
              </div>
              <div class="grid-2">
                <label class="field">
                  <span>Jawaban Benar</span>
                  <select v-model.number="formData.tebak_solar.a">
                    <option :value="0">Opsi A</option>
                    <option :value="1">Opsi B</option>
                    <option :value="2">Opsi C</option>
                  </select>
                </label>
                <label class="field">
                  <span>Hadiah Bintang</span>
                  <input v-model.number="formData.tebak_solar.points" type="number" min="1" max="100" />
                </label>
              </div>
              <label class="field">
                <span>Penjelasan Jawaban</span>
                <textarea v-model="formData.tebak_solar.why" rows="2" />
              </label>
            </div>

            <div class="guess-box">
              <span class="fs-title">Tebak Dulu: Gerhana Bulan</span>
              <label class="field">
                <span>Pertanyaan</span>
                <input v-model="formData.tebak_lunar.q" type="text" placeholder="Pertanyaan tebak dulu gerhana bulan..." />
              </label>
              <div class="grid-3">
                <label v-for="i in 3" :key="'l' + i" class="field">
                  <span>Opsi {{ ['A', 'B', 'C'][i - 1] }}</span>
                  <input v-model="formData.tebak_lunar.opts[i - 1]" type="text" />
                </label>
              </div>
              <div class="grid-2">
                <label class="field">
                  <span>Jawaban Benar</span>
                  <select v-model.number="formData.tebak_lunar.a">
                    <option :value="0">Opsi A</option>
                    <option :value="1">Opsi B</option>
                    <option :value="2">Opsi C</option>
                  </select>
                </label>
                <label class="field">
                  <span>Hadiah Bintang</span>
                  <input v-model.number="formData.tebak_lunar.points" type="number" min="1" max="100" />
                </label>
              </div>
              <label class="field">
                <span>Penjelasan Jawaban</span>
                <textarea v-model="formData.tebak_lunar.why" rows="2" />
              </label>
            </div>
          </div>

          <!-- PLANET LAIN: PARAMETER VISUAL SIMULASI 3D & TEBAK DULU -->
          <div v-else class="earth-eclipse-box">
            <span class="fs-title"><UiIcon name="fenomena" :size="14" /> Konfigurasi Visual Simulasi 3D</span>
            <div class="grid-3">
              <label class="field">
                <span>Pengali Waktu (mul)</span>
                <input v-model.number="formData.visual_mul" type="number" min="1" />
              </label>
              <label class="field">
                <span>Sudut Kamera (view)</span>
                <select v-model="formData.visual_view">
                  <option v-for="v in VISUAL_VIEW_OPTIONS" :key="v.id" :value="v.id">{{ v.label }}</option>
                </select>
              </label>
              <label class="field">
                <span>Fokus Indikator (show)</span>
                <select v-model="formData.visual_show">
                  <option v-for="s in VISUAL_SHOW_OPTIONS" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>
              </label>
            </div>

            <div class="guess-box">
              <span class="fs-title">Pertanyaan Tebak Dulu (Opsional)</span>
              <label class="field">
                <span>Pertanyaan</span>
                <input v-model="formData.tebak_single.q" type="text" placeholder="Kosongkan jika tanpa tebak dulu..." />
              </label>
              <div class="grid-3">
                <label v-for="i in 3" :key="'p' + i" class="field">
                  <span>Opsi {{ ['A', 'B', 'C'][i - 1] }}</span>
                  <input v-model="formData.tebak_single.opts[i - 1]" type="text" />
                </label>
              </div>
              <div class="grid-2">
                <label class="field">
                  <span>Jawaban Benar</span>
                  <select v-model.number="formData.tebak_single.a">
                    <option :value="0">Opsi A</option>
                    <option :value="1">Opsi B</option>
                    <option :value="2">Opsi C</option>
                  </select>
                </label>
                <label class="field">
                  <span>Hadiah Bintang</span>
                  <input v-model.number="formData.tebak_single.points" type="number" min="1" max="100" />
                </label>
              </div>
              <label class="field">
                <span>Penjelasan Jawaban</span>
                <textarea v-model="formData.tebak_single.why" rows="2" />
              </label>
            </div>
          </div>

          <!-- STATUS AKTIF -->
          <label class="checkbox-row">
            <input v-model="formData.is_active" type="checkbox" />
            <span>Aktifkan fenomena ini (dapat diobservasi oleh siswa di tampilan publik)</span>
          </label>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" :disabled="saving" @click="closeModal">Batal</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'Menyimpan…' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL KONFIRMASI STATUS -->
    <div v-if="confirmStatusTarget" class="modal-backdrop" @click.self="!togglingId && (confirmStatusTarget = null)">
      <div class="modal-card adm-confirm-card small">
        <h3 class="modal-title">
          {{ confirmStatusTarget.nextState ? 'Aktifkan Fenomena?' : 'Nonaktifkan Fenomena?' }}
        </h3>
        <p class="modal-desc">
          <template v-if="confirmStatusTarget.nextState">
            Ingin mengaktifkan kembali fenomena <b>{{ confirmStatusTarget.item.judul }}</b> ({{ confirmStatusTarget.item.planet_id }}) agar dapat diobservasi di tampilan publik?
          </template>
          <template v-else>
            Ingin menonaktifkan fenomena <b>{{ confirmStatusTarget.item.judul }}</b> ({{ confirmStatusTarget.item.planet_id }})? Simulasi fenomena ini tidak akan tampil sampai diaktifkan kembali.
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
  </div>
</template>

<style scoped>
.admin-phenomena-page { display: flex; flex-direction: column; gap: 20px; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title { margin: 0; font-size: 22px; font-weight: 600; color: #0f172a; }
.page-desc { margin: 4px 0 0 0; font-size: 13.5px; color: #64748b; }

.head-actions { display: flex; align-items: center; gap: 10px; }
.dash-alert { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; font-size: 13.5px; font-weight: 500; border: 1px solid transparent; }
.dash-alert.success { background: #f0fdf4; border-color: #bbf7d0; color: #16a34a; }
.dash-alert.error { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
.btn-refresh { display: inline-flex; align-items: center; gap: 8px; background: #fff; color: #334155; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; }

.filter-strip { display: flex; align-items: center; gap: 12px; background: #fff; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; overflow-x: auto; }
.filter-label { font-size: 12.5px; font-weight: 500; color: #475569; white-space: nowrap; }
.planet-tabs { display: flex; gap: 6px; }
.pt-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12.5px; font-weight: 500; color: #475569; cursor: pointer; white-space: nowrap; transition: all .15s; }
.pt-btn:hover { background: #eff6ff; color: #1d4ed8; }
.pt-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 500; }

.table-wrap { padding: 0; overflow-x: auto; background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; }
.adm-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13.5px; }
.adm-table th { background: #f8fafc; padding: 12px 16px; font-weight: 500; color: #475569; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
.adm-table td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: middle; }
.adm-table tbody tr:hover { background: #f8fafc; }

.planet-badge { padding: 3px 8px; border-radius: 4px; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 500; text-transform: capitalize; white-space: nowrap; }
.pheno-title-cell b { display: block; color: #0f172a; font-size: 14px; }
.pheno-title-cell small { color: #64748b; font-size: 12px; margin-top: 2px; display: block; }
.anim-tag { font-size: 11.5px; background: #f1f5f9; padding: 3px 8px; border-radius: 4px; color: #334155; font-family: inherit; font-weight: 500; white-space: nowrap; }
.desc-clamp { margin: 0; font-size: 13px; color: #64748b; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.45; }

.btn-edit { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; font-size: 12.5px; font-weight: 500; cursor: pointer; }

.empty-state { padding: 40px; text-align: center; color: #64748b; }
.empty-state p { margin: 0 0 12px 0; }
.btn-outline { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font-size: 13px; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-card { width: 100%; max-width: 720px; max-height: 90vh; background: #fff; border-radius: 14px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }
.modal-card.small { max-width: 440px; padding: 24px; gap: 12px; }
.modal-desc { margin: 0; font-size: 13.5px; color: #475569; line-height: 1.5; }
.modal-header { padding: 18px 22px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; }
.modal-title { margin: 0; font-size: 17px; font-weight: 600; color: #0f172a; }
.modal-sub { margin: 2px 0 0 0; font-size: 12px; color: #64748b; }
.btn-close-modal { border: none; background: none; color: #94a3b8; cursor: pointer; }
.modal-body { padding: 20px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.field { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: #334155; font-weight: 500; }
.field input, .field textarea, .field select { padding: 8px 12px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 13.5px; font-family: inherit; background-color: #ffffff; color: #0f172a; }
.field input, .field select { min-height: 38px; height: 38px; padding: 0 12px; }

.earth-eclipse-box { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-radius: 8px; background: #f0f7ff; border: 1px solid #c7dfff; }
.guess-box { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 8px; background: #ffffff; border: 1px solid #cbd5e1; margin-top: 4px; }
.fs-title { font-size: 12.5px; font-weight: 600; color: #1d4ed8; display: inline-flex; align-items: center; gap: 6px; }
.fs-sub { margin: 0; font-size: 12px; color: #64748b; line-height: 1.4; }
.checkbox-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; cursor: pointer; }

.row-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.btn-action { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; display: grid; place-items: center; cursor: pointer; color: #64748b; }
.btn-action.edit:hover { background: #eff6ff; color: #2563eb; }
.btn-action.del:hover { background: #fef2f2; color: #dc2626; }

.modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; }
.btn-cancel { padding: 8px 16px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; font-size: 13px; cursor: pointer; }
.btn-save { padding: 8px 18px; border-radius: 6px; border: none; background: #2563eb; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-danger { padding: 8px 18px; border-radius: 6px; border: none; background: #dc2626; color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
</style>

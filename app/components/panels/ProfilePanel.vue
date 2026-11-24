<script setup>
// Profil penjelajah: Identitas & ASTRO-ID · Riwayat kuis · Armada Pesawat · Konfigurasi Kontrol · Akun & Sinkronisasi Awan · Bantuan & FAQ.
import { computed, ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import {
  store,
  game,
  saveProgress,
  saveSettings,
  showToast,
  registerUser,
  loginUser,
  logoutUser,
  pullCloudProgress,
  resetAllGameData,
  deleteUserAccount,
} from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PLANETS, NAME_OF } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
import { POINTS_PER_QUESTION } from '~/data/quiz.js';
import { ACTIONS, resolveKeymap, keyLabels, keyLabel, canBind } from '~/data/keymap.js';
import { MODEL_CREDITS, LICENSE_URL } from '~/data/credits.js';
import { fmtDate } from '~/game/util.js';

const { planets, ships, getQuiz, loadAll } = useSupabaseContent();

onMounted(async () => {
  // 1. Muat katalog publik Supabase live (planet, kuis, armada pesawat)
  await loadAll();

  // 2. Jika akun login, sinkronkan data progres live dari Supabase
  if (store.account.loggedIn && store.account.userId) {
    await pullCloudProgress();
  }
});

const P = store.progress;
const TABS = [
  ['kuis', 'Riwayat Kuis'],
  ['armada', 'Pesawat'],
  ['kontrol', 'Kontrol'],
  ['akun', 'Akun & Awan'],
  ['faq', 'Bantuan'],
];

const tab = computed({
  get: () => (TABS.some(([id]) => id === store.profileTab) ? store.profileTab : 'kuis'),
  set: (v) => { store.profileTab = v; },
});

const isGuest = computed(() => !store.account.loggedIn);
const displayName = computed(() => isGuest.value ? 'Tamu' : (store.account.name || store.account.username || 'Penjelajah'));

const formattedAstroId = computed(() => {
  const id = String(store.account.astroId || '').trim();
  if (!id) return 'ASTRO-ID: 10842918 (2026)';
  return id.startsWith('ASTRO-ID:') ? id : `ASTRO-ID: ${id}`;
});

/** Jumlah soal kuis per planet (dinamis dari Supabase / default 4) */
const getPlanetQuestionCount = (planetId) => {
  const q = getQuiz(planetId);
  return q?.questions?.length || 4;
};

/** Skor maksimal kuis dinamis berdasarkan jumlah soal di Supabase (jumlah soal × 50 bintang) */
const getPlanetQuizMax = (planetId) => {
  return getPlanetQuestionCount(planetId) * POINTS_PER_QUESTION;
};

/** Jumlah bintang diperoleh mengikuti skor terbaik (50 poin per bintang) */
const getPlanetEarnedStars = (planetId) => {
  const score = P.best[planetId] ?? 0;
  const maxStars = getPlanetQuestionCount(planetId);
  return Math.min(maxStars, Math.max(0, Math.floor(score / POINTS_PER_QUESTION)));
};

const visited = computed(() => store.discovered.filter((d) => planets.value.some((p) => p.id === d)).length);
const perfect = computed(() => planets.value.filter((p) => (P.best[p.id] ?? 0) >= getPlanetQuizMax(p.id)).length);
const stars = (s) => Math.floor((s ?? 0) / POINTS_PER_QUESTION);
const ledger = computed(() => [...P.ledger].reverse().slice(0, 8));

const ledgerLabel = (l) => l.type === 'kuis' ? `Kuis ${planets.value.find((p) => p.id === l.planet)?.name || ''}`
  : l.type === 'pesawat' ? `Membuka ${ships.value.find((s) => s.id === l.ship)?.name || 'pesawat'}`
  : l.type === 'tebak' ? `Tebakan benar: ${l.key?.startsWith('gerhana') ? (l.key === 'gerhana-bulan' ? 'gerhana Bulan' : 'gerhana Matahari') : planets.value.find((p) => p.id === l.key)?.name || ''}`
  : l.type === 'mitos' ? `Mitos atau Fakta · ${l.correct}/${l.total} benar`
  : l.type === 'kartu' ? `Kartu baru: ${NAME_OF[l.key] || ''}`
  : l.type === 'peristiwa' ? (l.key === 'badai' ? 'Selamat dari badai Matahari' : 'Lolos dari sampah antariksa')
  : l.type === 'misi' ? (l.key === 'mco' ? 'Misi Mars Climate Orbiter selesai' : 'Misi Apollo 13 selesai') : 'Bintang';

function quiz(id) {
  store.quiz.planet = id;
  store.quiz.stage = 'intro';
  game()?.setMode('kuis');
}
function openHangar(id) {
  game()?.setMode('hanggar');
  game()?.previewShip(id);
}
function useShip(id) {
  if (!P.owned.includes(id)) return;
  P.selectedShip = id;
  saveProgress();
  game()?.setShip(id);
  game()?.chime();
}

// ---- Rebind Tombol Kontrol ----
const km = computed(() => resolveKeymap(store.settings.keys));
const cap = ref(null);
function onCapture(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.code === 'Escape') return endCapture();
  if (!canBind(e.code)) {
    showToast('Tombol itu tidak bisa dipakai.');
    return;
  }
  const id = cap.value;
  store.settings.keys = { ...store.settings.keys, [id]: e.code };
  saveSettings();
  game()?.applySettings();
  const clash = ACTIONS.filter((a) => a.id !== id && resolveKeymap(store.settings.keys)[a.id].includes(e.code)).map((a) => a.label);
  if (clash.length) {
    showToast(`<b>${keyLabel(e.code)}</b> juga dipakai untuk ${clash.join(', ')}.`, 4200);
  }
  endCapture();
}
function startCapture(id) {
  endCapture();
  cap.value = id;
  store.capturing = true;
  window.addEventListener('keydown', onCapture, true);
}
function endCapture() {
  cap.value = null;
  store.capturing = false;
  window.removeEventListener('keydown', onCapture, true);
}
function resetKeys() {
  store.settings.keys = {};
  saveSettings();
  game()?.applySettings();
  showToast('Tombol kembali ke bawaan.');
}
onBeforeUnmount(endCapture);
function setting(k, v) {
  store.settings[k] = v;
  game()?.applySettings();
}

// ---- Autentikasi Akun & Awan ----
const authMode = ref('login'); // 'login' | 'register'
const authForm = reactive({ username: '', password: '', busy: false, err: '', success: '' });

async function handleAuthSubmit() {
  if (authForm.busy) return;
  authForm.err = '';
  authForm.success = '';
  if (!authForm.username.trim()) {
    authForm.err = 'Isi nama penjelajah.';
    return;
  }
  if (!authForm.password) {
    authForm.err = 'Isi kata sandi.';
    return;
  }

  authForm.busy = true;
  const isReg = authMode.value === 'register';
  const res = isReg
    ? await registerUser(authForm.username, authForm.password)
    : await loginUser(authForm.username, authForm.password);
  authForm.busy = false;

  if (!res.ok) {
    authForm.err = res.err || 'Gagal memproses akun.';
    return;
  }

  authForm.password = '';
  const act = isReg ? 'Akun baru berhasil dibuat' : 'Berhasil masuk akun';
  authForm.success = `${act}! Progres lokal Anda telah digabungkan ke awan Supabase.`;
  const safeName = (store.account.name || '').replace(/[<>&"]/g, '');
  showToast(`Selamat datang, <b>${safeName}</b>!`, 3200);
}

async function handleLogout() {
  await logoutUser();
  showToast('Anda telah keluar dari akun awan. Beralih ke Mode Tamu lokal.', 2800);
}

async function triggerManualSync() {
  saveProgress();
  if (store.account.loggedIn && store.account.userId) {
    await pullCloudProgress();
  }
  showToast('Progres berhasil disinkronkan ke awan Supabase!', 2200);
}

// ---- Dialog Konfirmasi Reset & Hapus Akun ----
const confirmDialog = reactive({
  show: false,
  type: '', // 'reset_data' | 'delete_account'
  title: '',
  message: '',
  confirmLabel: '',
  busy: false,
});

function promptResetData() {
  confirmDialog.type = 'reset_data';
  confirmDialog.title = 'Mulai Ulang Permainan?';
  confirmDialog.message = 'Seluruh progres bintang, armada pesawat, skor kuis, jurnal, dan posisi kapal akan dihapus total sehingga permainan dimulai ulang dari awal. Lanjutkan?';
  confirmDialog.confirmLabel = 'Hapus Semua & Reset';
  confirmDialog.busy = false;
  confirmDialog.show = true;
}

function promptDeleteAccount() {
  confirmDialog.type = 'delete_account';
  confirmDialog.title = 'Hapus Akun Permanen?';
  confirmDialog.message = 'Akun serta seluruh progres permainanmu di awan akan dihapus secara permanen dan tidak dapat dipulihkan. Yakin ingin menghapus akun?';
  confirmDialog.confirmLabel = 'Hapus Akun Permanen';
  confirmDialog.busy = false;
  confirmDialog.show = true;
}

function closeConfirmDialog() {
  if (confirmDialog.busy) return;
  confirmDialog.show = false;
}

async function executeConfirmDialog() {
  if (confirmDialog.busy) return;
  confirmDialog.busy = true;
  try {
    if (confirmDialog.type === 'reset_data') {
      await resetAllGameData();
    } else if (confirmDialog.type === 'delete_account') {
      await deleteUserAccount();
    }
    confirmDialog.show = false;
  } catch (err) {
    console.error(err);
    showToast('Terjadi kesalahan saat memproses permintaan.', 3000);
  } finally {
    confirmDialog.busy = false;
  }
}

const openFaq = ref({ 0: true });
const FAQ = [
  ['Apa itu AstroSphere?', 'Game belajar tata surya interaktif 3D di browser. Terbangkan pesawat antariksa, singgahi delapan planet, amati fenomenanya, telusuri sejarah eksplorasi, lalu uji wawasanmu lewat kuis.'],
  ['Bagaimana cara ke planet tertentu?', 'Buka Peta (tombol M atau lewat navigasi), pilih planet tujuan, lalu tekan "Terbang ke sini". Pesawat akan bermanuver otomatis dan berhenti tepat saat mendekati planet.'],
  ['Bagaimana mendapat bintang?', 'Kerjakan kuis planet: 4 soal, 50 bintang per jawaban benar. Bintang hanya bertambah jika skormu melampaui skor terbaik sebelumnya. Jawaban salah tidak mengurangi saldo bintang.'],
  ['Untuk apa bintang digunakan?', 'Membuka armada pesawat baru di Hanggar: Orion Glider (300 bintang) dan Nova Voyager (700 bintang).'],
  ['Apakah progres tersimpan di awan?', 'Ya! Saat Anda mendaftar atau masuk akun, seluruh saldo bintang, armada pesawat, dan jurnal tersimpan permanen di Supabase. Dalam Mode Tamu, seluruh data tetap aman tersimpan di peramban lokal perangkat ini.'],
  ['Apakah ukuran dan jaraknya berskala nyata?', 'Rasio ukuran planet dibandingkan satu sama lain akurat sesuai data NASA JPL. Jarak orbit antarplanet dipadatkan secara ergonomis agar seluruh tata surya dapat dijelajahi dengan nyaman.'],
];
</script>

<template>
  <div>
    <div class="dim solid" />
    <section class="prof scroll">
      <div class="wrap">
        <!-- 1. HEADER PROFIL (CLEAN MODERN) -->
        <header class="prof-header">
          <div class="header-left">
            <span class="system-badge">ASTROSPHERE // PROFIL PENJELAJAH</span>
            <div class="status-indicator">
              <span class="status-dot" :class="{ cloud: store.account.cloudSynced, local: !store.account.cloudSynced }" />
              <span class="status-text">
                {{ store.account.cloudSynced ? 'TELEMETRI AWAN TERHUBUNG' : 'MODE TAMU · TERSIMPAN LOKAL' }}
              </span>
            </div>
          </div>
          <button type="button" class="btn-back-nav" @click="game()?.back()">
            <UiIcon name="kembali" :size="16" />
            <span>Kembali Terbang</span>
          </button>
        </header>

        <!-- 2. HERO GRID 2-KOLOM (KREDENSIAL + STATISTIK BINTANG) -->
        <div class="hero-grid">
          <!-- KARTU KIRI: KREDENSIAL PENJELAJAH -->
          <div class="hero-card cred-card">
            <div class="card-topline">
              <span class="micro-header">KONSOL KREDENSIAL PENJELAJAH</span>
              <span class="mode-badge" :class="{ guest: isGuest, verified: !isGuest }">
                {{ isGuest ? 'MODE TAMU' : 'AKUN TERVERIFIKASI' }}
              </span>
            </div>

            <div class="profile-identity">
              <div class="avatar-box" :class="{ guest: isGuest }">
                <!-- Avatar Tamu: Person SVG modern -->
                <svg
                  v-if="isGuest"
                  class="user-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <!-- Avatar Akun: Inisial nama -->
                <span v-else class="avatar-initial">{{ displayName.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="identity-info">
                <div class="name-row">
                  <h1 class="pilot-name">{{ displayName }}</h1>
                  <span v-if="store.account.username" class="pilot-uname">@{{ store.account.username }}</span>
                </div>
                <span class="pilot-role">Penjelajah Ruang Angkasa</span>
              </div>
            </div>

            <div class="card-divider" />

            <div class="card-bottomline">
              <span class="id-label">NOMOR IDENTIFIKASI SISTEM</span>
              <span class="astro-id-tag">{{ formattedAstroId }}</span>
            </div>
          </div>

          <!-- KARTU KANAN: STATISTIK BINTANG -->
          <div class="hero-card stats-card">
            <div class="stats-top">
              <div class="star-counter">
                <span class="star-icon">★</span>
                <span class="star-number">{{ P.points }}</span>
              </div>
              <span class="stats-title">Total Bintang Terkumpul</span>
            </div>

            <div class="stats-summary">
              <span class="summary-metric">{{ visited }}/8 Planet Terjelajahi</span>
              <span class="summary-dot">·</span>
              <span class="summary-metric">{{ perfect }}/8 Kuis Sempurna</span>
            </div>

            <p class="stats-footnote">
              Bintang digunakan untuk membuka dan mengemudikan armada pesawat baru di Hanggar.
            </p>
          </div>
        </div>

        <!-- 3. SEGMENTED TAB BAR -->
        <nav class="segmented-bar" role="tablist">
          <button
            v-for="[id, lb] in TABS"
            :key="id"
            type="button"
            role="tab"
            :aria-selected="tab === id"
            class="seg-item"
            :class="{ active: tab === id }"
            @click="tab = id"
          >
            {{ lb }}
          </button>
        </nav>

        <!-- 4. KONTEN TAB -->
        <!-- TAB 1: RIWAYAT KUIS -->
        <section v-if="tab === 'kuis'" class="tab-pane">
          <div class="quiz-grid">
            <article
              v-for="p in planets"
              :key="p.id"
              class="quiz-card"
            >
              <div
                class="planet-badge"
                :style="{
                  backgroundColor: p.color,
                  boxShadow: `0 0 12px ${p.color}55`,
                }"
              />
              <div class="planet-info">
                <h2 class="planet-name">{{ p.name }}</h2>
                <span class="attempt-label">
                  {{ P.attempts[p.id] ? `${P.attempts[p.id]}× dicoba` : 'Belum dicoba' }}
                </span>
              </div>
              <div class="stars-display" :aria-label="`${getPlanetEarnedStars(p.id)} dari ${getPlanetQuestionCount(p.id)} bintang`">
                <UiIcon
                  v-for="n in getPlanetQuestionCount(p.id)"
                  :key="n"
                  :name="n <= getPlanetEarnedStars(p.id) ? 'bintang' : 'bintang-o'"
                  :size="18"
                  :class="{ active: n <= getPlanetEarnedStars(p.id) }"
                />
              </div>
              <button
                type="button"
                class="btn-quiz-action"
                :class="P.best[p.id] == null ? 'btn-play' : 'btn-retry'"
                @click="quiz(p.id)"
              >
                {{ P.best[p.id] == null ? 'Main' : 'Ulangi' }}
              </button>
            </article>
          </div>

          <!-- CATATAN REKOR BINTANG -->
          <div v-if="ledger.length" class="ledger-box">
            <div class="ledger-header">
              <span class="ledger-title">Catatan Perolehan Bintang</span>
              <span class="ledger-count">{{ P.ledger.length }} riwayat transaksi</span>
            </div>
            <div class="ledger-list">
              <div v-for="l in ledger" :key="l.id" class="ledger-row">
                <div class="ledger-desc">
                  <span class="ledger-name">{{ ledgerLabel(l) }}</span>
                  <span class="ledger-date">{{ fmtDate(l.at) }}</span>
                </div>
                <span class="ledger-val" :class="{ positive: l.delta > 0 }">
                  {{ l.delta > 0 ? '+' : '' }}{{ l.delta }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 2: ARMADA PESAWAT -->
        <section v-else-if="tab === 'armada'" class="tab-pane">
          <div class="fleet-grid">
            <div
              v-for="s in ships"
              :key="s.id"
              class="ship-card"
              :class="{
                selected: s.id === P.selectedShip,
                locked: !P.owned.includes(s.id),
              }"
            >
              <div class="ship-header">
                <div class="ship-icon-box">
                  <UiIcon :name="P.owned.includes(s.id) ? 'hanggar' : 'kunci'" :size="22" />
                </div>
                <div class="ship-titles">
                  <h3 class="ship-name">{{ s.name }}</h3>
                  <span class="ship-class">{{ s.cls }}</span>
                </div>
              </div>

              <div class="ship-stats">
                <div v-for="(v, k) in s.stats" :key="k" class="stat-bar-row">
                  <span class="stat-name">{{ k }}</span>
                  <div class="stat-track">
                    <span class="stat-fill" :style="{ width: v * 100 + '%' }" />
                  </div>
                </div>
              </div>

              <div class="ship-action">
                <button
                  v-if="s.id === P.selectedShip"
                  type="button"
                  class="btn-ship-action in-use"
                  disabled
                >
                  <UiIcon name="cek" :size="16" />
                  <span>Sedang Dipakai</span>
                </button>
                <button
                  v-else-if="P.owned.includes(s.id)"
                  type="button"
                  class="btn-ship-action equip"
                  @click="useShip(s.id)"
                >
                  Pilih Pesawat
                </button>
                <button
                  v-else
                  type="button"
                  class="btn-ship-action unlock"
                  @click="openHangar(s.id)"
                >
                  <span>{{ s.price }} Bintang · Buka di Hanggar</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 3: KONTROL -->
        <section v-else-if="tab === 'kontrol'" class="tab-pane">
          <div class="control-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Konfigurasi Keyboard</h3>
                <p class="section-sub">Tekan "Ubah", lalu tekan tombol baru pada keyboard. Tekan Esc untuk batal.</p>
              </div>
              <button type="button" class="btn-subtle" @click="resetKeys">
                <UiIcon name="ulang" :size="14" />
                <span>Bawaan</span>
              </button>
            </div>

            <div class="keys-table">
              <div
                v-for="a in ACTIONS.filter(x => !['turnL', 'turnR'].includes(x.id))"
                :key="a.id"
                class="key-row"
                :class="{ capturing: cap === a.id }"
              >
                <div class="key-desc">
                  <span class="action-label">{{ a.label }}</span>
                  <span class="action-sub">{{ a.sub }}</span>
                </div>
                <div class="key-capsules">
                  <span v-if="cap === a.id" class="key-badge waiting">Tekan tombol…</span>
                  <template v-else>
                    <span v-for="l in keyLabels(km[a.id])" :key="l" class="key-badge">{{ l }}</span>
                  </template>
                </div>
                <button
                  type="button"
                  class="btn-rebind"
                  @click="cap === a.id ? endCapture() : startCapture(a.id)"
                >
                  {{ cap === a.id ? 'Batal' : 'Ubah' }}
                </button>
              </div>

              <!-- PANDUAN TOMBOL TETAP -->
              <div class="key-row fixed">
                <div class="key-desc">
                  <span class="action-label">Ganti Sudut Pandang Kamera</span>
                  <span class="action-sub">Beralih antara Kamera Belakang dan Kokpit Pengemudi</span>
                </div>
                <div class="key-capsules"><span class="key-badge">V</span></div>
                <span />
              </div>
              <div class="key-row fixed">
                <div class="key-desc">
                  <span class="action-label">Ganti Target Tujuan</span>
                  <span class="action-sub">Arahkan kompas target ke planet atau destinasi berikutnya</span>
                </div>
                <div class="key-capsules"><span class="key-badge">T</span></div>
                <span />
              </div>
              <div class="key-row fixed">
                <div class="key-desc">
                  <span class="action-label">Menu Jeda / Kembali</span>
                  <span class="action-sub">Buka menu opsi permainan atau kembali ke mode sebelumnya</span>
                </div>
                <div class="key-capsules"><span class="key-badge">Esc</span></div>
                <span />
              </div>
              <div class="key-row fixed">
                <div class="key-desc">
                  <span class="action-label">Aktifkan Kamera Bebas (POV)</span>
                  <span class="action-sub">Atur sudut pandang 360° dengan gerak mouse atau trackpad</span>
                </div>
                <div class="key-capsules"><span class="key-badge mouse">Klik Kiri 1×</span></div>
                <span />
              </div>
              <div class="key-row fixed">
                <div class="key-desc">
                  <span class="action-label">Matikan Kamera Bebas</span>
                  <span class="action-sub">Luruskan kamera kembali ke haluan depan pesawat</span>
                </div>
                <div class="key-capsules"><span class="key-badge mouse">Klik Kanan 1× / Klik Kiri 2×</span></div>
                <span />
              </div>
            </div>
          </div>

          <!-- KONTROL LAYAR SENTUH & SENSITIVITAS -->
          <div class="control-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Navigasi Layar Sentuh</h3>
              </div>
            </div>
            <div class="touch-cards-grid">
              <div class="touch-tile">
                <UiIcon name="target" :size="20" />
                <span class="touch-title">Kemudi Analog</span>
                <p class="touch-desc">Sentuh stik analog di kiri bawah untuk mengarahkan moncong pesawat.</p>
              </div>
              <div class="touch-tile">
                <UiIcon name="gas" :size="20" />
                <span class="touch-title">Tuas Dorong &amp; Rem</span>
                <p class="touch-desc">Tarik tuas dorong di kanan bawah untuk akselerasi, turbo, dan deselerasi.</p>
              </div>
              <div class="touch-tile">
                <UiIcon name="mata" :size="20" />
                <span class="touch-title">Lihat Sekeliling</span>
                <p class="touch-desc">Geser area tengah layar dengan tetikus atau sentuhan untuk menatap angkasa.</p>
              </div>
            </div>
          </div>

          <div class="control-panel slider-panel">
            <div class="slider-row">
              <div class="slider-label-col">
                <span class="action-label">Kepekaan Lihat Sekeliling</span>
                <span class="action-sub">Mengatur kecepatan rotasi kamera mouse dan sentuhan</span>
              </div>
              <div class="slider-ctrl">
                <input
                  type="range"
                  min="0.3"
                  max="2.5"
                  step="0.1"
                  :value="store.settings.sensitivity"
                  @input="setting('sensitivity', +$event.target.value)"
                />
                <span class="slider-val">{{ store.settings.sensitivity.toFixed(1) }}×</span>
              </div>
            </div>
            <div class="card-divider" />
            <UiToggle
              :model-value="store.settings.invertY"
              label="Balik Arah Naik / Turun"
              sub="Saat diaktifkan, dorong ke atas = hidung pesawat menukik ke bawah"
              @update:model-value="setting('invertY', $event)"
            />
          </div>
        </section>

        <!-- TAB 4: AKUN & AWAN -->
        <section v-else-if="tab === 'akun'" class="tab-pane">
          <div class="account-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Telemetri Awan &amp; Akun Pemain</h3>
                <p class="section-sub">Simpan progres penjelajahan, ekonomi bintang, dan armada pesawat secara permanen di basis data Supabase.</p>
              </div>
            </div>

            <!-- TAMPILAN JIKA SUDAH LOGIN -->
            <div v-if="store.account.loggedIn" class="logged-in-box">
              <div class="cloud-status-banner">
                <UiIcon name="cek" :size="20" class="status-ic-ok" />
                <div class="banner-text">
                  <span class="banner-title">Akun Awan Aktif &amp; Terhubung</span>
                  <p class="banner-desc">Setiap perolehan bintang, kuis, dan armada baru disinkronkan secara otomatis.</p>
                </div>
              </div>

              <div class="account-details-grid">
                <div class="detail-item">
                  <span class="detail-label">NAMA PENJELAJAH</span>
                  <span class="detail-val">{{ store.account.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">NAMA PENGGUNA UNIK</span>
                  <span class="detail-val">@{{ store.account.username || store.account.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">NOMOR IDENTIFIKASI SISTEM</span>
                  <span class="detail-val cyan">{{ formattedAstroId }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">STATUS TELEMETRI</span>
                  <span class="detail-val green">Awan Supabase Aktif</span>
                </div>
              </div>

              <div class="account-actions">
                <button type="button" class="btn-account primary" @click="triggerManualSync">
                  <UiIcon name="ulang" :size="16" />
                  <span>Sinkronkan Sekarang</span>
                </button>
                <button type="button" class="btn-account danger-outline" @click="handleLogout">
                  <UiIcon name="keluar" :size="16" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>

            <!-- TAMPILAN JIKA MODE TAMU -->
            <div v-else class="guest-auth-box">
              <div class="guest-notice-banner">
                <UiIcon name="info" :size="20" />
                <div class="banner-text">
                  <span class="banner-title">Anda Sedang Menggunakan Mode Tamu</span>
                  <p class="banner-desc">
                    Progres tersimpan di memori peramban lokal perangkat ini dengan nomor identifikasi unik <b>{{ formattedAstroId }}</b>.
                    Masuk atau buat akun agar capaianmu tidak hilang saat cache terhapus dan dapat dilanjutkan di perangkat lain.
                  </p>
                </div>
              </div>

              <div class="auth-card">
                <div class="auth-seg-toggle">
                  <button
                    type="button"
                    :class="{ active: authMode === 'login' }"
                    @click="authMode = 'login'; authForm.err = ''; authForm.success = ''"
                  >
                    Masuk Akun
                  </button>
                  <button
                    type="button"
                    :class="{ active: authMode === 'register' }"
                    @click="authMode = 'register'; authForm.err = ''; authForm.success = ''"
                  >
                    Daftar Akun Baru
                  </button>
                </div>

                <form class="auth-form" @submit.prevent="handleAuthSubmit">
                  <div class="form-field">
                    <label class="field-label" for="prof-auth-uname">Nama Penjelajah</label>
                    <input
                      id="prof-auth-uname"
                      v-model="authForm.username"
                      type="text"
                      placeholder="Contoh: penjelajah_01"
                      maxlength="20"
                      autocomplete="username"
                      class="field-input"
                    />
                    <span class="field-hint">3–20 karakter alfanumerik (huruf kecil, angka, atau garis bawah _).</span>
                  </div>

                  <div class="form-field">
                    <label class="field-label" for="prof-auth-pass">Kata Sandi</label>
                    <input
                      id="prof-auth-pass"
                      v-model="authForm.password"
                      type="password"
                      placeholder="Minimal 6 karakter"
                      autocomplete="current-password"
                      class="field-input"
                    />
                  </div>

                  <p v-if="authForm.err" class="form-msg err">
                    <UiIcon name="silang" :size="14" /> {{ authForm.err }}
                  </p>
                  <p v-if="authForm.success" class="form-msg ok">
                    <UiIcon name="cek" :size="14" /> {{ authForm.success }}
                  </p>

                  <button type="submit" class="btn-auth-submit" :disabled="authForm.busy">
                    {{ authForm.busy ? 'Menghubungkan…' : (authMode === 'login' ? 'Masuk & Sinkronkan Progres' : 'Daftar Akun & Simpan ke Awan') }}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <!-- ZONA BERBAHAYA / RESET DATA -->
          <div class="danger-zone-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title text-danger">Zona Berbahaya / Kelola Data</h3>
                <p class="section-sub">Tindakan berikut bersifat permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div class="danger-actions-grid">
              <div class="danger-action-box">
                <div class="danger-info">
                  <span class="danger-action-title">Hapus Semua Data &amp; Mulai Ulang</span>
                  <p class="danger-action-desc">Mereset total seluruh bintang, armada, skor kuis, jurnal, posisi kapal, dan panduan dari awal.</p>
                </div>
                <button type="button" class="btn-danger-outline" @click="promptResetData">
                  Reset Data Permainan
                </button>
              </div>

              <div v-if="store.account.loggedIn" class="danger-action-box">
                <div class="danger-info">
                  <span class="danger-action-title text-danger">Hapus Akun Permanen</span>
                  <p class="danger-action-desc">Menghapus akun awan dan seluruh progres permainan di Supabase secara permanen tanpa sisa.</p>
                </div>
                <button type="button" class="btn-danger-solid" @click="promptDeleteAccount">
                  Hapus Akun Permanen
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 5: BANTUAN & FAQ -->
        <section v-else class="tab-pane">
          <div class="faq-accordion">
            <div
              v-for="([q, a], i) in FAQ"
              :key="i"
              class="faq-card"
              :class="{ open: openFaq[i] }"
            >
              <button
                type="button"
                class="faq-trigger"
                :aria-expanded="!!openFaq[i]"
                @click="openFaq[i] = !openFaq[i]"
              >
                <span class="faq-q">{{ q }}</span>
                <UiIcon name="turun" :size="18" class="faq-chev" />
              </button>
              <div v-if="openFaq[i]" class="faq-answer">
                <p>{{ a }}</p>
              </div>
            </div>
          </div>

          <div class="credits-card">
            <h3 class="credits-title">Kredit &amp; Atribusi Model 3D</h3>
            <p class="credits-sub">Seluruh aset model 3D bersumber dari kreator Sketchfab berlisensi Creative Commons (CC-BY), dioptimalkan agar ringan dimuat pada peramban web modern.</p>
            <ul class="credits-list">
              <li v-for="c in MODEL_CREDITS" :key="c.url" class="credit-row">
                <span class="credit-usage">{{ c.use }}</span>
                <a :href="c.url" target="_blank" rel="noopener" class="credit-link">{{ c.title }}</a>
                <span class="credit-author">oleh {{ c.author }}</span>
                <a :href="LICENSE_URL[c.license]" target="_blank" rel="noopener" class="credit-lic">({{ c.license }})</a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </section>

    <!-- POPUP KONFIRMASI RESET / HAPUS AKUN -->
    <Transition name="fade">
      <div v-if="confirmDialog.show" class="prof-confirm-overlay" @click.self="closeConfirmDialog">
        <div class="prof-confirm-dialog">
          <div class="pcd-icon" :class="{ danger: confirmDialog.type === 'delete_account' }">
            <UiIcon :name="confirmDialog.type === 'delete_account' ? 'silang' : 'info'" :size="24" />
          </div>
          <h3 class="pcd-title">{{ confirmDialog.title }}</h3>
          <p class="pcd-msg">{{ confirmDialog.message }}</p>
          <div class="pcd-acts">
            <button type="button" class="btn-dialog-cancel" :disabled="confirmDialog.busy" @click="closeConfirmDialog">
              Batal
            </button>
            <button
              type="button"
              class="btn-dialog-confirm"
              :disabled="confirmDialog.busy"
              @click="executeConfirmDialog"
            >
              {{ confirmDialog.busy ? 'Memproses…' : confirmDialog.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Reset dasar & overlay latar belakang */
.dim.solid {
  background: #060a1a;
}
.prof {
  position: fixed;
  inset: 0;
  z-index: 22;
  padding: calc(var(--top) + var(--safe-t)) 16px calc(32px + var(--safe-b));
  overflow-y: auto;
}
.wrap {
  width: min(1040px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 1. HEADER PROFIL */
.prof-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 4px 6px;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.system-badge {
  font-family: var(--font);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #38bdf8;
  text-transform: uppercase;
}
.status-indicator {
  display: flex;
  align-items: center;
  gap: 7px;
}
.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-dot.local {
  background: #2dd4bf;
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.6);
}
.status-dot.cloud {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
}
.status-text {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
  letter-spacing: 0.04em;
}
.btn-back-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: rgba(148, 174, 255, 0.1);
  border: 1px solid rgba(148, 174, 255, 0.22);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-back-nav:hover {
  background: rgba(148, 174, 255, 0.18);
  border-color: rgba(148, 174, 255, 0.4);
}

/* 2. HERO GRID (2 KOLOM) */
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.hero-card {
  border-radius: 14px;
  background: rgba(11, 16, 36, 0.75);
  border: 1px solid rgba(148, 174, 255, 0.16);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Kartu Kiri: Kredensial */
.cred-card {
  justify-content: space-between;
}
.card-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.micro-header {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
}
.mode-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
}
.mode-badge.guest {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.25);
}
.mode-badge.verified {
  background: rgba(34, 197, 94, 0.14);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.profile-identity {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 14px;
}
.avatar-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.16);
  border: 1px solid rgba(148, 174, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}
.avatar-box.guest {
  background: rgba(148, 174, 255, 0.1);
  color: #38bdf8;
}
.user-icon {
  width: 22px;
  height: 22px;
}
.avatar-initial {
  font-family: var(--display);
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
}
.identity-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.name-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.pilot-name {
  font-family: var(--display);
  font-size: 19px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
}
.pilot-uname {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}
.pilot-role {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.55);
}
.card-divider {
  border-top: 1px solid rgba(148, 174, 255, 0.12);
  margin: 14px 0 10px;
}
.card-bottomline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.id-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
}
.astro-id-tag {
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

/* Kartu Kanan: Statistik Bintang */
.stats-card {
  justify-content: space-between;
}
.stats-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.star-counter {
  display: flex;
  align-items: center;
  gap: 8px;
}
.star-icon {
  font-size: 26px;
  color: #38bdf8;
  line-height: 1;
}
.star-number {
  font-family: var(--display);
  font-size: 36px;
  font-weight: 600;
  color: #38bdf8;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.stats-title {
  font-size: 13.5px;
  font-weight: 500;
  color: #ffffff;
  margin-top: 4px;
}
.stats-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.summary-metric {
  font-size: 12.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.65);
}
.summary-dot {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}
.stats-footnote {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.42);
  line-height: 1.45;
  margin: 12px 0 0;
  border-top: 1px solid rgba(148, 174, 255, 0.09);
  padding-top: 8px;
}

/* 3. SEGMENTED TAB BAR */
.segmented-bar {
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(11, 16, 36, 0.85);
  border: 1px solid rgba(148, 174, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  overflow-x: auto;
}
.seg-item {
  flex: 1;
  min-height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
}
.seg-item:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}
.seg-item.active {
  background: #3b82f6;
  color: #ffffff;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

/* 4. TAB PANES */
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Kuis Grid */
.quiz-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.quiz-card {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: border-color 0.15s ease;
}
.quiz-card:hover {
  border-color: rgba(148, 174, 255, 0.28);
}
.planet-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
}
.planet-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}
.planet-name {
  font-family: var(--display);
  font-size: 15.5px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
  line-height: 1.2;
}
.attempt-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
  margin-top: 2px;
}
.stars-display {
  display: flex;
  gap: 3px;
  color: rgba(148, 174, 255, 0.25);
  flex-shrink: 0;
}
.stars-display .active {
  color: var(--star, #fbbf24);
}
.btn-quiz-action {
  height: 34px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.btn-quiz-action.btn-play {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: #ffffff;
}
.btn-quiz-action.btn-play:hover {
  background: #2563eb;
}
.btn-quiz-action.btn-retry {
  background: transparent;
  border: 1px solid rgba(148, 174, 255, 0.28);
  color: #ffffff;
}
.btn-quiz-action.btn-retry:hover {
  background: rgba(148, 174, 255, 0.12);
  border-color: rgba(148, 174, 255, 0.45);
}

/* Ledger Box */
.ledger-box {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ledger-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(148, 174, 255, 0.1);
  padding-bottom: 8px;
}
.ledger-title {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}
.ledger-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}
.ledger-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ledger-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 4px 0;
}
.ledger-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.ledger-name {
  font-size: 13.5px;
  color: #ffffff;
  font-weight: 500;
}
.ledger-date {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.45);
}
.ledger-val {
  font-family: var(--display);
  font-size: 14.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}
.ledger-val.positive {
  color: var(--star, #fbbf24);
}

/* Armada Pesawat */
.fleet-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.ship-card {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: all 0.15s ease;
}
.ship-card.selected {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.05);
}
.ship-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ship-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #38bdf8;
  flex-shrink: 0;
}
.ship-card.locked .ship-icon-box {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.28);
  color: var(--star, #fbbf24);
}
.ship-titles {
  display: flex;
  flex-direction: column;
}
.ship-name {
  font-family: var(--display);
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.ship-class {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.48);
}
.ship-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-bar-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.stat-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.stat-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: #38bdf8;
}
.btn-ship-action {
  width: 100%;
  height: 38px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
  margin-top: auto;
}
.btn-ship-action.in-use {
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  cursor: default;
}
.btn-ship-action.equip {
  background: #3b82f6;
  border: 1px solid #3b82f6;
  color: #ffffff;
}
.btn-ship-action.equip:hover {
  background: #2563eb;
}
.btn-ship-action.unlock {
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: var(--star, #fbbf24);
}
.btn-ship-action.unlock:hover {
  background: rgba(251, 191, 36, 0.2);
}

/* Panel Kontrol & Rebind */
.control-panel {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.panel-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(148, 174, 255, 0.1);
  padding-bottom: 10px;
}
.header-titles {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.section-title {
  font-family: var(--display);
  font-size: 15.5px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.section-sub {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}
.btn-subtle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  background: rgba(148, 174, 255, 0.08);
  border: 1px solid rgba(148, 174, 255, 0.18);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-subtle:hover {
  background: rgba(148, 174, 255, 0.16);
}
.keys-table {
  display: flex;
  flex-direction: column;
}
.key-row {
  display: grid;
  grid-template-columns: 1fr auto 70px;
  align-items: center;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(148, 174, 255, 0.08);
}
.key-row:last-child {
  border-bottom: none;
}
.key-row.capturing {
  background: rgba(59, 130, 246, 0.12);
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 -12px;
}
.key-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.action-label {
  font-size: 13.5px;
  font-weight: 500;
  color: #ffffff;
}
.action-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.45);
}
.key-capsules {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.key-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  background: rgba(148, 174, 255, 0.12);
  border: 1px solid rgba(148, 174, 255, 0.28);
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  font-family: var(--display);
}
.key-badge.waiting {
  background: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
  animation: pulseWait 1.2s infinite;
}
@keyframes pulseWait {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.key-badge.mouse {
  font-size: 11px;
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.16);
  border-color: rgba(148, 174, 255, 0.25);
  padding: 0 10px;
}
.btn-rebind {
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid rgba(148, 174, 255, 0.25);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-rebind:hover {
  background: rgba(148, 174, 255, 0.12);
  border-color: rgba(148, 174, 255, 0.4);
}
.touch-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.touch-tile {
  border-radius: 10px;
  background: rgba(148, 174, 255, 0.05);
  border: 1px solid rgba(148, 174, 255, 0.1);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #38bdf8;
}
.touch-title {
  font-size: 13.5px;
  font-weight: 500;
  color: #ffffff;
}
.touch-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.45;
  margin: 0;
}
.slider-panel {
  gap: 12px;
}
.slider-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.slider-label-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.slider-ctrl {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 220px;
}
.slider-val {
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Panel Akun & Telemetri Awan */
.account-panel {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.logged-in-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cloud-status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.08);
  border: 1px solid rgba(34, 197, 94, 0.28);
}
.status-ic-ok {
  color: #4ade80;
  flex-shrink: 0;
  margin-top: 1px;
}
.banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #4ade80;
}
.banner-desc {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.45;
  margin: 0;
}
.account-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(11, 16, 36, 0.6);
  border: 1px solid rgba(148, 174, 255, 0.1);
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-label {
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.45);
}
.detail-val {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
}
.detail-val.cyan {
  font-family: var(--display);
  color: #38bdf8;
  font-weight: 600;
}
.detail-val.green {
  color: #4ade80;
}
.account-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.btn-account {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}
.btn-account.primary {
  background: rgba(148, 174, 255, 0.12);
  border: 1px solid rgba(148, 174, 255, 0.28);
  color: #ffffff;
}
.btn-account.primary:hover {
  background: rgba(148, 174, 255, 0.2);
}
.btn-account.danger-outline {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
}
.btn-account.danger-outline:hover {
  background: rgba(239, 68, 68, 0.12);
}

/* Form Mode Tamu */
.guest-auth-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.guest-notice-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.22);
  color: #38bdf8;
}
.auth-card {
  max-width: 440px;
  border-radius: 12px;
  background: rgba(11, 16, 36, 0.6);
  border: 1px solid rgba(148, 174, 255, 0.12);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.auth-seg-toggle {
  display: flex;
  padding: 3px;
  border-radius: 8px;
  background: rgba(148, 174, 255, 0.08);
  gap: 4px;
}
.auth-seg-toggle button {
  flex: 1;
  height: 32px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.auth-seg-toggle button.active {
  background: #3b82f6;
  color: #ffffff;
}
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}
.field-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(148, 174, 255, 0.2);
  background: rgba(15, 23, 42, 0.85);
  color: #ffffff;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.15s ease;
}
.field-input:focus {
  border-color: #38bdf8;
}
.field-hint {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.42);
}
.form-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  margin: 0;
}
.form-msg.err {
  color: #f87171;
}
.form-msg.ok {
  color: #4ade80;
}
.btn-auth-submit {
  height: 40px;
  border-radius: 8px;
  background: #3b82f6;
  border: none;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  margin-top: 4px;
}
.btn-auth-submit:hover {
  background: #2563eb;
}
.btn-auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Zona Berbahaya */
.danger-zone-panel {
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.04);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.text-danger {
  color: #fca5a5 !important;
}
.danger-actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.danger-action-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  background: rgba(11, 16, 36, 0.6);
  border: 1px solid rgba(239, 68, 68, 0.15);
}
.danger-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.danger-action-title {
  font-family: var(--display);
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}
.danger-action-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.4;
}
.btn-danger-outline {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #f87171;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.btn-danger-outline:hover {
  background: rgba(239, 68, 68, 0.12);
}
.btn-danger-solid {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.btn-danger-solid:hover {
  background: rgba(239, 68, 68, 0.28);
}

/* FAQ & Kredit */
.faq-accordion {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.faq-card {
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 0 18px;
}
.faq-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border: none;
  background: transparent;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
}
.faq-q {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
}
.faq-chev {
  color: rgba(255, 255, 255, 0.45);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.faq-card.open .faq-chev {
  transform: rotate(180deg);
}
.faq-answer {
  padding-bottom: 16px;
  color: rgba(255, 255, 255, 0.65);
  font-size: 13.5px;
  line-height: 1.6;
}
.faq-answer p {
  margin: 0;
}
.credits-card {
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 174, 255, 0.14);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.credits-title {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.credits-sub {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 6px;
  line-height: 1.45;
}
.credits-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.65);
}
.credit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.credit-usage {
  color: #ffffff;
  font-weight: 500;
  min-width: 110px;
}
.credit-link {
  color: #38bdf8;
  text-decoration: none;
}
.credit-link:hover {
  text-decoration: underline;
}
.credit-author {
  color: rgba(255, 255, 255, 0.5);
}
.credit-lic {
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
}
.credit-lic:hover {
  text-decoration: underline;
}

/* Modal Konfirmasi */
.prof-confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(6, 10, 26, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.prof-confirm-dialog {
  max-width: 410px;
  width: 100%;
  padding: 24px;
  border-radius: 14px;
  background: #0e1533;
  border: 1px solid rgba(148, 174, 255, 0.25);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}
.pcd-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pcd-icon.danger {
  background: rgba(239, 68, 68, 0.14);
  color: #f87171;
}
.pcd-title {
  font-family: var(--display);
  font-size: 17px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}
.pcd-msg {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.55;
  margin: 0;
}
.pcd-acts {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}
.btn-dialog-cancel {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid rgba(148, 174, 255, 0.25);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-dialog-cancel:hover {
  background: rgba(148, 174, 255, 0.1);
}
.btn-dialog-confirm {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn-dialog-confirm:hover {
  background: rgba(239, 68, 68, 0.3);
}

/* Responsif */
@media (max-width: 860px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }
  .quiz-grid {
    grid-template-columns: 1fr;
  }
  .fleet-grid {
    grid-template-columns: 1fr;
  }
  .touch-cards-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 580px) {
  .key-row {
    grid-template-columns: 1fr auto;
    row-gap: 8px;
  }
  .key-row > .btn-rebind {
    grid-column: 1 / -1;
    justify-self: start;
  }
  .key-row.fixed > span:last-child {
    display: none;
  }
  .account-details-grid {
    grid-template-columns: 1fr;
  }
  .danger-action-box {
    flex-direction: column;
    align-items: flex-start;
  }
  .btn-danger-outline,
  .btn-danger-solid {
    width: 100%;
  }
}
</style>

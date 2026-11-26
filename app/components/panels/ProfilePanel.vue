<script setup>
// Profil penjelajah: Identitas & ASTRO-ID · Riwayat kuis · Armada Pesawat · Konfigurasi Kontrol · Akun & Sinkronisasi Awan · Bantuan & FAQ.
import { computed, ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import {
  store,
  game,
  saveProgress,
  saveSettings,
  saveTouchLayout,
  showToast,
  registerUser,
  loginUser,
  logoutUser,
  loginWithGoogle,
  pullCloudProgress,
  resetAllGameData,
  deleteUserAccount,
} from '~/composables/useGame.js';
import { TOUCH_ELEMENTS, defaultTouchLayout, sanitizeTouchLayout } from '~/data/touchLayout.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PLANETS, NAME_OF } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
import { POINTS_PER_QUESTION } from '~/data/quiz.js';
import { ACTIONS, resolveKeymap, keyLabels, keyLabel, canBind } from '~/data/keymap.js';
import { MODEL_CREDITS, LICENSE_URL } from '~/data/credits.js';
import { fmtDate } from '~/game/util.js';
import {
  useNetworkStatus,
  OFFLINE_ACTION_NOTICE,
  GENERIC_PUBLIC_ERROR,
} from '~/utils/networkError.js';

const { planets, ships, getQuiz, loadAll } = useSupabaseContent();
const { isOffline } = useNetworkStatus();

onMounted(async () => {
  if (store.profileTab === 'armada') {
    store.profileTab = 'kuis';
  }
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
  ['akun', 'Akun'],
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

/** Jumlah soal kuis aktif per planet (dinamis dari Supabase) */
const getPlanetQuestionCount = (planetId) => {
  const q = getQuiz(planetId);
  return q?.questions?.length ?? 0;
};

/** Skor maksimal kuis dinamis berdasarkan bobot poin tiap soal di Supabase */
const getPlanetQuizMax = (planetId) => {
  const qs = getQuiz(planetId)?.questions;
  if (!qs || qs.length === 0) return 0;
  return qs.reduce((sum, q) => sum + (Number(q.points) || POINTS_PER_QUESTION), 0);
};

/** Jumlah bintang diperoleh mengikuti proporsi skor terbaik terhadap skor maksimal kuis */
const getPlanetEarnedStars = (planetId) => {
  const maxStars = getPlanetQuestionCount(planetId);
  const maxScore = getPlanetQuizMax(planetId);
  if (!maxStars || !maxScore) return 0;
  const score = P.best[planetId] ?? 0;
  return Math.min(maxStars, Math.max(0, Math.floor((score / maxScore) * maxStars)));
};

const visited = computed(() => store.discovered.filter((d) => planets.value.some((p) => p.id === d)).length);
const perfect = computed(() => planets.value.filter((p) => {
  const maxScore = getPlanetQuizMax(p.id);
  return maxScore > 0 && (P.best[p.id] ?? 0) >= maxScore;
}).length);
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
function openHangarFromProfile(shipId) {
  store.profileTab = 'kuis';
  store.backTo = 'profil';
  store.hangarReturnTo = 'profil';
  game()?.setMode('hanggar', { backTo: 'profil', ship: shipId || store.progress.selectedShip });
}

function onSelectTab(id) {
  if (id === 'armada') {
    openHangarFromProfile();
    return;
  }
  tab.value = id;
}

function openHangar(id) {
  openHangarFromProfile(id);
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
  if (store.bannedModal?.show) {
    endCapture();
    return;
  }
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

// ---- Tata Letak Kontrol Sentuh ----
const editingTouchLayout = ref(false);
const showMobileKeyboard = ref(false);
const currentTouchLayout = computed(() => sanitizeTouchLayout(store.settings.touchLayout));
const touchHiddenCount = computed(() => (
  TOUCH_ELEMENTS.filter((el) => currentTouchLayout.value[el.id]?.hidden).length
));

function openTouchEditor() {
  editingTouchLayout.value = true;
}

function resetTouchLayoutDefault() {
  saveTouchLayout(defaultTouchLayout());
  showToast('Tata letak kontrol sentuh dikembalikan ke bawaan.', 2400);
}

// ---- Autentikasi Akun ----
const authMode = ref('login'); // 'login' | 'register'
const authForm = reactive({ username: '', password: '', busy: false, err: store.oauthError || '', success: '' });

async function handleAuthSubmit() {
  if (authForm.busy) return;
  authForm.err = '';
  authForm.success = '';
  store.oauthError = '';
  if (!authForm.username.trim()) {
    authForm.err = 'Isi nama penjelajah.';
    return;
  }
  if (!authForm.password) {
    authForm.err = 'Isi kata sandi.';
    return;
  }

  authForm.busy = true;
  try {
    const isReg = authMode.value === 'register';
    const res = isReg
      ? await registerUser(authForm.username, authForm.password)
      : await loginUser(authForm.username, authForm.password);

    if (!res.ok) {
      authForm.err = res.err || 'Tidak dapat memproses akun saat ini.';
      return;
    }

    authForm.password = '';
    const act = isReg ? 'Akun baru berhasil dibuat' : 'Berhasil masuk akun';
    authForm.success = `${act}! Progres Anda telah disimpan dan disinkronkan.`;
    const safeName = (store.account.name || '').replace(/[<>&"]/g, '');
    showToast(`Selamat datang, <b>${safeName}</b>!`, 3200);
  } catch (err) {
    console.error('[AstroSphere] Profile auth error:', err);
    authForm.err = GENERIC_PUBLIC_ERROR;
  } finally {
    authForm.busy = false;
  }
}

async function handleGoogleAuth() {
  if (authForm.busy) return;
  authForm.err = '';
  authForm.success = '';
  store.oauthError = '';
  authForm.busy = true;
  try {
    const res = await loginWithGoogle();
    if (!res.ok) {
      authForm.err = res.err || 'Tidak dapat menghubungkan ke layanan Google saat ini.';
    }
  } catch (err) {
    console.error('[AstroSphere] Profile Google auth error:', err);
    authForm.err = 'Tidak dapat menghubungkan ke layanan Google saat ini.';
  } finally {
    authForm.busy = false;
  }
}

async function handleLogout() {
  await logoutUser();
  showToast('Anda telah keluar dari akun. Beralih ke Mode Tamu.', 2800);
}

async function triggerManualSync() {
  saveProgress();
  if (!store.account.loggedIn || !store.account.userId) return;
  if (isOffline.value) {
    showToast(OFFLINE_ACTION_NOTICE, 3200);
    return;
  }
  const res = await pullCloudProgress();
  if (res?.ok) {
    showToast('Progres berhasil disinkronkan!', 2200);
  } else if (res?.offline) {
    showToast(res.err || OFFLINE_ACTION_NOTICE, 3200);
  } else {
    showToast(res?.err || GENERIC_PUBLIC_ERROR, 3200);
  }
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
  confirmDialog.message = 'Akun serta seluruh progres permainanmu akan dihapus secara permanen dan tidak dapat dipulihkan. Yakin ingin menghapus akun?';
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
    showToast(GENERIC_PUBLIC_ERROR, 3000);
  } finally {
    confirmDialog.busy = false;
  }
}

const openFaq = ref({ 0: true });
const FAQ = computed(() => {
  const activePlanets = planets.value?.length ? planets.value : PLANETS;
  const counts = [];
  const ptsValues = [];
  for (const p of activePlanets) {
    const qs = getQuiz(p.id)?.questions || [];
    if (qs.length > 0) {
      counts.push(qs.length);
      for (const q of qs) {
        ptsValues.push(Number(q.points) || POINTS_PER_QUESTION);
      }
    }
  }
  const minC = counts.length ? Math.min(...counts) : 4;
  const maxC = counts.length ? Math.max(...counts) : 4;
  const countTxt = minC === maxC ? `${minC} soal` : `${minC}–${maxC} soal`;

  const minP = ptsValues.length ? Math.min(...ptsValues) : POINTS_PER_QUESTION;
  const maxP = ptsValues.length ? Math.max(...ptsValues) : POINTS_PER_QUESTION;
  const ptsTxt = minP === maxP ? `${minP} bintang` : `${minP}–${maxP} bintang`;

  const paidShips = (ships.value || []).filter((s) => s && Number(s.price) > 0);
  const shipItems = paidShips.map((s) => `${s.name} (${s.price} bintang)`);
  let shipSummary = 'Membuka armada pesawat baru yang tersedia di Hanggar.';
  if (shipItems.length === 1) {
    shipSummary = `Membuka armada pesawat baru di Hanggar: ${shipItems[0]}.`;
  } else if (shipItems.length > 1) {
    const last = shipItems[shipItems.length - 1];
    shipSummary = `Membuka armada pesawat baru di Hanggar: ${shipItems.slice(0, -1).join(', ')} dan ${last}.`;
  }

  return [
    ['Apa itu AstroSphere?', 'Game belajar tata surya interaktif 3D di browser. Terbangkan pesawat antariksa, singgahi delapan planet, amati fenomenanya, telusuri sejarah eksplorasi, lalu uji wawasanmu lewat kuis.'],
    ['Bagaimana cara ke planet tertentu?', 'Buka Peta (tombol M atau lewat navigasi), pilih planet tujuan, lalu tekan "Terbang ke sini". Pesawat akan bermanuver otomatis dan berhenti tepat saat mendekati planet.'],
    ['Bagaimana mendapat bintang?', `Kerjakan kuis planet: ${countTxt}, ${ptsTxt} per jawaban benar. Bintang hanya bertambah jika skormu melampaui skor terbaik sebelumnya. Jawaban salah tidak mengurangi saldo bintang.`],
    ['Untuk apa bintang digunakan?', shipSummary],
    ['Apakah progres tersimpan aman?', 'Ya! Saat Anda mendaftar atau masuk akun, seluruh saldo bintang, armada pesawat, dan jurnal tersimpan otomatis di akun Anda. Dalam Mode Tamu, progres tetap tersimpan di peramban perangkat ini.'],
    ['Apakah ukuran dan jaraknya berskala nyata?', 'Rasio ukuran planet dibandingkan satu sama lain akurat sesuai data NASA JPL. Jarak orbit antarplanet dipadatkan secara ergonomis agar seluruh tata surya dapat dijelajahi dengan nyaman.'],
  ];
});
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
                {{ store.account.cloudSynced ? 'AKUN TERHUBUNG' : 'MODE TAMU · TERSIMPAN LOKAL' }}
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
              <span class="summary-metric">{{ visited }}/{{ planets.length }} Planet Terjelajahi</span>
              <span class="summary-dot">·</span>
              <span class="summary-metric">{{ perfect }}/{{ planets.length }} Kuis Sempurna</span>
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
            @click="onSelectTab(id)"
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

        <!-- TAB 2: ARMADA PESAWAT (AKSES HANGGAR 3D) -->
        <section v-else-if="tab === 'armada'" class="tab-pane">
          <div class="hangar-redirect-card">
            <div class="hrc-icon">
              <UiIcon name="hanggar" :size="36" />
            </div>
            <div class="hrc-info">
              <span class="hrc-badge">HANGGAR ARMADA 3D</span>
              <h3 class="hrc-title">Eksplorasi Armada di Hanggar 3D</h3>
              <p class="hrc-desc">
                Lihat model visual pesawat secara interaktif 360°, periksa spesifikasi kecepatan jelajah dan pendorong turbo, serta gunakan atau buka pesawat baru dengan saldo Bintang Anda.
              </p>
              <div class="hrc-action">
                <button type="button" class="btn-open-hangar-3d" @click="openHangarFromProfile()">
                  <UiIcon name="hanggar" :size="18" />
                  <span>Buka Hanggar 3D</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- TAB 3: KONTROL -->
        <section v-else-if="tab === 'kontrol'" class="tab-pane">
          <!-- KONTROL LAYAR SENTUH & EDITOR TATA LETAK (TAMPIL DI ATAS PADA PERANGKAT SENTUH) -->
          <div v-if="store.touch" class="control-panel touch-editor-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Tata Letak Kontrol Sentuh</h3>
                <p class="section-sub">Geser posisi, ubah ukuran, atau sembunyikan tombol kemudi sentuh sesuai kenyamanan tanganmu.</p>
              </div>
              <button type="button" class="btn-subtle" @click="resetTouchLayoutDefault">
                <UiIcon name="ulang" :size="14" />
                <span>Reset Default</span>
              </button>
            </div>
            <div class="touch-editor-actions">
              <div class="editor-status-copy">
                <span class="action-label">Kustomisasi HUD Kokpit Mobile</span>
                <span class="action-sub">
                  {{ touchHiddenCount ? `${touchHiddenCount} tombol sedang disembunyikan` : 'Seluruh 5 kontrol sentuh aktif di layar' }}
                </span>
              </div>
              <button type="button" class="btn-open-editor" @click="openTouchEditor">
                <UiIcon name="edit" :size="16" />
                <span>Atur Tata Letak Kontrol</span>
              </button>
            </div>
          </div>

          <div class="control-panel" :class="{ 'touch-first': store.touch }">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Panduan Kontrol Layar Sentuh</h3>
                <p v-if="store.touch" class="section-sub">Kelima kendali layar sentuh berikut tersedia saat menjelajah tata surya dalam mode lanskap.</p>
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
                <span class="touch-title">Tuas Kecepatan</span>
                <p class="touch-desc">Tarik tuas dorong di kanan bawah untuk Maju, Turbo, Netral, dan Rem.</p>
              </div>
              <div class="touch-tile">
                <UiIcon name="pesawat" :size="20" />
                <span class="touch-title">Tombol Guling Kiri &amp; Kanan</span>
                <p class="touch-desc">Ketuk tombol panah guling di kanan bawah untuk bermanuver menghindari sampah antariksa.</p>
              </div>
              <div class="touch-tile">
                <UiIcon name="jeda" :size="20" />
                <span class="touch-title">Tombol Jeda</span>
                <p class="touch-desc">Ketuk ikon Jeda pada HUD untuk membuka Menu Jeda, Peta, Hanggar, atau Pengaturan.</p>
              </div>
              <div class="touch-tile">
                <UiIcon name="mata" :size="20" />
                <span class="touch-title">Sentuh &amp; Seret Kamera</span>
                <p class="touch-desc">Sentuh dan geser area tengah layar untuk melihat sekeliling angkasa 360&deg;.</p>
              </div>
            </div>
          </div>

          <div v-if="!store.touch" class="control-panel touch-editor-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Tata Letak Kontrol Sentuh</h3>
                <p class="section-sub">Atur posisi dan ukuran tombol sentuh (Kemudi Analog, Tuas Kecepatan, Guling Kiri/Kanan, dan Tombol Jeda) untuk perangkat layar sentuh.</p>
              </div>
              <button type="button" class="btn-subtle" @click="resetTouchLayoutDefault">
                <UiIcon name="ulang" :size="14" />
                <span>Reset Default</span>
              </button>
            </div>
            <div class="touch-editor-actions">
              <div class="editor-status-copy">
                <span class="action-label">Kustomisasi HUD Layar Sentuh</span>
                <span class="action-sub">
                  {{ touchHiddenCount ? `${touchHiddenCount} tombol sedang disembunyikan` : 'Seluruh 5 kontrol sentuh aktif' }}
                </span>
              </div>
              <button type="button" class="btn-open-editor" @click="openTouchEditor">
                <UiIcon name="edit" :size="16" />
                <span>Atur Tata Letak Kontrol</span>
              </button>
            </div>
          </div>

          <!-- SENSITIVITAS & INVERT Y -->
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

          <!-- KONFIGURASI KEYBOARD (UTAMA DI DESKTOP, OPSIONAL DI MOBILE) -->
          <div class="control-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Konfigurasi Keyboard</h3>
                <p class="section-sub">
                  {{ store.touch
                    ? 'Opsional: tersedia bila memakai keyboard eksternal.'
                    : 'Tekan "Ubah", lalu tekan tombol baru pada keyboard. Tekan Esc untuk batal.' }}
                </p>
              </div>
              <div class="kb-head-actions">
                <button
                  v-if="store.touch"
                  type="button"
                  class="btn-subtle"
                  @click="showMobileKeyboard = !showMobileKeyboard"
                >
                  <span>{{ showMobileKeyboard ? 'Tutup' : 'Tampilkan' }}</span>
                </button>
                <button v-if="!store.touch || showMobileKeyboard" type="button" class="btn-subtle" @click="resetKeys">
                  <UiIcon name="ulang" :size="14" />
                  <span>Bawaan</span>
                </button>
              </div>
            </div>

            <div v-if="!store.touch || showMobileKeyboard" class="keys-table">
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
        </section>

        <!-- TAB 4: AKUN -->
        <section v-else-if="tab === 'akun'" class="tab-pane">
          <div class="account-panel">
            <div class="panel-section-header">
              <div class="header-titles">
                <h3 class="section-title">Akun &amp; Sinkronisasi Progres</h3>
                <p class="section-sub">Simpan progres penjelajahan, saldo bintang, dan armada pesawat Anda secara otomatis ke akun.</p>
              </div>
            </div>

            <!-- TAMPILAN JIKA SUDAH LOGIN -->
            <div v-if="store.account.loggedIn" class="logged-in-box">
              <div class="cloud-status-banner" :class="{ offline: isOffline }">
                <UiIcon :name="isOffline ? 'info' : 'cek'" :size="20" :class="isOffline ? 'status-ic-warn' : 'status-ic-ok'" />
                <div class="banner-text">
                  <span class="banner-title">{{ isOffline ? 'Sedang Offline — Sinkronisasi Dijeda' : 'Akun Aktif & Terhubung' }}</span>
                  <p class="banner-desc">
                    {{
                      isOffline
                        ? 'Anda tetap dapat menjelajah di perangkat ini. Hubungkan kembali internet untuk menyinkronkan progres Anda.'
                        : 'Setiap perolehan bintang, kuis, dan armada baru disinkronkan secara otomatis.'
                    }}
                  </p>
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
                  <span class="detail-label">STATUS AKUN</span>
                  <span class="detail-val" :class="isOffline ? 'warn' : 'green'">{{ isOffline ? 'Mode Offline (Menunggu Koneksi)' : 'Sinkronisasi Aktif' }}</span>
                </div>
              </div>

              <div class="account-actions">
                <button type="button" class="btn-account primary" :disabled="isOffline" @click="triggerManualSync">
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
                      :autocomplete="authMode === 'login' ? 'current-password' : 'new-password'"
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
                    {{ authForm.busy ? 'Menghubungkan…' : (authMode === 'login' ? 'Masuk & Sinkronkan Progres' : 'Daftar Akun Baru') }}
                  </button>

                  <template v-if="authMode === 'login'">
                    <div class="auth-divider">
                      <span class="auth-divider-line" />
                      <span class="auth-divider-text">ATAU</span>
                      <span class="auth-divider-line" />
                    </div>

                    <button
                      type="button"
                      class="btn-google-auth"
                      :disabled="authForm.busy || isOffline"
                      @click="handleGoogleAuth"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>Lanjutkan dengan Google</span>
                    </button>
                  </template>
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
                  <p class="danger-action-desc">Menghapus akun beserta seluruh progres permainan Anda secara permanen tanpa sisa.</p>
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

    <!-- EDITOR TATA LETAK KONTROL SENTUH INTERAKTIF -->
    <Transition name="fade">
      <PanelsTouchLayoutEditor v-if="editingTouchLayout" @close="editingTouchLayout = false" />
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

/* Armada Pesawat & Hanggar 3D */
.hangar-redirect-card {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 32px 28px;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(16px);
  margin: 8px 0 16px;
}
.hrc-icon {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}
.hrc-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.hrc-badge {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #38bdf8;
  text-transform: uppercase;
}
.hrc-title {
  font-family: var(--display);
  font-size: 20px;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}
.hrc-desc {
  font-size: 13.5px;
  line-height: 1.6;
  color: #94a3b8;
  margin: 0;
  max-width: 640px;
}
.hrc-action {
  margin-top: 10px;
}
.btn-open-hangar-3d {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 22px;
  border-radius: 10px;
  background: #38bdf8;
  color: #030712;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-open-hangar-3d:hover {
  background: #7dd3fc;
  box-shadow: 0 4px 16px rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
}
@media (max-width: 640px) {
  .hangar-redirect-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
    gap: 16px;
  }
}

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
.touch-editor-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}
.editor-status-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.btn-open-editor {
  height: 38px;
  padding: 0 16px;
  border-radius: 10px;
  background: #3b82f6;
  border: none;
  color: #ffffff;
  font-family: var(--display);
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.35);
  transition: background 0.15s ease, transform 0.12s ease;
}
.btn-open-editor:hover {
  background: #2563eb;
}
.kb-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.touch-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
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
.cloud-status-banner.offline {
  background: rgba(251, 191, 36, 0.08);
  border-color: rgba(251, 191, 36, 0.3);
}
.status-ic-ok {
  color: #4ade80;
  flex-shrink: 0;
  margin-top: 1px;
}
.status-ic-warn {
  color: #fbbf24;
  flex-shrink: 0;
  margin-top: 1px;
}
.cloud-status-banner.offline .banner-title {
  color: #fde68a;
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
.detail-val.warn {
  color: #fbbf24;
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
.btn-account.primary:hover:not(:disabled) {
  background: rgba(148, 174, 255, 0.2);
}
.btn-account:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
.auth-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0;
}
.auth-divider-line {
  flex: 1;
  height: 1px;
  background: rgba(148, 174, 255, 0.16);
}
.auth-divider-text {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(148, 174, 255, 0.65);
}
.btn-google-auth {
  height: 40px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}
.btn-google-auth:hover:not(:disabled) {
  background: #f8fafc;
}
.btn-google-auth:active:not(:disabled) {
  transform: translateY(1px);
}
.btn-google-auth:disabled {
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
  background: rgba(5, 8, 20, 0.8);
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
  background: rgba(11, 16, 33, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
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

/* Mobile Landscape: header ringkas, kartu tetap 2 kolom agar hemat ruang vertikal */
@media (max-height: 540px) and (orientation: landscape) {
  .prof {
    padding: calc(8px + var(--safe-t)) calc(14px + var(--safe-r)) calc(18px + var(--safe-b)) calc(14px + var(--safe-l));
  }
  .wrap {
    gap: 10px;
  }
  .prof-header {
    padding: 4px 2px;
  }
  .btn-back-nav {
    height: 34px;
    padding: 0 12px;
    font-size: 12.5px;
  }
  .hero-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .hero-card {
    padding: 12px 14px;
  }
  .profile-identity {
    margin-top: 8px;
    gap: 10px;
  }
  .avatar-box {
    width: 40px;
    height: 40px;
  }
  .pilot-name {
    font-size: 16px;
  }
  .card-divider {
    margin: 10px 0 8px;
  }
  .star-number {
    font-size: 26px;
  }
  .star-icon {
    font-size: 20px;
  }
  .stats-footnote {
    margin-top: 8px;
    padding-top: 6px;
  }
  .segmented-bar {
    padding: 3px;
  }
  .seg-item {
    min-height: 34px;
    padding: 0 10px;
    font-size: 12.5px;
  }
  .quiz-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .quiz-card {
    padding: 10px 12px;
    gap: 10px;
  }
  .touch-cards-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .control-panel {
    padding: 14px 16px;
    gap: 10px;
  }
  .touch-tile {
    padding: 10px 12px;
  }
}
</style>

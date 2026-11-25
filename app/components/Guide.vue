<script setup>
// Onboarding modern gaya briefing game dengan layout 2 kolom (Visual di kiri, Penjelasan di kanan)
// serta panggung demo pesawat interaktif di slide 5.
// Slide 1–4: kolom kiri = slider 3 gambar (public/img/guide/, dibuat oleh scripts/render-guide.mjs dari model 3D game)
// yang selaras dengan poin 01/02/03 di kanan — berganti otomatis, bisa dipilih lewat poin atau penanda di bawah gambar.
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, saveSettings } from '~/composables/useGame.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';

const TOTAL_SLIDES = 5;
const slide = ref(1);

const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id) => keyLabel(km.value[id]?.[0]);

// Data Slide 1 - 4: Briefing Game 2 Kolom
const SLIDES = [
  {
    step: '01 / 05 — EKSPLORASI',
    title: 'Jelajah Bebas Tata Surya 3D',
    lead: 'Kendalikan pesawat antariksamu mengarungi Matahari, 8 planet, dan Bulan dengan orbit astronomis yang akurat.',
    icon: 'planet',
    placeholderTitle: 'Simulasi Tata Surya 3D',
    points: [
      {
        icon: 'orbit',
        title: 'Navigasi 3D Tanpa Batas',
        img: '/img/guide/slide-1-1-navigasi.webp',
        desc: 'Terbang bebas mengarungi ruang angkasa. Kecepatan melambat secara aman saat memasuki radius observasi planet.'
      },
      {
        icon: 'peta',
        title: 'Peta Sistem & Autopilot',
        img: '/img/guide/slide-1-2-peta.webp',
        desc: 'Tekan tombol M untuk membuka peta tata surya dan meluncur otomatis ke planet tujuan pilihanmu.'
      },
      {
        icon: 'mata',
        title: 'Kamera Kokpit & Bebas',
        img: '/img/guide/slide-1-3-kamera.webp',
        desc: 'Tekan tombol V untuk berganti antara kamera kokpit orang pertama atau sudut pandang luar.'
      }
    ]
  },
  {
    step: '02 / 05 — SEJARAH & SAINS',
    title: 'Lini Masa Sejarah & Fenomena',
    lead: 'Singkap jejak peradaban manusia serta laboratorium fenomena astronomi interaktif di setiap planet.',
    icon: 'fenomena',
    placeholderTitle: 'Laboratorium Fenomena & Sejarah',
    points: [
      {
        icon: 'info',
        title: 'Titik Sejarah (POI) 6 Zaman',
        img: '/img/guide/slide-2-1-sejarah.webp',
        desc: 'Telusuri pendaratan wahana antariksa nyata di Bumi, Bulan, dan Mars dari era kuno hingga modern.'
      },
      {
        icon: 'matahari',
        title: 'Laboratorium Fenomena Langit',
        img: '/img/guide/slide-2-2-fenomena.webp',
        desc: 'Saksikan gerhana Matahari & Bulan, pergantian musim di Saturnus, dan rotasi ekstrem di Jupiter.'
      },
      {
        icon: 'jurnal',
        title: 'Jurnal Penemuan Otomatis',
        img: '/img/guide/slide-2-3-jurnal.webp',
        desc: 'Setiap planet dan sabuk asteroid yang kamu dekati otomatis tercatat menjadi kartu koleksi di Jurnal pribadimu.'
      }
    ]
  },
  {
    step: '03 / 05 — EVALUASI & MISI',
    title: 'Kuis Planet & Misi Kisah Nyata',
    lead: 'Raih Bintang penjelajah lewat kuis sains dan jalankan misi penyelamatan sejarah berisiko tinggi.',
    icon: 'bintang',
    placeholderTitle: 'Kuis Astronomi & Misi Nyata',
    points: [
      {
        icon: 'bintang',
        title: 'Kuis Sains Per Planet',
        img: '/img/guide/slide-3-1-kuis.webp',
        desc: 'Jawab 3 tantangan astronomi di tiap destinasi untuk mengumpulkan Bintang tanpa penalti jawaban salah.'
      },
      {
        icon: 'kilat',
        title: 'Misi Apollo 13 (1970)',
        img: '/img/guide/slide-3-2-apollo13.webp',
        desc: 'Kendalikan wahana darurat pasca ledakan tangki oksigen, hitung gravitasi Bulan, dan bawa astronaut pulang.'
      },
      {
        icon: 'info',
        title: 'Misi Mars Climate Orbiter (1999)',
        img: '/img/guide/slide-3-3-mco.webp',
        desc: 'Investigasi kekeliruan perhitungan satuan Metrik vs Imperial sebelum wahana terbakar di atmosfer Mars.'
      }
    ]
  },
  {
    step: '04 / 05 — ARMADA ANTARIKSA',
    title: 'Hanggar & Peningkatan Armada',
    lead: 'Kumpulkan Bintang untuk membuka dan menerbangkan pesawat antariksa generasi masa depan.',
    icon: 'hanggar',
    placeholderTitle: 'Hanggar Pesawat Antariksa',
    points: [
      {
        icon: 'pesawat',
        title: 'Astra Scout (Pesawat Awal)',
        img: '/img/guide/slide-4-1-astra.webp',
        desc: 'Pesawat penjelajah lincah dan seimbang, sahabat setia penjelajah antariksa pemula.'
      },
      {
        icon: 'kilat',
        title: 'Orion Glider (300 Bintang)',
        img: '/img/guide/slide-4-2-orion.webp',
        desc: 'Pesawat sayap sapuan berkecepatan jelajah tinggi untuk menyeberangi jarak jauh antarplanet luar.'
      },
      {
        icon: 'bintang',
        title: 'Nova Voyager (700 Bintang)',
        img: '/img/guide/slide-4-3-nova.webp',
        desc: 'Pesawat penjelajah antarbintang berakselerasi turbo ekstrem dan ketahanan perisai radiasi ganda.'
      }
    ]
  }
];

// Deteksi error muat gambar (cadangan: tampilan ikon)
const imgErrors = reactive({});

// ---- Slider gambar slide 1–4 (selaras dengan poin 01/02/03) ----
// Berganti saat animasi bilah progres selesai (CSS), jeda saat kursor/fokus di atas gambar.
const sub = ref(0), subTick = ref(0), subHold = ref(false);
const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function pickSub(i) { sub.value = i; subTick.value++; }
function nextSub() {
  const item = SLIDES[slide.value - 1];
  if (!item || still) return;
  sub.value = (sub.value + 1) % item.points.length; subTick.value++;
}
watch(slide, () => { sub.value = 0; subTick.value++; });

// ---- State simulator pesawat interaktif (Slide 5) ----
const activeAction = ref('');
const actionStatus = ref('Siap Menerima Input — Tekan tombol keyboard atau klik kontrol di kanan');

function setAction(act) {
  activeAction.value = act;
  switch (act) {
    case 'forward':
      actionStatus.value = 'Pendorong Maju Aktif (Enter) — Kecepatan Naik';
      break;
    case 'turbo':
      actionStatus.value = 'Pendorong Turbo Aktif (Alt) — Kecepatan Maksimal!';
      break;
    case 'brake':
      actionStatus.value = 'Rem Pendorong Balik Aktif (Ctrl) — Perlambatan';
      break;
    case 'stop':
      actionStatus.value = 'Berhenti Seketika (Spasi) — Pesawat Diam';
      break;
    case 'up':
      actionStatus.value = 'Hidung Naik (W / Panah Atas) — Pitch Up';
      break;
    case 'down':
      actionStatus.value = 'Hidung Turun (S / Panah Bawah) — Pitch Down';
      break;
    case 'left':
      actionStatus.value = 'Belok Kiri (A / Panah Kiri) — Yaw & Banking Roll';
      break;
    case 'right':
      actionStatus.value = 'Belok Kanan (D / Panah Kanan) — Yaw & Banking Roll';
      break;
    default:
      actionStatus.value = 'Siap Menerima Input — Tekan tombol keyboard atau klik kontrol di kanan';
  }
}

function clearAction(act) {
  if (!act || activeAction.value === act) {
    activeAction.value = '';
    actionStatus.value = 'Siap Menerima Input — Tekan tombol keyboard atau klik kontrol di kanan';
  }
}

function start() {
  if (!store.ready) return;
  store.settings.tutorialSeen = true;
  saveSettings();
  game()?.startGame(store.startFromSave);
}

function skip() {
  store.settings.tutorialSeen = true;
  saveSettings();
  if (store.ready) {
    start();
  } else {
    store.phase = 'loading';
  }
}

function nextSlide() {
  if (slide.value < TOTAL_SLIDES) {
    slide.value++;
  } else if (store.ready) {
    start();
  } else {
    store.settings.tutorialSeen = true;
    saveSettings();
    store.phase = 'loading';
  }
}

function prevSlide() {
  if (slide.value > 1) slide.value--;
}

function onKeyDown(e) {
  if (store.modal) return;
  if (e.target?.closest?.('.point-item, .sub-dot')) return; // Enter/Spasi di tombol poin → pilih gambar, bukan mulai

  // Navigasi global Enter/Spasi saat dunia siap jika tidak di slide demo
  if (slide.value !== TOTAL_SLIDES && (e.code === 'Enter' || e.code === 'Space') && store.ready) {
    e.preventDefault();
    start();
    return;
  }

  // Khusus Slide 5: Uji Kendali Interaktif
  if (slide.value === TOTAL_SLIDES) {
    if (['Enter', 'NumpadEnter'].includes(e.code)) {
      e.preventDefault();
      e.stopPropagation();
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      setAction('forward');
    }
    else if (['ControlLeft', 'ControlRight'].includes(e.code)) { e.preventDefault(); setAction('brake'); }
    else if (['AltLeft', 'AltRight'].includes(e.code)) { e.preventDefault(); setAction('turbo'); }
    else if (e.code === 'Space') { e.preventDefault(); setAction('stop'); }
    else if (e.code === 'KeyW' || e.code === 'ArrowUp') { e.preventDefault(); setAction('up'); }
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') { e.preventDefault(); setAction('down'); }
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') { e.preventDefault(); setAction('left'); }
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') { e.preventDefault(); setAction('right'); }
  }
}

function onKeyUp(e) {
  if (slide.value === TOTAL_SLIDES) {
    if (['Enter', 'NumpadEnter'].includes(e.code)) clearAction('forward');
    else if (['ControlLeft', 'ControlRight'].includes(e.code)) clearAction('brake');
    else if (['AltLeft', 'AltRight'].includes(e.code)) clearAction('turbo');
    else if (e.code === 'Space') clearAction('stop');
    else if (e.code === 'KeyW' || e.code === 'ArrowUp') clearAction('up');
    else if (e.code === 'KeyS' || e.code === 'ArrowDown') clearAction('down');
    else if (e.code === 'KeyA' || e.code === 'ArrowLeft') clearAction('left');
    else if (e.code === 'KeyD' || e.code === 'ArrowRight') clearAction('right');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // unduh semua gambar panduan di latar (±0,6 MB) agar pergantian slide tidak berkedip
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 800));
  idle(() => { for (const s of SLIDES) for (const p of s.points) { const im = new Image(); im.decoding = 'async'; im.src = p.img; } });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});
</script>

<template>
  <div class="guide">
    <div class="wrap">
      <!-- HEADER BERSIH & MINIMAL (TANPA TULISAN KAKU SLIDE 1 DARI 5) -->
      <header class="head">
        <button class="ib sm" aria-label="Kembali ke beranda" @click="store.phase = 'splash'">
          <UiIcon name="kembali" :size="20" />
        </button>

        <button class="skip-link" :class="{ ready: store.ready }" @click="skip">
          <span v-if="!store.ready" class="skip-loading">
            <span class="dot-pulse" /> Memuat 3D {{ Math.round(store.loading.p * 100) }}%
          </span>
          <span v-else class="skip-ready">Lewati</span>
          <UiIcon name="lanjut" :size="15" />
        </button>
      </header>

      <!-- VIEWPORT TATA LETAK 2 KOLOM (KIRI: VISUAL, KANAN: PENJELASAN) -->
      <main class="slide-viewport">
        <!-- SLIDE 1–4: BRIEFING GAME MODERN -->
        <template v-for="(item, idx) in SLIDES" :key="idx">
          <div v-if="slide === (idx + 1)" class="briefing-grid fade-in">
            <!-- KOLOM KIRI: BINGKAI VISUAL GAMBAR -->
            <div class="visual-col">
              <div class="visual-frame" @pointerenter="subHold = true" @pointerleave="subHold = false" @focusin="subHold = true" @focusout="subHold = false">
                <!-- 3 gambar bertumpuk, berganti dengan transisi silang -->
                <template v-for="(pt, sIdx) in item.points" :key="pt.img">
                  <img
                    v-if="!imgErrors[pt.img]"
                    :src="pt.img"
                    :alt="pt.title"
                    class="visual-img shot"
                    :class="{ on: sub === sIdx }"
                    :aria-hidden="sub !== sIdx"
                    :loading="sIdx === 0 ? 'eager' : 'lazy'"
                    decoding="async"
                    @error="imgErrors[pt.img] = true"
                  />
                </template>

                <!-- Penanda gambar + bilah progres (klik untuk memilih) -->
                <div class="sub-dots" role="tablist" aria-label="Pilih gambar">
                  <button
                    v-for="(pt, sIdx) in item.points"
                    :key="sIdx"
                    type="button"
                    role="tab"
                    class="sub-dot"
                    :class="{ on: sub === sIdx }"
                    :aria-selected="sub === sIdx"
                    :aria-label="pt.title"
                    @click="pickSub(sIdx)"
                  >
                    <span class="sub-bar"><span v-if="sub === sIdx" :key="subTick" class="sub-fill" :class="{ hold: subHold, still }" @animationend="nextSub" /></span>
                  </button>
                </div>

                <!-- Tampilan cadangan bila gambar gagal dimuat -->
                <div v-if="imgErrors[item.points[sub]?.img]" class="visual-placeholder">
                  <div class="ph-glow" />
                  <div class="ph-content">
                    <span class="ph-icon" :class="{ 'star-ph': idx === 2 }">
                      <UiIcon :name="item.icon" :size="48" />
                    </span>
                    <b class="ph-title">{{ item.placeholderTitle }}</b>
                  </div>
                </div>
              </div>
            </div>

            <!-- KOLOM KANAN: PENJELASAN BERSIH & LEGA -->
            <div class="info-col">
              <div class="step-tag">{{ item.step }}</div>
              <h1 class="briefing-title">{{ item.title }}</h1>
              <p class="briefing-lead">{{ item.lead }}</p>

              <!-- DAFTAR 3 POIN FITUR VERTIKAL BERSIH DENGAN PENANDA ANGKA MODERN -->
              <div class="points-list">
                <button
                  v-for="(pt, pIdx) in item.points"
                  :key="pIdx"
                  type="button"
                  class="point-item"
                  :class="{ on: sub === pIdx }"
                  :aria-pressed="sub === pIdx"
                  @click="pickSub(pIdx)"
                >
                  <span class="pt-badge" aria-hidden="true">{{ String(pIdx + 1).padStart(2, '0') }}</span>
                  <span class="pt-text">
                    <b class="pt-title">{{ pt.title }}</b>
                    <span class="pt-desc">{{ pt.desc }}</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- SLIDE 5: DEMO PESAWAT INTERAKTIF (KIRI: PANGGUNG 3D, KANAN: KONTROLER) -->
        <div v-if="slide === 5" class="briefing-grid fade-in slide-demo">
          <!-- KOLOM KIRI: PANGGUNG SIMULATOR PESAWAT 3D -->
          <div class="visual-col">
            <div class="visual-frame stage-frame">
              <div class="stage-sky" :class="activeAction">
                <!-- Garis bintang warp dinamis -->
                <div class="warp-lines" :class="activeAction">
                  <span class="star-line l1" />
                  <span class="star-line l2" />
                  <span class="star-line l3" />
                  <span class="star-line l4" />
                  <span class="star-line l5" />
                  <span class="star-line l6" />
                </div>

                <!-- Model Pesawat Demo SVG 3D -->
                <div class="demo-ship-box" :class="activeAction">
                  <svg class="demo-svg" viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M80 15 L150 100 L125 110 L95 90 L80 95 L65 90 L35 110 L10 100 Z" fill="#1b2854" stroke="#4f75f0" stroke-width="2.5" />
                    <path d="M80 30 L130 95" stroke="#688eff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
                    <path d="M80 30 L30 95" stroke="#688eff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
                    <path d="M80 10 L98 65 L90 105 L80 112 L70 105 L62 65 Z" fill="#253875" stroke="#8fb0ff" stroke-width="2" />
                    <polygon points="80,26 88,52 80,60 72,52" fill="#60a5fa" stroke="#bae6fd" stroke-width="1.5" opacity="0.9" />
                    <circle cx="80" cy="12" r="3.5" fill="#93c5fd" />
                    <rect x="74" y="108" width="12" height="6" rx="2" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5" />
                  </svg>

                  <!-- Efek Api Pendorong -->
                  <div class="thruster-exhaust" :class="activeAction">
                    <div class="flame-core" />
                    <div class="flame-glow" />
                  </div>

                  <!-- Rem Pendorong Balik -->
                  <div v-if="activeAction === 'brake'" class="brake-plumes">
                    <span class="bp left" />
                    <span class="bp right" />
                  </div>
                </div>

                <div class="grid-cross" />
              </div>

              <!-- Bar Status Aksi Aktif -->
              <div class="stage-status" :class="activeAction">
                <span class="status-ic">
                  <UiIcon :name="activeAction === 'turbo' ? 'kilat' : activeAction === 'brake' ? 'silang' : activeAction === 'stop' ? 'tutup' : 'target'" :size="16" />
                </span>
                <span class="status-text">{{ actionStatus }}</span>
              </div>
            </div>
          </div>

          <!-- KOLOM KANAN: PENJELASAN KONTROL & TOMBOL UJI -->
          <div class="info-col">
            <div class="step-tag">05 / 05 — SIMULASI KOKPIT</div>
            <h1 class="briefing-title">Uji Kendali Pesawat</h1>
            <p class="briefing-lead">Tekan tombol pada keyboard nyata atau klik tombol di bawah untuk menguji respons fisik pesawat demo sebelum meluncur.</p>

            <div class="ctrl-testing-panel">
              <!-- Baris Arah Hidung -->
              <div class="ctrl-subgroup">
                <span class="ctrl-sublabel">Arah Hidung (Pitch &amp; Yaw)</span>
                <div class="wasd-layout">
                  <div class="key-center">
                    <button
                      type="button"
                      class="test-key"
                      :class="{ active: activeAction === 'up' }"
                      @pointerdown="setAction('up')"
                      @pointerup="clearAction('up')"
                      @pointerleave="clearAction('up')"
                    >
                      <b class="kbd">{{ k('up') }}</b>
                      <small>Naik</small>
                    </button>
                  </div>
                  <div class="key-row">
                    <button
                      type="button"
                      class="test-key"
                      :class="{ active: activeAction === 'left' }"
                      @pointerdown="setAction('left')"
                      @pointerup="clearAction('left')"
                      @pointerleave="clearAction('left')"
                    >
                      <b class="kbd">{{ k('left') }}</b>
                      <small>Kiri</small>
                    </button>
                    <button
                      type="button"
                      class="test-key"
                      :class="{ active: activeAction === 'down' }"
                      @pointerdown="setAction('down')"
                      @pointerup="clearAction('down')"
                      @pointerleave="clearAction('down')"
                    >
                      <b class="kbd">{{ k('down') }}</b>
                      <small>Turun</small>
                    </button>
                    <button
                      type="button"
                      class="test-key"
                      :class="{ active: activeAction === 'right' }"
                      @pointerdown="setAction('right')"
                      @pointerup="clearAction('right')"
                      @pointerleave="clearAction('right')"
                    >
                      <b class="kbd">{{ k('right') }}</b>
                      <small>Kanan</small>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Baris Daya Dorong & Rem -->
              <div class="ctrl-subgroup">
                <span class="ctrl-sublabel">Daya Dorong &amp; Rem</span>
                <div class="speed-grid">
                  <button
                    type="button"
                    class="test-key-wide hl"
                    :class="{ active: activeAction === 'forward' }"
                    @pointerdown="setAction('forward')"
                    @pointerup="clearAction('forward')"
                    @pointerleave="clearAction('forward')"
                  >
                    <b class="kbd">{{ k('forward') }}</b>
                    <span>Maju / Gas</span>
                  </button>
                  <button
                    type="button"
                    class="test-key-wide turbo"
                    :class="{ active: activeAction === 'turbo' }"
                    @pointerdown="setAction('turbo')"
                    @pointerup="clearAction('turbo')"
                    @pointerleave="clearAction('turbo')"
                  >
                    <b class="kbd">{{ k('turbo') }}</b>
                    <span>Turbo</span>
                  </button>
                  <button
                    type="button"
                    class="test-key-wide"
                    :class="{ active: activeAction === 'brake' }"
                    @pointerdown="setAction('brake')"
                    @pointerup="clearAction('brake')"
                    @pointerleave="clearAction('brake')"
                  >
                    <b class="kbd">{{ k('brake') }}</b>
                    <span>Rem</span>
                  </button>
                  <button
                    type="button"
                    class="test-key-wide"
                    :class="{ active: activeAction === 'stop' }"
                    @pointerdown="setAction('stop')"
                    @pointerup="clearAction('stop')"
                    @pointerleave="clearAction('stop')"
                  >
                    <b class="kbd sp">{{ k('stop') }}</b>
                    <span>Berhenti</span>
                  </button>
                </div>
              </div>

              <!-- Baris Kontrol Kamera Bebas -->
              <div class="ctrl-subgroup">
                <span class="ctrl-sublabel">Kamera Bebas (Free-Look POV)</span>
                <div class="cam-hint-grid">
                  <div class="cam-hint-item">
                    <b class="kbd">Klik Kiri 1&times;</b>
                    <span>Atur POV Kamera Bebas</span>
                  </div>
                  <div class="cam-hint-item">
                    <b class="kbd">Klik Kanan 1&times; / Klik Kiri 2&times;</b>
                    <span>Keluar &amp; Luruskan Kamera</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- NAVIGASI BAWAH 1 BARIS TERPADU -->
      <footer class="bottom-bar">
        <!-- KIRI: TOMBOL SEBELUMNYA (TERSEMBUNYI VISUAL PADA SLIDE 1 AGAR SIMETRIS) -->
        <button
          type="button"
          class="btn nav-btn nav-btn-prev"
          :class="{ 'hidden-step': slide <= 1 }"
          :aria-hidden="slide <= 1"
          :tabindex="slide <= 1 ? -1 : 0"
          @click="prevSlide"
        >
          <UiIcon name="kembali" :size="16" /> Sebelumnya
        </button>

        <!-- TENGAH: INDIKATOR 5 GARIS PROGRES RAMPING -->
        <div class="progress-track" role="tablist" aria-label="Navigasi slide">
          <button
            v-for="s in TOTAL_SLIDES"
            :key="s"
            type="button"
            class="progress-bar-seg"
            :class="{ active: slide === s }"
            :aria-label="`Buka slide ${s}`"
            @click="slide = s"
          />
        </div>

        <!-- KANAN: TOMBOL AKSI UTAMA TUNGGAL (BERIKUTNYA / MULAI TERBANG) -->
        <div class="action-slot">
          <button
            v-if="slide < TOTAL_SLIDES"
            type="button"
            class="btn primary nav-btn nav-btn-next"
            @click="nextSlide"
          >
            Berikutnya <UiIcon name="lanjut" :size="16" />
          </button>

          <!-- Slide 5: Satu tombol Mulai Terbang Terpadu -->
          <template v-else>
            <button
              v-if="!store.ready"
              type="button"
              class="btn primary nav-btn nav-btn-next loading"
              disabled
            >
              <span class="mini-spinner" /> Memuat 3D ({{ Math.round(store.loading.p * 100) }}%)
            </button>
            <button
              v-else
              type="button"
              class="btn primary nav-btn nav-btn-next ready-pulse"
              @click="start"
            >
              Mulai Terbang <UiIcon name="putar" :size="16" />
            </button>
          </template>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.guide{position:fixed;inset:0;z-index:40;display:grid;place-items:center;overflow-y:auto;padding:calc(18px + var(--safe-t)) 28px calc(28px + var(--safe-b));
  background:radial-gradient(ellipse at 50% 0%,#131c44 0%,#080e26 55%,#040716 100%)}
.wrap{width:min(1040px,100%);display:flex;flex-direction:column;gap:18px}

/* HEADER MINIMAL & BERSIH */
.head{display:flex;align-items:center;justify-content:space-between;padding-bottom:4px}
.skip-link{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:500;color:var(--muted);background:transparent;padding:6px 12px;border-radius:8px;transition:all .15s}
.skip-link:hover{color:var(--text);background:rgba(255,255,255,.05)}
.skip-link.ready{color:var(--sky)}
.skip-loading{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;color:var(--faint)}
.dot-pulse{width:7px;height:7px;border-radius:50%;background:var(--sky);animation:pulseDot 1.2s infinite}
@keyframes pulseDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}

/* VIEWPORT & GRID 2 KOLOM (GAYA BRIEFING GAME) */
.slide-viewport{min-height:430px;display:flex;flex-direction:column;justify-content:center}
.briefing-grid{display:grid;grid-template-columns:1.15fr 1fr;gap:40px;align-items:center}
.fade-in{animation:fadeInBriefing .25s ease-out}
@keyframes fadeInBriefing{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* KOLOM KIRI: BINGKAI VISUAL GAMBAR */
.visual-col{display:flex;flex-direction:column;justify-content:center}
.visual-frame{position:relative;width:100%;aspect-ratio:16 / 10;border-radius:18px;overflow:hidden;border:1px solid var(--line);background:var(--surface);box-shadow:0 12px 36px rgba(0,0,0,.5)}
.visual-img{width:100%;height:100%;object-fit:cover;display:block}
.visual-img.shot{position:absolute;inset:0;opacity:0;transform:scale(1.045);transition:opacity .7s ease,transform 6s ease-out}
.visual-img.shot.on{opacity:1;transform:scale(1)}
.sub-dots{position:absolute;left:0;right:0;bottom:6px;z-index:3;display:flex;justify-content:center;gap:2px}
.sub-dot{background:none;border:0;padding:14px 8px;cursor:pointer;border-radius:10px}
.sub-dot:focus-visible{outline:2px solid var(--sky);outline-offset:-4px}
.sub-bar{display:block;width:38px;height:4px;border-radius:99px;background:rgba(255,255,255,.28);overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.sub-dot:hover .sub-bar{background:rgba(255,255,255,.45)}
.sub-fill{display:block;height:100%;width:100%;border-radius:inherit;background:#fff;transform-origin:left;animation:subFill 4.8s linear forwards}
.sub-fill.hold{animation-play-state:paused}
.sub-fill.still{animation:none}
@keyframes subFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* TAMPILAN CADANGAN (PLACEHOLDER) SEBELUM GAMBAR DITARUH */
.visual-placeholder{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,#162354 0%,#0c1433 100%);padding:20px;text-align:center}
.ph-glow{position:absolute;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.25) 0%,transparent 70%);pointer-events:none}
.ph-content{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;z-index:2}
.ph-icon{width:80px;height:80px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.15);border:1px solid rgba(148,174,255,.2);color:var(--sky);box-shadow:0 0 24px rgba(59,130,246,.3)}
.ph-icon.star-ph{background:rgba(234,179,8,.15);border-color:rgba(234,179,8,.3);color:var(--star);box-shadow:0 0 24px rgba(234,179,8,.3)}
.ph-title{font-family:var(--display);font-size:16px;color:var(--text);font-weight:500}

/* KOLOM KANAN: PENJELASAN BERSIH & LEGA */
.info-col{display:flex;flex-direction:column;gap:12px}
.step-tag{font-size:11.5px;font-weight:600;color:var(--sky);letter-spacing:.08em;text-transform:uppercase}
.briefing-title{font-family:var(--display);font-size:clamp(26px,3vw,34px);font-weight:600;color:var(--text);line-height:1.15;margin:0}
.briefing-lead{font-size:15px;color:var(--muted);line-height:1.55;margin:0 0 4px}

/* DAFTAR 3 POIN FITUR VERTIKAL BERSIH DENGAN PENANDA ANGKA MODERN */
.points-list{display:flex;flex-direction:column;gap:14px}
.point-item{display:flex;align-items:flex-start;gap:12px;width:100%;text-align:left;background:none;border:1px solid transparent;color:inherit;font:inherit;padding:8px 10px;margin:-8px -10px;border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s}
.point-item:hover{background:rgba(148,174,255,.05)}
.point-item:focus-visible{outline:2px solid var(--sky);outline-offset:2px}
.point-item.on{background:rgba(59,130,246,.09);border-color:rgba(96,165,250,.28)}
.point-item.on .pt-badge{background:#3b82f6;border-color:#3b82f6;color:#fff}
.point-item.on .pt-title{color:#fff}
.pt-badge{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;background:rgba(59,130,246,.08);border:1px solid rgba(148,174,255,.16);font-size:12px;font-weight:500;color:#60a5fa;letter-spacing:.02em;flex:none;margin-top:2px}
.pt-text{display:flex;flex-direction:column;gap:2px}
.pt-title{font-family:var(--display);font-size:14.5px;font-weight:500;color:var(--text)}
.pt-desc{display:block;font-size:13px;color:var(--muted);line-height:1.45;margin:0}

/* SLIDE 5: PANGGUNG SIMULATOR 3D & KONTROLER */
.stage-frame{background:#080e24;display:flex;flex-direction:column}
.stage-sky{position:relative;flex:1;min-height:220px;background:radial-gradient(circle at 50% 50%,#11193d 0%,#080d22 100%);display:grid;place-items:center;overflow:hidden;perspective:600px}
.grid-cross{position:absolute;inset:0;background-image:linear-gradient(rgba(148,174,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(148,174,255,.05) 1px,transparent 1px);background-size:24px 24px;pointer-events:none}

/* Garis bintang / warp speed lines */
.warp-lines{position:absolute;inset:0;pointer-events:none}
.star-line{position:absolute;width:2px;height:14px;background:rgba(255,255,255,.3);border-radius:999px;opacity:0}
.star-line.l1{top:15%;left:22%}
.star-line.l2{top:30%;right:18%}
.star-line.l3{top:60%;left:12%}
.star-line.l4{top:75%;right:26%}
.star-line.l5{top:20%;left:75%}
.star-line.l6{top:80%;left:50%}

.warp-lines.forward .star-line{opacity:.7;animation:warpSpeed .5s linear infinite}
.warp-lines.turbo .star-line{opacity:1;height:38px;background:linear-gradient(to bottom,rgba(255,255,255,.9),rgba(59,130,246,.8));animation:warpSpeed .2s linear infinite}
@keyframes warpSpeed{0%{transform:translateY(-80px);opacity:0}50%{opacity:1}100%{transform:translateY(180px);opacity:0}}

/* Model Pesawat Demo */
.demo-ship-box{position:relative;width:115px;height:100px;display:grid;place-items:center;transition:transform .18s ease-out;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
.demo-svg{width:100%;height:100%}

/* Respons Transformasi */
.demo-ship-box.up{transform:rotateX(-18deg) translateY(-10px) scale(1.02)}
.demo-ship-box.down{transform:rotateX(18deg) translateY(10px) scale(.98)}
.demo-ship-box.left{transform:rotateZ(-16deg) rotateY(-14deg) translateX(-14px)}
.demo-ship-box.right{transform:rotateZ(16deg) rotateY(14deg) translateX(14px)}
.demo-ship-box.forward{transform:translateY(-4px) scale(1.02)}
.demo-ship-box.turbo{transform:translateY(-8px) scale(1.06)}
.demo-ship-box.brake{transform:translateY(4px) scale(.98)}
.demo-ship-box.stop{transform:none}

/* Api Pendorong */
.thruster-exhaust{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
.flame-core{width:10px;height:18px;border-radius:999px;background:#60a5fa;box-shadow:0 0 12px #3b82f6;opacity:.5;transition:all .15s}
.flame-glow{width:22px;height:26px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.6) 0%,transparent 70%);opacity:.3;margin-top:-14px}

.thruster-exhaust.forward .flame-core{height:34px;opacity:1;background:#93c5fd;box-shadow:0 0 20px #3b82f6;animation:flicker .08s infinite alternate}
.thruster-exhaust.turbo .flame-core{width:16px;height:52px;opacity:1;background:#fff;box-shadow:0 0 32px #60a5fa,0 0 50px #eab308;animation:flicker .05s infinite alternate}
.thruster-exhaust.turbo .flame-glow{width:40px;height:40px;opacity:.8}
.thruster-exhaust.brake .flame-core{height:8px;opacity:.2;background:#f87171}
.thruster-exhaust.stop .flame-core{opacity:0}

@keyframes flicker{0%{transform:scaleY(1)}100%{transform:scaleY(1.15)}}

/* Rem pendorong balik */
.brake-plumes{position:absolute;top:28px;left:0;right:0;pointer-events:none}
.bp{position:absolute;width:12px;height:5px;border-radius:999px;background:#f87171;box-shadow:0 0 8px #ef4444}
.bp.left{left:4px;transform:rotate(-45deg)}
.bp.right{right:4px;transform:rotate(45deg)}

/* Bar status panggung */
.stage-status{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--surface-2);border-top:1px solid var(--line);font-size:12.5px;color:var(--muted)}
.stage-status.forward,.stage-status.turbo{color:#93c5fd}
.stage-status.brake{color:#fca5a5}
.stage-status.stop{color:#fde047}
.status-ic{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.2);color:var(--sky);flex:none}
.stage-status.brake .status-ic{background:rgba(239,68,68,.2);color:#f87171}
.stage-status.turbo .status-ic{background:rgba(234,179,8,.2);color:var(--star)}

/* PANEL KONTROL KANAN DI SLIDE 5 */
.ctrl-testing-panel{display:flex;flex-direction:column;gap:10px;margin-top:2px}
.ctrl-subgroup{display:flex;flex-direction:column;gap:6px}
.ctrl-sublabel{font-size:11px;font-weight:600;color:var(--sky);letter-spacing:.05em;text-transform:uppercase}
.wasd-layout{display:flex;flex-direction:column;gap:5px;align-items:center}
.key-center{display:flex;justify-content:center}
.key-row{display:flex;gap:6px}

.test-key{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 12px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line-2);border-bottom-width:3px;cursor:pointer;transition:transform .08s,background .12s}
.test-key:hover{background:rgba(59,130,246,.2)}
.test-key:active,.test-key.active{transform:translateY(2px);background:var(--blue);border-color:var(--blue-d);color:#fff}
.test-key .kbd{font-size:13.5px;min-width:30px;height:22px;border:none;background:transparent;box-shadow:none}
.test-key small{font-size:10px;color:var(--muted)}
.test-key.active small{color:#fff}

.speed-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.test-key-wide{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:9px;background:var(--surface-2);border:1px solid var(--line-2);border-bottom-width:3px;cursor:pointer;font-size:12.5px;font-weight:500;color:var(--text);transition:transform .08s,background .12s}
.test-key-wide:hover{background:rgba(59,130,246,.2)}
.test-key-wide:active,.test-key-wide.active{transform:translateY(2px);background:var(--blue);border-color:var(--blue-d);color:#fff}
.test-key-wide.hl{border-color:rgba(59,130,246,.45)}
.test-key-wide.turbo.active{background:linear-gradient(135deg,#3b82f6,#eab308)}
.test-key-wide .kbd{min-width:42px;height:22px;font-size:11.5px;border:none;background:rgba(0,0,0,.25);box-shadow:none}
.test-key-wide .kbd.sp{min-width:50px}

.cam-hint-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cam-hint-item{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:var(--surface-2);border:1px solid var(--line-2);font-size:11.5px;color:var(--text);min-width:0}
.cam-hint-item .kbd{font-size:10px;text-align:center;height:22px;line-height:22px;padding:0 6px;border:none;background:rgba(0,0,0,.35);color:#93c5fd;border-radius:5px;flex:none;white-space:nowrap}
.cam-hint-item span{color:var(--muted);font-size:11px;line-height:1.2}

/* NAVIGASI BAWAH 1 BARIS TERPADU */
.bottom-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding-top:16px}
.nav-btn{height:42px;min-height:42px;min-width:120px;padding:0 20px;border-radius:10px !important;font-size:14px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:8px;box-shadow:none;transition:all .15s ease;cursor:pointer}
.nav-btn-prev{background:rgba(255,255,255,.04);border:1px solid rgba(148,174,255,.2);color:rgba(241,244,255,.9)}
.nav-btn-prev:hover{background:rgba(255,255,255,.08);border-color:rgba(148,174,255,.35);color:#fff}
.nav-btn-prev.hidden-step{visibility:hidden;pointer-events:none}
.nav-btn-next{background:var(--blue);color:#ffffff;border:none;box-shadow:0 4px 14px rgba(37,99,235,.4)}
.nav-btn-next:hover{filter:brightness(1.12)}

/* Indikator Garis Progres Ramping */
.progress-track{display:flex;align-items:center;gap:8px}
.progress-bar-seg{width:12px;height:4px;border-radius:4px;background:rgba(148,174,255,.24);border:none;padding:0;cursor:pointer;transition:all .25s ease}
.progress-bar-seg:hover{background:rgba(148,174,255,.45)}
.progress-bar-seg.active{width:32px;height:4px;border-radius:4px;background:#3b82f6;box-shadow:0 0 8px rgba(59,130,246,.5)}

/* Slot Kanan Navigasi */
.action-slot{display:flex;align-items:center;justify-content:flex-end}
.nav-btn.ready-pulse{animation:readyPulse 1.8s infinite}
@keyframes readyPulse{0%,100%{box-shadow:0 0 0 rgba(59,130,246,0)}50%{box-shadow:0 0 16px rgba(59,130,246,.6)}}
.mini-spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .8s linear infinite;display:inline-block;margin-right:6px}
@keyframes spin{to{transform:rotate(360deg)}}

@media (max-width:860px){
  .wrap{gap:14px}
  .briefing-grid{grid-template-columns:1fr;gap:20px}
  .visual-frame{aspect-ratio:16 / 9;max-height:220px}
  .stage-sky{min-height:180px}
  .briefing-title{font-size:24px}
  .cam-hint-grid{grid-template-columns:1fr}
  .bottom-bar{flex-wrap:wrap;justify-content:center;gap:12px}
  .bottom-bar .nav-btn{flex:1 1 120px}
  .progress-track{order:-1;width:100%;justify-content:center}
}
</style>

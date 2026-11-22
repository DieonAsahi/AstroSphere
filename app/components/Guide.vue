<script setup>
// Onboarding interaktif 5 slide dengan simulator kendali demo pesawat langsung.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';

const TOTAL_SLIDES = 5;
const slide = ref(1);

const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id) => keyLabel(km.value[id]?.[0]);

// ---- State simulator pesawat interaktif (Slide 5) ----
const activeAction = ref('');
const actionStatus = ref('Siap Menerima Input — Tekan tombol keyboard atau klik tombol di kiri');

function setAction(act) {
  activeAction.value = act;
  switch (act) {
    case 'forward':
      actionStatus.value = 'Menekan Enter: Pendorong Maju Aktif (Kecepatan Naik)';
      break;
    case 'turbo':
      actionStatus.value = 'Menekan Shift: Pendorong Turbo Aktif (Kecepatan Maksimal)!';
      break;
    case 'brake':
      actionStatus.value = 'Menekan Ctrl: Rem Pendorong Balik Aktif!';
      break;
    case 'stop':
      actionStatus.value = 'Menekan Spasi: Pesawat Berhenti Seketika di Tempat!';
      break;
    case 'up':
      actionStatus.value = 'Menekan W: Hidung Naik (Pitch Up)';
      break;
    case 'down':
      actionStatus.value = 'Menekan S: Hidung Turun (Pitch Down)';
      break;
    case 'left':
      actionStatus.value = 'Menekan A: Belok Kiri (Yaw & Banking Roll)';
      break;
    case 'right':
      actionStatus.value = 'Menekan D: Belok Kanan (Yaw & Banking Roll)';
      break;
    default:
      actionStatus.value = 'Siap Menerima Input — Tekan tombol keyboard atau klik tombol di kiri';
  }
}

function clearAction(act) {
  if (!act || activeAction.value === act) {
    activeAction.value = '';
    actionStatus.value = 'Siap Menerima Input — Tekan tombol keyboard atau klik tombol di kiri';
  }
}

function start() {
  if (!store.ready) return;
  store.settings.tutorialSeen = true;
  game()?.startGame(store.startFromSave);
}

function skip() {
  if (store.ready) {
    start();
  } else {
    slide.value = TOTAL_SLIDES;
  }
}

function nextSlide() {
  if (slide.value < TOTAL_SLIDES) slide.value++;
  else if (store.ready) start();
}

function prevSlide() {
  if (slide.value > 1) slide.value--;
}

function retry() {
  store.loading.error = '';
  game()?.boot();
}

// Tangkap tombol keyboard nyata untuk demonstrasi interaktif
function onKeyDown(e) {
  if (store.modal) return;

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
    else if (['ShiftLeft', 'ShiftRight'].includes(e.code)) { e.preventDefault(); setAction('turbo'); }
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
    else if (['ShiftLeft', 'ShiftRight'].includes(e.code)) clearAction('turbo');
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
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
});
</script>

<template>
  <div class="guide">
    <div class="wrap">
      <!-- HEADER ONBOARDING -->
      <header class="head">
        <button class="ib sm" aria-label="Kembali ke beranda" @click="store.phase = 'splash'">
          <UiIcon name="kembali" :size="20" />
        </button>
        <div class="head-titles">
          <div class="step-badge">Slide {{ slide }} dari {{ TOTAL_SLIDES }}</div>
          <h1 class="h2">Panduan Penjelajahan</h1>
        </div>
        <button class="btn ghost sm skip-btn" @click="skip">
          {{ store.ready ? 'Lewati & Mulai' : 'Lewati' }} <UiIcon name="lanjut" :size="16" />
        </button>
      </header>

      <!-- KONTEN 5 SLIDE INTERAKTIF -->
      <main class="slide-viewport">
        <!-- SLIDE 1: JELAJAH TATA SURYA 3D -->
        <section v-if="slide === 1" class="slide-content fade-in">
          <div class="hero-box">
            <span class="hero-ico"><UiIcon name="planet" :size="36" /></span>
            <h2 class="slide-title">Jelajah Bebas Tata Surya 3D</h2>
            <p class="slide-lead">Kendalikan pesawat antariksamu mengarungi Matahari, 8 planet, dan Bulan dengan perhitungan orbit astronomis yang akurat.</p>
          </div>
          <div class="feature-grid">
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="orbit" :size="22" /></span>
              <div class="f-txt">
                <b>Navigasi 3D Tanpa Batas</b>
                <small>Terbang ke mana pun di seluruh tata surya. Pesawat otomatis melambat aman saat memasuki orbit planet.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="peta" :size="22" /></span>
              <div class="f-txt">
                <b>Peta Sistem &amp; Autopilot</b>
                <small>Buka peta (tombol <b>M</b>) untuk melihat koordinat seluruh planet dan meluncur otomatis ke tujuan.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="mata" :size="22" /></span>
              <div class="f-txt">
                <b>Kamera Kokpit &amp; Pandangan Bebas</b>
                <small>Tekan <b>V</b> untuk berganti antara kamera belakang dan kokpit. Seret layar untuk melihat pemandangan antariksa.</small>
              </div>
            </div>
          </div>
        </section>

        <!-- SLIDE 2: LINI MASA SEJARAH & FENOMENA SAINS -->
        <section v-if="slide === 2" class="slide-content fade-in">
          <div class="hero-box">
            <span class="hero-ico"><UiIcon name="fenomena" :size="36" /></span>
            <h2 class="slide-title">Lini Masa Sejarah &amp; Laboratorium Fenomena</h2>
            <p class="slide-lead">Setiap planet menyimpan jejak sejarah peradaban manusia serta laboratorium fenomena astronomi interaktif.</p>
          </div>
          <div class="feature-grid">
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="info" :size="22" /></span>
              <div class="f-txt">
                <b>Titik Sejarah (POI) 6 Zaman</b>
                <small>Jelajahi titik sejarah di permukaan Bumi, Bulan, dan Mars dari era kuno, teleskopik, hingga era antariksa modern.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="matahari" :size="22" /></span>
              <div class="f-txt">
                <b>Laboratorium Fenomena Langit</b>
                <small>Pelajari sains gerhana Matahari &amp; Bulan, perputaran musim di Saturnus, dan rotasi ekstrem di Jupiter secara nyata.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="jurnal" :size="22" /></span>
              <div class="f-txt">
                <b>Jurnal Penjelajah Otomatis</b>
                <small>Setiap planet dan sabuk asteroid yang kamu kunjungi otomatis tersimpan menjadi kartu koleksi di Jurnal pribadimu.</small>
              </div>
            </div>
          </div>
        </section>

        <!-- SLIDE 3: KUIS PLANET & MISI KISAH NYATA -->
        <section v-if="slide === 3" class="slide-content fade-in">
          <div class="hero-box">
            <span class="hero-ico star-ico"><UiIcon name="bintang" :size="36" /></span>
            <h2 class="slide-title">Uji Pengetahuan &amp; Misi Kisah Nyata</h2>
            <p class="slide-lead">Kumpulkan Bintang prestasi lewat kuis sains dan jalankan misi penyelamatan sejarah berisiko tinggi.</p>
          </div>
          <div class="feature-grid">
            <div class="feat-card">
              <span class="f-ico star-f"><UiIcon name="bintang" :size="22" /></span>
              <div class="f-txt">
                <b>Kuis Sains Per Planet</b>
                <small>Jawab 3 tantangan astronomi di tiap destinasi. Raih hingga 50 Bintang per jawaban benar tanpa penalti jika salah.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="kilat" :size="22" /></span>
              <div class="f-txt">
                <b>Misi Apollo 13 (1970)</b>
                <small>Tangani insiden ledakan tangki oksigen, kendalikan LEM, dan pandu ketiga astronaut pulang dengan selamat ke Bumi.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="info" :size="22" /></span>
              <div class="f-txt">
                <b>Misi Mars Climate Orbiter (1999)</b>
                <small>Investigasi misteri perbedaan satuan metrik (Newton) vs imperial (Pound) sebelum wahana terbakar di atmosfer Mars.</small>
              </div>
            </div>
          </div>
        </section>

        <!-- SLIDE 4: HANGGAR & ARMADA PESAWAT -->
        <section v-if="slide === 4" class="slide-content fade-in">
          <div class="hero-box">
            <span class="hero-ico"><UiIcon name="hanggar" :size="36" /></span>
            <h2 class="slide-title">Hanggar &amp; Peningkatan Armada</h2>
            <p class="slide-lead">Gunakan Bintang yang telah kamu kumpulkan untuk membuka pesawat antariksa dengan spesifikasi lebih tinggi.</p>
          </div>
          <div class="feature-grid">
            <div class="feat-card">
              <span class="f-ico"><UiIcon name="pesawat" :size="22" /></span>
              <div class="f-txt">
                <b>Astra Scout (Pesawat Awal)</b>
                <small>Pesawat penjelajah standar yang lincah dan seimbang. Sangat mudah dikendalikan untuk latihan navigasi dasar.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico star-f"><UiIcon name="kilat" :size="22" /></span>
              <div class="f-txt">
                <b>Orion Glider (300 Bintang)</b>
                <small>Pesawat sayap sapuan berkecepatan jelajah tinggi. Cocok untuk menyeberangi jarak jauh antarplanet luar.</small>
              </div>
            </div>
            <div class="feat-card">
              <span class="f-ico star-f"><UiIcon name="bintang" :size="22" /></span>
              <div class="f-txt">
                <b>Nova Voyager (700 Bintang)</b>
                <small>Pesawat penjelajah antarbintang berakselerasi turbo ekstrem dan ketahanan perisai radiasi ganda.</small>
              </div>
            </div>
          </div>
        </section>

        <!-- SLIDE 5: UJI COBA KONTROLER LANGSUNG (SIMULATOR DEMO 2 KOLOM) -->
        <section v-if="slide === 5" class="slide-content fade-in slide-demo">
          <div class="demo-split">
            <!-- SISI KIRI: TOMBOL KONTROL INTERAKTIF -->
            <div class="demo-controls card flat">
              <div class="ctrl-header">
                <b>Uji Coba Kontroler</b>
                <small>Tekan tombol di keyboard atau klik tombol di bawah:</small>
              </div>

              <!-- Baris Arah Hidung -->
              <div class="ctrl-group">
                <span class="group-label">Arah Hidung (Pitch &amp; Yaw)</span>
                <div class="keys-grid">
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

              <!-- Baris Kecepatan & Rem -->
              <div class="ctrl-group">
                <span class="group-label">Daya Dorong &amp; Rem</span>
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
            </div>

            <!-- SISI KANAN: PANGGUNG SIMULATOR PESAWAT CSS 3D -->
            <div class="demo-stage card flat">
              <div class="stage-sky" :class="activeAction">
                <!-- Garis debu antariksa dinamis -->
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
                    <!-- Sayap Pesawat -->
                    <path d="M80 15 L150 100 L125 110 L95 90 L80 95 L65 90 L35 110 L10 100 Z" fill="#1b2854" stroke="#4f75f0" stroke-width="2.5" />
                    <!-- Garis Panel Sayap -->
                    <path d="M80 30 L130 95" stroke="#688eff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
                    <path d="M80 30 L30 95" stroke="#688eff" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.6" />
                    <!-- Badan Inti Pesawat -->
                    <path d="M80 10 L98 65 L90 105 L80 112 L70 105 L62 65 Z" fill="#253875" stroke="#8fb0ff" stroke-width="2" />
                    <!-- Kaca Kokpit -->
                    <polygon points="80,26 88,52 80,60 72,52" fill="#60a5fa" stroke="#bae6fd" stroke-width="1.5" opacity="0.9" />
                    <!-- Moncong Depan -->
                    <circle cx="80" cy="12" r="3.5" fill="#93c5fd" />
                    <!-- Nosel Pendorong Belakang -->
                    <rect x="74" y="108" width="12" height="6" rx="2" fill="#0f172a" stroke="#3b82f6" stroke-width="1.5" />
                  </svg>

                  <!-- Efek Api Pendorong (Exhaust Plume) -->
                  <div class="thruster-exhaust" :class="activeAction">
                    <div class="flame-core" />
                    <div class="flame-glow" />
                  </div>

                  <!-- Efek Rem Pendorong Balik (Reverse Thruster) -->
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
        </section>
      </main>

      <!-- FOOTER: TITIK SLIDE, PROGRESS BAR & TOMBOL NAVIGASI -->
      <footer class="foot">
        <!-- Baris Progres & Navigasi Slide -->
        <div class="slide-nav-row">
          <!-- Tombol Sebelumnya -->
          <button
            type="button"
            class="btn line sm nav-btn"
            :disabled="slide <= 1"
            @click="prevSlide"
          >
            <UiIcon name="kembali" :size="16" /> Sebelumnya
          </button>

          <!-- Titik Indikator Slide (1/5 - 5/5) -->
          <div class="dots-box" role="tablist" aria-label="Nomor slide panduan">
            <button
              v-for="s in TOTAL_SLIDES"
              :key="s"
              type="button"
              class="dot-pill"
              :class="{ active: slide === s }"
              :aria-label="`Buka slide ${s}`"
              @click="slide = s"
            >
              <span class="dot-num">{{ s }}</span>
            </button>
          </div>

          <!-- Tombol Berikutnya -->
          <button
            v-if="slide < TOTAL_SLIDES"
            type="button"
            class="btn primary sm nav-btn"
            @click="nextSlide"
          >
            Berikutnya <UiIcon name="lanjut" :size="16" />
          </button>
          <button
            v-else
            type="button"
            class="btn primary sm nav-btn"
            :disabled="!store.ready"
            @click="start"
          >
            Mulai Terbang <UiIcon name="putar" :size="16" />
          </button>
        </div>

        <!-- Baris Status Muat Aset 3D -->
        <div class="load-zone">
          <template v-if="store.loading.error">
            <p class="err-text" role="alert">{{ store.loading.error }}</p>
            <button class="btn line sm" @click="retry"><UiIcon name="ulang" :size="16" /> Coba Lagi</button>
          </template>
          <template v-else-if="!store.ready">
            <div class="load-bar-box">
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: Math.round(store.loading.p * 100) + '%' }" />
              </div>
              <span class="load-label">
                {{ store.loading.text || 'Menyiapkan dunia 3D…' }} · {{ Math.round(store.loading.p * 100) }}%
              </span>
            </div>
            <button class="btn ghost sm" disabled>Memuat Aset…</button>
          </template>
          <template v-else>
            <span class="ready-badge"><UiIcon name="cek" :size="16" /> Dunia 3D Siap Terbang</span>
            <button class="btn primary lg start-action-btn" @click="start">
              <UiIcon name="putar" :size="20" /> Mulai Terbang
            </button>
          </template>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.guide{position:fixed;inset:0;z-index:40;display:grid;place-items:center;overflow-y:auto;padding:calc(20px + var(--safe-t)) 16px calc(20px + var(--safe-b));
  background:radial-gradient(ellipse at 50% 0%,#131b40 0%,#090e24 55%,#050816 100%)}
.wrap{width:min(960px,100%);display:flex;flex-direction:column;gap:18px}

/* HEADER */
.head{display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid var(--line);padding-bottom:12px}
.head-titles{display:flex;flex-direction:column;gap:2px}
.step-badge{font-size:11.5px;font-weight:600;letter-spacing:.05em;color:var(--sky);text-transform:uppercase}
.head .h2{font-size:22px;margin:0}
.skip-btn{font-size:13.5px}

/* VIEWPORT SLIDE */
.slide-viewport{min-height:360px;display:flex;flex-direction:column;justify-content:center}
.slide-content{display:flex;flex-direction:column;gap:20px}
.fade-in{animation:fadeInSlide .25s ease-out}
@keyframes fadeInSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* HERO BOX DI TIAP SLIDE */
.hero-box{text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;padding:6px 16px}
.hero-ico{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.16);color:var(--sky);margin-bottom:2px}
.hero-ico.star-ico{background:rgba(234,179,8,.16);color:var(--star)}
.slide-title{font-family:var(--display);font-size:clamp(22px,2.8vw,28px);font-weight:700;color:var(--text);margin:0}
.slide-lead{max-width:620px;font-size:15px;color:var(--muted);line-height:1.55;margin:0}

/* GRID FITUR 3 KOLOM */
.feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.feat-card{display:flex;gap:12px;padding:16px;border-radius:var(--r);background:var(--surface-2);border:1px solid var(--line);align-items:flex-start}
.f-ico{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.16);color:var(--sky);flex:none}
.f-ico.star-f{background:rgba(234,179,8,.16);color:var(--star)}
.f-txt{display:flex;flex-direction:column;gap:4px}
.f-txt b{font-family:var(--display);font-size:14.5px;color:var(--text);line-height:1.25}
.f-txt small{font-size:12.5px;color:var(--muted);line-height:1.45}

/* SLIDE 5: DEMO 2 KOLOM */
.demo-split{display:grid;grid-template-columns:1fr 1.15fr;gap:16px;align-items:stretch}
.demo-controls{padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--surface-2);border-radius:var(--r);border:1px solid var(--line)}
.ctrl-header{display:flex;flex-direction:column;gap:2px}
.ctrl-header b{font-family:var(--display);font-size:15px;color:var(--text)}
.ctrl-header small{font-size:12px;color:var(--faint)}
.ctrl-group{display:flex;flex-direction:column;gap:8px}
.group-label{font-size:11.5px;font-weight:600;color:var(--sky);letter-spacing:.04em;text-transform:uppercase}
.keys-grid{display:flex;flex-direction:column;gap:6px;align-items:center}
.key-center{display:flex;justify-content:center}
.key-row{display:flex;gap:6px}

.test-key{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;border-radius:10px;background:var(--surface-3);border:1px solid var(--line-2);border-bottom-width:3px;cursor:pointer;transition:transform .08s,background .12s}
.test-key:hover{background:rgba(59,130,246,.2)}
.test-key:active,.test-key.active{transform:translateY(2px);background:var(--blue);border-color:var(--blue-d);color:#fff}
.test-key .kbd{font-size:14px;min-width:32px;height:24px;border:none;background:transparent;box-shadow:none}
.test-key small{font-size:10.5px;color:var(--muted)}
.test-key.active small{color:#fff}

.speed-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.test-key-wide{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;background:var(--surface-3);border:1px solid var(--line-2);border-bottom-width:3px;cursor:pointer;font-size:13px;font-weight:600;color:var(--text);transition:transform .08s,background .12s}
.test-key-wide:hover{background:rgba(59,130,246,.2)}
.test-key-wide:active,.test-key-wide.active{transform:translateY(2px);background:var(--blue);border-color:var(--blue-d);color:#fff}
.test-key-wide.hl{border-color:rgba(59,130,246,.5)}
.test-key-wide.turbo.active{background:linear-gradient(135deg,#3b82f6,#eab308)}
.test-key-wide .kbd{min-width:44px;height:24px;font-size:12px;border:none;background:rgba(0,0,0,.25);box-shadow:none}
.test-key-wide .kbd.sp{min-width:54px}

/* PANGGUNG PESAWAT DEMO (SISI KANAN) */
.demo-stage{display:flex;flex-direction:column;border-radius:var(--r);background:var(--surface-2);border:1px solid var(--line);overflow:hidden}
.stage-sky{position:relative;height:260px;background:radial-gradient(circle at 50% 50%,#11193d 0%,#080d22 100%);display:grid;place-items:center;overflow:hidden;perspective:600px}
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

/* MODEL PESAWAT DEMO */
.demo-ship-box{position:relative;width:120px;height:105px;display:grid;place-items:center;transition:transform .18s ease-out;filter:drop-shadow(0 10px 18px rgba(0,0,0,.6))}
.demo-svg{width:100%;height:100%}

/* Respons Transformasi Arah Hidung */
.demo-ship-box.up{transform:rotateX(-18deg) translateY(-10px) scale(1.02)}
.demo-ship-box.down{transform:rotateX(18deg) translateY(10px) scale(.98)}
.demo-ship-box.left{transform:rotateZ(-16deg) rotateY(-14deg) translateX(-14px)}
.demo-ship-box.right{transform:rotateZ(16deg) rotateY(14deg) translateX(14px)}
.demo-ship-box.forward{transform:translateY(-4px) scale(1.02)}
.demo-ship-box.turbo{transform:translateY(-8px) scale(1.06)}
.demo-ship-box.brake{transform:translateY(4px) scale(.98)}
.demo-ship-box.stop{transform:none}

/* API PENDORONG */
.thruster-exhaust{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
.flame-core{width:10px;height:18px;border-radius:999px;background:#60a5fa;box-shadow:0 0 12px #3b82f6;opacity:.5;transition:all .15s}
.flame-glow{width:22px;height:26px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,.6) 0%,transparent 70%);opacity:.3;margin-top:-14px}

.thruster-exhaust.forward .flame-core{height:34px;opacity:1;background:#93c5fd;box-shadow:0 0 20px #3b82f6;animation:flicker .08s infinite alternate}
.thruster-exhaust.turbo .flame-core{width:16px;height:52px;opacity:1;background:#fff;box-shadow:0 0 32px #60a5fa,0 0 50px #eab308;animation:flicker .05s infinite alternate}
.thruster-exhaust.turbo .flame-glow{width:40px;height:40px;opacity:.8}
.thruster-exhaust.brake .flame-core{height:8px;opacity:.2;background:#f87171}
.thruster-exhaust.stop .flame-core{opacity:0}

@keyframes flicker{0%{transform:scaleY(1)}100%{transform:scaleY(1.15)}}

/* Rem pendorong balik (Brake Plumes) */
.brake-plumes{position:absolute;top:28px;left:0;right:0;pointer-events:none}
.bp{position:absolute;width:12px;height:5px;border-radius:999px;background:#f87171;box-shadow:0 0 8px #ef4444}
.bp.left{left:4px;transform:rotate(-45deg)}
.bp.right{right:4px;transform:rotate(45deg)}

/* BAR STATUS DI BAWAH PANGGUNG DEMO */
.stage-status{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface-3);border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
.stage-status.forward,.stage-status.turbo{color:#93c5fd}
.stage-status.brake{color:#fca5a5}
.stage-status.stop{color:#fde047}
.status-ic{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.2);color:var(--sky);flex:none}
.stage-status.brake .status-ic{background:rgba(239,68,68,.2);color:#f87171}
.stage-status.turbo .status-ic{background:rgba(234,179,8,.2);color:var(--star)}

/* FOOTER NAVIGASI */
.foot{display:flex;flex-direction:column;gap:14px;border-top:1px solid var(--line);padding-top:14px}
.slide-nav-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.nav-btn{min-width:115px}

/* Titik Indikator Slide */
.dots-box{display:flex;align-items:center;gap:8px}
.dot-pill{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--surface-2);border:1px solid var(--line);color:var(--faint);font-family:var(--display);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s}
.dot-pill:hover{background:var(--surface-3);color:var(--text)}
.dot-pill.active{background:var(--blue);border-color:var(--blue-d);color:#fff;transform:scale(1.1);box-shadow:0 0 10px rgba(59,130,246,.5)}

/* Baris Muat & Mulai */
.load-zone{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.load-bar-box{flex:1;min-width:240px;display:flex;flex-direction:column;gap:6px}
.bar-track{height:8px;border-radius:999px;background:var(--surface-3);overflow:hidden}
.bar-fill{height:100%;border-radius:999px;background:var(--blue);transition:width .25s ease}
.load-label{font-size:12px;color:var(--faint)}
.ready-badge{display:inline-flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--green)}
.start-action-btn{min-height:50px;font-size:16px}
.err-text{flex:1;color:var(--coral);font-size:13.5px}

@media (max-width:760px){
  .wrap{gap:14px}
  .feature-grid{grid-template-columns:1fr}
  .demo-split{grid-template-columns:1fr}
  .stage-sky{height:200px}
  .load-zone{flex-direction:column;align-items:stretch}
  .start-action-btn{width:100%}
  .slide-nav-row{justify-content:center;flex-wrap:wrap}
}
</style>

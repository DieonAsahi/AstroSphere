<script setup>
// Mode Planet: pesawat disembunyikan, kamera mengikuti planet yang berevolusi & berotasi.
// Kartu kanan: ringkasan singkat, 4 fakta, lalu Fenomena / Sejarah / Kuis. Fenomena tiap planet berbeda (data/phenomena.js).
// "Tebak dulu" (data/learning.js): fenomena yang belum pernah ditebak dibuka dengan pertanyaan; simulasi diputar setelah
// pemain menebak, dan jawabannya baru dibuka setelah ± 6 detik pengamatan.
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { store, game, recordPrediction } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PLANETS, MOONS } from '~/data/solarSystem.js';
import { HISTORY } from '~/data/history.js';
import { PHENOMENA } from '~/data/phenomena.js';
import { PREDICT, FACTS } from '~/data/learning.js';

const { getPlanet, getPhenomenon } = useSupabaseContent();
const p = computed(() => PLANETS.find((x) => x.id === store.focus) || MOONS.find((x) => x.id === store.focus) || PLANETS[2]);
const planetData = computed(() => getPlanet(p.value.id));
const ph = computed(() => getPhenomenon(p.value.id) || PHENOMENA[p.value.id]);
const pq = computed(() => PREDICT[p.value.id] || null);
const predicted = computed(() => !!store.progress.predict[p.value.id]);
const nf = (n, d = 1) => (n != null && Number.isFinite(+n) ? (+n).toLocaleString('id-ID', { maximumFractionDigits: d }) : (n || '—'));

// Status Bintang Misi Kontekstual
const apolloStars = computed(() => store.progress.missions?.apollo13?.stars || 0);
const mcoStars = computed(() => store.progress.missions?.mco?.stars || 0);
function launchMission(id) {
  game()?.setMode('misi', { mission: id });
}

// 6 Kotak Data Ilmiah Katalog Observasi (PLY-02)
const scientificBoxes = computed(() => {
  const pd = planetData.value || {};
  const x = p.value;
  const retro = (x.tilt || 0) > 90;
  const rotDay = x.rotationDays < 2 ? `${nf(x.rotationDays * 24)} jam` : `${nf(x.rotationDays, 1)} hari`;
  const orbYr = x.periodYears < 2 ? `${nf(x.periodYears * 365.25, 0)} hari` : `${nf(x.periodYears, 2)} tahun`;

  return [
    {
      k: 'Diameter Ekuator',
      v: pd.diameter_km ? `${nf(pd.diameter_km, 0)} km` : `${nf(x.radiusKm * 2, 0)} km`,
      sub: pd.perbandingan_bumi || (x.id === 'bumi' ? '1,00× ukuran Bumi' : `${nf((x.radiusKm * 2) / 12742, 2)}× ukuran Bumi`),
    },
    {
      k: 'Periode Rotasi',
      v: pd.periode_rotasi || rotDay,
      sub: pd.subteks_rotasi || (retro ? 'Berputar terbalik (retrograd)' : 'Searah jarum jam'),
    },
    {
      k: 'Periode Orbit',
      v: pd.periode_orbit || orbYr,
      sub: pd.subteks_orbit || 'Waktu revolusi mengitari Matahari',
    },
    {
      k: 'Kemiringan Sumbu',
      v: pd.kemiringan_sumbu || `${nf(x.tilt, 2)}°`,
      sub: 'Miring terhadap bidang orbit',
    },
    {
      k: 'Suhu Rata-Rata',
      v: pd.suhu_rata_c || '—',
      sub: pd.rentang_suhu || 'Rentang suhu permukaan',
    },
    {
      k: 'Usia Planet',
      v: pd.usia_planet || '± 4,5 miliar th',
      sub: pd.subteks_usia || 'Sejak pembentukan tata surya',
    },
  ];
});
function quiz() { store.quiz.planet = p.value.id; store.quiz.kind = 'planet'; store.quiz.stage = 'intro'; game()?.setMode('kuis'); }
function openFacts() { store.journalId = p.value.id; store.modal = 'journal'; }
function history() { store.sejarah.era = 'semua'; store.sejarah.selected = (HISTORY[p.value.id] || [])[0]?.id || null; game()?.setMode('sejarah', { body: p.value.id }); }

// ---- Tebak dulu ----
const WATCH_S = 6;
const asking = ref(false), pick = ref(null), revealed = ref(false), result = ref({ ok: false, reward: 0 }), watched = ref(0);
let timer = 0;
function resetGuess() { clearInterval(timer); timer = 0; asking.value = false; pick.value = null; revealed.value = false; watched.value = 0; }
function phenomenon() {
  if (ph.value?.lab) { store.lab.caller = 'planet'; game()?.setMode('fenomena'); return; }
  resetGuess();
  if (pq.value && !predicted.value) { asking.value = true; return; }
  game()?.pheno.start(p.value.id);
}
function choose(i) {
  asking.value = false; pick.value = i; revealed.value = false; watched.value = 0;
  game()?.click(); game()?.pheno.start(p.value.id);
  clearInterval(timer);
  timer = setInterval(() => {
    if (!store.pheno.on) { resetGuess(); return; }     // pemain menekan Selesai sebelum jawaban dibuka
    if (store.pheno.playing) watched.value += .25;
    if (watched.value >= WATCH_S) reveal();
  }, 250);
}
function reveal() {
  clearInterval(timer); timer = 0;
  result.value = recordPrediction(p.value.id, pick.value);
  revealed.value = true;
  if (result.value.ok) game()?.correct(); else game()?.wrong();
}
function skip() { resetGuess(); game()?.pheno.start(p.value.id); }
watch(() => store.focus, resetGuess);
watch(() => store.pheno.on, (on) => { if (!on && revealed.value) resetGuess(); });
onBeforeUnmount(() => clearInterval(timer));
const guessing = computed(() => pick.value != null && store.pheno.on);
const runTitle = computed(() => (guessing.value && !revealed.value ? pq.value?.q : ph.value?.title));
const stateIcon = computed(() => ({ siang: 'matahari', malam: 'bulan', panas: 'matahari', dingin: 'bulan', tipis: 'planet', selesai: 'cek' }[store.pheno.state] || 'fenomena'));

const stageEyebrow = computed(() => {
  const order = planetData.value?.urutan_planet || p.value.order;
  if (order) {
    return `Planet ke-${order} di Tata Surya`;
  }
  return `${p.value.kind} · ${p.value.id === 'matahari' ? 'Bintang Pusat' : p.value.id === 'bulan' ? 'Satelit Alami' : p.value.kind}`;
});
</script>

<template>
  <div>
    <!-- JUDUL PLANET DI KIRI ATAS (SEJAJAR RAPI DENGAN TOMBOL TERBANG LAGI) -->
    <div class="stage-title">
      <span class="stage-eyebrow">{{ stageEyebrow }}</span>
      <h1 class="h1">{{ planetData?.nama || p.name }}</h1>
    </div>

    <!-- KONTROL WAKTU DI KIRI BAWAH -->
    <div v-if="!store.pheno.on" class="stage-bottom"><PanelsTimeBar :body="p.id" /></div>
    <div v-else class="stage-bottom"><div class="card flat mini"><UiOrbitInset :body="p.id" :w="120" :h="80" /></div></div>

    <!-- CARD PANEL KANAN (DESAIN OBSERVATORIUM BERSIH & TERSTRUKTUR) -->
    <aside class="sheet card" aria-label="Tentang planet">
      <Transition name="fade" mode="out-in">
        <!-- TEBAK DULU -->
        <div v-if="asking" key="ask" class="sheet-body sheet-scroll sbody scroll">
          <UiPredictCard :q="pq" @pick="choose" />
        </div>

        <!-- INFO PLANET -->
        <div v-else-if="!store.pheno.on" key="info" class="sheet-body sheet-scroll sbody scroll">
          <!-- 1. BLOK RINGKASAN PLANET -->
          <div class="summary-card">
            <span class="section-label">RINGKASAN PLANET</span>
            <p class="desc">{{ planetData?.deskripsi_materi || p.desc }}</p>
          </div>

          <!-- KARTU AJAKAN MISI SEJARAH: APOLLO 13 (KHUSUS BULAN) -->
          <div v-if="p.id === 'bulan'" class="mission-callout apollo">
            <div class="mc-head">
              <span class="mc-icon"><UiIcon name="kilat" :size="18" /></span>
              <div class="mc-title-box">
                <span class="tag red">Misi Sejarah · 1970</span>
                <b class="mc-title">Apollo 13: Pulang dengan Selamat</b>
              </div>
            </div>
            <p class="mc-desc">Tangki oksigen meledak dalam perjalanan ke Bulan. Bantu 3 astronaut bertahan hidup dan pulang ke Bumi.</p>
            <div class="mc-actions">
              <button class="btn star block" @click="launchMission('apollo13')">
                <UiIcon name="kilat" :size="17" /> Jalankan Misi Sejarah: Apollo 13
              </button>
              <div v-if="apolloStars" class="mc-stars">
                <UiIcon v-for="n in 3" :key="n" :name="n <= apolloStars ? 'bintang' : 'bintang-o'" :size="14" :class="{ got: n <= apolloStars }" />
                <span>Skor Terbaik: {{ apolloStars }}/3 Bintang</span>
              </div>
            </div>
          </div>

          <!-- KARTU AJAKAN MISI INVESTIGASI: MARS CLIMATE ORBITER (KHUSUS MARS) -->
          <div v-if="p.id === 'mars'" class="mission-callout mco">
            <div class="mc-head">
              <span class="mc-icon mco-ic"><UiIcon name="info" :size="18" /></span>
              <div class="mc-title-box">
                <span class="tag" style="background:rgba(255,140,90,.16);color:#ff9e7a;border-color:rgba(255,140,90,.3)">Investigasi Nyata · 1999</span>
                <b class="mc-title">Mars Climate Orbiter: Misteri Satuan</b>
              </div>
            </div>
            <p class="mc-desc">Wahana hilang di Mars akibat salah konversi satuan imperial ke metrik. Selidiki penyebabnya dan ulangi sejarah!</p>
            <div class="mc-actions">
              <button class="btn star block" @click="launchMission('mco')">
                <UiIcon name="target" :size="17" /> Jalankan Misi Investigasi: MCO (1999)
              </button>
              <div v-if="mcoStars" class="mc-stars">
                <UiIcon v-for="n in 3" :key="n" :name="n <= mcoStars ? 'bintang' : 'bintang-o'" :size="14" :class="{ got: n <= mcoStars }" />
                <span>Skor Terbaik: {{ mcoStars }}/3 Bintang</span>
              </div>
            </div>
          </div>

          <!-- 2. BLOK DATA ILMIAH (Grid 2×3 — 6 Kartu Metrik) -->
          <div class="sci-section">
            <span class="section-label">DATA ILMIAH</span>
            <div class="facts grid-sci">
              <div v-for="f in scientificBoxes" :key="f.k" class="tile fact">
                <span class="f-lbl">{{ f.k }}</span>
                <b class="num">{{ f.v }}</b>
                <span v-if="f.sub" class="f-sub">{{ f.sub }}</span>
              </div>
            </div>
            <div class="sci-source">
              <UiIcon name="info" :size="12" />
              <span>Sumber data: {{ planetData?.sumber_referensi || p.sumber_referensi || 'NASA Planetary Fact Sheet' }}</span>
            </div>
          </div>

          <!-- 3. KOTAK ARAH ROTASI (PLY-02) -->
          <div v-if="planetData?.judul_rotasi" class="rot-box">
            <div class="rh"><UiIcon name="ulang" :size="15" /><b>{{ planetData.judul_rotasi }}</b></div>
            <p>{{ planetData.deskripsi_rotasi }} <span class="rot-source">— {{ planetData?.sumber_referensi || p.sumber_referensi || 'NASA' }}</span></p>
          </div>

          <!-- 4. KARTU INTERAKTIF FENOMENA -->
          <button v-if="ph && ph.is_active !== false" class="phc" :class="{ ask: pq && !predicted }" @click="phenomenon">
            <span class="ic"><UiIcon :name="pq && !predicted ? 'kuis' : 'fenomena'" :size="20" /></span>
            <span class="t">
              <small>{{ pq && !predicted ? 'Tebak dulu' : 'Fenomena' }}</small>
              <b>{{ pq && !predicted ? pq.q : ph.title }}</b>
            </span>
            <UiIcon name="putar" :size="18" />
          </button>

          <!-- 5. KARTU TAHUKAH KAMU? -->
          <button v-if="FACTS[p.id]" class="dyk" @click="openFacts">
            <UiIcon name="info" :size="18" />
            <span class="t">Tahukah kamu?<small>{{ FACTS[p.id].length }} kartu</small></span>
            <span v-if="!store.progress.cards[p.id]" class="tag star">Baru</span>
            <UiIcon name="lanjut" :size="16" />
          </button>
        </div>

        <!-- FENOMENA BERJALAN -->
        <div v-else key="ph" class="sheet-body sheet-scroll sbody scroll">
          <span class="tag blue"><UiIcon name="fenomena" :size="13" />Fenomena</span>
          <h2 class="h2">{{ runTitle }}</h2>
          <UiPredictCard v-if="guessing" :q="pq" :picked="pick" :revealed="revealed" :ok="result.ok" :reward="result.reward" :why="ph?.short" :progress="watched / WATCH_S" />
          <p v-else class="desc">{{ ph?.short }}</p>
          <div class="live" :class="store.pheno.state" aria-live="polite">
            <span class="ico"><UiIcon :name="stateIcon" :size="24" /></span>
            <div><b>{{ store.pheno.line1 || '…' }}</b><small>{{ store.pheno.line2 }}</small></div>
          </div>
          <p class="small">Waktu dipercepat {{ (ph?.mul || 1).toLocaleString('id-ID') }}×. Seret layar untuk memutar kamera.</p>
        </div>
      </Transition>

      <!-- FOOTER TOMBOL AKSI STICKY (MODERN SQUARE RADIUS 10px) -->
      <div class="sfoot">
        <template v-if="asking">
          <button class="btn-foot ghost block" @click="skip">Lewati, langsung lihat</button>
          <button class="btn-foot line block" @click="resetGuess"><UiIcon name="kembali" :size="18" />Kembali</button>
        </template>
        <template v-else-if="!store.pheno.on">
          <button v-if="ph" class="btn-foot primary block" @click="phenomenon">
            <UiIcon name="fenomena" :size="18" />Fenomena
          </button>
          <div class="row2">
            <button class="btn-foot line" @click="history">
              <UiIcon name="sejarah" :size="17" />Sejarah
            </button>
            <button class="btn-foot star" @click="quiz">
              <UiIcon name="bintang" :size="17" />Kuis
            </button>
          </div>
        </template>
        <template v-else>
          <div class="row2">
            <button class="btn-foot line" @click="game()?.pheno.toggle()">
              <UiIcon :name="store.pheno.playing ? 'jeda' : 'putar'" :size="17" />{{ store.pheno.playing ? 'Jeda' : 'Putar' }}
            </button>
            <button class="btn-foot line" @click="game()?.pheno.restart()">
              <UiIcon name="ulang" :size="17" />Ulangi
            </button>
          </div>
          <button class="btn-foot primary block success" @click="game()?.pheno.stop()">
            <UiIcon name="cek" :size="18" />Selesai
          </button>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ---------- JUDUL PLANET KIRI ATAS ---------- */
.stage-title{
  position:fixed;
  left:calc(var(--gap) + var(--safe-l));
  top:calc(var(--top) + 68px + var(--safe-t));
  z-index:21;
  display:flex;
  flex-direction:column;
  gap:0;
  max-width:min(560px, 46vw);
  pointer-events:none;
}
.stage-title>*{pointer-events:auto}
.stage-eyebrow{
  font-family:var(--display);
  font-size:11.5px;
  font-weight:600;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:#38bdf8;
  margin-bottom:6px;
  line-height:1.2;
}
.stage-title .h1{
  font-family:var(--display);
  font-size:clamp(30px, 3vw, 38px);
  font-weight:600;
  line-height:1.15;
  letter-spacing:-0.02em;
  color:#fff;
  text-shadow:0 2px 14px rgba(0, 0, 0, 0.7), 0 1px 3px rgba(0, 0, 0, 0.8);
  margin:0;
}

/* ---------- CARD PANEL KANAN (FIGMA OBSERVATORIUM STYLE) ---------- */
.sheet{
  position:fixed;
  right:calc(var(--gap) + var(--safe-r));
  top:calc(76px + var(--safe-t));
  bottom:calc(var(--gap) + var(--safe-b));
  width:min(400px, 36vw);
  z-index:22;
  display:flex;
  flex-direction:column;
  overflow:hidden;
  border-radius:14px !important;
  background:rgba(10, 14, 28, 0.92) !important;
  border:1px solid rgba(148, 174, 255, 0.16) !important;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:0 16px 40px rgba(0, 0, 0, 0.55);
}
.sheet .sheet-body,
.sheet .sheet-scroll,
.sheet .sbody{
  flex:1;
  min-height:0;
  overflow-y:auto;
  padding:18px 16px 18px;
  display:flex;
  flex-direction:column;
  gap:12px;
}
.sheet .sheet-body > *,
.sheet .sheet-scroll > *,
.sheet .sbody > *{
  flex-shrink:0;
}

/* SCROLLBAR TIPIS GELAP */
.sheet .sheet-body.scroll,
.sheet .sheet-scroll.scroll,
.sheet .sbody.scroll{
  scrollbar-width:thin;
  scrollbar-color:rgba(148, 174, 255, 0.25) transparent;
}
.sheet .sheet-body.scroll::-webkit-scrollbar,
.sheet .sheet-scroll.scroll::-webkit-scrollbar,
.sheet .sbody.scroll::-webkit-scrollbar{
  width:5px;
}
.sheet .sheet-body.scroll::-webkit-scrollbar-thumb,
.sheet .sheet-scroll.scroll::-webkit-scrollbar-thumb,
.sheet .sbody.scroll::-webkit-scrollbar-thumb{
  background:rgba(148, 174, 255, 0.25);
  border-radius:3px;
}
.sheet .sheet-body.scroll::-webkit-scrollbar-thumb:hover,
.sheet .sheet-scroll.scroll::-webkit-scrollbar-thumb:hover,
.sheet .sbody.scroll::-webkit-scrollbar-thumb:hover{
  background:rgba(148, 174, 255, 0.4);
}

/* 1. SUB-KARTU RINGKASAN PLANET */
.summary-card{
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.6);
  border:1px solid rgba(148, 174, 255, 0.12);
}
.section-label{
  font-family:var(--display);
  font-size:10.5px;
  font-weight:600;
  letter-spacing:0.08em;
  color:#94a3b8;
  text-transform:uppercase;
  line-height:1;
}
.desc{
  font-size:13.5px;
  color:#cbd5e1;
  line-height:1.55;
  margin:0;
}

/* KARTU AJAKAN MISI KONTEKSTUAL (BULAN & MARS) */
.mission-callout{
  display:flex;
  flex-direction:column;
  gap:8px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.6);
  border:1px solid rgba(148, 174, 255, 0.14);
}
.mc-head{
  display:flex;
  align-items:center;
  gap:10px;
}
.mc-icon{
  width:36px;
  height:36px;
  border-radius:8px;
  display:grid;
  place-items:center;
  background:rgba(59, 130, 246, 0.2);
  color:#38bdf8;
  flex:none;
}
.mc-icon.mco-ic{
  background:rgba(255, 140, 90, 0.18);
  color:#ff9e7a;
}
.mc-title-box{
  display:flex;
  flex-direction:column;
  gap:2px;
  min-width:0;
}
.mc-title-box .tag{
  align-self:flex-start;
  font-size:10px;
  padding:2px 6px;
  border-radius:5px;
  font-weight:500;
}
.mc-title{
  font-family:var(--display);
  font-size:13.5px;
  font-weight:600;
  color:#f8fafc;
  line-height:1.25;
}
.mc-desc{
  font-size:12px;
  color:#94a3b8;
  line-height:1.45;
  margin:0;
}
.mc-actions{
  display:flex;
  flex-direction:column;
  gap:6px;
  margin-top:2px;
}
.mc-actions .btn.star{
  border-radius:8px;
  height:36px;
  font-size:12.5px;
  font-weight:500;
  padding:0 12px;
}
.mc-stars{
  display:flex;
  align-items:center;
  gap:5px;
  font-size:11.5px;
  color:var(--star);
  justify-content:center;
}
.mc-stars .got{color:var(--star)}

/* 2. BLOK DATA ILMIAH (Grid 2×3 — 6 Kartu Metrik) */
.sci-section{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.facts.grid-sci{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
.fact{
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:5px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.65);
  border:1px solid rgba(148, 174, 255, 0.14);
  transition:border-color .15s ease, background .15s ease;
}
.fact:hover{
  background:rgba(15, 23, 42, 0.85);
  border-color:rgba(148, 174, 255, 0.28);
}
.f-lbl{
  font-family:var(--display);
  font-size:10.5px;
  font-weight:600;
  letter-spacing:0.06em;
  color:#94a3b8;
  text-transform:uppercase;
  line-height:1.25;
}
.fact b.num{
  font-family:var(--display);
  font-size:16px;
  font-weight:600;
  color:#f8fafc;
  font-variant-numeric:tabular-nums;
  line-height:1.2;
  margin:2px 0 1px;
}
.f-sub{
  font-size:11.5px;
  color:#94a3b8;
  line-height:1.38;
}
.sci-source{
  display:flex;
  align-items:center;
  gap:5px;
  font-size:11px;
  color:#64748b;
  margin-top:6px;
  padding:0 2px;
}
.sci-source span{
  line-height:1.3;
}

/* 3. KOTAK ARAH ROTASI (FIGMA CYAN ACCENT BORDER) */
.rot-box{
  display:flex;
  flex-direction:column;
  gap:5px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(12, 28, 44, 0.45);
  border:1px solid rgba(56, 189, 248, 0.22);
}
.rot-box .rh{
  display:flex;
  align-items:center;
  gap:7px;
  font-family:var(--display);
  font-weight:600;
  font-size:13.5px;
  color:#38bdf8;
}
.rot-box p{
  font-size:12.5px;
  color:#94a3b8;
  line-height:1.45;
  margin:0;
}
.rot-source{
  display:inline;
  font-size:11px;
  color:#64748b;
  margin-left:4px;
}

/* 4. KARTU INTERAKTIF FENOMENA */
.phc{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.55);
  border:1px solid rgba(148, 174, 255, 0.14);
  text-align:left;
  color:var(--text);
  cursor:pointer;
  transition:all .15s ease;
}
.phc:hover{
  background:rgba(15, 23, 42, 0.85);
  border-color:rgba(148, 174, 255, 0.3);
  transform:translateY(-1px);
}
.phc .ic{
  width:38px;
  height:38px;
  border-radius:8px;
  display:grid;
  place-items:center;
  background:rgba(59, 130, 246, 0.2);
  color:#38bdf8;
  flex:none;
}
.phc .t{
  flex:1;
  display:flex;
  flex-direction:column;
  gap:1px;
  min-width:0;
}
.phc small{
  font-size:11px;
  color:#38bdf8;
  font-weight:500;
}
.phc b{
  font-family:var(--display);
  font-weight:600;
  font-size:14px;
  color:#f8fafc;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.phc.ask{
  background:rgba(245, 158, 11, 0.1);
  border-color:rgba(245, 158, 11, 0.25);
}
.phc.ask .ic{
  background:rgba(245, 158, 11, 0.2);
  color:#fbbf24;
}
.phc.ask small{
  color:#fbbf24;
}

/* 5. KARTU TAHUKAH KAMU? */
.dyk{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.55);
  border:1px solid rgba(148, 174, 255, 0.14);
  text-align:left;
  color:var(--text);
  cursor:pointer;
  transition:all .15s ease;
}
.dyk:hover{
  background:rgba(15, 23, 42, 0.85);
  border-color:rgba(148, 174, 255, 0.3);
  transform:translateY(-1px);
}
.dyk .t{
  flex:1;
  display:flex;
  flex-direction:column;
  font-family:var(--display);
  font-weight:600;
  font-size:13.5px;
  color:#f8fafc;
}
.dyk small{
  font-family:var(--font);
  font-weight:400;
  font-size:11.5px;
  color:#94a3b8;
}
.dyk .tag.star{
  border-radius:6px;
  font-size:10px;
  padding:2px 7px;
  background:rgba(245, 158, 11, 0.16);
  border:1px solid rgba(245, 158, 11, 0.32);
  color:#fbbf24;
}

/* FENOMENA BERJALAN */
.live{
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px;
  border-radius:10px;
  background:rgba(15, 23, 42, 0.6);
  border:1px solid rgba(148, 174, 255, 0.14);
}
.live .ico{
  width:46px;
  height:46px;
  border-radius:8px;
  display:grid;
  place-items:center;
  background:rgba(59, 130, 246, 0.2);
  color:#38bdf8;
  flex:none;
}
.live.siang .ico,.live.panas .ico{background:rgba(245, 158, 11, 0.2);color:#fbbf24}
.live.malam .ico,.live.dingin .ico{background:rgba(148, 174, 255, 0.15);color:#38bdf8}
.live.tipis .ico,.live.selesai .ico{background:rgba(34, 197, 94, 0.2);color:#4ade80}
.live b{display:block;font-family:var(--display);font-weight:600;font-size:16px;line-height:1.25;color:#f8fafc}
.live small{display:block;font-size:12.5px;color:#94a3b8;margin-top:2px}
.mini{padding:8px;border-radius:10px}

/* FOOTER TOMBOL AKSI STICKY */
.sfoot{
  flex:none;
  flex-shrink:0;
  padding:14px 16px 16px;
  display:flex;
  flex-direction:column;
  gap:10px;
  border-top:1px solid rgba(148, 174, 255, 0.14);
  background:rgba(10, 14, 28, 0.96);
}
.sfoot .row2{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  width:100%;
}
.btn-foot{
  height:40px;
  min-height:40px;
  padding:0 16px;
  border-radius:10px;
  font-family:var(--display);
  font-size:13.5px;
  font-weight:500;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  cursor:pointer;
  transition:all .15s ease;
  border:1px solid transparent;
}
.btn-foot.block{
  width:100%;
}
.btn-foot.primary{
  background:#3b82f6;
  color:#ffffff;
  box-shadow:0 4px 14px rgba(59, 130, 246, 0.35);
}
.btn-foot.primary:hover{
  background:#2563eb;
  transform:translateY(-1px);
}
.btn-foot.primary.success{
  background:#16a34a;
  box-shadow:0 4px 14px rgba(22, 163, 74, 0.35);
}
.btn-foot.primary.success:hover{
  background:#15803d;
}
.btn-foot.line{
  background:rgba(148, 174, 255, 0.08);
  border:1px solid rgba(148, 174, 255, 0.18);
  color:#e2e8f0;
}
.btn-foot.line:hover{
  background:rgba(148, 174, 255, 0.16);
  border-color:rgba(148, 174, 255, 0.32);
  color:#fff;
}
.btn-foot.star{
  background:rgba(245, 158, 11, 0.12);
  border:1px solid rgba(245, 158, 11, 0.3);
  color:#fbbf24;
}
.btn-foot.star:hover{
  background:rgba(245, 158, 11, 0.22);
  border-color:rgba(245, 158, 11, 0.45);
}
.sbody .tag.blue{
  border-radius:8px !important;
  font-family:var(--display);
  font-size:11px;
  font-weight:600;
  letter-spacing:.04em;
  padding:4px 10px;
  background:rgba(59, 130, 246, 0.16);
  border:1px solid rgba(56, 189, 248, 0.3);
  color:#38bdf8;
  align-self:flex-start;
}
.btn-foot.ghost{
  border-radius:10px;
  height:40px;
  border:1px solid rgba(148, 174, 255, 0.18);
  background:rgba(148, 174, 255, 0.06);
  color:var(--text);
}
.btn-foot.ghost:hover{
  background:rgba(148, 174, 255, 0.14);
  border-color:rgba(148, 174, 255, 0.32);
  color:#fff;
}

/* RESPONSIVE LAYOUT */
@media (max-width:760px){
  .sheet{
    left:0;
    right:0;
    width:auto;
    top:auto;
    bottom:0;
    height:min(52vh, 480px);
    border-radius:16px 16px 0 0 !important;
    border-bottom:0 !important;
    padding-bottom:var(--safe-b);
  }
  .sheet::before{
    content:"";
    display:block;
    width:38px;
    height:4px;
    border-radius:999px;
    background:rgba(148, 174, 255, 0.25);
    margin:8px auto 0;
    flex:none;
  }
  .sheet .sbody{padding:12px 14px 22px;gap:10px}
  .sheet .sfoot{padding:12px 14px 14px;gap:8px}
  .stage-title{
    left:14px;
    top:calc(var(--top) + 56px + var(--safe-t));
    max-width:calc(100vw - 28px);
    gap:0;
  }
  .stage-title .h1{font-size:26px}
  .stage-bottom{left:12px;right:12px;max-width:none;bottom:calc(min(52vh, 480px) + 10px)}
  .facts.grid-sci{grid-template-columns:1fr 1fr;gap:8px}
  .fact{padding:10px 12px}
  .fact b.num{font-size:15px}
  .desc{font-size:13px}
  .mini{display:none}
}

@media (max-height: 520px) {
  .sheet {
    left: auto !important;
    right: calc(10px + var(--safe-r)) !important;
    top: calc(52px + var(--safe-t)) !important;
    bottom: calc(10px + var(--safe-b)) !important;
    width: min(360px, 46vw) !important;
    height: auto !important;
    border-radius: 14px !important;
    border-bottom: 1px solid rgba(148, 174, 255, 0.16) !important;
    padding-bottom: 0 !important;
  }
  .sheet::before {
    display: none !important;
  }
  .stage-bottom {
    bottom: calc(10px + var(--safe-b)) !important;
    max-width: calc(100vw - min(360px, 46vw) - 30px) !important;
  }
}
</style>

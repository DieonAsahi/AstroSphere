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
      icon: 'planet',
      k: 'Diameter Ekuator',
      v: pd.diameter_km ? `${nf(pd.diameter_km, 0)} km` : `${nf(x.radiusKm * 2, 0)} km`,
      sub: pd.perbandingan_bumi || (x.id === 'bumi' ? '1,00× ukuran Bumi' : `${nf((x.radiusKm * 2) / 12742, 2)}× ukuran Bumi`),
    },
    {
      icon: 'matahari',
      k: 'Periode Rotasi',
      v: pd.periode_rotasi || rotDay,
      sub: pd.subteks_rotasi || (retro ? 'Berputar terbalik (retrograd)' : 'Searah jarum jam'),
    },
    {
      icon: 'orbit',
      k: 'Periode Orbit',
      v: pd.periode_orbit || orbYr,
      sub: pd.subteks_orbit || 'Waktu revolusi mengitari Matahari',
    },
    {
      icon: 'kompas',
      k: 'Kemiringan Sumbu',
      v: pd.kemiringan_sumbu || `${nf(x.tilt, 2)}°`,
      sub: 'Miring terhadap bidang orbit',
    },
    {
      icon: 'termometer',
      k: 'Suhu Rata-Rata',
      v: pd.suhu_rata_c || '—',
      sub: pd.rentang_suhu || 'Rentang suhu permukaan',
    },
    {
      icon: 'jam',
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
</script>

<template>
  <div>
    <div class="stage-title">
      <span class="tag">{{ p.kind }} · planet ke-{{ planetData?.urutan_planet || p.order }}</span>
      <h1 class="h1">{{ planetData?.nama || p.name }}</h1>
    </div>
    <div v-if="!store.pheno.on" class="stage-bottom"><PanelsTimeBar :body="p.id" /></div>
    <div v-else class="stage-bottom"><div class="card flat mini"><UiOrbitInset :body="p.id" :w="120" :h="80" /></div></div>

    <aside class="sheet card" aria-label="Tentang planet">
      <Transition name="fade" mode="out-in">
        <!-- TEBAK DULU -->
        <div v-if="asking" key="ask" class="sbody scroll">
          <UiPredictCard :q="pq" @pick="choose" />
        </div>
        <!-- INFO PLANET -->
        <div v-else-if="!store.pheno.on" key="info" class="sbody scroll">
          <p class="desc">{{ planetData?.deskripsi_materi || p.desc }}</p>

          <!-- KARTU AJAKAN MISI SEJARAH: APOLLO 13 (KHUSUS BULAN) -->
          <div v-if="p.id === 'bulan'" class="mission-callout apollo">
            <div class="mc-head">
              <span class="mc-icon"><UiIcon name="kilat" :size="20" /></span>
              <div class="mc-title-box">
                <span class="tag red">Misi Sejarah · 1970</span>
                <b class="mc-title">Apollo 13: Pulang dengan Selamat</b>
              </div>
            </div>
            <p class="mc-desc">Tangki oksigen meledak dalam perjalanan ke Bulan. Bantu 3 astronaut bertahan hidup dan pulang ke Bumi.</p>
            <div class="mc-actions">
              <button class="btn star block" @click="launchMission('apollo13')">
                <UiIcon name="kilat" :size="18" /> Jalankan Misi Sejarah: Apollo 13
              </button>
              <div v-if="apolloStars" class="mc-stars">
                <UiIcon v-for="n in 3" :key="n" :name="n <= apolloStars ? 'bintang' : 'bintang-o'" :size="15" :class="{ got: n <= apolloStars }" />
                <span>Skor Terbaik: {{ apolloStars }}/3 Bintang</span>
              </div>
            </div>
          </div>

          <!-- KARTU AJAKAN MISI INVESTIGASI: MARS CLIMATE ORBITER (KHUSUS MARS) -->
          <div v-if="p.id === 'mars'" class="mission-callout mco">
            <div class="mc-head">
              <span class="mc-icon mco-ic"><UiIcon name="info" :size="20" /></span>
              <div class="mc-title-box">
                <span class="tag" style="background:rgba(255,140,90,.2);color:#ff9e7a">Investigasi Nyata · 1999</span>
                <b class="mc-title">Mars Climate Orbiter: Misteri Satuan</b>
              </div>
            </div>
            <p class="mc-desc">Wahana hilang di Mars akibat salah konversi satuan imperial ke metrik. Selidiki penyebabnya dan ulangi sejarah!</p>
            <div class="mc-actions">
              <button class="btn star block" @click="launchMission('mco')">
                <UiIcon name="target" :size="18" /> Jalankan Misi Investigasi: MCO (1999)
              </button>
              <div v-if="mcoStars" class="mc-stars">
                <UiIcon v-for="n in 3" :key="n" :name="n <= mcoStars ? 'bintang' : 'bintang-o'" :size="15" :class="{ got: n <= mcoStars }" />
                <span>Skor Terbaik: {{ mcoStars }}/3 Bintang</span>
              </div>
            </div>
          </div>

          <!-- 6 KOTAK DATA ILMIAH KATALOG OBSERVASI (PLY-02) -->
          <div class="facts grid-sci">
            <div v-for="f in scientificBoxes" :key="f.k" class="tile fact">
              <div class="fh"><UiIcon :name="f.icon" :size="18" /><small>{{ f.k }}</small></div>
              <b class="num">{{ f.v }}</b>
              <span v-if="f.sub" class="f-sub">{{ f.sub }}</span>
            </div>
          </div>

          <!-- KOTAK ARAH ROTASI (PLY-02) -->
          <div v-if="planetData?.judul_rotasi" class="rot-box">
            <div class="rh"><UiIcon name="ulang" :size="16" /><b>{{ planetData.judul_rotasi }}</b></div>
            <p>{{ planetData.deskripsi_rotasi }}</p>
          </div>

          <button v-if="ph && ph.is_active !== false" class="phc" :class="{ ask: pq && !predicted }" @click="phenomenon">
            <span class="ic"><UiIcon :name="pq && !predicted ? 'kuis' : 'fenomena'" :size="22" /></span>
            <span class="t"><small>{{ pq && !predicted ? 'Tebak dulu' : 'Fenomena' }}</small><b>{{ pq && !predicted ? pq.q : ph.title }}</b></span>
            <UiIcon name="putar" :size="20" />
          </button>
          <button v-if="FACTS[p.id]" class="dyk" @click="openFacts">
            <UiIcon name="info" :size="20" />
            <span class="t">Tahukah kamu?<small>{{ FACTS[p.id].length }} kartu</small></span>
            <span v-if="!store.progress.cards[p.id]" class="tag star">Baru</span>
            <UiIcon name="lanjut" :size="18" />
          </button>
        </div>
        <!-- FENOMENA BERJALAN -->
        <div v-else key="ph" class="sbody scroll">
          <span class="tag blue"><UiIcon name="fenomena" :size="14" />Fenomena</span>
          <h2 class="h2">{{ runTitle }}</h2>
          <UiPredictCard v-if="guessing" :q="pq" :picked="pick" :revealed="revealed" :ok="result.ok" :reward="result.reward" :why="ph?.short" :progress="watched / WATCH_S" />
          <p v-else class="desc">{{ ph?.short }}</p>
          <div class="live" :class="store.pheno.state" aria-live="polite">
            <span class="ico"><UiIcon :name="stateIcon" :size="26" /></span>
            <div><b>{{ store.pheno.line1 || '…' }}</b><small>{{ store.pheno.line2 }}</small></div>
          </div>
          <p class="small">Waktu dipercepat {{ (ph?.mul || 1).toLocaleString('id-ID') }}×. Seret layar untuk memutar kamera.</p>
        </div>
      </Transition>
      <div class="sfoot">
        <template v-if="asking">
          <button class="btn ghost block" @click="skip">Lewati, langsung lihat</button>
          <button class="btn line block" @click="resetGuess"><UiIcon name="kembali" :size="18" />Kembali</button>
        </template>
        <template v-else-if="!store.pheno.on">
          <button v-if="ph" class="btn primary block" @click="phenomenon"><UiIcon name="fenomena" :size="20" />Fenomena</button>
          <div class="row2">
            <button class="btn" @click="history"><UiIcon name="sejarah" :size="18" />Sejarah</button>
            <button class="btn star" @click="quiz"><UiIcon name="bintang" :size="18" />Kuis</button>
          </div>
        </template>
        <template v-else>
          <div class="row2">
            <button class="btn" @click="game()?.pheno.toggle()"><UiIcon :name="store.pheno.playing ? 'jeda' : 'putar'" :size="18" />{{ store.pheno.playing ? 'Jeda' : 'Putar' }}</button>
            <button class="btn" @click="game()?.pheno.restart()"><UiIcon name="ulang" :size="18" />Ulangi</button>
          </div>
          <button class="btn primary block" @click="game()?.pheno.stop()"><UiIcon name="cek" :size="18" />Selesai</button>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* KARTU AJAKAN MISI KONTEKSTUAL (BULAN & MARS) */
.mission-callout{display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:var(--r);background:var(--surface-2);border:1px solid var(--line);box-shadow:0 4px 18px rgba(0,0,0,.35)}
.mc-head{display:flex;align-items:center;gap:12px}
.mc-icon{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.18);color:var(--sky);flex:none}
.mc-icon.mco-ic{background:rgba(59,130,246,.18);color:var(--sky)}
.mc-title-box{display:flex;flex-direction:column;gap:3px}
.mc-title{font-family:var(--display);font-size:15px;line-height:1.25;color:var(--text)}
.mc-desc{font-size:13px;color:var(--muted);line-height:1.45;margin:0}
.mc-actions{display:flex;flex-direction:column;gap:6px}
.mc-stars{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--star);justify-content:center}
.mc-stars .got{color:var(--star)}

.desc{font-size:15px;color:var(--muted);line-height:1.6}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fact{display:flex;flex-direction:column;gap:3px;color:var(--sky);padding:12px 14px}
.fh{display:flex;align-items:center;gap:6px;color:var(--muted)}
.fh small{font-size:12px;color:var(--muted)}
.fact b{font-size:17px;font-weight: 500;color:var(--text);margin-top:2px}
.f-sub{font-size:11.5px;color:var(--faint);line-height:1.35}
.rot-box{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:var(--r);background:rgba(59,108,240,.12);border:1px solid rgba(143,176,255,.25)}
.rot-box .rh{display:flex;align-items:center;gap:8px;font-family:var(--display);font-weight: 500;font-size:14.5px;color:var(--sky)}
.rot-box p{font-size:13px;color:var(--muted);line-height:1.5}
.phc{display:flex;align-items:center;gap:12px;padding:14px;border-radius:var(--r);background:linear-gradient(120deg,rgba(59,108,240,.3),rgba(59,108,240,.08));border:1px solid rgba(143,176,255,.3);text-align:left;transition:filter .15s}
.phc:hover{filter:brightness(1.15)}
.phc .ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--blue);flex:none}
.phc .t{flex:1;display:flex;flex-direction:column}
.phc small{font-size:12.5px;color:var(--sky)}
.phc b{font-family:var(--display);font-weight: 500;font-size:16px}
.phc.ask{background:linear-gradient(120deg,rgba(255,201,71,.22),rgba(255,201,71,.05));border-color:rgba(255,201,71,.35)}
.phc.ask .ic{background:var(--star);color:#3a2a00}
.phc.ask small{color:var(--star)}
.dyk{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2);text-align:left;color:var(--star);transition:background .15s}
.dyk:hover{background:var(--surface-3)}
.dyk .t{flex:1;display:flex;flex-direction:column;font-family:var(--display);font-weight: 500;font-size:15px;color:var(--text)}
.dyk small{font-family:var(--font);font-weight:400;font-size:12.5px;color:var(--faint)}
.live{display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--r);background:var(--surface-2)}
.live .ico{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.2);color:var(--sky);flex:none;transition:background .3s,color .3s}
.live.siang .ico,.live.panas .ico{background:rgba(255,201,71,.2);color:var(--star)}
.live.malam .ico,.live.dingin .ico{background:rgba(143,176,255,.15);color:var(--sky)}
.live.tipis .ico,.live.selesai .ico{background:rgba(54,211,154,.2);color:var(--green)}
.live b{display:block;font-family:var(--display);font-weight: 500;font-size:18px;line-height:1.25}
.live small{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}
.mini{padding:8px;border-radius:var(--r)}
@media (max-width:760px){ .facts{grid-template-columns:1fr 1fr} .fact b{font-size:16px} .desc{font-size:14px} .mini{display:none} }
</style>

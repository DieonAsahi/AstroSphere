<script setup>
// Mode Planet: pesawat disembunyikan, kamera mengikuti planet yang berevolusi & berotasi.
// Kartu kanan: ringkasan singkat, 4 fakta, lalu Fenomena / Sejarah / Kuis. Fenomena tiap planet berbeda (data/phenomena.js).
// "Tebak dulu" (data/learning.js): fenomena yang belum pernah ditebak dibuka dengan pertanyaan; simulasi diputar setelah
// pemain menebak, dan jawabannya baru dibuka setelah ± 6 detik pengamatan.
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { store, game, recordPrediction } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
import { HISTORY } from '~/data/history.js';
import { PHENOMENA } from '~/data/phenomena.js';
import { PREDICT, FACTS } from '~/data/learning.js';
const p = computed(() => PLANETS.find((x) => x.id === store.focus) || PLANETS[2]);
const ph = computed(() => PHENOMENA[p.value.id]);
const pq = computed(() => PREDICT[p.value.id] || null);
const predicted = computed(() => !!store.progress.predict[p.value.id]);
const nf = (n, d = 1) => n.toLocaleString('id-ID', { maximumFractionDigits: d });
const facts = computed(() => {
  const x = p.value, retro = x.tilt > 90;
  const day = x.rotationDays < 2 ? `${nf(x.rotationDays * 24)} jam` : `${nf(x.rotationDays, 0)} hari`;
  const yr = x.periodYears < 2 ? `${nf(x.periodYears * 365.25, 0)} hari` : `${nf(x.periodYears)} tahun`;
  const size = x.id === 'bumi' ? '12.742 km' : `${nf(x.radiusKm / 6371.0084, 2)}× Bumi`;
  return [
    { icon: 'matahari', k: 'Satu hari', v: day, s: retro ? 'berputar terbalik' : '' },
    { icon: 'orbit', k: 'Satu tahun', v: yr, s: '' },
    { icon: 'planet', k: x.id === 'bumi' ? 'Diameter' : 'Ukuran', v: size, s: '' },
    { icon: 'bulan', k: 'Satelit', v: x.moons ? nf(x.moons, 0) : 'Tidak ada', s: '' },
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
      <span class="tag">{{ p.kind }} · planet ke-{{ p.order }}</span>
      <h1 class="h1">{{ p.name }}</h1>
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
          <p class="desc">{{ p.desc }}</p>
          <div class="facts">
            <div v-for="f in facts" :key="f.k" class="tile fact"><UiIcon :name="f.icon" :size="20" /><small>{{ f.k }}</small><b class="num">{{ f.v }}</b><em v-if="f.s">{{ f.s }}</em></div>
          </div>
          <button v-if="ph" class="phc" :class="{ ask: pq && !predicted }" @click="phenomenon">
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
.desc{font-size:15px;color:var(--muted);line-height:1.6}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fact{display:flex;flex-direction:column;gap:2px;color:var(--sky)}
.fact small{font-size:12.5px;color:var(--faint);margin-top:6px}
.fact b{font-size:19px;font-weight:600;color:var(--text)}
.fact em{font-style:normal;font-size:12px;color:var(--star)}
.phc{display:flex;align-items:center;gap:12px;padding:14px;border-radius:var(--r);background:linear-gradient(120deg,rgba(59,108,240,.3),rgba(59,108,240,.08));border:1px solid rgba(143,176,255,.3);text-align:left;transition:filter .15s}
.phc:hover{filter:brightness(1.15)}
.phc .ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--blue);flex:none}
.phc .t{flex:1;display:flex;flex-direction:column}
.phc small{font-size:12.5px;color:var(--sky)}
.phc b{font-family:var(--display);font-weight:600;font-size:16px}
.phc.ask{background:linear-gradient(120deg,rgba(255,201,71,.22),rgba(255,201,71,.05));border-color:rgba(255,201,71,.35)}
.phc.ask .ic{background:var(--star);color:#3a2a00}
.phc.ask small{color:var(--star)}
.dyk{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r);background:var(--surface-2);text-align:left;color:var(--star);transition:background .15s}
.dyk:hover{background:var(--surface-3)}
.dyk .t{flex:1;display:flex;flex-direction:column;font-family:var(--display);font-weight:600;font-size:15px;color:var(--text)}
.dyk small{font-family:var(--font);font-weight:400;font-size:12.5px;color:var(--faint)}
.live{display:flex;align-items:center;gap:14px;padding:16px;border-radius:var(--r);background:var(--surface-2)}
.live .ico{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.2);color:var(--sky);flex:none;transition:background .3s,color .3s}
.live.siang .ico,.live.panas .ico{background:rgba(255,201,71,.2);color:var(--star)}
.live.malam .ico,.live.dingin .ico{background:rgba(143,176,255,.15);color:var(--sky)}
.live.tipis .ico,.live.selesai .ico{background:rgba(54,211,154,.2);color:var(--green)}
.live b{display:block;font-family:var(--display);font-weight:600;font-size:18px;line-height:1.25}
.live small{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}
.mini{padding:8px;border-radius:var(--r)}
@media (max-width:760px){ .facts{grid-template-columns:1fr 1fr} .fact b{font-size:16px} .desc{font-size:14px} .mini{display:none} }
</style>

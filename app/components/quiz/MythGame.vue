<script setup>
// "Mitos atau Fakta?" — 6 pernyataan per ronde, diutamakan yang belum dikuasai. Jawab dengan tombol, geser kartu
// (kiri = Mitos, kanan = Fakta), atau keyboard (← / M = Mitos, → / F = Fakta, Enter = lanjut).
// Bintang hanya untuk pernyataan yang pertama kali dijawab benar (data/learning.js & public.myths).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, game, recordMyth, logMythRound, isFound } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { MYTHS, MYTH_ROUND, MYTH_REWARD } from '~/data/learning.js';

const { getMyths, loadAll } = useSupabaseContent();

const Q = store.quiz;
const deck = ref([]), idx = ref(0), choice = ref(null), score = ref(0), gained = ref(0), lastReward = ref(0), results = ref([]);

// Ambil seluruh mitos aktif secara reaktif dari state Supabase (fallback ke lokal MYTHS)
const allMyths = computed(() => (getMyths() || MYTHS).filter((m) => m.is_active !== false));

// Hanya pernyataan tentang benda yang sudah ditemukan; sisanya terbuka sambil menjelajah.
const pool = computed(() => allMyths.value.filter((m) => isFound(m.body)));
const mastered = computed(() => allMyths.value.filter((m) => store.progress.myths[m.id]).length);
const cur = computed(() => deck.value[idx.value]);
const answered = computed(() => choice.value !== null);
const right = computed(() => answered.value && choice.value === cur.value.fact);
const last = computed(() => idx.value >= deck.value.length - 1);
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function start() {
  if (!pool.value.length) return;
  const fresh = shuffle(pool.value.filter((m) => !store.progress.myths[m.id])), known = shuffle(pool.value.filter((m) => store.progress.myths[m.id]));
  deck.value = shuffle([...fresh, ...known].slice(0, MYTH_ROUND));
  idx.value = 0; choice.value = null; score.value = 0; gained.value = 0; lastReward.value = 0; results.value = [];
  Q.mythStage = 'play'; game()?.click();
}
function answer(isFact) {
  if (answered.value || Q.mythStage !== 'play' || !cur.value) return;
  choice.value = isFact;
  const ok = isFact === cur.value.fact;
  if (ok) score.value++;
  results.value[idx.value] = ok;
  lastReward.value = recordMyth(cur.value.id, ok, cur.value.points || MYTH_REWARD); gained.value += lastReward.value;
  if (ok) game()?.correct(); else game()?.wrong();
}
function next() {
  if (!answered.value) return;
  if (!last.value) { idx.value++; choice.value = null; lastReward.value = 0; return; }
  logMythRound(score.value, deck.value.length, gained.value);
  Q.mythStage = 'done';
  if (gained.value > 0) game()?.chime();
}

// geser kartu
const dx = ref(0); let sx = null, pid = null;
function down(e) { if (answered.value) return; sx = e.clientX; pid = e.pointerId; e.currentTarget.setPointerCapture?.(pid); }
function move(e) { if (sx != null && e.pointerId === pid) dx.value = e.clientX - sx; }
function up() { if (sx == null) return; const d = dx.value; sx = null; dx.value = 0; if (Math.abs(d) > 90) answer(d > 0); }

function onKey(e) {
  if (store.modal || e.repeat || store.mode !== 'kuis' || Q.kind !== 'mitos' || Q.mythStage !== 'play') return;
  if (!answered.value) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyM') { e.preventDefault(); answer(false); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyF') { e.preventDefault(); answer(true); }
  } else if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); next(); }
}

onMounted(() => {
  loadAll();
  Q.mythStage = 'intro';
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- PEMBUKA (INTRO MODERN) -->
  <div v-if="Q.mythStage === 'intro'" class="body intro">
    <div class="myth-intro-badges" aria-hidden="true">
      <span class="badge-m"><UiIcon name="silang" :size="16" /> Mitos</span>
      <span class="badge-sep">vs</span>
      <span class="badge-f"><UiIcon name="cek" :size="16" /> Fakta</span>
    </div>

    <div class="header-info-myth">
      <span class="eyebrow-label">UJI KEBENARAN ASTRONOMI</span>
      <h2 class="quiz-title">Mitos atau Fakta?</h2>
    </div>

    <p class="lead-sub">
      Tebak dengan tepat <b class="num text-sky">{{ Math.min(MYTH_ROUND, pool.length) }} pernyataan</b> seputar alam semesta.
    </p>

    <div class="mast-card">
      <div class="nr">
        <span>Penguasaan Pernyataan</span>
        <b class="num">{{ mastered }} / {{ allMyths.length }}</b>
      </div>
      <div class="bar green">
        <i :style="{ width: (mastered / (allMyths.length || 1)) * 100 + '%' }" />
      </div>
    </div>

    <p v-if="pool.length < allMyths.length" class="unl-modern">
      <UiIcon name="kunci" :size="14" />
      <span>{{ pool.length }} dari {{ allMyths.length }} pernyataan terbuka — temukan planet lain untuk membuka sisanya.</span>
    </p>

    <div class="intro-actions">
      <button class="btn-quiz-primary" @click="start">
        <UiIcon name="putar" :size="18" />
        <span>Mulai Bermain</span>
      </button>
    </div>

    <p class="fine-note">Pernyataan baru yang kamu jawab benar berhadiah +{{ MYTH_REWARD }} bintang.</p>
  </div>

  <!-- BERMAIN (PLAY VIEW) -->
  <div v-else-if="Q.mythStage === 'play' && cur" class="body">
    <div class="qtop-modern">
      <span class="planet-tag">
        <UiIcon name="kuis" :size="15" />
        <span>Mitos atau Fakta</span>
      </span>
      <div class="q-progress-box">
        <div class="dots" :aria-label="`Pernyataan ${idx + 1} dari ${deck.length}`">
          <i
            v-for="(x, i) in deck"
            :key="x.id"
            :class="{ cur: i === idx, ok: results[i] === true, bad: results[i] === false }"
          />
        </div>
        <span class="q-counter-num">{{ idx + 1 }} / {{ deck.length }}</span>
      </div>
    </div>

    <div
      class="mcard-modern"
      :class="{ answered, ok: right, bad: answered && !right, l: dx < -30, r: dx > 30 }"
      :style="dx ? { transform: `translateX(${dx}px) rotate(${dx / 24}deg)` } : null"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="up"
    >
      <span class="hl-tag" aria-hidden="true">Mitos</span>
      <span class="hr-tag" aria-hidden="true">Fakta</span>
      <p class="statement-text">{{ cur.s }}</p>
      <span v-if="answered" class="verdict-badge" :class="cur.fact ? 'f' : 'm'">
        <UiIcon :name="cur.fact ? 'cek' : 'silang'" :size="16" />
        {{ cur.fact ? 'Fakta Ilmiah' : 'Mitos Belaka' }}
      </span>
    </div>

    <template v-if="!answered">
      <div class="pick-modern">
        <button class="btn-pick-action mb-btn" @click="answer(false)">
          <UiIcon name="silang" :size="18" />
          <span>Mitos</span>
        </button>
        <button class="btn-pick-action fb-btn" @click="answer(true)">
          <UiIcon name="cek" :size="18" />
          <span>Fakta</span>
        </button>
      </div>
      <p class="keys-note">{{ store.touch ? 'Geser kartu ke kiri (Mitos) atau kanan (Fakta)' : 'Tombol Keyboard: ← Mitos · → Fakta' }}</p>
    </template>

    <div v-else class="fb-modern" :class="{ ok: right }" aria-live="polite">
      <div class="fb-header">
        <span class="fb-verdict">
          <UiIcon :name="right ? 'cek' : 'silang'" :size="16" />
          {{ right ? 'Jawaban Benar!' : 'Belum Tepat' }}
        </span>
        <span v-if="lastReward" class="rw-badge">
          <UiIcon name="bintang" :size="13" /> +{{ lastReward }} Bintang
        </span>
      </div>
      <p class="fb-explanation">{{ cur.why }}</p>
      <small class="src-text">Referensi: {{ cur.src }}</small>
      <div class="fb-acts">
        <button class="btn-next-action" @click="next">
          <span>{{ last ? 'Lihat hasil' : 'Berikutnya' }}</span>
          <UiIcon name="lanjut" :size="16" />
        </button>
      </div>
    </div>
  </div>

  <!-- HASIL (RESULT VIEW) -->
  <div v-else class="body intro">
    <div class="score-display">
      <b class="num score-val">{{ score }}</b>
      <span class="score-total">/ {{ deck.length }}</span>
    </div>

    <h2 class="result-title">
      {{ score === deck.length ? 'Sempurna, Luar Biasa!' : score * 2 >= deck.length ? 'Kerja Sangat Bagus!' : 'Ayo Coba Lagi!' }}
    </h2>

    <div class="gain-card" :class="{ zero: !gained }">
      <UiIcon name="bintang" :size="20" class="gain-icon" />
      <div class="gain-info">
        <b class="gain-num num">+{{ gained }} Bintang</b>
        <span class="gain-desc">
          {{ gained ? 'Bintang baru didapat dari pernyataan yang baru dikuasai' : 'Tidak ada bintang baru di ronde ini' }}
        </span>
      </div>
    </div>

    <div class="mast-card">
      <div class="nr">
        <span>Penguasaan Pernyataan</span>
        <b class="num">{{ mastered }} / {{ allMyths.length }}</b>
      </div>
      <div class="bar green">
        <i :style="{ width: (mastered / (allMyths.length || 1)) * 100 + '%' }" />
      </div>
    </div>

    <div class="result-acts">
      <button class="btn-result-secondary" @click="start">
        <UiIcon name="ulang" :size="16" />
        <span>Main Lagi</span>
      </button>
      <button class="btn-result-primary" @click="game()?.back()">
        <span>Selesai &amp; Kembali</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.body{
  padding:24px 28px 24px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.intro{
  align-items:center;
  text-align:center;
}

/* BADGE INTRO MITOS VS FAKTA MODERN */
.myth-intro-badges{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:2px;
}
.badge-m{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:7px 14px;
  border-radius:8px;
  font-family:var(--display);
  font-size:14px;
  font-weight:600;
  background:rgba(239,68,68,.12);
  border:1px solid rgba(239,68,68,.28);
  color:#fca5a5;
}
.badge-sep{
  font-size:12px;
  font-weight:600;
  color:var(--faint);
  text-transform:uppercase;
  letter-spacing:.05em;
}
.badge-f{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:7px 14px;
  border-radius:8px;
  font-family:var(--display);
  font-size:14px;
  font-weight:600;
  background:rgba(34,197,94,.12);
  border:1px solid rgba(34,197,94,.28);
  color:#86efac;
}

.header-info-myth{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:2px;
}
.eyebrow-label{
  font-size:11px;
  font-weight:600;
  color:#38bdf8;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-family:var(--display);
}
.quiz-title{
  font-family:var(--display);
  font-size:22px;
  font-weight:600;
  color:#fff;
  line-height:1.2;
  margin:0;
}
.lead-sub{
  font-size:13.5px;
  color:var(--muted);
  margin:0;
}
.text-sky{color:#38bdf8}

/* KARTU PENGUASAAN */
.mast-card{
  width:min(380px,100%);
  display:flex;
  flex-direction:column;
  gap:6px;
  padding:12px 14px;
  border-radius:10px;
  background:rgba(18,24,52,.7);
  border:1px solid rgba(148,174,255,.14);
}
.nr{
  display:flex;
  justify-content:space-between;
  font-size:12.5px;
  color:var(--muted);
}
.nr b{color:#22c55e}
.fine-note{
  font-size:12px;
  color:var(--faint);
  margin:0;
}
.unl-modern{
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12.5px;
  color:var(--muted);
  max-width:44ch;
  background:rgba(148,174,255,.06);
  padding:8px 12px;
  border-radius:8px;
}
.unl-modern :deep(svg){
  flex:none;
  color:var(--star);
}

.intro-actions{
  margin-top:4px;
}
.btn-quiz-primary{
  height:44px;
  min-width:180px;
  padding:0 22px;
  border-radius:10px;
  font-family:var(--display);
  font-size:14px;
  font-weight:500;
  background:#3b82f6;
  color:#ffffff;
  border:none;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  box-shadow:0 2px 10px rgba(59,130,246,.35);
  transition:all .15s ease;
}
.btn-quiz-primary:hover{
  background:#2563eb;
  transform:translateY(-1px);
}

/* TOP BAR BERMAIN */
.qtop-modern{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding-right:48px;
  padding-bottom:10px;
  border-bottom:1px solid rgba(148,174,255,.1);
}
.planet-tag{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:6px 12px;
  border-radius:10px;
  background:rgba(18,24,52,.8);
  border:1px solid rgba(148,174,255,.16);
  font-family:var(--display);
  font-size:13px;
  font-weight:600;
  color:#fff;
}
.q-progress-box{
  display:flex;
  align-items:center;
  gap:10px;
}
.dots{display:flex;gap:6px}
.dots i{
  width:24px;
  height:6px;
  border-radius:999px;
  background:rgba(148,174,255,.16);
  transition:background .2s;
}
.dots i.cur{background:#38bdf8}
.dots i.ok{background:#22c55e}
.dots i.bad{background:#ef4444}
.q-counter-num{
  font-family:var(--display);
  font-size:12.5px;
  font-weight:600;
  color:var(--muted);
}

/* KARTU MITOS / FAKTA MODERN */
.mcard-modern{
  position:relative;
  min-height:160px;
  display:grid;
  place-items:center;
  padding:32px 24px;
  border-radius:14px;
  background:rgba(18,24,52,.8);
  border:1px solid rgba(148,174,255,.2);
  text-align:center;
  touch-action:pan-y;
  user-select:none;
  cursor:grab;
  transition:transform .2s ease,border-color .2s,background .2s;
}
.mcard-modern:active{cursor:grabbing}
.mcard-modern[style]{transition:none}
.mcard-modern.l{border-color:#ef4444}
.mcard-modern.r{border-color:#22c55e}
.mcard-modern.answered{cursor:default}
.mcard-modern.ok{
  border-color:#22c55e;
  background:rgba(34,197,94,.08);
}
.mcard-modern.bad{
  border-color:#ef4444;
  background:rgba(239,68,68,.08);
}
.statement-text{
  font-family:var(--display);
  font-size:clamp(17px,2.2vw,21px);
  font-weight:500;
  line-height:1.45;
  color:#fff;
  max-width:32ch;
  margin:0;
}
.hl-tag,.hr-tag{
  position:absolute;
  top:12px;
  padding:4px 10px;
  border-radius:8px;
  font-family:var(--display);
  font-size:12px;
  font-weight:600;
  opacity:0;
  transition:opacity .15s;
}
.hl-tag{
  left:14px;
  background:rgba(239,68,68,.18);
  border:1px solid rgba(239,68,68,.3);
  color:#fca5a5;
}
.hr-tag{
  right:14px;
  background:rgba(34,197,94,.18);
  border:1px solid rgba(34,197,94,.3);
  color:#86efac;
}
.mcard-modern.l .hl-tag,.mcard-modern.r .hr-tag{opacity:1}

.verdict-badge{
  position:absolute;
  top:-12px;
  left:50%;
  transform:translateX(-50%);
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:5px 14px;
  border-radius:8px;
  font-family:var(--display);
  font-size:13.5px;
  font-weight:600;
  box-shadow:0 4px 12px rgba(0,0,0,.35);
}
.verdict-badge.f{
  background:#22c55e;
  color:#042b1d;
}
.verdict-badge.m{
  background:#ef4444;
  color:#2a0606;
}

/* PILIHAN MITOS & FAKTA */
.pick-modern{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.btn-pick-action{
  height:46px;
  border-radius:10px;
  font-family:var(--display);
  font-size:14.5px;
  font-weight:600;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  transition:all .15s ease;
}
.mb-btn{
  background:rgba(239,68,68,.12);
  border:1px solid rgba(239,68,68,.3);
  color:#fca5a5;
}
.mb-btn:hover{
  background:rgba(239,68,68,.22);
  border-color:rgba(239,68,68,.5);
  color:#fff;
  transform:translateY(-1px);
}
.fb-btn{
  background:rgba(34,197,94,.12);
  border:1px solid rgba(34,197,94,.3);
  color:#86efac;
}
.fb-btn:hover{
  background:rgba(34,197,94,.22);
  border-color:rgba(34,197,94,.5);
  color:#fff;
  transform:translateY(-1px);
}
.keys-note{
  text-align:center;
  font-size:12px;
  color:var(--faint);
  margin:0;
}

/* FEEDBACK & EVALUASI */
.fb-modern{
  display:flex;
  flex-direction:column;
  gap:10px;
  padding:16px 18px;
  border-radius:12px;
  background:rgba(239,68,68,.08);
  border:1px solid rgba(239,68,68,.25);
}
.fb-modern.ok{
  background:rgba(34,197,94,.08);
  border-color:rgba(34,197,94,.25);
}
.fb-header{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.fb-verdict{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-family:var(--display);
  font-size:15px;
  font-weight:600;
  color:#ef4444;
}
.fb-modern.ok .fb-verdict{color:#22c55e}
.rw-badge{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:3px 10px;
  border-radius:8px;
  background:rgba(255,201,71,.16);
  border:1px solid rgba(255,201,71,.3);
  color:var(--star);
  font-size:12.5px;
  font-weight:600;
}
.fb-explanation{
  font-size:13.5px;
  color:#cbd5e1;
  line-height:1.55;
  margin:0;
}
.src-text{
  font-size:12px;
  color:var(--faint);
}
.fb-acts{
  display:flex;
  justify-content:flex-end;
  margin-top:2px;
}
.btn-next-action{
  height:40px;
  padding:0 20px;
  border-radius:10px;
  font-family:var(--display);
  font-size:13.5px;
  font-weight:500;
  background:#3b82f6;
  color:#ffffff;
  border:none;
  display:inline-flex;
  align-items:center;
  gap:8px;
  cursor:pointer;
  box-shadow:0 2px 8px rgba(59,130,246,.35);
  transition:all .15s ease;
}
.btn-next-action:hover{
  background:#2563eb;
  transform:translateY(-1px);
}

/* HASIL AKHIR MITOS / FAKTA */
.score-display{
  display:flex;
  align-items:baseline;
  gap:6px;
  margin-top:8px;
}
.score-val{
  font-size:52px;
  font-weight:600;
  color:var(--star);
  line-height:1;
}
.score-total{
  font-size:24px;
  color:var(--faint);
}
.result-title{
  font-family:var(--display);
  font-size:22px;
  font-weight:600;
  color:#fff;
  margin:0;
}
.gain-card{
  display:flex;
  align-items:center;
  gap:12px;
  padding:12px 18px;
  border-radius:12px;
  background:rgba(255,201,71,.12);
  border:1px solid rgba(255,201,71,.28);
  color:var(--star);
  text-align:left;
  max-width:380px;
  width:100%;
}
.gain-card.zero{
  background:rgba(18,24,52,.75);
  border-color:rgba(148,174,255,.14);
  color:var(--faint);
}
.gain-icon{flex:none}
.gain-info{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.gain-num{
  font-size:15px;
  font-weight:600;
  color:#fff;
}
.gain-card:not(.zero) .gain-num{color:var(--star)}
.gain-desc{
  font-size:12px;
  color:var(--muted);
  line-height:1.3;
}
.result-acts{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:center;
  margin-top:4px;
}
.btn-result-secondary{
  height:42px;
  padding:0 18px;
  border-radius:10px;
  font-family:var(--display);
  font-size:13.5px;
  font-weight:500;
  color:var(--muted);
  background:transparent;
  border:1px solid rgba(148,174,255,.2);
  display:inline-flex;
  align-items:center;
  gap:7px;
  cursor:pointer;
  transition:all .15s ease;
}
.btn-result-secondary:hover{
  color:#fff;
  border-color:rgba(148,174,255,.35);
  background:rgba(255,255,255,.04);
}
.btn-result-primary{
  height:42px;
  padding:0 22px;
  border-radius:10px;
  font-family:var(--display);
  font-size:13.5px;
  font-weight:500;
  background:#3b82f6;
  color:#ffffff;
  border:none;
  display:inline-flex;
  align-items:center;
  gap:7px;
  cursor:pointer;
  box-shadow:0 2px 8px rgba(59,130,246,.35);
  transition:all .15s ease;
}
.btn-result-primary:hover{
  background:#2563eb;
  transform:translateY(-1px);
}

@media (max-width:680px){
  .body{padding:20px 16px 20px}
  .pick-modern{grid-template-columns:1fr}
}
@media (max-height: 540px) and (orientation: landscape) {
  .body {
    padding: 10px 16px 12px;
    gap: 8px;
    max-height: calc(100dvh - 100px);
    overflow-y: auto;
  }
  .pick-modern { gap: 8px; }
  .btn-pick-action { height: 38px; min-height: 38px; font-size: 13px; }
  .fb-modern { padding: 10px 12px; gap: 6px; }
  .quiz-title { font-size: 17px; }
  .mast-card { padding: 8px 10px; gap: 4px; }
}
</style>

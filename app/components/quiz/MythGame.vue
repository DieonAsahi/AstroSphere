<script setup>
// "Mitos atau Fakta?" — 6 pernyataan per ronde, diutamakan yang belum dikuasai. Jawab dengan tombol, geser kartu
// (kiri = Mitos, kanan = Fakta), atau keyboard (← / M = Mitos, → / F = Fakta, Enter = lanjut).
// Bintang hanya untuk pernyataan yang pertama kali dijawab benar (data/learning.js).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, game, recordMyth, logMythRound, isFound } from '~/composables/useGame.js';
import { MYTHS, MYTH_ROUND, MYTH_REWARD } from '~/data/learning.js';
const Q = store.quiz;
const deck = ref([]), idx = ref(0), choice = ref(null), score = ref(0), gained = ref(0), lastReward = ref(0), results = ref([]);
// Hanya pernyataan tentang benda yang sudah ditemukan; sisanya terbuka sambil menjelajah.
const pool = computed(() => MYTHS.filter((m) => isFound(m.body)));
const mastered = computed(() => MYTHS.filter((m) => store.progress.myths[m.id]).length);
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
  lastReward.value = recordMyth(cur.value.id, ok); gained.value += lastReward.value;
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
onMounted(() => { Q.mythStage = 'intro'; window.addEventListener('keydown', onKey); });
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- PEMBUKA -->
  <div v-if="Q.mythStage === 'intro'" class="body intro">
    <div class="duo" aria-hidden="true"><span class="m"><UiIcon name="silang" :size="22" />Mitos</span><span class="f"><UiIcon name="cek" :size="22" />Fakta</span></div>
    <h2 class="h2">Mitos atau Fakta?</h2>
    <p class="lead">{{ Math.min(MYTH_ROUND, pool.length) }} pernyataan tentang tata surya. Mana yang benar?</p>
    <div class="mast">
      <div class="nr"><span>Sudah kamu kuasai</span><b class="num">{{ mastered }}/{{ MYTHS.length }}</b></div>
      <div class="bar green"><i :style="{ width: mastered / MYTHS.length * 100 + '%' }" /></div>
    </div>
    <p v-if="pool.length < MYTHS.length" class="unl"><UiIcon name="kunci" :size="15" />{{ pool.length }} dari {{ MYTHS.length }} pernyataan terbuka — temukan planet lain untuk membuka sisanya.</p>
    <button class="btn primary lg" @click="start"><UiIcon name="putar" :size="20" />Mulai</button>
    <p class="fine">Pernyataan baru yang kamu jawab benar: +{{ MYTH_REWARD }} bintang.</p>
  </div>

  <!-- BERMAIN -->
  <div v-else-if="Q.mythStage === 'play' && cur" class="body">
    <div class="qtop">
      <span class="tag">Mitos atau Fakta</span>
      <div class="dots" :aria-label="`Pernyataan ${idx + 1} dari ${deck.length}`">
        <i v-for="(x, i) in deck" :key="x.id" :class="{ cur: i === idx, ok: results[i] === true, bad: results[i] === false }" />
      </div>
    </div>
    <div class="mcard" :class="{ answered, ok: right, bad: answered && !right, l: dx < -30, r: dx > 30 }"
      :style="dx ? { transform: `translateX(${dx}px) rotate(${dx / 22}deg)` } : null"
      @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <span class="hl" aria-hidden="true">Mitos</span><span class="hr" aria-hidden="true">Fakta</span>
      <p class="st">{{ cur.s }}</p>
      <span v-if="answered" class="verdict" :class="cur.fact ? 'f' : 'm'"><UiIcon :name="cur.fact ? 'cek' : 'silang'" :size="18" />{{ cur.fact ? 'Fakta' : 'Mitos' }}</span>
    </div>
    <template v-if="!answered">
      <div class="pick">
        <button class="btn lg mb" @click="answer(false)"><UiIcon name="silang" :size="22" />Mitos</button>
        <button class="btn lg fb" @click="answer(true)"><UiIcon name="cek" :size="22" />Fakta</button>
      </div>
      <p class="keys">{{ store.touch ? 'Atau geser kartu: kiri Mitos, kanan Fakta' : 'Keyboard: ← Mitos · → Fakta' }}</p>
    </template>
    <div v-else class="res" :class="{ ok: right }" aria-live="polite">
      <b class="rt">{{ right ? 'Benar!' : 'Belum tepat' }}<span v-if="lastReward" class="rw"><UiIcon name="bintang" :size="14" />+{{ lastReward }}</span></b>
      <p>{{ cur.why }}</p>
      <small class="src">Sumber: {{ cur.src }}</small>
      <button class="btn primary" @click="next">{{ last ? 'Lihat hasil' : 'Berikutnya' }}<UiIcon name="lanjut" :size="18" /></button>
    </div>
  </div>

  <!-- HASIL -->
  <div v-else class="body intro">
    <div class="score"><b class="num">{{ score }}</b><span>/{{ deck.length }}</span></div>
    <h2 class="h2">{{ score === deck.length ? 'Sempurna!' : score * 2 >= deck.length ? 'Kerja bagus!' : 'Ayo coba lagi!' }}</h2>
    <div class="gain" :class="{ zero: !gained }">
      <UiIcon name="bintang" :size="22" /><b class="num">+{{ gained }}</b>
      <span>{{ gained ? 'bintang didapat' : 'tidak ada pernyataan baru yang dijawab benar' }}</span>
    </div>
    <div class="mast">
      <div class="nr"><span>Sudah kamu kuasai</span><b class="num">{{ mastered }}/{{ MYTHS.length }}</b></div>
      <div class="bar green"><i :style="{ width: mastered / MYTHS.length * 100 + '%' }" /></div>
    </div>
    <div class="acts">
      <button class="btn line" @click="start"><UiIcon name="ulang" :size="18" />Main lagi</button>
      <button class="btn primary" @click="game()?.back()">Selesai</button>
    </div>
  </div>
</template>

<style scoped>
.body{padding:24px 30px 26px;display:flex;flex-direction:column;gap:16px}
.intro{align-items:center;text-align:center}
.duo{display:flex;gap:10px}
<<<<<<< HEAD
.duo span{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:999px;font-family:var(--display);font-weight:500;font-size:17px}
=======
.duo span{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:999px;font-family:var(--display);font-weight: 500;font-size:17px}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.duo .m{background:rgba(255,107,107,.16);color:var(--coral);transform:rotate(-4deg)}
.duo .f{background:rgba(54,211,154,.16);color:var(--green);transform:rotate(4deg)}
.mast{width:min(360px,100%);display:flex;flex-direction:column;gap:6px}
.nr{display:flex;justify-content:space-between;font-size:13.5px;color:var(--muted)}
.nr b{color:var(--green)}
.fine{font-size:12.5px;color:var(--faint)}
.unl{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);max-width:42ch}
.unl :deep(svg){flex:none;color:var(--star)}
.qtop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:48px}
.dots{display:flex;gap:6px}
.dots i{width:22px;height:8px;border-radius:999px;background:var(--surface-3)}
.dots i.cur{background:var(--sky)} .dots i.ok{background:var(--green)} .dots i.bad{background:var(--coral)}
.mcard{position:relative;min-height:150px;display:grid;place-items:center;padding:30px 26px;border-radius:var(--r-lg);background:var(--surface-2);border:2px solid var(--line);
  text-align:center;touch-action:pan-y;user-select:none;cursor:grab;transition:transform .2s ease,border-color .2s,background .2s}
.mcard:active{cursor:grabbing}
.mcard[style]{transition:none}
.mcard.l{border-color:var(--coral)} .mcard.r{border-color:var(--green)}
.mcard.answered{cursor:default}
.mcard.ok{border-color:var(--green);background:rgba(54,211,154,.08)}
.mcard.bad{border-color:var(--coral);background:rgba(255,107,107,.08)}
.st{font-family:var(--display);font-weight:500;font-size:clamp(19px,2.2vw,23px);line-height:1.35;max-width:30ch}
<<<<<<< HEAD
.hl,.hr{position:absolute;top:12px;padding:4px 10px;border-radius:999px;font-family:var(--display);font-weight:500;font-size:13px;opacity:0;transition:opacity .15s}
=======
.hl,.hr{position:absolute;top:12px;padding:4px 10px;border-radius:999px;font-family:var(--display);font-weight: 500;font-size:13px;opacity:0;transition:opacity .15s}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.hl{left:12px;background:rgba(255,107,107,.18);color:var(--coral)}
.hr{right:12px;background:rgba(54,211,154,.18);color:var(--green)}
.mcard.l .hl,.mcard.r .hr{opacity:1}
.verdict{position:absolute;top:-14px;left:50%;transform:translateX(-50%) rotate(-3deg);display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;
<<<<<<< HEAD
  font-family:var(--display);font-weight:500;font-size:15px;animation:stamp .35s cubic-bezier(.2,.9,.3,1.4) both}
=======
  font-family:var(--display);font-weight: 500;font-size:15px;animation:stamp .35s cubic-bezier(.2,.9,.3,1.4) both}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.verdict.f{background:var(--green);color:#042b1d}
.verdict.m{background:var(--coral);color:#2a0606}
@keyframes stamp{from{transform:translateX(-50%) scale(1.8) rotate(-3deg);opacity:0}}
.pick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.pick .btn{width:100%}
.mb{background:rgba(255,107,107,.14);color:var(--coral);box-shadow:inset 0 -3px 0 rgba(255,107,107,.35)}
.fb{background:rgba(54,211,154,.14);color:var(--green);box-shadow:inset 0 -3px 0 rgba(54,211,154,.35)}
.mb:hover{background:rgba(255,107,107,.22)} .fb:hover{background:rgba(54,211,154,.22)}
.keys{text-align:center;font-size:12.5px;color:var(--faint)}
.res{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:16px;border-radius:var(--r);background:rgba(255,107,107,.1);animation:rise .3s ease both}
.res.ok{background:rgba(54,211,154,.1)}
@keyframes rise{from{transform:translateY(8px);opacity:0}}
.rt{display:flex;align-items:center;gap:10px;font-family:var(--display);font-size:18px;color:var(--coral)}
.res.ok .rt{color:var(--green)}
.rw{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;background:rgba(255,201,71,.16);color:var(--star);font-size:14px}
.res p{font-size:14.5px;color:var(--muted);line-height:1.55}
.src{font-size:12px;color:var(--faint)}
.res .btn{align-self:flex-end}
<<<<<<< HEAD
.score{font-family:var(--display);font-weight:600;line-height:1}
.score b{font-size:64px;color:var(--star)}
.score span{font-size:28px;color:var(--faint)}
.gain{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:rgba(255,201,71,.14);color:var(--star)}
.gain b{font-size:24px;font-weight:600}
=======
.score{font-family:var(--display);font-weight: 600;line-height:1}
.score b{font-size:64px;color:var(--star)}
.score span{font-size:28px;color:var(--faint)}
.gain{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:rgba(255,201,71,.14);color:var(--star)}
.gain b{font-size:24px;font-weight: 600}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.gain span{font-size:14px;color:var(--muted)}
.gain.zero{background:var(--surface-2);color:var(--faint)}
.acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
@media (max-width:760px){ .body{padding:18px 16px 18px} .mcard{min-height:130px;padding:26px 16px} .pick .btn{min-height:56px} }
@media (prefers-reduced-motion:reduce){ .verdict,.res{animation:none} .mcard{transition:none} }
</style>

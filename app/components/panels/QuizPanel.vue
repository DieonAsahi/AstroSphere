<script setup>
// Kuis planet ala game: pilih jawaban → langsung dinilai + pembahasan singkat → hasil berupa bintang.
// Urutan pilihan diacak tiap percobaan. Hadiah = maks(0, skor baru − skor terbaik) (PRD §11.2); salah tidak mengurangi.
import { computed, ref } from 'vue';
import { store, game, submitQuiz, quizMax, isFound } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { QUIZ, POINTS_PER_QUESTION } from '~/data/quiz.js';
import { PLANETS } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';

const { getQuiz } = useSupabaseContent();
const Q = store.quiz;
const planet = computed(() => PLANETS.find((p) => p.id === Q.planet) || PLANETS[2]);
const set = computed(() => getQuiz(Q.planet) || QUIZ[Q.planet]);
const questionCount = computed(() => set.value?.questions?.length || 3);
const maxScore = computed(() => questionCount.value * POINTS_PER_QUESTION);
const order = ref([]); // urutan acak indeks pilihan per soal
const qq = computed(() => set.value?.questions?.[Q.index] || { text: '', options: [], answer: 0, explanation: '' });
const opts = computed(() => (order.value[Q.index] || [0, 1, 2, 3]).map((i) => ({ i, text: qq.value.options?.[i] || '' })));
const best = computed(() => store.progress.best[Q.planet] ?? 0);
const answered = computed(() => Q.stage === 'feedback');
const correct = computed(() => Q.answers[Q.index] === qq.value.answer);
const stars = (score) => Math.round(score / POINTS_PER_QUESTION);
const nextShip = computed(() => SHIP_IDS.map((id) => SHIPS[id]).find((s) => !store.progress.owned.includes(s.id)));
const shuffle = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function pickPlanet(id) { Q.planet = id; game()?.click(); }
// Kuis planet terbuka setelah planetnya ditemukan — supaya pemain menjelajah dulu.
const open = computed(() => isFound(Q.planet));
const nOpen = computed(() => PLANETS.filter((p) => isFound(p.id)).length);
function flyThere() { game()?.flyTo(Q.planet); }
function start() {
  if (!open.value || !set.value?.questions?.length) return;
  order.value = set.value.questions.map((q) => shuffle(q.options.length));
  Object.assign(Q, { stage: 'question', index: 0, picked: null, answers: [], score: 0, reward: 0 }); game()?.click();
}
function answer(i) {
  if (answered.value) return;
  Q.picked = i; Q.answers[Q.index] = i;
  const rewardPts = qq.value.points || POINTS_PER_QUESTION;
  if (i === qq.value.answer) { Q.score += rewardPts; game()?.correct(); } else game()?.wrong();
  Q.stage = 'feedback';
}
function next() {
  if (Q.index < set.value.questions.length - 1) { Q.index++; Q.picked = null; Q.stage = 'question'; return; }
  const r = submitQuiz(Q.planet, Q.score); Q.reward = r.reward; Q.prevBest = r.prev; Q.stage = 'result';
  if (r.reward > 0) game()?.chime();
}
const optState = (i) => !answered.value ? '' : i === qq.value.answer ? 'ok' : i === Q.picked ? 'bad' : 'faded';
// Dua permainan di satu panel: kuis per planet, atau "Mitos atau Fakta?" (components/quiz/MythGame.vue)
const showKinds = computed(() => (Q.kind === 'mitos' ? Q.mythStage === 'intro' : Q.stage === 'intro'));
function setKind(k) { if (Q.kind === k) return; Q.kind = k; Q.stage = 'intro'; Q.mythStage = 'intro'; game()?.click(); }
const letters = ['A', 'B', 'C', 'D'];
</script>

<template>
  <div>
    <div class="dim" />
    <section class="quiz card" aria-live="polite">
      <button class="ib sm x" aria-label="Tutup kuis" @click="game()?.back()"><UiIcon name="tutup" :size="20" /></button>
      <div v-if="showKinds" class="kinds">
        <div class="seg" role="tablist" aria-label="Jenis permainan">
          <button role="tab" :aria-selected="Q.kind !== 'mitos'" :class="{ on: Q.kind !== 'mitos' }" @click="setKind('planet')"><UiIcon name="planet" :size="16" />Kuis planet</button>
          <button role="tab" :aria-selected="Q.kind === 'mitos'" :class="{ on: Q.kind === 'mitos' }" @click="setKind('mitos')"><UiIcon name="kuis" :size="16" />Mitos atau Fakta</button>
        </div>
      </div>

      <QuizMythGame v-if="Q.kind === 'mitos'" />

      <!-- PILIH PLANET -->
      <div v-else-if="Q.stage === 'intro'" class="body intro">
        <span class="planet-dot big" :class="{ locked: !open }" :style="{ '--c': open ? planet.color : 'transparent', '--s': '96px' }"><UiIcon v-if="!open" name="kunci" :size="34" /></span>
        <h2 class="h2">Kuis {{ planet.name }}</h2>
        <template v-if="open">
          <p class="lead">{{ questionCount }} soal · <UiIcon name="bintang" :size="16" class="si" /> {{ POINTS_PER_QUESTION }} per jawaban benar</p>
          <div class="starrow" :aria-label="`Skor terbaik ${stars(best)} dari ${questionCount} bintang`">
            <UiIcon v-for="n in questionCount" :key="n" :name="n <= stars(best) ? 'bintang' : 'bintang-o'" :size="28" :class="{ got: n <= stars(best) }" />
          </div>
        </template>
        <p v-else class="lead">Kuis ini terbuka setelah kamu terbang mendekati {{ planet.name }}.</p>
        <div class="hscroll picks" role="tablist" aria-label="Pilih planet">
          <button v-for="p in PLANETS" :key="p.id" class="pp" role="tab" :aria-selected="p.id === Q.planet" :class="{ on: p.id === Q.planet, lk: !isFound(p.id) }" @click="pickPlanet(p.id)">
            <span class="planet-dot" :style="{ '--c': isFound(p.id) ? p.color : 'transparent', '--s': '34px' }"><UiIcon v-if="!isFound(p.id)" name="kunci" :size="14" /></span><small>{{ p.name }}</small>
          </button>
        </div>
        <button v-if="open" class="btn primary lg" @click="start"><UiIcon name="putar" :size="20" />Mulai</button>
        <button v-else class="btn star lg" @click="flyThere"><UiIcon name="target" :size="20" />Terbang ke {{ planet.name }}</button>
        <p class="fine">{{ nOpen }} dari {{ PLANETS.length }} planet terbuka. Jawaban salah tidak mengurangi bintang.</p>
      </div>

      <!-- SOAL -->
      <div v-else-if="Q.stage === 'question' || Q.stage === 'feedback'" class="body">
        <div class="qtop">
          <span class="tag"><span class="planet-dot" :style="{ '--c': planet.color, '--s': '14px' }" />{{ planet.name }}</span>
          <div class="dots" :aria-label="`Soal ${Q.index + 1} dari ${set.questions.length}`">
            <i v-for="(x, i) in set.questions" :key="i" :class="{ cur: i === Q.index, ok: Q.answers[i] === x.answer, bad: Q.answers[i] != null && Q.answers[i] !== x.answer }" />
          </div>
        </div>
        <h2 class="h2 q">{{ qq.text }}</h2>
        <div class="opts" role="radiogroup">
          <button v-for="(o, k) in opts" :key="o.i" class="opt" :class="optState(o.i)" role="radio" :aria-checked="Q.picked === o.i" :disabled="answered" @click="answer(o.i)">
            <span class="lt">{{ letters[k] }}</span><span class="ot">{{ o.text }}</span>
            <UiIcon v-if="optState(o.i) === 'ok'" name="cek" :size="22" /><UiIcon v-else-if="optState(o.i) === 'bad'" name="silang" :size="22" />
          </button>
        </div>
        <Transition name="rise">
          <div v-if="answered" class="fb" :class="{ ok: correct }">
            <b>{{ correct ? `Benar! +${POINTS_PER_QUESTION}` : 'Belum tepat' }}</b>
            <p>{{ qq.explanation }}</p>
            <button class="btn primary" @click="next">{{ Q.index < set.questions.length - 1 ? 'Soal berikutnya' : 'Lihat hasil' }}<UiIcon name="lanjut" :size="18" /></button>
          </div>
        </Transition>
      </div>

      <!-- HASIL -->
      <div v-else class="body intro">
        <div class="starrow big" :aria-label="`${stars(Q.score)} dari ${questionCount} bintang`">
          <UiIcon v-for="n in questionCount" :key="n" :name="n <= stars(Q.score) ? 'bintang' : 'bintang-o'" :size="54" :class="{ got: n <= stars(Q.score) }" :style="{ animationDelay: n * .15 + 's' }" />
        </div>
        <h2 class="h2">{{ Q.score >= maxScore ? 'Sempurna!' : Q.score > 0 ? 'Kerja bagus!' : 'Ayo coba lagi!' }}</h2>
        <p class="lead">{{ Math.round(Q.score / POINTS_PER_QUESTION) }} dari {{ questionCount }} jawaban benar</p>
        <div class="gain" :class="{ zero: !Q.reward }">
          <UiIcon name="bintang" :size="22" />
          <b class="num">+{{ Q.reward }}</b>
          <span>{{ Q.reward ? 'bintang didapat' : Q.prevBest >= Q.score ? 'skor terbaikmu belum terlampaui' : '' }}</span>
        </div>
        <div v-if="nextShip" class="next">
          <div class="nr"><span>Menuju {{ nextShip.name }}</span><b class="num">{{ Math.min(store.progress.points, nextShip.price) }} / {{ nextShip.price }}</b></div>
          <div class="bar star"><i :style="{ width: Math.min(100, store.progress.points / nextShip.price * 100) + '%' }" /></div>
        </div>
        <div class="acts">
          <button class="btn line" @click="start"><UiIcon name="ulang" :size="18" />Ulangi</button>
          <button class="btn primary" @click="game()?.back()">Selesai</button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.quiz{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:22;width:min(680px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow-x:hidden;overflow-y:auto}
.x{position:absolute;right:calc(14px + var(--safe-r));top:calc(14px + var(--safe-t));z-index:2}
.kinds{display:flex;justify-content:center;padding:22px 60px 0}
.kinds .seg button{display:inline-flex;align-items:center;gap:6px}
.kinds + .body{padding-top:18px}
.body{padding:30px 30px 26px;display:flex;flex-direction:column;gap:18px}
.intro{align-items:center;text-align:center}
.si{vertical-align:-2px;color:var(--star)}
.starrow{display:flex;gap:6px;color:var(--line-2)}
.starrow .got{color:var(--star)}
.starrow.big .got{animation:pop .5s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes pop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}
.picks{max-width:100%;padding:4px 2px}
.pp{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px;min-width:72px;border-radius:var(--r-sm);color:var(--faint);transition:background .15s}
.pp small{font-size:12px}
.pp.on{background:var(--surface-2);color:var(--text)}
.pp.on .planet-dot{outline:3px solid var(--sky);outline-offset:2px}
.planet-dot.locked,.pp.lk .planet-dot{display:grid;place-items:center;border:2px dashed var(--line-2);box-shadow:none;background:none;color:var(--faint)}
.pp.lk small{opacity:.7}
.fine{font-size:12.5px;color:var(--faint);max-width:44ch}
.qtop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:48px}
.dots{display:flex;gap:8px}
.dots i{width:28px;height:8px;border-radius:999px;background:var(--surface-3)}
.dots i.cur{background:var(--sky)} .dots i.ok{background:var(--green)} .dots i.bad{background:var(--coral)}
.q{font-size:clamp(20px,2.4vw,26px)}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.opt{display:flex;align-items:center;gap:12px;padding:14px;min-height:64px;border-radius:var(--r);background:var(--surface-2);text-align:left;font-size:15px;border:2px solid transparent;transition:background .15s,border-color .15s,transform .1s}
.opt:hover:not(:disabled){background:var(--surface-3)}
.opt:active:not(:disabled){transform:scale(.98)}
<<<<<<< HEAD
.opt .lt{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--surface-3);font-family:var(--display);font-weight:500}
=======
.opt .lt{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--surface-3);font-family:var(--display);font-weight: 500}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.opt .ot{flex:1}
.opt.ok{border-color:var(--green);background:rgba(54,211,154,.12);color:var(--text)}
.opt.ok .lt{background:var(--green);color:#042b1d}
.opt.bad{border-color:var(--coral);background:rgba(255,107,107,.12)}
.opt.bad .lt{background:var(--coral);color:#2a0606}
.opt.faded{opacity:.5}
.opt:disabled{cursor:default}
.fb{display:flex;flex-direction:column;gap:8px;align-items:flex-start;padding:16px;border-radius:var(--r);background:rgba(255,107,107,.1)}
.fb.ok{background:rgba(54,211,154,.1)}
.fb b{font-family:var(--display);font-size:18px;color:var(--coral)}
.fb.ok b{color:var(--green)}
.fb p{font-size:14.5px;color:var(--muted);line-height:1.55}
.fb .btn{align-self:flex-end}
.gain{display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;background:rgba(255,201,71,.14);color:var(--star)}
<<<<<<< HEAD
.gain b{font-size:24px;font-weight:600}
=======
.gain b{font-size:24px;font-weight: 600}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.gain span{font-size:14px;color:var(--muted)}
.gain.zero{background:var(--surface-2);color:var(--faint)}
.next{width:min(360px,100%);display:flex;flex-direction:column;gap:6px}
.nr{display:flex;justify-content:space-between;font-size:13.5px;color:var(--muted)}
.nr b{color:var(--star)}
.acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
@media (max-width:760px){ .kinds{padding:16px 54px 0 16px;justify-content:flex-start} .kinds .seg button{padding-left:10px;padding-right:10px;font-size:13.5px} .body{padding:22px 16px 18px} .opts{grid-template-columns:1fr} .opt{min-height:54px} }
@media (max-height:520px){
  .quiz{max-height:calc(100vh - 12px);width:min(640px,calc(100vw - 16px))}
  .body{padding:12px 14px 10px;gap:8px}
  .q{font-size:18px}
  .opts{grid-template-columns:1fr 1fr;gap:6px}
  .opt{min-height:44px;padding:6px 10px;font-size:13.5px}
  .fb{position:sticky;bottom:0;z-index:2;padding:10px 12px;box-shadow:0 -6px 16px rgba(0,0,0,.5)}
  .acts{position:sticky;bottom:0;z-index:2;background:var(--surface-a);padding-top:4px}
}
</style>

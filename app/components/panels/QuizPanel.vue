<script setup>
// Kuis per planet (PRD §11.2): intro → soal → pembahasan → hasil. Hadiah = maks(0, skor baru − skor terbaik).
import { computed } from 'vue';
import { store, game, submitQuiz, quizMax } from '~/composables/useGame.js';
import { QUIZ, POINTS_PER_QUESTION, QUIZ_VERSION } from '~/data/quiz.js';
import { PLANETS } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
const Q = store.quiz;
const planet = computed(() => PLANETS.find((p) => p.id === Q.planet) || PLANETS[2]);
const set = computed(() => QUIZ[Q.planet]);
const qq = computed(() => set.value.questions[Q.index]);
const best = computed(() => store.progress.best[Q.planet] ?? 0);
const answered = computed(() => Q.stage === 'feedback');
const correct = computed(() => Q.answers[Q.index] === qq.value.answer);
const nextShip = computed(() => SHIP_IDS.map((id) => SHIPS[id]).find((s) => !store.progress.owned.includes(s.id)));
function pickPlanet(id) { Q.planet = id; game()?.click(); }
function start() { Object.assign(Q, { stage: 'question', index: 0, picked: null, answers: [], score: 0, reward: 0 }); game()?.click(); }
function submit() {
  if (Q.picked === null) return;
  Q.answers[Q.index] = Q.picked;
  if (Q.picked === qq.value.answer) { Q.score += POINTS_PER_QUESTION; game()?.correct(); } else game()?.wrong();
  Q.stage = 'feedback';
}
function next() {
  if (Q.index < set.value.questions.length - 1) { Q.index++; Q.picked = null; Q.stage = 'question'; return; }
  const r = submitQuiz(Q.planet, Q.score); Q.reward = r.reward; Q.prevBest = r.prev; Q.stage = 'result';
  if (r.reward > 0) game()?.chime();
}
const optState = (i) => {
  if (!answered.value) return Q.picked === i ? 'sel' : '';
  if (i === qq.value.answer) return 'ok';
  if (i === Q.answers[Q.index]) return 'bad';
  return 'dim';
};
const letters = ['A', 'B', 'C', 'D'];
</script>
<template>
  <div>
    <div class="overlay-dim" />
    <section class="center-card panel" aria-live="polite">
      <div class="body scroll">
        <!-- INTRO -->
        <template v-if="Q.stage === 'intro'">
          <div class="toprow"><span class="kicker acc">● Topik: {{ planet.name }} · planet ke-{{ planet.order }}</span><span class="mono dim">Versi soal {{ QUIZ_VERSION }}</span></div>
          <h2>Kuis AstroSphere: {{ planet.name }}</h2>
          <p class="lead">Uji pemahamanmu tentang {{ set.topic.toLowerCase() }}. Tidak ada batas waktu, dan jawaban salah tidak mengurangi poin.</p>
          <div class="planet-pick">
            <button v-for="p in PLANETS" :key="p.id" :class="{ on: p.id === Q.planet }" :title="p.name" @click="pickPlanet(p.id)"><i :style="{ background: p.color }" />{{ p.name.slice(0, 2) }}</button>
          </div>
          <div class="tiles">
            <div class="tile"><span class="kicker">Jumlah soal</span><b>3</b><small>pilihan ganda</small></div>
            <div class="tile"><span class="kicker">Poin per soal</span><b>{{ POINTS_PER_QUESTION }}</b><small>maks {{ quizMax() }} per planet</small></div>
            <div class="tile"><span class="kicker">Skor terbaik</span><b class="acc2">{{ best }}</b><small>{{ best >= quizMax() ? 'sudah sempurna' : `bisa +${quizMax() - best} lagi` }}</small></div>
          </div>
          <div class="rule"><span class="kicker acc">Aturan hadiah</span><p>Poin yang diterima = maks(0, skor baru − skor terbaik). Mengulang dengan skor yang sama tidak menambah poin.</p></div>
          <div class="actions"><button class="btn ghost" @click="game()?.setMode('jelajah')">‹ Kembali ke Eksplorasi</button><button class="btn primary" @click="start">Mulai Kuis ›</button></div>
        </template>
        <!-- SOAL & PEMBAHASAN -->
        <template v-else-if="Q.stage === 'question' || Q.stage === 'feedback'">
          <div class="toprow"><span class="kicker acc">Kuis planet · {{ planet.name }}</span><span class="mono dim">Soal {{ Q.index + 1 }} / {{ set.questions.length }}</span></div>
          <div class="prog"><i v-for="(x, i) in set.questions" :key="i" :class="{ on: i < Q.index || (i === Q.index && answered) }" /></div>
          <h2 class="q">{{ qq.text }}</h2>
          <div class="opts" role="radiogroup">
            <button v-for="(o, i) in qq.options" :key="i" class="opt" :class="optState(i)" role="radio" :aria-checked="Q.picked === i" :disabled="answered" @click="Q.picked = i">
              <span class="lt">{{ letters[i] }}</span><span class="ot">{{ o }}</span>
              <UiIcon v-if="answered && i === qq.answer" name="cek" :size="20" class="ck" />
              <span v-else-if="!answered" class="radio" :class="{ on: Q.picked === i }" />
            </button>
          </div>
          <div v-if="answered" class="explain" :class="{ ok: correct }">
            <span class="kicker" :class="correct ? 'ok' : 'acc2'">Pembahasan · {{ correct ? `jawaban benar · +${POINTS_PER_QUESTION} poin sesi` : 'belum tepat · tanpa pengurangan poin' }}</span>
            <p>{{ qq.explanation }}</p>
          </div>
          <p v-else class="hintq">Pilih satu jawaban, lalu kirim. Pilihan masih bisa diganti sebelum dikirim.</p>
          <div class="actions">
            <span class="mono dim">Skor sesi {{ Q.score }} · terbaik {{ best }}</span>
            <button v-if="!answered" class="btn primary" :disabled="Q.picked === null" @click="submit">Kirim Jawaban ›</button>
            <button v-else class="btn primary" @click="next">{{ Q.index < set.questions.length - 1 ? 'Soal berikutnya ›' : 'Lihat hasil ›' }}</button>
          </div>
        </template>
        <!-- HASIL -->
        <template v-else>
          <div class="toprow"><span class="kicker ok">● Kuis selesai · {{ planet.name }}</span><span class="mono dim">Versi soal {{ QUIZ_VERSION }}</span></div>
          <h2>{{ Q.score === quizMax() ? 'Sempurna!' : 'Kuis Selesai!' }}</h2>
          <p class="lead">{{ Q.score === quizMax() ? 'Semua jawabanmu benar.' : 'Pelajari pembahasannya, lalu coba lagi untuk menaikkan skor terbaik.' }}</p>
          <div class="tiles four">
            <div class="tile"><span class="kicker">Skor baru</span><b class="acc">{{ Q.score }}</b><small>dari {{ quizMax() }}</small></div>
            <div class="tile"><span class="kicker">Benar</span><b>{{ Q.score / POINTS_PER_QUESTION }}/3</b><small>soal</small></div>
            <div class="tile"><span class="kicker">Akurasi</span><b>{{ Math.round(Q.score / quizMax() * 100) }}%</b><small>sesi ini</small></div>
            <div class="tile"><span class="kicker">Poin hilang</span><b>0</b><small>tanpa penalti</small></div>
          </div>
          <div class="reward">
            <span class="kicker acc2">Perhitungan hadiah</span>
            <div class="row"><span>Skor baru</span><b>{{ Q.score }}</b></div>
            <div class="row"><span>Skor terbaik sebelumnya</span><b>{{ Q.prevBest }}</b></div>
            <hr class="divider">
            <div class="row big"><span class="mono">Hadiah = maks(0, {{ Q.score }} − {{ Q.prevBest }})</span><b class="acc2">+{{ Q.reward }} POIN</b></div>
            <div class="row"><span>Saldo sekarang</span><b>{{ store.progress.points }} poin</b></div>
          </div>
          <div v-if="nextShip" class="next">
            <div class="row"><span>Menuju {{ nextShip.name }}</span><b class="acc2">{{ Math.min(store.progress.points, nextShip.price) }} / {{ nextShip.price }} poin</b></div>
            <div class="bar acc2"><i :style="{ width: Math.min(100, store.progress.points / nextShip.price * 100) + '%' }" /></div>
          </div>
          <div class="actions">
            <button class="btn ghost" @click="game()?.setMode('hanggar')">Lihat Hanggar</button>
            <span class="sp" />
            <button class="btn" @click="start">Ulangi Kuis</button>
            <button class="btn primary" @click="game()?.setMode('jelajah')">Kembali ke Eksplorasi</button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
<style scoped>
.body{padding:28px 32px;display:flex;flex-direction:column;gap:16px}
.toprow{display:flex;justify-content:space-between;align-items:center;gap:12px}
.dim{color:var(--dim);font-size:12px}
h2{font-size:28px;font-weight:600;letter-spacing:.01em;line-height:1.2}
h2.q{font-size:22px}
.lead{font-size:15px;color:var(--dim);line-height:1.55}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.tiles.four{grid-template-columns:repeat(4,1fr)}
.tile{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:10px;background:var(--bg);border:1px solid var(--divider)}
.tile b{font-family:var(--mono);font-size:28px;font-weight:600}
.tile small{font-size:11px;color:var(--faint)}
.acc{color:var(--acc)} .acc2{color:var(--acc2)}
.rule{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:10px;background:var(--soft);border:1px solid var(--line)}
.rule p{font-size:13px;line-height:1.5}
.actions{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--divider)}
.actions .sp{flex:1}
.prog{display:flex;gap:6px}.prog i{flex:1;height:4px;border-radius:2px;background:var(--divider)}.prog i.on{background:var(--acc)}
.opts{display:flex;flex-direction:column;gap:10px}
.opt{display:flex;align-items:center;gap:14px;padding:13px 16px;min-height:56px;border-radius:10px;border:1px solid var(--line);text-align:left;transition:all .15s}
.opt:hover:not(:disabled){border-color:rgba(var(--acc-rgb),.55)}
.opt .lt{flex:none;width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:var(--divider);font-weight:600}
.opt .ot{flex:1;font-size:15px}
.opt.sel{background:var(--soft);border-color:var(--acc);border-width:1.5px}
.opt.sel .lt{background:var(--acc);color:var(--on-cta)}
.opt.ok{background:rgba(109,255,176,.08);border-color:var(--ok);border-width:1.5px}
.opt.ok .lt{background:var(--ok);color:var(--on-cta)} .opt.ok .ck{color:var(--ok)}
.opt.bad{border-color:var(--danger);border-width:1.5px}.opt.bad .lt{background:var(--danger);color:var(--on-cta)}
.opt.dim{opacity:.55}
.opt:disabled{cursor:default}
.radio{flex:none;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--line);position:relative}
.radio.on{border-color:var(--acc)}.radio.on::after{content:"";position:absolute;inset:4px;border-radius:50%;background:var(--acc)}
.explain{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:10px;background:var(--bg);border:1px solid var(--divider)}
.explain p{font-size:13.5px;line-height:1.55;color:var(--dim)}
.hintq{font-size:12px;color:var(--faint)}
.reward{display:flex;flex-direction:column;gap:8px;padding:16px 18px;border-radius:12px;background:var(--bg);border:1px solid rgba(var(--acc2-rgb),.55)}
.row.big b{font-size:18px}
.next{display:flex;flex-direction:column;gap:8px}
@media (max-width:760px){ .body{padding:18px 16px} .tiles,.tiles.four{grid-template-columns:repeat(2,1fr)} h2{font-size:22px} h2.q{font-size:18px} .opt .ot{font-size:13.5px} }
</style>

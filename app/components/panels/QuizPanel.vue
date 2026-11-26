<script setup>
// Kuis planet ala game modern: pilih jawaban → langsung dinilai + pembahasan singkat → hasil berupa bintang.
// Urutan pilihan diacak tiap percobaan. Hadiah = maks(0, skor baru − skor terbaik) (PRD §11.2); salah tidak mengurangi.
import { computed, ref, watch, onMounted } from 'vue';
import { store, game, submitQuiz, quizMax, isFound } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { QUIZ, POINTS_PER_QUESTION } from '~/data/quiz.js';
import { PLANETS, MOONS } from '~/data/solarSystem.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';

const { getQuiz, loadAll, planets: livePlanets, moons: liveMoons, getShips } = useSupabaseContent();

onMounted(() => {
  loadAll();
});

const Q = store.quiz;
const planetList = computed(() => (livePlanets.value?.length ? livePlanets.value : PLANETS));
const moonList = computed(() => (liveMoons.value?.length ? liveMoons.value : MOONS));
const allBodies = computed(() => [...planetList.value, ...moonList.value]);

const bodyCategory = ref('planet');
watch(() => Q.planet, (newId) => {
  if (moonList.value.some((m) => m.id === newId)) {
    bodyCategory.value = 'moon';
  } else if (planetList.value.some((p) => p.id === newId)) {
    bodyCategory.value = 'planet';
  }
}, { immediate: true });

const activeSelectionList = computed(() => (bodyCategory.value === 'moon' ? moonList.value : planetList.value));
const planet = computed(() => allBodies.value.find((p) => p.id === Q.planet) || PLANETS.find((p) => p.id === Q.planet) || MOONS.find((m) => m.id === Q.planet) || planetList.value[0] || PLANETS[2]);
const isMoon = computed(() => MOONS.some((m) => m.id === planet.value?.id) || planet.value?.body_type === 'moon');
const set = computed(() => getQuiz(Q.planet) || QUIZ[Q.planet]);
const questionCount = computed(() => set.value?.questions?.length ?? 0);
const maxScore = computed(() => (set.value?.questions?.length ? set.value.questions.reduce((sum, q) => sum + (Number(q.points) || POINTS_PER_QUESTION), 0) : 0));
const questionPointsLabel = computed(() => {
  const qs = set.value?.questions || [];
  if (!qs.length) return '';
  const ptsList = qs.map((q) => Number(q.points) || POINTS_PER_QUESTION);
  const minPts = Math.min(...ptsList);
  const maxPts = Math.max(...ptsList);
  if (minPts === maxPts) return `${minPts} bintang per jawaban benar`;
  return `hingga ${maxScore.value} bintang (${minPts}–${maxPts} bintang/soal)`;
});
const order = ref([]); // urutan acak indeks pilihan per soal
const qq = computed(() => set.value?.questions?.[Q.index] || { text: '', options: [], answer: 0, explanation: '' });
const opts = computed(() => (order.value[Q.index] || [0, 1, 2, 3]).map((i) => ({ i, text: qq.value.options?.[i] || '' })));
const best = computed(() => store.progress.best[Q.planet] ?? 0);
const answered = computed(() => Q.stage === 'feedback');
const correct = computed(() => Q.answers[Q.index] === qq.value.answer);
const correctCount = computed(() => (set.value?.questions || []).filter((q, idx) => Q.answers[idx] === q.answer).length);
const stars = (score) => (maxScore.value > 0 && questionCount.value > 0 ? Math.min(questionCount.value, Math.max(0, Math.round((score / maxScore.value) * questionCount.value))) : 0);
const nextShip = computed(() => {
  const liveShips = getShips();
  return SHIP_IDS.map((id) => liveShips[id] || SHIPS[id]).find((s) => s && s.is_active !== false && !store.progress.owned.includes(s.id));
});
const shuffle = (n) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function pickPlanet(id) { Q.planet = id; game()?.click(); }
// Kuis planet terbuka setelah planetnya ditemukan — supaya pemain menjelajah dulu.
const open = computed(() => isFound(Q.planet));
const nOpen = computed(() => activeSelectionList.value.filter((p) => isFound(p.id)).length);
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
      <!-- Tombol Tutup Persegi Modern -->
      <button class="modern-close-btn x" aria-label="Tutup kuis" title="Tutup (Esc)" @click="game()?.back()">
        <UiIcon name="tutup" :size="18" />
      </button>

      <!-- Segmented Control Jenis Permainan Modern -->
      <div v-if="showKinds" class="kinds">
        <div class="seg-modern" role="tablist" aria-label="Jenis permainan">
          <button
            role="tab"
            :aria-selected="Q.kind !== 'mitos'"
            class="seg-item"
            :class="{ active: Q.kind !== 'mitos' }"
            @click="setKind('planet')"
          >
            <UiIcon name="planet" :size="15" />
            <span>Kuis Planet</span>
          </button>
          <button
            role="tab"
            :aria-selected="Q.kind === 'mitos'"
            class="seg-item"
            :class="{ active: Q.kind === 'mitos' }"
            @click="setKind('mitos')"
          >
            <UiIcon name="kuis" :size="15" />
            <span>Mitos atau Fakta</span>
          </button>
        </div>
      </div>

      <QuizMythGame v-if="Q.kind === 'mitos'" />

      <!-- PILIH PLANET (INTRO MODERN) -->
      <div v-else-if="Q.stage === 'intro'" class="body intro">
        <!-- Badge Planet Ringkas & Header Terstruktur -->
        <div class="planet-badge-header">
          <div class="planet-badge-wrap" :class="[`badge-${planet.id}`, { locked: !open }]">
            <span
              v-if="open && planet.id === 'saturnus'"
              class="saturn-ring-back"
              aria-hidden="true"
            />
            <span
              class="planet-badge-dot"
              :class="[`sphere-${planet.id}`, { locked: !open }]"
              :style="{ '--c': open ? planet.color : 'transparent' }"
            >
              <UiIcon v-if="!open" name="kunci" :size="18" />
            </span>
            <span
              v-if="open && planet.id === 'saturnus'"
              class="saturn-ring-front"
              aria-hidden="true"
            />
          </div>
          <div class="header-info">
            <span class="eyebrow-label">{{ isMoon ? 'EVALUASI PENGETAHUAN · SATELIT ALAMI' : 'EVALUASI PENGETAHUAN · PLANET' }}</span>
            <h2 class="quiz-title">Kuis {{ planet.name }}</h2>
          </div>
        </div>

        <template v-if="open">
          <p class="lead-sub">
            <template v-if="questionCount > 0">
              <b class="num text-sky">{{ questionCount }} soal</b> · <UiIcon name="bintang" :size="15" class="si" /> {{ questionPointsLabel }}
            </template>
            <span v-else>Soal kuis untuk objek ini belum tersedia.</span>
          </p>
          <div class="starrow" :aria-label="`Skor terbaik ${stars(best)} dari ${questionCount} bintang`">
            <UiIcon
              v-for="n in questionCount"
              :key="n"
              :name="n <= stars(best) ? 'bintang' : 'bintang-o'"
              :size="24"
              :class="{ got: n <= stars(best) }"
            />
          </div>
        </template>
        <p v-else class="lead-locked">
          Kuis ini terkunci. Jelajahi dan terbang mendekati <b>{{ planet.name }}</b> untuk membukanya.
        </p>

        <!-- Pilihan Kategori: 8 Planet / 6 Bulan -->
        <div class="category-toggle" role="tablist" aria-label="Kategori kuis">
          <button
            type="button"
            class="cat-btn"
            :class="{ active: bodyCategory === 'planet' }"
            @click="bodyCategory = 'planet'"
          >
            <UiIcon name="planet" :size="14" />
            <span>8 Planet</span>
          </button>
          <button
            type="button"
            class="cat-btn"
            :class="{ active: bodyCategory === 'moon' }"
            @click="bodyCategory = 'moon'"
          >
            <UiIcon name="bulan" :size="14" />
            <span>6 Bulan</span>
          </button>
        </div>

        <!-- Grid Kartu Selektor Objek Modern -->
        <div class="planet-selector-grid" role="tablist" :aria-label="bodyCategory === 'moon' ? 'Pilih bulan' : 'Pilih planet'">
          <button
            v-for="p in activeSelectionList"
            :key="p.id"
            class="planet-card-btn"
            role="tab"
            :aria-selected="p.id === Q.planet"
            :class="{ on: p.id === Q.planet, locked: !isFound(p.id) }"
            @click="pickPlanet(p.id)"
          >
            <span
              class="p-dot"
              :class="[`p-dot-${p.id}`, { locked: !isFound(p.id) }]"
              :style="{ '--c': isFound(p.id) ? p.color : 'rgba(148, 174, 255, 0.2)' }"
            >
              <UiIcon v-if="!isFound(p.id)" name="kunci" :size="12" />
            </span>
            <div class="p-card-info">
              <span class="p-name">{{ p.name }}</span>
              <span class="p-score">
                <template v-if="!isFound(p.id)">Terkunci</template>
                <template v-else-if="store.progress.best[p.id]">★ {{ store.progress.best[p.id] }}</template>
                <template v-else>Belum kuis</template>
              </span>
            </div>
          </button>
        </div>

        <div class="intro-actions">
          <button v-if="open && questionCount > 0" class="btn-quiz-primary" @click="start">
            <UiIcon name="putar" :size="18" />
            <span>Mulai Kuis</span>
          </button>
          <button v-else-if="open && questionCount === 0" class="btn-quiz-primary" disabled>
            <UiIcon name="info" :size="18" />
            <span>Soal kuis belum tersedia</span>
          </button>
          <button v-else class="btn-quiz-star" @click="flyThere">
            <UiIcon name="target" :size="18" />
            <span>Terbang ke {{ planet.name }}</span>
          </button>
        </div>

        <p class="fine-note">
          {{ nOpen }} dari {{ activeSelectionList.length }} {{ bodyCategory === 'moon' ? 'bulan' : 'planet' }} terbuka · Jawaban salah tidak mengurangi bintang.
        </p>
      </div>

      <!-- SOAL (QUESTION / FEEDBACK VIEW) -->
      <div v-else-if="Q.stage === 'question' || Q.stage === 'feedback'" class="body">
        <div class="qtop-modern">
          <span class="planet-tag">
            <span class="planet-dot-sm" :class="`dot-${planet.id}`" :style="{ '--c': planet.color }" />
            <span>{{ planet.name }}</span>
          </span>
          <div class="q-progress-box">
            <div class="dots" :aria-label="`Soal ${Q.index + 1} dari ${set.questions.length}`">
              <i
                v-for="(x, i) in set.questions"
                :key="i"
                :class="{ cur: i === Q.index, ok: Q.answers[i] === x.answer, bad: Q.answers[i] != null && Q.answers[i] !== x.answer }"
              />
            </div>
            <span class="q-counter-num">{{ Q.index + 1 }} / {{ set.questions.length }}</span>
          </div>
        </div>

        <h2 class="q-question-text">{{ qq.text }}</h2>

        <div class="opts-modern" role="radiogroup">
          <button
            v-for="(o, k) in opts"
            :key="o.i"
            class="opt-modern"
            :class="optState(o.i)"
            role="radio"
            :aria-checked="Q.picked === o.i"
            :disabled="answered"
            @click="answer(o.i)"
          >
            <span class="lt-badge">{{ letters[k] }}</span>
            <span class="ot-text">{{ o.text }}</span>
            <span v-if="optState(o.i) === 'ok'" class="status-icon ok">
              <UiIcon name="cek" :size="18" />
            </span>
            <span v-else-if="optState(o.i) === 'bad'" class="status-icon bad">
              <UiIcon name="silang" :size="18" />
            </span>
          </button>
        </div>

        <Transition name="rise">
          <div v-if="answered" class="fb-modern" :class="{ ok: correct }">
            <div class="fb-header">
              <span class="fb-verdict">
                <UiIcon :name="correct ? 'cek' : 'silang'" :size="16" />
                {{ correct ? `Benar! +${qq.points || POINTS_PER_QUESTION} Bintang` : 'Belum tepat' }}
              </span>
            </div>
            <p class="fb-explanation">{{ qq.explanation }}</p>
            <div class="fb-acts">
              <button class="btn-next-action" @click="next">
                <span>{{ Q.index < set.questions.length - 1 ? 'Soal berikutnya' : 'Lihat hasil' }}</span>
                <UiIcon name="lanjut" :size="16" />
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- HASIL (RESULT VIEW) -->
      <div v-else class="body intro">
        <div class="starrow-result" :aria-label="`${stars(Q.score)} dari ${questionCount} bintang`">
          <UiIcon
            v-for="n in questionCount"
            :key="n"
            :name="n <= stars(Q.score) ? 'bintang' : 'bintang-o'"
            :size="48"
            :class="{ got: n <= stars(Q.score) }"
            :style="{ animationDelay: n * 0.12 + 's' }"
          />
        </div>

        <h2 class="result-title">
          {{ Q.score >= maxScore ? 'Luar Biasa, Sempurna!' : Q.score > 0 ? 'Kerja Sangat Bagus!' : 'Ayo Coba Lagi!' }}
        </h2>
        <p class="result-sub">
          <b class="num text-sky">{{ correctCount }}</b> dari {{ questionCount }} jawaban benar ({{ Q.score }} poin)
        </p>

        <div class="gain-card" :class="{ zero: !Q.reward }">
          <UiIcon name="bintang" :size="20" class="gain-icon" />
          <div class="gain-info">
            <b class="gain-num num">+{{ Q.reward }} Bintang</b>
            <span class="gain-desc">
              {{ Q.reward ? 'Hadiah ditambahkan ke armada antariksamu' : Q.prevBest >= Q.score ? 'Skor terbaikmu sebelumnya sudah tercatat' : 'Belum ada bintang baru' }}
            </span>
          </div>
        </div>

        <div v-if="nextShip" class="next-ship-card">
          <div class="nr">
            <span>Menuju {{ nextShip.name }}</span>
            <b class="num">{{ Math.min(store.progress.points, nextShip.price) }} / {{ nextShip.price }} ★</b>
          </div>
          <div class="bar star">
            <i :style="{ width: Math.min(100, (store.progress.points / nextShip.price) * 100) + '%' }" />
          </div>
        </div>

        <div class="result-acts">
          <button class="btn-result-secondary" @click="start">
            <UiIcon name="ulang" :size="16" />
            <span>Ulangi Kuis</span>
          </button>
          <button class="btn-result-primary" @click="game()?.back()">
            <span>Selesai &amp; Kembali</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.quiz{
  position:fixed;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  z-index:22;
  width:min(660px,calc(100vw - 28px));
  max-height:calc(100vh - 40px);
  overflow-x:hidden;
  overflow-y:auto;
  border-radius:18px;
  background:rgba(10,14,32,.96);
  border:1px solid rgba(148,174,255,.2);
  box-shadow:0 20px 50px rgba(0,0,0,.65),0 0 30px rgba(59,130,246,.12);
  scrollbar-width:thin;
  scrollbar-color:rgba(148,174,255,.2) transparent;
}
.quiz::-webkit-scrollbar{width:5px}
.quiz::-webkit-scrollbar-thumb{background:rgba(148,174,255,.2);border-radius:99px}

/* TOMBOL TUTUP MODERN */
.modern-close-btn{
  width:36px;
  height:36px;
  min-width:36px;
  min-height:36px;
  border-radius:10px;
  background:rgba(148,174,255,.08);
  border:1px solid rgba(148,174,255,.18);
  color:var(--muted);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all .15s ease;
}
.modern-close-btn:hover{
  background:rgba(148,174,255,.16);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.modern-close-btn.x{
  position:absolute;
  right:calc(16px + var(--safe-r));
  top:calc(16px + var(--safe-t));
  z-index:10;
}

/* SEGMENTED CONTROL MODERN */
.kinds{
  display:flex;
  justify-content:center;
  padding:20px 56px 0;
}
.seg-modern{
  display:inline-flex;
  padding:3px;
  gap:4px;
  border-radius:10px;
  background:rgba(11,16,36,.8);
  border:1px solid rgba(148,174,255,.16);
}
.seg-item{
  min-height:34px;
  padding:0 16px;
  border-radius:8px;
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  color:var(--muted);
  background:transparent;
  border:none;
  cursor:pointer;
  display:inline-flex;
  align-items:center;
  gap:7px;
  transition:all .15s ease;
}
.seg-item:hover{
  color:#fff;
  background:rgba(255,255,255,.05);
}
.seg-item.active{
  background:#3b82f6;
  color:#ffffff;
  box-shadow:0 2px 8px rgba(59,130,246,.35);
}

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

/* HEADER INTRO KUIS MODERN */
.planet-badge-header{
  display:flex;
  align-items:center;
  gap:14px;
  margin-top:4px;
}
.planet-badge-wrap{
  position:relative;
  width:44px;
  height:44px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex:none;
}
.planet-badge-dot{
  position:relative;
  z-index:1;
  width:44px;
  height:44px;
  border-radius:50%;
  background:radial-gradient(circle at 30% 28%,rgba(255,255,255,.45) 0%,transparent 60%),var(--c);
  box-shadow:inset -4px -4px 10px rgba(0,0,0,.8),0 0 16px var(--c,rgba(56,189,248,.35));
  display:flex;
  align-items:center;
  justify-content:center;
  flex:none;
  transition:all .25s ease;
}
.planet-badge-dot.locked{
  background:radial-gradient(circle at 32% 32%,rgba(148,174,255,.12) 0%,rgba(15,22,48,.9) 70%);
  border:1.5px dashed rgba(148,174,255,.35);
  box-shadow:none;
  color:var(--faint);
}

/* Karakter Visual Khas 8 Planet (Sphere 3D & Gradien Atmosfer) */
.planet-badge-dot.sphere-merkurius:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.5) 0%,transparent 35%),
    radial-gradient(circle at 65% 65%,rgba(40,36,32,.7) 0%,transparent 50%),
    radial-gradient(circle at 35% 35%,#b8b1a7 0%,#958f87 35%,#4d4843 75%,#23201d 100%);
  box-shadow:inset -5px -5px 12px rgba(0,0,0,.85),0 0 14px rgba(163,157,149,.35);
}
.planet-badge-dot.sphere-venus:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.6) 0%,transparent 40%),
    radial-gradient(circle at 35% 35%,#fff1d0 0%,#f7ecd2 20%,#e3bb76 50%,#b48852 80%,#4a3418 100%);
  box-shadow:inset -4px -4px 10px rgba(74,52,24,.75),0 0 18px rgba(227,187,118,.45);
}
.planet-badge-dot.sphere-bumi:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.65) 0%,transparent 35%),
    radial-gradient(circle at 60% 48%,rgba(45,106,47,.8) 0%,transparent 38%),
    radial-gradient(circle at 38% 68%,rgba(160,138,85,.6) 0%,transparent 35%),
    radial-gradient(circle at 32% 32%,#60a5fa 0%,#1e40af 45%,#0f2b5c 80%,#030c1d 100%);
  box-shadow:inset -5px -5px 12px rgba(3,12,29,.9),0 0 18px rgba(56,189,248,.5),inset 0 0 8px rgba(56,189,248,.4);
}
.planet-badge-dot.sphere-mars:not(.locked){
  background:
    radial-gradient(circle at 30% 26%,rgba(255,220,205,.55) 0%,transparent 35%),
    radial-gradient(circle at 50% 10%,rgba(255,255,255,.75) 0%,transparent 22%),
    radial-gradient(circle at 35% 35%,#ffd2c0 0%,#e06840 25%,#c1502e 50%,#7c2d12 80%,#300f07 100%);
  box-shadow:inset -5px -5px 12px rgba(48,15,7,.85),0 0 16px rgba(193,80,46,.45);
}
.planet-badge-dot.sphere-jupiter:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.5) 0%,transparent 40%),
    linear-gradient(180deg,#d9a066 0%,#fbf3e6 12%,#b3402a 24%,#c7925f 36%,#ecdcc2 48%,#7d4a2c 62%,#ecdcc2 74%,#d9a066 86%,#4a2815 100%);
  box-shadow:inset -6px -5px 14px rgba(0,0,0,.85),0 0 18px rgba(217,160,102,.4);
}
.planet-badge-dot.sphere-saturnus:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.5) 0%,transparent 40%),
    linear-gradient(180deg,#e8d29a 0%,#fff6dc 18%,#d9ba7c 35%,#caa467 52%,#f3e2b3 70%,#b08a52 86%,#4a3818 100%);
  box-shadow:inset -5px -5px 12px rgba(74,56,24,.85),0 0 18px rgba(232,210,154,.45);
}
.planet-badge-dot.sphere-uranus:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.6) 0%,transparent 40%),
    radial-gradient(circle at 35% 35%,#e6f8fa 0%,#bff4ff 25%,#9fe3e8 50%,#4facb8 80%,#164850 100%);
  box-shadow:inset -5px -5px 12px rgba(22,72,80,.8),0 0 18px rgba(159,227,232,.5),inset 0 0 8px rgba(191,244,255,.45);
}
.planet-badge-dot.sphere-neptunus:not(.locked){
  background:
    radial-gradient(circle at 28% 26%,rgba(255,255,255,.6) 0%,transparent 40%),
    radial-gradient(circle at 35% 35%,#86a6f2 0%,#6f8cff 20%,#4256c9 45%,#1d3184 75%,#0b1236 100%);
  box-shadow:inset -5px -5px 12px rgba(11,18,54,.9),0 0 20px rgba(66,86,201,.55),inset 0 0 8px rgba(111,140,255,.4);
}

/* Cincin Miring Khusus Saturnus di Header Badge */
.saturn-ring-back,
.saturn-ring-front{
  position:absolute;
  top:50%;
  left:50%;
  width:66px;
  height:20px;
  border-radius:50%;
  border:3px solid rgba(232,210,154,.95);
  box-shadow:0 0 8px rgba(232,210,154,.5),inset 0 0 4px rgba(168,143,104,.6);
  transform:translate(-50%,-50%) rotate(-24deg);
  pointer-events:none;
}
.saturn-ring-back{
  z-index:0;
  clip-path:polygon(-20% -20%,120% -20%,120% 50%,-20% 50%);
}
.saturn-ring-front{
  z-index:2;
  clip-path:polygon(-20% 50%,120% 50%,120% 120%,-20% 120%);
}

.header-info{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
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
.lead-locked{
  font-size:13.5px;
  color:#fca5a5;
  margin:0;
  max-width:44ch;
}
.text-sky{color:#38bdf8}
.si{vertical-align:-2px;color:var(--star)}
.starrow{display:flex;gap:6px;color:var(--line-2)}
.starrow .got{color:var(--star)}

/* TOGGLE KATEGORI PLANET / BULAN */
.category-toggle{
  display:inline-flex;
  align-items:center;
  gap:6px;
  background:rgba(15, 23, 42, 0.6);
  border:1px solid rgba(148, 174, 255, 0.14);
  border-radius:10px;
  padding:4px;
  margin:4px 0 2px 0;
  width:fit-content;
}
.cat-btn{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 14px;
  border-radius:7px;
  font-family:var(--display);
  font-size:12px;
  font-weight:500;
  color:#94a3b8;
  background:transparent;
  border:none;
  cursor:pointer;
  transition:all .15s ease;
}
.cat-btn:hover{
  color:#ffffff;
}
.cat-btn.active{
  color:#ffffff;
  background:rgba(59, 130, 246, 0.35);
  box-shadow:0 2px 8px rgba(0, 0, 0, 0.25);
}

/* GRID SELEKTOR PLANET & BULAN MODERN */
.planet-selector-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
  width:100%;
  margin:6px 0;
}
.planet-card-btn{
  display:flex;
  align-items:center;
  gap:8px;
  padding:10px 10px;
  border-radius:10px;
  background:rgba(18,24,52,.75);
  border:1px solid rgba(148,174,255,.14);
  cursor:pointer;
  text-align:left;
  transition:all .15s ease;
}
.planet-card-btn:hover:not(.locked){
  background:rgba(30,41,82,.85);
  border-color:rgba(148,174,255,.3);
  transform:translateY(-1px);
}
.planet-card-btn.on{
  background:rgba(59,130,246,.15);
  border-color:#38bdf8;
  box-shadow:0 0 12px rgba(56,189,248,.25);
}
.planet-card-btn.locked{
  opacity:.65;
  cursor:pointer;
}
.p-dot{
  position:relative;
  width:16px;
  height:16px;
  border-radius:50%;
  background:var(--c);
  display:grid;
  place-items:center;
  flex:none;
  transition:all .15s ease;
}
.p-dot:not(.locked){
  box-shadow:0 0 6px var(--c),inset -1.5px -1.5px 3px rgba(0,0,0,.65);
}
.planet-card-btn.locked .p-dot{
  background:rgba(148,174,255,.08);
  border:1px dashed rgba(148,174,255,.3);
  box-shadow:none;
  color:var(--faint);
}
/* Lingkaran 3D Mini Konsisten per Planet di Grid */
.p-dot.p-dot-merkurius:not(.locked){
  background:radial-gradient(circle at 32% 30%,#e2ded9 0%,#a39d95 45%,#4d4843 100%);
}
.p-dot.p-dot-venus:not(.locked){
  background:radial-gradient(circle at 32% 30%,#fff3d8 0%,#e3bb76 50%,#b48852 100%);
}
.p-dot.p-dot-bumi:not(.locked){
  background:radial-gradient(circle at 30% 30%,#93c5fd 0%,#2563eb 50%,#0f2b5c 100%);
}
.p-dot.p-dot-mars:not(.locked){
  background:radial-gradient(circle at 32% 30%,#ffd2c0 0%,#c1502e 55%,#7c2d12 100%);
}
.p-dot.p-dot-jupiter:not(.locked){
  background:linear-gradient(180deg,#d9a066 0%,#fbf3e6 30%,#b3402a 60%,#7d4a2c 100%);
}
.p-dot.p-dot-saturnus:not(.locked){
  background:radial-gradient(circle at 32% 30%,#fff7e0 0%,#e8d29a 50%,#b08a52 100%);
}
.p-dot.p-dot-saturnus:not(.locked)::after{
  content:'';
  position:absolute;
  top:50%;
  left:50%;
  width:24px;
  height:7px;
  border-radius:50%;
  border:1.5px solid rgba(232,210,154,.9);
  box-shadow:0 0 4px rgba(232,210,154,.4);
  transform:translate(-50%,-50%) rotate(-24deg);
  pointer-events:none;
}
.p-dot.p-dot-uranus:not(.locked){
  background:radial-gradient(circle at 32% 30%,#e0f9fc 0%,#9fe3e8 50%,#4facb8 100%);
}
.p-dot.p-dot-neptunus:not(.locked){
  background:radial-gradient(circle at 32% 30%,#9cb3ff 0%,#4256c9 50%,#1d3184 100%);
}
.p-card-info{
  display:flex;
  flex-direction:column;
  min-width:0;
  overflow:hidden;
}
.p-name{
  font-family:var(--display);
  font-size:12.5px;
  font-weight:600;
  color:#fff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  line-height:1.2;
}
.p-score{
  font-size:10.5px;
  color:var(--faint);
  line-height:1.2;
  margin-top:2px;
  white-space:nowrap;
}
.planet-card-btn.on .p-score{
  color:#38bdf8;
  font-weight:500;
}

/* AKSI INTRO KUIS */
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
.btn-quiz-star{
  height:44px;
  min-width:180px;
  padding:0 22px;
  border-radius:10px;
  font-family:var(--display);
  font-size:14px;
  font-weight:500;
  background:rgba(255,201,71,.15);
  border:1px solid rgba(255,201,71,.35);
  color:var(--star);
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  cursor:pointer;
  transition:all .15s ease;
}
.btn-quiz-star:hover{
  background:rgba(255,201,71,.25);
  border-color:rgba(255,201,71,.55);
}
.fine-note{
  font-size:12px;
  color:var(--faint);
  margin:0;
}

/* TAMPILAN SOAL MODERN */
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
.planet-dot-sm{
  position:relative;
  width:11px;
  height:11px;
  border-radius:50%;
  background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.5) 0%,transparent 70%),var(--c);
  box-shadow:0 0 6px var(--c),inset -1px -1px 2px rgba(0,0,0,.6);
  display:inline-block;
  flex:none;
}
.planet-dot-sm.dot-saturnus::after{
  content:'';
  position:absolute;
  top:50%;
  left:50%;
  width:17px;
  height:5px;
  border-radius:50%;
  border:1.2px solid rgba(232,210,154,.9);
  transform:translate(-50%,-50%) rotate(-24deg);
  pointer-events:none;
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
.q-question-text{
  font-family:var(--display);
  font-size:clamp(17px,2.2vw,21px);
  font-weight:600;
  color:#fff;
  line-height:1.45;
  margin:4px 0 2px;
}

/* PILIHAN JAWABAN MODERN */
.opts-modern{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.opt-modern{
  display:flex;
  align-items:center;
  gap:12px;
  padding:14px 16px;
  min-height:64px;
  border-radius:12px;
  background:rgba(18,24,52,.75);
  border:1px solid rgba(148,174,255,.14);
  text-align:left;
  font-size:14.5px;
  color:#e2e8f0;
  line-height:1.4;
  cursor:pointer;
  transition:all .15s ease;
}
.opt-modern:hover:not(:disabled){
  background:rgba(30,41,82,.85);
  border-color:rgba(148,174,255,.3);
  transform:translateY(-1px);
}
.opt-modern:active:not(:disabled){
  transform:scale(.99);
}
.opt-modern:disabled{cursor:default}
.lt-badge{
  flex:none;
  width:32px;
  height:32px;
  border-radius:8px;
  display:grid;
  place-items:center;
  background:rgba(148,174,255,.1);
  border:1px solid rgba(148,174,255,.15);
  font-family:var(--display);
  font-size:13px;
  font-weight:600;
  color:#38bdf8;
  transition:all .15s;
}
.ot-text{flex:1}
.status-icon{
  flex:none;
  display:flex;
  align-items:center;
  justify-content:center;
}
.status-icon.ok{color:#22c55e}
.status-icon.bad{color:#ef4444}
.opt-modern.ok{
  border-color:#22c55e;
  background:rgba(34,197,94,.12);
  color:#ffffff;
}
.opt-modern.ok .lt-badge{
  background:#22c55e;
  border-color:#22c55e;
  color:#042b1d;
}
.opt-modern.bad{
  border-color:#ef4444;
  background:rgba(239,68,68,.12);
  color:#ffffff;
}
.opt-modern.bad .lt-badge{
  background:#ef4444;
  border-color:#ef4444;
  color:#2a0606;
}
.opt-modern.faded{opacity:.45}

/* KOTAK EVALUASI FEEDBACK MODERN */
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
.fb-modern.ok .fb-verdict{
  color:#22c55e;
}
.fb-explanation{
  font-size:13.5px;
  color:#cbd5e1;
  line-height:1.55;
  margin:0;
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

/* HASIL AKHIR KUIS MODERN */
.starrow-result{
  display:flex;
  gap:8px;
  color:var(--line-2);
  margin-top:6px;
}
.starrow-result .got{
  color:var(--star);
  animation:pop .45s cubic-bezier(.2,.9,.3,1.4) both;
}
@keyframes pop{from{transform:scale(.3);opacity:0}to{transform:scale(1);opacity:1}}
.result-title{
  font-family:var(--display);
  font-size:24px;
  font-weight:600;
  color:#fff;
  margin:4px 0 0;
}
.result-sub{
  font-size:14px;
  color:var(--muted);
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
  max-width:420px;
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
  font-size:16px;
  font-weight:600;
  color:#fff;
}
.gain-card:not(.zero) .gain-num{color:var(--star)}
.gain-desc{
  font-size:12px;
  color:var(--muted);
  line-height:1.3;
}
.next-ship-card{
  width:min(400px,100%);
  display:flex;
  flex-direction:column;
  gap:6px;
}
.nr{
  display:flex;
  justify-content:space-between;
  font-size:13px;
  color:var(--muted);
}
.nr b{color:var(--star)}
.result-acts{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:center;
  margin-top:6px;
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
  .planet-selector-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .opts-modern{grid-template-columns:1fr}
  .body{padding:20px 16px 20px}
  .kinds{padding:16px 44px 0 16px}
}
@media (max-height:540px){
  .quiz{max-height:calc(100vh - 16px)}
  .body{padding:12px 16px 12px;gap:10px}
  .opts-modern{gap:8px}
  .opt-modern{min-height:48px;padding:8px 12px}
  .planet-selector-grid{margin:2px 0;gap:6px}
}
</style>

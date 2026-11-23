<script setup>
// Fenomena Bumi: laboratorium gerhana Matahari & Bulan dengan dukungan data Supabase & Fallback Lokal.
// Mengambil judul, deskripsi edukatif, dan materi fenomena dari useSupabaseContent.js.
import { computed, ref, watch, onMounted } from 'vue';
import { store, game, recordPrediction } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PREDICT } from '~/data/learning.js';

const { getPhenomenon } = useSupabaseContent();
const phenoData = computed(() => getPhenomenon('bumi'));

const L = () => game()?.lab;
const key = computed(() => 'gerhana-' + store.lab.type);
const pq = computed(() => PREDICT[key.value]);
const pick = ref(null), revealed = ref(false), skipped = ref(false), result = ref({ ok: false, reward: 0 });
const asking = computed(() => !store.progress.predict[key.value] && pick.value == null && !skipped.value);

function prepare() {
  pick.value = null;
  revealed.value = false;
  skipped.value = false;
  if (!store.progress.predict[key.value]) {
    L()?.scrub(0);
    store.lab.playing = false;
  }
}

watch(key, prepare);
onMounted(prepare);

function choose(i) {
  pick.value = i;
  game()?.click();
  L()?.replay();
}

function skip() {
  skipped.value = true;
  L()?.replay();
}

watch(() => store.lab.status, (s) => {
  if (pick.value == null || revealed.value || s !== 'total') return;
  result.value = recordPrediction(key.value, pick.value);
  revealed.value = true;
  if (result.value.ok) game()?.correct(); else game()?.wrong();
});

const dur = computed(() => L()?.duration || 120);
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const POVS = [['samping', 'Samping'], ['depan', 'Depan'], ['atas', 'Atas'], ['ikhtisar', 'Jauh'], ['pengamat', 'Dari Bumi'], ['bebas', 'Bebas']];
const sun = computed(() => store.lab.type === 'matahari');
const pct = computed(() => Math.round(store.lab.covered * 100));

const STAGE = {
  matahari: { sebagian: 'Sebagian', cincin: 'Cincin', total: 'Total' },
  bulan: { penumbra: 'Penumbra', sebagian: 'Sebagian', total: 'Total' },
};

const status = computed(() => {
  const s = store.lab.status;
  if (sun.value) {
    return s === 'total' ? ['Gerhana Matahari total', 'Siang mendadak gelap, korona terlihat']
      : s === 'cincin' ? ['Gerhana cincin', 'Tepi Matahari tetap bersinar']
      : s === 'sebagian' ? ['Gerhana sebagian', `${pct.value}% Matahari tertutup`] : ['Belum gerhana', 'Bulan belum segaris'];
  }
  return s === 'total' ? ['Gerhana Bulan total', 'Bulan berwarna merah tembaga']
    : s === 'sebagian' ? ['Gerhana sebagian', `${pct.value}% Bulan masuk umbra`]
    : s === 'penumbra' ? ['Gerhana penumbra', 'Bulan hanya sedikit meredup'] : ['Belum gerhana', 'Bulan purnama biasa'];
});

const why = computed(() => {
  if (sun.value && phenoData.value?.penjelasan_matahari) {
    return [phenoData.value.judul_matahari || 'Kenapa bisa pas menutup?', phenoData.value.penjelasan_matahari];
  }
  if (!sun.value && phenoData.value?.penjelasan_bulan) {
    return [phenoData.value.judul_bulan || 'Kenapa Bulan jadi merah?', phenoData.value.penjelasan_bulan];
  }
  return sun.value
    ? ['Kenapa bisa pas menutup?', 'Matahari sekitar 400 kali lebih lebar dari Bulan, tapi juga sekitar 400 kali lebih jauh. Dari Bumi, ukurannya tampak hampir sama.']
    : ['Kenapa Bulan jadi merah?', 'Cahaya Matahari menembus atmosfer Bumi. Biru dihamburkan, merah dibelokkan sampai ke Bulan — seperti semua matahari terbenam di Bumi terlihat sekaligus.'];
});

const dia = computed(() => store.lab.dia && store.lab.dia.kind === store.lab.type ? store.lab.dia : null);
const marks = computed(() => store.lab.marks || []);

function scrub(e) {
  L()?.scrub(parseFloat(e.target.value));
}

function togglePlay() {
  store.lab.playing = !store.lab.playing;
  if (store.lab.playing && store.lab.t >= dur.value) L()?.replay();
}

const f3 = (v) => (+v).toFixed(3);
</script>

<template>
  <div>
    <!-- Judul Fenomena (Tersambung ke Supabase & Fallback Lokal) -->
    <div class="stage-title">
      <span class="tag">Fenomena Bumi</span>
      <h1 class="h1">{{ phenoData?.title || 'Gerhana Matahari & Bulan' }}</h1>
      <p v-if="phenoData?.deskripsi_edukatif || phenoData?.short" class="pheno-sub">
        {{ phenoData?.deskripsi_edukatif || phenoData?.short }}
      </p>
      <div class="seg" role="tablist" aria-label="Jenis gerhana">
        <button role="tab" :aria-selected="sun" :class="{ on: sun }" @click="L()?.setType('matahari')">
          <UiIcon name="matahari" :size="16" /> Matahari
        </button>
        <button role="tab" :aria-selected="!sun" :class="{ on: !sun }" @click="L()?.setType('bulan')">
          <UiIcon name="bulan" :size="16" /> Bulan
        </button>
      </div>
    </div>

    <div class="stage-bottom tlw">
      <div class="tl card flat">
        <button class="ib" :aria-label="store.lab.playing ? 'Jeda' : 'Putar'" @click="togglePlay">
          <UiIcon :name="store.lab.playing ? 'jeda' : 'putar'" :size="20" />
        </button>
        <div class="scrub">
          <input type="range" min="0" :max="dur" step="0.1" :value="store.lab.t" aria-label="Geser waktu gerhana" @input="scrub">
          <div class="zones" aria-hidden="true">
            <i v-for="(m, k) in marks" :key="k" :class="m.kind" :style="{ left: m.from * 100 + '%', width: (m.to - m.from) * 100 + '%' }" />
          </div>
          <div class="legend">
            <span v-for="(lb, k) in STAGE[store.lab.type]" :key="k" :class="k">{{ lb }}</span>
          </div>
        </div>
        <b class="num tm">{{ fmt(store.lab.t) }}</b>
        <div class="seg sp" role="group" aria-label="Kecepatan">
          <button v-for="s in [.5, 1, 2]" :key="s" :class="{ on: store.lab.speed === s }" @click="store.lab.speed = s">{{ s }}×</button>
        </div>
      </div>
    </div>

    <aside class="sheet card" aria-label="Penjelasan gerhana">
      <div v-if="asking" class="sbody scroll">
        <UiPredictCard :q="pq" @pick="choose" />
      </div>
      <div v-else class="sbody scroll">
        <!-- Diagram langsung: apa yang terjadi sekarang -->
        <figure class="dia" :class="store.lab.status" aria-hidden="true">
          <svg v-if="!sun" viewBox="-1.9 -1.1 3.8 2.2">
            <defs><clipPath id="umb"><circle :r="f3(dia?.ru ?? .45)" /></clipPath></defs>
            <circle r="1" class="pen" />
            <circle :r="f3(dia?.ru ?? .45)" class="umb" />
            <line x1="-1.9" x2="1.9" y1="0" y2="0" class="path" />
            <template v-if="dia">
              <circle :cx="f3(dia.mx)" :cy="f3(-dia.my)" :r="f3(dia.mr)" class="moon" />
              <circle :cx="f3(dia.mx)" :cy="f3(-dia.my)" :r="f3(dia.mr)" class="moon red" clip-path="url(#umb)" />
            </template>
            <text x="0" y="-.78" class="lb">penumbra</text>
            <text x="0" :y="f3(-(dia?.ru ?? .45) + .16)" class="lb">umbra</text>
          </svg>
          <svg v-else viewBox="-3 -1.5 6 3">
            <defs>
              <radialGradient id="sg"><stop offset="0" stop-color="#fff4cf" /><stop offset=".75" stop-color="#ffc35a" /><stop offset="1" stop-color="#ff8a2a" /></radialGradient>
              <radialGradient id="cg"><stop offset=".55" stop-color="#fff" stop-opacity=".9" /><stop offset="1" stop-color="#9fb4ff" stop-opacity="0" /></radialGradient>
            </defs>
            <circle r="1.9" fill="url(#cg)" class="corona" />
            <circle r="1" fill="url(#sg)" />
            <circle v-if="dia" :cx="f3(dia.mx)" :cy="f3(-dia.my)" :r="f3(dia.mr)" class="smoon" />
          </svg>
          <figcaption><b>{{ status[0] }}</b><small>{{ status[1] }}</small></figcaption>
        </figure>

        <UiPredictCard v-if="pick != null" :q="pq" :picked="pick" :revealed="revealed" :ok="result.ok" :reward="result.reward" :why="pq.why" wait="Tunggu sampai gerhana total…" />
        <div v-else class="why">
          <h3>{{ why[0] }}</h3>
          <p>{{ why[1] }}</p>
        </div>

        <div>
          <h3 class="lbl">Sudut pandang</h3>
          <div class="povs">
            <button v-for="[id, lb] in POVS" :key="id" class="chip" :class="{ on: store.lab.pov === id }" @click="L()?.setPOV(id)">{{ lb }}</button>
          </div>
        </div>
        <UiToggle v-model="store.lab.labels" label="Label" />
        <UiToggle v-model="store.lab.volume" label="Tampilkan bayangan" />
        <p class="fine">Materi disinkronkan dengan data edukasi Supabase &amp; katalog AstroSphere.</p>
      </div>

      <div v-if="asking" class="sfoot">
        <button class="btn ghost block" @click="skip">Lewati, langsung lihat</button>
      </div>
      <div v-else class="sfoot">
        <div class="row2">
          <button class="btn" @click="L()?.resetCam()"><UiIcon name="target" :size="18" />Atur kamera</button>
          <button class="btn" @click="L()?.replay()"><UiIcon name="ulang" :size="18" />Ulangi</button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.stage-title .seg button{display:inline-flex;align-items:center;gap:6px}
.stage-title .seg{align-self:flex-start}
.pheno-sub{margin:4px 0 8px 0;font-size:13.5px;color:var(--faint);max-width:38ch;line-height:1.4}
.tlw{right:calc(min(400px,36vw) + var(--gap) * 2 + var(--safe-r));max-width:none}
.tl{width:100%;display:flex;align-items:center;gap:14px;padding:10px 14px 10px 10px;border-radius:var(--r-lg)}
.scrub{flex:1;display:flex;flex-direction:column;gap:6px;padding-top:6px;min-width:0}
.zones{position:relative;height:6px;border-radius:999px;background:var(--surface-3);overflow:hidden}
.zones i{position:absolute;top:0;bottom:0}
.penumbra{--z:#7d8cc4}.sebagian{--z:var(--star)}.total{--z:#ff7a4d}.cincin{--z:#ffb347}
.zones i{background:var(--z)}
.legend{display:flex;gap:14px;font-size:12px;color:var(--faint)}
.legend span{display:inline-flex;align-items:center;gap:6px}
.legend span::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--z)}
<<<<<<< HEAD
.tm{font-weight:500;font-size:17px;min-width:52px;text-align:right}
=======
.tm{font-weight: 500;font-size:17px;min-width:52px;text-align:right}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731

.dia{margin:0;border-radius:var(--r);background:#070b1f;border:1px solid var(--line);overflow:hidden}
.dia svg{display:block;width:100%;height:auto;aspect-ratio:19/11}
.dia svg[viewBox^="-3"]{aspect-ratio:2/1}
.pen{fill:rgba(125,140,196,.16);stroke:rgba(125,140,196,.45);stroke-width:.012}
.umb{fill:rgba(92,24,14,.75);stroke:rgba(255,122,77,.45);stroke-width:.012}
.path{stroke:rgba(255,255,255,.25);stroke-width:.012;stroke-dasharray:.05 .05}
.moon{fill:#e9e6de;transition:fill .3s}
.penumbra .moon{fill:#b8b8b4}
.moon.red{fill:#a8441f}
.total .moon.red{fill:#b8482a}
.lb{fill:rgba(207,214,240,.6);font-size:.11px;text-anchor:middle;font-family:var(--font)}
.corona{opacity:0;transition:opacity .4s}
.total .corona{opacity:1}
.smoon{fill:#0a0e22;stroke:#1d2550;stroke-width:.015}
.dia figcaption{display:flex;flex-direction:column;gap:2px;padding:12px 14px 14px;background:var(--surface-2)}
<<<<<<< HEAD
.dia figcaption b{font-family:var(--display);font-weight:500;font-size:18px}
.dia figcaption small{font-size:13.5px;color:var(--muted)}
.dia.total figcaption b{color:#ff9a6e}
.why{padding:14px;border-radius:var(--r);background:rgba(255,201,71,.08);border:1px solid rgba(255,201,71,.22)}
.why h3{font-family:var(--display);font-weight:500;font-size:15.5px;color:var(--star);margin-bottom:6px}
.why p{font-size:14.5px;color:var(--muted);line-height:1.6}
.lbl{font-family:var(--display);font-weight:500;font-size:15px;margin-bottom:8px}
=======
.dia figcaption b{font-family:var(--display);font-weight: 500;font-size:18px}
.dia figcaption small{font-size:13.5px;color:var(--muted)}
.dia.total figcaption b{color:#ff9a6e}
.why{padding:14px;border-radius:var(--r);background:rgba(255,201,71,.08);border:1px solid rgba(255,201,71,.22)}
.why h3{font-family:var(--display);font-weight: 500;font-size:15.5px;color:var(--star);margin-bottom:6px}
.why p{font-size:14.5px;color:var(--muted);line-height:1.6}
.lbl{font-family:var(--display);font-weight: 500;font-size:15px;margin-bottom:8px}
>>>>>>> 0bd5bb9719f62929bc67a5fc271172798cf3f731
.povs{display:flex;flex-wrap:wrap;gap:8px}
.fine{font-size:12.5px;color:var(--faint)}
@media (max-width:760px){
  .tlw{right:12px}
  .tl{gap:8px;padding:8px}
  .sp,.legend{display:none}
  .stage-title .h1{font-size:32px}
  .dia svg{max-height:120px}
}
</style>

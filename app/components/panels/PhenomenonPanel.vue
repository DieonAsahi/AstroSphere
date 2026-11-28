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
const pq = computed(() => {
  const td = phenoData.value?.tebak_dulu;
  const custom = td && typeof td === 'object' ? td[key.value] : null;
  if (custom && custom.q) return custom;
  if (td && typeof td === 'object' && td.q) return td;
  return PREDICT[key.value];
});
const pick = ref(null), revealed = ref(false), skipped = ref(false), result = ref({ ok: false, reward: 0 });
const sheetRef = ref(null);
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
  result.value = recordPrediction(key.value, pick.value, pq.value);
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
      <span class="stage-eyebrow">FENOMENA BUMI</span>
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

    <aside ref="sheetRef" class="sheet card" aria-label="Penjelasan gerhana">
      <div v-if="asking" class="sheet-body sheet-scroll sbody scroll">
        <UiPredictCard :q="pq" @pick="choose" />
      </div>
      <div v-else class="sheet-body sheet-scroll sbody scroll">
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

        <UiPredictCard v-if="pick != null" :q="pq" :picked="pick" :revealed="revealed" :ok="result.ok" :reward="result.reward" :why="pq?.why || why[1]" wait="Tunggu sampai gerhana total…" />
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
        <div class="fine-ref-wrap">
          <span class="fine-lbl">Sumber:</span>
          <UiReferenceSource
            :source="phenoData?.sumber_referensi"
            fallback="NASA"
            class="fine-content"
          />
          <span class="fine-suffix">· Katalog Edukasi AstroSphere.</span>
        </div>
      </div>

      <div v-if="asking" class="sfoot">
        <button class="btn-foot ghost block" @click="skip">Lewati, langsung lihat</button>
      </div>
      <div v-else class="sfoot">
        <div class="row2">
          <button class="btn-foot line" @click="L()?.resetCam()"><UiIcon name="target" :size="17" />Atur kamera</button>
          <button class="btn-foot line" @click="L()?.replay()"><UiIcon name="ulang" :size="17" />Ulangi</button>
        </div>
      </div>
      <UiScrollHint :target="sheetRef" />
    </aside>
  </div>
</template>

<style scoped>
/* ---------- JUDUL KIRI ATAS FENOMENA ---------- */
.stage-title{
  position:fixed;
  left:calc(var(--gap) + var(--safe-l));
  top:calc(var(--top) + 46px + var(--safe-t));
  z-index:21;
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:0;
  max-width:min(420px, 42vw);
  pointer-events:none;
}
.stage-title>*{pointer-events:auto}
.stage-eyebrow{
  display:block;
  font-family:var(--display);
  font-size:11px;
  font-weight:600;
  letter-spacing:0.08em;
  text-transform:uppercase;
  color:#38bdf8;
  margin:0 0 4px 0;
  line-height:1.2;
}
.stage-title .h1{
  font-family:var(--display);
  font-size:clamp(24px, 2.4vw, 30px);
  font-weight:600;
  line-height:1.15;
  letter-spacing:-0.02em;
  max-width:340px;
  color:#fff;
  text-shadow:0 2px 14px rgba(0, 0, 0, 0.7), 0 1px 3px rgba(0, 0, 0, 0.8);
  margin:0;
}
.pheno-sub{
  margin:6px 0 12px 0;
  font-size:13px;
  color:#94a3b8;
  max-width:340px;
  line-height:1.45;
}

/* ---------- SEGMENTED CONTROL MATAHARI | BULAN ---------- */
.stage-title .seg{
  align-self:flex-start;
  border-radius:10px !important;
  padding:3px;
  background:rgba(11, 16, 36, 0.85);
  border:1px solid rgba(148, 174, 255, 0.16);
  display:inline-flex;
  gap:4px;
}
.stage-title .seg button{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-height:34px;
  height:34px;
  padding:0 14px;
  border-radius:8px !important;
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  color:var(--muted);
  transition:all .15s ease;
}
.stage-title .seg button:hover{
  color:var(--text);
}
.stage-title .seg button.on{
  background:#3b82f6 !important;
  color:#fff !important;
  font-weight:600;
  box-shadow:0 2px 8px rgba(59, 130, 246, 0.35);
}

/* ---------- BILAH KONTROL TIMELINE BAWAH ---------- */
.tlw{right:calc(min(400px,36vw) + var(--gap) * 2 + var(--safe-r));max-width:none}
.tl{
  width:100%;
  display:flex;
  align-items:center;
  gap:12px;
  padding:8px 12px;
  border-radius:12px !important;
  background:rgba(10, 14, 28, 0.90) !important;
  border:1px solid rgba(148, 174, 255, 0.16) !important;
  backdrop-filter:blur(14px);
  -webkit-backdrop-filter:blur(14px);
  box-shadow:0 8px 24px rgba(0, 0, 0, 0.45);
}
.tl .ib{
  width:36px;
  height:36px;
  min-width:36px;
  min-height:36px;
  border-radius:8px !important;
  background:rgba(148, 174, 255, 0.08);
  border:1px solid rgba(148, 174, 255, 0.16);
  color:var(--text);
  display:grid;
  place-items:center;
  transition:all .15s ease;
}
.tl .ib:hover{
  background:rgba(148, 174, 255, 0.18);
  border-color:rgba(148, 174, 255, 0.32);
}
.scrub{flex:1;display:flex;flex-direction:column;gap:6px;padding-top:2px;min-width:0}
.zones{position:relative;height:6px;border-radius:3px;background:rgba(148, 174, 255, 0.12);overflow:hidden}
.zones i{position:absolute;top:0;bottom:0}
.penumbra{--z:#7d8cc4}.sebagian{--z:var(--star)}.total{--z:#ff7a4d}.cincin{--z:#ffb347}
.zones i{background:var(--z)}
.legend{display:flex;gap:12px;font-size:11.5px;color:#94a3b8}
.legend span{display:inline-flex;align-items:center;gap:5px}
.legend span::before{content:'';width:7px;height:7px;border-radius:2px;background:var(--z)}
.tm{font-family:var(--display);font-weight:600;font-size:15px;color:#f8fafc;font-variant-numeric:tabular-nums;min-width:48px;text-align:right}

.tl .seg.sp{
  border-radius:8px !important;
  padding:2px;
  background:rgba(11, 16, 36, 0.8);
  border:1px solid rgba(148, 174, 255, 0.16);
  display:inline-flex;
  gap:2px;
}
.tl .seg.sp button{
  border-radius:6px !important;
  height:30px;
  min-height:30px;
  padding:0 8px;
  font-family:var(--display);
  font-size:12px;
  font-weight:500;
  color:var(--muted);
  transition:all .15s ease;
}
.tl .seg.sp button:hover{
  color:var(--text);
}
.tl .seg.sp button.on{
  background:#3b82f6 !important;
  color:#fff !important;
  font-weight:600;
  box-shadow:0 2px 6px rgba(59, 130, 246, 0.3);
}

/* ---------- CARD PANEL KANAN (OBSERVATORIUM BERSIH) ---------- */
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
  gap:14px;
}
.sheet .sheet-body > *,
.sheet .sheet-scroll > *,
.sheet .sbody > *{
  flex-shrink:0;
}
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
.sheet .sheet-body.scroll::-webkit-scrollbar-track,
.sheet .sheet-scroll.scroll::-webkit-scrollbar-track,
.sheet .sbody.scroll::-webkit-scrollbar-track{
  background:transparent;
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

.dia{
  margin:0;
  flex-shrink:0;
  width:100%;
  border-radius:10px !important;
  background:rgba(7, 11, 31, 0.9);
  border:1px solid rgba(148, 174, 255, 0.16);
  overflow:hidden;
  display:flex;
  flex-direction:column;
}
.dia svg{
  display:block;
  width:100%;
  height:auto;
  flex-shrink:0;
  overflow:visible;
  padding:10px 8px 4px;
  box-sizing:border-box;
}
.pen{fill:rgba(125,140,196,.16);stroke:rgba(125,140,196,.45);stroke-width:.012}
.umb{fill:rgba(92,24,14,.75);stroke:rgba(255,122,77,.45);stroke-width:.012}
.path{stroke:rgba(255,255,255,.25);stroke-width:.012;stroke-dasharray:.05 .05}
.moon{fill:#e9e6de;transition:fill .3s}
.penumbra .moon{fill:#b8b8b4}
.moon.red{fill:#a8441f}
.total .moon.red{fill:#b8482a}
.lb{fill:rgba(207,214,240,.75);font-size:.11px;text-anchor:middle;font-family:var(--font)}
.corona{opacity:0;transition:opacity .4s}
.total .corona{opacity:1}
.smoon{fill:#0a0e22;stroke:#1d2550;stroke-width:.015}
.dia figcaption{
  flex-shrink:0;
  display:flex;
  flex-direction:column;
  gap:2px;
  padding:12px 14px 14px;
  background:rgba(15, 23, 42, 0.75);
  border-top:1px solid rgba(148, 174, 255, 0.12);
}
.dia figcaption b{font-family:var(--display);font-weight:600;font-size:16px;color:#f8fafc}
.dia figcaption small{font-size:12.5px;color:#94a3b8}
.dia.total figcaption b{color:#ff9a6e}

.why{
  padding:14px;
  border-radius:10px !important;
  background:rgba(245, 158, 11, 0.08);
  border:1px solid rgba(245, 158, 11, 0.22);
}
.why h3{font-family:var(--display);font-weight:600;font-size:14.5px;color:#fbbf24;margin-bottom:6px}
.why p{font-size:13.5px;color:#cbd5e1;line-height:1.55;margin:0}

.lbl{font-family:var(--display);font-weight:600;font-size:13.5px;color:#f8fafc;margin-bottom:8px}
.povs{display:flex;flex-wrap:wrap;gap:8px}
.povs .chip{
  border-radius:8px !important;
  min-height:32px;
  height:32px;
  padding:0 12px;
  font-family:var(--display);
  font-size:12.5px;
  font-weight:500;
  background:rgba(148, 174, 255, 0.08);
  border:1px solid rgba(148, 174, 255, 0.16);
  color:var(--muted);
  transition:all .15s ease;
  cursor:pointer;
}
.povs .chip:hover{
  background:rgba(148, 174, 255, 0.16);
  border-color:rgba(148, 174, 255, 0.28);
  color:var(--text);
}
.povs .chip.on{
  background:#3b82f6 !important;
  border-color:#3b82f6 !important;
  color:#fff !important;
  font-weight:600;
  box-shadow:0 2px 8px rgba(59, 130, 246, 0.35);
}
.fine{font-size:11.5px;color:#64748b;line-height:1.4}
.fine-ref-wrap{
  display:flex;
  align-items:baseline;
  flex-wrap:wrap;
  gap:4px 6px;
  font-size:11.5px;
  color:#64748b;
  line-height:1.4;
  margin-top:8px;
  min-width:0;
  max-width:100%;
}
.fine-lbl{
  font-weight:500;
  color:#64748b;
  flex-shrink:0;
}
.fine-content{
  display:inline-flex;
  min-width:0;
}
.fine-suffix{
  color:#64748b;
}

/* ---------- FOOTER KANAN (TOMBOL AKSI MODERN) ---------- */
.sfoot{
  flex:none;
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

@media (max-width:760px){
  .tlw{right:12px;left:12px}
  .tl{gap:8px;padding:8px}
  .sp,.legend{display:none}
  .stage-title{
    left:calc(var(--gap) + var(--safe-l));
    top:calc(var(--top) + 46px + var(--safe-t));
  }
  .stage-title .h1{font-size:clamp(24px, 2.4vw, 30px)}
  .sheet{
    left:0;
    right:0;
    width:auto;
    top:auto;
    bottom:0;
    max-height:55vh;
    border-radius:16px 16px 0 0 !important;
  }
}
@media (max-height:540px) and (orientation:landscape){
  .sheet{
    left:auto !important;
    right:calc(10px + var(--safe-r)) !important;
    top:calc(44px + var(--safe-t)) !important;
    bottom:calc(10px + var(--safe-b)) !important;
    width:min(285px, 43vw) !important;
    height:auto !important;
    max-height:none !important;
    border-radius:12px !important;
    border-bottom:1px solid rgba(148,174,255,.16) !important;
    padding:10px 12px !important;
    overflow-y:auto !important;
    overflow-x:hidden !important;
    display:flex !important;
    flex-direction:column !important;
  }
  .sheet::before{display:none !important}
  .sheet .sheet-body,
  .sheet .sheet-scroll,
  .sheet .sbody{
    overflow:visible !important;
    flex:none !important;
    height:auto !important;
    padding:0 !important;
    gap:8px !important;
  }
  .sfoot{
    position:static !important;
    flex:none !important;
    margin-top:10px !important;
    padding:8px 0 36px 0 !important;
    border-top:1px solid rgba(148,174,255,.14) !important;
    background:transparent !important;
  }
  .btn-foot{
    height:34px !important;
    min-height:34px !important;
    font-size:12px !important;
    padding:0 8px !important;
  }
  .dia figcaption {
    padding: 6px 8px !important;
  }
  .dia figcaption b {
    font-size: 12px !important;
  }
  .dia figcaption small {
    font-size: 10px !important;
  }
  .why {
    padding: 8px 10px !important;
  }
  .why h3 {
    font-size: 12px !important;
    margin-bottom: 3px !important;
  }
  .why p {
    font-size: 10.5px !important;
    line-height: 1.35 !important;
  }
  .lbl {
    font-size: 11px !important;
    margin-bottom: 4px !important;
  }
  .povs {
    gap: 4px !important;
  }
  .povs .chip {
    height: 26px !important;
    min-height: 26px !important;
    padding: 0 8px !important;
    font-size: 11px !important;
  }
  .stage-title{
    top:calc(40px + var(--safe-t)) !important;
    max-width:calc(100vw - min(285px, 43vw) - 30px) !important;
  }
  .stage-title .h1{
    font-size:15px !important;
    margin-bottom:2px !important;
  }
  .pheno-sub{
    display:none !important;
  }
  .stage-title .seg button{
    height:26px !important;
    padding:0 8px !important;
    font-size:11px !important;
  }
  .tlw{
    right:auto !important;
    left:calc(var(--gap) + var(--safe-l)) !important;
    bottom:calc(8px + var(--safe-b)) !important;
    max-width:calc(100vw - min(285px, 43vw) - 30px) !important;
  }
  .tl{
    padding:4px 8px !important;
    gap:6px !important;
    border-radius:8px !important;
  }
  .tl .ib{
    width:28px !important;
    height:28px !important;
    min-width:28px !important;
    min-height:28px !important;
    border-radius:6px !important;
  }
  .tl .sp{
    display:none !important;
  }
  .tl .tm{
    font-size:11px !important;
  }
  .legend span{
    font-size:9px !important;
  }
  .fine,
  .fine-ref-wrap {
    font-size: 10px !important;
    gap: 3px 5px !important;
    margin-top: 5px !important;
  }
}
</style>

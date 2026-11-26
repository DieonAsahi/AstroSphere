<script setup>
// Halaman Matahari (mode Planet dengan fokus 'matahari'). Tata letak & gaya mengikuti PlanetPanel.vue:
// judul kiri atas, kontrol waktu kiri bawah, kartu kanan (ringkasan, data ilmiah, topik yang jarang diketahui,
// peringatan keselamatan) dan tombol aksi di kaki kartu (Fenomena, Tahukah kamu?, Mitos/Fakta).
// Fenomena Matahari = "Badai Matahari" (data/phenomena.js → matahari), diputar langsung pada Matahari 3D seperti planet lain.
// Gaya kartu disalin dari PlanetPanel.vue — bila desain kartu planet berubah, samakan juga di sini.
import { ref, computed } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { SUN } from '~/data/solarSystem.js';
import { SUN_TOPICS, FACTS } from '~/data/learning.js';
import { PHENOMENA } from '~/data/phenomena.js';

const { getPhenomenon, getFacts } = useSupabaseContent();

const SCI = [
  { k: 'Diameter', v: '1.392.700 km', sub: '109× ukuran Bumi' },
  { k: 'Periode Rotasi', v: '± 25,4 hari', sub: 'Di ekuator, ± 35 hari di kutub' },
  { k: 'Suhu Permukaan', v: '± 5.500 °C', sub: 'Lapisan fotosfer' },
  { k: 'Suhu Inti', v: '± 15 juta °C', sub: 'Tempat fusi nuklir' },
  { k: 'Massa', v: '99,86%', sub: 'Dari seluruh massa tata surya' },
  { k: 'Usia', v: '± 4,6 miliar th', sub: 'Kira-kira separuh umurnya' },
];
const open = ref('halo');
function toggle(id) { open.value = open.value === id ? null : id; game()?.click(); }
const ph = computed(() => {
  const item = getPhenomenon('matahari');
  if (item) return item.is_active !== false ? item : null;
  return PHENOMENA.matahari || null;
});
const hasSunFacts = computed(() => (getFacts('matahari')?.length || FACTS.matahari?.length || 0) > 0);
const stateIcon = computed(() => ({ aktif: 'matahari', suar: 'kilat', cme: 'fenomena', aurora: 'planet' }[store.pheno.state] || 'fenomena'));
function phenomenon() { if (ph.value) game()?.pheno.start('matahari'); }
function lab() { store.lab.type = 'matahari'; store.lab.caller = 'planet'; game()?.setMode('fenomena'); }
function facts() { store.journalId = 'matahari'; store.modal = 'journal'; }
function myths() { store.quiz.kind = 'mitos'; store.quiz.mythStage = 'intro'; game()?.setMode('kuis'); }
</script>

<template>
  <div>
    <div class="stage-title">
      <span class="stage-eyebrow">Bintang pusat tata surya</span>
      <h1 class="h1">Matahari</h1>
    </div>

    <div v-if="!store.pheno.on" class="stage-bottom"><PanelsTimeBar /></div>

    <aside class="sheet card" aria-label="Tentang Matahari">
      <div v-if="store.pheno.on" class="sbody scroll">
        <span class="tag-ph"><UiIcon name="fenomena" :size="13" />Fenomena</span>
        <h2 class="h2">{{ ph?.title || 'Badai Matahari' }}</h2>
        <p class="desc">{{ ph?.short }}</p>
        <div class="live" :class="store.pheno.state" aria-live="polite">
          <span class="ico"><UiIcon :name="stateIcon" :size="24" /></span>
          <div><b>{{ store.pheno.line1 || '…' }}</b><small>{{ store.pheno.line2 }}</small></div>
        </div>
        <p class="small">Di alam, suar berlangsung beberapa menit dan CME butuh berhari-hari. Di sini dipercepat. Seret layar untuk memutar kamera.</p>
      </div>
      <div v-else class="sbody scroll">
        <div class="summary-card">
          <span class="section-label">Ringkasan</span>
          <p class="desc">Bola gas panas raksasa yang menyumbang 99,86% massa tata surya. Cahayanya sampai ke Bumi dalam 8 menit 20 detik.</p>
        </div>

        <div class="sci-section">
          <span class="section-label">Data ilmiah</span>
          <div class="facts grid-sci">
            <div v-for="f in SCI" :key="f.k" class="tile fact">
              <span class="f-lbl">{{ f.k }}</span>
              <b class="num">{{ f.v }}</b>
              <span class="f-sub">{{ f.sub }}</span>
            </div>
          </div>
          <div class="sci-source"><UiIcon name="info" :size="12" /><span>Sumber data: {{ SUN.sumber_referensi }}</span></div>
        </div>

        <div class="topics">
          <span class="section-label">Yang jarang diketahui</span>
          <section v-for="t in SUN_TOPICS" :key="t.id" class="tp" :class="{ on: open === t.id }">
            <button class="th" :aria-expanded="open === t.id" @click="toggle(t.id)">
              <span>{{ t.title }}</span><UiIcon name="turun" :size="16" class="chev" />
            </button>
            <div v-if="open === t.id" class="tb">
              <svg v-if="t.art === 'halo'" class="art" viewBox="0 0 220 120" role="img" aria-label="Ilustrasi halo 22 derajat di sekeliling Matahari">
                <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2e66c9" /><stop offset="1" stop-color="#8db8f0" /></linearGradient>
                  <radialGradient id="sunG"><stop offset="0" stop-color="#fff" /><stop offset=".5" stop-color="#fff7d6" /><stop offset="1" stop-color="#fff7d6" stop-opacity="0" /></radialGradient></defs>
                <rect width="220" height="120" fill="url(#sky)" />
                <path d="M0 92 Q60 78 120 90 T220 84" stroke="rgba(255,255,255,.35)" stroke-width="10" fill="none" stroke-linecap="round" />
                <circle cx="110" cy="58" r="44" fill="none" stroke="rgba(255,140,110,.75)" stroke-width="2.5" />
                <circle cx="110" cy="58" r="47" fill="none" stroke="rgba(255,240,200,.55)" stroke-width="3" />
                <circle cx="110" cy="58" r="50.5" fill="none" stroke="rgba(170,200,255,.45)" stroke-width="3" />
                <circle cx="110" cy="58" r="16" fill="url(#sunG)" />
                <line x1="110" y1="58" x2="141" y2="27" stroke="#fff" stroke-width="1.2" stroke-dasharray="3 3" />
                <text x="128" y="50" fill="#fff" font-size="11" font-family="Poppins, sans-serif">22°</text>
              </svg>
              <svg v-else-if="t.art === 'cincin'" class="art" viewBox="0 0 220 120" role="img" aria-label="Ilustrasi gerhana cincin">
                <defs><radialGradient id="glow"><stop offset=".55" stop-color="#ffb347" stop-opacity=".8" /><stop offset="1" stop-color="#ffb347" stop-opacity="0" /></radialGradient></defs>
                <rect width="220" height="120" fill="#0a0e24" />
                <circle cx="110" cy="60" r="54" fill="url(#glow)" />
                <circle cx="110" cy="60" r="34" fill="#ffd36e" />
                <circle cx="110" cy="60" r="29.5" fill="#0a0e24" />
              </svg>
              <p>{{ t.t }}</p>
              <button v-if="t.lab" class="btn-foot line" @click="lab"><UiIcon name="fenomena" :size="16" />Coba di lab gerhana</button>
            </div>
          </section>
        </div>

        <div class="safe-box" role="note">
          <UiIcon name="mata" :size="16" />
          <p>Jangan pernah menatap Matahari langsung, juga saat gerhana atau ada halo.</p>
        </div>
      </div>

      <div v-if="store.pheno.on" class="sfoot">
        <div class="row2">
          <button class="btn-foot line" @click="game()?.pheno.toggle()">
            <UiIcon :name="store.pheno.playing ? 'jeda' : 'putar'" :size="17" />{{ store.pheno.playing ? 'Jeda' : 'Putar' }}
          </button>
          <button class="btn-foot line" @click="game()?.pheno.restart()"><UiIcon name="ulang" :size="17" />Ulangi</button>
        </div>
        <button class="btn-foot primary block success" @click="game()?.pheno.stop()"><UiIcon name="cek" :size="18" />Selesai</button>
      </div>
      <div v-else class="sfoot">
        <button v-if="ph" class="btn-foot primary block" @click="phenomenon"><UiIcon name="fenomena" :size="18" />Fenomena</button>
        <div class="row2">
          <button class="btn-foot line" @click="facts">
            <UiIcon name="info" :size="17" /><span class="lb">Tahukah kamu?</span><span v-if="!store.progress.cards.matahari && hasSunFacts" class="nw" />
          </button>
          <button class="btn-foot star" @click="myths"><UiIcon name="kuis" :size="17" /><span class="lb">Mitos/Fakta</span></button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ---------- JUDUL KIRI ATAS (sama dengan PlanetPanel) ---------- */
.stage-title{position:fixed;left:calc(var(--gap) + var(--safe-l));top:calc(var(--top) + 46px + var(--safe-t));z-index:21;display:flex;flex-direction:column;gap:0;max-width:min(560px, 46vw);pointer-events:none}
.stage-title>*{pointer-events:auto}
.stage-eyebrow{display:block;font-family:var(--display);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#38bdf8;margin:0 0 4px;line-height:1.2}
.stage-title .h1{font-family:var(--display);font-size:clamp(24px, 2.4vw, 30px);font-weight:600;line-height:1.15;letter-spacing:-.02em;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.7), 0 1px 3px rgba(0,0,0,.8);margin:0}

/* ---------- KARTU KANAN ---------- */
.sheet{position:fixed;right:calc(var(--gap) + var(--safe-r));top:calc(76px + var(--safe-t));bottom:calc(var(--gap) + var(--safe-b));width:min(400px, 36vw);z-index:22;display:flex;flex-direction:column;overflow:hidden;border-radius:14px !important;background:rgba(10,14,28,.92) !important;border:1px solid rgba(148,174,255,.16) !important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:0 16px 40px rgba(0,0,0,.55)}
.sheet .sbody{flex:1;min-height:0;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:12px;scrollbar-width:thin;scrollbar-color:rgba(148,174,255,.25) transparent}
.sheet .sbody>*{flex-shrink:0}
.sheet .sbody::-webkit-scrollbar{width:5px}
.sheet .sbody::-webkit-scrollbar-thumb{background:rgba(148,174,255,.25);border-radius:3px}

.summary-card{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:10px;background:rgba(15,23,42,.6);border:1px solid rgba(148,174,255,.12)}
.section-label{font-family:var(--display);font-size:10.5px;font-weight:600;letter-spacing:.08em;color:#94a3b8;text-transform:uppercase;line-height:1}
.desc{font-size:13.5px;color:#cbd5e1;line-height:1.55;margin:0}

.sci-section{display:flex;flex-direction:column;gap:10px}
.facts.grid-sci{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fact{display:flex;flex-direction:column;justify-content:flex-start;gap:5px;padding:12px 14px;border-radius:10px;background:rgba(15,23,42,.65);border:1px solid rgba(148,174,255,.14);transition:border-color .15s ease, background .15s ease;min-width:0}
.fact:hover{background:rgba(15,23,42,.85);border-color:rgba(148,174,255,.28)}
.f-lbl{font-family:var(--display);font-size:10.5px;font-weight:600;letter-spacing:.06em;color:#94a3b8;text-transform:uppercase;line-height:1.25}
.fact b.num{font-family:var(--display);font-size:16px;font-weight:600;color:#f8fafc;font-variant-numeric:tabular-nums;line-height:1.2;margin:2px 0 1px}
.f-sub{font-size:11.5px;color:#94a3b8;line-height:1.38}
.sci-source{display:flex;align-items:center;gap:5px;font-size:11px;color:#64748b;margin-top:6px;padding:0 2px}

/* topik yang jarang diketahui (akordeon) */
.topics{display:flex;flex-direction:column;gap:8px}
.topics .section-label{margin-bottom:2px}
.tp{border-radius:10px;background:rgba(15,23,42,.55);border:1px solid rgba(148,174,255,.14);overflow:hidden;transition:border-color .15s ease, background .15s ease}
.tp:hover{border-color:rgba(148,174,255,.28)}
.tp.on{border-color:rgba(245,158,11,.3);background:rgba(15,23,42,.75)}
.th{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;text-align:left;font-family:var(--display);font-weight:600;font-size:13.5px;color:#f8fafc}
.chev{color:#94a3b8;transition:transform .2s;flex:none}
.tp.on .chev{transform:rotate(180deg)}
.tb{display:flex;flex-direction:column;gap:10px;padding:0 14px 14px}
.tb p{font-size:12.5px;color:#94a3b8;line-height:1.5;margin:0}
.tb .btn-foot{align-self:flex-start;height:36px;min-height:36px;font-size:12.5px;padding:0 12px}
.art{display:block;width:100%;height:auto;border-radius:8px}

/* peringatan keselamatan */
.safe-box{display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border-radius:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);color:#fbbf24}
.safe-box :deep(svg){flex:none;margin-top:2px}
.safe-box p{font-size:12.5px;color:#cbd5e1;line-height:1.45;margin:0}

/* ---------- KAKI KARTU: TOMBOL AKSI ---------- */
.sfoot{flex:none;padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;border-top:1px solid rgba(148,174,255,.14);background:rgba(10,14,28,.96)}
.sfoot .row2{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;width:100%}
.btn-foot{height:40px;min-height:40px;min-width:0;padding:0 12px;border-radius:10px;font-family:var(--display);font-size:13.5px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;transition:all .15s ease;border:1px solid transparent;white-space:nowrap}
.btn-foot :deep(svg){flex:none}
.btn-foot .lb{min-width:0;overflow:hidden;text-overflow:ellipsis}
.btn-foot.block{width:100%}
.btn-foot.primary{background:#3b82f6;color:#fff;box-shadow:0 4px 14px rgba(59,130,246,.35)}
.btn-foot.primary:hover{background:#2563eb;transform:translateY(-1px)}
.btn-foot.line{background:rgba(148,174,255,.08);border:1px solid rgba(148,174,255,.18);color:#e2e8f0}
.btn-foot.line:hover{background:rgba(148,174,255,.16);border-color:rgba(148,174,255,.32);color:#fff}
.btn-foot.star{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);color:#fbbf24}
.btn-foot.star:hover{background:rgba(245,158,11,.22);border-color:rgba(245,158,11,.45)}
.nw{flex:none;width:7px;height:7px;border-radius:50%;background:#fbbf24}
.btn-foot.primary.success{background:#16a34a;box-shadow:0 4px 14px rgba(22,163,74,.35)}
.btn-foot.primary.success:hover{background:#15803d}

/* ---------- FENOMENA BERJALAN (sama dengan PlanetPanel) ---------- */
.tag-ph{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;border-radius:8px;font-family:var(--display);font-size:11px;font-weight:600;letter-spacing:.04em;padding:4px 10px;background:rgba(59,130,246,.16);border:1px solid rgba(56,189,248,.3);color:#38bdf8}
.h2{margin:0}
.live{display:flex;align-items:center;gap:12px;padding:14px;border-radius:10px;background:rgba(15,23,42,.6);border:1px solid rgba(148,174,255,.14)}
.live .ico{width:46px;height:46px;border-radius:8px;display:grid;place-items:center;background:rgba(245,158,11,.2);color:#fbbf24;flex:none}
.live.suar .ico{background:rgba(255,255,255,.16);color:#fff7d6}
.live.cme .ico{background:rgba(251,146,60,.2);color:#fb923c}
.live.aurora .ico{background:rgba(34,197,94,.2);color:#4ade80}
.live b{display:block;font-family:var(--display);font-weight:600;font-size:16px;line-height:1.25;color:#f8fafc}
.live small{display:block;font-size:12.5px;color:#94a3b8;margin-top:2px}
.small{font-size:12px;color:#94a3b8;line-height:1.45;margin:0}

/* ---------- RESPONSIF (sama dengan PlanetPanel) ---------- */
@media (max-width:760px){
  .sheet{left:0;right:0;width:auto;top:auto;bottom:0;height:min(52vh, 480px);border-radius:16px 16px 0 0 !important;border-bottom:0 !important;padding-bottom:var(--safe-b)}
  .sheet::before{content:"";display:block;width:38px;height:4px;border-radius:999px;background:rgba(148,174,255,.25);margin:8px auto 0;flex:none}
  .sheet .sbody{padding:12px 14px 22px;gap:10px}
  .sheet .sfoot{padding:12px 14px 14px;gap:8px}
  .stage-title{max-width:calc(100vw - 28px)}
  .stage-bottom{left:12px;right:12px;max-width:none;bottom:calc(min(52vh, 480px) + 10px)}
  .facts.grid-sci{gap:8px}
  .fact{padding:10px 12px}
  .fact b.num{font-size:15px}
  .desc{font-size:13px}
  .btn-foot{font-size:13px;padding:0 10px;gap:6px}
}
@media (max-height:540px) and (orientation:landscape){
  .sheet{left:auto !important;right:calc(10px + var(--safe-r)) !important;top:calc(44px + var(--safe-t)) !important;bottom:calc(10px + var(--safe-b)) !important;width:min(350px, 46vw) !important;height:auto !important;border-radius:14px !important;border-bottom:1px solid rgba(148,174,255,.16) !important;padding-bottom:0 !important}
  .sheet::before{display:none !important}
  .stage-bottom{bottom:calc(10px + var(--safe-b)) !important;max-width:calc(100vw - min(350px, 46vw) - 30px) !important}
}
</style>

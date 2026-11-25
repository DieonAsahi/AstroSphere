<script setup>
// Muncul saat pesawat mendekati planet: pesawat berhenti, pemain memilih melihat planet atau lanjut terbang.
// Mengambil ringkasan materi dan fenomena secara reaktif dari useSupabaseContent (Supabase LIVE / Fallback).
import { computed } from 'vue';
import { store, game, isFound } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PHENOMENA } from '~/data/phenomena.js';
import { PREDICT } from '~/data/learning.js';

const { getPlanet, getPhenomenon, loadedFromDb } = useSupabaseContent();

const planetData = computed(() => getPlanet(store.approach.id));
const phenomenonData = computed(() => {
  const item = getPhenomenon(store.approach.id) || (loadedFromDb.value.phenomena ? null : PHENOMENA[store.approach.id]);
  return item && item.is_active !== false ? item : null;
});

const approachName = computed(() => planetData.value?.nama || store.approach.name);
const approachDesc = computed(() => {
  const materi = planetData.value?.deskripsi_materi;
  if (materi) {
    const firstSentence = materi.split(/(?<=[.!?])\s+/)[0] || materi;
    return firstSentence.trim();
  }
  return store.approach.desc;
});

// Status penemuan baru & jarak terkini
const isNewObject = computed(() => store.approach.isNew || !isFound(store.approach.id));
const statusBadgeText = computed(() => (isNewObject.value ? 'Baru · +5 ★' : 'Terdata di Peta'));
const approachDist = computed(() => {
  if (store.hud.near.id === store.approach.id && store.hud.near.dist && store.hud.near.dist !== '—') {
    return store.hud.near.dist;
  }
  return '';
});

// Fenomena yang belum ditebak ditampilkan sebagai pertanyaan, supaya jawabannya tidak bocor sebelum "Tebak dulu".
const teaser = computed(() => {
  const id = store.approach.id;
  const ph = phenomenonData.value;
  if (!ph) return null;
  const title = ph.title || ph.judul || '';
  const td = ph.tebak_dulu && typeof ph.tebak_dulu === 'object' && ph.tebak_dulu.q
    ? ph.tebak_dulu
    : PREDICT[id];
  return td && !store.progress.predict[id]
    ? { label: 'Tebak dulu', text: td.q }
    : { label: 'Fenomena', text: title };
});
</script>

<template>
  <div class="ap" role="dialog" aria-modal="false" aria-labelledby="ap-t">
    <div class="card box">
      <div class="card-header">
        <div class="header-eyebrow-row">
          <span class="eyebrow">OBJEK TERDETEKSI</span>
          <div class="top-status-badge" :class="{ 'is-new': isNewObject }">
            <UiIcon v-if="isNewObject" name="bintang" :size="12" />
            <UiIcon v-else name="cek" :size="12" />
            <span>{{ statusBadgeText }}</span>
            <span v-if="approachDist" class="badge-dist">· {{ approachDist }}</span>
          </div>
        </div>
        <div class="top">
          <div class="planet-preview-wrap">
            <span
              v-if="store.approach.id === 'saturnus'"
              class="saturn-ring-back"
              aria-hidden="true"
            />
            <span
              class="planet-dot"
              :class="`sphere-${store.approach.id}`"
              :style="{ '--c': store.approach.color }"
            />
            <span
              v-if="store.approach.id === 'saturnus'"
              class="saturn-ring-front"
              aria-hidden="true"
            />
          </div>
          <div class="top-info">
            <div class="title-row">
              <h2 id="ap-t" class="planet-title">{{ approachName }}</h2>
            </div>
            <p class="planet-kind">{{ store.approach.kind }}</p>
          </div>
        </div>
      </div>

      <p class="desc">{{ approachDesc }}</p>

      <div v-if="teaser" class="ph">
        <UiIcon name="fenomena" :size="16" />
        <span>{{ teaser.label }}: <b>{{ teaser.text }}</b></span>
      </div>

      <p class="q">{{ store.approach.id === 'matahari' ? 'Lihat Matahari dari dekat?' : 'Lihat planet ini dari dekat?' }}</p>

      <div class="acts">
        <button class="btn-action primary" @click="game()?.approachYes()">
          <UiIcon name="mata" :size="18" />Ya, lihat
        </button>
        <button class="btn-action line" @click="game()?.approachNo()">
          Tidak, lanjut terbang
        </button>
      </div>

      <p v-if="!store.touch" class="keys"><b class="kbd sm">Enter</b> ya · <b class="kbd sm">Esc</b> tidak</p>
    </div>
  </div>
</template>

<style scoped>
.ap{
  position:fixed;
  inset:0;
  z-index:26;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  pointer-events:none;
  box-sizing:border-box;
}
.box{
  pointer-events:auto;
  width:min(440px, 100%);
  margin-top:clamp(40px, 5.5vh, 56px);
  padding:26px 28px;
  display:flex;
  flex-direction:column;
  border-radius:14px !important;
  background:rgba(10, 14, 32, 0.94) !important;
  border:1px solid rgba(148, 174, 255, 0.18) !important;
  box-shadow:0 16px 40px rgba(0, 0, 0, 0.65) !important;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
}

.card-header{
  display:flex;
  flex-direction:column;
  margin-bottom:16px;
}
.header-eyebrow-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-bottom:12px;
}
.eyebrow{
  font-family:var(--display);
  font-size:11px;
  font-weight:600;
  letter-spacing:0.08em;
  color:#38bdf8;
  text-transform:uppercase;
  margin:0;
}
.top-status-badge{
  display:inline-flex;
  align-items:center;
  gap:5px;
  font-family:var(--display);
  font-size:11px;
  font-weight:500;
  padding:3px 9px;
  border-radius:6px;
  background:rgba(148, 174, 255, 0.08);
  border:1px solid rgba(148, 174, 255, 0.16);
  color:#94a3b8;
  white-space:nowrap;
}
.top-status-badge.is-new{
  background:rgba(245, 158, 11, 0.14);
  border-color:rgba(245, 158, 11, 0.32);
  color:#fbbf24;
}
.badge-dist{
  color:rgba(255, 255, 255, 0.55);
  font-size:10.5px;
}

.top{
  display:flex;
  align-items:center;
  gap:14px;
}
.planet-preview-wrap{
  position:relative;
  width:48px;
  height:48px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex:none;
}
.planet-dot{
  position:relative;
  z-index:1;
  width:48px;
  height:48px;
  border-radius:50%;
  flex:none;
  background:radial-gradient(circle at 34% 30%, rgba(255, 255, 255, 0.55), transparent 45%), var(--c, #888);
  box-shadow:inset -5px -5px 12px rgba(0, 0, 0, 0.75), 0 4px 16px rgba(0, 0, 0, 0.45);
  transition:all .25s ease;
}

/* Karakter Visual Khas 8 Planet & Benda Angkasa */
.planet-dot.sphere-merkurius{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.5) 0%, transparent 35%),
    radial-gradient(circle at 65% 65%, rgba(40,36,32,.7) 0%, transparent 50%),
    radial-gradient(circle at 35% 35%, #b8b1a7 0%, #958f87 35%, #4d4843 75%, #23201d 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(0,0,0,.85), 0 0 14px rgba(163,157,149,.35) !important;
}
.planet-dot.sphere-venus{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.6) 0%, transparent 40%),
    radial-gradient(circle at 35% 35%, #fff1d0 0%, #f7ecd2 20%, #e3bb76 50%, #b48852 80%, #4a3418 100%) !important;
  box-shadow:inset -4px -4px 10px rgba(74,52,24,.75), 0 0 18px rgba(227,187,118,.45) !important;
}
.planet-dot.sphere-bumi{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.65) 0%, transparent 35%),
    radial-gradient(circle at 60% 48%, rgba(45,106,47,.8) 0%, transparent 38%),
    radial-gradient(circle at 38% 68%, rgba(160,138,85,.6) 0%, transparent 35%),
    radial-gradient(circle at 32% 32%, #60a5fa 0%, #1e40af 45%, #0f2b5c 80%, #030c1d 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(3,12,29,.9), 0 0 18px rgba(56,189,248,.5), inset 0 0 8px rgba(56,189,248,.4) !important;
}
.planet-dot.sphere-mars{
  background:
    radial-gradient(circle at 30% 26%, rgba(255,220,205,.55) 0%, transparent 35%),
    radial-gradient(circle at 50% 10%, rgba(255,255,255,.75) 0%, transparent 22%),
    radial-gradient(circle at 35% 35%, #ffd2c0 0%, #e06840 25%, #c1502e 50%, #7c2d12 80%, #300f07 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(48,15,7,.85), 0 0 16px rgba(193,80,46,.45) !important;
}
.planet-dot.sphere-jupiter{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.5) 0%, transparent 40%),
    linear-gradient(180deg, #d9a066 0%, #fbf3e6 12%, #b3402a 24%, #c7925f 36%, #ecdcc2 48%, #7d4a2c 62%, #ecdcc2 74%, #d9a066 86%, #4a2815 100%) !important;
  box-shadow:inset -6px -5px 14px rgba(0,0,0,.85), 0 0 18px rgba(217,160,102,.4) !important;
}
.planet-dot.sphere-saturnus{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.5) 0%, transparent 40%),
    linear-gradient(180deg, #e8d29a 0%, #fff6dc 18%, #d9ba7c 35%, #caa467 52%, #f3e2b3 70%, #b08a52 86%, #4a3818 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(74,56,24,.85), 0 0 18px rgba(232,210,154,.45) !important;
}
.planet-dot.sphere-uranus{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.6) 0%, transparent 40%),
    radial-gradient(circle at 35% 35%, #e6f8fa 0%, #bff4ff 25%, #9fe3e8 50%, #4facb8 80%, #164850 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(22,72,80,.8), 0 0 18px rgba(159,227,232,.5), inset 0 0 8px rgba(191,244,255,.45) !important;
}
.planet-dot.sphere-neptunus{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.6) 0%, transparent 40%),
    radial-gradient(circle at 35% 35%, #86a6f2 0%, #6f8cff 20%, #4256c9 45%, #1d3184 75%, #0b1236 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(11,18,54,.9), 0 0 20px rgba(66,86,201,.55), inset 0 0 8px rgba(111,140,255,.4) !important;
}
.planet-dot.sphere-matahari{
  background:
    radial-gradient(circle at 35% 30%, #fff7ed 0%, #fef08a 25%, #f59e0b 55%, #b45309 85%, #78350f 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(120,53,15,.9), 0 0 24px rgba(245,158,11,.65), 0 0 8px #fef08a !important;
}
.planet-dot.sphere-bulan{
  background:
    radial-gradient(circle at 28% 26%, rgba(255,255,255,.6) 0%, transparent 35%),
    radial-gradient(circle at 62% 58%, rgba(55,65,81,.5) 0%, transparent 45%),
    radial-gradient(circle at 35% 35%, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 65%, #475569 90%, #1e293b 100%) !important;
  box-shadow:inset -5px -5px 12px rgba(15,23,42,.85), 0 0 14px rgba(226,232,240,.35) !important;
}

/* Cincin Miring Saturnus */
.saturn-ring-back,
.saturn-ring-front{
  position:absolute;
  top:50%;
  left:50%;
  width:72px;
  height:22px;
  border-radius:50%;
  border:2.6px solid rgba(232,210,154,.95);
  box-shadow:0 0 8px rgba(232,210,154,.5), inset 0 0 4px rgba(168,143,104,.6);
  transform:translate(-50%,-50%) rotate(-24deg);
  pointer-events:none;
}
.saturn-ring-back{
  z-index:0;
  clip-path:polygon(-20% -20%, 120% -20%, 120% 50%, -20% 50%);
}
.saturn-ring-front{
  z-index:2;
  clip-path:polygon(-20% 50%, 120% 50%, 120% 120%, -20% 120%);
}

.top-info{
  display:flex;
  flex-direction:column;
  gap:2px;
  min-width:0;
}
.title-row{
  display:flex;
  align-items:center;
  gap:8px;
}
.planet-title{
  font-family:var(--display);
  font-size:clamp(20px, 2.2vw, 24px);
  font-weight:600;
  line-height:1.2;
  letter-spacing:-0.02em;
  color:#fff;
  margin:0;
}
.planet-kind{
  font-size:12.5px;
  color:var(--muted);
  margin:0;
}

.desc{
  color:#cbd5e1;
  font-size:13.5px;
  line-height:1.55;
  margin:0 0 16px 0;
}

.ph{
  display:flex;
  align-items:center;
  gap:9px;
  padding:10px 14px;
  border-radius:10px;
  background:rgba(59, 130, 246, 0.12);
  border:1px solid rgba(148, 174, 255, 0.18);
  color:#38bdf8;
  font-size:13px;
  line-height:1.4;
  margin-bottom:16px;
}
.ph b{
  color:#f1f5f9;
  font-weight:600;
}

.q{
  font-family:var(--display);
  font-weight:500;
  font-size:15px;
  color:#f1f5f9;
  margin:0 0 16px 0;
}

.acts{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.btn-action{
  flex:1 1 160px;
  height:42px;
  min-height:42px;
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
}
.btn-action.primary{
  background:#3b82f6;
  color:#ffffff;
  border:1px solid transparent;
  box-shadow:0 4px 14px rgba(59, 130, 246, 0.35);
}
.btn-action.primary:hover{
  background:#2563eb;
  transform:translateY(-1px);
}
.btn-action.line{
  background:rgba(148, 174, 255, 0.06);
  border:1px solid rgba(148, 174, 255, 0.18);
  color:var(--muted);
}
.btn-action.line:hover{
  background:rgba(148, 174, 255, 0.12);
  border-color:rgba(148, 174, 255, 0.32);
  color:#fff;
}

.keys{
  display:flex;
  align-items:center;
  gap:6px;
  justify-content:center;
  font-size:11.5px;
  color:var(--faint);
  margin:18px 0 0 0;
  padding-top:14px;
  border-top:1px solid rgba(148, 174, 255, 0.10);
}

@media (max-width:760px){
  .ap{
    align-items:flex-end;
    padding:12px 12px calc(12px + var(--safe-b));
  }
  .box{
    margin-top:0;
    padding:20px 20px;
  }
  .header-eyebrow-row{
    margin-bottom:10px;
  }
}
</style>

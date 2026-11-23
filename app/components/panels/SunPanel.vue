<script setup>
// Halaman Matahari (mode Planet dengan fokus 'matahari'): fakta singkat + topik yang jarang diketahui
// (cincin Matahari/halo 22°, gerhana cincin, korona, bintik, badai Matahari, rotasi). Topik dibuka satu per satu.
import { ref } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { SUN_TOPICS, FACTS } from '~/data/learning.js';
const FACT_TILES = [
  { icon: 'matahari', k: 'Suhu permukaan', v: '± 5.500 °C' },
  { icon: 'kilat', k: 'Suhu inti', v: '± 15 juta °C' },
  { icon: 'planet', k: 'Lebar', v: '109× Bumi' },
  { icon: 'orbit', k: 'Umur', v: '± 4,6 miliar th' },
];
const open = ref('halo');
function toggle(id) { open.value = open.value === id ? null : id; game()?.click(); }
function lab() { store.lab.type = 'matahari'; store.lab.caller = 'planet'; game()?.setMode('fenomena'); }
function facts() { store.journalId = 'matahari'; store.modal = 'journal'; }
function myths() { store.quiz.kind = 'mitos'; store.quiz.mythStage = 'intro'; game()?.setMode('kuis'); }
</script>

<template>
  <div>
    <div class="stage-title">
      <span class="tag">Bintang · pusat tata surya</span>
      <h1 class="h1">Matahari</h1>
    </div>
    <div class="stage-bottom">
      <div class="safe card flat"><UiIcon name="mata" :size="20" /><span>Jangan pernah menatap Matahari langsung, juga saat gerhana atau ada halo.</span></div>
    </div>

    <aside class="sheet card" aria-label="Tentang Matahari">
      <div class="sbody scroll">
        <p class="desc">Bola gas panas raksasa yang menyumbang 99,86% massa tata surya. Cahayanya sampai ke Bumi dalam 8 menit 20 detik.</p>
        <div class="facts">
          <div v-for="f in FACT_TILES" :key="f.k" class="tile fact"><UiIcon :name="f.icon" :size="20" /><small>{{ f.k }}</small><b class="num">{{ f.v }}</b></div>
        </div>
        <h3 class="lbl">Yang jarang diketahui</h3>
        <div class="topics">
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
              <button v-if="t.lab" class="btn sm line" @click="lab"><UiIcon name="fenomena" :size="16" />Coba di lab gerhana</button>
            </div>
          </section>
        </div>
      </div>
      <div class="sfoot">
        <div class="row2">
          <button class="btn" @click="facts"><UiIcon name="info" :size="18" />Tahukah kamu?<span v-if="!store.progress.cards.matahari && FACTS.matahari" class="nw" /></button>
          <button class="btn star" @click="myths"><UiIcon name="kuis" :size="18" />Mitos/Fakta</button>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.desc{font-size:15px;color:var(--muted);line-height:1.6}
.facts{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fact{display:flex;flex-direction:column;gap:2px;color:var(--star)}
.fact small{font-size:12.5px;color:var(--faint);margin-top:6px}
.fact b{font-size:18px;font-weight: 500;color:var(--text)}
.lbl{font-family:var(--display);font-weight: 500;font-size:15px;margin-top:4px}
.topics{display:flex;flex-direction:column;gap:8px}
.tp{border-radius:var(--r);background:var(--surface-2);overflow:hidden;border:1px solid transparent;transition:border-color .2s}
.tp.on{border-color:rgba(255,201,71,.35)}
.th{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;text-align:left;font-family:var(--display);font-weight: 500;font-size:15px}
.chev{color:var(--muted);transition:transform .2s;flex:none}
.tp.on .chev{transform:rotate(180deg)}
.tb{display:flex;flex-direction:column;gap:10px;padding:0 14px 14px}
.tb p{font-size:14.5px;color:var(--muted);line-height:1.6}
.tb .btn{align-self:flex-start}
.art{display:block;width:100%;height:auto;border-radius:var(--r-sm)}
.safe{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--r);font-size:13.5px;color:var(--muted);max-width:380px}
.safe :deep(svg){flex:none;color:var(--star)}
.nw{width:8px;height:8px;border-radius:50%;background:var(--star);margin-left:2px}
@media (max-width:760px){ .safe{display:none} .fact b{font-size:16px} }
</style>

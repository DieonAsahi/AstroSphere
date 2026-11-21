<script setup>
// Muncul saat pesawat mendekati planet: pesawat berhenti, pemain memilih melihat planet atau lanjut terbang.
import { computed } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { PHENOMENA } from '~/data/phenomena.js';
import { PREDICT } from '~/data/learning.js';
// Fenomena yang belum ditebak ditampilkan sebagai pertanyaan, supaya jawabannya tidak bocor sebelum "Tebak dulu".
const teaser = computed(() => {
  const id = store.approach.id, ph = PHENOMENA[id];
  if (!ph) return null;
  return PREDICT[id] && !store.progress.predict[id] ? { label: 'Tebak dulu', text: PREDICT[id].q } : { label: 'Fenomena', text: ph.title };
});
</script>
<template>
  <div class="ap" role="dialog" aria-modal="false" aria-labelledby="ap-t">
    <div class="card box">
      <div class="top">
        <span class="planet-dot" :style="{ '--c': store.approach.color, '--s': '64px' }" />
        <div>
          <span v-if="store.approach.isNew" class="tag star"><UiIcon name="bintang" :size="13" />Penemuan baru</span>
          <h2 id="ap-t" class="h2">{{ store.approach.name }}</h2>
          <p class="small">{{ store.approach.kind }}</p>
        </div>
      </div>
      <p class="desc">{{ store.approach.desc }}</p>
      <div v-if="teaser" class="ph"><UiIcon name="fenomena" :size="18" /><span>{{ teaser.label }}: <b>{{ teaser.text }}</b></span></div>
      <p class="q">{{ store.approach.id === 'matahari' ? 'Lihat Matahari dari dekat?' : 'Lihat planet ini dari dekat?' }}</p>
      <div class="acts">
        <button class="btn primary lg" @click="game()?.approachYes()"><UiIcon name="mata" :size="20" />Ya, lihat</button>
        <button class="btn line lg" @click="game()?.approachNo()">Tidak, lanjut terbang</button>
      </div>
      <p v-if="!store.touch" class="keys"><b class="kbd sm">Enter</b> ya · <b class="kbd sm">Esc</b> tidak</p>
    </div>
  </div>
</template>
<style scoped>
.ap{position:fixed;inset:0;z-index:26;display:grid;place-items:center;padding:16px;pointer-events:none}
.box{pointer-events:auto;width:min(460px,100%);padding:24px;display:flex;flex-direction:column;gap:14px}
.top{display:flex;align-items:center;gap:16px}
.top .tag{margin-bottom:4px}
.desc{color:var(--muted);font-size:15px}
.ph{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--r-sm);background:rgba(59,108,240,.16);color:var(--sky);font-size:14px}
.ph b{color:var(--text);font-weight:600}
.q{font-family:var(--display);font-weight:600;font-size:18px;margin-top:2px}
.acts{display:flex;gap:10px;flex-wrap:wrap}
.acts .btn{flex:1 1 170px}
.keys{display:flex;align-items:center;gap:6px;justify-content:center;font-size:12.5px;color:var(--faint)}
@media (max-width:760px){ .ap{place-items:end center;padding:12px 12px calc(12px + var(--safe-b))} .box{padding:18px} }
</style>

<script setup>
// "Cara terbang": penjelasan kontrol sekaligus layar muat dunia 3D. Tombol Mulai aktif setelah dunia siap.
import { onMounted, onBeforeUnmount } from 'vue';
import { store, game } from '~/composables/useGame.js';
function start() {
  if (!store.ready) return;
  store.settings.tutorialSeen = true;
  game()?.startGame(store.startFromSave);
}
function retry() { store.loading.error = ''; game()?.boot(); }
const onKey = (e) => { if ((e.code === 'Enter' || e.code === 'Space') && store.ready && !store.modal) { e.preventDefault(); start(); } };
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="guide">
    <div class="wrap">
      <header class="head">
        <button class="ib sm" aria-label="Kembali ke beranda" @click="store.phase = 'splash'"><UiIcon name="kembali" :size="20" /></button>
        <div>
          <h1 class="h2">Cara terbang</h1>
          <p class="small">Dekati planet — pesawat berhenti sendiri dan kamu bisa melihatnya dari dekat.</p>
        </div>
      </header>

      <UiKeyGuide />

      <ul class="tips">
        <li><span class="ico"><UiIcon name="peta" :size="20" /></span>Buka <b>Peta</b> untuk terbang otomatis ke planet pilihanmu.</li>
        <li><span class="ico star"><UiIcon name="bintang" :size="20" /></span>Jawab <b>kuis</b> planet untuk mengumpulkan bintang dan membuka pesawat baru.</li>
      </ul>

      <footer class="foot" aria-live="polite">
        <template v-if="store.loading.error">
          <p class="err" role="alert">{{ store.loading.error }}</p>
          <button class="btn line" @click="retry"><UiIcon name="ulang" :size="18" />Coba lagi</button>
        </template>
        <template v-else-if="!store.ready">
          <div class="load">
            <div class="bar"><i :style="{ width: Math.round(store.loading.p * 100) + '%' }" /></div>
            <span class="small">{{ store.loading.text || 'Menyiapkan…' }} · {{ Math.round(store.loading.p * 100) }}%</span>
          </div>
          <button class="btn primary lg" disabled>Memuat…</button>
        </template>
        <template v-else>
          <span class="small ok"><UiIcon name="cek" :size="18" />Dunia siap</span>
          <button class="btn primary lg" autofocus @click="start"><UiIcon name="putar" :size="20" />Mulai terbang</button>
        </template>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.guide{position:fixed;inset:0;z-index:40;display:grid;place-items:center;overflow-y:auto;padding:calc(24px + var(--safe-t)) 16px calc(24px + var(--safe-b));
  background:radial-gradient(ellipse at 50% 0%,#18245a 0%,#0a1030 45%,#05081a 100%)}
.wrap{width:min(940px,100%);display:flex;flex-direction:column;gap:26px}
.head{display:flex;align-items:center;gap:16px}
.head .small{font-size:15px;margin-top:2px}
.tips{list-style:none;display:flex;gap:12px;flex-wrap:wrap}
.tips li{flex:1 1 300px;display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:var(--r);background:rgba(255,255,255,.04);font-size:14.5px;color:var(--muted)}
.tips b{color:var(--text)}
.ico{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.2);color:var(--sky);flex:none}
.ico.star{background:rgba(255,201,71,.16);color:var(--star)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:6px}
.load{flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px}
.load .bar>i{transition:width .3s ease}
.ok{display:inline-flex;align-items:center;gap:6px;color:var(--green);font-weight:500}
.err{flex:1;color:var(--coral);font-size:14px}
@media (max-width:760px){ .foot .btn{width:100%} .wrap{gap:20px} }
</style>

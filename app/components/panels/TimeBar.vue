<script setup>
// Kontrol waktu observasi: orbit mini, tanggal, jeda/putar, 1x/10x/100x, tampilkan orbit & sumbu.
import { ref, watch } from 'vue';
import { store, game } from '~/composables/useGame.js';
const props = defineProps({ body: { type: String, default: '' } });
const last = ref(1);
function toggle() { if (store.obs.mul === 0) store.obs.mul = last.value; else { last.value = store.obs.mul; store.obs.mul = 0; } }
function set(m) { store.obs.mul = m; last.value = m; }
watch(() => [store.toggles.orbit, store.toggles.axis], () => game()?.applyObsToggles());
</script>
<template>
  <div class="tbar card flat">
    <UiOrbitInset v-if="body" :body="body" />
    <div class="date"><small>Waktu</small><b class="num">{{ store.obs.date }}</b></div>
    <button class="ib sm" :aria-label="store.obs.mul === 0 ? 'Putar waktu' : 'Jeda waktu'" @click="toggle"><UiIcon :name="store.obs.mul === 0 ? 'putar' : 'jeda'" :size="18" /></button>
    <div class="seg" role="group" aria-label="Kecepatan waktu">
      <button v-for="m in [1, 10, 100]" :key="m" :class="{ on: store.obs.mul === m }" @click="set(m)">{{ m }}×</button>
    </div>
    <div class="tg">
      <button class="ib sm" :class="{ on: store.toggles.orbit }" :aria-pressed="store.toggles.orbit" aria-label="Garis orbit" title="Garis orbit" @click="store.toggles.orbit = !store.toggles.orbit"><UiIcon name="orbit" :size="18" /></button>
      <button class="ib sm" :class="{ on: store.toggles.axis }" :aria-pressed="store.toggles.axis" aria-label="Sumbu rotasi" title="Sumbu rotasi" @click="store.toggles.axis = !store.toggles.axis"><UiIcon name="sumbu" :size="18" /></button>
    </div>
  </div>
</template>
<style scoped>
.tbar{
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px 12px;
  border-radius:10px !important;
  background:rgba(10, 14, 28, 0.88);
  border:1px solid rgba(148, 174, 255, 0.16);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 8px 24px rgba(0, 0, 0, 0.4);
}
.date{display:flex;flex-direction:column;line-height:1.2;min-width:90px}
.date small{font-size:11px;color:#94a3b8}
.date b{font-weight:600;font-size:15px;color:#f8fafc}
.tbar :deep(.ib.sm),
.tbar .ib.sm{
  width:36px;
  height:36px;
  min-width:36px;
  min-height:36px;
  border-radius:8px !important;
  background:rgba(148, 174, 255, 0.08);
  border:1px solid rgba(148, 174, 255, 0.16);
  color:var(--text);
  transition:all .15s ease;
}
.tbar .ib.sm:hover{
  background:rgba(148, 174, 255, 0.18);
  border-color:rgba(148, 174, 255, 0.32);
}
.tbar .ib.sm.on{
  background:rgba(59, 130, 246, 0.25);
  border-color:rgba(59, 130, 246, 0.5);
  color:#38bdf8;
}
.seg{
  border-radius:8px !important;
  padding:2px;
  background:rgba(11, 16, 36, 0.8);
  border:1px solid rgba(148, 174, 255, 0.16);
  display:inline-flex;
}
.seg button{
  border-radius:6px !important;
  height:30px;
  padding:0 10px;
  font-family:var(--display);
  font-size:12.5px;
  font-weight:500;
  color:var(--muted);
  transition:all .15s ease;
}
.seg button.on{
  background:#3b82f6 !important;
  color:#fff !important;
}
.tg{display:flex;gap:6px;padding-left:10px;border-left:1px solid rgba(148, 174, 255, 0.16)}
@media (max-width:760px){
  .tbar{width:100%;gap:8px;padding:8px;border-radius:10px !important}
  .date{min-width:0}
  .date small{display:none}
  .seg button{padding:0 8px}
}
@media (max-height:540px) and (orientation:landscape){
  .tbar{
    gap:4px !important;
    padding:2px 5px !important;
    height:30px !important;
    min-height:30px !important;
    border-radius:8px !important;
    max-width:min(290px, calc(100vw - min(285px, 43vw) - 24px)) !important;
  }
  .tbar :deep(.oi),
  .tbar .oi{
    width:42px !important;
    height:26px !important;
    border-radius:6px !important;
  }
  .date{
    min-width:0 !important;
    white-space:nowrap !important;
    line-height:1 !important;
  }
  .date b{
    font-size:11px !important;
    white-space:nowrap !important;
  }
  .date small{display:none !important}
  .tbar :deep(.ib.sm),
  .tbar .ib.sm{
    width:24px !important;
    height:24px !important;
    min-width:24px !important;
    min-height:24px !important;
    border-radius:6px !important;
  }
  .tbar :deep(.ib.sm svg),
  .tbar .ib.sm svg{
    width:14px !important;
    height:14px !important;
  }
  .seg{
    padding:1px !important;
  }
  .seg button{
    height:22px !important;
    padding:0 4px !important;
    font-size:10px !important;
  }
  .tg{
    padding-left:4px !important;
    gap:3px !important;
  }
}
</style>

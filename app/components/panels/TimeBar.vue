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
.tbar{display:flex;align-items:center;gap:12px;padding:10px 12px 10px 10px;border-radius:var(--r-lg)}
.date{display:flex;flex-direction:column;line-height:1.2;min-width:96px}
.date small{font-size:12px;color:var(--faint)}
.date b{font-weight: 500;font-size:16px}
.tg{display:flex;gap:6px;padding-left:10px;border-left:1px solid var(--line)}
@media (max-width:760px){ .tbar{width:100%;gap:8px;padding:8px} .date{min-width:0} .date small{display:none} .seg button{padding:0 10px} }
</style>

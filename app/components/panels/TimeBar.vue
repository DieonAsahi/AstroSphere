<script setup>
// Kontrol waktu observasi (PRD §5.4): Jeda/Putar dan 1x/10x/100x mengubah faktor waktu global konteks aktif.
import { ref } from 'vue';
import { store } from '~/composables/useGame.js';
const last = ref(1);
function toggle() { if (store.obs.mul === 0) store.obs.mul = last.value; else { last.value = store.obs.mul; store.obs.mul = 0; } }
function set(m) { store.obs.mul = m; last.value = m; }
</script>
<template>
  <div class="timebar panel">
    <div class="info"><span class="kicker">Waktu observasi</span><b>{{ store.obs.date }}</b></div>
    <button class="ib" :aria-label="store.obs.mul === 0 ? 'Putar waktu' : 'Jeda waktu'" @click="toggle"><UiIcon :name="store.obs.mul === 0 ? 'putar' : 'jeda'" /></button>
    <div class="seg" role="group" aria-label="Kecepatan waktu">
      <button v-for="m in [1, 10, 100]" :key="m" :class="{ on: store.obs.mul === m }" @click="set(m)">{{ m }}x</button>
    </div>
    <span class="note">1x = 1 hari / 50 dtk · tidak mengubah checkpoint jelajah</span>
  </div>
</template>

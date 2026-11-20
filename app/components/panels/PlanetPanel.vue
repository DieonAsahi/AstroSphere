<script setup>
// Mode Planet (PRD §4.3, §7): pesawat tersembunyi, kamera mengikuti planet yang berevolusi & berotasi.
import { computed, watch } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
import { HISTORY } from '~/data/history.js';
const p = computed(() => PLANETS.find((x) => x.id === store.focus) || PLANETS[2]);
function pick(id) { game()?.focus(id); game()?.click(); }
watch(() => [store.toggles.orbit, store.toggles.axis, store.focus], () => game()?.applyObsToggles());
function quiz() { store.quiz.planet = p.value.id; store.quiz.stage = 'intro'; game()?.setMode('kuis'); }
function history() { store.sejarah.body = p.value.id; store.sejarah.era = 'semua'; store.sejarah.selected = (HISTORY[p.value.id] || [])[0]?.id || null; game()?.setMode('sejarah', { force: true }); }
function eclipse() { store.lab.caller = 'planet'; game()?.setMode('fenomena'); }
</script>
<template>
  <div>
    <div class="ltitle">
      <div class="kicker acc">Mode planet · {{ p.order }} / 8</div>
      <h1>{{ p.name }}</h1>
      <p>{{ p.kind }}</p>
      <div class="chips"><span class="badge ok"><i />Revolusi aktif</span><span class="badge ok"><i />Rotasi aktif</span></div>
    </div>
    <div class="lbottom">
      <UiOrbitInset :body="p.id" />
      <PanelsTimeBar />
    </div>
    <aside class="side panel" aria-label="Materi planet">
      <div class="sbody scroll">
        <div class="planet-pick" role="tablist" aria-label="Pilih planet">
          <button v-for="x in PLANETS" :key="x.id" :class="{ on: x.id === p.id }" :aria-selected="x.id === p.id" :title="x.name" @click="pick(x.id)"><i :style="{ background: x.color }" />{{ x.name.slice(0, 2) }}</button>
        </div>
        <hr class="divider">
        <div class="kicker acc">Ringkasan</div>
        <p class="txt">{{ p.desc }}</p>
        <div class="kicker">Data dasar</div>
        <div class="facts"><div v-for="[k, v] in p.facts" :key="k" class="row"><span>{{ k }}</span><b>{{ v }}</b></div></div>
        <p class="src">Sumber: NASA JPL (radius, rotasi sideris, periode orbit). Orbit memakai model edukasi Kepler; jarak antarplanet dipadatkan.</p>
        <hr class="divider">
        <UiToggle v-model="store.toggles.orbit" label="Jejak orbit" sub="Elips dari model yang sama dengan posisi planet" />
        <UiToggle v-model="store.toggles.axis" label="Tampilkan sumbu" sub="Garis sumbu rotasi fisik" />
        <UiToggle v-model="store.toggles.autoCam" label="Auto kamera" sub="Kamera mengitari pelan; tidak mengubah jam simulasi" />
      </div>
      <div class="sfoot col">
        <button class="btn primary" @click="quiz">Kerjakan Kuis {{ p.name }}</button>
        <div class="two"><button class="btn" @click="history">Sejarah</button><button class="btn" @click="eclipse">Gerhana</button></div>
        <button class="btn ghost" @click="game()?.setMode('jelajah')">‹ Kembali menjelajah</button>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.txt{font-size:14px;line-height:1.6;color:var(--dim)}
.facts{display:flex;flex-direction:column;gap:9px}
.src{font-size:11px;color:var(--faint);line-height:1.45}
.sfoot.col{flex-direction:column}
.two{display:flex;gap:10px}.two .btn{flex:1}
</style>

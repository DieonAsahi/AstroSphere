<script setup>
// Dock bawah (PRD §4.2): Peta, Planet, Sejarah, Fenomena, Kuis, Hanggar, Berhenti.
import { store, game } from '~/composables/useGame.js';
const items = [
  { id: 'peta', label: 'Peta', icon: 'peta' }, { id: 'planet', label: 'Planet', icon: 'planet' }, { id: 'sejarah', label: 'Sejarah', icon: 'sejarah' },
  { id: 'fenomena', label: 'Fenomena', icon: 'fenomena' }, { id: 'kuis', label: 'Kuis', icon: 'kuis' }, { id: 'hanggar', label: 'Hanggar', icon: 'hanggar' },
];
function go(id) {
  const g = game(); if (!g) return;
  if (store.mode === id) { g.setMode('jelajah'); return; }
  if (id === 'kuis') { store.quiz.planet = store.mode === 'planet' ? store.focus : store.mode === 'sejarah' && store.sejarah.body !== 'bulan' ? store.sejarah.body : store.quiz.planet; store.quiz.stage = 'intro'; }
  if (id === 'fenomena') store.lab.caller = store.mode === 'planet' || store.mode === 'sejarah' ? store.mode : null;
  g.setMode(id);
}
</script>
<template>
  <nav class="dock panel" :class="{ off: store.hudOff && store.mode === 'jelajah' }" aria-label="Navigasi mode">
    <button v-for="it in items" :key="it.id" class="di" :class="{ on: store.mode === it.id }" :aria-pressed="store.mode === it.id" @click="go(it.id)">
      <UiIcon :name="it.icon" :size="20" /><span>{{ it.label }}</span>
    </button>
    <i class="sep" />
    <button class="di stop" @click="game()?.stop()" title="Berhenti segera (X)"><UiIcon name="berhenti" :size="20" /><span>Berhenti</span></button>
  </nav>
</template>
<style scoped>
.dock{position:fixed;left:50%;bottom:calc(28px + var(--safe-b));transform:translateX(-50%);display:flex;align-items:center;gap:2px;padding:7px 9px;z-index:25;transition:opacity .3s}
.dock.off{opacity:0;pointer-events:none}
.di{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:76px;height:64px;border-radius:9px;color:var(--dim);transition:background .2s,color .2s}
.di span{font-size:11px;letter-spacing:.03em}
.di:hover{color:var(--txt);background:rgba(var(--acc-rgb),.07)}
.di.on{background:var(--soft);color:var(--acc)}
.di.stop{color:var(--txt)}
.sep{width:1px;height:44px;background:var(--divider);margin:0 4px}
@media (max-width:760px){
  .dock{left:8px;right:8px;transform:none;bottom:calc(8px + var(--safe-b));justify-content:space-between;padding:4px}
  .di{width:auto;flex:1;min-width:44px;height:56px;gap:4px} .di span{font-size:9px} .sep{height:36px;margin:0 2px}
}
</style>

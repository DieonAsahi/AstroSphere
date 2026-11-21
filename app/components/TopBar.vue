<script setup>
// Bilah atas permainan: minimal. Jelajah → logo + profil + menu. Mode belajar → tombol Kembali + menu.
import { computed } from 'vue';
import { store, game, unreadCards } from '~/composables/useGame.js';
const LABEL = { planet: 'Planet', sejarah: 'Sejarah', fenomena: 'Fenomena', hanggar: 'Hanggar' };
const unread = computed(() => unreadCards());
const backLabel = computed(() => store.mode === 'planet' && store.pheno.on ? 'Selesai' : store.backTo === 'planet' ? 'Ke planet' : store.backTo === 'sejarah' ? 'Ke sejarah' : 'Terbang lagi');
</script>
<template>
  <header class="tb" :class="{ off: store.hudOff && store.mode === 'jelajah' }">
    <div class="l">
      <span v-if="store.mode === 'jelajah'" class="brand"><UiIcon name="logo" :size="26" /><b>AstroSphere</b></span>
      <template v-else>
        <button class="btn sm back" @click="game()?.back()"><UiIcon name="kembali" :size="18" />{{ backLabel }}</button>
        <span class="tag">{{ store.mode === 'planet' && store.focus === 'matahari' ? 'Bintang' : LABEL[store.mode] }}</span>
      </template>
    </div>
    <div class="r">
      <button v-if="store.mode === 'jelajah'" class="ib" aria-label="Profil pemain" title="Profil" @click="game()?.setMode('profil')"><UiIcon name="pengguna" /></button>
      <button class="ib menu" :aria-label="unread ? `Menu — ${unread} kartu baru di Jurnal` : 'Menu'" title="Menu (Esc)" @click="game()?.pause()"><UiIcon name="menu" /><span v-if="unread" class="badge" aria-hidden="true">{{ unread }}</span></button>
    </div>
  </header>
</template>
<style scoped>
.tb{position:fixed;left:0;right:0;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:12px;pointer-events:none;
  padding:calc(var(--top) + var(--safe-t)) calc(var(--gap) + var(--safe-r)) 0 calc(var(--gap) + var(--safe-l));transition:opacity .3s}
.tb>*{pointer-events:auto}
.tb.off{opacity:0}.tb.off>*{pointer-events:none}
.l,.r{display:flex;align-items:center;gap:10px}
.brand{display:flex;align-items:center;gap:9px;font-family:var(--display);font-size:20px;text-shadow:0 2px 10px rgba(0,0,0,.6)}
.brand b{font-weight:600}
.back{background:var(--surface-a);box-shadow:inset 0 0 0 1px var(--line)}
.menu{position:relative}
.badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:var(--star);color:#3a2a00;font-family:var(--display);font-weight:700;font-size:12px;box-shadow:0 0 0 2px var(--bg, #060a1a)}
@media (max-width:760px){ .brand b{display:none} .tag{display:none} }
</style>

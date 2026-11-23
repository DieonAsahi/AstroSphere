<script setup>
// Menu jeda: Lanjutkan + jalan pintas ke Kuis, Peta, Hanggar, Jurnal, Kontrol, Pengaturan.
import { computed } from 'vue';
import { store, game, unreadCards, isFound } from '~/composables/useGame.js';
import { QUIZ } from '~/data/quiz.js';
function mode(m) {
  if (m === 'kuis') {
    // pilih planet terdekat bila sudah ditemukan, kalau tidak pertahankan pilihan lama yang sudah terbuka
    const near = store.hud.near.id;
    if (QUIZ[near] && isFound(near)) store.quiz.planet = near;
    else if (!isFound(store.quiz.planet)) store.quiz.planet = Object.keys(QUIZ).find(isFound) || store.quiz.planet;
    store.quiz.stage = 'intro';
  }
  game()?.setMode(m);
}
const TILES = [
  { id: 'kuis', label: 'Kuis', icon: 'kuis', go: () => mode('kuis') },
  { id: 'peta', label: 'Peta', icon: 'peta', go: () => mode('peta') },
  { id: 'hanggar', label: 'Hanggar', icon: 'hanggar', go: () => mode('hanggar') },
  { id: 'jurnal', label: 'Jurnal', icon: 'jurnal', go: () => { store.journalId = null; store.modal = 'journal'; } },
  { id: 'kontrol', label: 'Kontrol', icon: 'kontrol', go: () => { store.modal = 'controls'; } },
  { id: 'atur', label: 'Pengaturan', icon: 'atur', go: () => { store.modal = 'settings'; } },
];
const unread = computed(() => unreadCards());
// Misi kisah nyata (adegan & tugas sendiri)
const MLIST = [
  { id: 'apollo13', tag: 'Kisah nyata · 1970', t: 'Apollo 13: pulang dengan selamat', icon: 'kilat' },
  { id: 'mco', tag: 'Kisah nyata · 1999', t: 'Mars Climate Orbiter: misteri satuan', icon: 'info' },
];
function startMission(id) { game()?.setMode('misi', { mission: id }); }
</script>
<template>
  <div class="pause" @pointerdown.self="game()?.resume()">
    <div class="card pp" role="dialog" aria-modal="true" aria-labelledby="pt">
      <div class="hd">
        <h2 id="pt" class="h2">Jeda</h2>
        <span class="tag green"><UiIcon name="cek" :size="14" />Tersimpan</span>
      </div>
      <button class="btn primary lg block" @click="game()?.resume()"><UiIcon name="putar" :size="20" />Lanjutkan</button>
      <div class="mlist">
        <button v-for="m in MLIST" :key="m.id" class="mis" :class="m.id" @click="startMission(m.id)">
          <span class="mic"><UiIcon :name="m.icon" :size="22" /></span>
          <span class="mt"><small>{{ m.tag }}</small><b>{{ m.t }}</b></span>
          <span v-if="store.progress.missions[m.id]" class="tag green"><UiIcon name="cek" :size="13" />{{ store.progress.missions[m.id].stars }}/3</span>
          <UiIcon name="lanjut" :size="18" />
        </button>
      </div>
      <div class="grid">
        <button v-for="t in TILES" :key="t.id" class="tile-btn" @click="t.go()"><span class="ic"><UiIcon :name="t.icon" :size="26" /><span v-if="t.id === 'jurnal' && unread" class="badge">{{ unread }}</span></span>{{ t.label }}<small v-if="t.id === 'jurnal' && unread" class="nw">kartu baru</small></button>
      </div>
      <div class="foot">
        <span class="pts"><UiIcon name="bintang" :size="18" />{{ store.progress.points }} bintang</span>
        <button class="btn ghost sm" @click="game()?.toSplash()"><UiIcon name="keluar" :size="18" />Keluar ke beranda</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.pause{position:fixed;inset:0;z-index:35;display:grid;place-items:center;padding:16px;background:rgba(6,10,26,.72)}
.pp{width:min(460px,100%);padding:24px;display:flex;flex-direction:column;gap:16px}
.hd{display:flex;align-items:center;justify-content:space-between;gap:12px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.tile-btn{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 14px;border-radius:var(--r);background:var(--surface-2);font-family:var(--display);font-weight:500;font-size:15px;transition:background .15s,transform .12s}
.tile-btn:hover{background:var(--surface-3)}
.tile-btn:active{transform:scale(.96)}
.ic{position:relative;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:rgba(59,108,240,.18);color:var(--sky)}
.badge{position:absolute;top:-4px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:var(--star);color:#3a2a00;font-weight:600;font-size:12px}
.nw{font-family:var(--font);font-weight:400;font-size:11.5px;color:var(--star);margin-top:-4px}
.mlist{display:flex;flex-direction:column;gap:8px}
.mis{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:var(--r);text-align:left;background:var(--surface-2);border:1px solid var(--line);transition:background .15s,transform .1s}
.mis:hover{background:var(--surface-3);transform:translateX(2px)}
.mic{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:rgba(59,130,246,.18);color:var(--sky);flex:none}
.mt{flex:1;display:flex;flex-direction:column}
.mt small{font-size:11.5px;color:var(--faint)}
.mt b{font-family:var(--display);font-weight:500;font-size:15px;color:var(--text)}
.foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:4px;border-top:1px solid var(--line)}
.pts{display:flex;align-items:center;gap:6px;color:var(--star);font-family:var(--display);font-weight:500;padding-top:10px}
.foot .btn{margin-top:10px}
</style>

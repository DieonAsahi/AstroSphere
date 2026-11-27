<script setup>
// Menu jeda: Lanjutkan + jalan pintas ke Kuis, Peta, Hanggar, Jurnal, Kontrol, Pengaturan.
import { ref, computed } from 'vue';
import { store, game, unreadCards, isFound } from '~/composables/useGame.js';
import { QUIZ } from '~/data/quiz.js';

const cardRef = ref(null);

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
    <div ref="cardRef" class="card pp pause-card" role="dialog" aria-modal="true" aria-labelledby="pt">
      <div class="hd">
        <h2 id="pt" class="h2">Jeda</h2>
        <span class="tag green"><UiIcon name="cek" :size="13" />Tersimpan</span>
      </div>

      <!-- Tombol Lanjutkan Ramping & Modern -->
      <button class="btn primary lg block resume-btn" @click="game()?.resume()">
        <UiIcon name="putar" :size="18" />Lanjutkan
      </button>

      <!-- Kartu Misi Ringkas -->
      <div class="mlist">
        <button v-for="m in MLIST" :key="m.id" class="mis" :class="m.id" @click="startMission(m.id)">
          <span class="mic"><UiIcon :name="m.icon" :size="18" /></span>
          <span class="mt"><small>{{ m.tag }}</small><b>{{ m.t }}</b></span>
          <span v-if="store.progress.missions[m.id]" class="tag green"><UiIcon name="cek" :size="13" />{{ store.progress.missions[m.id].stars }}/3</span>
          <UiIcon name="lanjut" :size="16" class="m-arr" />
        </button>
      </div>

      <!-- Grid 6 Menu Bebas Gelembung Bulat -->
      <div class="grid">
        <button v-for="t in TILES" :key="t.id" class="tile-btn" @click="t.go()">
          <span v-if="t.id === 'jurnal' && unread" class="tile-badge">{{ unread }} baru</span>
          <UiIcon :name="t.icon" :size="20" class="tile-ic" />
          <span class="tile-label">{{ t.label }}</span>
        </button>
      </div>

      <!-- Ringkasan Kontrol Sentuh Cepat (khusus perangkat sentuh) -->
      <button v-if="store.touch" type="button" class="touch-summary-bar" @click="store.modal = 'controls'">
        <UiIcon name="sentuh" :size="15" />
        <span class="tsb-text">Kemudi Analog · Tuas Kecepatan · Guling Kiri/Kanan · Jeda · Seret Kamera</span>
        <span class="tsb-act">Panduan</span>
      </button>

      <!-- Bagian Bawah -->
      <div class="foot">
        <span class="pts"><UiIcon name="bintang" :size="16" />{{ store.progress.points }} bintang</span>
        <button class="btn ghost sm exit-btn" @click="game()?.toSplash()"><UiIcon name="keluar" :size="16" />Keluar ke beranda</button>
      </div>

      <!-- Petunjuk Scroll jika konten melebihi layar -->
      <UiScrollHint :target="cardRef" />
    </div>
  </div>
</template>

<style scoped>
.pause{position:fixed;inset:0;z-index:35;display:grid;place-items:center;padding:24px 16px;background:rgba(5,8,20,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-sizing:border-box}
.pause-card{width:min(480px,100%);max-height:calc(100vh - 48px);overflow-y:auto;padding:24px 26px;display:flex;flex-direction:column;gap:16px;border-radius:14px;background:rgba(11,16,33,.96);border:1px solid rgba(148,163,184,.18);box-shadow:0 20px 50px rgba(0,0,0,.65);box-sizing:border-box}
.pause-card::-webkit-scrollbar{width:5px}
.pause-card::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:999px}

.hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:2px}
.h2{font-size:20px;font-weight:600;color:var(--text);margin:0}

/* 1. Tombol Lanjutkan Ramping */
.resume-btn{border-radius:10px !important;height:44px;min-height:44px;font-weight:500;box-shadow:none !important;display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer;transition:filter .15s,transform .08s}
.resume-btn:hover{filter:brightness(1.1)}
.resume-btn:active{transform:scale(.99)}

/* 2. Kartu Misi Ringkas */
.mlist{display:flex;flex-direction:column;gap:10px}
.mis{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;text-align:left;background:var(--surface-2);border:1px solid var(--line);transition:background .15s,transform .1s}
.mis:hover{background:var(--surface-3);transform:translateX(2px)}
.mic{width:32px;height:32px;border-radius:8px;display:grid;place-items:center;background:rgba(59,130,246,.14);border:1px solid rgba(148,174,255,.16);color:var(--sky);flex:none}
.mt{flex:1;display:flex;flex-direction:column;gap:1px;min-width:0}
.mt small{font-size:11px;color:var(--faint);line-height:1.2}
.mt b{font-family:var(--display);font-weight:500;font-size:13.5px;color:var(--text);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-arr{color:var(--muted);flex:none}

/* 3. Grid Menu 3x2 */
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.tile-btn{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-family:var(--display);font-weight:500;font-size:13.5px;color:var(--text);transition:background .15s,border-color .15s,transform .1s;cursor:pointer}
.tile-btn:hover{background:var(--surface-3);border-color:rgba(148,174,255,.25)}
.tile-btn:active{transform:scale(.97)}
.tile-ic{color:var(--sky);transition:transform .15s}
.tile-btn:hover .tile-ic{transform:translateY(-1px);color:#93c5fd}
.tile-label{line-height:1.2}

/* Lencana Pil Jurnal */
.tile-badge{position:absolute;top:6px;right:6px;font-size:10.5px;font-weight:500;line-height:1;padding:2px 6px;border-radius:6px;background:rgba(234,179,8,.14);border:1px solid rgba(234,179,8,.28);color:#facc15;pointer-events:none}

/* 4. Bagian Bawah */
.foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:16px;margin-top:4px;border-top:1px solid rgba(148,174,255,.14)}
.pts{display:flex;align-items:center;gap:6px;color:var(--star);font-family:var(--display);font-weight:500;font-size:13px}
.exit-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12.5px;color:var(--muted);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:all .15s}
.exit-btn:hover{background:rgba(255,255,255,.1);color:var(--text)}

.touch-summary-bar{display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:10px;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.22);color:#7dd3fc;text-align:left;cursor:pointer;transition:background .15s}
.touch-summary-bar:hover{background:rgba(56,189,248,.14)}
.tsb-text{flex:1;font-size:11.5px;line-height:1.35;color:var(--muted)}
.tsb-act{font-family:var(--display);font-size:11.5px;font-weight:500;color:#38bdf8;white-space:nowrap}

@media (max-width:480px){
  .pause{padding:16px 12px}
  .pause-card{padding:18px 16px;gap:12px;max-height:calc(100vh - 32px)}
  .grid{gap:8px}
  .tile-btn{padding:10px 6px;font-size:12.5px}
}
@media (max-height:540px) and (orientation:landscape){
  .pause{
    padding:calc(8px + env(safe-area-inset-top, 0px)) calc(12px + env(safe-area-inset-right, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)) calc(12px + env(safe-area-inset-left, 0px));
    box-sizing:border-box;
    overflow:hidden;
  }
  .pause-card{
    box-sizing:border-box;
    width:min(620px, calc(100vw - 24px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)));
    max-height:calc(100dvh - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
    overflow-y:auto;
    overflow-x:hidden;
    padding:12px 14px;
    gap:8px;
    border-radius:12px;
  }
  .hd{
    padding-bottom:0;
  }
  .h2{
    font-size:17px;
    line-height:1.2;
  }
  .resume-btn{
    height:36px;
    min-height:36px;
    font-size:13.5px;
    gap:6px;
    border-radius:8px !important;
  }
  .mlist{
    display:grid;
    grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
    gap:6px;
    width:100%;
    min-width:0;
  }
  .mis{
    padding:6px 8px;
    gap:7px;
    border-radius:8px;
    min-width:0;
    overflow:hidden;
  }
  .mic{
    width:24px;
    height:24px;
    border-radius:6px;
    flex-shrink:0;
  }
  .mt{
    min-width:0;
    overflow:hidden;
    flex:1;
  }
  .mt small{
    font-size:9.5px;
    line-height:1.2;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    display:block;
  }
  .mt b{
    font-size:11.5px;
    line-height:1.25;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    display:block;
  }
  .mis .tag{
    padding:1px 5px;
    font-size:10px;
    gap:3px;
    flex-shrink:0;
  }
  .m-arr{
    flex-shrink:0;
  }
  .grid{
    grid-template-columns:repeat(3, minmax(0, 1fr));
    gap:6px;
    width:100%;
    min-width:0;
  }
  .tile-btn{
    padding:7px 6px;
    font-size:11.5px;
    gap:3px;
    border-radius:8px;
    min-width:0;
    overflow:hidden;
  }
  .tile-label{
    font-size:11.5px;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
  }
  .tile-badge{
    top:4px;
    right:4px;
    font-size:9px;
    padding:1px 4px;
    border-radius:4px;
  }
  .touch-summary-bar{
    padding:5px 8px;
    gap:8px;
    border-radius:8px;
    background:rgba(56,189,248,.12);
    border:1px solid rgba(56,189,248,.35);
    min-width:0;
    overflow:hidden;
  }
  .tsb-text{
    font-size:10.5px;
    line-height:1.25;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    min-width:0;
    color:var(--text);
  }
  .tsb-act{
    font-size:11px !important;
    font-weight:600 !important;
    color:#fff !important;
    background:rgba(56,189,248,.25) !important;
    border:1px solid rgba(56,189,248,.6) !important;
    padding:3px 8px !important;
    border-radius:6px !important;
    flex-shrink:0;
    box-shadow:0 2px 6px rgba(0,0,0,.25);
  }
  .foot{
    padding-top:6px;
    margin-top:0;
    gap:8px;
  }
  .pts{
    font-size:11.5px;
    gap:4px;
  }
  .exit-btn{
    padding:4px 8px;
    font-size:11px;
    border-radius:6px;
  }
}
</style>

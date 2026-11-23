<script setup>
// Jendela modal: Pengaturan, Jurnal penjelajah, Kontrol, dan konfirmasi Mulai baru.
import { ref } from 'vue';
import { store, game, wipeAll, shouldShowGuide } from '~/composables/useGame.js';
function close() { store.modal = null; store.journalId = null; confirmWipe.value = false; }
function setting(k, v) { store.settings[k] = v; game()?.applySettings?.(); if (!game()) { try { localStorage.setItem('astrosphere.settings', JSON.stringify(store.settings)); } catch {} } }
const confirmWipe = ref(false);
function wipe() { wipeAll(); location.reload(); }
function startNew() {
  close();
  store.startFromSave = false;
  if (shouldShowGuide()) {
    store.phase = 'guide';
  } else {
    store.phase = 'loading';
  }
}
const TITLE = { settings: 'Pengaturan', journal: 'Jurnal penjelajah', controls: 'Kontrol', confirmNew: 'Mulai petualangan baru?' };
</script>

<template>
  <Transition name="fade">
    <div v-if="store.modal" class="modal" @pointerdown.self="close">
      <div class="box card" :class="store.modal" role="dialog" aria-modal="true" aria-labelledby="mt">
        <div class="mh">
          <h2 id="mt" class="h2">{{ TITLE[store.modal] }}</h2>
          <button class="ib sm" aria-label="Tutup" @click="close"><UiIcon name="tutup" :size="20" /></button>
        </div>

        <div v-if="store.modal === 'settings'" class="mb">
          <UiToggle :model-value="store.settings.soundEnabled" label="Suara" @update:model-value="setting('soundEnabled', $event)" />
          <div class="trow"><span>Kualitas grafis<small>Pilih "Hemat" bila terasa patah-patah</small></span>
            <span class="seg"><button :class="{ on: store.settings.graphics === 'tinggi' }" @click="setting('graphics', 'tinggi')">Bagus</button><button :class="{ on: store.settings.graphics === 'rendah' }" @click="setting('graphics', 'rendah')">Hemat</button></span></div>
          <UiToggle :model-value="store.settings.events" label="Peristiwa antariksa" sub="Badai Matahari & sampah antariksa saat terbang" @update:model-value="setting('events', $event)" />
          <UiToggle :model-value="store.settings.reduceMotion" label="Kurangi gerakan" sub="Tanpa animasi kamera & latar" @update:model-value="setting('reduceMotion', $event)" />
          <div class="trow"><span>Kejelasan HUD</span><span class="rng"><input type="range" min=".3" max="1" step=".05" :value="store.settings.hudOpacity" aria-label="Kejelasan HUD" @input="setting('hudOpacity', +$event.target.value)"><b class="num">{{ Math.round(store.settings.hudOpacity * 100) }}%</b></span></div>
          <div class="danger">
            <button v-if="!confirmWipe" class="btn ghost sm dz" @click="confirmWipe = true">Hapus semua data</button>
            <template v-else><span class="small">Posisi, jurnal, bintang, dan pengaturan di browser ini akan hilang.</span><button class="btn sm line" @click="confirmWipe = false">Batal</button><button class="btn sm danger" @click="wipe">Hapus</button></template>
          </div>
        </div>

        <div v-else-if="store.modal === 'journal'" class="mb"><PanelsJournal /></div>

        <div v-else-if="store.modal === 'controls'" class="mb"><UiKeyGuide compact /><p class="small c">Tombol bisa diubah di Profil → Kontrol.</p></div>

        <div v-else-if="store.modal === 'confirmNew'" class="mb">
          <p class="small">Posisi pesawat dan jurnal akan dimulai ulang dari orbit Bumi. Bintang, skor kuis, dan pesawatmu tetap aman.</p>
          <div class="acts"><button class="btn line" @click="close">Batal</button><button class="btn primary" @click="startNew">Mulai baru</button></div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:rgba(6,10,26,.72)}
.box{width:min(520px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:22px 24px 24px;display:flex;flex-direction:column;gap:16px;touch-action:pan-y}
.box.controls{width:min(900px,100%)}
.box.journal{width:min(640px,100%)}
.mh{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mb{display:flex;flex-direction:column;gap:8px}
.rng{display:flex;align-items:center;gap:10px;width:200px}.rng b{font-size:14px;width:44px;text-align:right}
.danger{margin-top:12px;padding-top:14px;border-top:1px solid var(--line);display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.dz{color:var(--coral)}
.jr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin-top:6px}
.jr{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2)}
.jr b{display:block;font-family:var(--display);font-weight:500;font-size:15px}
.jr small{font-size:12px;color:var(--faint)}
.jr.unk .planet-dot{border:2px dashed var(--line-2);box-shadow:none;background:none}
.jr.unk b{color:var(--faint)}
.c{text-align:center}
.acts{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}
</style>

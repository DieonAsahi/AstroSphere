<script setup>
// Jendela modal: Pengaturan, Jurnal penjelajah, Kontrol, dan konfirmasi Mulai baru.
import { ref, watch } from 'vue';
import { store, game, shouldShowGuide, resetGameLoading } from '~/composables/useGame.js';

const pendingSetting = ref(null);
const hudPreview = ref(store.settings.hudOpacity);

watch(() => store.settings.hudOpacity, (val) => {
  hudPreview.value = val;
});

function close() {
  cancelPendingSetting();
  store.modal = null;
  store.journalId = null;
}

function setting(k, v) {
  store.settings[k] = v;
  game()?.applySettings?.();
  if (!game()) {
    try {
      localStorage.setItem('astrosphere.settings', JSON.stringify(store.settings));
    } catch {}
  }
}

function requestGraphics(val) {
  if (store.settings.graphics === val) return;
  const isTinggi = val === 'tinggi';
  pendingSetting.value = {
    key: 'graphics',
    value: val,
    title: isTinggi ? 'Kualitas Grafis Bagus' : 'Kualitas Grafis Hemat',
    message: isTinggi
      ? 'Mengaktifkan kualitas Bagus menambah efek pendar cahaya dan detail visual, namun dapat membuat perangkat standar terasa lebih berat. Lanjutkan?'
      : 'Kualitas Hemat menonaktifkan efek pendar berat agar terbang lebih mulus. Terapkan pengaturan ini?',
    actionText: isTinggi ? 'Lanjutkan' : 'Terapkan'
  };
}

function requestEvents(val) {
  if (store.settings.events === val) return;
  pendingSetting.value = {
    key: 'events',
    value: val,
    title: 'Peristiwa Antariksa',
    message: 'Mengubah Peristiwa Antariksa akan memengaruhi kemunculan Badai Matahari, Sampah Antariksa, serta bonus +10 Bintang saat terbang. Lanjutkan?',
    actionText: 'Lanjutkan'
  };
}

function requestReduceMotion(val) {
  if (store.settings.reduceMotion === val) return;
  pendingSetting.value = {
    key: 'reduceMotion',
    value: val,
    title: 'Kurangi Gerakan',
    message: 'Mengubah Kurangi Gerakan akan mengatur ulang animasi kamera dan efek latar. Terapkan perubahan?',
    actionText: 'Terapkan'
  };
}

function requestHudChange(val) {
  const roundedNew = Math.round(val * 100);
  const roundedCurrent = Math.round(store.settings.hudOpacity * 100);
  if (roundedNew === roundedCurrent) {
    hudPreview.value = store.settings.hudOpacity;
    return;
  }
  pendingSetting.value = {
    key: 'hudOpacity',
    value: val,
    title: 'Kejelasan HUD Kokpit',
    message: `Ubah transparansi instrumen kokpit HUD menjadi ${roundedNew}%?`,
    actionText: 'Terapkan'
  };
}

function applyPendingSetting() {
  if (!pendingSetting.value) return;
  const { key, value } = pendingSetting.value;
  setting(key, value);
  pendingSetting.value = null;
}

function cancelPendingSetting() {
  if (pendingSetting.value?.key === 'hudOpacity') {
    hudPreview.value = store.settings.hudOpacity;
  }
  pendingSetting.value = null;
}

function startNew() {
  close();
  store.startFromSave = false;
  if (!store.ready) resetGameLoading();
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
        <div v-if="store.modal === 'settings'" class="mh settings-head">
          <div class="head-left">
            <span class="eyebrow-label">PREFERENSI SIMULASI</span>
            <h2 id="mt" class="settings-title">Pengaturan</h2>
          </div>
          <button class="modern-close-btn" aria-label="Tutup Pengaturan" title="Tutup (Esc)" @click="close">
            <UiIcon name="tutup" :size="18" />
          </button>
        </div>
        <div v-else-if="store.modal !== 'journal'" class="mh">
          <h2 id="mt" class="h2">{{ TITLE[store.modal] }}</h2>
          <button class="modern-close-btn" aria-label="Tutup" title="Tutup (Esc)" @click="close">
            <UiIcon name="tutup" :size="18" />
          </button>
        </div>

        <div v-if="store.modal === 'settings'" class="settings-body">
          <UiToggle :model-value="store.settings.soundEnabled" label="Suara" @update:model-value="setting('soundEnabled', $event)" />

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Kualitas grafis</span>
              <small class="setting-sub">Pilih "Hemat" bila terasa patah-patah</small>
            </div>
            <div class="settings-seg" role="group" aria-label="Kualitas grafis">
              <button
                type="button"
                class="seg-btn"
                :class="{ active: store.settings.graphics === 'tinggi' }"
                @click="requestGraphics('tinggi')"
              >
                Bagus
              </button>
              <button
                type="button"
                class="seg-btn"
                :class="{ active: store.settings.graphics === 'rendah' }"
                @click="requestGraphics('rendah')"
              >
                Hemat
              </button>
            </div>
          </div>

          <UiToggle :model-value="store.settings.events" label="Peristiwa antariksa" sub="Badai Matahari & sampah antariksa saat terbang" @update:model-value="requestEvents($event)" />
          <UiToggle :model-value="store.settings.reduceMotion" label="Kurangi gerakan" sub="Tanpa animasi kamera & latar" @update:model-value="requestReduceMotion($event)" />

          <div class="setting-row">
            <div class="setting-info">
              <span class="setting-label">Kejelasan HUD</span>
              <small class="setting-sub">Transparansi instrumen kokpit &amp; kompas</small>
            </div>
            <div class="hud-rng-box">
              <input
                type="range"
                min=".3"
                max="1"
                step=".05"
                :value="hudPreview"
                aria-label="Kejelasan HUD"
                class="hud-range-slider"
                @input="hudPreview = +$event.target.value"
                @change="requestHudChange(+$event.target.value)"
              >
              <b class="hud-pct num">{{ Math.round(hudPreview * 100) }}%</b>
            </div>
          </div>
        </div>

        <div v-else-if="store.modal === 'journal'" class="journal-shell">
          <PanelsJournal @close="close" />
        </div>

        <div v-else-if="store.modal === 'controls'" class="mb"><UiKeyGuide compact /><p class="small c">{{ store.touch ? 'Posisi & ukuran tombol sentuh bisa diatur di Profil → Kontrol.' : 'Tombol bisa diubah di Profil → Kontrol.' }}</p></div>

        <div v-else-if="store.modal === 'confirmNew'" class="mb confirm-body">
          <p class="confirm-text">Posisi pesawat dan jurnal akan dimulai ulang dari orbit Bumi. Bintang, skor kuis, dan pesawatmu tetap aman.</p>
          <div class="acts"><button class="btn line" @click="close">Batal</button><button class="btn primary" @click="startNew">Mulai baru</button></div>
        </div>

        <!-- Popup Konfirmasi Pengaturan Modern -->
        <Transition name="fade">
          <div v-if="pendingSetting" class="setting-confirm-overlay" role="alertdialog" aria-modal="true" @pointerdown.self="cancelPendingSetting">
            <div class="setting-confirm-dialog">
              <div class="confirm-dialog-header">
                <div class="confirm-icon-box">
                  <UiIcon name="atur" :size="18" />
                </div>
                <h3 class="confirm-title">{{ pendingSetting.title }}</h3>
              </div>
              <p class="confirm-msg">{{ pendingSetting.message }}</p>
              <div class="confirm-acts">
                <button type="button" class="btn-dialog-cancel" @click="cancelPendingSetting">Batal</button>
                <button type="button" class="btn-dialog-confirm" @click="applyPendingSetting">{{ pendingSetting.actionText || 'Terapkan' }}</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal{
  position:fixed;
  inset:0;
  z-index:50;
  display:grid;
  place-items:center;
  padding:16px;
  background:rgba(5,8,20,.8);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
}
.box{
  position:relative;
  width:min(520px,100%);
  max-height:calc(100vh - 40px);
  overflow-y:auto;
  padding:24px;
  border-radius:14px;
  background:rgba(11,16,33,.96);
  border:1px solid rgba(148,163,184,.18);
  box-shadow:0 20px 52px rgba(0,0,0,.68);
  display:flex;
  flex-direction:column;
  gap:16px;
  touch-action:pan-y;
  scrollbar-width:thin;
  scrollbar-color:rgba(148,174,255,.2) transparent;
}
.box::-webkit-scrollbar{
  width:5px;
}
.box::-webkit-scrollbar-track{
  background:transparent;
}
.box::-webkit-scrollbar-thumb{
  background:rgba(148,174,255,.2);
  border-radius:99px;
}
.box::-webkit-scrollbar-thumb:hover{
  background:rgba(148,174,255,.35);
}
.box.settings{
  width:min(480px,100%);
  max-height:calc(100vh - 56px);
  border-radius:14px;
  padding:22px 24px 20px;
}
.box.controls{
  width:min(880px,100%);
  max-height:calc(100vh - 56px);
  border-radius:14px;
  padding:22px 24px 24px;
}
.box.journal{
  width:min(740px,100%);
  max-height:calc(100vh - 56px);
  border-radius:14px;
  padding:20px 22px 22px;
}
.journal-shell{display:flex;flex-direction:column;width:100%}
.mh{display:flex;align-items:center;justify-content:space-between;gap:12px}
.mh .h2{font-family:var(--display);font-size:19px;font-weight:600;color:#f8fafc;line-height:1.25;margin:0}
.mb{display:flex;flex-direction:column;gap:8px}
.confirm-body{gap:10px}
.confirm-text{font-size:14px;line-height:1.55;color:#cbd5e1;margin:0}

/* HEADER PENGATURAN MODERN */
.settings-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(148,174,255,.12);
}
.head-left{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.eyebrow-label{
  font-size:11px;
  font-weight:600;
  color:#38bdf8;
  letter-spacing:0.08em;
  text-transform:uppercase;
  font-family:var(--display);
}
.settings-title{
  font-family:var(--display);
  font-size:20px;
  font-weight:600;
  color:#fff;
  line-height:1.2;
  margin:0;
}
.modern-close-btn{
  width:36px;
  height:36px;
  min-width:36px;
  min-height:36px;
  border-radius:10px;
  background:rgba(148,174,255,.08);
  border:1px solid rgba(148,174,255,.18);
  color:var(--muted);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all .15s ease;
  flex:none;
}
.modern-close-btn:hover{
  background:rgba(148,174,255,.16);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.modern-close-btn:active{
  transform:scale(.95);
}

/* DAFTAR BARIS PENGATURAN */
.settings-body{
  display:flex;
  flex-direction:column;
}
.settings-body :deep(.trow),
.settings-body .setting-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:12px 0;
  border-bottom:1px solid rgba(148,174,255,.1);
  min-height:48px;
}
.settings-body :deep(.trow span),
.settings-body .setting-label{
  font-size:14.5px;
  font-weight:500;
  color:#fff;
  line-height:1.3;
}
.settings-body :deep(.trow small),
.settings-body .setting-sub{
  display:block;
  font-size:12px;
  color:var(--faint);
  margin-top:2px;
  line-height:1.3;
}
.settings-body .setting-info{
  display:flex;
  flex-direction:column;
}

/* SWITCH TOGGLE HALUS & PROPORSIONAL */
.settings-body :deep(.tog){
  width:42px;
  height:24px;
  border-radius:999px;
  position:relative;
  background:rgba(20,28,66,.95);
  border:1px solid rgba(148,174,255,.2);
  flex:none;
  transition:all .2s ease;
  cursor:pointer;
}
.settings-body :deep(.tog::after){
  content:"";
  position:absolute;
  left:3px;
  top:3px;
  width:16px;
  height:16px;
  border-radius:50%;
  background:var(--muted);
  box-shadow:0 1px 3px rgba(0,0,0,.4);
  transition:transform .2s ease,background .2s ease;
}
.settings-body :deep(.tog.on){
  background:#3b82f6;
  border-color:#3b82f6;
}
.settings-body :deep(.tog.on::after){
  transform:translateX(18px);
  background:#ffffff;
}

/* SEGMENTED CONTROL MODERN */
.settings-seg{
  display:inline-flex;
  padding:3px;
  gap:4px;
  border-radius:10px;
  background:rgba(11,16,36,.8);
  border:1px solid rgba(148,174,255,.16);
}
.seg-btn{
  min-height:32px;
  padding:0 14px;
  border-radius:8px;
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  color:var(--muted);
  background:transparent;
  border:none;
  cursor:pointer;
  transition:all .15s ease;
}
.seg-btn:hover{
  color:#fff;
  background:rgba(255,255,255,.05);
}
.seg-btn.active{
  background:#3b82f6;
  color:#ffffff;
  box-shadow:0 2px 8px rgba(59,130,246,.35);
}

/* KEJELASAN HUD SLIDER */
.hud-rng-box{
  display:flex;
  align-items:center;
  gap:12px;
  width:180px;
  flex:none;
}
.hud-range-slider{
  flex:1;
  height:5px;
  border-radius:999px;
  background:rgba(148,174,255,.2);
  accent-color:#38bdf8;
  cursor:pointer;
}
.hud-pct{
  font-family:var(--display);
  font-size:13px;
  font-weight:600;
  color:#38bdf8;
  min-width:40px;
  text-align:right;
}

/* POPUP KONFIRMASI PENGATURAN MODERN */
.setting-confirm-overlay{
  position:absolute;
  inset:0;
  z-index:30;
  background:rgba(5,8,20,.84);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  border-radius:14px;
}
.setting-confirm-dialog{
  width:100%;
  max-width:380px;
  background:rgba(11,16,33,.96);
  border:1px solid rgba(148,163,184,.18);
  border-radius:14px;
  padding:20px 22px;
  box-shadow:0 20px 44px rgba(0,0,0,.62);
  display:flex;
  flex-direction:column;
  gap:12px;
  text-align:left;
}
.confirm-dialog-header{
  display:flex;
  align-items:center;
  gap:10px;
}
.confirm-icon-box{
  width:32px;
  height:32px;
  border-radius:8px;
  background:rgba(56,189,248,.12);
  border:1px solid rgba(56,189,248,.28);
  color:#38bdf8;
  display:flex;
  align-items:center;
  justify-content:center;
  flex:none;
}
.confirm-title{
  font-family:var(--display);
  font-size:15px;
  font-weight:600;
  color:#ffffff;
  margin:0;
  line-height:1.3;
}
.confirm-msg{
  font-size:13px;
  line-height:1.5;
  color:#cbd5e1;
  margin:0;
}
.confirm-acts{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:10px;
  margin-top:6px;
  padding-top:12px;
  border-top:1px solid rgba(148,174,255,.1);
}
.btn-dialog-cancel{
  border-radius:10px;
  padding:8px 16px;
  font-size:13px;
  font-weight:500;
  color:var(--muted);
  background:transparent;
  border:1px solid rgba(148,163,184,.25);
  cursor:pointer;
  transition:all .15s ease;
}
.btn-dialog-cancel:hover{
  color:#fff;
  border-color:rgba(148,163,184,.45);
  background:rgba(255,255,255,.05);
}
.btn-dialog-confirm{
  border-radius:10px;
  padding:8px 18px;
  font-size:13px;
  font-weight:600;
  background:#3b82f6;
  color:#ffffff;
  border:none;
  cursor:pointer;
  box-shadow:0 2px 10px rgba(59,130,246,.35);
  transition:all .15s ease;
}
.btn-dialog-confirm:hover{
  background:#2563eb;
  transform:translateY(-1px);
}
.rng{display:flex;align-items:center;gap:10px;width:200px}.rng b{font-size:14px;width:44px;text-align:right}
.danger{margin-top:12px;padding-top:14px;border-top:1px solid var(--line);display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}
.dz{color:var(--coral)}
.c{text-align:center}
.acts{display:flex;justify-content:flex-end;gap:10px;margin-top:8px}
.acts .btn{height:40px;min-height:40px;padding:0 18px;border-radius:10px;font-family:var(--display);font-size:14px;font-weight:500;box-shadow:none}
.acts .btn.line{background:rgba(148,174,255,.06);border:1px solid rgba(148,163,184,.28);color:#e2e8f0}
.acts .btn.line:hover{background:rgba(148,174,255,.14);border-color:rgba(148,163,184,.45);color:#fff;filter:none}
.acts .btn.primary{background:#3b82f6;color:#ffffff;border:none;box-shadow:0 4px 14px rgba(59,130,246,.35)}
.acts .btn.primary:hover{background:#2563eb;transform:translateY(-1px);filter:none}
@media (max-height:520px) and (orientation:landscape){
  .modal{padding:calc(8px + var(--safe-t)) calc(14px + var(--safe-r)) calc(8px + var(--safe-b)) calc(14px + var(--safe-l))}
  .box,.box.settings,.box.controls,.box.journal{max-height:calc(100dvh - 16px);padding:14px 18px;gap:10px}
}
</style>

<script setup>
import { store, game } from '~/composables/useGame.js';
function cloud() {
  if (!store.account.loggedIn) { store.modal = 'login'; return; }
  store.toast.html = 'Sinkronisasi cloud <b>belum tersambung</b> di versi ini — progres tetap tersimpan lokal.'; store.toast.show = true;
  setTimeout(() => { store.toast.show = false; }, 3600);
}
function admin() {
  store.toast.html = 'Konsol <b>Admin</b> berada di konteks terpisah dan butuh otorisasi server (belum tersambung).'; store.toast.show = true;
  setTimeout(() => { store.toast.show = false; }, 3600);
}
</script>
<template>
  <header class="gh" :class="{ off: store.hudOff && store.mode === 'jelajah' }">
    <div class="brand"><UiIcon name="logo" class="logo" :size="36" /><b>Astrosphere</b><small>Edu Planet 3D</small></div>
    <div class="gh-r">
      <span class="status"><i :class="{ ok: store.account.loggedIn }" />{{ store.account.loggedIn ? 'Akun · cloud belum tersambung' : 'Tamu · tersimpan lokal' }}</span>
      <span class="pts" title="Saldo poin">{{ store.progress.points }} POIN</span>
      <button class="btn sm cloud" @click="cloud"><UiIcon name="cloud" :size="16" />Simpan ke cloud</button>
      <button class="ib" :class="{ on: store.mode === 'profil' }" aria-label="Profil pemain" title="Profil pemain" @click="game()?.setMode(store.mode === 'profil' ? 'jelajah' : 'profil')"><UiIcon name="pengguna" /></button>
      <button class="adm" @click="admin">Admin ↗</button>
    </div>
  </header>
</template>
<style scoped>
.gh.off{opacity:0;pointer-events:none}
.gh{transition:opacity .3s}
.status{display:flex;align-items:center;gap:8px;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim);font-weight:600}
.status i{width:6px;height:6px;border-radius:50%;background:var(--dim)} .status i.ok{background:var(--ok);box-shadow:0 0 8px var(--ok)}
.adm{font-size:12px;color:var(--dim)} .adm:hover{color:var(--txt)}
@media (max-width:1100px){ .status{display:none} }
@media (max-width:760px){ .cloud,.adm{display:none} .gh-r{gap:10px} .ib{width:40px;height:40px} }
</style>

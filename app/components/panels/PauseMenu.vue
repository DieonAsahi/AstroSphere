<script setup>
import { store, game } from '~/composables/useGame.js';
</script>
<template>
  <div class="pause">
    <div class="pp panel" role="dialog" aria-modal="true" aria-labelledby="pt">
      <div class="kicker">Jeda</div>
      <h2 id="pt">Penjelajahan dijeda</h2>
      <p>Posisi tersimpan otomatis di browser ini · dekat {{ store.hud.near.name }} · {{ store.hud.disc }} penemuan</p>
      <button class="btn primary block" @click="game()?.resume()">Lanjutkan</button>
      <button class="btn block" @click="store.modal = 'journal'">Jurnal penjelajahan</button>
      <button class="btn block" @click="store.modal = 'settings'">Pengaturan</button>
      <button class="btn block" @click="store.modal = 'controls'">Kontrol</button>
      <button class="btn ghost block" @click="game()?.toMenu()">Simpan &amp; kembali ke beranda</button>
    </div>
  </div>
</template>
<style scoped>
.pause{position:fixed;inset:0;z-index:35;display:grid;place-items:center;background:rgba(1,3,10,.6);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}
.pp{width:min(400px,92vw);padding:26px;display:flex;flex-direction:column;gap:10px}
h2{font-size:22px;letter-spacing:.08em;text-transform:uppercase;font-weight:600}
p{color:var(--dim);font-size:13px;line-height:1.5;margin-bottom:6px}
</style>

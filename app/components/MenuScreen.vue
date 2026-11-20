<script setup>
// Beranda & hanggar awal (PRD §4.3): ruang 3D tetap terlihat, judul di kiri, CTA Mulai sebagai tamu / Lanjutkan.
import { computed } from 'vue';
import { store, game, saveProgress } from '~/composables/useGame.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
const ship = computed(() => SHIPS[store.progress.selectedShip]);
const owned = computed(() => SHIP_IDS.filter((id) => store.progress.owned.includes(id)));
function cycle(d) {
  const list = owned.value; if (list.length < 2) return;
  const i = (list.indexOf(store.progress.selectedShip) + d + list.length) % list.length;
  store.progress.selectedShip = list[i]; saveProgress(); game()?.setShip(list[i]); game()?.click();
}
function start(fromSave) {
  if (!fromSave && store.hasSave) { store.modal = 'confirmNew'; return; }
  game()?.startGame(fromSave);
}
</script>
<template>
  <div class="menu">
    <header class="gh">
      <div class="brand"><UiIcon name="logo" class="logo" :size="36" /><b>Astrosphere</b><small>Edu Planet 3D</small></div>
      <div class="gh-r">
        <template v-if="!store.account.loggedIn">
          <button class="btn ghost sm" @click="store.modal = 'register'">Daftar</button>
          <button class="btn sm" @click="store.modal = 'login'">Masuk</button>
        </template>
        <span v-else class="badge ok"><i />{{ store.account.name }}</span>
      </div>
    </header>
    <div class="col scroll">
      <div class="kicker acc">Game edukasi tata surya · SDG 4</div>
      <h1>Jelajahi Tata Surya,<span>Temukan Keajaibannya</span></h1>
      <p class="tag">Terbangkan pesawatmu, kenali delapan planet, telusuri sejarah eksplorasi, pelajari gerhana, dan kerjakan kuis — langsung dari browser.</p>
      <div class="ship panel">
        <div class="kicker">Pesawat aktif</div>
        <div class="sel">
          <button class="arrow" :disabled="owned.length < 2" aria-label="Pesawat sebelumnya" @click="cycle(-1)"><UiIcon name="kembali" /></button>
          <div class="nm"><b>{{ ship.name }}</b><small>{{ ship.cls }} · {{ ship.length }}</small></div>
          <button class="arrow" :disabled="owned.length < 2" aria-label="Pesawat berikutnya" @click="cycle(1)"><UiIcon name="lanjut" /></button>
        </div>
        <p class="sd">{{ ship.desc }}</p>
        <div class="dots"><i v-for="id in SHIP_IDS" :key="id" :class="{ on: id === store.progress.selectedShip, lock: !store.progress.owned.includes(id) }" /></div>
        <p class="own">{{ owned.length }} dari 3 dimiliki · buka pesawat lain di Hanggar dengan poin kuis</p>
      </div>
      <div class="actions">
        <button v-if="store.hasSave" class="btn primary block lg" @click="start(true)"><span>Lanjutkan Petualangan</span><small>{{ store.saveMeta }}</small></button>
        <button class="btn block lg" :class="{ primary: !store.hasSave }" @click="start(false)"><span>{{ store.hasSave ? 'Mulai Penjelajahan Baru' : 'Mulai sebagai Tamu' }}</span><small>Mulai di orbit Bumi</small></button>
        <div class="row-btns">
          <button class="btn ghost" @click="store.modal = 'settings'"><UiIcon name="atur" :size="16" />Pengaturan</button>
          <button class="btn ghost" @click="store.modal = 'controls'"><UiIcon name="info" :size="16" />Kontrol</button>
          <button class="btn ghost" @click="store.modal = 'journal'"><UiIcon name="jurnal" :size="16" />Jurnal</button>
        </div>
      </div>
      <p class="foot">Progres tamu tersimpan otomatis di browser ini. Akun bersifat opsional untuk sinkronisasi cloud.</p>
    </div>
    <div class="hint"><span>Seret untuk memutar pesawat</span></div>
  </div>
</template>
<style scoped>
.menu{position:fixed;inset:0;z-index:20;background:linear-gradient(90deg,rgba(2,4,10,.88) 0%,rgba(2,4,10,.55) 34%,rgba(2,4,10,0) 60%);pointer-events:none}
.menu>*{pointer-events:auto}
.col{position:absolute;left:calc(var(--inset) + var(--safe-l));top:var(--header-h);bottom:0;width:min(470px,calc(100vw - 32px));display:flex;flex-direction:column;justify-content:center;gap:20px;padding:20px 0 28px}
.col>*{flex:none}
h1{font-weight:700;line-height:1.02;font-size:clamp(34px,4.6vw,58px);letter-spacing:.01em}
h1 span{display:block;color:var(--acc);text-shadow:0 0 28px rgba(var(--acc-rgb),.35)}
.tag{color:var(--dim);font-size:15px;line-height:1.55;max-width:42ch}
.ship{padding:16px 18px;display:flex;flex-direction:column;gap:10px}
.sel{display:flex;align-items:center;justify-content:space-between;gap:10px}
.arrow{width:44px;height:44px;border:1px solid var(--line);border-radius:9px;display:grid;place-items:center}
.arrow:disabled{opacity:.3;cursor:default}
.nm{text-align:center;flex:1}
.nm b{display:block;font-size:22px;letter-spacing:.12em;text-transform:uppercase}
.nm small{color:var(--acc);font-size:12px;letter-spacing:.12em;text-transform:uppercase}
.sd{color:var(--dim);font-size:13.5px;line-height:1.5}
.dots{display:flex;gap:6px;justify-content:center}
.dots i{width:22px;height:3px;border-radius:2px;background:rgba(var(--acc-rgb),.2)}
.dots i.on{background:var(--acc)} .dots i.lock{background:rgba(var(--acc2-rgb),.25)}
.own{font-size:11.5px;color:var(--faint);text-align:center}
.actions{display:flex;flex-direction:column;gap:10px}
.btn.lg{flex-direction:column;gap:3px;padding:13px 18px;min-height:56px}
.row-btns{display:flex;gap:4px;flex-wrap:wrap}
.row-btns .btn{flex:1;font-size:12px;padding:10px}
.foot{font-size:11.5px;color:var(--faint)}
.hint{position:absolute;right:calc(var(--inset) + 10px);bottom:calc(24px + var(--safe-b));font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--faint);pointer-events:none}
@media (max-width:760px){
  .menu{background:linear-gradient(180deg,rgba(2,4,10,.55) 0%,rgba(2,4,10,.2) 30%,rgba(2,4,10,.92) 62%)}
  .col{left:16px;right:16px;width:auto;justify-content:flex-end;gap:14px;padding-bottom:calc(18px + var(--safe-b))}
  .tag{font-size:13.5px} .ship{padding:12px 14px} .sd,.own{display:none} .hint{display:none}
}
@media (max-height:640px){ .col{justify-content:flex-start} .sd,.tag{display:none} }
</style>

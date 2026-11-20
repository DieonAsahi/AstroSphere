<script setup>
// Hanggar (PRD R11): Astra gratis, Orion 300, Nova 700. Membuka memotong saldo sekali; memilih yang dimiliki gratis.
import { computed, onBeforeUnmount } from 'vue';
import { store, game, unlockShip, saveProgress } from '~/composables/useGame.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
const cur = computed(() => SHIPS[store.hangarPreview] || SHIPS.astra);
const owned = (id) => store.progress.owned.includes(id);
function preview(id) { game()?.previewShip(id); game()?.click(); }
function use(id) { store.progress.selectedShip = id; saveProgress(); game()?.setShip(id); game()?.chime(); }
function unlock(id) {
  const r = unlockShip(id);
  if (r.ok) { use(id); store.toast.html = `<b>${SHIPS[id].name}</b> dibuka · saldo dipotong ${SHIPS[id].price} poin`; store.toast.show = true; setTimeout(() => { store.toast.show = false; }, 3200); }
}
onBeforeUnmount(() => { if (store.hangarPreview !== store.progress.selectedShip) game()?.setShip(store.progress.selectedShip); });
</script>
<template>
  <div>
    <div class="ltitle">
      <div class="kicker acc">Hanggar · {{ store.progress.owned.length }} dari 3 dimiliki</div>
      <h1>Pilih<br>Pesawat</h1>
      <p>Kumpulkan poin dari kuis planet untuk membuka pesawat baru. Seret layar untuk memutar pesawat.</p>
      <div class="bal panel"><span class="kicker">Saldo</span><b>{{ store.progress.points }} POIN</b></div>
    </div>
    <aside class="side panel" aria-label="Daftar pesawat">
      <div class="sbody scroll">
        <div class="kicker acc">Armada AstroSphere</div>
        <button v-for="id in SHIP_IDS" :key="id" class="card" :class="{ on: id === store.hangarPreview, used: id === store.progress.selectedShip }" @click="preview(id)">
          <span class="top">
            <span class="st" :class="{ ok: owned(id) }">{{ id === store.progress.selectedShip ? 'Dipakai' : owned(id) ? 'Dimiliki' : SHIPS[id].price + ' poin' }}</span>
            <UiIcon v-if="!owned(id)" name="kunci" :size="14" class="lock" />
          </span>
          <b>{{ SHIPS[id].name }}</b>
          <small>{{ SHIPS[id].cls }} · {{ SHIPS[id].length }}</small>
        </button>
        <hr class="divider">
        <div class="kicker">Detail · {{ cur.name }}</div>
        <p class="desc">{{ cur.desc }}</p>
        <div v-for="(v, k) in cur.stats" :key="k" class="stat"><span>{{ k }}</span><div class="bar"><i :style="{ width: v * 100 + '%' }" /></div><b class="mono">{{ Math.round(v * 10) }}/10</b></div>
        <p class="rule">Membuka pesawat memotong saldo sekali dan menambah kepemilikan sekali. Memilih pesawat yang sudah dimiliki tidak memotong saldo.</p>
      </div>
      <div class="sfoot col">
        <button v-if="cur.id === store.progress.selectedShip" class="btn" disabled>Sedang digunakan</button>
        <button v-else-if="owned(cur.id)" class="btn primary" @click="use(cur.id)">Gunakan {{ cur.name }}</button>
        <button v-else-if="store.progress.points >= cur.price" class="btn primary" @click="unlock(cur.id)">Buka · {{ cur.price }} poin</button>
        <button v-else class="btn" disabled>Butuh {{ cur.price - store.progress.points }} poin lagi</button>
        <button class="btn ghost" @click="game()?.setMode('jelajah')">‹ Kembali menjelajah</button>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.bal{display:inline-flex;align-items:center;gap:12px;padding:10px 16px;align-self:flex-start}
.bal b{font-family:var(--mono);color:var(--acc2);font-size:18px}
.card{display:flex;flex-direction:column;gap:4px;padding:14px 16px;border-radius:12px;border:1px solid var(--divider);background:var(--panel);text-align:left;transition:border-color .2s,background .2s}
.card:hover{border-color:var(--line)}
.card.on{border-color:var(--acc);background:var(--soft)}
.card b{font-size:17px;letter-spacing:.1em;text-transform:uppercase}
.card small{font-size:12px;color:var(--dim)}
.top{display:flex;align-items:center;justify-content:space-between}
.st{font-size:10px;letter-spacing:.24em;text-transform:uppercase;font-weight:600;color:var(--acc2)}
.st.ok{color:var(--ok)} .lock{color:var(--acc2)}
.desc{font-size:13.5px;line-height:1.55;color:var(--dim)}
.stat{display:grid;grid-template-columns:90px 1fr 42px;align-items:center;gap:10px;font-size:12px;color:var(--dim)}
.stat b{font-size:11px;color:var(--txt);text-align:right}
.rule{font-size:11.5px;color:var(--faint);line-height:1.45}
.sfoot.col{flex-direction:column}
@media (max-width:760px){ .ltitle h1{font-size:30px} .ltitle p{display:none} }
</style>

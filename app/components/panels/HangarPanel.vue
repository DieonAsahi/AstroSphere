<script setup>
// Hanggar: pesawat 3D berputar di latar, kartu pilihan di kiri-bawah, detail & aksi di kartu kanan.
// Astra gratis, Orion 300, Nova 700 bintang. Membuka memotong saldo sekali; memilih pesawat yang dimiliki gratis.
import { computed, onBeforeUnmount } from 'vue';
import { store, game, unlockShip, saveProgress, showToast } from '~/composables/useGame.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
const cur = computed(() => SHIPS[store.hangarPreview] || SHIPS.astra);
const owned = (id) => store.progress.owned.includes(id);
function preview(id) { game()?.previewShip(id); game()?.click(); }
function use(id) { store.progress.selectedShip = id; saveProgress(); game()?.setShip(id); game()?.chime(); }
function unlock(id) { const r = unlockShip(id); if (r.ok) { use(id); showToast(`<b>${SHIPS[id].name}</b> terbuka!`); } }
onBeforeUnmount(() => { if (store.hangarPreview !== store.progress.selectedShip) game()?.setShip(store.progress.selectedShip); });
</script>

<template>
  <div>
    <div class="stage-title">
      <span class="tag star"><UiIcon name="bintang" :size="14" />{{ store.progress.points }} bintang</span>
      <h1 class="h1">Hanggar</h1>
    </div>
    <div class="stage-bottom">
      <div class="ships" role="listbox" aria-label="Pilih pesawat">
        <button v-for="id in SHIP_IDS" :key="id" class="sc" role="option" :aria-selected="id === store.hangarPreview" :class="{ on: id === store.hangarPreview }" @click="preview(id)">
          <b>{{ SHIPS[id].name }}</b>
          <span v-if="id === store.progress.selectedShip" class="tag green"><UiIcon name="cek" :size="13" />Dipakai</span>
          <span v-else-if="owned(id)" class="tag">Dimiliki</span>
          <span v-else class="tag star"><UiIcon name="kunci" :size="13" />{{ SHIPS[id].price }}</span>
        </button>
      </div>
    </div>

    <aside class="sheet card" aria-label="Detail pesawat">
      <div class="sbody scroll">
        <div>
          <h2 class="h2">{{ cur.name }}</h2>
          <p class="small">{{ cur.cls }} · {{ cur.length }}</p>
        </div>
        <p class="desc">{{ cur.desc }}</p>
        <div class="stats">
          <div v-for="(v, k) in cur.stats" :key="k" class="st"><span>{{ k }}</span><div class="bar"><i :style="{ width: v * 100 + '%' }" /></div></div>
        </div>
        <p class="small">Seret layar untuk memutar pesawat.</p>
      </div>
      <div class="sfoot">
        <button v-if="cur.id === store.progress.selectedShip" class="btn block" disabled><UiIcon name="cek" :size="18" />Sedang dipakai</button>
        <button v-else-if="owned(cur.id)" class="btn primary block" @click="use(cur.id)">Pakai pesawat ini</button>
        <button v-else-if="store.progress.points >= cur.price" class="btn star block" @click="unlock(cur.id)"><UiIcon name="bintang" :size="18" />Buka · {{ cur.price }}</button>
        <template v-else>
          <button class="btn block" disabled><UiIcon name="kunci" :size="18" />Butuh {{ cur.price - store.progress.points }} bintang lagi</button>
          <div class="bar star"><i :style="{ width: Math.min(100, store.progress.points / cur.price * 100) + '%' }" /></div>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.ships{display:flex;gap:10px;flex-wrap:wrap}
.sc{display:flex;flex-direction:column;align-items:flex-start;gap:8px;min-width:150px;padding:14px 16px;border-radius:var(--r);background:var(--surface-a);border:2px solid var(--line);text-align:left;transition:border-color .15s,transform .12s}
.sc:hover{border-color:var(--line-2)}
.sc.on{border-color:var(--sky);transform:translateY(-3px)}
.sc b{font-family:var(--display);font-weight:600;font-size:16px}
.desc{font-size:14.5px;color:var(--muted);line-height:1.6}
.stats{display:flex;flex-direction:column;gap:10px}
.st{display:grid;grid-template-columns:110px 1fr;align-items:center;gap:12px;font-size:14px;color:var(--muted)}
@media (max-width:760px){ .ships{flex-wrap:nowrap;overflow-x:auto;width:100%} .sc{min-width:132px;padding:10px 12px} .desc{display:none} }
</style>

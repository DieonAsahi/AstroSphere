<script setup>
// Hanggar: pesawat 3D berputar di latar, carousel pemilih 1-per-1 di bawah pesawat, detail & aksi di kartu kanan.
// Astra gratis, Orion 300, Nova 700 bintang. Membuka memotong saldo sekali; memilih pesawat yang dimiliki gratis.
import { computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, unlockShip, saveProgress, showToast } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { SHIPS, SHIP_IDS } from '~/data/ships.js';
import { fmtSpeedKm } from '~/game/util.js';

const { getShips, loadAll, refreshShips } = useSupabaseContent();
const shipsData = computed(() => getShips());
const availableShipIds = computed(() => {
  const ids = SHIP_IDS.filter((id) => shipsData.value[id]?.is_active !== false);
  return ids.length ? ids : [SHIP_IDS[0]];
});
const cur = computed(() => shipsData.value[store.hangarPreview] || SHIPS[store.hangarPreview] || SHIPS.astra);
const currentIndex = computed(() => {
  const idx = availableShipIds.value.indexOf(store.hangarPreview);
  return idx >= 0 ? idx : 0;
});
const cruiseSpeedKm = computed(() => fmtSpeedKm(Number(cur.value.speed) > 0 ? Number(cur.value.speed) : 70));
const boostSpeedKm = computed(() => {
  const base = Number(cur.value.speed) > 0 ? Number(cur.value.speed) : 70;
  const mul = Number(cur.value.boost) >= 1 ? Number(cur.value.boost) : 4.5;
  return fmtSpeedKm(base * mul);
});
const shipOf = (id) => shipsData.value[id] || SHIPS[id];
const owned = (id) => store.progress.owned.includes(id);

function preview(id) {
  game()?.previewShip(id);
  game()?.click();
}

function prevShip() {
  const list = availableShipIds.value;
  const prevIdx = (currentIndex.value - 1 + list.length) % list.length;
  preview(list[prevIdx]);
}

function nextShip() {
  const list = availableShipIds.value;
  const nextIdx = (currentIndex.value + 1) % list.length;
  preview(list[nextIdx]);
}

watch(availableShipIds, (list) => {
  if (list.length && !list.includes(store.hangarPreview)) {
    game()?.previewShip(list[0]);
  }
});

function use(id) {
  store.progress.selectedShip = id;
  saveProgress();
  game()?.setShip(id);
  game()?.chime();
}

function unlock(id) {
  const s = shipOf(id);
  const r = unlockShip(id);
  if (r.ok) {
    use(id);
    showToast(`<b>${s.name}</b> terbuka!`);
  }
}

function onKeydown(e) {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevShip();
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    nextShip();
  }
}

onMounted(() => {
  loadAll();
  refreshShips();
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (store.hangarPreview !== store.progress.selectedShip) {
    game()?.setShip(store.progress.selectedShip);
  }
  store.hangarPreview = store.progress.selectedShip;
});
</script>

<template>
  <div>
    <!-- HEADER RINGKAS MODERN KIRI ATAS -->
    <div class="hangar-header">
      <span class="hangar-kicker">ARMADA ANTARIKSA</span>
      <div class="hangar-title-row">
        <h1 class="hangar-title">Hanggar Pesawat</h1>
        <span class="hangar-stars-badge" title="Saldo Bintang Anda">
          <UiIcon name="bintang" :size="13" />
          <span>{{ store.progress.points }} Bintang</span>
        </span>
      </div>
    </div>

    <!-- KONTROL PEMILIH CAROUSEL 1-PER-1 (BAWAH AREA 3D PESAWAT) -->
    <div class="hangar-selector-wrap" role="region" aria-label="Pemilih Pesawat">
      <!-- Tombol Panah Kiri (<) -->
      <button
        type="button"
        class="hangar-nav-btn prev"
        aria-label="Pesawat sebelumnya (Panah Kiri)"
        title="Pesawat sebelumnya (←)"
        @click="prevShip"
      >
        <UiIcon name="kembali" :size="20" />
      </button>

      <!-- Kartu Tengah Pesawat yang Sedang Ditinjau -->
      <div class="hangar-ship-card">
        <div class="ship-card-top">
          <b class="ship-name-text">{{ cur.name }}</b>
          <span class="ship-counter">{{ currentIndex + 1 }} / {{ availableShipIds.length }}</span>
        </div>

        <div class="ship-card-meta">
          <!-- Status Ringkas -->
          <span v-if="cur.id === store.progress.selectedShip" class="ship-status-pill used">
            <UiIcon name="cek" :size="12" /> Dipakai
          </span>
          <span v-else-if="owned(cur.id)" class="ship-status-pill owned">
            Dimiliki
          </span>
          <span v-else class="ship-status-pill locked">
            <UiIcon name="kunci" :size="12" /> {{ cur.price }} Bintang
          </span>

          <!-- Indikator Garis Kecil -->
          <div class="ship-dots-track" role="tablist" aria-label="Pilih kapal">
            <button
              v-for="(id, i) in availableShipIds"
              :key="id"
              type="button"
              class="ship-dot-bar"
              :class="{ active: i === currentIndex }"
              :aria-label="`Pilih ${shipOf(id).name}`"
              @click="preview(id)"
            />
          </div>
        </div>
      </div>

      <!-- Tombol Panah Kanan (>) -->
      <button
        type="button"
        class="hangar-nav-btn next"
        aria-label="Pesawat berikutnya (Panah Kanan)"
        title="Pesawat berikutnya (→)"
        @click="nextShip"
      >
        <UiIcon name="lanjut" :size="20" />
      </button>
    </div>

    <!-- PANEL DETAIL KANAN HANGGAR (GAYA 60-30-10 MODERN) -->
    <aside class="sheet card" aria-label="Detail pesawat">
      <div class="sbody scroll">
        <div class="ship-info-header">
          <h2 class="ship-header-title">{{ cur.name }}</h2>
          <p class="ship-header-sub">{{ cur.cls }} · {{ cur.length }}</p>
        </div>

        <p class="desc">{{ cur.desc }}</p>

        <!-- KOTAK KECEPATAN: ANGKA PUTIH & BIRU LANGIT -->
        <div class="speed-grid">
          <div class="speed-box">
            <span class="sb-label">Jelajah Maksimal</span>
            <b class="sb-val num">{{ cruiseSpeedKm }} <small>km/s</small></b>
          </div>
          <div class="speed-box turbo">
            <span class="sb-label">Pendorong Turbo</span>
            <b class="sb-val num">{{ boostSpeedKm }} <small>km/s</small></b>
          </div>
        </div>

        <!-- BAR STATISTIK RAMPING (5px) -->
        <div class="stats-section">
          <div v-for="(v, k) in cur.stats" :key="k" class="stat-row">
            <span class="stat-name">{{ k }}</span>
            <div class="stat-bar-track">
              <i :style="{ width: v * 100 + '%' }" />
            </div>
          </div>
        </div>

        <div class="hint-drag">
          <UiIcon name="mata" :size="13" />
          <span>Seret layar untuk memutar sudut pandang pesawat</span>
        </div>
      </div>

      <!-- FOOTER TOMBOL AKSI MODERN (44px, radius 10px, weight 500) -->
      <div class="sfoot">
        <button v-if="cur.id === store.progress.selectedShip" class="btn block ship-act-btn" disabled>
          <UiIcon name="cek" :size="17" />
          <span>Sedang dipakai</span>
        </button>
        <button v-else-if="owned(cur.id)" class="btn primary block ship-act-btn" @click="use(cur.id)">
          <span>Pakai pesawat</span>
        </button>
        <button v-else-if="store.progress.points >= cur.price" class="btn star block ship-act-btn" @click="unlock(cur.id)">
          <UiIcon name="bintang" :size="16" />
          <span>Buka armada · {{ cur.price }} Bintang</span>
        </button>
        <template v-else>
          <button class="btn block ship-act-btn" disabled>
            <UiIcon name="kunci" :size="16" />
            <span>Butuh {{ cur.price - store.progress.points }} bintang lagi</span>
          </button>
          <div class="stat-bar-track star-progress">
            <i :style="{ width: Math.min(100, cur.price > 0 ? store.progress.points / cur.price * 100 : 100) + '%' }" />
          </div>
        </template>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* HEADER KIRI ATAS */
.hangar-header{
  position:fixed;
  left:calc(var(--gap) + var(--safe-l));
  top:calc(76px + var(--safe-t));
  z-index:21;
  display:flex;
  flex-direction:column;
  gap:3px;
  pointer-events:none;
}
.hangar-header>*{pointer-events:auto}
.hangar-kicker{
  font-size:11px;
  font-weight:600;
  color:#38bdf8;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.hangar-title-row{
  display:flex;
  align-items:center;
  gap:12px;
}
.hangar-title{
  font-family:var(--display);
  font-size:22px;
  font-weight:600;
  color:#fff;
  margin:0;
  line-height:1.2;
  text-shadow:0 2px 12px rgba(0,0,0,.6);
}
.hangar-stars-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:3px 10px;
  border-radius:8px;
  background:rgba(234,179,8,.12);
  border:1px solid rgba(234,179,8,.28);
  color:var(--star);
  font-size:12px;
  font-weight:500;
  font-family:var(--display);
  backdrop-filter:blur(8px);
}

/* PEMILIH CAROUSEL BAWAH */
.hangar-selector-wrap{
  position:fixed;
  left:calc((100vw - min(400px, 36vw)) * 0.5);
  transform:translateX(-50%);
  bottom:calc(24px + var(--safe-b));
  z-index:21;
  display:inline-flex;
  align-items:center;
  gap:10px;
  background:rgba(8,13,32,.78);
  border:1px solid rgba(148,174,255,.18);
  border-radius:14px;
  padding:6px;
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:0 8px 32px rgba(0,0,0,.5);
}

.hangar-nav-btn{
  width:42px;
  height:42px;
  min-height:42px;
  border-radius:10px;
  background:rgba(15,23,52,.85);
  border:1px solid rgba(148,174,255,.2);
  color:rgba(241,244,255,.9);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all .15s ease;
  flex:none;
}
.hangar-nav-btn:hover{
  background:rgba(30,46,98,.9);
  border-color:rgba(148,174,255,.4);
  color:#fff;
  transform:scale(1.04);
}
.hangar-nav-btn:active{
  transform:scale(.96);
}

.hangar-ship-card{
  min-width:210px;
  padding:4px 12px;
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:6px;
}
.ship-card-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  width:100%;
  gap:12px;
}
.ship-name-text{
  font-family:var(--display);
  font-size:15px;
  font-weight:600;
  color:#fff;
  letter-spacing:.01em;
  white-space:nowrap;
}
.ship-counter{
  font-size:11px;
  font-weight:500;
  color:rgba(148,174,255,.6);
  letter-spacing:.04em;
  font-family:var(--display);
  font-variant-numeric:tabular-nums;
}

.ship-card-meta{
  display:flex;
  align-items:center;
  justify-content:space-between;
  width:100%;
  gap:12px;
}
.ship-status-pill{
  display:inline-flex;
  align-items:center;
  gap:4px;
  font-size:11px;
  font-weight:500;
  padding:2px 8px;
  border-radius:6px;
  line-height:1.2;
}
.ship-status-pill.used{
  background:rgba(34,197,94,.14);
  color:#4ade80;
  border:1px solid rgba(34,197,94,.3);
}
.ship-status-pill.owned{
  background:rgba(59,130,246,.12);
  color:#93c5fd;
  border:1px solid rgba(59,130,246,.25);
}
.ship-status-pill.locked{
  background:rgba(234,179,8,.12);
  color:var(--star);
  border:1px solid rgba(234,179,8,.3);
}

.ship-dots-track{
  display:flex;
  align-items:center;
  gap:5px;
}
.ship-dot-bar{
  width:12px;
  height:3px;
  border-radius:3px;
  background:rgba(148,174,255,.22);
  border:none;
  padding:0;
  cursor:pointer;
  transition:all .2s ease;
}
.ship-dot-bar:hover{
  background:rgba(148,174,255,.45);
}
.ship-dot-bar.active{
  width:22px;
  background:#38bdf8;
  box-shadow:0 0 8px rgba(56,189,248,.6);
}

/* DETAIL SHEET KANAN */
.ship-info-header{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.ship-header-title{
  font-family:var(--display);
  font-size:20px;
  font-weight:600;
  color:#fff;
  margin:0;
  line-height:1.2;
}
.ship-header-sub{
  font-size:12.5px;
  color:var(--muted);
  margin:0;
}
.desc{
  font-size:13.5px;
  color:rgba(241,244,255,.78);
  line-height:1.55;
  margin:0;
}

/* KOTAK KECEPATAN (GAYA 60-30-10 DEWASA) */
.speed-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
}
.speed-box{
  display:flex;
  flex-direction:column;
  gap:3px;
  padding:11px 12px;
  border-radius:10px;
  background:rgba(11,16,36,.65);
  border:1px solid rgba(148,174,255,.16);
}
.speed-box.turbo{
  background:rgba(56,189,248,.06);
  border-color:rgba(56,189,248,.24);
}
.sb-label{
  font-size:10.5px;
  color:var(--muted);
  font-weight:500;
  text-transform:uppercase;
  letter-spacing:.04em;
}
.sb-val{
  font-size:17.5px;
  font-weight:600;
  color:#f8fafc;
}
.speed-box.turbo .sb-val{
  color:#38bdf8;
}
.sb-val small{
  font-size:11.5px;
  color:rgba(148,174,255,.7);
  font-weight:400;
  margin-left:2px;
}

/* STATISTIK RAMPING (5px) */
.stats-section{
  display:flex;
  flex-direction:column;
  gap:9px;
}
.stat-row{
  display:grid;
  grid-template-columns:105px 1fr;
  align-items:center;
  gap:12px;
  font-size:13px;
  color:var(--muted);
}
.stat-name{
  font-weight:400;
}
.stat-bar-track{
  height:5px;
  border-radius:4px;
  background:rgba(148,174,255,.12);
  overflow:hidden;
}
.stat-bar-track i{
  display:block;
  height:100%;
  border-radius:4px;
  background:linear-gradient(90deg,#3b82f6,#38bdf8);
  transition:width .3s ease;
}
.stat-bar-track.star-progress{
  margin-top:2px;
}
.stat-bar-track.star-progress i{
  background:var(--star);
}

.hint-drag{
  display:inline-flex;
  align-items:center;
  gap:6px;
  font-size:12px;
  color:var(--faint);
  margin-top:2px;
}

/* TOMBOL AKSI MODERN */
.sfoot .ship-act-btn{
  height:44px;
  min-height:44px;
  border-radius:10px !important;
  font-weight:500;
  font-size:14px;
  box-shadow:none;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  transition:all .15s ease;
}
.sfoot .ship-act-btn.primary{
  background:var(--blue);
  color:#fff;
  border:none;
  box-shadow:0 4px 14px rgba(37,99,235,.35);
}
.sfoot .ship-act-btn.primary:hover{
  filter:brightness(1.12);
}
.sfoot .ship-act-btn.star{
  background:linear-gradient(135deg,rgba(234,179,8,.22),rgba(234,179,8,.1));
  border:1px solid rgba(234,179,8,.4);
  color:var(--star);
}
.sfoot .ship-act-btn.star:hover{
  background:linear-gradient(135deg,rgba(234,179,8,.32),rgba(234,179,8,.16));
}
.sfoot .ship-act-btn:disabled{
  background:rgba(255,255,255,.05);
  border:1px solid rgba(148,174,255,.14);
  color:var(--muted);
  opacity:.85;
}

@media (max-width:760px){
  .hangar-header{
    left:16px;
    top:calc(66px + var(--safe-t));
  }
  .hangar-title{
    font-size:18px;
  }
  .hangar-selector-wrap{
    left:50%;
    transform:translateX(-50%);
    bottom:calc(min(50vh, 470px) + 12px);
    width:calc(100% - 24px);
    max-width:340px;
    justify-content:space-between;
  }
  .hangar-ship-card{
    min-width:0;
    flex:1;
  }
  .desc{
    display:none;
  }
}
@media (max-height:540px) and (orientation:landscape){
  .hangar-header{
    left:calc(16px + var(--safe-l));
    top:calc(42px + var(--safe-t));
  }
  .sheet{
    left:auto !important;
    right:calc(10px + var(--safe-r)) !important;
    top:calc(44px + var(--safe-t)) !important;
    bottom:calc(10px + var(--safe-b)) !important;
    width:min(350px, 46vw) !important;
    height:auto !important;
    border-radius:14px !important;
    padding-bottom:0 !important;
  }
  .hangar-selector-wrap{
    left:calc(16px + var(--safe-l)) !important;
    transform:none !important;
    bottom:calc(10px + var(--safe-b)) !important;
    width:calc(100vw - min(350px, 46vw) - 40px) !important;
    max-width:400px !important;
  }
  .desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
}
</style>

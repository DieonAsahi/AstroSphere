<script setup>
// Jurnal Penjelajah: Ensiklopedia kosmik 16 benda langit yang sudah ditemukan.
// Tiap benda punya kartu fakta "Tahukah kamu?" (data/learning.js -> FACTS)
// Membuka kartu pertama kali memberi bonus bintang.
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, openCard } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { SUN, PLANETS, MOONS, BELT, COLOR_OF } from '~/data/solarSystem.js';
import { FACTS, CARD_REWARD } from '~/data/learning.js';

const emit = defineEmits(['close']);
const { planets: livePlanets, isBodyActive, getFacts, loadAll } = useSupabaseContent();

const bodies = computed(() => [
  SUN,
  ...PLANETS.filter((p) => isBodyActive(p.id)),
  ...MOONS.filter((m) => isBodyActive(m.id)),
  BELT,
]);
const found = (id) => store.discovered.includes(id) || !!store.progress.cards[id];
const fresh = (id) => found(id) && getFacts(id).length > 0 && !store.progress.cards[id];
const nFound = computed(() => bodies.value.filter((b) => found(b.id)).length);
const nRead = computed(() => bodies.value.filter((b) => store.progress.cards[b.id]).length);
const sel = computed(() => bodies.value.find((b) => b.id === store.journalId) || null);
const cards = computed(() => (sel.value ? getFacts(sel.value.id) : []));
const k = ref(0), reward = ref(0);

const PLANET_ORDERS = {
  merkurius: 1,
  venus: 2,
  bumi: 3,
  mars: 4,
  jupiter: 5,
  saturnus: 6,
  uranus: 7,
  neptunus: 8,
};

const selSubtitle = computed(() => {
  if (!sel.value) return '';
  const order = PLANET_ORDERS[sel.value.id];
  return order ? `Planet ke-${order}` : sel.value.kind;
});

watch(() => store.journalId, (id) => {
  k.value = 0;
  reward.value = id ? openCard(id) : 0;
  if (reward.value) game()?.chime();
}, { immediate: true });

function open(b) {
  if (found(b.id)) {
    store.journalId = b.id;
    game()?.click();
  }
}

function backToList() {
  store.journalId = null;
  game()?.click();
}

function closeJournal() {
  store.modal = null;
  store.journalId = null;
  emit('close');
}

function step(d) {
  const n = cards.value.length;
  if (n) k.value = (k.value + d + n) % n;
}

function onKey(e) {
  if (e.repeat) return;
  if (e.code === 'Escape') {
    if (sel.value) backToList();
    else closeJournal();
    return;
  }
  if (!sel.value) return;
  if (e.code === 'ArrowRight') step(1);
  else if (e.code === 'ArrowLeft') step(-1);
}

// Geser kartu di layar sentuh
let sx = null;
function down(e) { sx = e.clientX; }
function up(e) {
  if (sx == null) return;
  const d = e.clientX - sx;
  sx = null;
  if (Math.abs(d) > 50) step(d < 0 ? 1 : -1);
}
function cancel() { sx = null; }

onMounted(() => {
  loadAll();
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- TAMPILAN BACA KARTU FAKTA (SAAT 1 ENTITAS DIKLIK) -->
  <div v-if="sel" class="det">
    <div class="det-topbar">
      <!-- Tombol Kembali Bergaya Persegi 10px -->
      <button
        type="button"
        class="det-back-btn"
        aria-label="Kembali ke semua entitas"
        title="Kembali ke daftar (Esc)"
        @click="backToList"
      >
        <UiIcon name="kembali" :size="16" />
        <span>Semua Entitas</span>
      </button>

      <!-- Pemisah Vertikal Tipis -->
      <span class="det-sep" aria-hidden="true" />

      <!-- Identitas Entitas di Sisi Kiri -->
      <div class="det-identity">
        <span class="planet-dot" :style="{ '--c': COLOR_OF[sel.id], '--s': '26px' }" />
        <div class="det-nm">
          <b class="det-title">{{ sel.name }}</b>
          <span class="det-sub">{{ selSubtitle }}</span>
        </div>
      </div>

      <!-- Kanan: Bonus Bintang & Tombol Tutup -->
      <div class="det-actions">
        <span v-if="reward" class="rw" title="Bonus Bintang Pembaca Pertama">
          <UiIcon name="bintang" :size="13" />
          <span>+{{ reward }}</span>
        </span>
        <button
          type="button"
          class="j-close-btn"
          aria-label="Tutup Jurnal"
          title="Tutup (Esc)"
          @click="closeJournal"
        >
          <UiIcon name="tutup" :size="18" />
        </button>
      </div>
    </div>

    <!-- DECK KARTU FAKTA MODERN -->
    <div
      v-if="cards.length"
      class="deck"
      :style="{ '--c': COLOR_OF[sel.id] }"
      @pointerdown="down"
      @pointerup="up"
      @pointercancel="cancel"
    >
      <Transition name="fade" mode="out-in">
        <article :key="k" class="fc" aria-live="polite">
          <div class="fc-head">
            <span class="fc-lbl">TAHUKAH KAMU?</span>
            <span class="fc-step">{{ k + 1 }} / {{ cards.length }}</span>
          </div>

          <h3 class="fc-title">{{ cards[k].h }}</h3>
          <p class="fc-text">{{ cards[k].t }}</p>

          <div class="fc-foot">
            <span class="fc-src">Sumber rujukan: {{ cards[k].src }}</span>
          </div>
        </article>
      </Transition>
    </div>

    <!-- NAVIGASI KARTU KIRI / KANAN -->
    <div v-if="cards.length > 1" class="det-nav">
      <button
        type="button"
        class="det-nav-btn prev"
        aria-label="Kartu sebelumnya"
        title="Sebelumnya (←)"
        @click="step(-1)"
      >
        <UiIcon name="kembali" :size="16" />
      </button>

      <span class="det-nav-counter">{{ k + 1 }} / {{ cards.length }}</span>

      <div class="det-dots" :aria-label="`Kartu ${k + 1} dari ${cards.length}`">
        <button
          v-for="(c, i) in cards"
          :key="i"
          type="button"
          class="det-dot-bar"
          :class="{ active: i === k }"
          :aria-label="`Buka kartu ${i + 1}`"
          @click="k = i"
        />
      </div>

      <button
        type="button"
        class="det-nav-btn next"
        aria-label="Kartu berikutnya"
        title="Berikutnya (→)"
        @click="step(1)"
      >
        <UiIcon name="lanjut" :size="16" />
      </button>
    </div>
  </div>

  <!-- TAMPILAN KOLEKSI 16 ENTITAS (GRID 4x4) -->
  <div v-else class="all">
    <!-- HEADER JURNAL MODERN & TERSTRUKTUR -->
    <div class="j-header">
      <div class="j-title-block">
        <span class="j-kicker">ENSIKLOPEDIA ANTARIKSA</span>
        <h2 id="mt" class="j-title">Jurnal Penjelajah</h2>
      </div>

      <!-- Tombol Tutup Modern Persegi 36x36px Radius 10px -->
      <button
        type="button"
        class="j-close-btn"
        aria-label="Tutup Jurnal"
        title="Tutup (Esc)"
        @click="closeJournal"
      >
        <UiIcon name="tutup" :size="18" />
      </button>
    </div>

    <!-- 2 PIL INDIKATOR RINGKAS & SEJAJAR -->
    <div class="j-stats-row">
      <div class="j-stat-pill">
        <UiIcon name="mata" :size="14" class="stat-ic-sky" />
        <span>Ditemukan: <b class="num">{{ nFound }}</b> / {{ bodies.length }}</span>
      </div>
      <div class="j-stat-pill">
        <UiIcon name="bintang" :size="14" class="stat-ic-gold" />
        <span>Kartu Dibaca: <b class="num">{{ nRead }}</b> / {{ bodies.length }}</span>
      </div>
    </div>

    <!-- GARIS PEMISAH HALUS SEBELUM GRID -->
    <div class="j-divider" />

    <!-- GRID 16 ENTITAS SIMETRIS 4x4 (2 KOLOM DI MOBILE) -->
    <div class="jr-grid">
      <button
        v-for="b in bodies"
        :key="b.id"
        type="button"
        class="jr-card"
        :class="{ locked: !found(b.id), fresh: fresh(b.id) }"
        :disabled="!found(b.id)"
        @click="open(b)"
      >
        <!-- Avatar Entitas: Dot Planet jika Ditemukan, Ikon Gembok Ramping jika Terkunci -->
        <div class="jr-avatar">
          <span
            v-if="found(b.id)"
            class="planet-dot"
            :style="{ '--c': COLOR_OF[b.id], '--s': '30px' }"
          />
          <span v-else class="lock-circle" aria-hidden="true">
            <UiIcon name="kunci" :size="14" />
          </span>
        </div>

        <!-- Teks Informasi Entitas -->
        <div class="jr-info">
          <div class="jr-name-row">
            <b class="jr-name">{{ found(b.id) ? b.name : 'Terkunci' }}</b>
            <span v-if="fresh(b.id)" class="jr-badge-new">Baru</span>
          </div>
          <span class="jr-sub">{{ found(b.id) ? b.kind : 'Jelajahi untuk membuka' }}</span>
        </div>
      </button>
    </div>

    <p class="j-footnote">
      Terbang mendekati benda langit untuk membuka kartunya. Setiap kartu baru bernilai +{{ CARD_REWARD }} bintang.
    </p>
  </div>
</template>

<style scoped>
/* KONTAINER UTAMA */
.all{
  display:flex;
  flex-direction:column;
  gap:10px;
}

/* HEADER JURNAL MODERN */
.j-header{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.j-title-block{
  display:flex;
  flex-direction:column;
  gap:2px;
}
.j-kicker{
  font-size:11px;
  font-weight:600;
  color:#38bdf8;
  letter-spacing:.08em;
  text-transform:uppercase;
}
.j-title{
  font-family:var(--display);
  font-size:21px;
  font-weight:600;
  color:#fff;
  margin:0;
  line-height:1.2;
}

/* TOMBOL TUTUP MODERN PERSEGI 36x36px */
.j-close-btn{
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
.j-close-btn:hover{
  background:rgba(148,174,255,.16);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.j-close-btn:active{
  transform:scale(.95);
}

/* 2 PIL INDIKATOR RINGKAS */
.j-stats-row{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-top:2px;
}
.j-stat-pill{
  display:inline-flex;
  align-items:center;
  gap:7px;
  padding:5px 12px;
  border-radius:8px;
  background:rgba(11,16,36,.65);
  border:1px solid rgba(148,174,255,.14);
  font-size:12.5px;
  color:var(--muted);
}
.j-stat-pill .num{
  color:#fff;
  font-weight:600;
}
.stat-ic-sky{
  color:#38bdf8;
}
.stat-ic-gold{
  color:var(--star);
}

/* GARIS PEMISAH */
.j-divider{
  height:1px;
  background:rgba(148,174,255,.12);
  margin:4px 0 2px;
  width:100%;
}

/* GRID 16 KARTU SIMETRIS 4x4 */
.jr-grid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:10px;
}

.jr-card{
  display:flex;
  align-items:center;
  gap:10px;
  min-height:76px;
  padding:12px;
  border-radius:10px;
  background:rgba(11,16,36,.65);
  border:1px solid rgba(148,174,255,.14);
  text-align:left;
  transition:all .15s ease;
  min-width:0;
  box-sizing:border-box;
}
.jr-card:not(:disabled):hover{
  background:rgba(22,33,70,.85);
  border-color:rgba(148,174,255,.35);
  transform:translateY(-1px);
  cursor:pointer;
}
.jr-card:disabled{
  opacity:.65;
  cursor:not-allowed;
  background:rgba(8,12,28,.4);
  border-color:rgba(148,174,255,.08);
}
.jr-card.fresh{
  border-color:rgba(234,179,8,.45);
  background:rgba(234,179,8,.06);
}
.jr-card.fresh:hover{
  border-color:rgba(234,179,8,.7);
  background:rgba(234,179,8,.12);
}

.jr-avatar{
  flex:none;
  display:flex;
  align-items:center;
  justify-content:center;
  width:32px;
  height:32px;
}
.lock-circle{
  width:30px;
  height:30px;
  border-radius:8px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(148,174,255,.06);
  border:1px solid rgba(148,174,255,.12);
  color:rgba(148,174,255,.4);
}

.jr-info{
  flex:1;
  min-width:0;
  display:flex;
  flex-direction:column;
  gap:3px;
}
.jr-name-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:4px;
}
.jr-name{
  font-family:var(--display);
  font-weight:600;
  font-size:13.5px;
  color:#fff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  line-height:1.2;
}
.jr-card.locked .jr-name{
  color:rgba(148,174,255,.5);
  font-weight:500;
}
.jr-sub{
  font-size:11px;
  color:var(--muted);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  line-height:1.2;
}
.jr-card.locked .jr-sub{
  color:rgba(148,174,255,.35);
  font-size:10.5px;
}
.jr-badge-new{
  font-size:10px;
  font-weight:600;
  padding:2px 6px;
  border-radius:6px;
  background:rgba(234,179,8,.16);
  border:1px solid rgba(234,179,8,.35);
  color:#facc15;
  line-height:1;
  flex:none;
}

.j-footnote{
  font-size:11.5px;
  color:var(--faint);
  text-align:center;
  margin:4px 0 0;
  line-height:1.4;
}

/* TAMPILAN BACA KARTU FAKTA */
.det{
  display:flex;
  flex-direction:column;
  gap:12px;
}
.det-topbar{
  display:flex;
  align-items:center;
  gap:12px;
}
.det-back-btn{
  display:inline-flex;
  align-items:center;
  gap:6px;
  height:36px;
  padding:0 12px;
  border-radius:10px;
  background:rgba(148,174,255,.08);
  border:1px solid rgba(148,174,255,.18);
  color:var(--text);
  font-family:var(--display);
  font-size:13px;
  font-weight:500;
  cursor:pointer;
  transition:all .15s ease;
  flex:none;
}
.det-back-btn:hover{
  background:rgba(148,174,255,.16);
  border-color:rgba(148,174,255,.35);
  color:#fff;
}
.det-sep{
  width:1px;
  height:22px;
  background:rgba(148,174,255,.16);
  flex:none;
}
.det-identity{
  display:flex;
  align-items:center;
  gap:9px;
  min-width:0;
}
.det-nm{
  display:flex;
  flex-direction:column;
  min-width:0;
  text-align:left;
}
.det-title{
  font-family:var(--display);
  font-size:16px;
  font-weight:600;
  color:#fff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  line-height:1.2;
  text-align:left;
}
.det-sub{
  font-size:11.5px;
  color:var(--muted);
  line-height:1;
  text-align:left;
}
.det-actions{
  display:flex;
  align-items:center;
  gap:8px;
  flex:none;
  margin-left:auto;
}
.rw{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:4px 9px;
  border-radius:8px;
  background:rgba(234,179,8,.14);
  border:1px solid rgba(234,179,8,.32);
  color:var(--star);
  font-family:var(--display);
  font-weight:600;
  font-size:12.5px;
  animation:pop .4s cubic-bezier(.2,.9,.3,1.4) both;
}
@keyframes pop{from{transform:scale(.3);opacity:0}}

.deck{
  touch-action:pan-y;
}
.fc{
  min-height:140px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  gap:12px;
  padding:22px 24px;
  border-radius:12px;
  background:rgba(15, 23, 42, 0.72);
  border:1px solid rgba(148, 174, 255, 0.16);
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  box-shadow:0 8px 32px rgba(0,0,0,.35);
  box-sizing:border-box;
}
.fc-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
  width:100%;
}
.fc-lbl{
  font-size:11px;
  color:#38bdf8;
  font-family:var(--display);
  font-weight:600;
  letter-spacing:.08em;
  text-transform:uppercase;
  line-height:1;
  text-align:left;
}
.fc-step{
  font-size:11px;
  font-weight:500;
  color:rgba(148,174,255,.55);
  font-family:var(--display);
  font-variant-numeric:tabular-nums;
}
.fc-title{
  font-family:var(--display);
  font-weight:600;
  font-size:clamp(21px, 2.5vw, 23px);
  line-height:1.25;
  color:#fff;
  margin:0;
  text-align:left;
}
.fc-text{
  font-size:14.5px;
  line-height:1.6;
  color:#cbd5e1;
  margin:0;
  text-align:left;
}
.fc-foot{
  display:flex;
  align-items:center;
  justify-content:flex-start;
  border-top:1px solid rgba(148, 174, 255, 0.10);
  padding-top:12px;
  margin-top:16px;
  width:100%;
}
.fc-src{
  font-size:12px;
  color:#64748b;
  margin:0;
  padding:0;
  text-align:left;
  line-height:1.4;
}

.det-nav{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  margin-top:4px;
}
.det-nav-btn{
  width:36px;
  height:36px;
  min-height:36px;
  border-radius:10px;
  background:rgba(148,174,255,.08);
  border:1px solid rgba(148,174,255,.18);
  color:var(--text);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  transition:all .15s ease;
  font-family:var(--display);
  font-weight:500;
}
.det-nav-btn:hover{
  background:rgba(148,174,255,.18);
  border-color:rgba(148,174,255,.35);
  color:#fff;
  transform:scale(1.04);
}
.det-nav-btn:active{
  transform:scale(.96);
}
.det-nav-counter{
  font-family:var(--display);
  font-size:12.5px;
  font-weight:600;
  color:rgba(148,174,255,.75);
  letter-spacing:.02em;
  padding:0 2px;
  user-select:none;
}
.det-dots{
  display:flex;
  align-items:center;
  gap:6px;
}
.det-dot-bar{
  width:12px;
  height:4px;
  border-radius:4px;
  background:rgba(148,174,255,.22);
  border:none;
  padding:0;
  cursor:pointer;
  transition:all .2s ease;
}
.det-dot-bar:hover{
  background:rgba(148,174,255,.45);
}
.det-dot-bar.active{
  width:22px;
  background:#38bdf8;
  box-shadow:0 0 8px rgba(56,189,248,.6);
}

@media (max-width:680px){
  .jr-grid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
    gap:8px;
  }
  .jr-card{
    min-height:68px;
    padding:10px;
  }
  .fc{
    min-height:auto;
    padding:18px 18px;
  }
  .fc-title{
    font-size:20px;
  }
}
@media (max-width:540px){
  .det-topbar{
    flex-wrap:wrap;
    gap:10px;
  }
  .det-sep{
    display:none;
  }
  .det-actions{
    order:2;
    margin-left:auto;
  }
  .det-identity{
    order:3;
    width:100%;
    padding-top:2px;
    justify-content:flex-start;
  }
}
@media (max-height:540px) and (orientation:landscape){
  .fc{
    padding:12px 14px;
    min-height:auto;
  }
  .fc-title{font-size:16px;margin:4px 0}
  .fc-text{font-size:12.5px;line-height:1.45;margin-bottom:8px}
  .jr-grid{
    grid-template-columns:repeat(4, minmax(0, 1fr));
    gap:6px;
  }
  .jr-card{
    min-height:54px;
    padding:6px 8px;
    gap:6px;
  }
  .jr-name{font-size:12px}
  .jr-sub{font-size:10px}
  .j-title{font-size:17px}
  .j-stat-pill{padding:3px 8px;font-size:11px}
}
@media (prefers-reduced-motion:reduce){
  .rw{animation:none}
}
</style>

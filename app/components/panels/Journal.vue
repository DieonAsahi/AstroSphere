<script setup>
// Jurnal penjelajah: koleksi benda langit yang sudah ditemukan. Tiap benda punya kartu "Tahukah kamu?"
// (data/learning.js → FACTS) yang terbuka setelah ditemukan; membuka kartu pertama kali memberi bintang.
// Benda yang belum ditemukan tampil sebagai "???". Bisa dibuka langsung ke satu benda lewat store.journalId.
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, openCard } from '~/composables/useGame.js';
import { SUN, PLANETS, MOONS, BELT, COLOR_OF } from '~/data/solarSystem.js';
import { FACTS, CARD_REWARD } from '~/data/learning.js';
const bodies = [SUN, ...PLANETS, ...MOONS, BELT];
const found = (id) => store.discovered.includes(id) || !!store.progress.cards[id];
const fresh = (id) => found(id) && !!FACTS[id] && !store.progress.cards[id];
const nFound = computed(() => bodies.filter((b) => found(b.id)).length);
const nRead = computed(() => bodies.filter((b) => store.progress.cards[b.id]).length);
const sel = computed(() => bodies.find((b) => b.id === store.journalId) || null);
const cards = computed(() => (sel.value && FACTS[sel.value.id]) || []);
const k = ref(0), reward = ref(0);
watch(() => store.journalId, (id) => {
  k.value = 0;
  reward.value = id ? openCard(id) : 0;
  if (reward.value) game()?.chime();
}, { immediate: true });
function open(b) { if (found(b.id)) { store.journalId = b.id; game()?.click(); } }
function step(d) { const n = cards.value.length; if (n) k.value = (k.value + d + n) % n; }
function onKey(e) {
  if (!sel.value || e.repeat) return;
  if (e.code === 'ArrowRight') step(1);
  else if (e.code === 'ArrowLeft') step(-1);
}
// geser kartu di layar sentuh
let sx = null;
function down(e) { sx = e.clientX; }
function up(e) { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) step(d < 0 ? 1 : -1); }
function cancel() { sx = null; }
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <!-- KARTU SATU BENDA -->
  <div v-if="sel" class="det">
    <div class="who">
      <button class="ib sm" aria-label="Kembali ke semua benda" @click="store.journalId = null"><UiIcon name="kembali" :size="20" /></button>
      <span class="planet-dot" :style="{ '--c': COLOR_OF[sel.id], '--s': '48px' }" />
      <div class="nm"><b>{{ sel.name }}</b><small>{{ sel.kind }}</small></div>
      <span v-if="reward" class="rw"><UiIcon name="bintang" :size="14" />+{{ reward }}</span>
    </div>
    <div v-if="cards.length" class="deck" :style="{ '--c': COLOR_OF[sel.id] }" @pointerdown="down" @pointerup="up" @pointercancel="cancel">
      <Transition name="fade" mode="out-in">
        <article :key="k" class="fc" aria-live="polite">
          <small class="lbl"><UiIcon name="info" :size="15" />Tahukah kamu?</small>
          <b class="h">{{ cards[k].h }}</b>
          <p>{{ cards[k].t }}</p>
          <small class="src">Sumber: {{ cards[k].src }}</small>
        </article>
      </Transition>
    </div>
    <div v-if="cards.length > 1" class="nav">
      <button class="ib" aria-label="Kartu sebelumnya" @click="step(-1)"><UiIcon name="kembali" :size="20" /></button>
      <div class="dots" :aria-label="`Kartu ${k + 1} dari ${cards.length}`">
        <button v-for="(c, i) in cards" :key="i" :class="{ on: i === k }" :aria-label="`Kartu ${i + 1}`" @click="k = i" />
      </div>
      <button class="ib" aria-label="Kartu berikutnya" @click="step(1)"><UiIcon name="lanjut" :size="20" /></button>
    </div>
  </div>

  <!-- KOLEKSI -->
  <div v-else class="all">
    <div class="sum">
      <span><b class="num">{{ nFound }}</b>/{{ bodies.length }} ditemukan</span>
      <span><b class="num">{{ nRead }}</b>/{{ bodies.length }} kartu dibaca</span>
    </div>
    <div class="jr-grid">
      <button v-for="b in bodies" :key="b.id" class="jr" :class="{ unk: !found(b.id), nw: fresh(b.id) }" :disabled="!found(b.id)" @click="open(b)">
        <span class="planet-dot" :style="{ '--c': found(b.id) ? COLOR_OF[b.id] : 'transparent', '--s': '34px' }" />
        <span class="tx"><b>{{ found(b.id) ? b.name : '???' }}</b><small>{{ found(b.id) ? b.kind : 'Belum ditemukan' }}</small></span>
        <span v-if="fresh(b.id)" class="tag star">Baru</span>
      </button>
    </div>
    <p class="small">Terbang mendekati benda langit untuk membuka kartunya. Kartu baru: +{{ CARD_REWARD }} bintang.</p>
  </div>
</template>

<style scoped>
.all{display:flex;flex-direction:column;gap:12px}
.sum{display:flex;gap:18px;flex-wrap:wrap;font-size:14px;color:var(--muted)}
.sum b{font-size:17px;color:var(--text)}
.jr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px}
.jr{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2);text-align:left;border:2px solid transparent;transition:background .15s,border-color .15s}
.jr:not(:disabled):hover{background:var(--surface-3)}
.jr:disabled{cursor:default}
.jr.nw{border-color:rgba(255,201,71,.45)}
.jr .tx{flex:1;min-width:0;display:flex;flex-direction:column}
.jr b{font-family:var(--display);font-weight: 500;font-size:15px}
.jr small{font-size:12px;color:var(--faint)}
.jr .tag{flex:none}
.jr.unk .planet-dot{border:2px dashed var(--line-2);box-shadow:none;background:none}
.jr.unk b{color:var(--faint)}
.det{display:flex;flex-direction:column;gap:14px}
.who{display:flex;align-items:center;gap:12px}
.nm{flex:1;display:flex;flex-direction:column}
.nm b{font-family:var(--display);font-weight: 500;font-size:20px}
.nm small{font-size:13px;color:var(--faint)}
.rw{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;background:rgba(255,201,71,.16);color:var(--star);font-family:var(--display);font-weight: 500;font-size:14px;animation:pop .4s cubic-bezier(.2,.9,.3,1.4) both}
@keyframes pop{from{transform:scale(.3);opacity:0}}
.deck{touch-action:pan-y}
.fc{min-height:220px;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:26px 24px;border-radius:var(--r-lg);
  background:linear-gradient(150deg,color-mix(in srgb,var(--c) 26%,var(--surface-2)),var(--surface-2) 70%);border:1px solid color-mix(in srgb,var(--c) 40%,var(--line))}
.lbl{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--star);font-family:var(--display);font-weight: 500}
.h{font-family:var(--display);font-weight: 600;font-size:clamp(28px,4.4vw,40px);line-height:1.1}
.fc p{font-size:16px;line-height:1.55;color:#dbe1f7;max-width:44ch}
.src{font-size:12px;color:var(--faint)}
.nav{display:flex;align-items:center;justify-content:center;gap:16px}
.dots{display:flex;gap:8px}
.dots button{width:10px;height:10px;padding:0;border-radius:50%;background:var(--surface-3)}
.dots button.on{background:var(--sky);width:26px;border-radius:999px}
@media (max-width:560px){ .fc{min-height:200px;padding:22px 18px} .fc p{font-size:15px} }
@media (prefers-reduced-motion:reduce){ .rw{animation:none} }
</style>

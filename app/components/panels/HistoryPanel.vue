<script setup>
// Mode Sejarah: lini masa satu benda (dibuka dari halaman planet). Seluruh isi kartu bisa digulir;
// detail & aksi peristiwa ada di dalam kartu peristiwa yang dipilih (tidak ada footer yang menimpa isi).
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { store, game, showToast } from '~/composables/useGame.js';
import { HISTORY, ERAS, LOCATION_LABEL } from '~/data/history.js';
import { PLANETS, MOONS } from '~/data/solarSystem.js';
const body = computed(() => store.sejarah.body);
const info = computed(() => PLANETS.find((p) => p.id === body.value) || MOONS.find((m) => m.id === body.value));
const era = computed(() => ERAS.find((e) => e.id === store.sejarah.era) || ERAS[0]);
const list = computed(() => (HISTORY[body.value] || []).filter((e) => e.year >= era.value.from && e.year <= era.value.to));
const total = computed(() => (HISTORY[body.value] || []).length);
const ERA_SHORT = { semua: 'Semua', kuno: 'Kuno', teleskopik: 'Teleskop', antariksa: 'Era antariksa' };
const far = ref({});
let t = 0;
const scroller = ref(null);
function scrollToSel() { nextTick(() => { const n = scroller.value?.querySelector('.ev.on'); if (n) n.scrollIntoView({ block: 'nearest', behavior: store.settings.reduceMotion ? 'auto' : 'smooth' }); }); }
onMounted(() => { t = setInterval(() => { const s = game()?.poiStatus() || []; far.value = Object.fromEntries(s.map((x) => [x.id, x.far])); }, 500); scrollToSel(); });
onBeforeUnmount(() => clearInterval(t));
watch(() => store.sejarah.selected, scrollToSel);
function choose(id) { if (store.sejarah.selected === id) return; store.sejarah.selected = id; game()?.selectEvent(id); }
watch(() => store.sejarah.era, async () => {
  if (!list.value.some((e) => e.id === store.sejarah.selected)) store.sejarah.selected = list.value[0]?.id || null;
  await nextTick(); game()?.buildPOIs();
});
function where(e) {
  if (e.lat == null) return LOCATION_LABEL[e.locationType] || 'Tanpa titik permukaan';
  const la = `${Math.abs(e.lat).toFixed(1)}° ${e.lat >= 0 ? 'LU' : 'LS'}`, lo = `${(e.lon > 180 ? 360 - e.lon : e.lon).toFixed(1)}° ${e.lon > 180 ? 'BB' : 'BT'}`;
  return `${la}, ${lo}${far.value[e.id] ? ' · di sisi jauh' : ''}`;
}
function focusLoc() { if (!game()?.focusLocation()) showToast('Peristiwa ini tidak punya titik di permukaan — lihat lintasannya di sekitar planet.'); }
</script>

<template>
  <div>
    <div class="stage-title">
      <span class="tag">{{ total }} peristiwa</span>
      <h1 class="h1">{{ info?.name }}</h1>
    </div>
    <div class="stage-bottom"><PanelsTimeBar :body="body !== 'bulan' ? body : ''" /></div>

    <aside class="sheet card" aria-label="Lini masa sejarah">
      <div ref="scroller" class="sbody scroll">
        <div>
          <h2 class="h3">Lini masa</h2>
          <p class="small">Pengamatan, penemuan, dan misi ke {{ info?.name }}.</p>
        </div>
        <div class="hscroll" role="tablist" aria-label="Pilih era">
          <button v-for="e in ERAS" :key="e.id" class="chip" role="tab" :aria-selected="store.sejarah.era === e.id" :class="{ on: store.sejarah.era === e.id }" @click="store.sejarah.era = e.id">{{ ERA_SHORT[e.id] || e.label }}</button>
        </div>
        <ol class="tl">
          <li v-if="!list.length" class="empty">Belum ada peristiwa di era ini. Coba era lain.</li>
          <li v-for="e in list" :key="e.id" class="ev" :class="{ on: e.id === store.sejarah.selected, mem: e.memorial }">
            <button class="evh" :aria-expanded="e.id === store.sejarah.selected" @click="choose(e.id)">
              <span class="yr num">{{ e.year < 0 ? Math.abs(e.year) + ' SM' : e.year }}</span>
              <span class="tt"><b>{{ e.title }}</b><small>{{ e.actor }}</small></span>
            </button>
            <!-- kartu kenangan: tanpa titik lokasi; apa yang terjadi, penyebab, pelajaran, nama awak -->
            <div v-if="e.id === store.sejarah.selected && e.memorial" class="det memo">
              <span class="mdate"><UiIcon name="bintang-o" :size="15" />{{ e.memorial.date }}</span>
              <p>{{ e.body }}</p>
              <div class="mb"><b>Penyebab</b><p>{{ e.memorial.cause }}</p></div>
              <div class="mb lesson"><b>Pelajaran</b><p>{{ e.memorial.lesson }}</p></div>
              <div class="crew"><b>Mengenang awaknya</b><ul><li v-for="n in e.memorial.crew" :key="n">{{ n }}</li></ul></div>
              <p class="more">NASA mengenang awak Apollo 1, Challenger, dan Columbia setiap akhir Januari pada Hari Peringatan (Day of Remembrance).</p>
            </div>
            <div v-else-if="e.id === store.sejarah.selected" class="det">
              <p>{{ e.body }}</p>
              <p class="more">{{ e.detail }}</p>
              <div class="loc"><UiIcon name="lokasi" :size="16" />{{ where(e) }}</div>
              <div class="acts">
                <button class="btn sm primary" @click="focusLoc"><UiIcon name="target" :size="16" />Lihat lokasi</button>
                <UiToggle v-if="e.lat != null" v-model="store.toggles.follow" label="Kamera ikuti" />
              </div>
            </div>
          </li>
        </ol>
        <p class="fine">Contoh data lokal untuk pembelajaran.</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.tl{list-style:none;position:relative;display:flex;flex-direction:column;gap:8px;padding-left:18px}
.tl::before{content:"";position:absolute;left:5px;top:10px;bottom:10px;width:2px;border-radius:2px;background:var(--line)}
.ev{position:relative}
.ev::before{content:"";position:absolute;left:-18px;top:17px;width:12px;height:12px;border-radius:50%;background:var(--bg);border:2px solid var(--line-2)}
.ev.on::before{background:var(--blue);border-color:var(--sky);box-shadow:0 0 0 4px rgba(59,108,240,.25)}
.evh{width:100%;display:flex;gap:12px;align-items:flex-start;text-align:left;padding:10px 12px;border-radius:var(--r-sm);transition:background .15s}
.evh:hover{background:var(--surface-2)}
.ev.on .evh{background:var(--surface-2)}
.yr{flex:none;min-width:58px;font-weight:600;font-size:17px;color:var(--sky)}
.tt{display:flex;flex-direction:column;gap:1px}
.tt b{font-weight:500;font-size:15px;line-height:1.35}
.tt small{font-size:12.5px;color:var(--faint)}
.det{display:flex;flex-direction:column;gap:10px;padding:4px 12px 14px 82px;font-size:14px;color:var(--muted);line-height:1.55}
.more{font-size:13.5px;color:var(--faint)}
.loc{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text)}
.acts{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.acts :deep(.trow){min-height:0;gap:10px;font-size:13.5px}
.empty{color:var(--muted);font-size:14px;padding:8px 0}
/* kenangan: warna lebih tenang, titik berupa cincin putih */
.ev.mem::before{background:var(--bg);border-color:#cfd6ee}
.ev.mem.on::before{background:#cfd6ee;border-color:#fff;box-shadow:0 0 0 4px rgba(207,214,238,.18)}
.ev.mem .yr{color:#cfd6ee}
.ev.mem .tt b{font-style:normal}
.memo{gap:10px}
.mdate{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#cfd6ee}
.mb{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border-radius:var(--r-sm);background:var(--surface-2)}
.mb b,.crew b{font-family:var(--display);font-weight:600;font-size:13.5px;color:var(--text)}
.mb.lesson{background:rgba(54,211,154,.08);border:1px solid rgba(54,211,154,.22)}
.mb.lesson b{color:var(--green)}
.crew ul{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.crew li{padding:4px 10px;border-radius:999px;background:var(--surface-3);font-size:12.5px;color:var(--text)}
.fine{font-size:12px;color:var(--faint);text-align:center;padding-bottom:4px}
@media (max-width:760px){ .det{padding-left:12px} }
</style>

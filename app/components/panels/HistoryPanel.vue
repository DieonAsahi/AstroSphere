<script setup>
// Mode Sejarah (PRD §7.2–7.3): lini masa per benda, filter era, POI permukaan body-fixed,
// lintasan untuk flyby/orbit (bukan koordinat pendaratan palsu), dan keadaan kosong.
import { computed, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { HISTORY, ERAS, HISTORY_BODIES, LOCATION_LABEL } from '~/data/history.js';
import { PLANETS, MOONS, NAME_OF, COLOR_OF } from '~/data/solarSystem.js';
const body = computed(() => store.sejarah.body);
const info = computed(() => PLANETS.find((p) => p.id === body.value) || MOONS.find((m) => m.id === body.value));
const era = computed(() => ERAS.find((e) => e.id === store.sejarah.era) || ERAS[0]);
const list = computed(() => (HISTORY[body.value] || []).filter((e) => e.year >= era.value.from && e.year <= era.value.to));
const total = computed(() => (HISTORY[body.value] || []).length);
const sel = computed(() => list.value.find((e) => e.id === store.sejarah.selected) || null);
const far = ref({});
let t = 0;
const listEl = ref(null);
function scrollToSel() { nextTick(() => { const n = listEl.value?.querySelector('.ev.on'); if (n) n.scrollIntoView({ block: 'nearest', behavior: store.settings.reduceMotion ? 'auto' : 'smooth' }); }); }
onMounted(() => { t = setInterval(() => { const s = game()?.poiStatus() || []; far.value = Object.fromEntries(s.map((x) => [x.id, x.far])); }, 400); scrollToSel(); });
onBeforeUnmount(() => clearInterval(t));
watch(() => store.sejarah.selected, scrollToSel);
function choose(id) { store.sejarah.selected = id; game()?.selectEvent(id); }
function setBody(id) {
  store.sejarah.body = id; const first = (HISTORY[id] || []).find((e) => e.year >= era.value.from && e.year <= era.value.to);
  store.sejarah.selected = first ? first.id : null; game()?.focus(id);
}
watch(() => store.sejarah.era, async () => {
  // Bila peristiwa terpilih keluar dari hasil filter: pilih hasil pertama secara eksplisit atau kosongkan
  if (!list.value.some((e) => e.id === store.sejarah.selected)) store.sejarah.selected = list.value[0]?.id || null;
  await nextTick(); game()?.buildPOIs();
});
function locText(e) {
  if (e.lat == null) return e.locationType === 'surface' ? 'Lokasi belum tersedia' : `${LOCATION_LABEL[e.locationType]} · tanpa titik permukaan`;
  const la = `${Math.abs(e.lat).toFixed(2)}° ${e.lat >= 0 ? 'LU' : 'LS'}`, lo = `${(e.lon > 180 ? 360 - e.lon : e.lon).toFixed(2)}° ${e.lon > 180 ? 'BB' : 'BT'}`;
  return `${la} · ${lo}${far.value[e.id] ? ' · di sisi jauh' : ''}`;
}
function toPlanet() { if (PLANETS.some((p) => p.id === body.value)) { store.focus = body.value; game()?.setMode('planet', { body: body.value }); } }
function focusLoc() { if (!game()?.focusLocation()) { store.toast.html = 'Peristiwa ini tidak memiliki titik permukaan — lihat lintasannya di sekitar planet.'; store.toast.show = true; setTimeout(() => { store.toast.show = false; }, 3000); } }
</script>
<template>
  <div>
    <div class="ltitle">
      <div class="kicker acc">Mode sejarah · eksplorasi {{ info?.name }}</div>
      <h1>{{ info?.name }}</h1>
      <p>{{ info?.kind }} · {{ total }} peristiwa tercatat</p>
      <div class="chips"><span class="badge ok"><i />Revolusi aktif</span><span class="badge ok"><i />Rotasi aktif</span></div>
    </div>
    <div class="lbottom">
      <UiOrbitInset v-if="body !== 'bulan'" :body="body" />
      <PanelsTimeBar />
    </div>
    <aside class="side panel" aria-label="Sejarah dan lini masa">
      <div class="sbody">
        <div class="head">
          <span class="tag" :style="{ color: COLOR_OF[body], borderColor: COLOR_OF[body] }">{{ NAME_OF[body] }}</span>
          <span class="htxt">Sejarah Planet &amp; Lini Masa</span>
          <button class="btn sm" @click="game()?.setMode('jelajah')"><UiIcon name="tutup" :size="14" />Tutup</button>
        </div>
        <div class="bodies scroll-x" role="tablist" aria-label="Pilih benda langit">
          <button v-for="id in HISTORY_BODIES" :key="id" class="chip soft" :class="{ on: id === body }" @click="setBody(id)"><span class="dot" :style="{ background: COLOR_OF[id] }" />{{ NAME_OF[id] }}</button>
        </div>
        <div>
          <div class="kicker">{{ NAME_OF[body] }} · {{ info?.kind }}</div>
          <h2>Sejarah {{ body === 'bulan' ? 'Bulan' : 'Planet: ' + NAME_OF[body] }}</h2>
          <p class="desc">Lini masa observasi astronomi, penemuan ilmiah, dan misi penjelajahan.</p>
        </div>
        <div class="kicker">Filter era observasi</div>
        <div class="eras scroll-x" role="tablist">
          <button v-for="e in ERAS" :key="e.id" class="chip" :class="{ on: store.sejarah.era === e.id }" @click="store.sejarah.era = e.id">{{ e.label }}</button>
        </div>
        <div ref="listEl" class="list scroll" role="list">
          <div class="rail" />
          <p v-if="!list.length" class="empty">Tidak ada peristiwa pada era ini untuk {{ NAME_OF[body] }}. Coba era lain.</p>
          <button v-for="e in list" :key="e.id" class="ev" :class="{ on: e.id === store.sejarah.selected }" role="listitem" @click="choose(e.id)">
            <span class="node" />
            <span class="card">
              <span class="top"><b class="yr">{{ e.year }} M</b><span class="act">{{ e.actor }}</span><span class="sp" /><span class="kind">{{ e.id === store.sejarah.selected ? 'Fokus terpilih' : e.kind }}</span></span>
              <span class="ttl">{{ e.title }}</span>
              <span v-if="e.id === store.sejarah.selected" class="meta">{{ e.year >= 1957 ? 'Era Antariksa' : e.year >= 1610 ? 'Era Teleskopik' : 'Era Kuno' }} · {{ LOCATION_LABEL[e.locationType] }}</span>
              <span class="bd">{{ e.body }}</span>
              <span v-if="e.id === store.sejarah.selected" class="detail">
                <span class="kicker acc">Detail misi observasi</span>
                <span>{{ e.detail }}</span>
                <span class="loc"><UiIcon name="target" :size="13" />{{ locText(e) }}</span>
                <span v-if="e.lat != null" class="follow" @click.stop><UiToggle v-model="store.toggles.follow" label="Ikuti lokasi (kamera)" sub="Kamera yang mengikuti, rotasi planet tidak diubah" /></span>
              </span>
            </span>
          </button>
        </div>
        <span class="badge acc2 demo">Demo lokal · belum dipublikasikan admin</span>
      </div>
      <div class="sfoot">
        <button class="btn" :disabled="body === 'bulan'" @click="toPlanet">‹ Info Planet</button>
        <button class="btn primary" :disabled="!sel" @click="focusLoc">Fokus lokasi ›</button>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.head{display:flex;align-items:center;gap:10px}
.tag{font-family:var(--mono);font-weight:700;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border:1px solid;border-radius:5px}
.htxt{flex:1;font-size:12px;color:var(--dim)}
.scroll-x{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:none;padding-bottom:2px}
.scroll-x::-webkit-scrollbar{display:none}
h2{font-size:22px;font-weight:600;letter-spacing:.02em;margin:4px 0}
.desc{font-size:13px;color:var(--dim);line-height:1.5}
.list{position:relative;flex:1;min-height:120px;display:flex;flex-direction:column;gap:12px;padding-right:4px;mask-image:linear-gradient(180deg,#000 85%,transparent)}
.rail{position:absolute;left:7px;top:0;bottom:0;width:2px;background:var(--divider)}
.empty{padding:16px 0 0 28px;color:var(--dim);font-size:13px}
.ev{display:flex;gap:12px;text-align:left;width:100%}
.node{flex:none;width:16px;display:flex;justify-content:center;padding-top:18px;position:relative;z-index:1}
.node::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--bg);border:1.5px solid var(--faint)}
.ev.on .node::before{width:14px;height:14px;background:var(--acc);border-color:var(--acc);box-shadow:0 0 12px var(--acc);margin-top:-2px}
.card{flex:1;display:flex;flex-direction:column;gap:7px;padding:12px 14px;border-radius:10px;background:var(--panel);border:1px solid var(--divider);transition:border-color .2s}
.ev:hover .card{border-color:var(--line)}
.ev.on .card{background:var(--soft);border-color:var(--acc)}
.top{display:flex;align-items:center;gap:8px}
.yr{font-family:var(--mono);font-size:13px}
.ev.on .yr{color:var(--acc)}
.act{font-family:var(--mono);font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:5px;padding:2px 6px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp{flex:1}
.kind{font-family:var(--mono);font-size:10px;color:var(--faint)}
.ev.on .kind{color:var(--acc)}
.ttl{font-size:14.5px;font-weight:600}
.meta{font-size:11px;color:var(--acc)}
.bd{font-size:12.5px;color:var(--dim);line-height:1.5}
.detail{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:8px;background:var(--bg);border:1px solid var(--divider);font-size:12px;line-height:1.5;color:var(--dim)}
.loc{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--txt)}
.follow{display:block;margin-top:2px;color:var(--txt)}
.demo{align-self:flex-start;font-size:9px;flex:none}
</style>

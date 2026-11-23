<script setup>
// Peta tata surya (tampak atas, skematis). Jarak digambar dengan skala akar agar planet dalam tidak bertumpuk.
// Desktop: daftar planet | peta | detail. Ponsel: peta penuh + lembar bawah. "Terbang ke sini" = terbang otomatis.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, game, isFound } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
import { fmtDist, fmtEta } from '~/game/util.js';
const cv = ref(null), wrap = ref(null);
const sel = ref(store.hud.target.id && store.hud.target.id !== 'matahari' ? store.hud.target.id : 'mars');
const hover = ref(null);
const live = ref({}); // jarak & perkiraan waktu per planet (diperbarui 4×/detik)
let raf = 0, hits = [], zoom = 1, tick = 0;
const selP = computed(() => PLANETS.find((p) => p.id === sel.value) || PLANETS[3]);

function draw() {
  raf = requestAnimationFrame(draw);
  const g = game(), c = cv.value, w = wrap.value; if (!g || !c || !w) return;
  const d = g.mapData(); if (!d) return;
  if (++tick % 15 === 1) live.value = Object.fromEntries(d.bodies.map((b) => [b.id, { d: b.d, eta: b.d / (d.cruise * .8) }]));
  const W = w.clientWidth, H = w.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const RM = d.rmax * .8, Rpx = Math.min(W, H) / 2 * .9 * zoom, cx = W / 2, cy = H / 2;
  const f = (r) => Math.sqrt(Math.max(0, r) / RM) * Rpx;
  const P = (a, b) => { const r = Math.hypot(a, b), k = r > 1e-6 ? f(r) / r : 0; return [cx + a * k, cy + b * k]; };
  // sabuk asteroid & batas
  x.fillStyle = 'rgba(170,180,222,.08)'; x.beginPath(); x.arc(cx, cy, f(d.belt[1]), 0, 7); x.arc(cx, cy, f(d.belt[0]), 0, 7, true); x.fill();
  x.setLineDash([5, 7]); x.strokeStyle = 'rgba(255,107,107,.35)'; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, f(d.rmax * .8), 0, 7); x.stroke(); x.setLineDash([]);
  for (const o of d.orbits) {
    const on = o.id === sel.value || o.id === d.target;
    x.strokeStyle = on ? 'rgba(143,176,255,.75)' : 'rgba(170,180,222,.2)'; x.lineWidth = on ? 1.8 : 1;
    x.beginPath(); o.pts.forEach(([a, b], i) => { const [px, py] = P(a, b); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.stroke();
  }
  // Matahari
  const sg = x.createRadialGradient(cx, cy, 0, cx, cy, 26); sg.addColorStop(0, '#fff4cf'); sg.addColorStop(.35, '#ffc947'); sg.addColorStop(1, 'rgba(255,160,40,0)');
  x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, 26, 0, 7); x.fill();
  hits = []; const boxes = [];
  const pls = d.bodies.filter((b) => !b.isMoon && !b.isSun);
  pls.sort((a, b) => (a.id === sel.value ? -1 : b.id === sel.value ? 1 : 0));
  for (const b of pls) {
    const [px, py] = P(b.x, b.z), r = Math.max(5, Math.min(11, 4 + Math.sqrt(b.r) * .55));
    if (b.id === sel.value) { x.strokeStyle = '#ffffff'; x.lineWidth = 2.5; x.beginPath(); x.arc(px, py, r + 6, 0, 7); x.stroke(); }
    else if (b.id === hover.value) { x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, r + 5, 0, 7); x.stroke(); }
    if (b.id === d.target) { x.strokeStyle = '#ffc947'; x.lineWidth = 2; x.setLineDash([3, 3]); x.beginPath(); x.arc(px, py, r + 10, 0, 7); x.stroke(); x.setLineDash([]); }
    x.fillStyle = b.color; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    hits.push({ id: b.id, x: px, y: py, r: r + 12 });
    // label tanpa tumpang tindih (planet terpilih selalu diberi label)
    x.font = '600 13px Poppins, sans-serif';
    const tw = x.measureText(b.name).width, bx = px + r + 8, by = py - 9, box = [bx - 4, by - 2, tw + 8, 22];
    const clash = boxes.some((q) => !(box[0] > q[0] + q[2] || box[0] + box[2] < q[0] || box[1] > q[1] + q[3] || box[1] + box[3] < q[1]));
    if (!clash || b.id === sel.value) {
      boxes.push(box);
      x.fillStyle = b.id === sel.value ? '#ffffff' : 'rgba(6,10,26,.75)';
      x.beginPath(); x.roundRect(box[0], box[1], box[2], box[3], 11); x.fill();
      x.fillStyle = b.id === sel.value ? '#060a1a' : '#f1f4ff'; x.textBaseline = 'middle'; x.fillText(b.name, bx, by + 9);
    }
  }
  // pesawat
  const [sx, sy] = P(d.ship.x, d.ship.z);
  x.save(); x.translate(sx, sy); x.rotate(d.ship.heading); x.fillStyle = '#ffc947';
  x.beginPath(); x.moveTo(0, -11); x.lineTo(7, 8); x.lineTo(0, 4); x.lineTo(-7, 8); x.closePath(); x.fill(); x.restore();
  x.font = '600 12px Poppins, sans-serif'; x.fillStyle = '#ffc947'; x.textBaseline = 'middle'; x.fillText('Kamu', sx + 12, sy - 12);
}
function pickAt(e) { const r = cv.value.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; return hits.find((t) => Math.hypot(t.x - mx, t.y - my) < t.r)?.id || null; }
function onMove(e) { hover.value = pickAt(e); }
function onClick(e) { const id = pickAt(e); if (id) { sel.value = id; game()?.click(); } }
function onWheel(e) { e.preventDefault(); setZoom(e.deltaY > 0 ? 1 / 1.15 : 1.15); }
function setZoom(k) { zoom = Math.min(3, Math.max(.8, zoom * k)); }
function fly() { game()?.flyTo(sel.value); }
function look() { game()?.setMode('planet', { body: sel.value }); }
onMounted(draw); onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="map">
    <header class="mh">
      <h2 class="h2">Peta tata surya</h2>
      <button class="btn line sm" @click="game()?.back()"><UiIcon name="tutup" :size="18" />Tutup</button>
    </header>

    <nav class="list" aria-label="Daftar planet">
      <button v-for="p in PLANETS" :key="p.id" class="li" :class="{ on: p.id === sel }" @click="sel = p.id">
        <span class="planet-dot" :style="{ '--c': p.color, '--s': '28px' }" />
        <span class="n"><b>{{ p.name }}</b><small>{{ live[p.id] ? fmtDist(live[p.id].d) : '' }}</small></span>
        <UiIcon v-if="store.hud.target.id === p.id" name="target" :size="16" class="tg" />
      </button>
    </nav>

    <div ref="wrap" class="mc">
      <canvas ref="cv" @mousemove="onMove" @mouseleave="hover = null" @click="onClick" @wheel="onWheel" />
      <div class="zoom">
        <button class="ib sm" aria-label="Perbesar" @click="setZoom(1.25)"><UiIcon name="plus" :size="18" /></button>
        <button class="ib sm" aria-label="Perkecil" @click="setZoom(1 / 1.25)"><UiIcon name="minus" :size="18" /></button>
      </div>
      <p class="legend"><i class="you" />Kamu <i class="lim" />Batas jelajah · jarak dipadatkan</p>
    </div>

    <aside class="det card flat">
      <div class="hscroll chips">
        <button v-for="p in PLANETS" :key="p.id" class="chip" :class="{ on: p.id === sel }" @click="sel = p.id"><span class="dot" :style="{ background: p.color }" />{{ p.name }}</button>
      </div>
      <div class="dtop">
        <span class="planet-dot" :style="{ '--c': selP.color, '--s': '60px' }" />
        <div><h3 class="h3">{{ selP.name }}</h3><p class="small">{{ selP.kind }}</p></div>
      </div>
      <div class="stats">
        <div class="tile"><small>Jarak</small><b class="num">{{ live[sel] ? fmtDist(live[sel].d) : '—' }}</b></div>
        <div class="tile"><small>Waktu tempuh</small><b class="num">{{ live[sel] ? fmtEta(live[sel].eta) : '—' }}</b></div>
      </div>
      <div class="acts">
        <button class="btn primary" @click="fly"><UiIcon name="target" :size="18" />Terbang ke sini</button>
        <button v-if="isFound(sel)" class="btn line" @click="look"><UiIcon name="mata" :size="18" />Lihat planet</button>
        <p v-else class="lock"><UiIcon name="kunci" :size="16" />Belum ditemukan — terbang ke sana untuk membuka halaman, kuis, dan kartunya.</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.map{position:fixed;inset:0;z-index:22;background:radial-gradient(ellipse at 50% 50%,#0e1640 0%,#060a1a 70%);display:grid;
  grid-template-columns:240px 1fr 320px;grid-template-rows:auto 1fr;gap:16px;padding:calc(var(--top) + var(--safe-t)) calc(var(--gap) + var(--safe-r)) calc(var(--gap) + var(--safe-b)) calc(var(--gap) + var(--safe-l))}
.mh{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between}
.list{display:flex;flex-direction:column;gap:4px;overflow-y:auto}
.li{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:var(--r);text-align:left;transition:background .15s}
.li:hover{background:var(--surface-2)}
.li.on{background:var(--surface-3)}
.li .n{flex:1;display:flex;flex-direction:column;line-height:1.25}
.li b{font-family:var(--display);font-weight:500;font-size:16px}
.li small{font-size:12.5px;color:var(--faint)}
.tg{color:var(--star)}
.mc{position:relative;min-height:0;border-radius:var(--r-lg);overflow:hidden}
canvas{display:block;cursor:pointer}
.zoom{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:8px}
.legend{position:absolute;left:12px;bottom:10px;display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--faint)}
.legend i{display:inline-block;width:10px;height:10px;border-radius:50%}
.legend .you{background:var(--star)} .legend .lim{border:1.5px dashed var(--coral);margin-left:8px}
.det{align-self:center;padding:20px;display:flex;flex-direction:column;gap:14px;border-radius:var(--r-lg)}
.det .chips{display:none}
.dtop{display:flex;align-items:center;gap:14px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.stats small{display:block;font-size:12.5px;color:var(--faint)}
.stats b{font-size:18px;font-weight:500}
.acts{display:flex;flex-direction:column;gap:10px}
.lock{display:flex;gap:8px;align-items:flex-start;font-size:13.5px;color:var(--faint);line-height:1.5}
.lock :deep(svg){flex:none;margin-top:2px;color:var(--star)}
@media (max-width:1000px){ .map{grid-template-columns:1fr 300px} .list{display:none} .mc{grid-column:1} }
@media (max-width:760px){
  .map{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;gap:8px;padding:calc(var(--top) + var(--safe-t)) 12px calc(12px + var(--safe-b))}
  .mh .h2{font-size:22px}
  .det{align-self:stretch;padding:14px;gap:10px}
  .det .chips{display:flex}
  .dtop .planet-dot{--s:44px !important}
  .stats b{font-size:16px}
  .acts{flex-direction:row}.acts .btn{flex:1;padding:0 12px;font-size:15px}
}
</style>

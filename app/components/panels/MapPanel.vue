<script setup>
// Peta sistem (tampak atas): orbit, posisi planet saat ini, posisi pesawat; klik planet untuk menjadikannya target.
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { store, game } from '~/composables/useGame.js';
import { PLANETS } from '~/data/solarSystem.js';
const cv = ref(null), wrap = ref(null);
let raf = 0, hits = [], scale = 1, zoom = 1;
const hover = ref(null);
function draw() {
  raf = requestAnimationFrame(draw);
  const g = game(), c = cv.value, w = wrap.value; if (!g || !c || !w) return;
  const d = g.mapData(); if (!d) return;
  const W = w.clientWidth, H = w.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.width = W + 'px'; c.style.height = H + 'px'; }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  scale = Math.min(W, H) / 2 / (6700 / zoom); const cx = W / 2, cy = H / 2;
  const P = (a, b) => [cx + a * scale, cy + b * scale];
  // sabuk asteroid
  x.strokeStyle = 'rgba(138,127,116,.18)'; x.lineWidth = (d.belt[1] - d.belt[0]) * scale; x.beginPath(); x.arc(cx, cy, (d.belt[0] + d.belt[1]) / 2 * scale, 0, 7); x.stroke();
  // batas navigasi
  x.setLineDash([4, 6]); x.lineWidth = 1; x.strokeStyle = 'rgba(239,197,142,.35)'; x.beginPath(); x.arc(cx, cy, d.rmax * .8 * scale, 0, 7); x.stroke(); x.setLineDash([]);
  for (const o of d.orbits) { x.strokeStyle = o.id === d.target ? 'rgba(239,197,142,.55)' : 'rgba(168,237,235,.18)'; x.beginPath(); o.pts.forEach(([a, b], i) => { const [px, py] = P(a, b); i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.closePath(); x.stroke(); }
  hits = [];
  for (const b of d.bodies) {
    if (b.isMoon) continue;
    const [px, py] = P(b.x, b.z); const r = b.isSun ? 9 : Math.max(3.5, Math.min(9, b.r * scale * 1.6 + 3));
    x.fillStyle = b.isSun ? '#ffc861' : b.color; x.shadowColor = b.isSun ? '#ffb060' : 'transparent'; x.shadowBlur = b.isSun ? 18 : 0;
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.shadowBlur = 0;
    if (b.id === d.target) { x.strokeStyle = '#efc58e'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, r + 6, 0, 7); x.stroke(); }
    if (hover.value === b.id) { x.strokeStyle = '#a8edeb'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, r + 4, 0, 7); x.stroke(); }
    x.fillStyle = b.id === d.target ? '#efc58e' : 'rgba(223,246,255,.85)'; x.font = '600 11px "Chakra Petch", sans-serif'; x.textAlign = 'left';
    x.fillText(b.name.toUpperCase(), px + r + 6, py + 4);
    hits.push({ id: b.id, x: px, y: py, r: r + 8 });
  }
  // pesawat
  const [sx, sy] = P(d.ship.x, d.ship.z); const h = d.ship.heading;
  x.save(); x.translate(sx, sy); x.rotate(h); x.fillStyle = '#a8edeb'; x.shadowColor = '#a8edeb'; x.shadowBlur = 10;
  x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 7); x.lineTo(0, 3.5); x.lineTo(-6, 7); x.closePath(); x.fill(); x.restore();
  x.fillStyle = '#a8edeb'; x.font = '600 10px "JetBrains Mono", monospace'; x.fillText('ANDA', sx + 10, sy - 8);
}
function pickAt(e) {
  const r = cv.value.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  const h = hits.find((t) => Math.hypot(t.x - mx, t.y - my) < t.r);
  return h ? h.id : null;
}
function onMove(e) { hover.value = pickAt(e); }
function onClick(e) { const id = pickAt(e); if (id) choose(id); }
function choose(id) { game()?.setTarget(id); game()?.setMode('jelajah'); }
function onWheel(e) { e.preventDefault(); zoom = Math.min(6, Math.max(.8, zoom * (e.deltaY > 0 ? 1 / 1.15 : 1.15))); }
onMounted(draw); onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>
<template>
  <div>
    <div class="overlay-dim" />
    <section class="map panel">
      <div class="mh">
        <div><div class="kicker acc">Peta tata surya · tampak atas</div><h2>Pilih tujuan navigasi</h2></div>
        <button class="btn sm" @click="game()?.setMode('jelajah')"><UiIcon name="tutup" :size="14" />Tutup</button>
      </div>
      <div ref="wrap" class="mc"><canvas ref="cv" @mousemove="onMove" @click="onClick" @wheel="onWheel" /></div>
      <div class="mf">
        <button v-for="p in PLANETS" :key="p.id" class="chip soft" :class="{ on: store.hud.target.id === p.id }" @click="choose(p.id)"><span class="dot" :style="{ background: p.color }" />{{ p.name }}</button>
      </div>
      <p class="note">Jarak antarplanet dipadatkan agar bisa dijelajahi · garis putus emas = batas peringatan navigasi · roda mouse untuk zoom</p>
    </section>
  </div>
</template>
<style scoped>
.map{position:fixed;left:50%;top:calc(var(--header-h) + 14px);transform:translateX(-50%);bottom:calc(112px + var(--safe-b));width:min(1100px,calc(100vw - 32px));z-index:22;display:flex;flex-direction:column;padding:18px 20px;gap:12px}
.mh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
h2{font-size:22px;font-weight:600}
.mc{flex:1;min-height:0;border-radius:10px;background:rgba(2,4,10,.5);border:1px solid var(--divider);overflow:hidden}
canvas{display:block;cursor:pointer}
.mf{display:flex;gap:6px;flex-wrap:wrap}
.note{font-size:11px;color:var(--faint)}
@media (max-width:760px){ .map{bottom:calc(72px + var(--safe-b));padding:12px} h2{font-size:17px} }
</style>

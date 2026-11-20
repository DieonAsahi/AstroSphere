<script setup>
// Ringkasan orbit kecil (PRD §7.1): Matahari, lintasan, posisi planet saat ini, dan arah gerak.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { game, store } from '~/composables/useGame.js';
const props = defineProps({ body: { type: String, required: true } });
const cv = ref(null);
let raf = 0, prev = null;
function draw() {
  raf = requestAnimationFrame(draw);
  const g = game(); const c = cv.value; if (!g || !c) return;
  const d = g.orbitSummary(props.body); if (!d) return;
  const W = 206, H = 120, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  let m = 1; for (const [a, b] of d.pts) m = Math.max(m, Math.abs(a), Math.abs(b));
  const s = Math.min(W, H) / 2 / m * .92, cx = W / 2, cy = H / 2;
  x.setLineDash([3, 4]); x.strokeStyle = 'rgba(168,237,235,.5)'; x.lineWidth = 1; x.beginPath();
  d.pts.forEach(([a, b], i) => (i ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s))); x.closePath(); x.stroke(); x.setLineDash([]);
  const g2 = x.createRadialGradient(cx, cy, 0, cx, cy, 9); g2.addColorStop(0, '#fff3d0'); g2.addColorStop(.6, '#f5b860'); g2.addColorStop(1, 'rgba(245,184,96,0)');
  x.fillStyle = g2; x.beginPath(); x.arc(cx, cy, 9, 0, 7); x.fill();
  const px = cx + d.pos[0] * s, py = cy + d.pos[1] * s;
  if (prev) { const dx = px - prev[0], dy = py - prev[1], l = Math.hypot(dx, dy); if (l > 0.01) { x.strokeStyle = '#efc58e'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + dx / l * 16, py + dy / l * 16); x.stroke(); } }
  if (!prev || Math.hypot(px - prev[0], py - prev[1]) > .4) prev = [px, py];
  x.fillStyle = '#a8edeb'; x.shadowColor = '#a8edeb'; x.shadowBlur = 10; x.beginPath(); x.arc(px, py, 4.5, 0, 7); x.fill(); x.shadowBlur = 0;
}
watch(() => props.body, () => { prev = null; });
onMounted(draw); onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>
<template>
  <div class="panel inset">
    <div class="kicker">Ringkasan orbit · revolusi</div>
    <canvas ref="cv" aria-label="Diagram posisi planet pada orbitnya" />
    <p>Matahari di fokus elips · jarak dipadatkan · {{ store.obs.date }}</p>
  </div>
</template>
<style scoped>
.inset{padding:14px 16px;width:240px;display:flex;flex-direction:column;gap:8px}
canvas{display:block}
p{font-size:10.5px;color:var(--faint);line-height:1.4}
</style>

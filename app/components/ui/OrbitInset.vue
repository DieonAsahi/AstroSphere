<script setup>
// Orbit mini: Matahari, lintasan, posisi planet saat ini dan arah geraknya.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { game } from '~/composables/useGame.js';
const props = defineProps({ body: { type: String, required: true }, w: { type: Number, default: 88 }, h: { type: Number, default: 60 } });
const cv = ref(null);
let raf = 0, prev = null, skip = 0;
function draw() {
  raf = requestAnimationFrame(draw);
  if (++skip % 2) return; // 30 fps cukup
  const g = game(); const c = cv.value; if (!g || !c) return;
  const d = g.orbitSummary(props.body); if (!d) return;
  const W = props.w, H = props.h, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== W * dpr) { c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; }
  const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  let m = 1; for (const [a, b] of d.pts) m = Math.max(m, Math.abs(a), Math.abs(b));
  const s = Math.min(W, H) / 2 / m * .9, cx = W / 2, cy = H / 2;
  x.setLineDash([3, 3]); x.strokeStyle = 'rgba(170,180,222,.45)'; x.lineWidth = 1.2; x.beginPath();
  d.pts.forEach(([a, b], i) => (i ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s))); x.closePath(); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#ffc947'; x.beginPath(); x.arc(cx, cy, 4.5, 0, 7); x.fill();
  const px = cx + d.pos[0] * s, py = cy + d.pos[1] * s;
  x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill();
  x.strokeStyle = '#3b6cf0'; x.lineWidth = 2; x.beginPath(); x.arc(px, py, 6.5, 0, 7); x.stroke();
  if (!prev || Math.hypot(px - prev[0], py - prev[1]) > .4) prev = [px, py];
}
watch(() => props.body, () => { prev = null; });
onMounted(draw); onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>
<template>
  <canvas ref="cv" class="oi" role="img" aria-label="Posisi planet pada orbitnya mengelilingi Matahari" />
</template>
<style scoped>
.oi{display:block;flex:none;border-radius:12px;background:rgba(6,10,26,.6)}
</style>

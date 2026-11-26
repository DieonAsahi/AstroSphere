<script setup>
// Orbit mini: Matahari/Planet Induk, lintasan, posisi planet/bulan saat ini dan arah geraknya.
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { game, store } from '~/composables/useGame.js';
import { MOONS, PLANETS } from '~/data/solarSystem.js';

const props = defineProps({
  body: { type: String, required: true },
  w: { type: Number, default: 88 },
  h: { type: Number, default: 60 },
});

const cv = ref(null);
let raf = 0, prev = null, skip = 0;

function draw() {
  raf = requestAnimationFrame(draw);
  if (++skip % 2) return; // 30 fps cukup

  const c = cv.value;
  if (!c) return;

  const W = props.w;
  const H = props.h;
  const dpr = Math.min(devicePixelRatio || 1, 2);

  // Selalu set ukuran kanvas di awal agar tidak pernah membengkak ke ukuran default browser (300x150)
  if (c.width !== W * dpr || c.height !== H * dpr) {
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = W + 'px';
    c.style.height = H + 'px';
  }

  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;

  // 1. Cek apakah target adalah salah satu dari 6 Bulan (MOONS)
  const moon = MOONS.find((m) => m.id === props.body);
  if (moon) {
    const parentPlanet = PLANETS.find((p) => p.id === moon.parent);
    const parentColor = parentPlanet?.color || (moon.parent === 'bumi' ? '#3a86d8' : moon.parent === 'jupiter' ? '#d9a066' : moon.parent === 'saturnus' ? '#e8d29a' : '#ffc947');

    // Lintasan orbit elips putus-putus mengelilingi planet induk
    const rx = Math.min(W, H) * 0.38;
    const ry = Math.min(W, H) * 0.28;

    x.setLineDash([3, 3]);
    x.strokeStyle = 'rgba(170, 180, 222, 0.45)';
    x.lineWidth = 1.2;
    x.beginPath();
    x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    x.stroke();
    x.setLineDash([]);

    // Planet Induk di pusat dengan warna khasnya
    x.fillStyle = parentColor;
    x.beginPath();
    x.arc(cx, cy, 4.5, 0, Math.PI * 2);
    x.fill();

    // Cincin mini jika planet induknya Saturnus
    if (moon.parent === 'saturnus') {
      x.strokeStyle = 'rgba(232, 210, 154, 0.7)';
      x.lineWidth = 1.5;
      x.beginPath();
      x.ellipse(cx, cy, 7.5, 2.8, -0.35, 0, Math.PI * 2);
      x.stroke();
    }

    // Titik Bulan yang bergerak mengelilingi planet induk sesuai waktu simulasi
    const tDays = store.obs?.day || 0;
    const a = (moon.angle || 0) + (Math.PI * 2 * tDays) / (moon.orbitDays || 27.32);
    const px = cx + rx * Math.cos(a);
    const py = cy + ry * Math.sin(a);

    x.fillStyle = '#ffffff';
    x.beginPath();
    x.arc(px, py, 3.5, 0, Math.PI * 2);
    x.fill();

    x.strokeStyle = '#3b6cf0';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(px, py, 5.5, 0, Math.PI * 2);
    x.stroke();

    if (!prev || Math.hypot(px - prev[0], py - prev[1]) > 0.4) prev = [px, py];
    return;
  }

  // 2. Jika target adalah Planet (mengelilingi Matahari)
  const g = game();
  if (!g) return;
  const d = g.orbitSummary(props.body);
  if (!d) return;

  let m = 1;
  for (const [a, b] of d.pts) m = Math.max(m, Math.abs(a), Math.abs(b));
  const s = ((Math.min(W, H) / 2) / m) * 0.9;

  x.setLineDash([3, 3]);
  x.strokeStyle = 'rgba(170, 180, 222, 0.45)';
  x.lineWidth = 1.2;
  x.beginPath();
  d.pts.forEach(([a, b], i) => (i ? x.lineTo(cx + a * s, cy + b * s) : x.moveTo(cx + a * s, cy + b * s)));
  x.closePath();
  x.stroke();
  x.setLineDash([]);

  // Matahari di pusat
  x.fillStyle = '#ffc947';
  x.beginPath();
  x.arc(cx, cy, 4.5, 0, Math.PI * 2);
  x.fill();

  // Posisi planet saat ini
  const px = cx + d.pos[0] * s;
  const py = cy + d.pos[1] * s;
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(px, py, 4, 0, Math.PI * 2);
  x.fill();

  x.strokeStyle = '#3b6cf0';
  x.lineWidth = 2;
  x.beginPath();
  x.arc(px, py, 6.5, 0, Math.PI * 2);
  x.stroke();

  if (!prev || Math.hypot(px - prev[0], py - prev[1]) > 0.4) prev = [px, py];
}

watch(() => props.body, () => { prev = null; });
onMounted(draw);
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <canvas
    ref="cv"
    class="oi"
    role="img"
    :aria-label="MOONS.some((m) => m.id === body) ? 'Posisi bulan pada orbitnya mengelilingi planet induk' : 'Posisi planet pada orbitnya mengelilingi Matahari'"
  />
</template>

<style scoped>
.oi{
  display:block;
  flex:none;
  width:88px;
  height:60px;
  border-radius:12px;
  background:rgba(6,10,26,.6);
}
</style>

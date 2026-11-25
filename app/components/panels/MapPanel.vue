<script setup>
// Peta tata surya (tampak atas, skematis). Jarak digambar dengan skala akar agar planet dalam tidak bertumpuk.
// Desktop: daftar planet | peta | detail. Ponsel: peta penuh + lembar bawah. "Terbang ke sini" = terbang otomatis.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, game, isFound } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { PLANETS } from '~/data/solarSystem.js';
import { fmtDist, fmtEta } from '~/game/util.js';

const cv = ref(null), wrap = ref(null);
const sel = ref(store.hud.target.id && store.hud.target.id !== 'matahari' ? store.hud.target.id : 'mars');
const hover = ref(null);
const live = ref({}); // jarak & perkiraan waktu per planet (diperbarui 4×/detik)

const { getPlanet, planets: livePlanets } = useSupabaseContent();
const planetList = computed(() => (livePlanets.value?.length ? livePlanets.value : PLANETS));
const selP = computed(() => planetList.value.find((p) => p.id === sel.value) || planetList.value[0] || PLANETS[3]);
const planetDesc = computed(() => {
  const sp = getPlanet(sel.value);
  return sp?.deskripsi_materi || selP.value?.desc || '';
});

// State Kanvas: Zoom & Geser Bebas (Pan)
let raf = 0, hits = [], zoom = 1, tick = 0;
let panX = 0, panY = 0;
let isPanning = false, startX = 0, startY = 0, panStartObj = { x: 0, y: 0 };
let hasMoved = false;

function setZoom(k) {
  zoom = Math.min(3.5, Math.max(0.65, zoom * k));
}

function resetView() {
  panX = 0;
  panY = 0;
  zoom = 1;
}

function focusSelected() {
  const g = game(), d = g?.mapData();
  if (!d || !wrap.value) { resetView(); return; }
  const b = d.bodies.find((item) => item.id === sel.value);
  if (!b) { resetView(); return; }
  zoom = 1.6;
  const W = wrap.value.clientWidth, H = wrap.value.clientHeight;
  const RM = d.rmax * .8, Rpx = Math.min(W, H) * .40 * zoom;
  const f = (r) => Math.sqrt(Math.max(0, r) / RM) * Rpx;
  const r = Math.hypot(b.x, b.z), k = r > 1e-6 ? f(r) / r : 0;
  panX = -b.x * k;
  panY = -b.z * k;
}

function pickAt(e) {
  if (!cv.value) return null;
  const r = cv.value.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
  return hits.find((t) => Math.hypot(t.x - mx, t.y - my) < t.r)?.id || null;
}

function onPointerDown(e) {
  isPanning = true;
  hasMoved = false;
  startX = e.clientX;
  startY = e.clientY;
  panStartObj = { x: panX, y: panY };
  if (e.currentTarget.setPointerCapture) {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
}

function onPointerMove(e) {
  if (isPanning) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > 4) {
      hasMoved = true;
      panX = panStartObj.x + dx;
      panY = panStartObj.y + dy;
    }
  } else {
    hover.value = pickAt(e);
  }
}

function onPointerUp(e) {
  if (!isPanning) return;
  isPanning = false;
  if (!hasMoved) {
    const id = pickAt(e);
    if (id) {
      sel.value = id;
      game()?.click();
    }
  }
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? (1 / 1.15) : 1.15;
  setZoom(factor);
}

function fly() { game()?.flyTo(sel.value); }

function draw() {
  raf = requestAnimationFrame(draw);
  const g = game(), c = cv.value, w = wrap.value; if (!g || !c || !w) return;
  const d = g.mapData(); if (!d) return;
  if (++tick % 4 === 1) live.value = Object.fromEntries(d.bodies.map((b) => [b.id, { d: b.d, eta: b.d / (d.cruise * .8) }]));
  const W = w.clientWidth, H = w.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    c.style.width = W + 'px'; c.style.height = H + 'px';
  }
  const x = c.getContext('2d');
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, W, H);

  // Radius maksimal diatur dengan margin aman agar planet luar (Neptunus, Saturnus) tidak terpotong
  const RM = d.rmax * .8, Rpx = Math.min(W, H) * .40 * zoom;
  const cx = W / 2 + panX, cy = H / 2 + panY;
  const f = (r) => Math.sqrt(Math.max(0, r) / RM) * Rpx;
  const P = (a, b) => {
    const r = Math.hypot(a, b), k = r > 1e-6 ? f(r) / r : 0;
    return [cx + a * k, cy + b * k];
  };

  // Sabuk Asteroid & Batas
  x.fillStyle = 'rgba(170,180,222,.08)';
  x.beginPath();
  x.arc(cx, cy, f(d.belt[1]), 0, 7);
  x.arc(cx, cy, f(d.belt[0]), 0, 7, true);
  x.fill();

  x.setLineDash([5, 7]);
  x.strokeStyle = 'rgba(255,107,107,.35)';
  x.lineWidth = 1.2;
  x.beginPath();
  x.arc(cx, cy, f(d.rmax * .8), 0, 7);
  x.stroke();
  x.setLineDash([]);

  // Garis orbit
  for (const o of d.orbits) {
    const on = o.id === sel.value || o.id === d.target;
    x.strokeStyle = on ? 'rgba(143,176,255,.75)' : 'rgba(170,180,222,.2)';
    x.lineWidth = on ? 1.8 : 1;
    x.beginPath();
    o.pts.forEach(([a, b], i) => {
      const [px, py] = P(a, b);
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.closePath();
    x.stroke();
  }

  // Matahari
  const sg = x.createRadialGradient(cx, cy, 0, cx, cy, 26);
  sg.addColorStop(0, '#fff4cf');
  sg.addColorStop(.35, '#ffc947');
  sg.addColorStop(1, 'rgba(255,160,40,0)');
  x.fillStyle = sg;
  x.beginPath();
  x.arc(cx, cy, 26, 0, 7);
  x.fill();

  // Planet & Label
  hits = [];
  const boxes = [];
  const pls = d.bodies.filter((b) => !b.isMoon && !b.isSun);
  pls.sort((a, b) => (a.id === sel.value ? -1 : b.id === sel.value ? 1 : 0));

  for (const b of pls) {
    const [px, py] = P(b.x, b.z);
    const r = Math.max(5, Math.min(11, 4 + Math.sqrt(b.r) * .55));

    if (b.id === sel.value) {
      x.strokeStyle = '#ffffff';
      x.lineWidth = 2.5;
      x.beginPath();
      x.arc(px, py, r + 6, 0, 7);
      x.stroke();
    } else if (b.id === hover.value) {
      x.strokeStyle = 'rgba(255,255,255,.6)';
      x.lineWidth = 2;
      x.beginPath();
      x.arc(px, py, r + 5, 0, 7);
      x.stroke();
    }

    if (b.id === d.target) {
      x.strokeStyle = '#ffc947';
      x.lineWidth = 2;
      x.setLineDash([3, 3]);
      x.beginPath();
      x.arc(px, py, r + 10, 0, 7);
      x.stroke();
      x.setLineDash([]);
    }

    x.fillStyle = b.color;
    x.beginPath();
    x.arc(px, py, r, 0, 7);
    x.fill();

    hits.push({ id: b.id, x: px, y: py, r: r + 12 });

    // Label cerdas yang otomatis balik ke kiri bila mepet tepi kanan
    x.font = '500 12.5px Poppins, sans-serif';
    const tw = x.measureText(b.name).width;
    let bx = px + r + 8;
    if (bx + tw + 12 > W) {
      bx = px - r - tw - 8;
    }
    const by = py - 9;
    const box = [bx - 4, by - 2, tw + 8, 22];
    const clash = boxes.some((q) => !(box[0] > q[0] + q[2] || box[0] + box[2] < q[0] || box[1] > q[1] + q[3] || box[1] + box[3] < q[1]));

    if (!clash || b.id === sel.value) {
      boxes.push(box);
      x.fillStyle = b.id === sel.value ? '#ffffff' : 'rgba(6,10,26,.85)';
      x.beginPath();
      x.roundRect(box[0], box[1], box[2], box[3], 6);
      x.fill();
      x.fillStyle = b.id === sel.value ? '#060a1a' : '#f1f4ff';
      x.textBaseline = 'middle';
      x.fillText(b.name, bx, by + 9);
    }
  }

  // Pesawat
  const [sx, sy] = P(d.ship.x, d.ship.z);
  x.save();
  x.translate(sx, sy);
  x.rotate(d.ship.heading);
  x.fillStyle = '#ffc947';
  x.beginPath();
  x.moveTo(0, -11);
  x.lineTo(7, 8);
  x.lineTo(0, 4);
  x.lineTo(-7, 8);
  x.closePath();
  x.fill();
  x.restore();

  x.font = '600 12px Poppins, sans-serif';
  x.fillStyle = '#ffc947';
  x.textBaseline = 'middle';
  x.fillText('Kamu', sx + 12, sy - 12);
}

onMounted(draw);
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
  <div class="map">
    <header class="mh">
      <div class="mh-title-box">
        <span class="mh-badge">NAVIGASI SISTEM</span>
        <h2 class="mh-title">Peta Tata Surya</h2>
      </div>
      <button class="btn-close-map" @click="game()?.back()">
        <UiIcon name="tutup" :size="16" />
        <span>Tutup</span>
      </button>
    </header>

    <nav class="list" aria-label="Daftar planet">
      <button v-for="p in planetList" :key="p.id" class="li" :class="{ on: p.id === sel }" @click="sel = p.id">
        <span class="planet-dot" :style="{ '--c': p.color, '--s': '28px' }" />
        <span class="n"><b>{{ p.name }}</b><small>{{ live[p.id] ? fmtDist(live[p.id].d) : '' }}</small></span>
        <UiIcon v-if="store.hud.target.id === p.id" name="target" :size="16" class="tg" />
      </button>
    </nav>

    <div ref="wrap" class="mc">
      <canvas
        ref="cv"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @mouseleave="hover = null"
        @wheel="onWheel"
      />
      <div class="zoom">
        <button class="zoom-btn" title="Perbesar (+)" aria-label="Perbesar" @click="setZoom(1.25)"><UiIcon name="plus" :size="18" /></button>
        <button class="zoom-btn" title="Perkecil (−)" aria-label="Perkecil" @click="setZoom(1 / 1.25)"><UiIcon name="minus" :size="18" /></button>
        <button class="zoom-btn" title="Pusatkan ke planet terpilih" aria-label="Pusatkan ke planet terpilih" @click="focusSelected"><UiIcon name="target" :size="18" /></button>
        <button class="zoom-btn" title="Reset posisi tengah (Matahari)" aria-label="Reset posisi tengah" @click="resetView"><UiIcon name="ulang" :size="18" /></button>
      </div>
      <p class="legend"><i class="you" />Kamu <i class="lim" />Batas jelajah · seret untuk geser</p>
    </div>

    <aside class="det card flat">
      <div class="hscroll chips">
        <button v-for="p in planetList" :key="p.id" class="chip" :class="{ on: p.id === sel }" @click="sel = p.id">
          <span class="dot" :style="{ background: p.color }" />{{ p.name }}
        </button>
      </div>
      <div class="dtop">
        <span class="planet-dot" :style="{ '--c': selP.color, '--s': '56px' }" />
        <div class="dtop-info">
          <h3 class="dtop-name">{{ selP.name }}</h3>
          <p class="dtop-kind">{{ selP.kind }}</p>
        </div>
      </div>
      <div class="stats">
        <div class="tile"><small>Jarak</small><b class="num">{{ live[sel] ? fmtDist(live[sel].d) : '—' }}</b></div>
        <div class="tile"><small>Waktu tempuh</small><b class="num">{{ live[sel] ? fmtEta(live[sel].eta) : '—' }}</b></div>
      </div>
      <div class="acts">
        <button class="btn primary map-fly-btn" @click="fly">
          <UiIcon name="target" :size="18" />Terbang ke sini
        </button>
        <div v-if="isFound(sel)" class="planet-desc-box">
          <span class="desc-tag">RINGKASAN ENSIKLOPEDIA</span>
          <p class="desc-text">{{ planetDesc }}</p>
        </div>
        <p v-else class="lock">
          <UiIcon name="kunci" :size="16" />Belum ditemukan — terbang ke sana untuk membuka halaman, kuis, dan kartunya.
        </p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.map{
  position:fixed;
  inset:0;
  z-index:22;
  background:radial-gradient(ellipse at 50% 50%,#0e1640 0%,#060a1a 70%);
  display:grid;
  grid-template-columns:240px 1fr 320px;
  grid-template-rows:auto 1fr;
  padding:24px 32px;
  gap:24px;
  box-sizing:border-box;
}
.mh{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding-bottom:2px}
.mh-title-box{display:flex;flex-direction:column;gap:2px}
.mh-badge{font-size:11px;font-weight:600;letter-spacing:.08em;color:#38bdf8;text-transform:uppercase}
.mh-title{font-size:22px;font-weight:600;color:var(--text);margin:0;line-height:1.2}
.btn-close-map{display:inline-flex;align-items:center;gap:8px;border-radius:10px;height:40px;padding:0 16px;background:rgba(11,16,36,.85);border:1px solid rgba(148,174,255,.2);color:#e2e8f0;font-size:13.5px;font-weight:500;cursor:pointer;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);transition:all .15s}
.btn-close-map:hover{background:rgba(255,255,255,.1);border-color:rgba(148,174,255,.35);color:#fff}
.btn-close-map:active{transform:scale(.98)}

.list{display:flex;flex-direction:column;gap:6px;overflow-y:auto;padding-right:4px}
.list::-webkit-scrollbar{width:4px}
.list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:999px}
.li{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;text-align:left;background:rgba(11,16,36,.5);border:1px solid rgba(148,174,255,.08);transition:all .15s;cursor:pointer}
.li:hover{background:rgba(255,255,255,.07);border-color:rgba(148,174,255,.2)}
.li.on{background:rgba(59,130,246,.18);border-color:rgba(148,174,255,.35)}
.li .n{flex:1;display:flex;flex-direction:column;line-height:1.25}
.li b{font-family:var(--display);font-weight:500;font-size:15px;color:var(--text)}
.li small{font-size:12px;color:var(--faint);margin-top:2px}
.tg{color:var(--star)}

.mc{position:relative;min-height:0;border-radius:14px;overflow:hidden;background:rgba(6,10,26,.6);border:1px solid rgba(148,174,255,.14);touch-action:none}
canvas{display:block;cursor:grab;width:100%;height:100%}
canvas:active{cursor:grabbing}
.zoom{position:absolute;right:14px;top:14px;display:flex;flex-direction:column;gap:8px;z-index:5}
.zoom-btn{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;background:rgba(11,16,36,.88);border:1px solid rgba(148,174,255,.2);color:#e2e8f0;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:all .15s}
.zoom-btn:hover{background:rgba(59,130,246,.25);border-color:rgba(148,174,255,.4);color:#fff}
.zoom-btn:active{transform:scale(.95)}
.legend{position:absolute;left:14px;bottom:12px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--faint);background:rgba(6,10,26,.75);padding:4px 10px;border-radius:6px;border:1px solid rgba(148,174,255,.1);pointer-events:none}
.legend i{display:inline-block;width:9px;height:9px;border-radius:50%}
.legend .you{background:var(--star)}
.legend .lim{border:1.5px dashed var(--coral);margin-left:6px}

.det{
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:16px;
  border-radius:14px;
  background:rgba(11,16,36,.88);
  border:1px solid rgba(148,174,255,.16);
  backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  box-shadow:0 12px 32px rgba(0,0,0,.5);
  box-sizing:border-box;
}
.det .chips{display:none}
.dtop{display:flex;align-items:center;gap:14px}
.dtop-info{display:flex;flex-direction:column;gap:2px}
.dtop-name{font-size:18px;font-weight:600;color:var(--text);margin:0}
.dtop-kind{font-size:12.5px;color:var(--muted);margin:0}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tile{padding:10px 12px;border-radius:8px;background:rgba(148,174,255,.06);border:1px solid rgba(148,174,255,.1)}
.tile small{display:block;font-size:11.5px;color:var(--faint);margin-bottom:2px}
.tile b{font-size:16px;font-weight:500;color:var(--text)}
.acts{display:flex;flex-direction:column;gap:12px}
.map-fly-btn{border-radius:10px;height:44px;min-height:44px;font-weight:500;font-size:14.5px;box-shadow:none;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);border:1px solid rgba(255,255,255,.2);color:#fff;cursor:pointer;transition:all .15s}
.map-fly-btn:hover{filter:brightness(1.1)}
.map-fly-btn:active{transform:scale(.98)}

.planet-desc-box{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border-radius:10px;background:rgba(148,174,255,.06);border:1px solid rgba(148,174,255,.14);max-height:160px;overflow-y:auto}
.planet-desc-box::-webkit-scrollbar{width:4px}
.planet-desc-box::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:999px}
.desc-tag{font-size:10px;font-weight:600;letter-spacing:.08em;color:#60a5fa;text-transform:uppercase}
.desc-text{font-size:12.5px;line-height:1.55;color:rgba(226,234,255,.9);margin:0}
.lock{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:var(--faint);line-height:1.5;padding:8px 10px;border-radius:8px;background:rgba(255,201,71,.06);border:1px solid rgba(255,201,71,.15)}
.lock :deep(svg){flex:none;margin-top:2px;color:var(--star)}

@media (max-width:1000px){
  .map{grid-template-columns:1fr 300px;padding:20px 24px;gap:16px}
  .list{display:none}
  .mc{grid-column:1}
}
@media (max-width:760px){
  .map{grid-template-columns:1fr;grid-template-rows:auto 1fr auto;padding:16px;gap:12px}
  .mh-title{font-size:18px}
  .det{padding:16px;gap:12px}
  .det .chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px}
  .det .chips::-webkit-scrollbar{height:3px}
  .chip{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;font-size:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--muted);white-space:nowrap;cursor:pointer}
  .chip.on{background:rgba(59,130,246,.25);border-color:rgba(148,174,255,.4);color:#fff}
  .chip .dot{width:8px;height:8px;border-radius:50%}
  .dtop .planet-dot{--s:42px !important}
  .planet-desc-box{max-height:120px}
}
</style>

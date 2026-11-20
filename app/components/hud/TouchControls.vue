<script setup>
// Kontrol sentuh (diporting dari Jelajah Antariksa): joystick kiri, tuas dorongan kanan, tombol aksi.
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import { game } from '~/composables/useGame.js';
const base = reactive({ on: false, x: 0, y: 0, kx: 0, ky: 0 });
const hintOn = ref(true);
let jid = null, bx = 0, by = 0; const R = 56;
function jDown(e) { if (jid !== null) return; jid = e.pointerId; e.currentTarget.setPointerCapture(jid); bx = e.clientX; by = e.clientY; Object.assign(base, { on: true, x: bx, y: by, kx: 0, ky: 0 }); hintOn.value = false; }
function jMove(e) {
  if (e.pointerId !== jid) return;
  let dx = (e.clientX - bx) / R, dy = (e.clientY - by) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
  const j = game()?.touch.joy; if (j) { j.x = dx; j.y = dy; } base.kx = dx * R; base.ky = dy * R;
}
function jUp(e) { if (e.pointerId !== jid) return; jid = null; const j = game()?.touch.joy; if (j) { j.x = j.y = 0; } base.on = false; }
const held = reactive({});
function hDown(k, e) { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); held[k] = true; const h = game()?.touch.hold; if (h) h[k] = true; }
function hUp(k) { held[k] = false; const h = game()?.touch.hold; if (h) h[k] = false; }
const track = ref(null); const knob = ref(23.08); let tid = null;
function setThr(e) { const r = track.value.getBoundingClientRect(); const t = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height)); let v = -.3 + t * 1.3; if (Math.abs(v) < .04) v = 0; game()?.setThrottle(v); }
function tDown(e) { tid = e.pointerId; track.value.setPointerCapture(tid); setThr(e); }
function tMove(e) { if (e.pointerId === tid) setThr(e); }
function tUp(e) { if (e.pointerId === tid) tid = null; }
let raf = 0;
function tick() { raf = requestAnimationFrame(tick); const g = game(); if (g) knob.value = (g.throttle + .3) / 1.3 * 100; }
onMounted(tick); onBeforeUnmount(() => { cancelAnimationFrame(raf); const g = game(); if (g) { g.touch.joy.x = g.touch.joy.y = 0; for (const k in g.touch.hold) g.touch.hold[k] = false; } });
const z = .3 / 1.3 * 100;
const btns = [['rollL', 'guling-l', 'Guling'], ['up', 'naik', 'Naik'], ['rollR', 'guling-r', 'Guling'], ['target', 'target', 'Target'], ['down', 'turun', 'Turun'], ['align', 'arahkan', 'Arahkan']];
</script>
<template>
  <div class="tc">
    <div class="joyzone" @pointerdown="jDown" @pointermove="jMove" @pointerup="jUp" @pointercancel="jUp">
      <div class="jbase" :class="{ on: base.on }" :style="{ left: base.x + 'px', top: base.y + 'px' }"><div class="jknob" :style="{ transform: `translate(${base.kx}px,${base.ky}px)` }" /></div>
    </div>
    <div v-if="hintOn" class="jhint">Geser di sini untuk mengemudi</div>
    <div class="tbtns">
      <template v-for="[k, ic, lb] in btns" :key="k + ic">
        <button v-if="k === 'target'" class="tb" @pointerdown.prevent="game()?.cycleTarget(1)"><UiIcon :name="ic" :size="18" /><small>{{ lb }}</small></button>
        <button v-else class="tb" :class="{ on: held[k] }" @pointerdown="hDown(k, $event)" @pointerup="hUp(k)" @pointercancel="hUp(k)"><UiIcon :name="ic" :size="18" /><small>{{ lb }}</small></button>
      </template>
      <button class="tb boost" :class="{ on: held.boost }" @pointerdown="hDown('boost', $event)" @pointerup="hUp('boost')" @pointercancel="hUp('boost')">BOOST</button>
    </div>
    <div class="thr">
      <div ref="track" class="track panel" @pointerdown="tDown" @pointermove="tMove" @pointerup="tUp" @pointercancel="tUp">
        <div class="fill" :style="{ bottom: Math.min(knob, z) + '%', height: Math.abs(knob - z) + '%' }" />
        <div class="zero" :style="{ bottom: z + '%' }" /><div class="knob" :style="{ bottom: knob + '%' }" />
      </div>
      <span>DORONG</span>
    </div>
  </div>
</template>
<style scoped>
.tc{position:fixed;inset:0;z-index:12;pointer-events:none}
.joyzone{position:absolute;left:0;bottom:84px;width:44%;height:52%;pointer-events:auto;touch-action:none}
.jbase{position:fixed;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;border:1px solid rgba(var(--acc-rgb),.35);background:rgba(6,14,23,.3);opacity:0;transition:opacity .15s}
.jbase.on{opacity:1}
.jknob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:var(--soft);border:1px solid var(--acc)}
.jhint{position:absolute;left:18px;bottom:calc(150px + var(--safe-b));font-size:10px;letter-spacing:.16em;color:var(--faint);text-transform:uppercase}
.tbtns{position:absolute;right:calc(70px + var(--safe-r));bottom:calc(84px + var(--safe-b));display:grid;grid-template-columns:repeat(3,52px);gap:6px;pointer-events:auto}
.tb{height:48px;border-radius:12px;border:1px solid var(--line);background:var(--panel);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;touch-action:none;color:var(--txt)}
.tb small{font-size:8.5px;letter-spacing:.08em;color:var(--dim);text-transform:uppercase}
.tb.on{background:var(--soft);border-color:var(--acc)}
.tb.boost{grid-column:span 3;height:40px;font-size:12px;letter-spacing:.24em;font-weight:700}
.thr{position:absolute;right:calc(12px + var(--safe-r));bottom:calc(84px + var(--safe-b));display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:auto}
.track{position:relative;width:48px;height:150px;border-radius:12px;overflow:hidden;touch-action:none}
.fill{position:absolute;left:0;right:0;background:var(--soft)}
.zero{position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,.55)}
.knob{position:absolute;left:4px;right:4px;height:8px;margin-bottom:-4px;border-radius:4px;background:var(--acc);box-shadow:0 0 10px var(--acc)}
.thr span{font-size:9px;letter-spacing:.16em;color:var(--dim)}
@media (orientation:landscape) and (max-height:520px){
  .tbtns{grid-template-columns:repeat(3,44px)} .tb{height:40px} .tb.boost{height:34px} .track{height:120px}
}
</style>

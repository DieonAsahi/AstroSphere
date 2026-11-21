<script setup>
// Kontrol layar sentuh: joystick analog yang muncul & mengikuti jari di sisi kiri (arah), tombol Gas/Turbo/Rem di kanan.
import { reactive, onBeforeUnmount } from 'vue';
import { game } from '~/composables/useGame.js';
const R = 58; // jari-jari gerak knob (px)
const j = reactive({ on: false, x: 0, y: 0, kx: 0, ky: 0, id: null });
function jDown(e) {
  if (j.id !== null) return;
  j.id = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId);
  Object.assign(j, { on: true, x: e.clientX, y: e.clientY, kx: 0, ky: 0 });
}
function jMove(e) {
  if (e.pointerId !== j.id) return;
  let dx = e.clientX - j.x, dy = e.clientY - j.y; const l = Math.hypot(dx, dy);
  // dasar joystick ikut terseret bila jari keluar jangkauan (joystick "mengikuti" jari)
  if (l > R) { j.x += dx * (1 - R / l); j.y += dy * (1 - R / l); dx = e.clientX - j.x; dy = e.clientY - j.y; }
  j.kx = dx; j.ky = dy;
  const jo = game()?.touch.joy; if (jo) { jo.x = dx / R; jo.y = dy / R; }
}
function jUp(e) { if (e.pointerId !== j.id) return; j.id = null; j.on = false; const jo = game()?.touch.joy; if (jo) { jo.x = 0; jo.y = 0; } }
const held = reactive({});
function hDown(k, e) { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); held[k] = true; const h = game()?.touch.hold; if (h) h[k] = true; if (k !== 'brake') game()?.approachNo?.(); }
function hUp(k) { held[k] = false; const h = game()?.touch.hold; if (h) h[k] = false; }
onBeforeUnmount(() => { const g = game(); if (g) { g.touch.joy.x = g.touch.joy.y = 0; for (const k in g.touch.hold) g.touch.hold[k] = false; } });
</script>
<template>
  <div class="tc">
    <div class="zone" @pointerdown="jDown" @pointermove="jMove" @pointerup="jUp" @pointercancel="jUp">
      <div v-if="!j.on" class="idle" aria-hidden="true"><i /><span>Geser untuk mengarahkan</span></div>
      <div class="base" :class="{ on: j.on }" :style="{ transform: `translate(${j.x}px,${j.y}px)` }"><div class="knob" :style="{ transform: `translate(${j.kx}px,${j.ky}px)` }" /></div>
    </div>
    <div class="btns">
      <button class="b turbo" :class="{ on: held.boost }" aria-label="Turbo (tahan)" @pointerdown="hDown('boost', $event)" @pointerup="hUp('boost')" @pointercancel="hUp('boost')"><UiIcon name="kilat" :size="22" /><small>Turbo</small></button>
      <button class="b brake" :class="{ on: held.brake }" aria-label="Rem (tahan)" @pointerdown="hDown('brake', $event)" @pointerup="hUp('brake')" @pointercancel="hUp('brake')"><UiIcon name="rem" :size="22" /><small>Rem</small></button>
      <button class="b gas" :class="{ on: held.gas }" aria-label="Gas (tahan untuk maju)" @pointerdown="hDown('gas', $event)" @pointerup="hUp('gas')" @pointercancel="hUp('gas')"><UiIcon name="gas" :size="30" /><small>Gas</small></button>
    </div>
  </div>
</template>
<style scoped>
.tc{position:fixed;inset:0;z-index:12;pointer-events:none}
.zone{position:absolute;left:0;bottom:0;width:55%;top:34%;pointer-events:auto;touch-action:none}
.idle{position:absolute;left:calc(28px + var(--safe-l));bottom:calc(30px + var(--safe-b));display:flex;flex-direction:column;align-items:center;gap:8px;opacity:.75}
.idle i{width:104px;height:104px;border-radius:50%;border:2px dashed rgba(255,255,255,.3);background:radial-gradient(circle,rgba(59,108,240,.35) 0 20px,transparent 21px)}
.idle span{font-size:12px;color:var(--muted);text-shadow:0 1px 6px #000}
.base{position:fixed;left:-60px;top:-60px;width:120px;height:120px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:rgba(16,23,58,.45);opacity:0;transition:opacity .12s}
.base.on{opacity:1}
.knob{position:absolute;left:32px;top:32px;width:56px;height:56px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 8px rgba(59,108,240,.25)}
.btns{position:absolute;right:calc(18px + var(--safe-r));bottom:calc(22px + var(--safe-b));display:grid;grid-template-columns:auto auto;grid-template-areas:". t" "r g";gap:12px;align-items:end;pointer-events:auto}
.b{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border-radius:50%;touch-action:none;color:var(--text);font-family:var(--display);font-weight:600;
  box-shadow:inset 0 -4px 0 rgba(0,0,0,.3);transition:transform .08s}
.b small{font-size:11px}
.b.on{transform:scale(.93)}
.turbo{grid-area:t;width:64px;height:64px;background:var(--star);color:var(--on-star)}
.brake{grid-area:r;width:64px;height:64px;background:var(--surface-3);border:1px solid var(--line-2)}
.gas{grid-area:g;width:92px;height:92px;background:var(--blue)}
@media (orientation:landscape) and (max-height:520px){ .gas{width:78px;height:78px} .turbo,.brake{width:56px;height:56px} .zone{top:20%} }
</style>

<script setup>
// Adegan pembuka: keterangan lubang hitam + tombol Lewati. Klik di mana saja atau tekan tombol apa pun = lewati.
import { onMounted, onBeforeUnmount } from 'vue';
import { store, game } from '~/composables/useGame.js';
const skip = () => game()?.skipIntro();
const onKey = (e) => { if (e.key === 'Tab' || e.repeat) return; skip(); };
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="intro" :class="{ fly: store.intro === 'fly' }" @pointerdown="skip">
    <div class="cap">
      <div class="kicker acc">Jauh di luar tata surya</div>
      <h2>Lubang hitam</h2>
      <p>Gravitasinya begitu kuat sehingga cahaya pun tidak bisa lolos. Lubang hitam terdekat yang diketahui, Gaia BH1, berjarak ± 1.560 tahun cahaya — yang ini hanya pemandangan pembuka, bukan bagian tata surya kita.</p>
    </div>
    <div class="dest"><span class="dot" />Menuju tata surya…</div>
    <button class="btn sm skip" type="button" @pointerdown.stop @click.stop="skip">Lewati ›</button>
  </div>
</template>

<style scoped>
.intro{position:fixed;inset:0;z-index:30;cursor:pointer;background:radial-gradient(ellipse at 50% 120%,rgba(0,0,0,.55),transparent 55%)}
.cap{position:absolute;left:calc(40px + var(--safe-l, 0px));bottom:calc(56px + var(--safe-b, 0px));max-width:min(520px,82vw);transition:opacity .8s,transform .8s}
.cap h2{font-size:clamp(30px,4.6vw,52px);font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin:6px 0 10px;text-shadow:0 0 30px rgba(0,0,0,.9)}
.cap p{font-size:14px;line-height:1.6;color:var(--txt);opacity:.86;text-shadow:0 0 10px #000}
.dest{position:absolute;left:50%;bottom:calc(64px + var(--safe-b, 0px));transform:translateX(-50%);font-family:var(--mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--acc);opacity:0;transition:opacity .6s;display:flex;align-items:center;gap:8px}
.dest .dot{width:6px;height:6px;border-radius:50%;background:var(--acc);box-shadow:0 0 10px var(--acc);animation:blink 1s infinite}
.skip{position:absolute;right:calc(28px + var(--safe-r, 0px));bottom:calc(40px + var(--safe-b, 0px))}
.fly .cap{opacity:0;transform:translateY(12px)}
.fly .dest{opacity:1}
@keyframes blink{50%{opacity:.25}}
@media (max-width:760px){ .cap{left:18px;right:18px;bottom:calc(110px + var(--safe-b, 0px))} .cap p{font-size:13px} .dest{bottom:calc(120px + var(--safe-b, 0px))} }
@media (prefers-reduced-motion:reduce){ .cap,.dest{transition:none} .dest .dot{animation:none} }
</style>

<script setup>
// Pelindung orientasi mobile: mewajibkan posisi mendatar (lanskap) pada perangkat sentuh/ponsel.
// Perangkat desktop tetap bebas menggunakan ukuran jendela apa pun.
import { ref, onMounted, onBeforeUnmount } from 'vue';

const show = ref(false);
let mqHoverCoarse = null;
let mqOrientation = null;

function isMobileTouchDevice() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const coarseNoHover = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  const fineHoverDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const touchSmall = !fineHoverDesktop
    && ((navigator.maxTouchPoints || 0) > 0 || window.matchMedia('(any-pointer: coarse)').matches)
    && shortSide <= 600;
  return coarseNoHover || touchSmall;
}

function checkOrientation() {
  if (typeof window === 'undefined') return;
  show.value = isMobileTouchDevice() && window.innerHeight > window.innerWidth;
}

onMounted(() => {
  checkOrientation();
  window.addEventListener('resize', checkOrientation, { passive: true });
  window.addEventListener('orientationchange', checkOrientation, { passive: true });
  if (typeof window.matchMedia === 'function') {
    mqHoverCoarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    mqOrientation = window.matchMedia('(orientation: portrait)');
    mqHoverCoarse.addEventListener?.('change', checkOrientation);
    mqOrientation.addEventListener?.('change', checkOrientation);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('orientationchange', checkOrientation);
  mqHoverCoarse?.removeEventListener?.('change', checkOrientation);
  mqOrientation?.removeEventListener?.('change', checkOrientation);
});
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="orient-guard"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="orient-title"
      aria-describedby="orient-sub"
      @pointerdown.stop
      @mousedown.stop
      @touchstart.stop.prevent
      @click.stop
    >
      <div class="orient-card">
        <span class="orient-eyebrow">MODE LANSKAP DIPERLUKAN</span>

        <div class="phone-stage" aria-hidden="true">
          <div class="phone-glow" />
          <svg class="rotate-arc" width="108" height="108" viewBox="0 0 108 108" fill="none">
            <path
              d="M78 24 A 38 38 0 0 0 22 40"
              stroke="rgba(56, 189, 248, 0.55)"
              stroke-width="2"
              stroke-dasharray="4 4"
              stroke-linecap="round"
            />
            <polyline
              points="19,32 21,41 30,38"
              stroke="#38bdf8"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg class="phone-svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
            <rect
              x="19"
              y="8"
              width="26"
              height="48"
              rx="6"
              fill="#0f172a"
              stroke="#60a5fa"
              stroke-width="2.4"
            />
            <rect
              x="22.5"
              y="14"
              width="19"
              height="33"
              rx="2.5"
              fill="rgba(59, 130, 246, 0.14)"
              stroke="rgba(148, 174, 255, 0.25)"
              stroke-width="1"
            />
            <circle cx="32" cy="28" r="4.5" fill="rgba(56, 189, 248, 0.25)" stroke="#38bdf8" stroke-width="1.5" />
            <ellipse cx="32" cy="28" rx="9" ry="3.2" transform="rotate(-24 32 28)" stroke="#93c5fd" stroke-width="1.2" opacity="0.85" />
            <line x1="28.5" y1="11" x2="35.5" y2="11" stroke="rgba(148, 174, 255, 0.55)" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="32" cy="51.5" r="1.8" fill="rgba(148, 174, 255, 0.65)" />
          </svg>
        </div>

        <h2 id="orient-title" class="orient-title">Putar Ponsel Anda</h2>
        <p id="orient-sub" class="orient-sub">Gunakan posisi mendatar (lanskap) untuk menjelajahi AstroSphere.</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.orient-guard {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: calc(20px + var(--safe-t)) calc(20px + var(--safe-r)) calc(20px + var(--safe-b)) calc(20px + var(--safe-l));
  background: radial-gradient(ellipse at 50% 25%, #131c44 0%, #070b1a 58%, #040716 100%);
  pointer-events: auto;
  touch-action: none;
  font-family: var(--font, 'Poppins', system-ui, -apple-system, sans-serif);
}

.orient-card {
  width: min(360px, 100%);
  padding: 30px 24px;
  border-radius: 16px;
  background: rgba(11, 16, 33, 0.94);
  border: 1px solid rgba(148, 174, 255, 0.2);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.72), 0 0 36px rgba(59, 130, 246, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
}

.orient-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #38bdf8;
  text-transform: uppercase;
}

.phone-stage {
  position: relative;
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  margin: 6px 0;
}

.phone-glow {
  position: absolute;
  width: 82px;
  height: 82px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.28) 0%, transparent 72%);
  pointer-events: none;
}

.rotate-arc {
  position: absolute;
  inset: 2px;
  pointer-events: none;
  animation: arcFade 2.6s ease-in-out infinite;
}

.phone-svg {
  transform-origin: center;
  animation: phoneTurnLandscape 2.6s ease-in-out infinite;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.55));
}

@keyframes phoneTurnLandscape {
  0%, 16% {
    transform: rotate(0deg);
  }
  45%, 78% {
    transform: rotate(-90deg);
  }
  94%, 100% {
    transform: rotate(0deg);
  }
}

@keyframes arcFade {
  0%, 12% {
    opacity: 0.95;
  }
  48%, 78% {
    opacity: 0.3;
  }
  94%, 100% {
    opacity: 0.95;
  }
}

.orient-title {
  margin: 2px 0 0;
  font-family: var(--display, 'Poppins', system-ui, -apple-system, sans-serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  color: #f8fafc;
}

.orient-sub {
  margin: 0;
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--muted, #a6b4dc);
  max-width: 28ch;
}

@media (prefers-reduced-motion: reduce) {
  .phone-svg {
    transform: rotate(-90deg);
    animation: none;
  }
  .rotate-arc {
    animation: none;
  }
}
</style>

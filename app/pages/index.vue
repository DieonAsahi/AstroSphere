<script setup>
// Cangkang game: satu kanvas WebGL yang tetap hidup; UI berganti menurut fase & mode (PRD §4.3).
import { onMounted, onBeforeUnmount, ref, computed, watchEffect } from 'vue';
import { store, setEngine, game } from '~/composables/useGame.js';
import { createEngine } from '~/game/engine.js';

const canvas = ref(null), markers = ref(null), arrow = ref(null), poi = ref(null), labLabels = ref(null), compass = ref(null);
const crosshair = ref(null), horizon = ref(null), cursor = ref(null), cursorLine = ref(null), vignette = ref(null), boostFx = ref(null);
const playing = computed(() => store.phase === 'playing' || store.phase === 'paused');
const showDock = computed(() => playing.value && store.phase !== 'paused' && store.mode !== 'profil');
const isJelajah = computed(() => store.mode === 'jelajah');

watchEffect(() => { if (typeof document !== 'undefined') document.documentElement.style.setProperty('--hud-op', String(store.settings.hudOpacity)); });

onMounted(async () => {
  const engine = createEngine({
    canvas: canvas.value, markers: markers.value, arrow: arrow.value, poi: poi.value, labLabels: labLabels.value, compass: compass.value,
    crosshair: crosshair.value, horizon: horizon.value, cursor: cursor.value, cursorLine: cursorLine.value, vignette: vignette.value, boostFx: boostFx.value,
  });
  setEngine(engine);
  await engine.boot();
  if (import.meta.dev) window.__astro = { engine, store };
});
onBeforeUnmount(() => { game()?.dispose(); });
</script>

<template>
  <div class="shell" :class="{ touch: store.touch }">
    <canvas id="c" ref="canvas" tabindex="-1" aria-label="Ruang antariksa 3D AstroSphere" />
    <div id="vignette" ref="vignette" />
    <div id="boostFx" ref="boostFx" />

    <!-- Lapisan yang dikelola langsung oleh mesin (diperbarui tiap frame) -->
    <div class="layer hud-root" :class="{ off: store.hudOff }" v-show="playing && isJelajah">
      <div ref="markers" class="layer hud-el"><div ref="arrow" class="tgt-arrow" style="display:none"><span>Target</span></div></div>
      <div id="cursorLine" ref="cursorLine" />
      <div id="crosshair" ref="crosshair" class="hud-el"><div class="ch-c" /><div class="ch-d" /><div id="horizon" ref="horizon" /></div>
      <div id="cursor" ref="cursor" />
      <div class="compass hud-el">
        <canvas ref="compass" />
        <div class="compass-info">Arah <b>{{ store.hud.hdg }}</b> &nbsp;·&nbsp; Elevasi <b>{{ store.hud.pit }}</b></div>
      </div>
    </div>
    <div ref="poi" class="layer poi-layer" v-show="store.mode === 'sejarah' && playing" />
    <div ref="labLabels" class="layer" v-show="store.mode === 'fenomena' && playing" />

    <Transition name="fade"><LoaderScreen v-if="store.phase === 'loading'" /></Transition>
    <Transition name="fade"><IntroOverlay v-if="store.phase === 'menu' && store.intro" /></Transition>
    <Transition name="fade"><MenuScreen v-if="store.phase === 'menu' && !store.intro" /></Transition>

    <template v-if="playing">
      <GameHeader />
      <HudGameHud v-if="isJelajah" />
      <Transition name="slide" mode="out-in">
        <PanelsPlanetPanel v-if="store.mode === 'planet'" key="planet" />
        <PanelsHistoryPanel v-else-if="store.mode === 'sejarah'" key="sejarah" />
        <PanelsPhenomenonPanel v-else-if="store.mode === 'fenomena'" key="fenomena" />
        <PanelsQuizPanel v-else-if="store.mode === 'kuis'" key="kuis" />
        <PanelsHangarPanel v-else-if="store.mode === 'hanggar'" key="hanggar" />
        <PanelsMapPanel v-else-if="store.mode === 'peta'" key="peta" />
        <PanelsProfilePanel v-else-if="store.mode === 'profil'" key="profil" />
      </Transition>
      <HudDock v-if="showDock" />
      <HudTouchControls v-if="store.touch && isJelajah && store.phase === 'playing'" />
      <Transition name="fade"><PanelsPauseMenu v-if="store.phase === 'paused'" /></Transition>
    </template>

    <!-- Notifikasi -->
    <div class="notify">
      <Transition name="rise"><div v-if="store.banner.show" class="banner"><div class="kicker acc">{{ store.banner.kick }}</div><div class="bt">{{ store.banner.title }}</div><div class="bk">{{ store.banner.kind }}</div><p>{{ store.banner.desc }}</p></div></Transition>
      <Transition name="rise"><div v-if="store.toast.show" class="toast panel" v-html="store.toast.html" /></Transition>
      <Transition name="fade"><div v-if="store.msg.show && isJelajah" class="msg">{{ store.msg.text }}</div></Transition>
    </div>
    <PanelsModals />
  </div>
</template>

<style scoped>
.compass{position:absolute;top:calc(var(--header-h) + 14px + var(--safe-t));left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.compass canvas{display:block}
.compass-info{margin-top:4px;font-size:11px;letter-spacing:.16em;color:var(--dim);text-transform:uppercase}
.compass-info b{font-family:var(--mono);color:var(--txt);font-weight:600;letter-spacing:0}
.poi-layer{z-index:6}
.notify{position:fixed;inset:0;pointer-events:none;z-index:40}
.banner{position:absolute;left:50%;top:24%;transform:translateX(-50%);text-align:center;max-width:min(560px,86vw)}
.banner .bt{font-size:clamp(28px,4.4vw,46px);font-weight:700;letter-spacing:.2em;text-transform:uppercase;margin:6px 0 4px;padding-left:.2em;text-shadow:0 0 24px rgba(0,0,0,.8)}
.banner .bk{color:var(--acc);font-size:12.5px;letter-spacing:.2em;text-transform:uppercase}
.banner p{color:var(--txt);opacity:.82;font-size:14px;line-height:1.5;margin-top:8px;text-shadow:0 0 8px #000}
.toast{position:absolute;left:50%;bottom:calc(150px + var(--safe-b));transform:translateX(-50%);padding:10px 16px;font-size:13px;letter-spacing:.03em;white-space:nowrap;max-width:92vw}
.msg{position:absolute;left:50%;top:calc(50% + 46px);transform:translateX(-50%);font-size:11.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--acc2);text-shadow:0 0 8px #000;white-space:nowrap}
.touch .compass{top:calc(var(--header-h) + 150px + var(--safe-t))}
.touch .toast{bottom:auto;top:calc(var(--header-h) + 8px);white-space:normal;text-align:center}
@media (max-width:760px){ .banner{top:30%} .banner .bt{font-size:26px} }
</style>

<script setup>
// Cangkang AstroSphere. Layar awal (Splash) hanya HTML+gambar; mesin 3D (Three.js) baru diunduh & dijalankan
// saat pemain masuk ke "Cara terbang" (Tamu Baru) atau langsung lewat muat cepat otomatis (Pemain Lama / Login).
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount } from 'vue';
import { store, setEngine, game } from '~/composables/useGame.js';
import { useSupabaseContent } from '~/composables/useSupabaseContent.js';
import { useNetworkStatus, OFFLINE_PUBLIC_NOTICE } from '~/utils/networkError.js';
import { EVENTS } from '~/data/events.js';

const { loadAll } = useSupabaseContent();
const { isOffline } = useNetworkStatus();
onMounted(() => {
  loadAll();
});

function reloadApp(clearError) {
  if (typeof window !== 'undefined') {
    window.location.reload();
    return;
  }
  clearError?.();
}

const canvas = ref(null), markers = ref(null), arrow = ref(null), poi = ref(null), labLabels = ref(null), compass = ref(null);
const crosshair = ref(null), vignette = ref(null), boostFx = ref(null);
const inGame = computed(() => store.phase === 'playing' || store.phase === 'paused');
const isJelajah = computed(() => store.mode === 'jelajah');
const showTop = computed(() => inGame.value && ['jelajah', 'planet', 'sejarah', 'fenomena', 'hanggar'].includes(store.mode));

const eventBanner = computed(() => {
  const ev = store.event;
  const eDef = EVENTS[ev.kind];
  if (!inGame.value || !isJelajah.value || !ev.phase || !eDef) return null;
  if (ev.kind === 'badai') {
    if (ev.phase === 'warn') return { cls: 'warn', icon: 'matahari', t: eDef.warn, s: ev.safe ? 'Kamu sudah di bayangan — tetap di sana' : `Berlindung di bayangan ${ev.shelterName}`, n: ev.left };
    return { cls: ev.safe ? 'safe' : 'danger', icon: 'matahari', t: eDef.hit, s: ev.safe ? 'Aman di bayangan' : 'Terkena radiasi — cepat ke bayangan!', n: ev.left };
  }
  if (ev.phase === 'warn') return { cls: 'warn', icon: 'info', t: eDef.warn, s: store.touch ? 'Hindari dengan joystick' : 'Hindari: A/D belok · W/S naik-turun', n: ev.left };
  return { cls: ev.hits > 3 ? 'danger' : 'warn', icon: 'info', t: eDef.hit, s: ev.hits ? `Tertabrak ${ev.hits} kali` : 'Belum tertabrak', n: ev.left };
});

watchEffect(() => { if (typeof document !== 'undefined') document.documentElement.style.setProperty('--hud-op', String(store.settings.hudOpacity)); });

async function ensureEngine() {
  if (game()) return game();
  const { createEngine } = await import('~/game/engine.js');
  const engine = createEngine({
    canvas: canvas.value, markers: markers.value, arrow: arrow.value, poi: poi.value, labLabels: labLabels.value, compass: compass.value,
    crosshair: crosshair.value, vignette: vignette.value, boostFx: boostFx.value,
  });
  setEngine(engine);
  if (import.meta.dev) window.__astro = { engine, store };
  return engine;
}

watch(() => store.phase, async (p) => {
  if (p !== 'guide' && p !== 'loading') return;
  try {
    const e = await ensureEngine();
    await e.boot();
    // Jika fase loading (pemain lama / pengguna login / tamu lewati slide), langsung masuk ke jelajah 3D!
    if (store.phase === 'loading') {
      e.startGame(store.startFromSave);
    }
  } catch (err) {
    console.error(err);
    store.loading.error = 'Saat ini halaman ruang angkasa 3D belum bisa diakses. Periksa koneksi lalu coba lagi.';
  }
});

onBeforeUnmount(() => { game()?.dispose(); });
</script>

<template>
  <div class="shell" :class="{ touch: store.touch }">
    <NuxtErrorBoundary>
      <canvas id="c" ref="canvas" tabindex="-1" aria-label="Ruang angkasa 3D AstroSphere" />
    <div id="vignette" ref="vignette" />
    <div id="boostFx" ref="boostFx" />

    <!-- Lapisan yang dikelola langsung oleh mesin (diperbarui tiap frame) -->
    <div class="layer hud-root" :class="{ off: store.hudOff }" v-show="inGame && isJelajah">
      <div ref="markers" class="layer hud-el"><div ref="arrow" class="tgt-arrow" style="display:none"><span>Tujuan</span></div></div>
      <div id="crosshair" ref="crosshair" class="hud-el"><div class="ch-c" /><div class="ch-d" /></div>
      <div class="compass hud-el"><canvas ref="compass" /></div>
    </div>
    <div ref="poi" class="layer poi-layer" v-show="store.mode === 'sejarah' && inGame" />
    <div ref="labLabels" class="layer" v-show="store.mode === 'fenomena' && inGame" />

    <!-- Layar Awal Splash (Beranda / Masuk / Daftar) -->
    <Transition name="fade"><Splash v-if="store.phase === 'splash'" /></Transition>

    <!-- Onboarding 5 Slide (Hanya untuk Tamu Baru yang pertama kali bermain) -->
    <Transition name="fade"><Guide v-if="store.phase === 'guide'" /></Transition>

    <!-- Layar Muat Cepat Otomatis (Untuk Pemain Lama & Pengguna Login yang melewati 5 Slide) -->
    <Transition name="fade">
      <div v-if="store.phase === 'loading'" class="quick-loader" role="status" aria-live="polite">
        <div class="card box-loader">
          <div class="loader-orbit">
            <span class="orbit-glow" />
            <UiIcon name="logo" :size="40" class="logo-spin" />
          </div>
          <div class="loader-texts">
            <h2 class="loader-title">Menyiapkan Tata Surya 3D</h2>
            <p class="loader-sub">{{ store.loading.text || 'Memuat ruang angkasa...' }}</p>
          </div>
          <div class="bar-wrap">
            <div class="bar-fill" :style="{ width: Math.round(store.loading.p * 100) + '%' }" />
          </div>
          <div class="loader-meta">
            <span class="pct num">{{ Math.round(store.loading.p * 100) }}%</span>
            <span v-if="store.startFromSave" class="tag star"><UiIcon name="putar" :size="12" />Melanjutkan Sesi</span>
            <span v-else class="tag star"><UiIcon name="hanggar" :size="12" />Meluncur ke Angkasa</span>
          </div>
          <div v-if="store.loading.error" class="loader-err">
            <span>{{ store.loading.error }}</span>
            <button class="btn sm line" @click="store.phase = 'splash'">Kembali ke Beranda</button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Tampilan Utama Dalam Game -->
    <template v-if="inGame">
      <TopBar v-if="showTop" />
      <HudGameHud v-if="isJelajah" />
      <HudEventHud v-if="isJelajah" />
      <Transition name="pop"><HudApproachCard v-if="isJelajah && store.approach.show && store.phase === 'playing'" /></Transition>
      <Transition name="slide" mode="out-in">
        <PanelsSunPanel v-if="store.mode === 'planet' && store.focus === 'matahari'" key="sun" />
        <PanelsPlanetPanel v-else-if="store.mode === 'planet'" key="planet" />
        <PanelsHistoryPanel v-else-if="store.mode === 'sejarah'" key="sejarah" />
        <PanelsPhenomenonPanel v-else-if="store.mode === 'fenomena'" key="fenomena" />
        <PanelsQuizPanel v-else-if="store.mode === 'kuis'" key="kuis" />
        <PanelsHangarPanel v-else-if="store.mode === 'hanggar'" key="hanggar" />
        <PanelsMapPanel v-else-if="store.mode === 'peta'" key="peta" />
        <PanelsProfilePanel v-else-if="store.mode === 'profil'" key="profil" />
        <PanelsMcoPanel v-else-if="store.mode === 'misi' && store.mission.id === 'mco'" key="mco" />
        <PanelsMissionPanel v-else-if="store.mode === 'misi'" key="misi" />
      </Transition>
      <Transition name="fade"><PanelsPauseMenu v-if="store.phase === 'paused'" /></Transition>
    </template>

      <div v-if="isOffline && !inGame" class="offline-banner-wrap" role="status" aria-live="polite">
        <div class="offline-banner">
          <span class="offline-dot" aria-hidden="true" />
          <span>{{ OFFLINE_PUBLIC_NOTICE }}</span>
        </div>
      </div>

      <!-- Tumpukan Notifikasi & Peringatan Pojok Kanan Atas (di bawah Misi / Profil / Menu) -->
      <div
        class="notify"
        :class="{
          'below-topbar': showTop || (inGame && store.mode === 'profil'),
          'in-jelajah': inGame && isJelajah,
        }"
        aria-live="polite"
      >
        <Transition name="hud-stack">
          <div v-if="inGame && isJelajah && store.event.damaged" class="hud-alert-card damaged" role="alert" aria-live="assertive">
            <span class="dam-ic"><UiIcon name="silang" :size="16" /></span>
            <div class="dam-tx">
              <b>Perisai rusak (Turbo nonaktif)</b>
              <small>Dekati planet terdekat untuk perbaikan otomatis.</small>
            </div>
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="eventBanner" class="hud-event-banner" :class="eventBanner.cls" role="status" aria-live="assertive">
            <span class="ev-ic"><UiIcon :name="eventBanner.icon" :size="18" /></span>
            <span class="ev-tx"><b>{{ eventBanner.t }}</b><small>{{ eventBanner.s }}</small></span>
            <span class="ev-n num">{{ eventBanner.n }}</span>
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="inGame && isJelajah && store.hud.boundary" class="hud-bound-pill" role="status">
            <UiIcon name="info" :size="16" />
            <span>Batas tata surya — putar balik</span>
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="store.toast.show" class="toast">
            <template v-for="(seg, idx) in store.toast.parts" :key="idx">
              <b v-if="seg.bold">{{ seg.text }}</b>
              <template v-else>{{ seg.text }}</template>
            </template>
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="inGame && isJelajah && store.msg.show" class="hud-msg-pill">
            {{ store.msg.text }}
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="inGame && isJelajah && store.saved.show" class="hud-saved-pill">
            <UiIcon name="cek" :size="14" />
            <span>{{ store.saved.label }}</span>
          </div>
        </Transition>

        <Transition name="hud-stack">
          <div v-if="isOffline && inGame" class="hud-offline-pill" role="status">
            <span class="offline-dot" aria-hidden="true" />
            <span>{{ OFFLINE_PUBLIC_NOTICE }}</span>
          </div>
        </Transition>
      </div>
      <PanelsModals />
      <template #error="{ clearError }">
        <div class="boundary-fallback" role="alert">
          <div class="boundary-card">
            <div class="boundary-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2>Saat ini halaman masih belum bisa diakses.</h2>
            <p>Terjadi kendala saat menampilkan tampilan AstroSphere. Silakan muat ulang halaman beberapa saat lagi.</p>
            <div class="boundary-actions">
              <button type="button" class="btn go" @click="reloadApp(clearError)">Muat Ulang</button>
              <button type="button" class="btn line" @click="clearError">Coba Lanjutkan</button>
            </div>
          </div>
        </div>
      </template>
    </NuxtErrorBoundary>
    <AccountDisabledModal />
  </div>
</template>

<style scoped>
.compass{position:absolute;top:calc(var(--top) + 6px + var(--safe-t));left:50%;transform:translateX(-50%);pointer-events:none}
.compass canvas{display:block}
.poi-layer{z-index:6}
.notify{
  position:fixed;
  top:calc(var(--top) + var(--safe-t));
  right:calc(var(--gap) + var(--safe-r));
  width:min(330px,calc(100vw - 2 * var(--gap) - var(--safe-l) - var(--safe-r)));
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:8px;
  pointer-events:none;
  z-index:45;
}
.notify.below-topbar{
  top:calc(var(--top) + 52px + var(--safe-t));
}
.notify>*{pointer-events:none}
.hud-alert-card.damaged{
  display:flex;
  align-items:flex-start;
  gap:10px;
  width:fit-content;
  max-width:100%;
  padding:9px 12px;
  border-radius:12px;
  background:rgba(45,6,6,.94);
  border:1.5px solid var(--coral);
  box-shadow:0 6px 20px rgba(0,0,0,.45),0 0 18px rgba(248,113,113,.28);
  color:#ffd4d4;
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
  animation:pulseDanger 1.6s infinite;
}
@keyframes pulseDanger{0%,100%{box-shadow:0 6px 18px rgba(0,0,0,.4),0 0 12px rgba(248,113,113,.25)}50%{box-shadow:0 6px 22px rgba(0,0,0,.45),0 0 22px rgba(248,113,113,.5)}}
.dam-ic{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:rgba(248,113,113,.22);color:var(--coral);flex:none;margin-top:1px}
.dam-tx{display:flex;flex-direction:column;gap:2px;min-width:0}
.dam-tx b{font-family:var(--display);font-weight:600;font-size:13px;line-height:1.25;color:#fecaca}
.dam-tx small{font-size:11.5px;line-height:1.35;color:#fee2e2}
.hud-event-banner{
  display:flex;
  align-items:center;
  gap:10px;
  width:fit-content;
  max-width:100%;
  padding:8px 10px;
  border-radius:12px;
  background:rgba(40,16,4,.92);
  border:1.5px solid #ffb347;
  color:#ffe3c2;
  box-shadow:0 8px 24px rgba(0,0,0,.45);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.hud-event-banner.warn{animation:blink 1.2s ease-in-out infinite}
.hud-event-banner.danger{background:rgba(48,6,6,.92);border-color:var(--coral);color:#ffd0d0}
.hud-event-banner.safe{background:rgba(4,40,26,.92);border-color:var(--green);color:#c8f7e3}
.ev-ic{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,179,71,.22);flex:none}
.hud-event-banner.danger .ev-ic{background:rgba(248,113,113,.22)}
.hud-event-banner.safe .ev-ic{background:rgba(52,211,153,.22)}
.ev-tx{display:flex;flex-direction:column;gap:1px;min-width:0;flex:1}
.ev-tx b{font-family:var(--display);font-weight:500;font-size:13px;line-height:1.25}
.ev-tx small{font-size:11.5px;opacity:.92;line-height:1.3}
.ev-n{min-width:34px;height:30px;padding:0 7px;border-radius:8px;display:grid;place-items:center;background:rgba(0,0,0,.35);font-family:var(--display);font-weight:600;font-size:15px;flex:none}
@keyframes blink{50%{box-shadow:0 0 0 4px rgba(255,179,71,.18),0 8px 24px rgba(0,0,0,.4)}}
.hud-bound-pill{
  display:inline-flex;
  align-items:center;
  gap:7px;
  max-width:100%;
  padding:7px 12px;
  border-radius:12px;
  background:var(--coral);
  color:#2a0606;
  font-family:var(--display);
  font-weight:500;
  font-size:13px;
  line-height:1.3;
  box-shadow:0 6px 20px rgba(0,0,0,.38);
}
.toast{
  max-width:100%;
  padding:9px 14px;
  border-radius:12px;
  background:var(--surface-a);
  border:1px solid var(--line);
  font-size:13.5px;
  line-height:1.4;
  color:var(--text);
  box-shadow:var(--shadow);
  backdrop-filter:blur(10px);
  -webkit-backdrop-filter:blur(10px);
}
.toast b{font-family:var(--display);font-weight:500}
.hud-msg-pill{
  max-width:100%;
  padding:7px 12px;
  border-radius:12px;
  background:var(--surface-a);
  border:1px solid var(--line);
  font-family:var(--display);
  font-weight:500;
  font-size:13px;
  line-height:1.35;
  color:var(--text);
  box-shadow:0 6px 18px rgba(0,0,0,.35);
}
.hud-saved-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:5px 11px;
  border-radius:999px;
  background:rgba(6,24,20,.88);
  border:1px solid rgba(52,211,153,.35);
  font-size:12.5px;
  font-weight:500;
  color:var(--green);
  box-shadow:0 4px 14px rgba(0,0,0,.3);
}
.hud-offline-pill{
  display:inline-flex;
  align-items:flex-start;
  gap:8px;
  max-width:100%;
  padding:7px 12px;
  border-radius:12px;
  background:rgba(15,23,42,.9);
  border:1px solid rgba(251,191,36,.38);
  color:#fde68a;
  font-size:12px;
  line-height:1.35;
  font-weight:500;
  backdrop-filter:blur(10px);
  box-shadow:0 6px 18px rgba(0,0,0,.35);
}
.hud-offline-pill .offline-dot{margin-top:4px}
.hud-stack-enter-active{transition:opacity .24s ease,transform .24s cubic-bezier(.2,.9,.3,1.15)}
.hud-stack-leave-active{transition:opacity .18s ease,transform .18s ease}
.hud-stack-enter-from,.hud-stack-leave-to{opacity:0;transform:translateX(14px)}
@media (min-width:721px) and (max-width:1080px){
  .notify.in-jelajah{width:min(270px,calc(50vw - 145px - var(--safe-r)))}
}
@media (max-width:720px){
  .notify{
    right:calc(12px + var(--safe-r));
    width:min(295px,calc(100vw - 24px - var(--safe-l) - var(--safe-r)));
    gap:6px;
  }
  .notify.in-jelajah{
    top:calc(var(--top) + 114px + var(--safe-t));
  }
}
@media (max-width:720px) and (max-height:460px){
  .notify.in-jelajah{
    top:calc(var(--top) + 48px + var(--safe-t));
    width:min(220px,calc(50vw - 110px - var(--safe-r)));
  }
}
@media (prefers-reduced-motion:reduce){
  .hud-alert-card.damaged,.hud-event-banner.warn{animation:none}
}
.offline-banner-wrap{position:fixed;top:calc(14px + var(--safe-t));left:50%;transform:translateX(-50%);z-index:48;pointer-events:none;max-width:calc(100vw - 24px)}
.offline-banner{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(15,23,42,.88);border:1px solid rgba(251,191,36,.38);color:#fde68a;font-size:12.5px;font-weight:500;backdrop-filter:blur(10px);box-shadow:var(--shadow);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.offline-dot{width:8px;height:8px;border-radius:50%;background:#fbbf24;flex-shrink:0}
.boundary-fallback{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:20px;background:rgba(5,8,20,.8);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.boundary-card{width:min(440px,100%);padding:28px 24px;border-radius:14px;background:rgba(11,16,33,.96);border:1px solid rgba(148,163,184,.18);box-shadow:0 20px 50px rgba(0,0,0,.65);text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px}
.boundary-icon{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;background:rgba(251,113,133,.12);border:1px solid rgba(251,113,133,.3);color:#fda4af}
.boundary-card h2{margin:0;font-family:var(--display);font-size:18px;font-weight:600;color:var(--text)}
.boundary-card p{margin:0;font-size:13.5px;line-height:1.55;color:var(--muted)}
.boundary-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:6px}
.touch .compass{top:calc(var(--top) + 4px + var(--safe-t))}

/* Layar Muat Cepat Otomatis */
.quick-loader{position:fixed;inset:0;z-index:42;display:grid;place-items:center;padding:16px;background:rgba(5,8,20,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.box-loader{width:min(440px,100%);padding:32px 28px;border-radius:14px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px;background:rgba(11,16,33,.96);border:1px solid rgba(148,163,184,.18);box-shadow:0 20px 50px rgba(0,0,0,.65)}
.loader-orbit{position:relative;width:80px;height:80px;display:grid;place-items:center}
.orbit-glow{position:absolute;inset:0;border-radius:50%;border:2px dashed rgba(59,108,240,.45);animation:spin 12s linear infinite}
.logo-spin{color:var(--sky);filter:drop-shadow(0 0 14px rgba(59,108,240,.6))}
.loader-texts{display:flex;flex-direction:column;gap:6px}
.loader-title{font-family:var(--display);font-size:20px;font-weight:500;color:var(--text);letter-spacing:-.01em}
.loader-sub{font-size:14px;color:var(--muted)}
.bar-wrap{width:100%;height:6px;background:var(--surface-2);border-radius:999px;overflow:hidden;border:1px solid var(--line)}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--sky),var(--cyan));border-radius:999px;transition:width .2s ease;box-shadow:0 0 10px rgba(59,108,240,.5)}
.loader-meta{width:100%;display:flex;align-items:center;justify-content:space-between;font-size:13px}
.loader-meta .pct{font-weight:500;color:var(--sky)}
.loader-err{margin-top:8px;font-size:13px;color:var(--coral);display:flex;flex-direction:column;gap:8px;align-items:center}
@keyframes spin{to{transform:rotate(360deg)}}
</style>

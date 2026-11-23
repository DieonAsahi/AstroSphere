<script setup>
// HUD kokpit terpadu: Kontrol Analog Kemudi (Kiri Bawah) & Tuas Pendorong Kokpit (Kanan Bawah),
// Navigasi Tujuan, serta Pesan Zona Hijau Kedekatan Planet yang bersih & lapang.
import { computed, ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, isFound } from '~/composables/useGame.js';
import { COLOR_OF, PLANETS } from '~/data/solarSystem.js';
import { fmtDist } from '~/game/util.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';

const hint = ref(false);
let t1, t2;
onMounted(() => {
  if (store.touch) return;
  t1 = setTimeout(() => { hint.value = true; }, 900);
  t2 = setTimeout(() => { hint.value = false; }, 11000);
});
onBeforeUnmount(() => {
  clearTimeout(t1);
  clearTimeout(t2);
});

const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id) => keyLabel(km.value[id]?.[0]);

// Status tuas dan pendorong
const status = computed(() => {
  if (store.hud.braking) return 'REM';
  if (store.hud.boost) return 'TURBO';
  if (store.hud.thr < -1) return 'MUNDUR';
  if (store.hud.thr > 0) return 'MAJU';
  return 'NETRAL';
});

// Pilih tujuan: daftar Matahari, planet, dan Bulan dengan jarak langsung
const LIST = ['matahari', ...PLANETS.map((p) => p.id), 'bulan'];
const pickOpen = ref(false);
const rows = ref([]);
let rowsT = 0;

function refreshRows() {
  const d = game()?.mapData?.();
  if (!d) return;
  const by = Object.fromEntries(d.bodies.map((b) => [b.id, b]));
  rows.value = LIST.filter((id) => by[id]).map((id) => ({
    id,
    name: by[id].name,
    color: COLOR_OF[id],
    found: isFound(id),
    d: fmtDist(by[id].d),
  }));
}

function closePick() {
  pickOpen.value = false;
  clearInterval(rowsT);
  rowsT = 0;
}

function togglePick() {
  if (pickOpen.value) { closePick(); return; }
  refreshRows();
  pickOpen.value = true;
  rowsT = setInterval(refreshRows, 1000);
  game()?.click?.();
}

function choose(id) {
  game()?.setTarget(id);
  closePick();
}

watch(() => store.phase, (p) => {
  if (p !== 'playing') closePick();
});
onBeforeUnmount(closePick);

// -------------------------------------------------------------
// 1. ANALOG KEMUDI KOKPIT (KIRI BAWAH)
// -------------------------------------------------------------
const STICK_R = 34; // Jangkauan pergeseran knop analog (px)
const stickState = reactive({
  dragging: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  dragX: 0,
  dragY: 0,
});

function onStickPointerDown(e) {
  if (stickState.pointerId !== null) return;
  stickState.pointerId = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  const rect = e.currentTarget.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  stickState.startX = centerX;
  stickState.startY = centerY;
  stickState.dragging = true;

  updateStickPosition(e.clientX, e.clientY);
}

function onStickPointerMove(e) {
  if (e.pointerId !== stickState.pointerId) return;
  updateStickPosition(e.clientX, e.clientY);
}

function updateStickPosition(clientX, clientY) {
  let dx = clientX - stickState.startX;
  let dy = clientY - stickState.startY;
  const dist = Math.hypot(dx, dy);
  if (dist > STICK_R) {
    dx = (dx / dist) * STICK_R;
    dy = (dy / dist) * STICK_R;
  }
  stickState.dragX = dx;
  stickState.dragY = dy;

  // Set nilai kemudi ke engine
  const normX = dx / STICK_R;
  const normY = dy / STICK_R;
  game()?.setSteer?.(normX, normY);
}

function onStickPointerUp(e) {
  if (e.pointerId !== stickState.pointerId) return;
  stickState.pointerId = null;
  stickState.dragging = false;
  stickState.dragX = 0;
  stickState.dragY = 0;
  game()?.setSteer?.(0, 0);
}

// Posisi visual knop analog (sinkron antara drag tetikus/sentuhan & tombol keyboard W/A/S/D)
const stickVisualTransform = computed(() => {
  if (stickState.dragging) {
    return `translate(${stickState.dragX}px, ${stickState.dragY}px)`;
  }
  const kx = (store.hud.stick?.x || 0) * STICK_R;
  const ky = -(store.hud.stick?.y || 0) * STICK_R;
  return `translate(${kx}px, ${ky}px)`;
});

const isStickEngaged = computed(() => {
  if (stickState.dragging) return true;
  return Math.abs(store.hud.stick?.x || 0) > 0.05 || Math.abs(store.hud.stick?.y || 0) > 0.05;
});

// -------------------------------------------------------------
// 2. TUAS DORONG PESAWAT ANTARIKSA (KANAN BAWAH)
// -------------------------------------------------------------
const TRACK_HEIGHT = 76; // Tinggi efektif rel tuas (px)
const HANDLE_HEIGHT = 18;
const MAX_TRAVEL = TRACK_HEIGHT - HANDLE_HEIGHT; // 58px
const NEUTRAL_Y = 39; // Titik netral tuas

const throttleState = reactive({
  dragging: false,
  pointerId: null,
  trackRect: null,
  dragY: NEUTRAL_Y,
});
const trackRef = ref(null);

function onTrackPointerDown(e) {
  if (throttleState.pointerId !== null) return;
  throttleState.pointerId = e.pointerId;
  e.currentTarget.setPointerCapture(e.pointerId);
  throttleState.trackRect = e.currentTarget.getBoundingClientRect();
  throttleState.dragging = true;
  updateThrottleFromPointer(e.clientY);
}

function onTrackPointerMove(e) {
  if (e.pointerId !== throttleState.pointerId) return;
  updateThrottleFromPointer(e.clientY);
}

function updateThrottleFromPointer(clientY) {
  const rect = throttleState.trackRect || trackRef.value?.getBoundingClientRect();
  if (!rect) return;
  const rawY = clientY - rect.top;
  const relY = Math.max(0, Math.min(MAX_TRAVEL, rawY - HANDLE_HEIGHT / 2));
  throttleState.dragY = relY;

  if (relY <= 8) {
    // Posisi Paling Atas: Turbo
    game()?.setThrottle?.(1.0);
    game()?.setBoost?.(true);
    game()?.setBrake?.(false);
  } else if (relY <= NEUTRAL_Y - 6) {
    // Posisi Maju
    game()?.setBoost?.(false);
    game()?.setBrake?.(false);
    const frac = (NEUTRAL_Y - 6 - relY) / (NEUTRAL_Y - 12);
    game()?.setThrottle?.(Math.max(0.1, Math.min(1.0, frac)));
  } else if (relY <= NEUTRAL_Y + 6) {
    // Posisi Netral / Diam
    game()?.setBoost?.(false);
    game()?.setBrake?.(false);
    game()?.setThrottle?.(0);
  } else {
    // Posisi Bawah: Rem / Mundur
    game()?.setBoost?.(false);
    game()?.setBrake?.(true);
  }
}

function onTrackPointerUp(e) {
  if (e.pointerId !== throttleState.pointerId) return;
  throttleState.pointerId = null;
  throttleState.dragging = false;
  throttleState.trackRect = null;
  // Lepaskan rem/turbo terus-menerus jika dilepas
  game()?.setBoost?.(false);
  game()?.setBrake?.(false);
}

// Posisi Y visual gagang tuas (sinkron dua arah: keyboard & drag)
const leverVisualY = computed(() => {
  if (throttleState.dragging) return throttleState.dragY;
  if (store.hud.boost) return 1;
  if (store.hud.braking) return MAX_TRAVEL;
  const thr = store.hud.thr;
  if (thr > 0) {
    // 0..100 -> dari NEUTRAL_Y (39px) ke 8px
    const ratio = Math.min(1, thr / 100);
    return NEUTRAL_Y - ratio * (NEUTRAL_Y - 8);
  }
  if (thr < 0) {
    // 0..-30 -> dari NEUTRAL_Y (39px) ke MAX_TRAVEL (58px)
    const ratio = Math.min(1, Math.abs(thr) / 30);
    return NEUTRAL_Y + ratio * (MAX_TRAVEL - NEUTRAL_Y);
  }
  return NEUTRAL_Y; // Netral
});

// Lebar persentase bar daya dorong mini speedometer
const thrustBarWidth = computed(() => {
  if (store.hud.boost) return '100%';
  if (store.hud.braking) return '40%';
  const thr = store.hud.thr;
  if (thr > 0) return `${Math.max(8, Math.min(100, thr))}%`;
  if (thr < 0) return `${Math.max(8, Math.min(100, Math.abs(thr) * 3))}%`;
  return '0%';
});

function handleQuickStop() {
  game()?.stop?.();
  game()?.setBoost?.(false);
  game()?.setBrake?.(false);
}
</script>

<template>
  <div class="hud" :class="{ off: store.hudOff }">
    <!-- INDIKATOR MODE KAMERA BEBAS (FREE-LOOK POV) -->
    <Transition name="fade">
      <div v-if="store.look?.freeLook" class="free-look-banner hud-el">
        <span class="free-look-dot" />
        <span class="free-look-text">
          <b>Mode Kamera Bebas</b> &bull; Klik kanan 1&times; atau klik kiri 2&times; untuk kembali
        </span>
      </div>
    </Transition>

    <!-- TUJUAN DI BAWAH KOMPAS -->
    <div v-if="store.hud.target.id" class="dest hud-el" :class="{ auto: store.autopilot }">
      <button class="who" aria-haspopup="listbox" :aria-expanded="pickOpen" title="Ganti tujuan (T)" @click="togglePick">
        <small>Tujuan</small>
        <span class="dot" :style="{ background: COLOR_OF[store.hud.target.id] }" />
        <span class="nm">{{ store.hud.target.name }}</span>
        <span class="d">{{ store.hud.target.dist }}</span>
        <UiIcon name="turun" :size="14" class="chev" :class="{ up: pickOpen }" />
      </button>
      <button v-if="store.autopilot" class="pill on" aria-label="Matikan terbang otomatis" @click="store.autopilot = false">
        <UiIcon name="target" :size="15" />Otomatis<UiIcon name="tutup" :size="14" />
      </button>
      <button v-else class="pill" @click="game()?.flyTo(store.hud.target.id)">
        <UiIcon name="target" :size="15" />Terbang otomatis
      </button>
    </div>

    <!-- DAFTAR PILIHAN TUJUAN -->
    <div v-if="pickOpen" class="pk-back" @pointerdown="closePick" />
    <Transition name="fade">
      <div v-if="pickOpen" class="pk" role="listbox" aria-label="Pilih tujuan">
        <p class="pk-h">Pilih tujuan</p>
        <p class="pk-s">Panah kuning di layar menunjuk tujuanmu. Kuis dan kartu sebuah planet terbuka setelah kamu mendekatinya.</p>
        <div class="pk-l scroll">
          <button v-for="r in rows" :key="r.id" role="option" :aria-selected="r.id === store.hud.target.id" class="pk-r" :class="{ on: r.id === store.hud.target.id, nf: !r.found }" @click="choose(r.id)">
            <span class="planet-dot" :style="{ '--c': r.color, '--s': '22px' }" />
            <span class="n"><b>{{ r.name }}</b><small v-if="!r.found">Belum dikunjungi</small></span>
            <span class="d">{{ r.d }}</span>
          </button>
        </div>
        <p v-if="!store.touch" class="pk-k"><b class="kbd sm">T</b> ganti tujuan cepat</p>
      </div>
    </Transition>

    <!-- PESAN KEDEKATAN PLANET — ZONA HIJAU (TENGAH ATAS, DI BAWAH KOMPAS/TUJUAN) -->
    <Transition name="fade">
      <div
        v-if="store.hud.near.isApproaching && store.hud.near.id && !pickOpen && !store.event.phase"
        class="approach-green-card hud-el"
      >
        <span class="pd planet-dot" :style="{ '--c': COLOR_OF[store.hud.near.id], '--s': '24px' }" />
        <div class="approach-txt">
          <div class="badge-green-zone">
            <span class="green-pulsar" />
            <span>Zona Pendekatan</span>
          </div>
          <b class="approach-title">Mendekati {{ store.hud.near.name }}</b>
          <span class="approach-dist">{{ store.hud.near.dist }}</span>
        </div>
      </div>
    </Transition>

    <!-- -------------------------------------------------------- -->
    <!-- KONTROL KOKPIT BAWAH TERPADU: KEMUDI ANALOG & TUAS DORONG -->
    <!-- -------------------------------------------------------- -->

    <!-- 1. KEMUDI ANALOG (KIRI BAWAH) -->
    <div class="cockpit-stick-wrap hud-el" :class="{ engaged: isStickEngaged }">
      <div
        class="stick-base"
        @pointerdown="onStickPointerDown"
        @pointermove="onStickPointerMove"
        @pointerup="onStickPointerUp"
        @pointercancel="onStickPointerUp"
      >
        <div class="stick-grid-h" />
        <div class="stick-grid-v" />
        <div class="stick-ring" />
        <!-- Knop Analog (bergerak sinkron keyboard A/D/panah maupun drag tetikus/sentuhan) -->
        <div class="stick-knob" :style="{ transform: stickVisualTransform }">
          <div class="knob-core" :class="{ active: isStickEngaged }" />
        </div>
      </div>
      <div class="stick-label-box">
        <span class="stick-label">Kemudi Analog</span>
        <small v-if="!store.touch" class="stick-keys">W/S Naik-Turun · A/D Belok</small>
      </div>
    </div>

    <!-- 2. SPEEDOMETER KOKPIT & TUAS DORONG VERTIKAL (KANAN BAWAH) -->
    <div class="cockpit-throttle-wrap hud-el">
      <!-- Mini Speedometer Digital & Bar Daya Dorong (Atas) -->
      <div class="mini-speedo">
        <div class="speedo-readout">
          <b class="speedo-val">{{ store.hud.speed }}</b>
          <span class="speedo-unit">km/s</span>
        </div>
        <div class="thrust-meter">
          <div
            class="thrust-meter-fill"
            :style="{ width: thrustBarWidth }"
            :class="{ turbo: store.hud.boost, brake: store.hud.braking }"
          />
        </div>
      </div>

      <!-- Rel Tuas Dorong Vertikal & Label Slot Bebas Tertindih (Tengah) -->
      <div class="throttle-body">
        <div class="slot-column">
          <span class="slot-label turbo" :class="{ active: store.hud.boost }">TURBO</span>
          <span class="slot-label fwd" :class="{ active: store.hud.thr > 0 && !store.hud.boost }">MAJU</span>
          <span class="slot-label neutral" :class="{ active: store.hud.thr === 0 && !store.hud.braking }">NETRAL</span>
          <span class="slot-label brake" :class="{ active: store.hud.braking || store.hud.thr < 0 }">REM</span>
        </div>
        <div
          class="throttle-track"
          ref="trackRef"
          @pointerdown="onTrackPointerDown"
          @pointermove="onTrackPointerMove"
          @pointerup="onTrackPointerUp"
          @pointercancel="onTrackPointerUp"
        >
          <div class="track-channel">
            <div
              class="track-glow-bar"
              :class="{ turbo: store.hud.boost, brake: store.hud.braking }"
            />
          </div>
          <!-- Gagang Tuas Kokpit (bergerak otomatis naik/turun sesuai gas/turbo/rem/berhenti & bisa diseret) -->
          <div
            class="throttle-handle"
            :style="{ transform: `translateY(${leverVisualY}px)` }"
            :class="{ dragging: throttleState.dragging, turbo: store.hud.boost, brake: store.hud.braking }"
          >
            <div class="handle-grip">
              <span class="grip-ridge" />
              <span class="grip-ridge" />
              <span class="grip-indicator" />
            </div>
          </div>
        </div>
      </div>

      <!-- Keterangan Cepat Ringkas (Bawah) -->
      <div class="throttle-hint-box">
        <small v-if="!store.touch" class="throttle-keys">Enter Gas · Ctrl Rem</small>
      </div>
    </div>

    <!-- NOTIFIKASI LAINNYA -->
    <Transition name="fade"><div v-if="store.msg.show" class="msg">{{ store.msg.text }}</div></Transition>
    <Transition name="fade"><div v-if="store.hud.boundary" class="bound" role="status"><UiIcon name="info" :size="18" />Batas tata surya — putar balik</div></Transition>
    <Transition name="fade"><div v-if="store.saved.show" class="saved"><UiIcon name="cek" :size="15" />{{ store.saved.label }}</div></Transition>
    <Transition name="fade">
      <div v-if="hint && !store.approach.show" class="hint">
        <span><b class="kbd sm">{{ k('forward') }}</b> maju</span>
        <span><b class="kbd sm">{{ k('left') }}</b><b class="kbd sm">{{ k('right') }}</b> belok</span>
        <span><b class="kbd sm">{{ k('turbo') }}</b> turbo</span>
        <span><b class="kbd sm">{{ k('stop') }}</b> berhenti</span>
        <span><b class="kbd sm">{{ k('map') }}</b> peta</span>
        <span><b class="kbd sm">Esc</b> menu</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hud{position:fixed;inset:0;z-index:10;pointer-events:none;opacity:var(--hud-op)}
.hud>*{pointer-events:auto}
.hud.off .hud-el{opacity:0;pointer-events:none}

/* TUJUAN DI BAWAH KOMPAS */
.dest{position:absolute;left:50%;top:calc(var(--top) + 64px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:4px 6px;border-radius:10px;background:rgba(11,16,36,.88);border:1px solid rgba(148,174,255,.2);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 8px 24px rgba(0,0,0,.45);white-space:nowrap;z-index:2}
.who{display:flex;align-items:center;gap:9px;min-height:34px;padding:0 10px;border-radius:8px;transition:background .15s}
.who:hover{background:rgba(255,255,255,.08)}
.who small{font-size:11.5px;color:var(--faint)}
.chev{color:var(--muted);transition:transform .2s}.chev.up{transform:rotate(180deg)}
.pk-back{position:absolute;inset:0;z-index:1}
.pk{position:absolute;left:50%;top:calc(var(--top) + 112px + var(--safe-t));transform:translateX(-50%);z-index:2;width:min(360px,calc(100vw - 24px));padding:14px;border-radius:var(--r-lg);background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px}
.pk-h{font-family:var(--display);font-weight:500;font-size:16px}
.pk-s{font-size:12.5px;color:var(--muted);line-height:1.5}
.pk-l{display:flex;flex-direction:column;gap:4px;max-height:min(52vh,420px);overflow-y:auto}
.pk-r{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-sm);text-align:left;transition:background .15s}
.pk-r:hover{background:var(--surface-2)}
.pk-r.on{background:rgba(59,108,240,.22);box-shadow:inset 0 0 0 1px rgba(143,176,255,.4)}
.pk-r .n{flex:1;display:flex;flex-direction:column}
.pk-r .n b{font-family:var(--display);font-weight:500;font-size:15px}
.pk-r .n small{font-size:11.5px;color:var(--star)}
.pk-r.nf .planet-dot{opacity:.55}
.pk-r .d{font-size:12.5px;color:var(--muted)}
.pk-k{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--faint)}
.dest .dot{width:10px;height:10px;border-radius:50%}
.dest .nm{font-family:var(--display);font-weight:500}
.dest .d{font-size:13px;color:var(--muted)}
.pill{display:inline-flex;align-items:center;gap:5px;min-height:34px;padding:0 12px;border-radius:8px;background:rgba(59,130,246,.18);border:1px solid rgba(148,174,255,.25);color:#93c5fd;font-family:var(--display);font-weight:500;font-size:13px;transition:all .15s}
.pill:hover{background:rgba(59,130,246,.3);color:#fff}
.pill.on{background:var(--star);color:var(--on-star);border-color:transparent}
.dest.auto{border-color:rgba(255,201,71,.5)}

/* INDIKATOR MODE KAMERA BEBAS (FREE-LOOK POV) */
.free-look-banner{position:absolute;top:calc(var(--top) + 16px + var(--safe-t));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 14px;border-radius:8px;background:rgba(11,16,36,.92);border:1px solid rgba(56,189,248,.45);box-shadow:0 4px 16px rgba(0,0,0,.5),0 0 12px rgba(56,189,248,.2);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);z-index:25;white-space:nowrap;pointer-events:none}
.free-look-dot{width:7px;height:7px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8;animation:pulseDot 1.4s infinite}
@keyframes pulseDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
.free-look-text{font-size:12.5px;color:#e2e8f0;font-weight:400}
.free-look-text b{color:#38bdf8;font-weight:500}

/* PESAN KEDEKATAN PLANET — ZONA HIJAU (TENGAH ATAS, DI BAWAH KOMPAS) */
.approach-green-card{position:absolute;left:50%;top:calc(var(--top) + 116px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:8px 16px;border-radius:10px;background:rgba(8,16,36,.92);border:1px solid rgba(74,222,128,.5);box-shadow:0 0 24px rgba(74,222,128,.22),0 4px 14px rgba(0,0,0,.6);backdrop-filter:blur(10px);white-space:nowrap;z-index:4}
.approach-txt{display:flex;align-items:center;gap:10px}
.badge-green-zone{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:500;color:#4ade80;text-transform:uppercase;letter-spacing:.04em;background:rgba(74,222,128,.12);padding:2px 7px;border-radius:6px}
.green-pulsar{width:6px;height:6px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:pulseGreen 1.4s infinite}
@keyframes pulseGreen{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.approach-title{font-family:var(--display);font-size:14px;color:#fff}
.approach-dist{font-size:12.5px;color:var(--muted);font-family:var(--font)}

/* 1. KEMUDI ANALOG (KIRI BAWAH) */
.cockpit-stick-wrap{position:absolute;left:calc(var(--gap) + var(--safe-l));bottom:calc(var(--gap) + var(--safe-b));display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 10px;border-radius:var(--r-lg);background:var(--surface-a);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.4);touch-action:none;user-select:none;z-index:3}
.stick-base{position:relative;width:96px;height:96px;border-radius:50%;background:radial-gradient(circle,rgba(22,33,70,.85) 0%,rgba(10,16,38,.95) 100%);border:2px solid rgba(143,176,255,.25);box-shadow:inset 0 2px 6px rgba(0,0,0,.6);cursor:grab}
.stick-base:active{cursor:grabbing}
.stick-grid-h{position:absolute;top:50%;left:8px;right:8px;height:1px;background:rgba(143,176,255,.18)}
.stick-grid-v{position:absolute;left:50%;top:8px;bottom:8px;width:1px;background:rgba(143,176,255,.18)}
.stick-ring{position:absolute;inset:18px;border-radius:50%;border:1px dashed rgba(143,176,255,.25)}
.stick-knob{position:absolute;left:50%;top:50%;margin-left:-22px;margin-top:-22px;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b6cf0 0%,#1e3a8a 100%);box-shadow:0 4px 12px rgba(0,0,0,.5),0 0 12px rgba(59,108,240,.4);display:flex;align-items:center;justify-content:center;transition:transform .08s ease-out;pointer-events:none}
.knob-core{width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.65);box-shadow:0 0 6px #fff}
.knob-core.active{background:#ffc947;box-shadow:0 0 10px #ffc947}
.stick-label-box{display:flex;flex-direction:column;align-items:center;gap:1px}
.stick-label{font-family:var(--display);font-size:12px;font-weight:500;color:var(--text)}
.stick-keys{font-size:10.5px;color:var(--faint)}

/* 2. TUAS DORONG PESAWAT ANTARIKSA & MINI SPEEDOMETER (KANAN BAWAH) */
.cockpit-throttle-wrap{position:absolute;right:calc(var(--gap) + var(--safe-r));bottom:calc(var(--gap) + var(--safe-b));display:flex;flex-direction:column;align-items:center;gap:10px;width:174px;height:auto;padding:14px 16px;border-radius:12px;background:var(--surface-a);border:1px solid var(--line);box-shadow:0 8px 24px rgba(0,0,0,.4);touch-action:none;user-select:none;box-sizing:border-box;z-index:3}

/* Mini Speedometer (Atas) */
.mini-speedo{display:flex;flex-direction:column;align-items:center;gap:4px;width:100%}
.speedo-readout{display:flex;align-items:baseline;justify-content:center;gap:3px}
.speedo-val{font-size:22px;font-weight:600;line-height:1;color:var(--text);letter-spacing:-.02em}
.speedo-unit{font-size:11px;font-weight:500;color:var(--muted)}
.thrust-meter{width:100%;height:3px;border-radius:999px;background:rgba(148,174,255,.15);overflow:hidden;margin-bottom:6px}
.thrust-meter-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#3b82f6,#60a5fa);box-shadow:0 0 6px rgba(59,130,246,.6);transition:width .15s ease-out}
.thrust-meter-fill.turbo{background:linear-gradient(90deg,#f59e0b,#ef4444);box-shadow:0 0 8px rgba(245,158,11,.8)}
.thrust-meter-fill.brake{background:linear-gradient(90deg,#ef4444,#dc2626);box-shadow:0 0 6px rgba(239,68,68,.8)}

/* Rel & Notches Tuas (Tengah) */
.throttle-body{display:flex;align-items:center;justify-content:center;gap:18px;width:100%;margin:0}
.slot-column{display:flex;flex-direction:column;justify-content:space-between;height:76px;text-align:right;pointer-events:none}
.slot-label{font-size:9.5px;font-weight:500;color:var(--faint);letter-spacing:.04em;text-align:right;line-height:1;transition:color .15s}
.slot-label.active{color:var(--star)}
.slot-label.turbo.active{color:#ff8080}
.slot-label.brake.active{color:#ff6b6b}

.throttle-track{position:relative;width:32px;height:76px;display:flex;align-items:center;justify-content:center;cursor:ns-resize;flex:none}
.track-channel{position:absolute;left:50%;top:0;bottom:0;width:6px;transform:translateX(-50%);border-radius:999px;background:rgba(10,16,38,.85);border:1px solid rgba(143,176,255,.2);box-shadow:inset 0 2px 4px rgba(0,0,0,.7);overflow:hidden}
.track-glow-bar{position:absolute;inset:0;background:linear-gradient(to top,#3b6cf0,#60a5fa);opacity:.4}
.track-glow-bar.turbo{background:linear-gradient(to top,#f59e0b,#ef4444);opacity:.85}
.track-glow-bar.brake{background:linear-gradient(to bottom,#ef4444,#b91c1c);opacity:.85}

/* Gagang Tuas Kokpit */
.throttle-handle{position:absolute;left:50%;top:0;width:28px;height:18px;margin-left:-14px;border-radius:5px;background:linear-gradient(180deg,#3b82f6 0%,#1d4ed8 100%);border:1px solid rgba(255,255,255,.4);box-shadow:0 3px 8px rgba(0,0,0,.6),0 0 8px rgba(59,130,246,.5);display:flex;align-items:center;justify-content:center;transition:transform .08s ease-out;pointer-events:none}
.throttle-handle.turbo{background:linear-gradient(180deg,#f59e0b 0%,#dc2626 100%);box-shadow:0 3px 10px rgba(220,38,38,.6),0 0 10px #f59e0b}
.throttle-handle.brake{background:linear-gradient(180deg,#ef4444 0%,#991b1b 100%);box-shadow:0 3px 8px rgba(239,68,68,.5)}
.handle-grip{display:flex;align-items:center;gap:2px}
.grip-ridge{width:1.5px;height:8px;background:rgba(255,255,255,.45);border-radius:1px}
.grip-indicator{width:3px;height:3px;border-radius:50%;background:#fff;margin-left:1px}

/* Keterangan Bawah */
.throttle-hint-box{display:flex;align-items:center;justify-content:center;width:100%;margin-top:4px}
.throttle-keys{font-size:10px;color:var(--faint);white-space:nowrap}

/* Notifikasi lainnya */
.msg{position:absolute;left:50%;top:calc(50% + 48px);transform:translateX(-50%);padding:6px 16px;border-radius:999px;background:var(--surface-a);font-family:var(--display);font-weight:500;white-space:nowrap}
.bound{position:absolute;left:50%;top:calc(var(--top) + 116px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:var(--coral);color:#2a0606;font-family:var(--display);font-weight:500;white-space:nowrap}
.saved{position:absolute;right:calc(var(--gap) + var(--safe-r));top:calc(var(--top) + 60px + var(--safe-t));display:flex;align-items:center;gap:6px;font-size:13px;color:var(--green)}
.hint{position:absolute;left:50%;bottom:calc(var(--gap) + 8px + var(--safe-b));transform:translateX(-50%);display:flex;gap:16px;padding:8px 16px;border-radius:999px;background:var(--surface-a);border:1px solid var(--line);font-size:13px;color:var(--muted);white-space:nowrap;pointer-events:none}
.hint span{display:flex;align-items:center;gap:5px}
@media (max-width:1100px){ .hint{display:none} }

/* Penyesuaian Layar Kecil / HP */
@media (max-width:768px){
  .cockpit-stick-wrap{left:calc(10px + var(--safe-l));bottom:calc(10px + var(--safe-b));padding:6px;height:auto}
  .stick-base{width:80px;height:80px}
  .stick-knob{width:36px;height:36px;margin-left:-18px;margin-top:-18px}
  .cockpit-throttle-wrap{right:calc(10px + var(--safe-r));bottom:calc(10px + var(--safe-b));width:138px;height:auto;padding:8px 10px}
  .speedo-val{font-size:18px}
  .throttle-body{gap:12px;margin:2px 0}
  .slot-column{height:68px}
  .throttle-track{width:28px;height:68px}
  .throttle-handle{width:24px;height:16px;margin-left:-12px}
  .approach-green-card{left:50%;top:calc(var(--top) + 104px + var(--safe-t));transform:translateX(-50%);padding:6px 12px;gap:8px}
  .approach-title{font-size:13px}
}
</style>

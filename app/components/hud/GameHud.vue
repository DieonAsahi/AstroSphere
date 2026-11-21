<script setup>
// HUD terbang — sengaja sedikit: tujuan (di bawah kompas), kecepatan, dan planet terdekat. Tanpa koordinat & panel bertumpuk.
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { store, game, isFound } from '~/composables/useGame.js';
import { COLOR_OF, PLANETS } from '~/data/solarSystem.js';
import { fmtDist } from '~/game/util.js';
import { resolveKeymap, keyLabel } from '~/data/keymap.js';
const hint = ref(false);
let t1, t2;
onMounted(() => { if (store.touch) return; t1 = setTimeout(() => { hint.value = true; }, 900); t2 = setTimeout(() => { hint.value = false; }, 11000); });
onBeforeUnmount(() => { clearTimeout(t1); clearTimeout(t2); });
const km = computed(() => resolveKeymap(store.settings.keys));
const k = (id) => keyLabel(km.value[id]?.[0]);
const status = computed(() => store.hud.braking ? 'Mengerem' : store.hud.boost ? 'Turbo' : store.hud.thr < -1 ? 'Mundur' : store.hud.thr > 0 ? 'Melaju' : 'Diam');
const thrW = computed(() => Math.min(100, Math.abs(store.hud.thr)));

// Pilih tujuan: daftar Matahari, planet, dan Bulan dengan jarak langsung (diperbarui tiap detik saat terbuka).
const LIST = ['matahari', ...PLANETS.map((p) => p.id), 'bulan'];
const pickOpen = ref(false), rows = ref([]);
let rowsT = 0;
function refreshRows() {
  const d = game()?.mapData?.(); if (!d) return;
  const by = Object.fromEntries(d.bodies.map((b) => [b.id, b]));
  rows.value = LIST.filter((id) => by[id]).map((id) => ({ id, name: by[id].name, color: COLOR_OF[id], found: isFound(id), d: fmtDist(by[id].d) }));
}
function closePick() { pickOpen.value = false; clearInterval(rowsT); rowsT = 0; }
function togglePick() {
  if (pickOpen.value) { closePick(); return; }
  refreshRows(); pickOpen.value = true; rowsT = setInterval(refreshRows, 1000); game()?.click?.();
}
function choose(id) { game()?.setTarget(id); closePick(); }
watch(() => store.phase, (p) => { if (p !== 'playing') closePick(); });
onBeforeUnmount(closePick);
</script>

<template>
  <div class="hud" :class="{ off: store.hudOff }">
    <!-- tujuan di bawah kompas -->
    <div v-if="store.hud.target.id" class="dest hud-el" :class="{ auto: store.autopilot }">
      <button class="who" aria-haspopup="listbox" :aria-expanded="pickOpen" title="Ganti tujuan (T)" @click="togglePick">
        <small>Tujuan</small>
        <span class="dot" :style="{ background: COLOR_OF[store.hud.target.id] }" />
        <span class="nm">{{ store.hud.target.name }}</span>
        <span class="d">{{ store.hud.target.dist }}</span>
        <UiIcon name="turun" :size="14" class="chev" :class="{ up: pickOpen }" />
      </button>
      <button v-if="store.autopilot" class="pill on" aria-label="Matikan terbang otomatis" @click="store.autopilot = false"><UiIcon name="target" :size="15" />Otomatis<UiIcon name="tutup" :size="14" /></button>
      <button v-else class="pill" @click="game()?.flyTo(store.hud.target.id)"><UiIcon name="target" :size="15" />Terbang otomatis</button>
    </div>

    <!-- daftar pilihan tujuan -->
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

    <!-- kecepatan -->
    <div class="spd hud-el">
      <div class="v"><b class="num">{{ store.hud.speed }}</b><span>km/s</span></div>
      <div class="thr"><i :class="{ rev: store.hud.thr < 0, turbo: store.hud.boost }" :style="{ width: thrW + '%' }" /></div>
      <span class="st" :class="{ hot: store.hud.boost, warn: store.hud.braking }">{{ status }}</span>
    </div>

    <!-- planet terdekat -->
    <div v-if="store.hud.near.id" class="near hud-el">
      <span class="pd planet-dot" :style="{ '--c': COLOR_OF[store.hud.near.id], '--s': '30px' }" />
      <span><small>Terdekat</small><b>{{ store.hud.near.name }}</b></span>
      <span class="d">{{ store.hud.near.dist }}</span>
    </div>

    <Transition name="fade"><div v-if="store.msg.show" class="msg">{{ store.msg.text }}</div></Transition>
    <Transition name="fade"><div v-if="store.hud.boundary" class="bound" role="status"><UiIcon name="info" :size="18" />Batas tata surya — putar balik</div></Transition>
    <Transition name="fade"><div v-if="store.saved.show" class="saved"><UiIcon name="cek" :size="15" />{{ store.saved.label }}</div></Transition>
    <Transition name="fade">
      <div v-if="hint && !store.approach.show" class="hint">
        <span><b class="kbd sm">{{ k('forward') }}</b> maju</span><span><b class="kbd sm">{{ k('turnL') }}</b><b class="kbd sm">{{ k('turnR') }}</b> putar</span>
        <span><b class="kbd sm">{{ k('up') }}</b><b class="kbd sm">{{ k('down') }}</b> naik/turun</span><span><b class="kbd sm">{{ k('map') }}</b> peta</span><span><b class="kbd sm">Esc</b> menu</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.hud{position:fixed;inset:0;z-index:10;pointer-events:none;opacity:var(--hud-op)}
.hud>*{pointer-events:auto}
.hud.off .hud-el{opacity:0;pointer-events:none}
.dest{position:absolute;left:50%;top:calc(var(--top) + 64px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:4px 5px 4px 4px;border-radius:999px;background:var(--surface-a);border:1px solid var(--line);white-space:nowrap;z-index:2}
.who{display:flex;align-items:center;gap:9px;min-height:36px;padding:0 10px 0 12px;border-radius:999px;transition:background .15s}
.who:hover{background:var(--surface-3)}
.who small{font-size:11.5px;color:var(--faint)}
.chev{color:var(--muted);transition:transform .2s}.chev.up{transform:rotate(180deg)}
.pk-back{position:absolute;inset:0;z-index:1}
.pk{position:absolute;left:50%;top:calc(var(--top) + 112px + var(--safe-t));transform:translateX(-50%);z-index:2;width:min(360px,calc(100vw - 24px));padding:14px;border-radius:var(--r-lg);
  background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:8px}
.pk-h{font-family:var(--display);font-weight:600;font-size:16px}
.pk-s{font-size:12.5px;color:var(--muted);line-height:1.5}
.pk-l{display:flex;flex-direction:column;gap:4px;max-height:min(52vh,420px);overflow-y:auto}
.pk-r{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r-sm);text-align:left;transition:background .15s}
.pk-r:hover{background:var(--surface-2)}
.pk-r.on{background:rgba(59,108,240,.22);box-shadow:inset 0 0 0 1px rgba(143,176,255,.4)}
.pk-r .n{flex:1;display:flex;flex-direction:column}
.pk-r .n b{font-family:var(--display);font-weight:600;font-size:15px}
.pk-r .n small{font-size:11.5px;color:var(--star)}
.pk-r.nf .planet-dot{opacity:.55}
.pk-r .d{font-size:12.5px;color:var(--muted)}
.pk-k{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--faint)}
.dest .dot{width:10px;height:10px;border-radius:50%}
.dest .nm{font-family:var(--display);font-weight:600}
.dest .d{font-size:13px;color:var(--muted)}
.pill{display:inline-flex;align-items:center;gap:5px;min-height:32px;padding:0 12px;border-radius:999px;background:var(--surface-3);font-family:var(--display);font-weight:500;font-size:13px}
.pill:hover{filter:brightness(1.15)}
.pill.on{background:var(--star);color:var(--on-star)}
.dest.auto{border-color:rgba(255,201,71,.5)}
.spd{position:absolute;left:calc(var(--gap) + var(--safe-l));bottom:calc(var(--gap) + var(--safe-b));padding:14px 18px 12px;border-radius:var(--r-lg);background:var(--surface-a);border:1px solid var(--line);width:210px;display:flex;flex-direction:column;gap:8px}
.v{display:flex;align-items:baseline;gap:8px}
.v b{font-size:38px;font-weight:600;line-height:1}
.v span{color:var(--muted);font-size:14px}
.thr{height:8px;border-radius:999px;background:var(--surface-3);overflow:hidden}
.thr i{display:block;height:100%;border-radius:999px;background:var(--blue);transition:width .15s}
.thr i.rev{background:var(--muted)} .thr i.turbo{background:var(--star)}
.st{font-size:13px;color:var(--muted)}
.st.hot{color:var(--star)} .st.warn{color:var(--coral)}
.near{position:absolute;right:calc(var(--gap) + var(--safe-r));bottom:calc(var(--gap) + var(--safe-b));display:flex;align-items:center;gap:12px;padding:10px 18px 10px 12px;border-radius:999px;background:var(--surface-a);border:1px solid var(--line)}
.near small{display:block;font-size:11.5px;color:var(--faint);line-height:1.1}
.near b{font-family:var(--display);font-weight:600;font-size:16px}
.near .d{font-size:13px;color:var(--muted);margin-left:4px}
.msg{position:absolute;left:50%;top:calc(50% + 48px);transform:translateX(-50%);padding:6px 16px;border-radius:999px;background:var(--surface-a);font-family:var(--display);font-weight:500;white-space:nowrap}
.bound{position:absolute;left:50%;top:calc(var(--top) + 116px + var(--safe-t));transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:var(--coral);color:#2a0606;font-family:var(--display);font-weight:600;white-space:nowrap}
.saved{position:absolute;right:calc(var(--gap) + var(--safe-r));top:calc(var(--top) + 60px + var(--safe-t));display:flex;align-items:center;gap:6px;font-size:13px;color:var(--green)}
.hint{position:absolute;left:50%;bottom:calc(var(--gap) + 8px + var(--safe-b));transform:translateX(-50%);display:flex;gap:16px;padding:10px 18px;border-radius:999px;background:var(--surface-a);border:1px solid var(--line);font-size:13.5px;color:var(--muted);white-space:nowrap}
.hint span{display:flex;align-items:center;gap:5px}
@media (max-width:1100px){ .hint{display:none} }
/* layar sentuh: kecepatan & planet terdekat naik ke atas, bawah dipakai joystick & tombol */
.touch .spd{bottom:auto;top:calc(var(--top) + 58px + var(--safe-t));left:calc(12px + var(--safe-l));width:auto;flex-direction:row;align-items:center;padding:6px 14px;border-radius:999px;gap:10px}
.touch .spd .v b{font-size:20px}.touch .spd .v span{font-size:12px}
.touch .spd .thr{width:46px}
.touch .spd .st{display:none}
.touch .near{bottom:auto;top:calc(var(--top) + 58px + var(--safe-t));right:calc(12px + var(--safe-r));padding:5px 12px 5px 6px;gap:8px}
.touch .near small,.touch .near .d{display:none}
.touch .near b{font-size:14px}
.touch .near .pd{--s:22px !important}
.touch .dest{top:calc(var(--top) + 108px + var(--safe-t));max-width:calc(100vw - 24px)}
.touch .dest .d,.touch .who small{display:none}
.touch .pk{top:calc(var(--top) + 156px + var(--safe-t))}
.touch .saved{display:none}
</style>

<script setup>
// Editor tata letak HUD sentuh interaktif fullscreen: drag & drop (x%, y%), ubah ukuran (0.75x–1.35x),
// sembunyikan/pulihkan tombol, reset bawaan, serta simpan per akun + sinkronisasi awan.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { store, saveTouchLayout, showToast } from '~/composables/useGame.js';
import {
  TOUCH_ELEMENTS,
  TOUCH_SCALE_MIN,
  TOUCH_SCALE_MAX,
  defaultTouchLayout,
  sanitizeTouchLayout,
  touchItemStyle,
} from '~/data/touchLayout.js';

const emit = defineEmits(['close']);

const draft = ref(sanitizeTouchLayout(store.settings.touchLayout));
const selectedId = ref(
  TOUCH_ELEMENTS.find((el) => !draft.value[el.id]?.hidden)?.id || TOUCH_ELEMENTS[0].id
);

const visibleElements = computed(() =>
  TOUCH_ELEMENTS.filter((el) => !draft.value[el.id]?.hidden)
);
const hiddenElements = computed(() =>
  TOUCH_ELEMENTS.filter((el) => !!draft.value[el.id]?.hidden)
);
const activeCfg = computed(() => (
  selectedId.value && !draft.value[selectedId.value]?.hidden
    ? draft.value[selectedId.value]
    : null
));
const activeMeta = computed(() =>
  TOUCH_ELEMENTS.find((el) => el.id === selectedId.value) || null
);

// ---- Drag & Drop berbasis persentase layar ----
const stageRef = ref(null);
const dragState = ref({
  id: null,
  pointerId: null,
  offsetX: 0,
  offsetY: 0,
});

function getStageBounds() {
  const rect = stageRef.value?.getBoundingClientRect();
  return {
    left: rect?.left ?? 0,
    top: rect?.top ?? 0,
    width: Math.max(rect?.width ?? window.innerWidth, 1),
    height: Math.max(rect?.height ?? window.innerHeight, 1),
  };
}

function onElPointerDown(e, id) {
  selectedId.value = id;
  if (dragState.value.pointerId !== null) return;
  const b = getStageBounds();
  const cfg = draft.value[id];
  const centerPxX = b.left + (cfg.x / 100) * b.width;
  const centerPxY = b.top + (cfg.y / 100) * b.height;

  dragState.value = {
    id,
    pointerId: e.pointerId,
    offsetX: e.clientX - centerPxX,
    offsetY: e.clientY - centerPxY,
  };
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
}

function onElPointerMove(e) {
  const d = dragState.value;
  if (!d.id || e.pointerId !== d.pointerId) return;
  const b = getStageBounds();
  const rawX = ((e.clientX - d.offsetX - b.left) / b.width) * 100;
  const rawY = ((e.clientY - d.offsetY - b.top) / b.height) * 100;
  const cfg = draft.value[d.id];
  if (!cfg) return;
  cfg.x = Math.round(Math.min(96, Math.max(4, rawX)) * 10) / 10;
  cfg.y = Math.round(Math.min(94, Math.max(6, rawY)) * 10) / 10;
}

function onElPointerUp(e) {
  if (e.pointerId !== dragState.value.pointerId) return;
  dragState.value = { id: null, pointerId: null, offsetX: 0, offsetY: 0 };
}

function updateScale(val) {
  if (!activeCfg.value) return;
  const clamped = Math.min(TOUCH_SCALE_MAX, Math.max(TOUCH_SCALE_MIN, Number(val) || 1));
  activeCfg.value.scale = Math.round(clamped * 100) / 100;
}

function hideElement(id) {
  if (!draft.value[id]) return;
  draft.value[id].hidden = true;
  if (selectedId.value === id) {
    const nextVis = TOUCH_ELEMENTS.find((el) => !draft.value[el.id]?.hidden);
    selectedId.value = nextVis ? nextVis.id : '';
  }
}

function restoreElement(id) {
  if (!draft.value[id]) return;
  draft.value[id].hidden = false;
  selectedId.value = id;
}

function resetToDefault() {
  draft.value = defaultTouchLayout();
  selectedId.value = TOUCH_ELEMENTS[0].id;
  showToast('Posisi & ukuran kontrol dikembalikan ke bawaan. Tekan Simpan untuk menerapkan.', 2400);
}

function saveAndClose() {
  saveTouchLayout(draft.value);
  showToast('Tata letak kontrol sentuh tersimpan.', 2200);
  emit('close');
}

function onKeyDown(e) {
  if (e.code === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown, true));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown, true));
</script>

<template>
  <div
    ref="stageRef"
    class="tle-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Editor Tata Letak Kontrol Sentuh"
    @pointerdown.stop
  >
    <!-- Garis Bantu Area HUD Game agar pemain terhindar dari tumpang tindih dengan Kompas & Bar Atas -->
    <div class="tle-grid" aria-hidden="true" />
    <div class="tle-ghost-compass" aria-hidden="true">Kompas &amp; Tujuan (Area Atas)</div>
    <div class="tle-ghost-topbar" aria-hidden="true">Misi · Profil · Menu</div>

    <!-- Toolbar Inspektor & Aksi (meredup & tembus pointer saat sedang menyeret elemen) -->
    <div class="tle-dock" :class="{ dragging: !!dragState.id }">
      <div class="dock-top">
        <div class="dock-head">
          <span class="dock-eyebrow">EDITOR TATA LETAK SENTUH</span>
          <span class="dock-hint">Seret elemen di layar untuk memindahkan posisi</span>
        </div>
        <div class="dock-actions">
          <button type="button" class="tle-btn ghost" @click="resetToDefault">
            <UiIcon name="ulang" :size="14" />
            <span>Reset Default</span>
          </button>
          <button type="button" class="tle-btn line" @click="emit('close')">
            Batal
          </button>
          <button type="button" class="tle-btn primary" @click="saveAndClose">
            <UiIcon name="cek" :size="15" />
            <span>Simpan Tata Letak</span>
          </button>
        </div>
      </div>

      <!-- Kontrol Ukuran & Visibilitas Elemen Terpilih -->
      <div v-if="activeCfg && activeMeta" class="dock-inspector">
        <div class="insp-meta">
          <span class="insp-name">{{ activeMeta.label }}</span>
          <span class="insp-coords num">X {{ Math.round(activeCfg.x) }}% · Y {{ Math.round(activeCfg.y) }}%</span>
        </div>

        <label class="insp-scale">
          <span class="insp-scale-lbl">Ukuran</span>
          <input
            type="range"
            :min="TOUCH_SCALE_MIN"
            :max="TOUCH_SCALE_MAX"
            step="0.05"
            :value="activeCfg.scale"
            aria-label="Ukuran elemen"
            @input="updateScale($event.target.value)"
          />
          <span class="insp-scale-val num">{{ activeCfg.scale.toFixed(2) }}&times;</span>
        </label>

        <button
          type="button"
          class="tle-btn hide-btn"
          title="Sembunyikan tombol ini dari HUD"
          @click="hideElement(activeMeta.id)"
        >
          <UiIcon name="tutup" :size="13" />
          <span>Sembunyikan</span>
        </button>
      </div>

      <div v-else class="dock-inspector empty">
        <span class="insp-hint">Pilih salah satu elemen di layar atau pulihkan tombol tersembunyi di bawah.</span>
      </div>

      <!-- Daftar Pulihkan Elemen Tersembunyi -->
      <div v-if="hiddenElements.length" class="dock-hidden">
        <span class="hidden-lbl">Tersembunyi:</span>
        <button
          v-for="el in hiddenElements"
          :key="el.id"
          type="button"
          class="restore-chip"
          @click="restoreElement(el.id)"
        >
          <UiIcon name="plus" :size="12" />
          <span>{{ el.label }}</span>
        </button>
      </div>
    </div>

    <!-- Elemen-Elemen HUD Sentuh yang Dapat Diseret -->
    <div
      v-for="el in visibleElements"
      :key="el.id"
      class="tle-item"
      :class="{
        selected: selectedId === el.id,
        dragging: dragState.id === el.id,
      }"
      :style="touchItemStyle(draft[el.id])"
      @pointerdown.prevent="onElPointerDown($event, el.id)"
      @pointermove="onElPointerMove"
      @pointerup="onElPointerUp"
      @pointercancel="onElPointerUp"
    >
      <span class="tle-tag">{{ el.shortLabel }}</span>

      <!-- Pratinjau Kemudi Analog -->
      <div v-if="el.id === 'stick'" class="prev-stick">
        <div class="prev-stick-ring">
          <div class="prev-stick-knob" />
        </div>
        <span class="prev-caption">Kemudi Analog</span>
      </div>

      <!-- Pratinjau Tuas Kecepatan -->
      <div v-else-if="el.id === 'throttle'" class="prev-throttle">
        <span class="prev-spd">0 <small>km/s</small></span>
        <div class="prev-th-body">
          <div class="prev-slots">
            <span>TURBO</span><span>MAJU</span><span>NETRAL</span><span>REM</span>
          </div>
          <div class="prev-rail"><i /></div>
        </div>
      </div>

      <!-- Pratinjau Tombol Guling Kiri -->
      <div v-else-if="el.id === 'rollLeft'" class="prev-roll">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M9 7H4V2" />
          <path d="M4.5 7A8.5 8.5 0 1 1 5.6 17.6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
        <small>Kiri</small>
      </div>

      <!-- Pratinjau Tombol Guling Kanan -->
      <div v-else-if="el.id === 'rollRight'" class="prev-roll">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 7h5V2" />
          <path d="M19.5 7A8.5 8.5 0 1 0 18.4 17.6" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </svg>
        <small>Kanan</small>
      </div>

      <!-- Pratinjau Tombol Jeda -->
      <div v-else-if="el.id === 'pause'" class="prev-pause">
        <UiIcon name="jeda" :size="18" />
        <small>Jeda</small>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tle-overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  background: radial-gradient(ellipse at 50% 45%, rgba(16, 26, 62, 0.96) 0%, rgba(6, 10, 26, 0.98) 100%);
  user-select: none;
  touch-action: none;
  overflow: hidden;
  font-family: var(--font, 'Poppins', system-ui, sans-serif);
}

.tle-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 174, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 174, 255, 0.06) 1px, transparent 1px);
  background-size: 36px 36px;
  pointer-events: none;
}

.tle-ghost-compass {
  position: absolute;
  top: calc(8px + var(--safe-t));
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px dashed rgba(148, 174, 255, 0.25);
  color: rgba(166, 180, 220, 0.42);
  font-size: 11px;
  pointer-events: none;
}

.tle-ghost-topbar {
  position: absolute;
  top: calc(10px + var(--safe-t));
  right: calc(14px + var(--safe-r));
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(148, 174, 255, 0.22);
  color: rgba(166, 180, 220, 0.38);
  font-size: 10.5px;
  pointer-events: none;
}

/* Toolbar Kontrol Editor */
.tle-dock {
  position: absolute;
  left: 50%;
  top: calc(36px + var(--safe-t));
  transform: translateX(-50%);
  width: min(680px, calc(100vw - 24px - var(--safe-l) - var(--safe-r)));
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(11, 16, 33, 0.94);
  border: 1px solid rgba(148, 174, 255, 0.24);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10;
  transition: opacity 0.16s ease;
}

.tle-dock.dragging {
  opacity: 0.22;
  pointer-events: none;
}

.dock-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.dock-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.dock-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #38bdf8;
}

.dock-hint {
  font-size: 11.5px;
  color: var(--muted);
}

.dock-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tle-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  font-family: var(--display);
  font-size: 12.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.tle-btn.ghost {
  background: rgba(148, 174, 255, 0.08);
  border: 1px solid rgba(148, 174, 255, 0.18);
  color: var(--text);
}

.tle-btn.ghost:hover {
  background: rgba(148, 174, 255, 0.16);
}

.tle-btn.line {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.3);
  color: var(--muted);
}

.tle-btn.line:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.tle-btn.primary {
  background: #3b82f6;
  color: #fff;
  border: none;
  box-shadow: 0 3px 12px rgba(59, 130, 246, 0.4);
}

.tle-btn.primary:hover {
  background: #2563eb;
}

.tle-btn.hide-btn {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
}

.tle-btn.hide-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.dock-inspector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 174, 255, 0.12);
}

.dock-inspector.empty {
  justify-content: center;
}

.insp-hint {
  font-size: 12px;
  color: var(--muted);
}

.insp-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.insp-name {
  font-family: var(--display);
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.insp-coords {
  font-size: 11px;
  color: #38bdf8;
}

.insp-scale {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 170px;
  max-width: 260px;
}

.insp-scale-lbl {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
}

.insp-scale input[type="range"] {
  flex: 1;
  height: 5px;
  accent-color: #38bdf8;
  cursor: pointer;
}

.insp-scale-val {
  font-size: 12px;
  font-weight: 600;
  color: #38bdf8;
  width: 40px;
  text-align: right;
}

.dock-hidden {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 174, 255, 0.1);
}

.hidden-lbl {
  font-size: 11.5px;
  color: var(--muted);
}

.restore-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #bae6fd;
  font-size: 11.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.restore-chip:hover {
  background: rgba(56, 189, 248, 0.25);
  color: #fff;
}

/* Elemen yang Dapat Diseret */
.tle-item {
  position: absolute;
  z-index: 6;
  cursor: grab;
  touch-action: none;
  border-radius: 14px;
  outline: 2px dashed transparent;
  outline-offset: 4px;
  transition: outline-color 0.12s ease;
}

.tle-item.selected {
  outline-color: #38bdf8;
  z-index: 8;
}

.tle-item.dragging {
  cursor: grabbing;
  outline-color: #fbbf24;
  z-index: 12;
}

.tle-tag {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(11, 16, 36, 0.92);
  border: 1px solid rgba(148, 174, 255, 0.26);
  color: var(--text);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.tle-item.selected .tle-tag,
.tle-item.dragging .tle-tag {
  opacity: 1;
}

/* Pratinjau Visual Identik dengan GameHud */
.prev-stick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 18px;
  background: var(--surface-a, rgba(14, 21, 51, 0.95));
  border: 1px solid var(--line);
}

.prev-stick-ring {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  border: 2px solid rgba(143, 176, 255, 0.28);
  background: radial-gradient(circle, rgba(22, 33, 70, 0.85), rgba(10, 16, 38, 0.95));
  display: grid;
  place-items: center;
}

.prev-stick-knob {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b6cf0 0%, #1e3a8a 100%);
  box-shadow: 0 0 10px rgba(59, 108, 240, 0.45);
}

.prev-caption {
  font-family: var(--display);
  font-size: 10.5px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
}

.prev-throttle {
  width: 122px;
  padding: 7px 8px;
  border-radius: 12px;
  background: var(--surface-a, rgba(14, 21, 51, 0.95));
  border: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.prev-spd {
  font-family: var(--display);
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.prev-spd small {
  font-size: 10px;
  color: var(--muted);
  font-weight: 500;
}

.prev-th-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.prev-slots {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 68px;
  font-size: 9px;
  font-weight: 500;
  color: var(--faint);
  text-align: right;
}

.prev-rail {
  position: relative;
  width: 6px;
  height: 68px;
  border-radius: 999px;
  background: rgba(10, 16, 38, 0.88);
  border: 1px solid rgba(143, 176, 255, 0.25);
}

.prev-rail i {
  position: absolute;
  left: -9px;
  top: 32px;
  width: 24px;
  height: 16px;
  border-radius: 4px;
  background: #3b82f6;
  border: 1px solid rgba(255, 255, 255, 0.4);
}

.prev-roll {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  background: var(--surface-a, rgba(14, 21, 51, 0.95));
  border: 1px solid rgba(148, 174, 255, 0.25);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.prev-roll small {
  font-size: 9.5px;
  color: var(--muted);
  line-height: 1;
}

.prev-pause {
  min-width: 44px;
  min-height: 44px;
  padding: 5px 9px;
  border-radius: 12px;
  background: rgba(11, 16, 36, 0.88);
  border: 1px solid rgba(148, 174, 255, 0.24);
  color: var(--text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.prev-pause small {
  font-size: 9.5px;
  color: var(--muted);
  line-height: 1;
}

@media (max-height: 540px) and (orientation: landscape) {
  .tle-dock {
    top: calc(10px + var(--safe-t));
    padding: 8px 12px;
    gap: 6px;
  }
  .dock-hint {
    display: none;
  }
  .tle-btn {
    height: 30px;
    padding: 0 10px;
    font-size: 12px;
  }
  .dock-inspector {
    padding-top: 6px;
    gap: 8px;
  }
}
</style>

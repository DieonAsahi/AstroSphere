<script setup>
// Modal pemberitahuan wajib ketika akun dinonaktifkan oleh pengelola.
// Tidak dapat ditutup dengan tombol Esc, klik luar dialog, ataupun tombol tutup.
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { store, acknowledgeBannedModal } from '~/composables/useGame.js';

const confirmBtnRef = ref(null);
let keyListenerAttached = false;

function handleCaptureKeydown(e) {
  if (!store.bannedModal.show) return;
  if (e.code === 'Escape' || e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return;
  }
  // Cegah pintasan permainan tetap berjalan; hanya izinkan Enter/Spasi saat fokus pada tombol utama
  const isActionKey = e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space';
  if (!isActionKey || e.target !== confirmBtnRef.value) {
    e.preventDefault();
    e.stopPropagation();
  }
}

function attachKeyGuard() {
  if (typeof window === 'undefined' || keyListenerAttached) return;
  keyListenerAttached = true;
  window.addEventListener('keydown', handleCaptureKeydown, true);
}

function detachKeyGuard() {
  if (typeof window === 'undefined' || !keyListenerAttached) return;
  keyListenerAttached = false;
  window.removeEventListener('keydown', handleCaptureKeydown, true);
}

watch(
  () => store.bannedModal.show,
  async (shown) => {
    if (shown) {
      attachKeyGuard();
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      await nextTick();
      confirmBtnRef.value?.focus?.();
    } else {
      detachKeyGuard();
    }
  },
  { immediate: true }
);

onBeforeUnmount(detachKeyGuard);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="store.bannedModal.show"
      class="disabled-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="disabled-modal-title"
      aria-describedby="disabled-modal-desc"
      @pointerdown.stop
      @mousedown.stop
      @click.stop
    >
      <div class="disabled-dialog" @pointerdown.stop @mousedown.stop @click.stop>
        <div class="disabled-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>

        <span class="disabled-eyebrow">PEMBERITAHUAN AKUN</span>
        <h2 id="disabled-modal-title" class="disabled-title">Akun Dinonaktifkan</h2>

        <p id="disabled-modal-desc" class="disabled-desc">
          Akun Anda telah dinonaktifkan oleh pengelola sehingga sesi bermain dihentikan. Anda tetap dapat menjelajah sebagai tamu atau masuk menggunakan akun lain.
        </p>

        <div v-if="store.bannedModal.reason" class="disabled-reason-box">
          <span class="reason-label">Alasan Penonaktifan</span>
          <p class="reason-text">{{ store.bannedModal.reason }}</p>
        </div>

        <button
          ref="confirmBtnRef"
          type="button"
          class="disabled-action-btn"
          @click="acknowledgeBannedModal"
        >
          Mengerti &amp; Keluar
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.disabled-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(5, 8, 20, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.disabled-dialog {
  width: min(430px, 100%);
  padding: 28px 24px 24px;
  border-radius: 14px;
  background: rgba(11, 16, 33, 0.96);
  border: 1px solid rgba(248, 113, 113, 0.34);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.72), 0 0 28px rgba(239, 68, 68, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  font-family: var(--font, 'Poppins', system-ui, -apple-system, sans-serif);
}

.disabled-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fca5a5;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
}

.disabled-eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fca5a5;
  text-transform: uppercase;
}

.disabled-title {
  margin: 0;
  font-family: var(--display, 'Poppins', system-ui, -apple-system, sans-serif);
  font-size: 20px;
  font-weight: 600;
  line-height: 1.25;
  color: #f8fafc;
}

.disabled-desc {
  margin: 2px 0 0;
  font-size: 13.5px;
  font-weight: 400;
  line-height: 1.6;
  color: #cbd5e1;
}

.disabled-reason-box {
  width: 100%;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.09);
  border: 1px solid rgba(248, 113, 113, 0.25);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reason-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #fca5a5;
}

.reason-text {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  color: #fee2e2;
  word-break: break-word;
}

.disabled-action-btn {
  width: 100%;
  height: 44px;
  min-height: 44px;
  margin-top: 10px;
  border: none;
  border-radius: 10px;
  background: var(--blue, #3b82f6);
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4);
  transition: filter 0.15s ease, transform 0.12s ease;
}

.disabled-action-btn:hover {
  filter: brightness(1.1);
}

.disabled-action-btn:active {
  transform: translateY(1px);
}

.disabled-action-btn:focus-visible {
  outline: 2px solid #7dd3fc;
  outline-offset: 2px;
}

@media (max-height: 540px) and (orientation: landscape) {
  .disabled-overlay {
    padding: calc(6px + var(--safe-t)) calc(12px + var(--safe-r)) calc(6px + var(--safe-b)) calc(12px + var(--safe-l));
  }
  .disabled-dialog {
    padding: 14px 18px 14px;
    gap: 6px;
    max-height: calc(100dvh - 16px);
    overflow-y: auto;
    width: min(440px, 100%);
  }
  .disabled-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 0;
  }
  .disabled-icon svg { width: 18px; height: 18px; }
  .disabled-title { font-size: 16px; }
  .disabled-desc { font-size: 12px; line-height: 1.45; }
  .disabled-reason-box { padding: 8px 10px; margin-top: 2px; }
  .reason-text { font-size: 12px; }
  .disabled-action-btn { height: 36px; min-height: 36px; margin-top: 6px; font-size: 13px; }
}
</style>

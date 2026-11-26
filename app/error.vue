<script setup>
// Halaman Error Global AstroSphere (404 / 500 / Fatal Error)
// Tidak pernah menampilkan error.message maupun error.stack teknis kepada pengguna.
import { computed } from 'vue';
import { clearError } from '#app';

const props = defineProps({
  error: {
    type: Object,
    default: () => ({}),
  },
});

const isNotFound = computed(() => Number(props.error?.statusCode) === 404);

const titleText = computed(() => (isNotFound.value
  ? 'Halaman Tidak Ditemukan'
  : 'Halaman Belum Bisa Diakses'));

const descText = computed(() => (isNotFound.value
  ? 'Halaman tidak ditemukan atau belum tersedia.'
  : 'Saat ini halaman masih belum bisa diakses. Silakan coba beberapa saat lagi.'));

function goHome() {
  clearError({ redirect: '/' });
}

function reloadPage() {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
</script>

<template>
  <main class="err-screen">
    <div class="err-glow" aria-hidden="true" />
    <div class="err-card" role="alert">
      <div class="err-badge">
        <UiIcon name="logo" :size="28" />
        <span>ASTROSPHERE</span>
      </div>

      <span v-if="!isNotFound" class="err-code">GANGGUAN</span>
      <h1 class="err-title">{{ titleText }}</h1>
      <p class="err-desc">{{ descText }}</p>

      <div class="err-actions">
        <button
          v-if="!isNotFound"
          type="button"
          class="btn-err secondary"
          @click="reloadPage"
        >
          <UiIcon name="ulang" :size="16" />
          <span>Muat Ulang</span>
        </button>
        <button
          type="button"
          class="btn-err primary"
          @click="goHome"
        >
          <UiIcon name="kembali" :size="16" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
.err-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 50% 25%, #111c42 0%, #060a1a 70%);
  color: #f1f5f9;
  font-family: 'Poppins', system-ui, -apple-system, sans-serif;
}

.err-glow {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 108, 240, 0.22) 0%, transparent 70%);
  pointer-events: none;
}

.err-card {
  position: relative;
  width: min(460px, 100%);
  padding: 36px 28px;
  border-radius: 18px;
  background: rgba(12, 18, 42, 0.85);
  border: 1px solid rgba(148, 174, 255, 0.22);
  backdrop-filter: blur(16px);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
}

.err-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #60a5fa;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.err-code {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.14);
  border: 1px solid rgba(96, 165, 250, 0.32);
  color: #93c5fd;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.err-title {
  margin: 4px 0 0 0;
  font-size: 22px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}

.err-desc {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  color: #cbd5e1;
  line-height: 1.6;
  max-width: 360px;
}

.err-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
  width: 100%;
}

.btn-err {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, transform 0.15s;
}

.btn-err.primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-err.primary:hover {
  background: #1d4ed8;
}

.btn-err.secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 174, 255, 0.25);
  color: #e2e8f0;
}

.btn-err.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}
</style>

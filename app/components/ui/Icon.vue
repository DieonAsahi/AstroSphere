<script setup>
const props = defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 20 } });
const P = {
  logo: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="11" ry="4" transform="rotate(-28 12 12)" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  peta: '<path d="M12 3l2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  planet: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  sejarah: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  fenomena: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/>',
  kuis: '<path d="M12 3c.9 4.7 2.3 6.1 7 7-4.7.9-6.1 2.3-7 7-.9-4.7-2.3-6.1-7-7 4.7-.9 6.1-2.3 7-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  hanggar: '<path d="M12 4.5l8 14.5H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  berhenti: '<path d="M8.5 6v12M15.5 6v12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  suara: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  bisu: '<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  kamera: '<path d="M3 7h12v10H3zM16 10.5l5-3v9l-5-3z" fill="currentColor"/>',
  jeda: '<path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z" fill="currentColor"/>',
  putar: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.6 4.2 4.2 0 0 0 7 18z" fill="currentColor"/>',
  kembali: '<path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  lanjut: '<path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  tutup: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  kunci: '<rect x="5.5" y="10.5" width="13" height="9" rx="1.5" fill="currentColor"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  cek: '<path d="M5.5 12.5l4 4 9-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pengguna: '<circle cx="12" cy="8.5" r="3.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  piala: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  atur: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  jurnal: '<path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15H7.5A1.5 1.5 0 0 1 6 18.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9.5 8h6M9.5 11.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  target: '<circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" stroke="currentColor" stroke-width="1.6"/>',
  info: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 11v5.5M12 7.6v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  mata: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  ulang: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  'guling-l': '<path d="M8 7H4V3M4.6 7.2A8 8 0 1 1 4 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  'guling-r': '<path d="M16 7h4V3M19.4 7.2A8 8 0 1 0 20 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  naik: '<path d="M12 6l7 11H5z" fill="currentColor"/>',
  turun: '<path d="M12 18L5 7h14z" fill="currentColor"/>',
  arahkan: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  admin: '<path d="M7 17L17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false" v-html="P[name] || ''" />
</template>

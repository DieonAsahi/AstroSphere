<script setup>
// Ikon garis membulat (24×24). Dekoratif: selalu aria-hidden; tombol ikon wajib punya aria-label sendiri.
const props = defineProps({ name: { type: String, required: true }, size: { type: [Number, String], default: 22 } });
const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const P = {
  logo: `<circle cx="12" cy="12" r="6.5" ${S}/><path d="M3.2 15.6c-1.4 1.7-1.6 3-.6 3.6 1.9 1.1 7.6-1.3 12.7-5.3 5.1-4 8.1-8.6 6.2-9.7-1-.6-2.4-.1-4.2 1.2" ${S}/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16" ${S}/>`,
  pengguna: `<circle cx="12" cy="8.5" r="3.8" ${S}/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6" ${S}/>`,
  bintang: '<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill="currentColor"/>',
  'bintang-o': `<path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" ${S}/>`,
  peta: `<path d="M9 4.5L3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6z" ${S}/><path d="M9 4.5v13M15 6.6v13" ${S}/>`,
  planet: `<circle cx="12" cy="12" r="6" ${S}/><path d="M4.7 15.2C2.6 17 2 18.6 2.9 19.3c1.6 1.2 6.4-.7 10.7-4.1s7-7.6 5.4-8.8c-.8-.6-2.3-.3-4.1.8" ${S}/>`,
  sejarah: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 7.5V12l3 2" ${S}/>`,
  fenomena: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor"/>`,
  kuis: `<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z" ${S}/><path d="M10 8.6a2.1 2.1 0 1 1 2.6 2c-.4.1-.6.5-.6.9v.4M12 14.1v.1" ${S}/>`,
  hanggar: `<path d="M12 2.8c3 2.2 4.5 5.5 4.5 9.6v3.6h-9v-3.6c0-4.1 1.5-7.4 4.5-9.6z" ${S}/><path d="M7.5 13l-3 2.6V19l3-1.5M16.5 13l3 2.6V19l-3-1.5M10 19.5l2 2 2-2" ${S}/><circle cx="12" cy="9.5" r="1.6" ${S}/>`,
  jurnal: `<path d="M5.5 4.5A1.5 1.5 0 0 1 7 3h11.5v15H7a1.5 1.5 0 0 0-1.5 1.5zM5.5 19.5A1.5 1.5 0 0 0 7 21h11.5v-3" ${S}/><path d="M9 7.5h6M9 11h4" ${S}/>`,
  kontrol: `<path d="M7.5 7.5h9a5 5 0 0 1 4.8 6.3l-.8 3a2.3 2.3 0 0 1-3.9 1L14 15.5h-4l-2.6 2.3a2.3 2.3 0 0 1-3.9-1l-.8-3a5 5 0 0 1 4.8-6.3z" ${S}/><path d="M8 10.5v3M6.5 12h3M15.5 11v.1M17.5 13v.1" ${S}/>`,
  'papan-ketik': `<rect x="2.5" y="6" width="19" height="12" rx="2.5" ${S}/><path d="M6.5 10h.1M10 10h.1M13.5 10h.1M17 10h.1M7.5 14h9" ${S}/>`,
  sentuh: `<path d="M9.5 11V5.5a1.7 1.7 0 0 1 3.4 0V10l4.3.9a2 2 0 0 1 1.6 2.2l-.6 4.6a3.3 3.3 0 0 1-3.3 2.8h-3.1a3.3 3.3 0 0 1-2.6-1.3L6 15.4a1.6 1.6 0 0 1 2.4-2.1l1.1 1.1" ${S}/>`,
  atur: `<circle cx="12" cy="12" r="3" ${S}/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.4A7.5 7.5 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.5 7.5 0 0 0 2.6 1.5l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.6-1.5l2.4.9 2-3.4z" ${S}/>`,
  keluar: `<path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5L5.5 12 10 7.5M5.5 12H15" ${S}/>`,
  putar: '<path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l10.6-6.8a1 1 0 0 0 0-1.8L9.5 4.3A1 1 0 0 0 8 5.2z" fill="currentColor"/>',
  jeda: '<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>',
  ulang: `<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.8h3.8" ${S}/>`,
  kilat: '<path d="M13.2 2.5L5 13.4h6l-1.2 8.1L18 10.6h-6z" fill="currentColor"/>',
  rem: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M8 12h8" ${S}/>`,
  gas: `<path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" ${S}/>`,
  naik: `<path d="M6 15l6-6 6 6" ${S}/>`,
  turun: `<path d="M6 9l6 6 6-6" ${S}/>`,
  kembali: `<path d="M14.5 6l-6 6 6 6" ${S}/>`,
  lanjut: `<path d="M9.5 6l6 6-6 6" ${S}/>`,
  tutup: `<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${S}/>`,
  cek: `<path d="M5 12.5l4.2 4.2L19 7" ${S}/>`,
  silang: `<path d="M7 7l10 10M17 7L7 17" ${S}/>`,
  kunci: `<rect x="5.5" y="10.5" width="13" height="9.5" rx="2" ${S}/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${S}/>`,
  suara: `<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" ${S}/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" ${S}/>`,
  info: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 11v5.5M12 7.6v.1" ${S}/>`,
  mata: `<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" ${S}/><circle cx="12" cy="12" r="3" ${S}/>`,
  target: `<circle cx="12" cy="12" r="7" ${S}/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>`,
  lokasi: `<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z" ${S}/><circle cx="12" cy="10" r="2.3" ${S}/>`,
  orbit: `<ellipse cx="12" cy="12" rx="9" ry="5" ${S} stroke-dasharray="2.5 3"/><circle cx="12" cy="12" r="2.3" fill="currentColor"/><circle cx="20.6" cy="10.6" r="1.6" fill="currentColor"/>`,
  sumbu: `<circle cx="12" cy="12" r="6" ${S}/><path d="M9 2.5l6 19" ${S}/>`,
  matahari: `<circle cx="12" cy="12" r="4.2" ${S}/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5" ${S}/>`,
  bulan: `<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" ${S}/>`,
  piala: `<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7" ${S}/>`,
  plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
  minus: `<path d="M5 12h14" ${S}/>`,
  mouse: `<rect x="6.5" y="3" width="11" height="18" rx="5.5" ${S}/><path d="M12 7v3" ${S}/>`,
};
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" focusable="false" v-html="P[name] || ''" />
</template>

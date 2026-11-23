<script setup>
// Rute Penangkap Sub-Jalur Pengelola Tak Dikenal (/admin/*)
// Mencegah penjelajahan liar pada sub-path admin dan memastikan rute fail-closed
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
});

if (process.client) {
  await navigateTo('/admin', { replace: true });
}
</script>

<template>
  <div class="admin-fallback-redirect" style="padding: 48px; text-align: center; color: #94a3b8; font-family: 'Poppins', system-ui, -apple-system, sans-serif;">
    <p>Halaman pengelola tidak ditemukan. Mengalihkan kembali ke dasbor...</p>
  </div>
</template>

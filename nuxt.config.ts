// AstroSphere — Nuxt 4, mode SPA (game WebGL berjalan sepenuhnya di sisi klien)
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'AstroSphere — Game Belajar Tata Surya',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no' },
        { name: 'theme-color', content: '#060a1a' },
        { name: 'description', content: 'Game belajar tata surya di browser: terbangkan pesawat, singgahi delapan planet, lihat fenomenanya, dan kumpulkan bintang dari kuis.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'preload', as: 'image', href: '/img/bg-earth.webp', type: 'image/webp' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Lexend:wght@400;500;600&display=swap' },
      ],
    },
  },
  vite: {
    optimizeDeps: { include: ['three'] },
  },
})

// AstroSphere — Nuxt 4, mode SPA (game WebGL berjalan sepenuhnya di sisi klien)
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'AstroSphere — Jelajah Tata Surya 3D',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no' },
        { name: 'theme-color', content: '#02040a' },
        { name: 'description', content: 'Game edukasi tata surya 3D: terbangkan pesawat, kenali delapan planet, telusuri sejarah eksplorasi, pelajari gerhana, dan kerjakan kuis.' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap' },
      ],
    },
  },
  vite: {
    optimizeDeps: { include: ['three'] },
  },
})

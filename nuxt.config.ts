// AstroSphere — Nuxt 4, mode SPA (game WebGL berjalan sepenuhnya di sisi klien)
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://*.sketchfab.com https://images-assets.nasa.gov https://*.nasa.gov https://upload.wikimedia.org; media-src 'self' data: blob: https://*.supabase.co; connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com; worker-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    },
    '/admin/**': {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      },
    },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL
        || process.env.SUPABASE_URL
        || process.env.VITE_SUPABASE_URL
        || process.env.NEXT_PUBLIC_SUPABASE_URL
        || '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
        || process.env.SUPABASE_ANON_KEY
        || process.env.SUPABASE_KEY
        || process.env.VITE_SUPABASE_ANON_KEY
        || process.env.VITE_SUPABASE_KEY
        || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        || '',
      dataSource: process.env.DATA_SOURCE || process.env.NUXT_PUBLIC_DATA_SOURCE || 'auto',
    },
  },
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
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap' },
      ],
    },
  },
  vite: {
    optimizeDeps: { include: ['three', '@supabase/supabase-js'] },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  },
})

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AppProvider } from './app/providers/AppProvider';
import { router } from './app/router';
import { initMonitoring } from './lib/monitoring';
import './styles/global.css';

// Inisialisasi monitoring & analitik ramah privasi anak (UU PDP)
initMonitoring();

// Daftarkan service worker untuk caching aset offline di sekolah
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[AstroSphere PWA] Pembaruan aplikasi tersedia.');
    },
    onOfflineReady() {
      console.log('[AstroSphere PWA] Aplikasi siap digunakan secara offline.');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </StrictMode>,
);

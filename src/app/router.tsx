import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RouteLoadingFallback } from '../ui/RouteLoadingFallback';
import { AppLayout } from './AppLayout';

// Pemisahan kode berbasis rute (Route Code-Splitting) untuk efisiensi muat awal
const PlayerHomePage = lazy(() => import('./(player)/page'));

// Admin Mission Control & CMS Sub-Modules (A01 - A05)
const AdminLoginPage = lazy(() => import('./admin/login/page'));
const AdminDashboardLayout = lazy(() => import('./admin/(dashboard)/layout'));
const AdminDashboardPage = lazy(() => import('./admin/(dashboard)/page'));
const AdminPlanetsPage = lazy(() => import('./admin/(dashboard)/planets/page'));
const AdminHistoryPage = lazy(() => import('./admin/(dashboard)/history/page'));
const AdminPhenomenaPage = lazy(() => import('./admin/(dashboard)/phenomena/page'));
const AdminQuizzesPage = lazy(() => import('./admin/(dashboard)/quizzes/page'));

// Static Info Pages
const PrivacyPolicyPage = lazy(() =>
  import('../features/classes/PrivacyPolicyPage').then((m) => ({
    default: m.PrivacyPolicyPage,
  })),
);
const AboutPage = lazy(() =>
  import('../features/about/AboutPage').then((m) => ({
    default: m.AboutPage,
  })),
);
const StylesPage = lazy(() =>
  import('./pages/StylesPage').then((m) => ({ default: m.StylesPage })),
);

const styleRoute = import.meta.env.DEV
  ? [
      {
        path: '/gaya',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <StylesPage />
          </Suspense>
        ),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // 1. Rute Pemain Utama (3D WebGL Engine + HUD)
      {
        path: '/',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <PlayerHomePage />
          </Suspense>
        ),
      },
      {
        path: '/planet/:planetSlug',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <PlayerHomePage />
          </Suspense>
        ),
      },
      {
        path: '/planet/:planetSlug/:poiSlug',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <PlayerHomePage />
          </Suspense>
        ),
      },

      // 2. Autentikasi Khusus Admin (Tanpa Registrasi Publik)
      {
        path: '/admin/login',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminLoginPage />
          </Suspense>
        ),
      },

      // 3. CMS Admin & Mission Control (Dilindungi Whitelist public.admin_users)
      {
        path: '/admin',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminDashboardLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminDashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'planets',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminPlanetsPage />
              </Suspense>
            ),
          },
          {
            path: 'history',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminHistoryPage />
              </Suspense>
            ),
          },
          {
            path: 'phenomena',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminPhenomenaPage />
              </Suspense>
            ),
          },
          {
            path: 'quizzes',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminQuizzesPage />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: <Navigate to="/admin" replace />,
          },
        ],
      },

      // 4. Kebijakan Privasi & Kepatuhan UU PDP
      {
        path: '/kebijakan-privasi',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <PrivacyPolicyPage />
          </Suspense>
        ),
      },

      // 5. Halaman Tentang dan Kredit Aset
      {
        path: '/tentang',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AboutPage />
          </Suspense>
        ),
      },
      ...styleRoute,
    ],
  },
]);

import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RoleGuard } from '../features/classes/RoleGuard';
import { RouteLoadingFallback } from '../ui/RouteLoadingFallback';
import { AppLayout } from './AppLayout';
// Pemisahan kode berbasis rute (Route Code-Splitting) untuk efisiensi muat awal
const PlayerHomePage = lazy(() => import('./(player)/page'));
const AuthPage = lazy(() =>
  import('../features/classes/AuthPage').then((m) => ({ default: m.AuthPage })),
);
const ClassesPage = lazy(() =>
  import('../features/classes/ClassesPage').then((m) => ({
    default: m.ClassesPage,
  })),
);
const PrivacyPolicyPage = lazy(() =>
  import('../features/classes/PrivacyPolicyPage').then((m) => ({
    default: m.PrivacyPolicyPage,
  })),
);
const MyExplorationsPage = lazy(() =>
  import('../features/progress/MyExplorationsPage').then((m) => ({
    default: m.MyExplorationsPage,
  })),
);
const AdminMetricsPage = lazy(() =>
  import('../features/metrics/AdminMetricsPage').then((m) => ({
    default: m.AdminMetricsPage,
  })),
);
const AdminCmsPage = lazy(() =>
  import('../features/cms/AdminCmsPage').then((m) => ({
    default: m.AdminCmsPage,
  })),
);
// Admin Mission Control & CMS Sub-Modules
const AdminLoginPage = lazy(() => import('./admin/login/page'));
const AdminDashboardLayout = lazy(() => import('./admin/(dashboard)/layout'));
const AdminDashboardPage = lazy(() => import('./admin/(dashboard)/page'));
const AdminPlanetsPage = lazy(() => import('./admin/(dashboard)/planets/page'));
const AdminHistoryPage = lazy(() => import('./admin/(dashboard)/history/page'));
const AdminPhenomenaPage = lazy(() => import('./admin/(dashboard)/phenomena/page'));
const AdminQuizzesPage = lazy(() => import('./admin/(dashboard)/quizzes/page'));
const AdminShipsPage = lazy(() => import('./admin/(dashboard)/ships/page'));
const AdminPlayersPage = lazy(() => import('./admin/(dashboard)/players/page'));
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
      // Autentikasi
      {
        path: '/masuk',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthPage initialMode="masuk" />
          </Suspense>
        ),
      },
      {
        path: '/daftar',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthPage initialMode="daftar" />
          </Suspense>
        ),
      },
      {
        path: '/lupa-sandi',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthPage initialMode="lupa-sandi" />
          </Suspense>
        ),
      },
      // Manajemen Kelas (Terlindungi Route Guard)
      {
        path: '/kelas',
        element: (
          <RoleGuard allowedRoles={['siswa', 'guru', 'admin']}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <ClassesPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      // Progres Siswa: Jelajahku (FR-09)
      {
        path: '/jelajahku',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <MyExplorationsPage />
          </Suspense>
        ),
      },
      // Autentikasi Khusus Admin (Tanpa Registrasi Publik)
      {
        path: '/admin/login',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminLoginPage />
          </Suspense>
        ),
      },
      // CMS Admin & Mission Control (Dilindungi Whitelist public.admin_users)
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
            path: 'ships',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminShipsPage />
              </Suspense>
            ),
          },
          {
            path: 'players',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminPlayersPage />
              </Suspense>
            ),
          },
          {
            path: 'metrik',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminMetricsPage />
              </Suspense>
            ),
          },
          {
            path: 'cms-observatorium',
            element: (
              <Suspense fallback={<RouteLoadingFallback />}>
                <AdminCmsPage />
              </Suspense>
            ),
          },
        ],
      },
      // Kebijakan Privasi & Kepatuhan UU PDP
      {
        path: '/kebijakan-privasi',
        element: (
          <Suspense fallback={<RouteLoadingFallback />}>
            <PrivacyPolicyPage />
          </Suspense>
        ),
      },
      // Halaman Tentang dan Kredit Aset
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

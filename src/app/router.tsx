import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { RoleGuard } from '../features/classes/RoleGuard';
import { RouteLoadingFallback } from '../ui/RouteLoadingFallback';
import { AppLayout } from './AppLayout';
import { HomePage } from './pages/HomePage';

// Pemisahan kode berbasis rute (Route Code-Splitting) untuk efisiensi muat awal
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
      { path: '/', element: <HomePage /> },
      { path: '/planet/:planetSlug', element: <HomePage /> },
      {
        path: '/planet/:planetSlug/:poiSlug',
        element: <HomePage />,
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
      // Metrik KPI 30 FPS Admin (FR-12)
      {
        path: '/admin/metrik',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AdminMetricsPage />
            </Suspense>
          </RoleGuard>
        ),
      },
      // CMS Admin Observatorium (FR-11)
      {
        path: '/admin',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AdminCmsPage />
            </Suspense>
          </RoleGuard>
        ),
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

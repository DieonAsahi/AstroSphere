'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Globe,
  Compass,
  Sparkles,
  HelpCircle,
  LogOut,
  Search,
  Menu,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { supabase, getSupabaseConfigStatus } from '../../../lib/supabase/client';
import {
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_IDLE_WARNING_MS,
  clearAdminSessionStorage,
  getIdleRemainingMs,
  isAdminSessionIdleExpired,
  readLastActivityTimestamp,
  recordAdminActivity,
  verifyIsAdmin,
} from '../../../lib/supabase/adminAuth';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// 5 Menu Resmi Sesuai Desain A01 - A05
const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Planet', href: '/admin/planets', icon: Globe },
  { name: 'Sejarah & POI', href: '/admin/history', icon: Compass },
  { name: 'Fenomena', href: '/admin/phenomena', icon: Sparkles },
  { name: 'Kuis', href: '/admin/quizzes', icon: HelpCircle },
];

export default function AdminDashboardLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>('Admin AstroSphere');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const lastActivityThrottleRef = useRef<number>(0);
  const loggingOutRef = useRef<boolean>(false);

  const performSecureSignOut = useCallback(
    async (redirectTo: string) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      setLoading(true);
      setAdminEmail(null);
      setAdminName('Admin AstroSphere');
      setIdleWarningSeconds(null);
      clearAdminSessionStorage();
      try {
        await supabase.auth.signOut();
      } catch {
        // Tetap paksa redirect fail-closed meski network signOut gagal
      }
      navigate(redirectTo, { replace: true });
    },
    [navigate]
  );

  // Validasi sesi awal (FAIL-CLOSED) + pantau perubahan auth real-time antar tab
  useEffect(() => {
    let isMounted = true;
    loggingOutRef.current = false;

    async function checkAdminAuth() {
      try {
        if (!getSupabaseConfigStatus().configured) {
          if (isMounted) {
            setLoading(true);
            setAdminEmail(null);
            navigate('/admin/login', { replace: true });
          }
          return;
        }

        // Cek batas idle 5 menit bahkan jika tab/browser sempat ditutup lalu dibuka kembali
        const persistedLastActivity = readLastActivityTimestamp();
        if (
          persistedLastActivity !== null &&
          isAdminSessionIdleExpired(persistedLastActivity, Date.now(), ADMIN_IDLE_TIMEOUT_MS)
        ) {
          if (isMounted) {
            await performSecureSignOut('/admin/login?reason=idle_timeout');
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session ||
          !session.access_token ||
          (session.expires_at && session.expires_at * 1000 <= Date.now())
        ) {
          if (isMounted) {
            await performSecureSignOut('/admin/login');
          }
          return;
        }

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            await performSecureSignOut('/admin/login');
          }
          return;
        }

        const isAuthorized = await verifyIsAdmin(user);

        if (!isAuthorized) {
          if (isMounted) {
            await performSecureSignOut('/admin/login?error=unauthorized');
          }
          return;
        }

        if (isMounted) {
          const email = user.email || '';
          const metaName =
            (user.user_metadata?.full_name as string) ||
            (user.user_metadata?.name as string);
          const computedName =
            metaName && metaName.trim() ? metaName.trim() : email.split('@')[0];

          recordAdminActivity(Date.now());
          setAdminEmail(email || 'admin@astrosphere.edu');
          setAdminName(computedName || 'Admin AstroSphere');
          setLoading(false);
        }
      } catch (err) {
        console.error('Gagal memverifikasi admin:', err);
        if (isMounted) {
          await performSecureSignOut('/admin/login');
        }
      }
    }

    checkAdminAuth();

    // Listener perubahan sesi (logout di tab lain, token expired, atau switch akun)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (isMounted) {
          void performSecureSignOut('/admin/login');
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void checkAdminAuth();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, performSecureSignOut]);

  // Pemantau Idle Session 5 Menit (300.000 ms) dengan throttling & sinkronisasi antar-tab
  useEffect(() => {
    if (loading) return;

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityThrottleRef.current < 1000) return;
      lastActivityThrottleRef.current = now;
      recordAdminActivity(now);
      setIdleWarningSeconds((prev) => (prev !== null ? null : prev));
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    for (const evt of activityEvents) {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    }

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === ADMIN_ACTIVITY_STORAGE_KEY) {
        if (e.newValue === null) {
          void performSecureSignOut('/admin/login?reason=idle_timeout');
        } else {
          setIdleWarningSeconds(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageSync);

    const idleInterval = window.setInterval(() => {
      const lastActivity = readLastActivityTimestamp();
      const remainingMs = getIdleRemainingMs(
        lastActivity,
        Date.now(),
        ADMIN_IDLE_TIMEOUT_MS
      );

      if (remainingMs <= 0) {
        void performSecureSignOut('/admin/login?reason=idle_timeout');
        return;
      }

      if (remainingMs <= ADMIN_IDLE_WARNING_MS) {
        setIdleWarningSeconds(Math.max(1, Math.ceil(remainingMs / 1000)));
      } else {
        setIdleWarningSeconds((prev) => (prev !== null ? null : prev));
      }
    }, 1000);

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, handleUserActivity);
      }
      window.removeEventListener('storage', handleStorageSync);
      window.clearInterval(idleInterval);
    };
  }, [loading, performSecureSignOut]);

  // Tutup mobile drawer dengan tombol Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await performSecureSignOut('/admin/login');
  };

  // Breadcrumb dinamis
  const breadcrumbTitle = useMemo(() => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/planets')) return 'Data Planet';
    if (pathname.startsWith('/admin/history')) return 'Sejarah & POI';
    if (pathname.startsWith('/admin/phenomena')) return 'Fenomena Astronomi';
    if (pathname.startsWith('/admin/quizzes')) return 'Kuis';
    return 'Console';
  }, [pathname]);

  // Initials admin avatar
  const initials = useMemo(() => {
    if (adminName && adminName !== 'Admin AstroSphere') {
      const parts = adminName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (adminEmail) {
      const clean = adminEmail.split('@')[0].toUpperCase();
      return clean.slice(0, 2);
    }
    return 'AA';
  }, [adminName, adminEmail]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 animate-pulse">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AstroSphere CMS Console</h2>
            <p className="text-xs text-slate-500">Memvalidasi akses administrator...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* =========================================================================
          1. SIDEBAR NAVIGASI (Mobile Drawer <768px | Compact Tablet 768-1023px | Full >=1024px)
          ========================================================================= */}
      <aside
        aria-label="Navigasi Panel Admin"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out md:static md:translate-x-0 md:w-20 lg:w-64 ${
          mobileMenuOpen ? 'w-64 translate-x-0 shadow-2xl' : 'w-64 -translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between md:justify-center lg:justify-between border-b border-slate-100 px-5 md:px-2 lg:px-5">
          <Link
            to="/admin"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            onClick={() => setMobileMenuOpen(false)}
            title="AstroSphere CMS Console"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Globe className="h-5 w-5" />
            </div>
            <div className="md:hidden lg:block">
              <span className="font-bold tracking-tight text-slate-900 text-base leading-tight block">
                AstroSphere
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                CMS Console
              </span>
            </div>
          </Link>
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 5 Menu Utama */}
        <div className="flex-1 overflow-y-auto px-3.5 md:px-2.5 lg:px-3.5 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                title={item.name}
                className={`group flex items-center gap-3 md:justify-center lg:justify-start rounded-xl px-3.5 md:px-2 lg:px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 md:h-5 md:w-5 lg:h-4 lg:w-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate md:hidden lg:inline">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-4 md:p-2.5 lg:p-4 space-y-3">
          {/* Status Online */}
          <div
            className="flex items-center justify-between md:justify-center lg:justify-between px-1 text-xs text-slate-500 font-medium"
            title="Sistem Online • AstroSphere v3.8"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
              <span className="md:hidden lg:inline">Sistem Online</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono md:hidden lg:inline">v3.8</span>
          </div>

          {/* Admin Profile & Logout */}
          <div className="flex items-center justify-between md:flex-col md:gap-2 md:p-2 lg:flex-row lg:justify-between lg:p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0"
                title={`${adminName} (${adminEmail || 'admin@astrosphere.edu'})`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1 md:hidden lg:block">
                <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                  {adminName}
                </p>
                <p className="truncate text-[10px] text-slate-500">
                  {adminEmail || 'admin@astrosphere.edu'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
              title="Keluar dari panel admin"
              aria-label="Keluar dari panel admin"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA + TOP HEADER BAR
          ========================================================================= */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex flex-col border-b border-slate-200 bg-white">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Buka menu navigasi"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <Link to="/admin" className="hover:text-slate-900 transition-colors">
                  CMS
                </Link>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-900">{breadcrumbTitle}</span>
              </div>
            </div>

            {/* Search Bar & Profile Badge */}
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Mobile Search Toggle Button */}
              <button
                type="button"
                aria-label="Cari konten"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className={`rounded-lg p-2 sm:hidden transition-colors ${
                  mobileSearchOpen || searchQuery
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Search className="h-4 w-4" />
              </button>

              {/* Quick Search (Desktop & Tablet) */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari konten..."
                  className="w-44 lg:w-64 rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Bersihkan pencarian"
                    title="Bersihkan pencarian"
                    className="absolute right-2.5 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Link ke Jelajah Game 3D */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                title="Buka kanvas 3D pemain"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Lihat Kanvas 3D</span>
              </a>

              {/* Top User Badge */}
              <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 sm:pl-4">
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {adminName}
                  </span>
                  <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                    {adminEmail || 'Administrator'}
                  </span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                  {initials}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Search Bar Expandable Row */}
          {mobileSearchOpen && (
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-2.5 sm:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari planet, sejarah, fenomena, kuis..."
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-8 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-2.5 top-2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl space-y-5">
            {idleWarningSeconds !== null && (
              <div
                role="alert"
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-900 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Peringatan Sesi Idle:</strong> Tidak ada aktivitas terdeteksi. Demi keamanan, Anda akan dikeluarkan otomatis dalam{' '}
                    <strong className="font-mono">{idleWarningSeconds} detik</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    recordAdminActivity(Date.now());
                    setIdleWarningSeconds(null);
                  }}
                  className="self-start sm:self-auto rounded-lg border border-amber-300 bg-white hover:bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors shrink-0"
                >
                  Tetap Masuk
                </button>
              </div>
            )}
            {children ?? <Outlet context={{ searchQuery }} />}
          </div>
        </main>
      </div>
    </div>
  );
}

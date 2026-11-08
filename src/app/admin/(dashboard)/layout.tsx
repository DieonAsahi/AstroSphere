'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Validasi sesi admin dengan Supabase Auth + RPC public.is_admin() / admin_users
  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          navigate('/admin/login', { replace: true });
          return;
        }

        let isAuthorized = false;
        try {
          const { data: rpcAdmin } = await supabase.rpc('is_admin');
          if (rpcAdmin === true) isAuthorized = true;
        } catch {
          // Lanjutkan cek manual
        }

        if (!isAuthorized) {
          const userEmail = user.email || '';
          const { data: adminRecord } = await supabase
            .from('admin_users')
            .select('email')
            .or(`user_id.eq.${user.id},email.ilike.${userEmail}`)
            .maybeSingle();

          if (adminRecord) isAuthorized = true;
        }

        if (!isAuthorized) {
          await supabase.auth.signOut();
          navigate('/admin/login?error=unauthorized', { replace: true });
          return;
        }

        if (isMounted) {
          setAdminEmail(user.email || 'Admin AstroSphere');
          setLoading(false);
        }
      } catch (err) {
        console.error('Gagal memverifikasi admin:', err);
        navigate('/admin/login', { replace: true });
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/admin/login', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/admin/login', { replace: true });
    }
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
    if (!adminEmail) return 'AA';
    const clean = adminEmail.split('@')[0].toUpperCase();
    return clean.slice(0, 2);
  }, [adminEmail]);

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
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* =========================================================================
          1. SIDEBAR NAVIGASI (LIGHT THEME — HANYA 5 MENU SESUAI DESAIN A01 - A05)
          ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <Link
            to="/admin"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <Globe className="h-5 w-5" />
            </div>
            <div>
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
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 5 Menu Utama */}
        <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-1">
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
                className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-100 p-4 space-y-3">
          {/* Status Online */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Sistem Online</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">v3.8</span>
          </div>

          {/* Admin Profile & Logout */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 p-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800 leading-tight">
                  Dr. Eleanor Vance
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
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
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari konten..."
                className="w-44 lg:w-60 rounded-xl border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all"
              />
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
                  Dr. Eleanor Vance
                </span>
                <span className="block text-[10px] text-slate-400">Admin AstroSphere</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-sm">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl">{children ?? <Outlet />}</div>
        </main>
      </div>
    </div>
  );
}

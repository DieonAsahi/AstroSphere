'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  MapPin,
  Sparkles,
  HelpCircle,
  Rocket,
  Users,
  LogOut,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Data Planet', href: '/admin/planets', icon: Globe, badge: '8' },
  { name: 'Sejarah & POI', href: '/admin/history', icon: MapPin },
  { name: 'Fenomena Astronomi', href: '/admin/phenomena', icon: Sparkles },
  { name: 'Bank Soal Kuis', href: '/admin/quizzes', icon: HelpCircle },
  { name: 'Hanggar Pesawat', href: '/admin/ships', icon: Rocket, badge: '3' },
  { name: 'Progres Pemain', href: '/admin/players', icon: Users, badge: 'Cloud' },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAuth() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/admin/login');
          return;
        }

        // Verifikasi ke whitelist public.admin_users
        const { data: adminRecord, error: dbError } = await supabase
          .from('admin_users')
          .select('email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (dbError || !adminRecord) {
          await supabase.auth.signOut();
          router.replace('/admin/login?error=unauthorized');
          return;
        }

        if (isMounted) {
          setAdminEmail(adminRecord.email || user.email || 'Admin');
          setLoading(false);
        }
      } catch (err) {
        console.error('Gagal memverifikasi admin:', err);
        router.replace('/admin/login');
      }
    }

    checkAdminAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.replace('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <Globe className="absolute h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              AstroSphere Mission Control
            </h2>
            <p className="text-xs text-slate-400">
              Memvalidasi akses administrator...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop & Mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-md transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-6">
          <Link
            href="/admin"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[7px] bg-slate-950">
                <Globe className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-white">AstroSphere</span>
                <span className="rounded bg-indigo-500/20 px-1 py-0.5 text-[9px] font-semibold text-indigo-300 border border-indigo-500/30">
                  CMS
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                Mission Control
              </p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Modul Edukasi
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-300 hover:bg-slate-900/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 transition-colors ${
                        isActive
                          ? 'text-cyan-400'
                          : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="h-3 w-3 text-cyan-400/70" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Quick Player Mode Link in Sidebar */}
          <div className="mt-6 border-t border-slate-800/80 pt-4 px-1">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-900 hover:text-white transition-all"
            >
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-cyan-400" />
                <span>Lihat Halaman Utama (/)</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* User Identity & Logout */}
        <div className="border-t border-slate-800/80 bg-slate-950/70 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-900/80 p-2.5 border border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium text-slate-200">
                  {adminEmail || 'Administrator'}
                </span>
              </div>
              <p className="truncate text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Admin Whitelist
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Admin</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-slate-200 capitalize">
                {pathname === '/admin'
                  ? 'Ringkasan Dashboard'
                  : pathname.replace('/admin/', '').replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Supabase DB Connected</span>
            </div>

            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Rocket className="h-3.5 w-3.5 text-cyan-400" />
              <span>Lihat Halaman Utama (/)</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

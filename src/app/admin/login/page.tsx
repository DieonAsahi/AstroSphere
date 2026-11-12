'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Globe,
  Lock,
  Mail,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Compass,
  Eye,
  EyeOff,
  Clock,
} from 'lucide-react';
import { supabase, getSupabaseConfigStatus } from '../../../lib/supabase/client';
import {
  verifyIsAdmin,
  mapAdminAuthError,
  validateAdminLoginInput,
  readLoginRateLimitState,
  recordFailedLoginAttempt,
  resetLoginRateLimitState,
  getLoginCooldownRemainingMs,
  clearAdminSessionStorage,
  recordAdminActivity,
  isAdminSessionIdleExpired,
  readLastActivityTimestamp,
} from '../../../lib/supabase/adminAuth';

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    const remMs = getLoginCooldownRemainingMs(readLoginRateLimitState());
    return remMs > 0 ? Math.ceil(remMs / 1000) : 0;
  });
  const { configured: isSupabaseConfigured } = getSupabaseConfigStatus();

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      const remMs = getLoginCooldownRemainingMs(readLoginRateLimitState());
      setCooldownSeconds(remMs > 0 ? Math.ceil(remMs / 1000) : 0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    let isMounted = true;
    const errorParam = searchParams.get('error');
    const reasonParam = searchParams.get('reason');

    if (errorParam === 'unauthorized') {
      setErrorMessage(
        'Akses ditolak: Akun Anda tidak memiliki hak akses Administrator AstroSphere.'
      );
    }

    if (reasonParam === 'idle_timeout') {
      setInfoMessage(
        'Sesi Anda telah berakhir otomatis karena tidak ada aktivitas selama 5 menit. Silakan masuk kembali untuk melanjutkan.'
      );
    } else {
      setInfoMessage(null);
    }

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Konfigurasi database Supabase belum aktif. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY telah diatur di environment (.env.local / Vercel).'
      );
      setCheckingSession(false);
      return () => {
        isMounted = false;
      };
    }

    async function checkExistingSession() {
      try {
        const lastActivity = readLastActivityTimestamp();
        if (lastActivity !== null && isAdminSessionIdleExpired(lastActivity)) {
          clearAdminSessionStorage();
          await supabase.auth.signOut().catch(() => {});
          if (isMounted) setCheckingSession(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const isAdmin = await verifyIsAdmin(user);
          if (isMounted && isAdmin) {
            recordAdminActivity(Date.now());
            navigate('/admin', { replace: true });
            return;
          }
          clearAdminSessionStorage();
          await supabase.auth.signOut().catch(() => {});
        }
      } catch {
        // Fail-closed: tetap berada di halaman login jika pengecekan sesi gagal
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      isMounted = false;
    };
  }, [searchParams, navigate, isSupabaseConfigured]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setErrorMessage(
        'Konfigurasi database Supabase belum aktif. Pastikan SUPABASE_URL dan SUPABASE_ANON_KEY telah diatur di environment.'
      );
      return;
    }

    const activeCooldownMs = getLoginCooldownRemainingMs(readLoginRateLimitState());
    if (activeCooldownMs > 0) {
      const secs = Math.ceil(activeCooldownMs / 1000);
      setCooldownSeconds(secs);
      setErrorMessage(
        `Terlalu banyak percobaan gagal. Demi keamanan, tunggu ${secs} detik sebelum mencoba lagi.`
      );
      return;
    }

    // Validasi & sanitasi input anti-SQLi / karakter berbahaya
    const validation = validateAdminLoginInput(email, password);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Format input login tidak valid.');
      return;
    }

    try {
      setLoading(true);

      // 1. Otentikasi terparameterisasi Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: validation.email,
        password: validation.password,
      });

      if (signInError || !data.user) {
        const nextLimit = recordFailedLoginAttempt();
        const lockSecs = Math.ceil(getLoginCooldownRemainingMs(nextLimit) / 1000);
        if (lockSecs > 0) {
          setCooldownSeconds(lockSecs);
          setErrorMessage(
            `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${lockSecs} detik.`
          );
        } else {
          setErrorMessage(mapAdminAuthError(signInError));
        }
        setLoading(false);
        return;
      }

      // 2. Verifikasi FAIL-CLOSED status admin via RPC is_admin() & public.admin_users
      const isAuthorized = await verifyIsAdmin(data.user);

      if (!isAuthorized) {
        clearAdminSessionStorage();
        await supabase.auth.signOut().catch(() => {});
        const nextLimit = recordFailedLoginAttempt();
        const lockSecs = Math.ceil(getLoginCooldownRemainingMs(nextLimit) / 1000);
        if (lockSecs > 0) {
          setCooldownSeconds(lockSecs);
          setErrorMessage(
            `Terlalu banyak percobaan login gagal. Akses dikunci sementara selama ${lockSecs} detik.`
          );
        } else {
          setErrorMessage('Email atau kata sandi salah.');
        }
        setLoading(false);
        return;
      }

      // 3. Admin terverifikasi: reset rate-limit & catat timestamp aktivitas awal
      resetLoginRateLimitState();
      recordAdminActivity(Date.now());
      navigate('/admin', { replace: true });
    } catch (err: unknown) {
      console.error('Login error:', err);
      const nextLimit = recordFailedLoginAttempt();
      const lockSecs = Math.ceil(getLoginCooldownRemainingMs(nextLimit) / 1000);
      if (lockSecs > 0) {
        setCooldownSeconds(lockSecs);
      }
      setErrorMessage(mapAdminAuthError(err));
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500 text-xs">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md animate-pulse">
          <Globe className="h-6 w-6" />
        </div>
        <span>Memeriksa sesi administrator...</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card Container */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <Globe className="h-7 w-7" />
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>AstroSphere CMS Console</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Masuk ke Panel Kontrol
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Khusus administrator dan pengelola materi edukasi antariksa.
            </p>
          </div>

          {/* Idle Timeout Info Banner */}
          {infoMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
              <Clock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1">{infoMessage}</div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Form Login (Khusus Login Saja, Tanpa Registrasi Publik) */}
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Email Administrator
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@astrosphere.edu"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cooldownSeconds > 0}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock className="h-4 w-4" />
                  <span>Tunggu {cooldownSeconds} detik...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Konsol CMS</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Info & Navigasi ke Game */}
          <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Kembali ke Jelajah 3D</span>
            </Link>
            <span className="text-[11px] text-slate-400">AstroSphere v3.8</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-xs">
          Memuat halaman login admin...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Globe, Lock, Mail, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setErrorMessage(
        'Akses ditolak: Anda harus login dengan akun Administrator untuk mengakses halaman ini.'
      );
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Harap masukkan email dan kata sandi.');
      return;
    }

    try {
      setLoading(true);

      // 1. Otentikasi Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.user) {
        setErrorMessage(
          signInError?.message === 'Invalid login credentials'
            ? 'Email atau kata sandi salah. Harap periksa kembali.'
            : signInError?.message || 'Gagal masuk. Silakan coba lagi.'
        );
        setLoading(false);
        return;
      }

      // 2. Verifikasi status whitelist di public.admin_users
      const { data: adminRecord, error: adminCheckError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminCheckError || !adminRecord) {
        // Bukan admin! Segera batalkan sesi (signOut)
        await supabase.auth.signOut();
        setErrorMessage(
          'Akses ditolak: Akun Anda tidak terdaftar sebagai Administrator AstroSphere.'
        );
        setLoading(false);
        return;
      }

      // 3. Admin terverifikasi
      router.push('/admin');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setErrorMessage('Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-12 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Card Container */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-cyan-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Globe className="h-7 w-7 text-cyan-400" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 mb-2">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>AstroSphere CMS Admin</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Masuk ke Panel Kontrol
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Khusus administrator dan pengelola materi edukasi antariksa.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Email Administrator
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@astrosphere.edu"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:opacity-95 hover:shadow-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Panel Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-8 border-t border-slate-800/80 pt-4 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Otentikasi terproteksi Supabase Auth & Whitelist PostgreSQL RLS.
              Akses hanya untuk staf berwenang.
            </p>
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
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
          Memuat halaman login...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}


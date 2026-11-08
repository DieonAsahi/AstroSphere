'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Globe, Lock, Mail, AlertTriangle, ArrowRight, ShieldCheck, Compass } from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

function LoginForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      setErrorMessage(
        'Akses ditolak: Akun Anda tidak terdaftar sebagai Administrator AstroSphere.'
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

      // 2. Verifikasi status admin via RPC is_admin() atau tabel public.admin_users
      let isAuthorized = false;
      try {
        const { data: rpcAdmin } = await supabase.rpc('is_admin');
        if (rpcAdmin === true) isAuthorized = true;
      } catch {
        // Abaikan error RPC jika belum terpasang, lanjutkan cek tabel
      }

      if (!isAuthorized) {
        const userEmail = data.user.email || email.trim();
        const { data: adminRecord } = await supabase
          .from('admin_users')
          .select('email')
          .or(`user_id.eq.${data.user.id},email.ilike.${userEmail}`)
          .maybeSingle();

        if (adminRecord) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        await supabase.auth.signOut();
        setErrorMessage(
          'Akses ditolak: Akun Anda tidak terdaftar di daftar whitelist Administrator AstroSphere.'
        );
        setLoading(false);
        return;
      }

      // 3. Admin terverifikasi
      navigate('/admin');
    } catch (err: unknown) {
      console.error('Login error:', err);
      setErrorMessage('Terjadi kesalahan pada sistem. Silakan coba beberapa saat lagi.');
      setLoading(false);
    }
  };

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

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Form Login (Khusus Login Saja, Tanpa Registrasi Publik) */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Memverifikasi Akses...</span>
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

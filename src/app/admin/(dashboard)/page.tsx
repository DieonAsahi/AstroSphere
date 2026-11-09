'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Compass,
  Sparkles,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';

interface StatCounts {
  planets: number;
  historyEvents: number;
  phenomena: number;
  questions: number;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatCounts>({
    planets: 0,
    historyEvents: 0,
    phenomena: 0,
    questions: 0,
  });

  const loadDashboardStats = useCallback(async () => {
    setError(null);
    try {
      const [planetsRes, historyRes, phenomenaRes, quizRes] = await Promise.all([
        supabase.from('planets').select('*', { count: 'exact', head: true }),
        supabase.from('history_events').select('*', { count: 'exact', head: true }),
        supabase.from('phenomena').select('*', { count: 'exact', head: true }),
        supabase.from('questions').select('*', { count: 'exact', head: true }),
      ]);

      if (planetsRes.error) throw planetsRes.error;
      if (historyRes.error) throw historyRes.error;
      if (phenomenaRes.error) throw phenomenaRes.error;
      if (quizRes.error) throw quizRes.error;

      setStats({
        planets: planetsRes.count ?? 0,
        historyEvents: historyRes.count ?? 0,
        phenomena: phenomenaRes.count ?? 0,
        questions: quizRes.count ?? 0,
      });
    } catch (err: unknown) {
      console.error('Gagal memuat count live dari Supabase:', err);
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Terjadi kegagalan saat mengambil metrik dari database Supabase.';
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardStats();
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola konten edukasi AstroSphere.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'
            }`}
          />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Error Alert Banner (R-02) */}
      {error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-red-900">Gagal Mengambil Metrik Database</p>
              <p className="text-red-700 mt-0.5 truncate">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>
      )}

      {/* 2x2 Grid Kartu Utama Sesuai Desain A01 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {/* Card 1: Data Planet */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Globe className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-6 w-28 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                  {stats.planets} Planet Terdaftar
                </span>
              )}
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Data Planet
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Kelola 8 Planet Tata Surya terdaftar beserta data skala riil, rotasi aksial, dan parameter orbit Kepler.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Unit Tata Surya</span>
            <Link
              to="/admin/planets"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>Kelola Planet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 2: Sejarah & POI */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Compass className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-6 w-28 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                  {stats.historyEvents} Entri Riwayat
                </span>
              )}
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Sejarah & POI
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Kelola linimasa eksplorasi & titik pendaratan wahana antariksa penting seperti Apollo, Voyager, dan rovers.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Titik Navigasi</span>
            <Link
              to="/admin/history"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>Kelola Sejarah</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 3: Fenomena Astronomi */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Sparkles className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-6 w-28 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                  {stats.phenomena} Skenario
                </span>
              )}
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Fenomena Astronomi
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Kelola konfigurasi simulasi gerhana, fase, transit optik, dan parameter ray-tracing umbra-penumbra.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Simulasi Optik</span>
            <Link
              to="/admin/phenomena"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>Kelola Fenomena</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Card 4: Kuis */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <HelpCircle className="h-5 w-5" />
              </div>
              {loading ? (
                <div className="h-6 w-28 rounded-full bg-slate-200 animate-pulse" />
              ) : (
                <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                  {stats.questions} Butir Soal
                </span>
              )}
            </div>

            <h2 className="mt-4 text-base font-bold text-slate-900">
              Kuis
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Kelola bank soal evaluasi edukatif planet, kunci jawaban, penjelasan ilmiah, dan penugasan modul materi.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Instrumen Evaluasi</span>
            <Link
              to="/admin/quizzes"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>Kelola Kuis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

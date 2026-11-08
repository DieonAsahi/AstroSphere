'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Globe,
  MapPin,
  Sparkles,
  HelpCircle,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Rocket,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import type { Planet } from '../../../types/database';

interface StatCounts {
  planets: number;
  historyEvents: number;
  phenomena: number;
  questions: number;
  ships: number;
  totalQuizPoints: number;
  totalShipCost: number;
}

interface PlanetCoverage {
  planet_id: string;
  nama: string;
  urutan_orbit: number;
  historyCount: number;
  phenomenaCount: number;
  quizCount: number;
  quizPoints: number;
  hasModel: boolean;
  hasTexture: boolean;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<StatCounts>({
    planets: 0,
    historyEvents: 0,
    phenomena: 0,
    questions: 0,
    ships: 0,
    totalQuizPoints: 0,
    totalShipCost: 1000,
  });
  const [coverage, setCoverage] = useState<PlanetCoverage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      // Fetch all tables in parallel
      const [
        planetsRes,
        historyRes,
        phenomenaRes,
        questionsRes,
        shipsRes,
      ] = await Promise.all([
        supabase
          .from('planets')
          .select('planet_id, nama, urutan_orbit, aset_model_url, tekstur_url')
          .order('urutan_orbit', { ascending: true }),
        supabase.from('history_events').select('event_id, planet_id'),
        supabase.from('phenomena').select('phenomenon_id, planet_id'),
        supabase.from('questions').select('question_id, planet_id, bobot_poin'),
        supabase.from('ships').select('ship_id, harga_poin'),
      ]);

      if (planetsRes.error) throw planetsRes.error;
      if (historyRes.error) throw historyRes.error;
      if (phenomenaRes.error) throw phenomenaRes.error;
      if (questionsRes.error) throw questionsRes.error;

      const planets = (planetsRes.data || []) as Planet[];
      const history = historyRes.data || [];
      const phenomena = phenomenaRes.data || [];
      const questions = questionsRes.data || [];
      const ships = shipsRes.data || [];

      const totalQuizPoints = questions.reduce(
        (sum, q) => sum + (Number(q.bobot_poin) || 50),
        0
      );
      const totalShipCost = ships
        .filter((s) => s.harga_poin > 0)
        .reduce((sum, s) => sum + Number(s.harga_poin), 0);

      setStats({
        planets: planets.length,
        historyEvents: history.length,
        phenomena: phenomena.length,
        questions: questions.length,
        ships: ships.length || 3,
        totalQuizPoints,
        totalShipCost: totalShipCost || 1000,
      });

      // Compute coverage matrix per planet
      const coverageList: PlanetCoverage[] = planets.map((p) => {
        const historyCount = history.filter((h) => h.planet_id === p.planet_id).length;
        const phenomenaCount = phenomena.filter((ph) => ph.planet_id === p.planet_id).length;
        const planetQuestions = questions.filter((q) => q.planet_id === p.planet_id);
        const quizCount = planetQuestions.length;
        const quizPoints = planetQuestions.reduce(
          (sum, q) => sum + (Number(q.bobot_poin) || 50),
          0
        );

        return {
          planet_id: p.planet_id,
          nama: p.nama,
          urutan_orbit: p.urutan_orbit,
          historyCount,
          phenomenaCount,
          quizCount,
          quizPoints,
          hasModel: Boolean(p.aset_model_url && p.aset_model_url.trim() !== ''),
          hasTexture: Boolean(p.tekstur_url && p.tekstur_url.trim() !== ''),
        };
      });

      setCoverage(coverageList);
    } catch (err: unknown) {
      console.error('Error fetching dashboard stats:', err);
      setError('Gagal memuat metrik real-time. Pastikan koneksi Supabase telah terkonfigurasi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const isEconomyBalanced = stats.totalQuizPoints >= stats.totalShipCost;
  const surplusPoints = stats.totalQuizPoints - stats.totalShipCost;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Dashboard Validator Konten & Hanggar
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
              PRD R13
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pemantauan langsung seluruh entitas materi edukasi tata surya, kesiapan demo, dan validasi ekonomi poin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Planet */}
        <Link
          href="/admin/planets"
          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-all hover:border-cyan-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-cyan-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Planet</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {loading ? '-' : stats.planets}
            </span>
            <span className="text-xs text-slate-400">/ 8 Planet Utama</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-cyan-400 group-hover:translate-x-0.5 transition-transform">
            <span>Kelola Fisik & Materi</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </Link>

        {/* Card 2: History Events */}
        <Link
          href="/admin/history"
          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-indigo-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Titik Sejarah & POI</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {loading ? '-' : stats.historyEvents}
            </span>
            <span className="text-xs text-slate-400">Titik Misi & Eksplorasi</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-indigo-400 group-hover:translate-x-0.5 transition-transform">
            <span>Filter Tahun & Koordinat</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </Link>

        {/* Card 3: Phenomena */}
        <Link
          href="/admin/phenomena"
          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-all hover:border-amber-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Simulasi Fenomena</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {loading ? '-' : stats.phenomena}
            </span>
            <span className="text-xs text-slate-400">Animasi Astronomi</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-amber-400 group-hover:translate-x-0.5 transition-transform">
            <span>Konfigurasi Terstruktur</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </Link>

        {/* Card 4: Quizzes */}
        <Link
          href="/admin/quizzes"
          className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm transition-all hover:border-emerald-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Bank Soal Kuis</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
              <HelpCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {loading ? '-' : stats.questions}
            </span>
            <span className="text-xs text-slate-400">Soal ({stats.totalQuizPoints} Poin)</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
            <span>Uji & Preview Kartu</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </Link>
      </div>

      {/* Widget Keseimbangan Ekonomi Poin & Hanggar (Hangar Economy Validator) */}
      <div
        className={`rounded-2xl border p-5 backdrop-blur-md transition-all ${
          isEconomyBalanced
            ? 'border-emerald-500/30 bg-emerald-950/20 shadow-lg shadow-emerald-950/20'
            : 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                isEconomyBalanced
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isEconomyBalanced ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <AlertTriangle className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Validator Keseimbangan Ekonomi Poin & Hanggar (PRD R10 & R11)
                </h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isEconomyBalanced
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isEconomyBalanced ? 'EKONOMI SEIMBANG' : 'DEFISIT POIN'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isEconomyBalanced
                  ? `Total poin maksimum dari bank soal (${stats.totalQuizPoints} Poin) melampaui total biaya unlock seluruh armada Hanggar (${stats.totalShipCost} Poin: Orion Glider 300 + Nova Voyager 700). Pemain dapat menyelesaikan semua misi dan membuka 100% armada kapal!`
                  : `Peringatan: Total poin kuis yang tersedia (${stats.totalQuizPoints} Poin) tidak cukup untuk membeli semua pesawat Hanggar (${stats.totalShipCost} Poin). Tambahkan lebih banyak soal kuis agar ekonomi seimbang.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2.5 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                Ketersediaan Poin
              </div>
              <div className="font-mono text-sm font-bold text-white">
                <span className="text-cyan-400">{stats.totalQuizPoints}</span> / {stats.totalShipCost} Poin
              </div>
              <div className="text-[10px] font-mono text-emerald-400">
                Surplus: +{surplusPoints} Poin
              </div>
            </div>

            <Link
              href="/admin/ships"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              <Rocket className="h-3.5 w-3.5 text-cyan-400" />
              <span>Cek Hanggar</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Coverage Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span>Matriks Cakupan Konten Kurikulum per Planet</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluasi kelengkapan titik sejarah, animasi fenomena, bank soal, dan aset 3D untuk kesiapan demonstrasi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-slate-700">
              <Award className="h-3 w-3 text-amber-400" />
              <span>Target: 150 Poin / Planet</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold w-12 text-center">Orbit</th>
                <th className="px-5 py-3 font-semibold">Nama Planet</th>
                <th className="px-5 py-3 font-semibold text-center">Titik Sejarah (POI)</th>
                <th className="px-5 py-3 font-semibold text-center">Simulasi Fenomena</th>
                <th className="px-5 py-3 font-semibold text-center">Soal Kuis</th>
                <th className="px-5 py-3 font-semibold text-center">Poin Kuis</th>
                <th className="px-5 py-3 font-semibold text-center">Aset Model 3D</th>
                <th className="px-5 py-3 font-semibold text-center">Status Kelengkapan</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Memuat matriks kelengkapan...</span>
                    </div>
                  </td>
                </tr>
              ) : coverage.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data planet yang ditemukan di database. Jalankan `supabase/structure.sql` di Supabase SQL Editor.
                  </td>
                </tr>
              ) : (
                coverage.map((planet) => {
                  const isComplete =
                    planet.historyCount >= 1 &&
                    planet.quizCount >= 3 &&
                    planet.hasModel;

                  return (
                    <tr
                      key={planet.planet_id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-400">
                        #{planet.urutan_orbit}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{planet.nama}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            ({planet.planet_id})
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            planet.historyCount > 0
                              ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {planet.historyCount} Titik
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            planet.phenomenaCount > 0
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {planet.phenomenaCount} Animasi
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            planet.quizCount >= 3
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                              : planet.quizCount > 0
                              ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20'
                              : 'bg-red-500/10 text-red-300 border border-red-500/20'
                          }`}
                        >
                          {planet.quizCount} Soal
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-[11px] text-amber-300 font-semibold">
                        {planet.quizPoints} Poin
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {planet.hasModel ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Siap</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <span>Belum Ada</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isComplete ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Lengkap</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Perlu Tambahan</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href="/admin/planets"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
                        >
                          <span>Kelola</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

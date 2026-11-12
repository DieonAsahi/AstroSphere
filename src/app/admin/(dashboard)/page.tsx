'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  Globe,
  Compass,
  Sparkles,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Award,
  Power,
  Clock,
  X,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase/client';
import { formatSupabaseError } from '../../../lib/supabase/adminAuth';

const TARGET_HANGAR_POINTS = 1000; // 300 Orion Glider + 700 Nova Voyager (PRD Bagian 9)

interface DashboardStats {
  planetsTotal: number;
  planetsActive: number;
  planetsInactive: number;
  historyEvents: number;
  phenomenaTotal: number;
  phenomenaActive: number;
  phenomenaInactive: number;
  questions: number;
}

interface IncompletePlanetAlert {
  planet_id: string;
  nama: string;
  historyCount: number;
  questionCount: number;
}

interface RecentUpdateItem {
  id: string;
  module: 'Planet' | 'Sejarah' | 'Kuis';
  title: string;
  planetId: string;
  timestamp: string;
  href: string;
}

function formatRecentTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminDashboardPage() {
  const { searchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingDemo, setResettingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [stats, setStats] = useState<DashboardStats>({
    planetsTotal: 0,
    planetsActive: 0,
    planetsInactive: 0,
    historyEvents: 0,
    phenomenaTotal: 0,
    phenomenaActive: 0,
    phenomenaInactive: 0,
    questions: 0,
  });
  const [activeTotalQuizPoints, setActiveTotalQuizPoints] = useState<number>(0);
  const [incompletePlanets, setIncompletePlanets] = useState<IncompletePlanetAlert[]>([]);
  const [activePlanetsList, setActivePlanetsList] = useState<Array<{ planet_id: string; nama: string }>>([]);
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdateItem[]>([]);

  const loadDashboardStats = useCallback(async () => {
    setError(null);
    try {
      const [planetsRes, historyRes, phenomenaRes, quizRes] = await Promise.all([
        supabase
          .from('planets')
          .select('planet_id, nama, is_active, updated_at')
          .order('urutan_orbit', { ascending: true }),
        supabase
          .from('history_events')
          .select('event_id, planet_id, judul, created_at'),
        supabase
          .from('phenomena')
          .select('phenomenon_id, is_active'),
        supabase
          .from('questions')
          .select('question_id, planet_id, soal, bobot_poin, created_at'),
      ]);

      if (planetsRes.error) throw planetsRes.error;
      if (historyRes.error) throw historyRes.error;
      if (phenomenaRes.error) throw phenomenaRes.error;
      if (quizRes.error) throw quizRes.error;

      const planetsData = planetsRes.data || [];
      const historyData = historyRes.data || [];
      const phenomenaData = phenomenaRes.data || [];
      const quizData = quizRes.data || [];

      const activePlanets = planetsData.filter((p) => p.is_active !== false);
      const activePlanetIdSet = new Set(activePlanets.map((p) => p.planet_id));
      const inactivePlanetsCount = planetsData.length - activePlanets.length;

      const activePhenomenaCount = phenomenaData.filter((p) => p.is_active !== false).length;
      const inactivePhenomenaCount = phenomenaData.length - activePhenomenaCount;

      // Hitung jumlah Sejarah & Kuis per planet serta total poin pada planet aktif
      const historyCountByPlanet = new Map<string, number>();
      for (const h of historyData) {
        historyCountByPlanet.set(h.planet_id, (historyCountByPlanet.get(h.planet_id) ?? 0) + 1);
      }

      const quizCountByPlanet = new Map<string, number>();
      let pointsOnActivePlanets = 0;
      for (const q of quizData) {
        quizCountByPlanet.set(q.planet_id, (quizCountByPlanet.get(q.planet_id) ?? 0) + 1);
        if (activePlanetIdSet.has(q.planet_id)) {
          pointsOnActivePlanets += Number(q.bobot_poin) || 0;
        }
      }

      const missingContent: IncompletePlanetAlert[] = activePlanets
        .map((planet) => ({
          planet_id: planet.planet_id,
          nama: planet.nama,
          historyCount: historyCountByPlanet.get(planet.planet_id) ?? 0,
          questionCount: quizCountByPlanet.get(planet.planet_id) ?? 0,
        }))
        .filter((item) => item.historyCount === 0 || item.questionCount === 0);

      // Kumpulkan 5 Pembaruan Materi Terakhir lintas tabel (planets, history_events, questions)
      const timelineItems: RecentUpdateItem[] = [
        ...planetsData.map((p) => ({
          id: `planet-${p.planet_id}`,
          module: 'Planet' as const,
          title: `Data Planet: ${p.nama}`,
          planetId: p.planet_id,
          timestamp: p.updated_at || new Date(0).toISOString(),
          href: '/admin/planets',
        })),
        ...historyData.map((h) => ({
          id: `history-${h.event_id}`,
          module: 'Sejarah' as const,
          title: h.judul,
          planetId: h.planet_id,
          timestamp: h.created_at || new Date(0).toISOString(),
          href: '/admin/history',
        })),
        ...quizData.map((q) => ({
          id: `quiz-${q.question_id}`,
          module: 'Kuis' as const,
          title: q.soal,
          planetId: q.planet_id,
          timestamp: q.created_at || new Date(0).toISOString(),
          href: '/admin/quizzes',
        })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setActivePlanetsList(activePlanets.map((p) => ({ planet_id: p.planet_id, nama: p.nama })));
      setIncompletePlanets(missingContent);
      setActiveTotalQuizPoints(pointsOnActivePlanets);
      setRecentUpdates(timelineItems);
      setStats({
        planetsTotal: planetsData.length,
        planetsActive: activePlanets.length,
        planetsInactive: inactivePlanetsCount,
        historyEvents: historyData.length,
        phenomenaTotal: phenomenaData.length,
        phenomenaActive: activePhenomenaCount,
        phenomenaInactive: inactivePhenomenaCount,
        questions: quizData.length,
      });
    } catch (err: unknown) {
      console.error('Gagal memuat count live dari Supabase:', err);
      setError(
        formatSupabaseError(
          err,
          'Terjadi kegagalan saat mengambil metrik dari database Supabase'
        )
      );
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

  // Fitur 2: Reset Status Demo (Aktifkan seluruh Planet & Fenomena dalam 1 klik)
  const handleResetDemoStatus = async () => {
    setResettingDemo(true);
    setDemoNotice(null);

    try {
      const [inactivePlanetsRes, inactivePhenomenaRes] = await Promise.all([
        supabase.from('planets').select('planet_id').eq('is_active', false),
        supabase.from('phenomena').select('phenomenon_id').eq('is_active', false),
      ]);

      if (inactivePlanetsRes.error) throw inactivePlanetsRes.error;
      if (inactivePhenomenaRes.error) throw inactivePhenomenaRes.error;

      const inactivePlanetCount = inactivePlanetsRes.data?.length ?? 0;
      const inactivePhenomenaCount = inactivePhenomenaRes.data?.length ?? 0;

      const [planetsUpdateRes, phenomenaUpdateRes] = await Promise.all([
        supabase
          .from('planets')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('is_active', false)
          .select('planet_id'),
        supabase
          .from('phenomena')
          .update({ is_active: true })
          .eq('is_active', false)
          .select('phenomenon_id'),
      ]);

      if (planetsUpdateRes.error) throw planetsUpdateRes.error;
      if (phenomenaUpdateRes.error) throw phenomenaUpdateRes.error;

      if (
        (inactivePlanetCount > 0 && (planetsUpdateRes.data?.length ?? 0) === 0) ||
        (inactivePhenomenaCount > 0 && (phenomenaUpdateRes.data?.length ?? 0) === 0)
      ) {
        throw new Error(
          'Perubahan ditolak oleh kebijakan keamanan database (RLS). Pastikan Anda login sebagai Admin.'
        );
      }

      setDemoNotice({
        type: 'success',
        message:
          'Mode Demo Siap! Seluruh planet dan skenario fenomena kini berstatus Aktif.',
      });
      await loadDashboardStats();
    } catch (err: unknown) {
      console.error('Reset demo mode error:', err);
      setDemoNotice({
        type: 'error',
        message: formatSupabaseError(
          err,
          'Gagal mengaktifkan seluruh modul. Periksa izin Admin (RLS)'
        ),
      });
    } finally {
      setResettingDemo(false);
    }
  };

  // Definisi 4 Kartu Modul Utama untuk dukungan filter pencarian global header
  const modules = useMemo(() => {
    return [
      {
        id: 'planets',
        title: 'Data Planet',
        description:
          'Kelola planet tata surya terdaftar beserta skala riil, rotasi aksial, teks pembuka, status visibilitas, dan parameter orbit Kepler.',
        footerLabel: 'Unit Tata Surya',
        ctaLabel: 'Kelola Planet',
        href: '/admin/planets',
        icon: Globe,
        keywords:
          'planet merkurius venus bumi earth mars jupiter saturnus uranus neptunus tekstur model orbit aktif nonaktif',
        badge: error ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
            - Planet
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {stats.planetsTotal} Terdaftar
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {stats.planetsActive} Aktif
            </span>
            {stats.planetsInactive > 0 && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                {stats.planetsInactive} Nonaktif
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'history',
        title: 'Sejarah & POI',
        description:
          'Kelola linimasa sejarah peradaban, bentang alam, misi eksplorasi antariksa, serta dokumentasi foto peristiwa.',
        footerLabel: 'Linimasa Sejarah',
        ctaLabel: 'Kelola Sejarah',
        href: '/admin/history',
        icon: Compass,
        keywords: 'sejarah poi history peristiwa apollo voyager foto gambar era dinosaurus',
        badge: error ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
            - Entri
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
            {stats.historyEvents} Entri Riwayat
          </span>
        ),
      },
      {
        id: 'phenomena',
        title: 'Fenomena Astronomi',
        description:
          'Kelola konfigurasi narasi simulasi gerhana, fase bulan, transit optik satelit Galilea, dan kontrol aktif di layar 3D.',
        footerLabel: 'Simulasi Optik',
        ctaLabel: 'Kelola Fenomena',
        href: '/admin/phenomena',
        icon: Sparkles,
        keywords: 'fenomena gerhana matahari bulan fase galilea transit simulasi aktif nonaktif',
        badge: error ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
            - Skenario
          </span>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
              {stats.phenomenaTotal} Skenario
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              {stats.phenomenaActive} Aktif
            </span>
            {stats.phenomenaInactive > 0 && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                {stats.phenomenaInactive} Nonaktif
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'quizzes',
        title: 'Kuis',
        description:
          'Kelola bank soal evaluasi edukatif planet, kunci jawaban, bobot poin, dan pembahasan ilmiah yang suportif.',
        footerLabel: 'Instrumen Evaluasi',
        ctaLabel: 'Kelola Kuis',
        href: '/admin/quizzes',
        icon: HelpCircle,
        keywords: 'kuis quiz soal pertanyaan jawaban poin pembahasan evaluasi',
        badge: error ? (
          <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
            - Soal
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
            {stats.questions} Butir Soal
          </span>
        ),
      },
    ];
  }, [stats, error]);

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const filteredModules = useMemo(() => {
    if (!trimmedQuery) return modules;
    return modules.filter(
      (mod) =>
        mod.title.toLowerCase().includes(trimmedQuery) ||
        mod.description.toLowerCase().includes(trimmedQuery) ||
        mod.keywords.includes(trimmedQuery)
    );
  }, [modules, trimmedQuery]);

  const matchedPlanets = useMemo(() => {
    if (!trimmedQuery) return [];
    return activePlanetsList.filter(
      (p) =>
        p.nama.toLowerCase().includes(trimmedQuery) ||
        p.planet_id.toLowerCase().includes(trimmedQuery)
    );
  }, [activePlanetsList, trimmedQuery]);

  const isEconomyBalanced = activeTotalQuizPoints >= TARGET_HANGAR_POINTS;
  const economyPercent = Math.min(
    100,
    Math.round((activeTotalQuizPoints / TARGET_HANGAR_POINTS) * 100)
  );
  const hasInactiveModules = stats.planetsInactive > 0 || stats.phenomenaInactive > 0;

  return (
    <div className="space-y-6">
      {/* Title Header + Tombol Cepat Mode Demo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Pantau ringkasan konten edukasi, keseimbangan poin gamifikasi, dan kesiapan demo AstroSphere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetDemoStatus}
            disabled={resettingDemo || loading}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 ${
              hasInactiveModules
                ? 'border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
            title="Aktifkan seluruh planet & fenomena kembali ke is_active = true"
          >
            <Power className={`h-3.5 w-3.5 ${resettingDemo ? 'animate-spin' : ''}`} />
            <span>
              {resettingDemo ? 'Mengaktifkan...' : 'Aktifkan Semua Modul (Mode Demo)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'
              }`}
            />
            <span>Segarkan Data</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner Reset Demo */}
      {demoNotice && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs font-medium shadow-xs ${
            demoNotice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {demoNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{demoNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setDemoNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error Alert Banner (R-02) */}
      {error && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-red-900">Gagal Mengambil Metrik Database</p>
              <p className="text-red-700 mt-0.5 break-words">{error}</p>
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

      {/* Quick Search Result Helper Banner saat Admin mengetik di Top Header Search */}
      {trimmedQuery && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-blue-900">
            <Search className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Menampilkan hasil pencarian Dashboard untuk <strong>"{searchQuery.trim()}"</strong>
              {matchedPlanets.length > 0 && ` (${matchedPlanets.length} planet cocok)`}.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/planets"
              className="rounded-lg bg-white border border-blue-200 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Cari di Planet
            </Link>
            <Link
              to="/admin/history"
              className="rounded-lg bg-white border border-blue-200 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Cari di Sejarah
            </Link>
            <Link
              to="/admin/quizzes"
              className="rounded-lg bg-white border border-blue-200 px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Cari di Kuis
            </Link>
          </div>
        </div>
      )}

      {/* Widget 1: Validator Ekonomi Poin & Kesiapan Gamifikasi */}
      {!loading && !error && (
        <div
          className={`rounded-2xl border p-5 shadow-xs space-y-3 ${
            isEconomyBalanced
              ? 'border-emerald-200 bg-emerald-50/70'
              : 'border-amber-200 bg-amber-50/80'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                  isEconomyBalanced
                    ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                    : 'bg-amber-100 border-amber-200 text-amber-700'
                }`}
              >
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className={`text-sm font-bold ${
                      isEconomyBalanced ? 'text-emerald-950' : 'text-amber-950'
                    }`}
                  >
                    Validator Ekonomi Poin &amp; Kesiapan Gamifikasi
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold font-mono border ${
                      isEconomyBalanced
                        ? 'bg-white border-emerald-200 text-emerald-700'
                        : 'bg-white border-amber-300 text-amber-800'
                    }`}
                  >
                    {activeTotalQuizPoints.toLocaleString('id-ID')} / 1.000 Poin
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isEconomyBalanced ? 'text-emerald-800' : 'text-amber-900'
                  }`}
                >
                  {isEconomyBalanced
                    ? `Ekonomi Seimbang: Total ${activeTotalQuizPoints.toLocaleString('id-ID')} Poin tersedia di planet aktif, cukup untuk membuka seluruh pesawat Hanggar.`
                    : `Perhatian: Total poin di planet aktif hanya ${activeTotalQuizPoints.toLocaleString('id-ID')} Poin, kurang dari 1.000 Poin untuk membuka semua pesawat.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-600 bg-white/90 border border-slate-200/80 rounded-lg px-2.5 py-1 font-medium">
                Target: 300p (Orion) + 700p (Nova)
              </span>
              {!isEconomyBalanced && (
                <Link
                  to="/admin/quizzes"
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-2xs"
                >
                  Tambah Bobot Soal
                </Link>
              )}
            </div>
          </div>

          {/* Progress Bar Ekonomi Poin */}
          <div className="w-full h-2 rounded-full bg-white/90 border border-slate-200/60 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isEconomyBalanced ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${economyPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Kelengkapan Konten Planet Aktif */}
      {!loading && !error && (
        incompletePlanets.length > 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-amber-900">
                    Status Kelengkapan Konten Planet Aktif
                  </h2>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Ditemukan <strong>{incompletePlanets.length} planet aktif</strong> yang belum memiliki catatan Sejarah atau soal Kuis.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Link
                  to="/admin/history"
                  className="rounded-lg bg-white border border-amber-200 hover:bg-amber-100 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 transition-colors"
                >
                  Isi Sejarah
                </Link>
                <Link
                  to="/admin/quizzes"
                  className="rounded-lg bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors"
                >
                  Isi Bank Kuis
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {incompletePlanets.map((item) => (
                <div
                  key={item.planet_id}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-200/90 bg-white px-3 py-1.5 text-xs shadow-2xs"
                >
                  <span className="font-bold text-slate-900">{item.nama}:</span>
                  {item.historyCount === 0 && (
                    <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-semibold">
                      0 Sejarah
                    </span>
                  )}
                  {item.questionCount === 0 && (
                    <span className="rounded bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px] font-semibold">
                      0 Soal Kuis
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Status Kelengkapan Konten Planet Aktif Optimal:</strong> Seluruh{' '}
                {stats.planetsActive} planet aktif sudah memiliki materi sejarah dan soal kuis.
              </span>
            </div>
          </div>
        )
      )}

      {/* 2x2 Grid Kartu Utama Sesuai Desain A01 */}
      {filteredModules.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
          Tidak ada modul dashboard yang cocok dengan kata kunci <strong>"{searchQuery}"</strong>. Gunakan tautan cepat di atas untuk mencari langsung di halaman Planet, Sejarah, atau Kuis.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    {loading ? (
                      <div className="h-6 w-28 rounded-full bg-slate-200 animate-pulse" />
                    ) : (
                      mod.badge
                    )}
                  </div>

                  <h2 className="mt-4 text-base font-bold text-slate-900">
                    {mod.title}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {mod.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">{mod.footerLabel}</span>
                  <Link
                    to={mod.href}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <span>{mod.ctaLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Widget 2: Daftar 5 Pembaruan Materi Terakhir */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              5 Pembaruan Materi Terakhir
            </h2>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            Planet, Sejarah &amp; Kuis
          </span>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Memuat riwayat pembaruan terakhir...
          </div>
        ) : recentUpdates.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Belum ada catatan pembaruan materi yang tersedia.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentUpdates.map((item) => {
              const badgeColor =
                item.module === 'Planet'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : item.module === 'Sejarah'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200';

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor}`}
                    >
                      {item.module}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {item.title}
                    </span>
                    <span className="hidden sm:inline-block shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 capitalize">
                      {item.planetId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono shrink-0">
                    <span>{formatRecentTimestamp(item.timestamp)}</span>
                    <ArrowRight className="h-3 w-3 text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

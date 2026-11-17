'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Compass,
  RotateCw,
  Sun,
  Maximize2,
  Thermometer,
  Hourglass,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import { FALLBACK_PLANETS } from '@/data/fallbackMasterData';
import type { Planet } from '@/types/database';

export function DescriptionPanel() {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);

  const [planet, setPlanet] = useState<Planet>(
    FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('planets')
          .select('*')
          .eq('planet_id', activePlanetId)
          .maybeSingle();

        if (isMounted) {
          if (data) {
            if (data.is_active === false) {
              // Jika planet dinonaktifkan, kembalikan pemain ke Bumi
              useSceneStore.getState().setActivePlanetId('earth');
              return;
            }
            setPlanet(data);
          } else {
            setPlanet(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
          }
        }
      } catch {
        if (isMounted) {
          setPlanet(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (mode === 'DESCRIPTION') {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [activePlanetId, mode]);

  if (mode !== 'DESCRIPTION') return null;

  const isRetrograde = Number(planet.rotation_period_hours) < 0;
  const absRotation = Math.abs(Number(planet.rotation_period_hours));
  const orbitalYears = (Number(planet.orbital_period_days) / 365.25).toFixed(2);
  const planetOrder = planet.urutan_planet ?? planet.urutan_orbit ?? 1;

  return (
    <aside
      aria-label="Panel Data Ilmiah Planet"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] md:w-[520px] flex flex-col bg-slate-950/95 border-l border-slate-800 backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
    >
      {/* Header Panel Sesuai PLY-02 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">
                {planet.nama}
              </h2>
              <span className="text-[11px] font-semibold rounded bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 text-cyan-300">
                Planet ke-{planetOrder} dari Matahari
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Katalog Observasi &amp; Data Ilmiah</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => switchMode('EXPLORE')}
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Tutup & Kembali ke Jelajah 3D"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : (
        <div className="mt-5 space-y-6 flex-1">
          {/* Kotak Ringkasan Planet */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 p-4 shadow-lg shadow-cyan-950/20">
            <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-cyan-400 to-indigo-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
              Ringkasan Planet
            </span>
            <p className="text-xs font-medium text-cyan-100 leading-relaxed pl-1 text-justify">
              {planet.deskripsi_materi}
            </p>
          </div>

          {/* 6 Kotak Data Ilmiah (Katalog Observasi Sesuai PLY-02) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <span>Data Ilmiah (Katalog Observasi)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* 1. Diameter Ekuator */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Diameter Ekuator</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {Number(planet.diameter_km).toLocaleString('id-ID')}
                  <span className="text-xs font-normal text-slate-400 ml-1">km</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {planet.perbandingan_bumi || '~ x Bumi'}
                </span>
              </div>

              {/* 2. Periode Rotasi */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <RotateCw className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Periode Rotasi</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {planet.periode_rotasi || `${absRotation.toLocaleString('id-ID')} jam`}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {planet.subteks_rotasi || '1 Hari Planet'}
                </span>
              </div>

              {/* 3. Periode Orbit */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Periode Orbit</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {planet.periode_orbit || `${Number(planet.orbital_period_days).toLocaleString('id-ID')} hari`}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {planet.subteks_orbit || `≈ ${orbitalYears} tahun Bumi`}
                </span>
              </div>

              {/* 4. Kemiringan Sumbu */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Kemiringan Sumbu</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {planet.kemiringan_sumbu || `${Number(planet.axial_tilt_deg).toFixed(1)}°`}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">Kemiringan Orbit</span>
              </div>

              {/* 5. Suhu Rata-rata */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                  <span>Suhu Rata-rata</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {planet.suhu_rata_c || 'N/A'}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {planet.rentang_suhu || 'Rentang Suhu Permukaan'}
                </span>
              </div>

              {/* 6. Usia Planet */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                  <Hourglass className="h-3.5 w-3.5 text-purple-400" />
                  <span>Usia Planet</span>
                </div>
                <div className="font-mono text-base font-bold text-white">
                  {planet.usia_planet || '~4,5 Miliar Tahun'}
                </div>
                <span className="text-[10px] text-slate-400 mt-1">
                  {planet.subteks_usia || 'Terbentuk bersama Tata Surya'}
                </span>
              </div>
            </div>
          </div>

          {/* Kotak Karakteristik Rotasi & Sumbu */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300">
              {isRetrograde ? (
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              ) : (
                <RotateCw className="h-4 w-4 text-indigo-400 shrink-0" />
              )}
              <h4 className="text-xs font-bold uppercase tracking-wide">
                {planet.judul_rotasi || 'Karakteristik Rotasi & Sumbu'}
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 text-justify">
              {planet.deskripsi_rotasi || 'Rotasi planet ini mengikuti dinamika presisi tata surya.'}
            </p>
          </div>

          {/* Validasi Ilmiah Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Data observasi diverifikasi berdasarkan astronomi planetary NASA / IAU.
            </span>
          </div>

          {/* Tombol Lanjut ke Kuis / Kembali */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={() => switchMode('QUIZ')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <span>Uji Pemahaman di Kuis</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => switchMode('EXPLORE')}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

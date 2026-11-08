'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  MapPin,
  Calendar,
  Rocket,
  Compass,
  Filter,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import type { HistoryEvent } from '@/types/database';

// Fallback POI bersejarah jika offline (PRD R04)
const FALLBACK_EVENTS: Record<string, HistoryEvent[]> = {
  earth: [
    {
      event_id: 'earth-apollo11',
      planet_id: 'earth',
      tahun_kejadian: 1969,
      judul: 'Peluncuran Apollo 11 (Pusat Antariksa Kennedy)',
      deskripsi:
        'Misi pertama manusia mendarat di Bulan diluncurkan dari Cape Canaveral, Florida menggunakan roket raksasa Saturn V.',
      koordinat_lat: 28.57,
      koordinat_lng: -80.64,
      nama_wahana: 'Saturn V / Apollo 11',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-baikonur',
      planet_id: 'earth',
      tahun_kejadian: 1961,
      judul: 'Penerbangan Manusia Pertama (Yuri Gagarin)',
      deskripsi:
        'Kosmodrom Baikonur mencatat sejarah saat Vostok 1 membawa Yuri Gagarin menjadi manusia pertama di orbit Bumi.',
      koordinat_lat: 45.96,
      koordinat_lng: 63.3,
      nama_wahana: 'Vostok 1',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-iss',
      planet_id: 'earth',
      tahun_kejadian: 1998,
      judul: 'Peluncuran Modul Zarya (Stasiun Luar Angkasa Internasional)',
      deskripsi:
        'Awal mula perakitan laboratorium multinasional terbesar di orbit rendah Bumi.',
      koordinat_lat: 45.96,
      koordinat_lng: 63.3,
      nama_wahana: 'Proton-K / Zarya',
      created_at: new Date().toISOString(),
    },
  ],
  mars: [
    {
      event_id: 'mars-perseverance',
      planet_id: 'mars',
      tahun_kejadian: 2021,
      judul: 'Pendaratan Rover Perseverance (Kawah Jezero)',
      deskripsi:
        'Rover NASA menjelajahi bekas danau purba untuk mencari tanda-tanda kehidupan mikroba masa lalu.',
      koordinat_lat: 18.38,
      koordinat_lng: 77.58,
      nama_wahana: 'Perseverance & Ingenuity',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'mars-curiosity',
      planet_id: 'mars',
      tahun_kejadian: 2012,
      judul: 'Pendaratan Rover Curiosity (Kawah Gale)',
      deskripsi:
        'Misi sains untuk meneliti kelayakhunian Mars purba dan menemukan bukti adanya air mengalir di masa silam.',
      koordinat_lat: -4.58,
      koordinat_lng: 137.44,
      nama_wahana: 'Curiosity (MSL)',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'mars-viking1',
      planet_id: 'mars',
      tahun_kejadian: 1976,
      judul: 'Pendaratan Sukses Pertama Viking 1 (Chryse Planitia)',
      deskripsi:
        'Wahana pertama Amerika Serikat yang berhasil mendarat di Mars dan mentransmisikan foto permukaan berwarna.',
      koordinat_lat: 22.48,
      koordinat_lng: -48.0,
      nama_wahana: 'Viking 1 Lander',
      created_at: new Date().toISOString(),
    },
  ],
  venus: [
    {
      event_id: 'venus-venera7',
      planet_id: 'venus',
      tahun_kejadian: 1970,
      judul: 'Pendaratan Pertama di Planet Lain (Venera 7)',
      deskripsi:
        'Wahana antariksa pertama yang berhasil mendarat di planet lain dan mentransmisikan data suhu 475°C dan tekanan 90 atmosfer.',
      koordinat_lat: -5.0,
      koordinat_lng: 351.0,
      nama_wahana: 'Venera 7',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'venus-magellan',
      planet_id: 'venus',
      tahun_kejadian: 1990,
      judul: 'Pemetaan Radar Global Wahana Magellan',
      deskripsi:
        'Menggunakan radar aperture sintetis untuk menembus awan tebal dan memetakan 98% permukaan Venus.',
      koordinat_lat: 10.0,
      koordinat_lng: 120.0,
      nama_wahana: 'Magellan Spacecraft',
      created_at: new Date().toISOString(),
    },
  ],
  jupiter: [
    {
      event_id: 'jupiter-galileo',
      planet_id: 'jupiter',
      tahun_kejadian: 1995,
      judul: 'Wahana Penyelidik Galileo Menembus Atmosfer Jupiter',
      deskripsi:
        'Melepaskan probe atmosfer yang mengukur kecepatan angin badai ekstrem sebelum hancur oleh tekanan gas Jupiter.',
      koordinat_lat: 6.5,
      koordinat_lng: 4.5,
      nama_wahana: 'Galileo Atmospheric Probe',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'jupiter-juno',
      planet_id: 'jupiter',
      tahun_kejadian: 2016,
      judul: 'Wahana Juno Masuki Orbit Polar Jupiter',
      deskripsi:
        'Meneliti medan magnet, struktur inti, dan kelimpahan air di atmosfer Jupiter dari jarak dekat.',
      koordinat_lat: -15.0,
      koordinat_lng: 180.0,
      nama_wahana: 'Juno Spacecraft',
      created_at: new Date().toISOString(),
    },
  ],
};

export function HistoryTimeline() {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const mode = useSceneStore((state) => state.mode);
  const switchMode = useSceneStore((state) => state.switchMode);
  const selectedYearFilter = useSceneStore((state) => state.selectedYearFilter);
  const setSelectedYearFilter = useSceneStore((state) => state.setSelectedYearFilter);
  const activePoi = useSceneStore((state) => state.activePoi);
  const setActivePoi = useSceneStore((state) => state.setActivePoi);

  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [sliderYear, setSliderYear] = useState<number>(2030);
  const [isFilterActive, setIsFilterActive] = useState(false);

  // Ambil POI dari Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      try {
        const { data } = await supabase
          .from('history_events')
          .select('*')
          .eq('planet_id', activePlanetId)
          .order('tahun_kejadian', { ascending: true });

        if (isMounted) {
          if (data && data.length > 0) {
            setEvents(data);
          } else {
            setEvents(FALLBACK_EVENTS[activePlanetId] || []);
          }
        }
      } catch {
        if (isMounted) {
          setEvents(FALLBACK_EVENTS[activePlanetId] || []);
        }
      }
    }

    if (mode === 'HISTORY') {
      loadEvents();
    }

    return () => {
      isMounted = false;
    };
  }, [activePlanetId, mode]);

  // Sinkronisasi tahun filter
  const handleYearChange = (year: number) => {
    setSliderYear(year);
    setIsFilterActive(true);
    setSelectedYearFilter(year);
  };

  const handleResetFilter = () => {
    setIsFilterActive(false);
    setSelectedYearFilter(null);
    setSliderYear(2030);
  };

  const filteredEvents = useMemo(() => {
    if (!isFilterActive || selectedYearFilter === null) return events;
    return events.filter((e) => e.tahun_kejadian <= selectedYearFilter);
  }, [events, isFilterActive, selectedYearFilter]);

  if (mode !== 'HISTORY') return null;

  return (
    <aside
      aria-label="Panel Linimasa Sejarah POI"
      className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] md:w-[500px] flex flex-col bg-slate-950/95 border-l border-slate-800 backdrop-blur-2xl shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
    >
      {/* Header Modal */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Linimasa POI
              </h2>
              <span className="text-[11px] font-mono rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-cyan-400">
                {events.length} Misi
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Titik Pendaratan & Misi Bersejarah (R04)</p>
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

      {/* Year Range Filter Slider (PRD R04) */}
      <div className="mt-5 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Filter className="h-3.5 w-3.5 text-cyan-400" />
            <span>Filter Tahun Peluncuran</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-300 font-bold">
              {isFilterActive ? `≤ Tahun ${sliderYear}` : 'Semua Tahun'}
            </span>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <input
          type="range"
          min={1955}
          max={2030}
          step={1}
          value={sliderYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>1955</span>
          <span>1990</span>
          <span>2030</span>
        </div>
      </div>

      {/* List of Missions / POIs */}
      <div className="mt-5 space-y-3 flex-1">
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              Tidak ada catatan misi sebelum tahun {sliderYear}.
            </p>
            <button
              type="button"
              onClick={handleResetFilter}
              className="mt-3 text-xs font-semibold text-cyan-400 hover:underline"
            >
              Tampilkan Semua Tahun
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = activePoi?.event_id === event.event_id;

            return (
              <div
                key={event.event_id}
                onClick={() => setActivePoi(event)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-500/60 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 shadow-lg shadow-cyan-950/30'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 items-center justify-center rounded-lg bg-indigo-500/20 px-2 font-mono text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
                      {event.tahun_kejadian}
                    </span>
                    <h3 className="text-xs font-bold text-white leading-tight">
                      {event.judul}
                    </h3>
                  </div>

                  {isSelected && (
                    <span className="shrink-0 flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-500/30">
                      <CheckCircle className="h-3 w-3" />
                      Aktif
                    </span>
                  )}
                </div>

                {event.nama_wahana && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-400/90 font-medium">
                    <Rocket className="h-3.5 w-3.5 shrink-0" />
                    <span>Wahana: {event.nama_wahana}</span>
                  </div>
                )}

                <p className="mt-2 text-xs text-slate-300 leading-relaxed text-justify">
                  {event.deskripsi}
                </p>

                {/* Spherical Coordinates & Focus Button (R04) */}
                <div className="mt-3 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span>
                      {event.koordinat_lat}° L, {event.koordinat_lng}° B
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePoi(event);
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>{isSelected ? 'Terfokus' : 'Fokus Pin 3D'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Return to Flight Mode Button */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => switchMode('EXPLORE')}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 py-3 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
        >
          <Compass className="h-4 w-4 text-cyan-400" />
          <span>Kembali ke Mode Jelajah Terbang</span>
        </button>
      </div>
    </aside>
  );
}

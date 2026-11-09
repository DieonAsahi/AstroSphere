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

// Format tampilan tahun ramah Sebelum Masehi (SM) & Masehi (M)
function formatYearDisplay(year: number): string {
  if (year < 0) {
    const absYear = Math.abs(year);
    if (absYear >= 1000000) {
      const millions = absYear / 1000000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)} Juta SM`;
    }
    return `${absYear.toLocaleString('id-ID')} SM`;
  }
  return `${year} M`;
}

// Fallback POI bersejarah jika offline (PRD R04)
const FALLBACK_EVENTS: Record<string, HistoryEvent[]> = {
  earth: [
    {
      event_id: 'earth-chicxulub',
      planet_id: 'earth',
      era_label: 'Zaman Dinosaurus (~66 Juta SM)',
      tahun_kejadian: -66000000,
      kategori_poi: 'OBSERVATION',
      judul: 'Kepunahan Massal Kapur-Paleogen (Kawah Chicxulub)',
      deskripsi:
        'Tumbukan asteroid raksasa berdiameter ~10 km memicu kepunahan massal dinosaurus non-unggas dan membentuk Kawah Chicxulub.',
      koordinat_lat: 21.4,
      koordinat_lng: -89.5,
      nama_wahana: 'Semenanjung Yucatán, Meksiko • T-Rex & Triceratops',
      sumber_referensi: 'Geological Survey / Nature Science',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-giza',
      planet_id: 'earth',
      era_label: 'Sejarah Peradaban Kuno (~2560 SM)',
      tahun_kejadian: -2560,
      kategori_poi: 'OBSERVATION',
      judul: 'Pembangunan Piramida Agung Giza',
      deskripsi:
        'Piramida tertua dan terbesar dari tiga piramida di kompleks makam Giza, keajaiban dunia kuno yang masih tegak berdiri.',
      koordinat_lat: 29.9792,
      koordinat_lng: 31.1342,
      nama_wahana: 'Giza, Mesir • Firaun Khufu',
      sumber_referensi: 'UNESCO World Heritage',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-kabah',
      planet_id: 'earth',
      era_label: 'Sejarah Islam & Kenabian (~2000 SM – Kini)',
      tahun_kejadian: -2000,
      kategori_poi: 'OBSERVATION',
      judul: "Pembangunan Ka'bah oleh Nabi Ibrahim AS & Ismail AS",
      deskripsi:
        "Pondasi Baitullah Ka'bah didirikan kembali oleh Nabi Ibrahim AS dan putranya Nabi Ismail AS sebagai kiblat umat Islam sedunia.",
      koordinat_lat: 21.4225,
      koordinat_lng: 39.8262,
      nama_wahana: 'Masjidil Haram, Makkah, Arab Saudi',
      sumber_referensi: 'Sejarah Kenabian & Arkeologi Timur Tengah',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-apollo11',
      planet_id: 'earth',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1969,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Peluncuran Apollo 11 (Pusat Antariksa Kennedy)',
      deskripsi:
        'Misi pertama manusia mendarat di Bulan diluncurkan dari Cape Canaveral, Florida menggunakan roket raksasa Saturn V.',
      koordinat_lat: 28.57,
      koordinat_lng: -80.64,
      nama_wahana: 'Saturn V / Apollo 11',
      sumber_referensi: 'NASA Apollo Fact Sheet',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-baikonur',
      planet_id: 'earth',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1961,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Penerbangan Manusia Pertama (Yuri Gagarin)',
      deskripsi:
        'Kosmodrom Baikonur mencatat sejarah saat Vostok 1 membawa Yuri Gagarin menjadi manusia pertama di orbit Bumi.',
      koordinat_lat: 45.96,
      koordinat_lng: 63.3,
      nama_wahana: 'Vostok 1',
      sumber_referensi: 'Roscosmos Historical Archives',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'earth-iss',
      planet_id: 'earth',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1998,
      kategori_poi: 'ORBITAL_FLYBY',
      judul: 'Peluncuran Modul Zarya (Stasiun Luar Angkasa Internasional)',
      deskripsi:
        'Awal mula perakitan laboratorium multinasional terbesar di orbit rendah Bumi.',
      koordinat_lat: 45.96,
      koordinat_lng: 63.3,
      nama_wahana: 'Proton-K / Zarya',
      sumber_referensi: 'NASA ISS Reference Guide',
      created_at: new Date().toISOString(),
    },
  ],
  mars: [
    {
      event_id: 'mars-perseverance',
      planet_id: 'mars',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 2021,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Pendaratan Rover Perseverance (Kawah Jezero)',
      deskripsi:
        'Rover NASA menjelajahi bekas danau purba untuk mencari tanda-tanda kehidupan mikroba masa lalu.',
      koordinat_lat: 18.38,
      koordinat_lng: 77.58,
      nama_wahana: 'Perseverance & Ingenuity',
      sumber_referensi: 'NASA Mars 2020 Mission',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'mars-curiosity',
      planet_id: 'mars',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 2012,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Pendaratan Rover Curiosity (Kawah Gale)',
      deskripsi:
        'Misi sains untuk meneliti kelayakhunian Mars purba dan menemukan bukti adanya air mengalir di masa silam.',
      koordinat_lat: -4.58,
      koordinat_lng: 137.44,
      nama_wahana: 'Curiosity (MSL)',
      sumber_referensi: 'NASA MSL Science',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'mars-viking1',
      planet_id: 'mars',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1976,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Pendaratan Sukses Pertama Viking 1 (Chryse Planitia)',
      deskripsi:
        'Wahana pertama Amerika Serikat yang berhasil mendarat di Mars dan mentransmisikan foto permukaan berwarna.',
      koordinat_lat: 22.48,
      koordinat_lng: -48.0,
      nama_wahana: 'Viking 1 Lander',
      sumber_referensi: 'NASA Viking Mission',
      created_at: new Date().toISOString(),
    },
  ],
  venus: [
    {
      event_id: 'venus-venera7',
      planet_id: 'venus',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1970,
      kategori_poi: 'SURFACE_LANDING',
      judul: 'Pendaratan Pertama di Planet Lain (Venera 7)',
      deskripsi:
        'Wahana antariksa pertama yang berhasil mendarat di planet lain dan mentransmisikan data suhu 475°C dan tekanan 90 atmosfer.',
      koordinat_lat: -5.0,
      koordinat_lng: 351.0,
      nama_wahana: 'Venera 7',
      sumber_referensi: 'Soviet Planetary Exploration',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'venus-magellan',
      planet_id: 'venus',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1990,
      kategori_poi: 'ORBITAL_FLYBY',
      judul: 'Pemetaan Radar Global Wahana Magellan',
      deskripsi:
        'Menggunakan radar aperture sintetis untuk menembus awan tebal dan memetakan 98% permukaan Venus.',
      koordinat_lat: 10.0,
      koordinat_lng: 120.0,
      nama_wahana: 'Magellan Spacecraft',
      sumber_referensi: 'NASA JPL Magellan',
      created_at: new Date().toISOString(),
    },
  ],
  jupiter: [
    {
      event_id: 'jupiter-galileo',
      planet_id: 'jupiter',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 1995,
      kategori_poi: 'ORBITAL_FLYBY',
      judul: 'Wahana Penyelidik Galileo Menembus Atmosfer Jupiter',
      deskripsi:
        'Melepaskan probe atmosfer yang mengukur kecepatan angin badai ekstrem sebelum hancur oleh tekanan gas Jupiter.',
      koordinat_lat: 6.5,
      koordinat_lng: 4.5,
      nama_wahana: 'Galileo Atmospheric Probe',
      sumber_referensi: 'NASA Galileo Mission',
      created_at: new Date().toISOString(),
    },
    {
      event_id: 'jupiter-juno',
      planet_id: 'jupiter',
      era_label: 'Eksplorasi Antariksa Modern (1957 - Kini)',
      tahun_kejadian: 2016,
      kategori_poi: 'ORBITAL_FLYBY',
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

      // Realtime subscription ke tabel history_events (M-03)
      const channel = supabase
        .channel(`public:realtime_timeline_${activePlanetId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'history_events', filter: `planet_id=eq.${activePlanetId}` },
          () => {
            loadEvents();
          }
        )
        .subscribe();

      const handleFocus = () => loadEvents();
      window.addEventListener('focus', handleFocus);

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
        window.removeEventListener('focus', handleFocus);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [activePlanetId, mode]);

  const { minYear, maxYear } = useMemo(() => {
    if (events.length === 0) return { minYear: 1955, maxYear: 2030 };
    const years = events.map((e) => e.tahun_kejadian);
    return {
      minYear: Math.min(...years),
      maxYear: Math.max(...years, 2030),
    };
  }, [events]);

  // Sinkronisasi tahun filter
  const handleYearChange = (year: number) => {
    setSliderYear(year);
    setIsFilterActive(true);
    setSelectedYearFilter(year);
  };

  const handleResetFilter = () => {
    setIsFilterActive(false);
    setSelectedYearFilter(null);
    setSliderYear(maxYear);
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
                {events.length} Peristiwa
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Bentang Alam, Sejarah Peradaban, &amp; Misi Antariksa (R04)</p>
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
            <span>Filter Urutan Waktu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-cyan-300 font-bold">
              {isFilterActive ? `≤ ${formatYearDisplay(sliderYear)}` : 'Semua Masa'}
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
          min={minYear}
          max={maxYear}
          step={1}
          value={sliderYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>{formatYearDisplay(minYear)}</span>
          <span>{formatYearDisplay(Math.round((minYear + maxYear) / 2))}</span>
          <span>{formatYearDisplay(maxYear)}</span>
        </div>
      </div>

      {/* List of Missions / POIs */}
      <div className="mt-5 space-y-3 flex-1">
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              Tidak ada catatan sejarah sebelum {formatYearDisplay(sliderYear)}.
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
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 items-center justify-center rounded-lg bg-indigo-500/20 px-2 font-mono text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
                        {formatYearDisplay(event.tahun_kejadian)}
                      </span>
                      {event.era_label && (
                        <span className="rounded-md bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                          {event.era_label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">
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

                {/* Subjudul / Lokasi / Wahana */}
                {event.nama_wahana && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-cyan-300/90 font-medium">
                    <Rocket className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span>{event.nama_wahana}</span>
                  </div>
                )}

                {/* Foto / Ilustrasi Peristiwa */}
                {event.gambar_url && (
                  <div className="mt-2.5 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40">
                    <img
                      src={event.gambar_url}
                      alt={event.judul}
                      className="w-full h-32 object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Deskripsi Lengkap */}
                <p className="mt-2 text-xs text-slate-300 leading-relaxed text-justify">
                  {event.deskripsi}
                </p>

                {/* Sumber Referensi */}
                {event.sumber_referensi && (
                  <div className="mt-2 text-[10px] text-slate-400 italic">
                    Sumber: {event.sumber_referensi}
                  </div>
                )}

                {/* Spherical Coordinates & Focus Button (R04) */}
                <div className="mt-3 pt-3 border-t border-slate-800/70 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                    <span>
                      {event.koordinat_lat !== null && event.koordinat_lat !== undefined && (event.koordinat_lat !== 0 || (event.koordinat_lng !== null && event.koordinat_lng !== undefined && event.koordinat_lng !== 0))
                        ? `${event.koordinat_lat}° L, ${event.koordinat_lng}° B`
                        : 'Arsip / Ilustrasi'}
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

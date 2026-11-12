'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Calendar,
  Rocket,
  Compass,
  Filter,
  CheckCircle,
  Eye,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import { FALLBACK_HISTORY_EVENTS } from '@/data/fallbackMasterData';
import {
  EARTH_ERA_OPTIONS,
  MODERN_ERA_LABEL,
  MODERN_CENTURY_OPTIONS,
  matchesModernCenturyFilter,
} from '@/lib/constants/historyFilters';
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
  const [selectedEraFilter, setSelectedEraFilter] = useState<string>('ALL');
  const [selectedCenturyFilter, setSelectedCenturyFilter] = useState<string>('ALL');
  const [detailEvent, setDetailEvent] = useState<HistoryEvent | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Reset filter 2 tingkat & detail modal saat planet berganti
  useEffect(() => {
    setSelectedEraFilter('ALL');
    setSelectedCenturyFilter('ALL');
    setIsFilterActive(false);
    setSelectedYearFilter(null);
    setDetailEvent(null);
    setBrokenImages({});
  }, [activePlanetId, setSelectedYearFilter]);

  // Tutup modal detail dengan tombol Escape
  useEffect(() => {
    if (!detailEvent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailEvent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailEvent]);

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
            setBrokenImages({});
          } else {
            setEvents(FALLBACK_HISTORY_EVENTS[activePlanetId] || []);
          }
        }
      } catch {
        if (isMounted) {
          setEvents(FALLBACK_HISTORY_EVENTS[activePlanetId] || []);
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
    setSelectedEraFilter('ALL');
    setSelectedCenturyFilter('ALL');
    setIsFilterActive(false);
    setSelectedYearFilter(null);
    setSliderYear(maxYear);
  };

  const handleSelectEra = (era: string) => {
    setSelectedEraFilter(era);
    setSelectedCenturyFilter('ALL');
    setIsFilterActive(false);
    setSelectedYearFilter(null);
  };

  const handleSelectCentury = (centuryId: string) => {
    setSelectedCenturyFilter(centuryId);
    setIsFilterActive(false);
    setSelectedYearFilter(null);
  };

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (activePlanetId === 'earth' && selectedEraFilter !== 'ALL') {
        if ((e.era_label || '') !== selectedEraFilter) return false;
        if (
          selectedEraFilter === MODERN_ERA_LABEL &&
          !matchesModernCenturyFilter(e.tahun_kejadian, selectedCenturyFilter)
        ) {
          return false;
        }
      }
      if (isFilterActive && selectedYearFilter !== null && e.tahun_kejadian > selectedYearFilter) {
        return false;
      }
      return true;
    });
  }, [
    events,
    activePlanetId,
    selectedEraFilter,
    selectedCenturyFilter,
    isFilterActive,
    selectedYearFilter,
  ]);

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

      {/* Filter 2 Tingkat (Khusus Bumi: 6 Zaman Baku + Sub-Filter 1 Abad Era Modern) */}
      {activePlanetId === 'earth' && (
        <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-3.5 space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 mb-2">
              <span className="uppercase tracking-wider text-cyan-300">Filter Zaman Bumi</span>
              {selectedEraFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={handleResetFilter}
                  className="text-[10px] text-slate-400 hover:text-cyan-300 underline"
                >
                  Semua Zaman
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleSelectEra('ALL')}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                  selectedEraFilter === 'ALL'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Semua Zaman
              </button>
              {EARTH_ERA_OPTIONS.map((era) => {
                const isEraActive = selectedEraFilter === era;
                return (
                  <button
                    key={era}
                    type="button"
                    onClick={() => handleSelectEra(era)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold border transition-colors text-left ${
                      isEraActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {era}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedEraFilter === MODERN_ERA_LABEL && (
            <div className="pt-2.5 border-t border-slate-800/80">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mb-1.5">
                Sub-Filter Rentang 1 Abad (Zaman Modern)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectCentury('ALL')}
                  className={`rounded-md px-2 py-1 text-[10px] font-mono font-semibold border transition-colors ${
                    selectedCenturyFilter === 'ALL'
                      ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50'
                      : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Semua Abad
                </button>
                {MODERN_CENTURY_OPTIONS.map((century) => {
                  const isCenturyActive = selectedCenturyFilter === century.id;
                  return (
                    <button
                      key={century.id}
                      type="button"
                      onClick={() => handleSelectCentury(century.id)}
                      className={`rounded-md px-2 py-1 text-[10px] font-mono font-semibold border transition-colors ${
                        isCenturyActive
                          ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/50'
                          : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {century.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Year Range Filter Slider (PRD R04) */}
      <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
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

      {/* List of Missions / POIs (Arsitektur List -> Detail) */}
      <div className="mt-4 space-y-3 flex-1">
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <Calendar className="h-8 w-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              Tidak ada catatan sejarah pada filter zaman/tahun ini.
            </p>
            <button
              type="button"
              onClick={handleResetFilter}
              className="mt-3 text-xs font-semibold text-cyan-400 hover:underline"
            >
              Tampilkan Semua Peristiwa
            </button>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isSelected = activePoi?.event_id === event.event_id;
            const hasValidImage = Boolean(event.gambar_url && !brokenImages[event.event_id]);
            const listSummary =
              (event.ringkasan_singkat || '').trim() ||
              event.deskripsi;

            return (
              <div
                key={event.event_id}
                onClick={() => {
                  setActivePoi(event);
                  setDetailEvent(event);
                }}
                className={`rounded-2xl border p-3.5 cursor-pointer transition-all flex gap-3 items-start ${
                  isSelected
                    ? 'border-cyan-500/60 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 shadow-lg shadow-cyan-950/30'
                    : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                }`}
              >
                {/* Thumbnail Foto List Card */}
                <div className="h-20 w-20 rounded-xl border border-slate-700/70 bg-slate-950 overflow-hidden shrink-0 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={event.gambar_url as string}
                      alt={event.judul}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={() =>
                        setBrokenImages((prev) => ({
                          ...prev,
                          [event.event_id]: true,
                        }))
                      }
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="flex h-5 items-center justify-center rounded bg-indigo-500/20 px-1.5 font-mono text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                        {formatYearDisplay(event.tahun_kejadian)}
                      </span>
                      {event.era_label && (
                        <span className="rounded bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 line-clamp-1 max-w-[190px]">
                          {event.era_label}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <span className="shrink-0 flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-300 border border-cyan-500/30">
                        <CheckCircle className="h-2.5 w-2.5" />
                        Aktif
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white leading-snug line-clamp-1">
                    {event.judul}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                    {listSummary}
                  </p>

                  <div className="pt-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePoi(event);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      <Eye className="h-3 w-3" />
                      <span>{isSelected ? 'Terfokus' : 'Pin 3D'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePoi(event);
                        setDetailEvent(event);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 transition-colors shadow-sm"
                    >
                      <span>Detail</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
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

      {/* Modal Detail Peristiwa (Tahap 2 Alur List -> Detail) */}
      {detailEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setDetailEvent(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-detail-title"
            className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setDetailEvent(null)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Kembali ke Daftar</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailEvent(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Tutup modal detail"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailEvent.gambar_url && !brokenImages[detailEvent.event_id] ? (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                <img
                  src={detailEvent.gambar_url}
                  alt={detailEvent.judul}
                  className="w-full max-h-60 object-cover"
                  onError={() =>
                    setBrokenImages((prev) => ({
                      ...prev,
                      [detailEvent.event_id]: true,
                    }))
                  }
                />
              </div>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/50 text-slate-500 text-xs gap-1.5">
                <ImageIcon className="h-6 w-6 text-slate-600" />
                <span>Ilustrasi foto peristiwa belum tersedia</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-cyan-500/15 border border-cyan-400/30 px-2.5 py-1 text-xs font-bold font-mono text-cyan-300">
                {formatYearDisplay(detailEvent.tahun_kejadian)}
              </span>
              {detailEvent.era_label && (
                <span className="rounded-full bg-indigo-500/15 border border-indigo-400/30 px-2.5 py-0.5 text-[11px] font-medium text-indigo-200">
                  {detailEvent.era_label}
                </span>
              )}
            </div>

            <h3 id="history-detail-title" className="text-lg font-extrabold text-white leading-snug">
              {detailEvent.judul}
            </h3>

            {detailEvent.nama_wahana && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 flex items-start gap-2 text-xs text-amber-200">
                <Rocket className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-amber-400/90">
                    Fakta Lokasi, Ukuran &amp; Data Utama
                  </span>
                  <span className="font-medium">{detailEvent.nama_wahana}</span>
                </div>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line text-justify">
              {detailEvent.deskripsi}
            </p>

            {detailEvent.sumber_referensi && (
              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Sumber referensi ilmiah:{' '}
                <span className="text-slate-200 font-medium">{detailEvent.sumber_referensi}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

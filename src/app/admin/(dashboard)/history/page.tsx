'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Compass,
  Plus,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { HistoryEvent, PoiCategory } from '../../../../types/database';

const PLANET_OPTIONS = [
  { id: 'earth', name: 'Bumi' },
  { id: 'mars', name: 'Mars' },
  { id: 'venus', name: 'Venus' },
  { id: 'mercury', name: 'Merkurius' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturnus' },
  { id: 'uranus', name: 'Uranus' },
  { id: 'neptune', name: 'Neptunus' },
];

function getPlanetBadgeStyle(planetId: string) {
  switch (planetId) {
    case 'mars':
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        dot: 'bg-red-500',
        label: 'Mars',
      };
    case 'venus':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Venus',
      };
    case 'jupiter':
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
        label: 'Jupiter',
      };
    case 'earth':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        label: 'Bumi',
      };
    case 'mercury':
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-500',
        label: 'Merkurius',
      };
    case 'saturn':
      return {
        bg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        dot: 'bg-yellow-500',
        label: 'Saturnus',
      };
    case 'uranus':
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        dot: 'bg-cyan-500',
        label: 'Uranus',
      };
    case 'neptune':
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-500',
        label: 'Neptunus',
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400',
        label: planetId,
      };
  }
}

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

const DEFAULT_EVENT: Partial<HistoryEvent> = {
  planet_id: 'earth',
  era_label: 'Sejarah & Bentang Alam',
  tahun_kejadian: new Date().getFullYear(),
  kategori_poi: 'SURFACE_LANDING',
  judul: '',
  nama_wahana: '',
  deskripsi: '',
  koordinat_lat: 0,
  koordinat_lng: 0,
  sumber_referensi: '',
};

export default function AdminHistoryPage() {
  const { searchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanetFilter, setSelectedPlanetFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [editingEvent, setEditingEvent] = useState<HistoryEvent | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<HistoryEvent>>(DEFAULT_EVENT);
  const [saving, setSaving] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState<HistoryEvent | null>(null);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('history_events')
        .select('*')
        .order('tahun_kejadian', { ascending: true });

      if (error) throw error;
      setEvents((data || []) as HistoryEvent[]);
    } catch (err: unknown) {
      console.error('Error fetching history events:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengambil data peristiwa sejarah dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Saring peristiwa sesuai filter planet, tahun, dan search query (M-01)
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchPlanet =
        selectedPlanetFilter === 'ALL' || ev.planet_id === selectedPlanetFilter;
      const matchYear =
        selectedYearFilter === 'ALL' ||
        (selectedYearFilter === 'ANCIENT' && ev.tahun_kejadian < 1) ||
        String(ev.tahun_kejadian) === selectedYearFilter ||
        (selectedYearFilter === '1960s' && ev.tahun_kejadian >= 1960 && ev.tahun_kejadian <= 1969) ||
        (selectedYearFilter === '1970s' && ev.tahun_kejadian >= 1970 && ev.tahun_kejadian <= 1979) ||
        (selectedYearFilter === '1990s' && ev.tahun_kejadian >= 1990 && ev.tahun_kejadian <= 1999) ||
        (selectedYearFilter === '2000s' && ev.tahun_kejadian >= 2000 && ev.tahun_kejadian <= 2009) ||
        (selectedYearFilter === '2010s' && ev.tahun_kejadian >= 2010 && ev.tahun_kejadian <= 2019) ||
        (selectedYearFilter === '2020s' && ev.tahun_kejadian >= 2020);

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        ev.judul.toLowerCase().includes(q) ||
        (ev.era_label && ev.era_label.toLowerCase().includes(q)) ||
        (ev.nama_wahana && ev.nama_wahana.toLowerCase().includes(q)) ||
        (ev.deskripsi && ev.deskripsi.toLowerCase().includes(q)) ||
        (ev.sumber_referensi && ev.sumber_referensi.toLowerCase().includes(q)) ||
        ev.planet_id.toLowerCase().includes(q);

      return matchPlanet && matchYear && matchSearch;
    });
  }, [events, selectedPlanetFilter, selectedYearFilter, searchQuery]);

  // Reset pagination saat filter berganti
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanetFilter, selectedYearFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEvents.slice(start, start + itemsPerPage);
  }, [filteredEvents, currentPage, itemsPerPage]);

  const handleOpenEdit = (event: HistoryEvent) => {
    setEditingEvent(event);
    setFormData({ ...event });
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormData({
      ...DEFAULT_EVENT,
      planet_id: selectedPlanetFilter !== 'ALL' ? selectedPlanetFilter : 'earth',
    });
    setIsAdding(true);
  };

  const handleCloseModal = () => {
    setEditingEvent(null);
    setIsAdding(false);
    setFormData(DEFAULT_EVENT);
  };

  const handleResetFilter = () => {
    setSelectedPlanetFilter('ALL');
    setSelectedYearFilter('ALL');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    // Validasi koordinat sesuai spesifikasi IAU
    const lat = Number(formData.koordinat_lat);
    const lng = Number(formData.koordinat_lng);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setNotification({
        type: 'error',
        message: 'Koordinat Latitude harus berada di antara -90° dan 90°.',
      });
      setSaving(false);
      return;
    }

    if (isNaN(lng) || lng < -180 || lng > 180) {
      setNotification({
        type: 'error',
        message: 'Koordinat Longitude harus berada di antara -180° dan 180°.',
      });
      setSaving(false);
      return;
    }

    try {
      if (isAdding) {
        const { error } = await supabase.from('history_events').insert({
          planet_id: formData.planet_id || 'earth',
          era_label: (formData.era_label || '').trim() || 'Sejarah & Bentang Alam',
          tahun_kejadian: Number(formData.tahun_kejadian) || 2024,
          kategori_poi: (formData.kategori_poi || 'SURFACE_LANDING') as PoiCategory,
          judul: (formData.judul || '').trim(),
          nama_wahana: formData.nama_wahana?.trim() || null,
          deskripsi: (formData.deskripsi || '').trim(),
          koordinat_lat: lat,
          koordinat_lng: lng,
          sumber_referensi: formData.sumber_referensi?.trim() || '',
        });

        if (error) throw error;
        setNotification({
          type: 'success',
          message: 'Peristiwa sejarah baru berhasil ditambahkan ke Supabase!',
        });
      } else if (editingEvent) {
        const { error } = await supabase
          .from('history_events')
          .update({
            planet_id: formData.planet_id || editingEvent.planet_id,
            era_label: formData.era_label !== undefined ? (formData.era_label.trim() || 'Sejarah & Bentang Alam') : (editingEvent.era_label || 'Sejarah & Bentang Alam'),
            tahun_kejadian: Number(formData.tahun_kejadian) || editingEvent.tahun_kejadian,
            kategori_poi: (formData.kategori_poi || editingEvent.kategori_poi || 'SURFACE_LANDING') as PoiCategory,
            judul: (formData.judul || editingEvent.judul).trim(),
            nama_wahana: formData.nama_wahana ? formData.nama_wahana.trim() : formData.nama_wahana === null ? null : editingEvent.nama_wahana,
            deskripsi: (formData.deskripsi || editingEvent.deskripsi).trim(),
            koordinat_lat: lat,
            koordinat_lng: lng,
            sumber_referensi: formData.sumber_referensi !== undefined ? (formData.sumber_referensi?.trim() || '') : (editingEvent.sumber_referensi || ''),
          })
          .eq('event_id', editingEvent.event_id);

        if (error) throw error;
        setNotification({
          type: 'success',
          message: `Peristiwa "${formData.judul}" berhasil diperbarui!`,
        });
      }

      handleCloseModal();
      await fetchEvents();
    } catch (err: unknown) {
      console.error('Save error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan peristiwa sejarah.';
      setNotification({ type: 'error', message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('history_events')
        .delete()
        .eq('event_id', deletingEvent.event_id);

      if (error) throw error;

      setNotification({
        type: 'success',
        message: `Peristiwa "${deletingEvent.judul}" berhasil dihapus dari Supabase.`,
      });
      if (editingEvent?.event_id === deletingEvent.event_id) {
        handleCloseModal();
      }
      setDeletingEvent(null);
      await fetchEvents();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus peristiwa.';
      setNotification({ type: 'error', message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai Gambar A03 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sejarah &amp; POI
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola linimasa penjelajahan historis antariksa dan titik koordinat pendaratan wahana (POI) pada simulasi planet 3D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchEvents();
            }}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
            title="Segarkan data peristiwa"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Peristiwa</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border p-4 text-xs font-medium ${
            notification.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{notification.message}</div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Filter Bar Card Sesuai Gambar A03 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Filter Planet */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              FILTER PLANET:
            </span>
            <select
              value={selectedPlanetFilter}
              onChange={(e) => setSelectedPlanetFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Planet</option>
              {PLANET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Periode Tahun */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 uppercase text-[11px] tracking-wider">
              PERIODE TAHUN:
            </span>
            <select
              value={selectedYearFilter}
              onChange={(e) => setSelectedYearFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-600 focus:outline-none"
            >
              <option value="ALL">Semua Tahun</option>
              <option value="ANCIENT">Zaman Prasejarah &amp; SM (&lt; 1 M)</option>
              <option value="1960s">Dekade 1960-an (Perlombaan Antariksa)</option>
              <option value="1970s">Dekade 1970-an (Misi Viking &amp; Venera)</option>
              <option value="1990s">Dekade 1990-an (Pathfinder &amp; ISS)</option>
              <option value="2000s">Dekade 2000-an (Spirit &amp; Opportunity)</option>
              <option value="2010s">Dekade 2010-an (Curiosity)</option>
              <option value="2020s">Dekade 2020-an (Perseverance &amp; Artemis)</option>
            </select>
          </div>

          {/* Reset Filter */}
          <button
            type="button"
            onClick={handleResetFilter}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Total Entitas Badge */}
        <div className="flex items-center gap-2 self-start lg:self-auto text-xs">
          <span className="text-slate-500 font-medium">Total Entitas Terdaftar:</span>
          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800">
            {filteredEvents.length} Peristiwa POI
          </span>
        </div>
      </div>

      {/* 3. Table Card Sesuai Gambar A03 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5 w-36">TAHUN</th>
                <th className="px-6 py-3.5">NAMA PERISTIWA</th>
                <th className="px-6 py-3.5 w-32">PLANET</th>
                <th className="px-6 py-3.5 text-right w-28">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Memuat linimasa sejarah POI...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Tidak ada peristiwa yang cocok dengan filter atau pencarian yang dipilih.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const planetBadge = getPlanetBadgeStyle(event.planet_id);
                  return (
                    <tr
                      key={event.event_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* TAHUN */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-mono font-bold text-sm text-blue-600">
                            {formatYearDisplay(event.tahun_kejadian)}
                          </span>
                          {event.era_label && (
                            <span
                              className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 line-clamp-1 max-w-[170px]"
                              title={event.era_label}
                            >
                              {event.era_label}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* NAMA PERISTIWA */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {event.judul}
                          </p>
                          <p className="text-slate-500 text-xs mt-0.5 font-mono">
                            {event.nama_wahana ? `${event.nama_wahana} • ` : ''}
                            Lat: {Number(event.koordinat_lat).toFixed(4)}°, Long: {Number(event.koordinat_lng).toFixed(4)}°
                          </p>
                        </div>
                      </td>

                      {/* PLANET BADGE */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${planetBadge.bg}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${planetBadge.dot}`} />
                          <span>{planetBadge.label}</span>
                        </span>
                      </td>

                      {/* AKSI */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(event)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 px-3 py-1.5 text-xs font-medium shadow-sm transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Ubah Data</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvent(event)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Peristiwa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Functional Pagination (M-02) */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredEvents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredEvents.length)} dari {filteredEvents.length} peristiwa
            {searchQuery && ` (difilter dari "${searchQuery}")`}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Sebelumnya
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setCurrentPage(num)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                  currentPage === num
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* 4. Modal Form: Tambah / Ubah Peristiwa */}
      {(editingEvent || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAdding ? 'Tambah Peristiwa POI Baru' : `Ubah Data Peristiwa`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tentukan tahun, nama wahana antariksa, dan koordinat permukaan 3D
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planet Target */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Planet Target
                  </label>
                  <select
                    value={formData.planet_id || 'earth'}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kategori POI */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori POI / Misi
                  </label>
                  <select
                    value={formData.kategori_poi || 'SURFACE_LANDING'}
                    onChange={(e) =>
                      setFormData({ ...formData, kategori_poi: e.target.value as PoiCategory })
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="OBSERVATION">OBSERVATION — Bentang Alam &amp; Sejarah Peradaban</option>
                    <option value="SURFACE_LANDING">SURFACE_LANDING — Pendaratan Permukaan</option>
                    <option value="ORBITAL_FLYBY">ORBITAL_FLYBY — Lintas Wahana / Orbit</option>
                  </select>
                </div>

                {/* Babak / Era Sejarah / Topik Bahasan */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Babak / Era Sejarah / Topik Bahasan
                  </label>
                  <input
                    type="text"
                    value={formData.era_label || ''}
                    onChange={(e) => setFormData({ ...formData, era_label: e.target.value })}
                    placeholder="misal: Zaman Dinosaurus (~66 Juta SM) / Sejarah Islam (~2000 SM) / Fenomena Hujan Berlian"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Tahun Kejadian */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahun Filter Urutan (Gunakan angka negatif untuk SM/Prasejarah, misal -2560 untuk 2560 SM)
                  </label>
                  <input
                    type="number"
                    value={formData.tahun_kejadian ?? 1969}
                    onChange={(e) =>
                      setFormData({ ...formData, tahun_kejadian: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Preview Tahun:{' '}
                    <strong className="text-blue-600 font-mono">
                      {formatYearDisplay(formData.tahun_kejadian ?? 0)}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Judul Peristiwa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Sejarah / Bentang Alam / POI
                </label>
                <input
                  type="text"
                  value={formData.judul || ''}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  placeholder="misal: Pendaratan Apollo 11 di Bulan (Laut Ketenangan)"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Lokasi & Subjudul / Objek / Wahana */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lokasi &amp; Subjudul / Objek / Wahana
                </label>
                <input
                  type="text"
                  value={formData.nama_wahana || ''}
                  onChange={(e) => setFormData({ ...formData, nama_wahana: e.target.value })}
                  placeholder="misal: Masjidil Haram, Makkah • Nabi Ibrahim AS & Nabi Ismail AS"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Koordinat Lat & Lng */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Koordinat Latitude (-90° s/d 90°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={formData.koordinat_lat ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, koordinat_lat: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Koordinat Longitude (-180° s/d 180°)
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={formData.koordinat_lng ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, koordinat_lng: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penjelasan Lengkap Sejarah, Sains, &amp; Keberadaannya Saat Ini
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi || ''}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  required
                  placeholder="Penjelasan latar belakang sejarah, bentang alam, pencapaian sains, dan dampaknya bagi peradaban atau eksplorasi antariksa."
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Sumber Referensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Referensi Ilmiah
                </label>
                <input
                  type="text"
                  value={formData.sumber_referensi || ''}
                  onChange={(e) => setFormData({ ...formData, sumber_referensi: e.target.value })}
                  placeholder="misal: UNESCO World Heritage / NASA Planetary Fact Sheet / Nature"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {!isAdding && editingEvent && (
                    <button
                      type="button"
                      onClick={() => setDeletingEvent(editingEvent)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Peristiwa</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Data'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Custom (R-03) */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Peristiwa Sejarah?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus peristiwa{' '}
              <strong className="text-slate-900">"{deletingEvent.judul}"</strong>? Titik POI ini tidak akan lagi ditampilkan pada permukaan planet 3D AstroSphere.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

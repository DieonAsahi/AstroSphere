'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Filter,
  Compass,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { HistoryEvent, PlanetSlug, PoiCategory } from '../../../../types/database';

const PLANET_OPTIONS: { id: PlanetSlug; label: string }[] = [
  { id: 'mercury', label: 'Merkurius' },
  { id: 'venus', label: 'Venus' },
  { id: 'earth', label: 'Bumi' },
  { id: 'mars', label: 'Mars' },
  { id: 'jupiter', label: 'Jupiter' },
  { id: 'saturn', label: 'Saturnus' },
  { id: 'uranus', label: 'Uranus' },
  { id: 'neptune', label: 'Neptunus' },
];

const POI_CATEGORIES: { id: PoiCategory; label: string; desc: string }[] = [
  {
    id: 'SURFACE_LANDING',
    label: 'Pendaratan Permukaan (Surface Landing)',
    desc: 'Wahana/rover mendarat di permukaan planet kebumian (Bumi, Mars, Venus).',
  },
  {
    id: 'ORBITAL_FLYBY',
    label: 'Lintas Wahana / Flyby (Orbital Flyby)',
    desc: 'Wahana melintas di dekat planet untuk gravitasi/pemotretan.',
  },
  {
    id: 'OBSERVATION',
    label: 'Observasi & Eksperimen (Observation)',
    desc: 'Stasiun luar angkasa, wahana pengorbit, atau observasi atmosfer.',
  },
];

// Helper kalkulasi vektor 3D Kartesius dari koordinat bola (Lat/Lng)
function calculateVector3(lat: number, lng: number, radius = 5.0) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return {
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    z: Number(z.toFixed(3)),
  };
}

export default function AdminHistoryPage() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters (PRD R04 & Bagian 8)
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const minYear = 1950;
  const [maxYear, setMaxYear] = useState<number>(2030);

  // Form Modal (Tambah / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<HistoryEvent>>({
    planet_id: 'earth',
    tahun_kejadian: 1969,
    kategori_poi: 'SURFACE_LANDING',
    judul: '',
    deskripsi: '',
    koordinat_lat: 28.57,
    koordinat_lng: -80.64,
    nama_wahana: '',
  });

  // Delete Confirmation Modal
  const [deletingEvent, setDeletingEvent] = useState<HistoryEvent | null>(null);
  const [saving, setSaving] = useState(false);

  // 2D Map Picker Ref
  const mapPickerRef = useRef<HTMLDivElement>(null);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('history_events')
        .select('*')
        .order('tahun_kejadian', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as HistoryEvent[]);
    } catch (err: unknown) {
      console.error('Error fetching history events:', err);
      setNotification({
        type: 'error',
        message: 'Gagal memuat daftar peristiwa sejarah dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Filtered List based on Planet, Category, Year Range, and Search (R04)
  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      if (selectedPlanet !== 'all' && item.planet_id !== selectedPlanet) return false;
      if (selectedCategory !== 'all' && item.kategori_poi !== selectedCategory) return false;
      if (item.tahun_kejadian < minYear || item.tahun_kejadian > maxYear) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(query);
        const matchWahana = item.nama_wahana?.toLowerCase().includes(query);
        const matchDesc = item.deskripsi.toLowerCase().includes(query);
        if (!matchTitle && !matchWahana && !matchDesc) return false;
      }
      return true;
    });
  }, [events, selectedPlanet, selectedCategory, minYear, maxYear, searchQuery]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      planet_id: selectedPlanet !== 'all' ? selectedPlanet : 'earth',
      tahun_kejadian: new Date().getFullYear(),
      kategori_poi: 'SURFACE_LANDING',
      judul: '',
      deskripsi: '',
      koordinat_lat: 0,
      koordinat_lng: 0,
      nama_wahana: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (event: HistoryEvent) => {
    setIsEditing(true);
    setFormData({
      event_id: event.event_id,
      planet_id: event.planet_id,
      tahun_kejadian: event.tahun_kejadian,
      kategori_poi: event.kategori_poi || 'SURFACE_LANDING',
      judul: event.judul,
      deskripsi: event.deskripsi,
      koordinat_lat: Number(event.koordinat_lat),
      koordinat_lng: Number(event.koordinat_lng),
      nama_wahana: event.nama_wahana || '',
    });
    setModalOpen(true);
  };

  // Visual 2D Coordinate Picker Click Handler
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapPickerRef.current) return;
    const rect = mapPickerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // x: 0..width -> lng: -180..+180
    // y: 0..height -> lat: +90..-90
    const lng = (x / rect.width) * 360 - 180;
    const lat = 90 - (y / rect.height) * 180;

    setFormData((prev) => ({
      ...prev,
      koordinat_lat: Number(lat.toFixed(2)),
      koordinat_lng: Number(lng.toFixed(2)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul || !formData.deskripsi || !formData.planet_id) return;

    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        planet_id: formData.planet_id,
        tahun_kejadian: Number(formData.tahun_kejadian),
        kategori_poi: formData.kategori_poi || 'SURFACE_LANDING',
        judul: formData.judul.trim(),
        deskripsi: formData.deskripsi.trim(),
        koordinat_lat: Number(formData.koordinat_lat),
        koordinat_lng: Number(formData.koordinat_lng),
        nama_wahana: formData.nama_wahana?.trim() || null,
      };

      if (isEditing && formData.event_id) {
        const { data, error } = await supabase
          .from('history_events')
          .update(payload)
          .eq('event_id', formData.event_id)
          .select()
          .single();

        if (error) throw error;

        setEvents((prev) =>
          prev.map((item) => (item.event_id === formData.event_id ? (data as HistoryEvent) : item))
        );
        setNotification({
          type: 'success',
          message: `Titik sejarah "${payload.judul}" berhasil diperbarui.`,
        });
      } else {
        const { data, error } = await supabase
          .from('history_events')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setEvents((prev) => [data as HistoryEvent, ...prev]);
        setNotification({
          type: 'success',
          message: `Titik sejarah baru "${payload.judul}" berhasil ditambahkan ke ${payload.planet_id}.`,
        });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving history event:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan titik sejarah. Pastikan form terisi dengan benar.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEvent) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('history_events')
        .delete()
        .eq('event_id', deletingEvent.event_id);

      if (error) throw error;

      setEvents((prev) => prev.filter((item) => item.event_id !== deletingEvent.event_id));
      setNotification({
        type: 'success',
        message: `Peristiwa "${deletingEvent.judul}" berhasil dihapus.`,
      });
      setDeletingEvent(null);
    } catch (err: unknown) {
      console.error('Error deleting event:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menghapus peristiwa sejarah.',
      });
    } finally {
      setSaving(false);
    }
  };

  const vector3Preview = calculateVector3(
    formData.koordinat_lat || 0,
    formData.koordinat_lng || 0
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Manajemen Sejarah & Visual 2D Coordinate Picker
            </h1>
            <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
              PRD R04 & Bagian 8
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kelola peristiwa pendaratan dan flyby antariksa dengan pemilih koordinat 2D interaktif serta proyeksi 3D bola.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchEvents();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Titik POI Baru</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-4 text-xs ${
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter Control Bar (PRD R04) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4.5 backdrop-blur-sm space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Filter className="h-4 w-4 text-cyan-400" />
            <span>Filter Linimasa Sejarah & Eksplorasi (Mendukung R04)</span>
          </div>
          <span className="font-mono text-xs text-cyan-400 font-bold">
            {filteredEvents.length} Titik Ditemukan
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Planet Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Filter Planet
            </label>
            <select
              value={selectedPlanet}
              onChange={(e) => setSelectedPlanet(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Semua Planet (8)</option>
              {PLANET_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori POI Filter (PRD Bagian 8) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Kategori POI (Bagian 8 PRD)
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              {POI_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rentang Tahun Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Maksimal Tahun Kejadian:</span>
              <span className="font-mono font-bold text-cyan-400">≤ {maxYear}</span>
            </div>
            <input
              type="range"
              min={1955}
              max={2030}
              value={maxYear}
              onChange={(e) => setMaxYear(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1955</span>
              <span>1990</span>
              <span>2030</span>
            </div>
          </div>

          {/* Pencarian Teks */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Cari Misi / Wahana
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Apollo, Rover, Galileo..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table of Events */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold text-center w-16">Tahun</th>
                <th className="px-5 py-3 font-semibold">Planet</th>
                <th className="px-5 py-3 font-semibold">Kategori</th>
                <th className="px-5 py-3 font-semibold">Judul Misi</th>
                <th className="px-5 py-3 font-semibold">Wahana</th>
                <th className="px-5 py-3 font-semibold text-center">Koordinat Bola</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                      <span>Memuat linimasa sejarah...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada peristiwa sejarah yang cocok dengan kriteria filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((item) => (
                  <tr key={item.event_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-indigo-400">
                      {item.tahun_kejadian}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-slate-300">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] border border-slate-700">
                        {item.planet_id}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                          item.kategori_poi === 'SURFACE_LANDING'
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : item.kategori_poi === 'ORBITAL_FLYBY'
                            ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {item.kategori_poi || 'SURFACE_LANDING'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      <div>{item.judul}</div>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 font-normal">
                        {item.deskripsi}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      {item.nama_wahana ? (
                        <span className="font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20 text-[11px]">
                          {item.nama_wahana}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono text-[11px] text-slate-300">
                      <span className="rounded bg-slate-950 px-2 py-0.5 border border-slate-800">
                        {Number(item.koordinat_lat).toFixed(2)}°, {Number(item.koordinat_lng).toFixed(2)}°
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 hover:text-white transition-colors"
                          title="Edit Peristiwa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEvent(item)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 p-1.5 text-red-400 hover:text-red-300 transition-colors"
                          title="Hapus Peristiwa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah & Edit dengan Visual 2D Interactive Coordinate Picker */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Titik Sejarah POI' : 'Tambah Titik Sejarah POI Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Penentu koordinat lat/lng visual dan parameter misi bersejarah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Planet Induk */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Planet Induk
                  </label>
                  <select
                    value={formData.planet_id}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun Kejadian */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tahun Misi (Filter R04)
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.tahun_kejadian}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tahun_kejadian: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                {/* Kategori POI (PRD Bagian 8) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kategori POI (PRD)
                  </label>
                  <select
                    value={formData.kategori_poi || 'SURFACE_LANDING'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        kategori_poi: e.target.value as PoiCategory,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="SURFACE_LANDING">Pendaratan Permukaan</option>
                    <option value="ORBITAL_FLYBY">Lintas Wahana / Flyby</option>
                    <option value="OBSERVATION">Observasi & Lab Orbit</option>
                  </select>
                </div>
              </div>

              {/* Judul & Nama Wahana */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Judul Peristiwa Misi
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    placeholder="Contoh: Pendaratan Rover Perseverance"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Wahana / Lander / Probe
                  </label>
                  <input
                    type="text"
                    value={formData.nama_wahana || ''}
                    onChange={(e) => setFormData({ ...formData, nama_wahana: e.target.value })}
                    placeholder="Contoh: Perseverance & Ingenuity"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* VISUAL 2D INTERACTIVE COORDINATE PICKER (EQUIRECTANGULAR MAP) */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400">
                    <Compass className="h-4 w-4" />
                    <span>Visual 2D Interactive Coordinate Picker (Klik Peta untuk Isi)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Proyeksi Equirectangular (-90° s/d 90° Lat, -180° s/d 180° Lng)
                  </span>
                </div>

                {/* 2D Map Canvas Canvas Box */}
                <div
                  ref={mapPickerRef}
                  onClick={handleMapClick}
                  className="relative h-44 w-full rounded-lg border border-slate-700 bg-slate-950 overflow-hidden cursor-crosshair select-none group"
                  style={{
                    backgroundImage: `
                      radial-gradient(circle at center, rgba(56, 189, 248, 0.05) 0%, transparent 70%),
                      linear-gradient(to right, rgba(51, 65, 85, 0.3) 1px, transparent 1px),
                      linear-gradient(to bottom, rgba(51, 65, 85, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '100% 100%, 25% 100%, 100% 25%',
                  }}
                >
                  {/* Equator & Prime Meridian Axis Lines */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/40" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/40" />

                  {/* Corner Coordinates Labels */}
                  <span className="absolute top-1 left-2 text-[9px] font-mono text-slate-500">+90° LU, -180° BB</span>
                  <span className="absolute top-1 right-2 text-[9px] font-mono text-slate-500">+90° LU, +180° BT</span>
                  <span className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">-90° LS, -180° BB</span>
                  <span className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">-90° LS, +180° BT</span>
                  <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono text-cyan-400/60 bg-slate-950/80 px-1 rounded">
                    (0°, 0°)
                  </span>

                  {/* Interactive Pin Marker on Map */}
                  {formData.koordinat_lat !== undefined && formData.koordinat_lng !== undefined && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-100"
                      style={{
                        left: `${((Number(formData.koordinat_lng) + 180) / 360) * 100}%`,
                        top: `${((90 - Number(formData.koordinat_lat)) / 180) * 100}%`,
                      }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="absolute h-6 w-6 rounded-full bg-cyan-400/30 animate-ping" />
                        <div className="h-3.5 w-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-lg shadow-cyan-400/50" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Coordinate Inputs & 3D Vector3 Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-0.5">
                      Latitude (-90° s/d 90°)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="-90"
                      max="90"
                      value={formData.koordinat_lat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          koordinat_lat: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-0.5">
                      Longitude (-180° s/d 180°)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="-180"
                      max="180"
                      value={formData.koordinat_lng}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          koordinat_lng: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* 3D Vector3 Preview */}
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase">
                      Proyeksi 3D (Vector3)
                    </div>
                    <div className="font-mono text-[11px] text-cyan-300 mt-0.5">
                      [{vector3Preview.x}, {vector3Preview.y}, {vector3Preview.z}]
                    </div>
                  </div>
                </div>
              </div>

              {/* Deskripsi Peristiwa */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deskripsi Narasi Edukatif
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Ceritakan temuan sains atau signifikansi sejarah misi ini..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Titik POI'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Konfirmasi Hapus POI</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus peristiwa sejarah{' '}
              <strong className="text-white">&quot;{deletingEvent.judul}&quot;</strong> ({deletingEvent.tahun_kejadian}) dari planet {deletingEvent.planet_id}?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingEvent(null)}
                className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-red-600/20"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus POI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

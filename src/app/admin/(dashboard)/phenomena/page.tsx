'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Pencil,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Sparkles,
  Layers,
  Trash2,
  Lock,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import { formatSupabaseError } from '../../../../lib/supabase/adminAuth';
import type { Phenomenon, AnimationType, VisualConfig, PlanetSlug } from '../../../../types/database';

const PLANET_OPTIONS: { id: PlanetSlug; label: string; dotColor: string; badgeBg: string }[] = [
  { id: 'mercury', label: 'Merkurius', dotColor: 'bg-slate-400', badgeBg: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'venus', label: 'Venus', dotColor: 'bg-amber-400', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'earth', label: 'Bumi', dotColor: 'bg-blue-500', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'mars', label: 'Mars', dotColor: 'bg-red-500', badgeBg: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'jupiter', label: 'Jupiter', dotColor: 'bg-purple-500', badgeBg: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'saturn', label: 'Saturnus', dotColor: 'bg-yellow-500', badgeBg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'uranus', label: 'Uranus', dotColor: 'bg-teal-500', badgeBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'neptune', label: 'Neptunus', dotColor: 'bg-indigo-500', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
];

const ANIMATION_TYPES: { id: AnimationType; label: string; shortCode: string; defaultSubtitle: string }[] = [
  {
    id: 'SOLAR_ECLIPSE',
    label: 'Gerhana Matahari (Solar Eclipse)',
    shortCode: 'ECLIPSE',
    defaultSubtitle: 'Umbra & Penumbra',
  },
  {
    id: 'LUNAR_ECLIPSE',
    label: 'Gerhana Bulan Total (Lunar Eclipse)',
    shortCode: 'ECLIPSE',
    defaultSubtitle: 'Pembiasan Rayleigh',
  },
  {
    id: 'MOON_PHASES',
    label: 'Siklus 8 Fase Bulan (Moon Phases)',
    shortCode: 'PHASES',
    defaultSubtitle: 'Siklus Sinodis 29.5 Hari',
  },
  {
    id: 'GALILEAN_TRANSIT',
    label: 'Transit Satelit Galilea (Jupiter)',
    shortCode: 'TRANSIT',
    defaultSubtitle: 'Resonansi Orbit Galilea',
  },
  {
    id: 'CUSTOM_ALIGNMENT',
    label: 'Penyelarasan Orbit Kustom (Custom Alignment)',
    shortCode: 'ALIGNMENT',
    defaultSubtitle: 'Orientasi Orbit Benda Langit',
  },
];

const SECONDARY_OBJECT_OPTIONS = [
  { id: 'SUN', label: 'Matahari (Sun)' },
  { id: 'MOON', label: 'Bulan (Moon)' },
  { id: 'IO', label: 'Io (Jupiter)' },
  { id: 'EUROPA', label: 'Europa (Jupiter)' },
  { id: 'GANYMEDE', label: 'Ganymede (Jupiter)' },
  { id: 'CALLISTO', label: 'Callisto (Jupiter)' },
  { id: 'RINGS', label: 'Cincin Planet (Rings)' },
];

function matchesPhenomenonQuery(item: Phenomenon, query: string): boolean {
  if (!query) return true;
  return (
    item.judul.toLowerCase().includes(query) ||
    item.deskripsi_edukatif.toLowerCase().includes(query) ||
    item.planet_id.toLowerCase().includes(query) ||
    item.tipe_animasi.toLowerCase().includes(query)
  );
}

export default function AdminPhenomenaPage() {
  const { searchQuery: topSearchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Phenomenon | null>(null);

  // Structured Form Fields
  const [formData, setFormData] = useState<{
    phenomenon_id?: string;
    planet_id: string;
    judul: string;
    tombol_aksi_label: string;
    tipe_animasi: AnimationType;
    subtitle: string;
    deskripsi_edukatif: string;
    is_active: boolean;
    secondaryObjects: string[];
    showUmbraPenumbra: boolean;
    durationSeconds: number;
    cameraZoomDistance: number;
    educationalSteps: string[];
  }>({
    planet_id: 'earth',
    judul: '',
    tombol_aksi_label: 'Putar Simulasi Fenomena',
    tipe_animasi: 'SOLAR_ECLIPSE',
    subtitle: 'Umbra & Penumbra',
    deskripsi_edukatif: '',
    is_active: true,
    secondaryObjects: ['SUN', 'MOON'],
    showUmbraPenumbra: true,
    durationSeconds: 20,
    cameraZoomDistance: 35,
    educationalSteps: [
      'Tahap 1: Penyejajaran posisi Matahari, Bulan, dan Bumi.',
      'Tahap 2: Pembentukan kerucut bayangan inti Umbra dan penumbra.',
      'Tahap 3: Puncak fenomena dan pemulihan jalur orbit.',
    ],
  });

  const [newStepText, setNewStepText] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);

  const fetchPhenomena = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('phenomena')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPhenomena((data || []) as Phenomenon[]);
    } catch (err: unknown) {
      console.error('Error fetching phenomena:', err);
      setNotification({
        type: 'error',
        message: formatSupabaseError(
          err,
          'Gagal memuat daftar simulasi fenomena dari Supabase'
        ),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPhenomena();
  }, [fetchPhenomena]);

  const topQ = topSearchQuery.trim().toLowerCase();
  const localQ = searchQuery.trim().toLowerCase();

  const filteredPhenomena = useMemo(() => {
    return phenomena.filter((item) => {
      if (selectedPlanet !== 'all' && item.planet_id !== selectedPlanet) return false;
      if (!matchesPhenomenonQuery(item, topQ)) return false;
      if (!matchesPhenomenonQuery(item, localQ)) return false;
      return true;
    });
  }, [phenomena, selectedPlanet, topQ, localQ]);

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanet, topQ, localQ]);

  const totalPages = Math.max(1, Math.ceil(filteredPhenomena.length / itemsPerPage));
  const paginatedPhenomena = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPhenomena.slice(start, start + itemsPerPage);
  }, [filteredPhenomena, currentPage, itemsPerPage]);

  const handleOpenEdit = (item: Phenomenon) => {
    setEditingItem(item);
    setModalError(null);

    const config = (item.konfigurasi_visual || {}) as VisualConfig & { subtitle?: string };
    const secondaryObjects = config.secondaryObjects || ['SUN', 'MOON'];
    const showUmbra = config.showUmbraPenumbra !== undefined ? config.showUmbraPenumbra : true;
    const duration = config.durationSeconds || 20;
    const zoom = config.cameraZoomDistance || 35;
    const steps = config.educationalSteps || [
      'Tahap 1: Penyejajaran posisi pengamatan orbit.',
      'Tahap 2: Puncak pergerakan fenomena astronomi.',
    ];
    const defaultSub =
      ANIMATION_TYPES.find((t) => t.id === item.tipe_animasi)?.defaultSubtitle || 'Efek Optik Antariksa';
    const sub = config.subtitle || defaultSub;

    setFormData({
      phenomenon_id: item.phenomenon_id,
      planet_id: item.planet_id,
      judul: item.judul,
      tombol_aksi_label: item.tombol_aksi_label || 'Putar Simulasi Fenomena',
      tipe_animasi: item.tipe_animasi,
      subtitle: sub,
      deskripsi_edukatif: item.deskripsi_edukatif,
      is_active: item.is_active !== undefined ? item.is_active : true,
      secondaryObjects,
      showUmbraPenumbra: showUmbra,
      durationSeconds: duration,
      cameraZoomDistance: zoom,
      educationalSteps: steps,
    });
    setNewStepText('');
    setModalOpen(true);
  };

  // Toggle Switch Aktif / Nonaktif langsung via tabel
  const handleToggleActive = async (item: Phenomenon) => {
    if (togglingId) return;
    const nextActive = item.is_active === false;

    setTogglingId(item.phenomenon_id);
    setNotification(null);
    setPhenomena((prev) =>
      prev.map((p) =>
        p.phenomenon_id === item.phenomenon_id ? { ...p, is_active: nextActive } : p
      )
    );

    try {
      const { data, error } = await supabase
        .from('phenomena')
        .update({ is_active: nextActive })
        .eq('phenomenon_id', item.phenomenon_id)
        .select('phenomenon_id, is_active')
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Status fenomena tidak terbarui di database.');
      }

      setNotification({
        type: 'success',
        message: `Status fenomena "${item.judul}" diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`,
      });
      await fetchPhenomena();
    } catch (err: unknown) {
      console.error('Toggle active error:', err);
      setPhenomena((prev) =>
        prev.map((p) =>
          p.phenomenon_id === item.phenomenon_id ? { ...p, is_active: item.is_active } : p
        )
      );
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal memperbarui status fenomena'),
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleObject = (objId: string) => {
    setFormData((prev) => {
      const exists = prev.secondaryObjects.includes(objId);
      return {
        ...prev,
        secondaryObjects: exists
          ? prev.secondaryObjects.filter((id) => id !== objId)
          : [...prev.secondaryObjects, objId],
      };
    });
  };

  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      educationalSteps: [...prev.educationalSteps, newStepText.trim()],
    }));
    setNewStepText('');
  };

  const handleRemoveStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      educationalSteps: prev.educationalSteps.filter((_, idx) => idx !== index),
    }));
  };

  const compiledVisualConfig: VisualConfig & { subtitle: string } = useMemo(() => {
    return {
      secondaryObjects: formData.secondaryObjects,
      showUmbraPenumbra: formData.showUmbraPenumbra,
      durationSeconds: Number(formData.durationSeconds),
      cameraZoomDistance: Number(formData.cameraZoomDistance),
      educationalSteps: formData.educationalSteps,
      subtitle: formData.subtitle.trim(),
    };
  }, [
    formData.secondaryObjects,
    formData.showUmbraPenumbra,
    formData.durationSeconds,
    formData.cameraZoomDistance,
    formData.educationalSteps,
    formData.subtitle,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formData.phenomenon_id) return;

    setModalError(null);

    if (!formData.judul.trim()) {
      setModalError('Judul fenomena astronomi wajib diisi.');
      return;
    }

    if (!formData.deskripsi_edukatif.trim()) {
      setModalError('Deskripsi lengkap materi fenomena wajib diisi.');
      return;
    }

    try {
      setSaving(true);
      setNotification(null);

      // Planet dan tipe animasi dikunci sesuai struktur 3D asli dari database
      const payload = {
        planet_id: editingItem.planet_id,
        judul: formData.judul.trim(),
        tombol_aksi_label: formData.tombol_aksi_label.trim() || 'Putar Simulasi Fenomena',
        tipe_animasi: editingItem.tipe_animasi,
        deskripsi_edukatif: formData.deskripsi_edukatif.trim(),
        konfigurasi_visual: compiledVisualConfig,
        is_active: formData.is_active,
      };

      const { data, error } = await supabase
        .from('phenomena')
        .update(payload)
        .eq('phenomenon_id', formData.phenomenon_id)
        .select('phenomenon_id')
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Data fenomena tidak terbarui di database.');
      }

      setNotification({
        type: 'success',
        message: `Simulasi "${payload.judul}" berhasil diperbarui di Supabase.`,
      });

      setModalOpen(false);
      setEditingItem(null);
      setModalError(null);
      await fetchPhenomena();
    } catch (err: unknown) {
      console.error('Error saving phenomenon:', err);
      setModalError(
        formatSupabaseError(
          err,
          'Gagal menyimpan perubahan simulasi fenomena ke database Supabase'
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const activeFilterTags = [topSearchQuery.trim(), searchQuery.trim()].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section (Tanpa Tombol Tambah Fenomena) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Fenomena Astronomi
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Kelola konfigurasi fenomena optik, narasi edukatif, dan status aktif simulasi astronomi 3D AstroSphere.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchPhenomena();
            }}
            disabled={refreshing}
            className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            title="Muat ulang data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar (Matching Mockup A04) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input Lokal */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama fenomena..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian fenomena"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Planet Dropdown */}
          <select
            value={selectedPlanet}
            onChange={(e) => setSelectedPlanet(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          >
            <option value="all">Semua Planet</option>
            {PLANET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtered Badge */}
        <div className="shrink-0 flex items-center justify-end gap-2">
          {topQ && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Header: "{topSearchQuery.trim()}"
            </span>
          )}
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {filteredPhenomena.length} Fenomena Terdaftar
          </span>
        </div>
      </div>

      {/* Table Card (Matching Mockup A04 dengan Kolom STATUS) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm font-medium">Memuat data fenomena astronomi...</p>
          </div>
        ) : filteredPhenomena.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Tidak ada simulasi fenomena</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tidak ditemukan data fenomena yang sesuai dengan kriteria filter saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-6">Nama Fenomena</th>
                  <th className="py-3 px-6">Planet</th>
                  <th className="py-3 px-6">Tipe Animasi</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedPhenomena.map((item) => {
                  const planetInfo = PLANET_OPTIONS.find((p) => p.id === item.planet_id) || {
                    id: item.planet_id,
                    label: item.planet_id,
                    dotColor: 'bg-slate-400',
                    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
                  };
                  const animMeta = ANIMATION_TYPES.find((t) => t.id === item.tipe_animasi);
                  const config = (item.konfigurasi_visual || {}) as VisualConfig & { subtitle?: string };
                  const subtext = config.subtitle || animMeta?.defaultSubtitle || 'Simulasi Visual';
                  const isActive = item.is_active !== false;

                  return (
                    <tr
                      key={item.phenomenon_id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Nama Fenomena */}
                      <td className="py-4 px-6 max-w-md">
                        <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.judul}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {item.deskripsi_edukatif}
                        </p>
                      </td>

                      {/* Planet Badge with Dot */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${planetInfo.badgeBg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${planetInfo.dotColor}`} />
                          {planetInfo.label}
                        </span>
                      </td>

                      {/* Tipe Animasi */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 text-xs tracking-wider">
                          {animMeta?.shortCode || item.tipe_animasi}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>
                      </td>

                      {/* Switch Toggle Status Aktif / Nonaktif */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(item)}
                            disabled={togglingId === item.phenomenon_id}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${togglingId === item.phenomenon_id ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
                            title={`Klik untuk ${isActive ? 'menonaktifkan' : 'mengaktifkan'} fenomena`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              isActive ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      </td>

                      {/* Aksi Button */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm hover:text-blue-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Ubah Data</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer with Functional Pagination (M-02) */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Menampilkan {filteredPhenomena.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredPhenomena.length)} dari {filteredPhenomena.length} fenomena
            {activeFilterTags.length > 0 && ` (difilter: "${activeFilterTags.join('", "')}")`}
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

      {/* Edit Modal (Planet & Tipe Animasi Terkunci, Notifikasi Error di Dalam Modal) */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ubah Simulasi Fenomena: {editingItem.judul}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi parameter visual, narasi edukatif, dan status aktif simulasi
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setModalOpen(false);
                  setEditingItem(null);
                  setModalError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Error Banner di Dalam Modal */}
              {modalError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">{modalError}</div>
                  <button
                    type="button"
                    onClick={() => setModalError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Status Visibilitas Fenomena */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div>
                  <span className="text-xs font-bold text-slate-900">
                    Visibilitas di HUD Pemain Game AstroSphere
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Jika aktif, pemain dapat memutar simulasi ini di layar 3D.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        is_active: !prev.is_active,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                    } cursor-pointer`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                        formData.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs font-semibold ${
                      formData.is_active ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {formData.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              {/* Grid Baris 1: Planet & Tipe Animasi (DIKUNCI / READ-ONLY) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                      <Lock className="h-3 w-3 text-slate-400" />
                      <span>Planet Terkait (Terkunci)</span>
                    </label>
                    <select
                      value={formData.planet_id}
                      disabled
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                    >
                      {PLANET_OPTIONS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1">
                      <Lock className="h-3 w-3 text-slate-400" />
                      <span>Tipe Animasi Simulasi (Terkunci)</span>
                    </label>
                    <select
                      value={formData.tipe_animasi}
                      disabled
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                    >
                      {ANIMATION_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Planet terkait dan tipe animasi dikunci otomatis karena skenario optik 3D sudah terikat pada kode masing-masing planet.
                </p>
              </div>

              {/* Judul & Label Tombol HUD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Judul Fenomena Astronomi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Gerhana Matahari Total"
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Label Tombol Aksi di Layar HUD
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Putar Simulasi Gerhana"
                    value={formData.tombol_aksi_label}
                    onChange={(e) => setFormData({ ...formData, tombol_aksi_label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Subtitle Efek Optik */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subjudul Efek Optik (Ditampilkan di tabel &amp; header modul)
                </label>
                <input
                  type="text"
                  placeholder="misal: Umbra & Penumbra / Pembiasan Rayleigh"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Deskripsi Edukatif */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Lengkap Materi Fenomena
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan proses fisika/astronomi terjadinya fenomena ini secara ramah siswa..."
                  value={formData.deskripsi_edukatif}
                  onChange={(e) => setFormData({ ...formData, deskripsi_edukatif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Konfigurasi Visual 3D */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Parameter Visualisasi 3D</span>
                </div>

                {/* Secondary Objects Multi-checkbox */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Objek Benda Langit Sekunder Terlibat:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SECONDARY_OBJECT_OPTIONS.map((obj) => {
                      const isChecked = formData.secondaryObjects.includes(obj.id);
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => handleToggleObject(obj.id)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isChecked
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {obj.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sliders: Durasi & Zoom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Durasi Simulasi:</span>
                      <span className="font-bold text-blue-600">{formData.durationSeconds} detik</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={1}
                      value={formData.durationSeconds}
                      onChange={(e) => setFormData({ ...formData, durationSeconds: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>Jarak Kamera 3D:</span>
                      <span className="font-bold text-blue-600">{formData.cameraZoomDistance} unit</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={80}
                      step={1}
                      value={formData.cameraZoomDistance}
                      onChange={(e) => setFormData({ ...formData, cameraZoomDistance: Number(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Show Umbra / Penumbra Checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="umbra_checkbox"
                    checked={formData.showUmbraPenumbra}
                    onChange={(e) => setFormData({ ...formData, showUmbraPenumbra: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="umbra_checkbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                    Tampilkan Kerucut Geometri Bayangan (Umbra &amp; Penumbra)
                  </label>
                </div>
              </div>

              {/* Langkah Edukatif Naratif */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Urutan Langkah Edukatif (Step-by-step HUD)
                </label>
                <div className="space-y-2">
                  {formData.educationalSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Hapus langkah"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Tambah narasi langkah simulasi baru..."
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStep();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingItem(null);
                    setModalError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

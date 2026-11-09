'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Sparkles,
  Layers,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
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
  const [isEditing, setIsEditing] = useState(false);

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
  const [deletingPhenomenon, setDeletingPhenomenon] = useState<Phenomenon | null>(null);
  const [saving, setSaving] = useState(false);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
        message: 'Gagal memuat daftar simulasi fenomena dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPhenomena();
  }, [fetchPhenomena]);

  const effectiveQuery = (topSearchQuery || searchQuery).trim().toLowerCase();

  const filteredPhenomena = useMemo(() => {
    return phenomena.filter((item) => {
      if (selectedPlanet !== 'all' && item.planet_id !== selectedPlanet) return false;
      if (effectiveQuery !== '') {
        const matchTitle = item.judul.toLowerCase().includes(effectiveQuery);
        const matchDesc = item.deskripsi_edukatif.toLowerCase().includes(effectiveQuery);
        const matchPlanet = item.planet_id.toLowerCase().includes(effectiveQuery);
        if (!matchTitle && !matchDesc && !matchPlanet) return false;
      }
      return true;
    });
  }, [phenomena, selectedPlanet, effectiveQuery]);

  // Reset pagination saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlanet, effectiveQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPhenomena.length / itemsPerPage));
  const paginatedPhenomena = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPhenomena.slice(start, start + itemsPerPage);
  }, [filteredPhenomena, currentPage, itemsPerPage]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setFormData({
      planet_id: selectedPlanet !== 'all' ? selectedPlanet : 'earth',
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
        'Tahap 1: Penyejajaran posisi benda langit di bidang orbit.',
        'Tahap 2: Pembentukan kerucut bayangan umbra dan penumbra.',
        'Tahap 3: Puncak gerhana dan pemulihan rotasi normal.',
      ],
    });
    setNewStepText('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Phenomenon) => {
    setIsEditing(true);

    const config = (item.konfigurasi_visual || {}) as VisualConfig & { subtitle?: string };
    const secondaryObjects = config.secondaryObjects || ['SUN', 'MOON'];
    const showUmbra = config.showUmbraPenumbra !== undefined ? config.showUmbraPenumbra : true;
    const duration = config.durationSeconds || 20;
    const zoom = config.cameraZoomDistance || 35;
    const steps = config.educationalSteps || [
      'Tahap 1: Penyejajaran posisi pengamatan orbit.',
      'Tahap 2: Puncak pergerakan fenomena astronomi.',
    ];
    const defaultSub = ANIMATION_TYPES.find((t) => t.id === item.tipe_animasi)?.defaultSubtitle || 'Efek Optik Antariksa';
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
    if (!formData.judul.trim() || !formData.deskripsi_edukatif.trim()) return;

    try {
      setSaving(true);
      setNotification(null);

      const payload = {
        planet_id: formData.planet_id,
        judul: formData.judul.trim(),
        tombol_aksi_label: formData.tombol_aksi_label.trim() || 'Putar Simulasi Fenomena',
        tipe_animasi: formData.tipe_animasi,
        deskripsi_edukatif: formData.deskripsi_edukatif.trim(),
        konfigurasi_visual: compiledVisualConfig,
        is_active: formData.is_active,
      };

      if (isEditing && formData.phenomenon_id) {
        const { data, error } = await supabase
          .from('phenomena')
          .update(payload)
          .eq('phenomenon_id', formData.phenomenon_id)
          .select()
          .single();

        if (error) throw error;

        setPhenomena((prev) =>
          prev.map((item) =>
            item.phenomenon_id === formData.phenomenon_id ? (data as Phenomenon) : item
          )
        );
        setNotification({
          type: 'success',
          message: `Simulasi "${payload.judul}" berhasil diperbarui di Supabase.`,
        });
      } else {
        const { data, error } = await supabase
          .from('phenomena')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setPhenomena((prev) => [...prev, data as Phenomenon]);
        setNotification({
          type: 'success',
          message: `Simulasi fenomena "${payload.judul}" berhasil ditambahkan.`,
        });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving phenomenon:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan simulasi fenomena ke database Supabase.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPhenomenon) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('phenomena')
        .delete()
        .eq('phenomenon_id', deletingPhenomenon.phenomenon_id);

      if (error) throw error;

      setPhenomena((prev) =>
        prev.filter((p) => p.phenomenon_id !== deletingPhenomenon.phenomenon_id)
      );
      setNotification({
        type: 'success',
        message: `Simulasi "${deletingPhenomenon.judul}" berhasil dihapus.`,
      });
      setDeletingPhenomenon(null);
    } catch (err: unknown) {
      console.error('Error deleting phenomenon:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menghapus simulasi fenomena dari Supabase.',
      });
    } finally {
      setSaving(false);
    }
  };

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

      {/* Header Section (Matching Mockup A04) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Fenomena Astronomi
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Kelola konfigurasi fenomena optik, geometri bayangan, dan animasi edukatif antariksa dalam game AstroSphere.
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
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Fenomena</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Matching Mockup A04) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama fenomena..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
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
        <div className="shrink-0 flex items-center justify-end">
          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {filteredPhenomena.length} Fenomena Terfilter
          </span>
        </div>
      </div>

      {/* Table Card (Matching Mockup A04) */}
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

                      {/* Aksi Button */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm hover:text-blue-600"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Ubah Data</span>
                          </button>
                          <button
                            onClick={() => setDeletingPhenomenon(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Fenomena"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            {effectiveQuery && ` (difilter dari "${effectiveQuery}")`}
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

      {/* Add / Edit Modal */}
      {modalOpen && (
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
                    {isEditing ? 'Ubah Simulasi Fenomena' : 'Tambah Simulasi Fenomena Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi parameter visual dan skrip pedagogis fenomena antariksa.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Planet Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Planet Lokasi
                  </label>
                  <select
                    value={formData.planet_id}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipe Animasi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tipe Animasi Simulasi
                  </label>
                  <select
                    value={formData.tipe_animasi}
                    onChange={(e) => {
                      const newType = e.target.value as AnimationType;
                      const def = ANIMATION_TYPES.find((t) => t.id === newType)?.defaultSubtitle || '';
                      setFormData({ ...formData, tipe_animasi: newType, subtitle: def });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  >
                    {ANIMATION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Judul & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Fenomena <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Gerhana Matahari Total"
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Label Subtitle / Efek Optik
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Umbra & Penumbra"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Tombol Aksi Label & Durasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Label Tombol di HUD Pemain
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Putar Simulasi Gerhana"
                    value={formData.tombol_aksi_label}
                    onChange={(e) => setFormData({ ...formData, tombol_aksi_label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Durasi Simulasi (Detik)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={formData.durationSeconds}
                    onChange={(e) => setFormData({ ...formData, durationSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Deskripsi Edukatif */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Deskripsi Ilmiah Edukatif <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan mekanisme fisika di balik fenomena ini secara ramah pelajar..."
                  value={formData.deskripsi_edukatif}
                  onChange={(e) => setFormData({ ...formData, deskripsi_edukatif: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Objek Bantuan Sekunder */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Objek Langit Terlibat dalam Simulasi
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SECONDARY_OBJECT_OPTIONS.map((obj) => {
                    const selected = formData.secondaryObjects.includes(obj.id);
                    return (
                      <button
                        type="button"
                        key={obj.id}
                        onClick={() => handleToggleObject(obj.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}
                        {obj.label}
                      </button>
                    );
                  })}
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

              {/* Status Aktif */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active_checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="is_active_checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                  Aktifkan simulasi ini di HUD Pemain Game AstroSphere
                </label>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  <span>{saving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Buat Fenomena'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPhenomenon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Simulasi Fenomena?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus simulasi{' '}
              <strong className="text-slate-900">"{deletingPhenomenon.judul}"</strong>? Fenomena ini
              tidak akan lagi dapat disimulasikan oleh pemain di antarmuka 3D AstroSphere.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingPhenomenon(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
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

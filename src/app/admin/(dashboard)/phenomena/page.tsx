'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  ListPlus,
  Code,
  Sliders,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { Phenomenon, AnimationType, VisualConfig, PlanetSlug } from '../../../../types/database';

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

const ANIMATION_TYPES: { id: AnimationType; label: string; desc: string }[] = [
  {
    id: 'SOLAR_ECLIPSE',
    label: 'Gerhana Matahari (Solar Eclipse)',
    desc: 'Bulan melintasi garis antara Matahari dan Bumi, memproyeksikan kerucut bayangan umbra.',
  },
  {
    id: 'LUNAR_ECLIPSE',
    label: 'Gerhana Bulan Total (Blood Moon)',
    desc: 'Bumi berada di antara Matahari dan Bulan, bayangan bumi menggelapkan Bulan dengan rona merah.',
  },
  {
    id: 'MOON_PHASES',
    label: 'Siklus 8 Fase Bulan (Moon Phases)',
    desc: 'Orbit Bulan mengelilingi planet memperlihatkan variasi sudut pencahayaan 29.5 hari.',
  },
  {
    id: 'GALILEAN_TRANSIT',
    label: 'Transit Satelit Galilea (Jupiter)',
    desc: 'Io, Europa, Ganymede, atau Callisto melintasi piringan atmosfer Jupiter.',
  },
  {
    id: 'CUSTOM_ALIGNMENT',
    label: 'Penyelarasan Orbit Kustom (Custom Alignment)',
    desc: 'Simulasi gerakan benda langit atau fenomena orientasi cincin planet.',
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
  const [phenomena, setPhenomena] = useState<Phenomenon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Structured Form Fields (No raw JSON typing needed!)
  const [formData, setFormData] = useState<{
    phenomenon_id?: string;
    planet_id: string;
    judul: string;
    tombol_aksi_label: string;
    tipe_animasi: AnimationType;
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
    deskripsi_edukatif: '',
    is_active: true,
    secondaryObjects: ['SUN', 'MOON'],
    showUmbraPenumbra: true,
    durationSeconds: 20,
    cameraZoomDistance: 35,
    educationalSteps: [
      'Tahap 1: Penyejajaran posisi benda langit di bidang orbit.',
      'Tahap 2: Pembentukan kerucut bayangan umbra dan penumbra.',
      'Tahap 3: Puncak fenomena dan kembalinya rotasi normal.',
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

  const filteredPhenomena = useMemo(() => {
    return phenomena.filter((item) => {
      if (selectedPlanet !== 'all' && item.planet_id !== selectedPlanet) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.judul.toLowerCase().includes(query);
        const matchDesc = item.deskripsi_edukatif.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }
      return true;
    });
  }, [phenomena, selectedPlanet, searchQuery]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setShowJsonPreview(false);
    setFormData({
      planet_id: selectedPlanet !== 'all' ? selectedPlanet : 'earth',
      judul: '',
      tombol_aksi_label: 'Putar Simulasi Fenomena',
      tipe_animasi: 'SOLAR_ECLIPSE',
      deskripsi_edukatif: '',
      is_active: true,
      secondaryObjects: ['SUN', 'MOON'],
      showUmbraPenumbra: true,
      durationSeconds: 20,
      cameraZoomDistance: 35,
      educationalSteps: [
        'Tahap 1: Penyejajaran posisi Matahari, Bulan, dan Bumi.',
        'Tahap 2: Pembentukan kerucut bayangan inti Umbra dan bayangan kabur Penumbra.',
        'Tahap 3: Puncak gerhana dan pemulihan jalur orbit.',
      ],
    });
    setNewStepText('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Phenomenon) => {
    setIsEditing(true);
    setShowJsonPreview(false);

    const config = (item.konfigurasi_visual || {}) as VisualConfig;
    const secondaryObjects = config.secondaryObjects || (config.objek_sekunder ? config.objek_sekunder.map((o) => o.id.toUpperCase()) : ['MOON']);
    const showUmbra = config.showUmbraPenumbra !== undefined ? config.showUmbraPenumbra : true;
    const duration = config.durationSeconds || config.durasi_detik || 20;
    const zoom = config.cameraZoomDistance || config.jarak_kamera || 35;
    const steps = config.educationalSteps || [
      'Tahap 1: Inisialisasi posisi pengamatan.',
      'Tahap 2: Puncak pergerakan fenomena astronomi.',
    ];

    setFormData({
      phenomenon_id: item.phenomenon_id,
      planet_id: item.planet_id,
      judul: item.judul,
      tombol_aksi_label: item.tombol_aksi_label || 'Putar Simulasi Fenomena',
      tipe_animasi: item.tipe_animasi,
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

  // Toggle Checkbox Objek Sekunder
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

  // Tambah Langkah Edukatif
  const handleAddStep = () => {
    if (!newStepText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      educationalSteps: [...prev.educationalSteps, newStepText.trim()],
    }));
    setNewStepText('');
  };

  // Hapus Langkah Edukatif
  const handleRemoveStep = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      educationalSteps: prev.educationalSteps.filter((_, idx) => idx !== index),
    }));
  };

  // Assembling structured JSON
  const compiledVisualConfig: VisualConfig = useMemo(() => {
    return {
      secondaryObjects: formData.secondaryObjects,
      showUmbraPenumbra: formData.showUmbraPenumbra,
      durationSeconds: Number(formData.durationSeconds),
      cameraZoomDistance: Number(formData.cameraZoomDistance),
      educationalSteps: formData.educationalSteps,
    };
  }, [
    formData.secondaryObjects,
    formData.showUmbraPenumbra,
    formData.durationSeconds,
    formData.cameraZoomDistance,
    formData.educationalSteps,
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
          message: `Simulasi fenomena baru "${payload.judul}" berhasil ditambahkan.`,
        });
      }

      setModalOpen(false);
    } catch (err: unknown) {
      console.error('Error saving phenomenon:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan simulasi fenomena. Pastikan semua field terisi dengan benar.',
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
        message: `Simulasi fenomena "${deletingPhenomenon.judul}" berhasil dihapus.`,
      });
      setDeletingPhenomenon(null);
    } catch (err: unknown) {
      console.error('Error deleting phenomenon:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menghapus simulasi fenomena.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Manajemen Animasi Fenomena Tanpa Raw JSON
            </h1>
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
              PRD R14 & Bagian 8
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Konfigurasi simulasi astronomi terstruktur dengan pemilihan objek sekunder, bayangan umbra/penumbra, dan tahapan narasi edukatif.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchPhenomena();
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
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Fenomena Baru</span>
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

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4.5 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-medium text-slate-400 shrink-0">Filter Planet:</label>
          <select
            value={selectedPlanet}
            onChange={(e) => setSelectedPlanet(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            <option value="all">Semua Planet</option>
            {PLANET_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari fenomena / animasi..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Table of Phenomena */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Planet</th>
                <th className="px-5 py-3 font-semibold">Judul Fenomena</th>
                <th className="px-5 py-3 font-semibold">Tipe Animasi</th>
                <th className="px-5 py-3 font-semibold">Label Tombol Aksi</th>
                <th className="px-5 py-3 font-semibold text-center">Durasi & Zoom</th>
                <th className="px-5 py-3 font-semibold text-center">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                      <span>Memuat simulasi fenomena...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPhenomena.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada simulasi fenomena yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPhenomena.map((item) => {
                  const cfg = (item.konfigurasi_visual || {}) as VisualConfig;
                  const durasi = cfg.durationSeconds || cfg.durasi_detik || 20;
                  const zoom = cfg.cameraZoomDistance || cfg.jarak_kamera || 35;

                  return (
                    <tr key={item.phenomenon_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-300">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] border border-slate-700">
                          {item.planet_id}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-white">
                        <div>{item.judul}</div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400 font-normal">
                          {item.deskripsi_edukatif}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 border border-amber-500/20 font-semibold">
                          {item.tipe_animasi}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300">
                        <span className="rounded bg-slate-950 px-2 py-0.5 text-[11px] border border-slate-800">
                          {item.tombol_aksi_label || 'Putar Simulasi'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-[11px] text-slate-400">
                        {durasi}s &bull; Zoom {zoom}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {item.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500">Nonaktif</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-300 hover:text-white transition-colors"
                            title="Edit Simulasi"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPhenomenon(item)}
                            className="rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 p-1.5 text-red-400 hover:text-red-300 transition-colors"
                            title="Hapus Simulasi"
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
      </div>

      {/* Modal Form Konfigurasi Terstruktur (Tanpa Mengetik Raw JSON) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Konfigurasi Fenomena' : 'Tambah Simulasi Fenomena Baru'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Form konfigurasi visual interaktif terstandarisasi PRD Bagian 8
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
              {/* Baris 1: Planet & Judul */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Planet Terkait
                  </label>
                  <select
                    value={formData.planet_id}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    {PLANET_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Judul Simulasi Fenomena
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.judul}
                    onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                    placeholder="Contoh: Gerhana Matahari Total / Transit Satelit Galilea"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Baris 2: Tipe Animasi & Label Tombol Aksi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipe Animasi 3D (PRD R14)
                  </label>
                  <select
                    value={formData.tipe_animasi}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipe_animasi: e.target.value as AnimationType,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  >
                    {ANIMATION_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Label Tombol Aksi (PRD Bagian 8)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.tombol_aksi_label}
                    onChange={(e) =>
                      setFormData({ ...formData, tombol_aksi_label: e.target.value })
                    }
                    placeholder="Contoh: Putar Simulasi Gerhana Matahari"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* KONFIGURASI VISUAL TERSTRUKTUR */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Sliders className="h-4 w-4" />
                    <span>Konfigurasi Visual Animasi (Tanpa Ketik Raw JSON)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonPreview(!showJsonPreview)}
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:underline"
                  >
                    <Code className="h-3 w-3" />
                    <span>{showJsonPreview ? 'Tutup Pratinjau JSON' : 'Lihat Hasil JSON'}</span>
                  </button>
                </div>

                {/* 1. Objek Langit Sekunder (Checkboxes) */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">
                    Objek Langit Sekunder yang Dirender Sementara:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SECONDARY_OBJECT_OPTIONS.map((obj) => {
                      const isChecked = formData.secondaryObjects.includes(obj.id);
                      return (
                        <button
                          key={obj.id}
                          type="button"
                          onClick={() => handleToggleObject(obj.id)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-all ${
                            isChecked
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {isChecked ? '✓ ' : '+ '}
                          {obj.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Toggle Umbra & Parameter Numerik */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Bayangan Umbra / Penumbra
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          showUmbraPenumbra: !formData.showUmbraPenumbra,
                        })
                      }
                      className={`w-full mt-1 rounded-lg py-1.5 px-3 text-xs font-semibold border transition-all ${
                        formData.showUmbraPenumbra
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {formData.showUmbraPenumbra ? 'Aktif (Ditampilkan)' : 'Nonaktif'}
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Durasi Animasi (detik)
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="120"
                      value={formData.durationSeconds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          durationSeconds: parseInt(e.target.value) || 20,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Jarak Kamera (Zoom Out)
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="200"
                      value={formData.cameraZoomDistance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cameraZoomDistance: parseInt(e.target.value) || 35,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* 3. Dynamic List: Tahapan Penjelasan Edukatif (educationalSteps) */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Tahapan Penjelasan Edukatif (Muncul Bergantian Selama Animasi):
                  </label>

                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {formData.educationalSteps.map((step, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-xs text-slate-200"
                      >
                        <span className="flex-1">{step}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                          title="Hapus langkah ini"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Input Tambah Langkah Baru */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newStepText}
                      onChange={(e) => setNewStepText(e.target.value)}
                      placeholder="Ketik tahapan penjelasan baru..."
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors"
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                      <span>Tambah Tahap</span>
                    </button>
                  </div>
                </div>

                {/* Pratinjau JSON yang Dikompilasi */}
                {showJsonPreview && (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 mt-3">
                    <div className="text-[10px] font-mono font-bold text-slate-400 mb-1">
                      Kompilasi JSON:
                    </div>
                    <pre className="font-mono text-[10px] text-cyan-300 overflow-x-auto">
                      {JSON.stringify(compiledVisualConfig, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Deskripsi Edukatif Utama */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deskripsi Narasi Edukatif Utama
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.deskripsi_edukatif}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi_edukatif: e.target.value })
                  }
                  placeholder="Jelaskan dasar ilmiah fenomena ini secara komprehensif..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Status Aktif Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3">
                <span className="text-xs font-medium text-slate-300">
                  Status Publikasi Fenomena di HUD Pemain
                </span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`rounded-lg px-3 py-1 text-xs font-bold border transition-colors ${
                    formData.is_active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {formData.is_active ? 'Aktif (Tampil di HUD)' : 'Draf (Disembunyikan)'}
                </button>
              </div>

              {/* Actions */}
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
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan...' : 'Simpan Fenomena'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPhenomenon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Simulasi Fenomena</h3>
                <p className="text-xs text-slate-400">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus simulasi{' '}
              <strong className="text-white">&quot;{deletingPhenomenon.judul}&quot;</strong> pada planet {deletingPhenomenon.planet_id}?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPhenomenon(null)}
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
                {saving ? 'Menghapus...' : 'Ya, Hapus Fenomena'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Globe,
  Pencil,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { Planet } from '../../../../types/database';

// Format rotasi aksial ramah siswa & astronomi
function formatRotationPeriod(planetId: string, hours: number): string {
  switch (planetId) {
    case 'mercury':
      return '58,6 hari';
    case 'venus':
      return '243,0 hari (Retrograde)';
    case 'earth':
      return '23j 56m 04s';
    case 'mars':
      return '24j 37m 22s';
    case 'jupiter':
      return '09j 55m 30s';
    case 'saturn':
      return '10j 33m 38s';
    case 'uranus':
      return '-17j 14m (Retrograde)';
    case 'neptune':
      return '16j 06m 36s';
    default:
      if (hours < 0) {
        return `${Math.abs(hours).toFixed(1)}j (Retrograde)`;
      }
      return hours >= 24
        ? `${(hours / 24).toFixed(1)} hari`
        : `${hours.toFixed(1)} jam`;
  }
}

// Warna lingkaran angka orbit sesuai tema A02
function getOrbitBadgeStyle(orbit: number) {
  switch (orbit) {
    case 1:
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 2:
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 3:
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 4:
      return 'bg-red-100 text-red-800 border-red-300';
    case 5:
      return 'bg-amber-100 text-amber-900 border-amber-400';
    case 6:
      return 'bg-yellow-100 text-yellow-900 border-yellow-400';
    case 7:
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 8:
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

// Helper slugify nama planet otomatis
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DEFAULT_PLANET: Partial<Planet> = {
  planet_id: '',
  urutan_orbit: 9,
  nama: '',
  kategori_planet: 'TERRESTRIAL',
  diameter_km: 10000,
  rotation_period_hours: 24,
  orbital_period_days: 365,
  axial_tilt_deg: 0,
  deskripsi_materi: '',
  ringkasan_cepat: '',
  sumber_referensi: 'NASA Planetary Fact Sheet',
  aset_model_url: '/models/planets/earth.glb',
  tekstur_url: '',
  warna_atmosfer_hex: '#38bdf8',
  skala_visual: 1.0,
  batas_zona_radius: 35,
  kecepatan_jelajah_nyaman: 15.0,
};

export default function AdminPlanetsPage() {
  const { searchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPlanet, setEditingPlanet] = useState<Planet | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Planet>>(DEFAULT_PLANET);
  const [saving, setSaving] = useState(false);
  const [deletingPlanet, setDeletingPlanet] = useState<Planet | null>(null);

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchPlanets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planets')
        .select('*')
        .order('urutan_orbit', { ascending: true });

      if (error) throw error;
      setPlanets((data || []) as Planet[]);
    } catch (err: unknown) {
      console.error('Error fetching planets:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengambil data planet dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanets();
  }, [fetchPlanets]);

  const handleOpenEdit = (planet: Planet) => {
    setEditingPlanet(planet);
    setFormData({ ...planet });
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    setEditingPlanet(null);
    setFormData({
      ...DEFAULT_PLANET,
      urutan_orbit: (planets.length || 0) + 1,
    });
    setIsAdding(true);
  };

  const handleCloseModal = () => {
    setEditingPlanet(null);
    setIsAdding(false);
    setFormData(DEFAULT_PLANET);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      if (isAdding) {
        // Insert new planet
        const { error } = await supabase.from('planets').insert({
          planet_id: (formData.planet_id || '').trim().toLowerCase(),
          urutan_orbit: Number(formData.urutan_orbit) || 1,
          nama: (formData.nama || '').trim(),
          kategori_planet: (formData.kategori_planet || 'TERRESTRIAL') as Planet['kategori_planet'],
          diameter_km: Number(formData.diameter_km) || 0,
          rotation_period_hours: Number(formData.rotation_period_hours) || 24,
          orbital_period_days: Number(formData.orbital_period_days) || 365,
          axial_tilt_deg: Number(formData.axial_tilt_deg) || 0,
          deskripsi_materi: (formData.deskripsi_materi || '').trim(),
          ringkasan_cepat: formData.ringkasan_cepat?.trim() || '',
          sumber_referensi: formData.sumber_referensi?.trim() || 'NASA Planetary Fact Sheet',
          aset_model_url: formData.aset_model_url?.trim() || '/models/planets/earth.glb',
          tekstur_url: formData.tekstur_url?.trim() || null,
          warna_atmosfer_hex: formData.warna_atmosfer_hex || '#38bdf8',
          skala_visual: Number(formData.skala_visual) || 1.0,
          batas_zona_radius: Number(formData.batas_zona_radius) || 35,
          kecepatan_jelajah_nyaman: Number(formData.kecepatan_jelajah_nyaman) || 15.0,
        });

        if (error) throw error;
        setNotification({ type: 'success', message: 'Planet baru berhasil ditambahkan ke Supabase!' });
      } else if (editingPlanet) {
        // Update existing planet
        const { error } = await supabase
          .from('planets')
          .update({
            urutan_orbit: Number(formData.urutan_orbit) || editingPlanet.urutan_orbit,
            nama: (formData.nama || editingPlanet.nama).trim(),
            kategori_planet: (formData.kategori_planet || editingPlanet.kategori_planet || 'TERRESTRIAL') as Planet['kategori_planet'],
            diameter_km: Number(formData.diameter_km) || editingPlanet.diameter_km,
            rotation_period_hours: Number(formData.rotation_period_hours) || editingPlanet.rotation_period_hours,
            orbital_period_days: Number(formData.orbital_period_days) || editingPlanet.orbital_period_days,
            axial_tilt_deg: formData.axial_tilt_deg !== undefined ? Number(formData.axial_tilt_deg) : editingPlanet.axial_tilt_deg,
            deskripsi_materi: (formData.deskripsi_materi || editingPlanet.deskripsi_materi).trim(),
            ringkasan_cepat: formData.ringkasan_cepat !== undefined ? formData.ringkasan_cepat.trim() : editingPlanet.ringkasan_cepat,
            sumber_referensi: formData.sumber_referensi !== undefined ? (formData.sumber_referensi?.trim() || null) : editingPlanet.sumber_referensi,
            aset_model_url: (formData.aset_model_url || editingPlanet.aset_model_url).trim(),
            tekstur_url: formData.tekstur_url !== undefined ? formData.tekstur_url?.trim() || null : editingPlanet.tekstur_url,
            warna_atmosfer_hex: formData.warna_atmosfer_hex || editingPlanet.warna_atmosfer_hex,
            skala_visual: Number(formData.skala_visual) || editingPlanet.skala_visual,
            batas_zona_radius: Number(formData.batas_zona_radius) || editingPlanet.batas_zona_radius,
            kecepatan_jelajah_nyaman: Number(formData.kecepatan_jelajah_nyaman) || editingPlanet.kecepatan_jelajah_nyaman || 15.0,
            updated_at: new Date().toISOString(),
          })
          .eq('planet_id', editingPlanet.planet_id);

        if (error) throw error;
        setNotification({ type: 'success', message: `Data planet ${formData.nama} berhasil diperbarui!` });
      }

      handleCloseModal();
      await fetchPlanets();
    } catch (err: unknown) {
      console.error('Save error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menyimpan data planet.';
      setNotification({ type: 'error', message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlanet) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('planets')
        .delete()
        .eq('planet_id', deletingPlanet.planet_id);

      if (error) throw error;

      setNotification({
        type: 'success',
        message: `Planet ${deletingPlanet.nama} berhasil dihapus dari Supabase.`,
      });
      if (editingPlanet?.planet_id === deletingPlanet.planet_id) {
        handleCloseModal();
      }
      setDeletingPlanet(null);
      await fetchPlanets();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal menghapus planet.';
      setNotification({ type: 'error', message: errMsg });
    } finally {
      setSaving(false);
    }
  };

  // Filter berdasarkan search query top bar (M-01)
  const filteredPlanets = useMemo(() => {
    if (!searchQuery.trim()) return planets;
    const q = searchQuery.toLowerCase().trim();
    return planets.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        p.planet_id.toLowerCase().includes(q) ||
        (p.deskripsi_materi && p.deskripsi_materi.toLowerCase().includes(q))
    );
  }, [planets, searchQuery]);

  // Reset page saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredPlanets.length / itemsPerPage));
  const paginatedPlanets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlanets.slice(start, start + itemsPerPage);
  }, [filteredPlanets, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai Gambar A02 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Planet
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola data dan parameter edukasi 8 planet tata surya dalam modul simulasi 3D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchPlanets();
            }}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
            title="Segarkan data planet"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Planet</span>
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

      {/* 2. Table Card Sesuai Gambar A02 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Entitas Planet
            </h2>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              8 Planet Utama
            </span>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Standar IAU &amp; JPL Horizons
          </span>
        </div>

        {/* Table Viewport */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">NAMA PLANET</th>
                <th className="px-6 py-3.5">DIAMETER</th>
                <th className="px-6 py-3.5">PERIODE ROTASI</th>
                <th className="px-6 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Memuat data planet tata surya...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPlanets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-400">
                    Tidak ada planet yang cocok dengan pencarian "{searchQuery}".
                  </td>
                </tr>
              ) : (
                paginatedPlanets.map((planet) => {
                  const isEarth = planet.planet_id === 'earth';
                  return (
                    <tr
                      key={planet.planet_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Nama Planet & Urutan Orbit */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border shrink-0 ${getOrbitBadgeStyle(
                              planet.urutan_orbit
                            )}`}
                          >
                            {planet.urutan_orbit}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {planet.nama}
                            </span>
                            {isEarth && (
                              <span className="rounded bg-blue-100 text-blue-700 font-medium text-[10px] px-1.5 py-0.5 border border-blue-200">
                                Home
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Diameter */}
                      <td className="px-6 py-4 font-mono text-xs">
                        <span
                          className={
                            isEarth
                              ? 'text-blue-600 font-bold'
                              : 'text-slate-700 font-medium'
                          }
                        >
                          {Number(planet.diameter_km).toLocaleString('id-ID')} km
                        </span>
                      </td>

                      {/* Periode Rotasi */}
                      <td className="px-6 py-4 font-medium text-slate-600">
                        {formatRotationPeriod(
                          planet.planet_id,
                          Number(planet.rotation_period_hours)
                        )}
                      </td>

                      {/* Tombol Aksi */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(planet)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                              isEarth
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 shadow-sm'
                            }`}
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Ubah Data</span>
                          </button>
                          {!isEarth && (
                            <button
                              type="button"
                              onClick={() => setDeletingPlanet(planet)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title={`Hapus ${planet.nama}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
            Menampilkan {filteredPlanets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} -{' '}
            {Math.min(currentPage * itemsPerPage, filteredPlanets.length)} dari {filteredPlanets.length} planet
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

      {/* 3. Modal Form: Tambah / Edit Planet */}
      {(editingPlanet || isAdding) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAdding ? 'Tambah Entitas Planet Baru' : `Ubah Data Planet: ${formData.nama}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi parameter astronomi dan modul pembelajaran 3D
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
                {/* ID Planet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Slug ID Planet (misal: earth, mars)
                  </label>
                  <input
                    type="text"
                    disabled={!isAdding}
                    value={formData.planet_id || ''}
                    onChange={(e) => setFormData({ ...formData, planet_id: e.target.value })}
                    required
                    placeholder="earth"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                  />
                </div>

                {/* Nama Planet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Resmi Planet
                  </label>
                  <input
                    type="text"
                    value={formData.nama || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        nama: val,
                        planet_id: isAdding ? slugify(val) : prev.planet_id,
                      }));
                    }}
                    required
                    placeholder="misal: Bumi"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Kategori Planet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Planet
                  </label>
                  <select
                    value={formData.kategori_planet || 'TERRESTRIAL'}
                    onChange={(e) => setFormData({ ...formData, kategori_planet: e.target.value as Planet['kategori_planet'] })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                  >
                    <option value="TERRESTRIAL">TERRESTRIAL (Planet Kebumian / Batuan)</option>
                    <option value="GAS_GIANT">GAS_GIANT (Raksasa Gas)</option>
                    <option value="ICE_GIANT">ICE_GIANT (Raksasa Es)</option>
                  </select>
                </div>

                {/* Urutan Orbit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urutan Orbit dari Matahari (≥ 1)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.urutan_orbit || 1}
                    onChange={(e) => setFormData({ ...formData, urutan_orbit: Number(e.target.value) })}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Diameter */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diameter Khatulistiwa (km)
                  </label>
                  <input
                    type="number"
                    value={formData.diameter_km || 0}
                    onChange={(e) => setFormData({ ...formData, diameter_km: Number(e.target.value) })}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Periode Rotasi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periode Rotasi (Jam — Nilai Negatif untuk Retrograde)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.rotation_period_hours || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, rotation_period_hours: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Periode Orbit Revolusi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Periode Orbit / Revolusi (Hari)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.orbital_period_days || 365}
                    onChange={(e) =>
                      setFormData({ ...formData, orbital_period_days: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>

                {/* Kemiringan Sumbu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kemiringan Sumbu Rotasi / Axial Tilt (Derajat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.axial_tilt_deg || 0}
                    onChange={(e) =>
                      setFormData({ ...formData, axial_tilt_deg: Number(e.target.value) })
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Teks Opening / Sambutan Pertama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teks Opening / Sambutan Pertama (Saat Pemain Menemukan Planet)
                </label>
                <input
                  type="text"
                  value={formData.ringkasan_cepat || ''}
                  onChange={(e) => setFormData({ ...formData, ringkasan_cepat: e.target.value })}
                  placeholder="misal: Planet samudra biru, rumah bagi peradaban dan satu-satunya dunia berpenghuni."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Deskripsi Utama Materi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Utama Planet (Saat Pemain Berhenti & Mengamati Planet)
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi_materi || ''}
                  onChange={(e) => setFormData({ ...formData, deskripsi_materi: e.target.value })}
                  placeholder="Penjelasan komprehensif karakteristik sains astronomi kurikulum..."
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Sumber Referensi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Referensi Ilmiah / URL
                </label>
                <input
                  type="text"
                  value={formData.sumber_referensi || ''}
                  onChange={(e) => setFormData({ ...formData, sumber_referensi: e.target.value })}
                  placeholder="misal: NASA Planetary Fact Sheet"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Parameter Visual & Zona Jelajah 3D */}
              <div className="pt-3 border-t border-slate-100">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Pengaturan Model 3D & Navigasi Jelajah
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      URL Model 3D (.glb)
                    </label>
                    <input
                      type="text"
                      value={formData.aset_model_url || ''}
                      onChange={(e) => setFormData({ ...formData, aset_model_url: e.target.value })}
                      placeholder="/models/planets/earth.glb"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      URL Tekstur Permukaan (.webp)
                    </label>
                    <input
                      type="text"
                      value={formData.tekstur_url || ''}
                      onChange={(e) => setFormData({ ...formData, tekstur_url: e.target.value })}
                      placeholder="/textures/planets/earth.webp"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Warna Pendar Atmosfer (Hex)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.warna_atmosfer_hex || '#38bdf8'}
                        onChange={(e) => setFormData({ ...formData, warna_atmosfer_hex: e.target.value })}
                        className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        value={formData.warna_atmosfer_hex || '#38bdf8'}
                        onChange={(e) => setFormData({ ...formData, warna_atmosfer_hex: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-mono focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Skala Ukuran Visual 3D
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={formData.skala_visual || 1.0}
                      onChange={(e) => setFormData({ ...formData, skala_visual: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Radius Batas Zona Masuk
                    </label>
                    <input
                      type="number"
                      value={formData.batas_zona_radius || 35}
                      onChange={(e) => setFormData({ ...formData, batas_zona_radius: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kecepatan Jelajah Nyaman (km/s)
                    </label>
                    <input
                      type="number"
                      value={formData.kecepatan_jelajah_nyaman || 15}
                      onChange={(e) => setFormData({ ...formData, kecepatan_jelajah_nyaman: Number(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tombol Simpan & Hapus */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  {!isAdding && editingPlanet && editingPlanet.planet_id !== 'earth' && (
                    <button
                      type="button"
                      onClick={() => setDeletingPlanet(editingPlanet)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hapus Planet</span>
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
                    <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Custom (R-03) */}
      {deletingPlanet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Data Planet?</h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus planet{' '}
              <strong className="text-slate-900">"{deletingPlanet.nama}"</strong>? Seluruh data peristiwa sejarah, kuis, dan simulasi fenomena terkait planet ini akan terhapus secara berjenjang dari sistem.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPlanet(null)}
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

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Globe,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Box,
  Eye,
  BookOpen,
  Maximize2,
  RotateCw,
  Sun,
  Compass,
  Thermometer,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import { formatSupabaseError } from '../../../../lib/supabase/adminAuth';
import type { Planet } from '../../../../types/database';

// Warna badge urutan planet dari Matahari (1 sampai 8)
function getPlanetBadgeStyle(urutan: number) {
  switch (urutan) {
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

interface PlanetFormState {
  planet_id: string;
  urutan_planet: string;
  nama: string;
  kategori_planet: NonNullable<Planet['kategori_planet']>;
  diameter_km: string;
  perbandingan_bumi: string;
  periode_rotasi: string;
  subteks_rotasi: string;
  periode_orbit: string;
  subteks_orbit: string;
  kemiringan_sumbu: string;
  suhu_rata_c: string;
  rentang_suhu: string;
  usia_planet: string;
  subteks_usia: string;
  judul_rotasi: string;
  deskripsi_rotasi: string;
  deskripsi_materi: string;
  is_active: boolean;
}

const EMPTY_PLANET_FORM: PlanetFormState = {
  planet_id: '',
  urutan_planet: '1',
  nama: '',
  kategori_planet: 'TERRESTRIAL',
  diameter_km: '10000',
  perbandingan_bumi: '1.00x Standar',
  periode_rotasi: '24 Jam',
  subteks_rotasi: '1 Hari Sideris',
  periode_orbit: '365 Hari',
  subteks_orbit: '1 Tahun Kalender',
  kemiringan_sumbu: '0°',
  suhu_rata_c: '15°C',
  rentang_suhu: '15°C (Rata-rata)',
  usia_planet: '~4.5 Miliar Tahun',
  subteks_usia: 'Terbentuk bersama Tata Surya',
  judul_rotasi: 'Rotasi Standar',
  deskripsi_rotasi: '',
  deskripsi_materi: '',
  is_active: true,
};

function toPlanetFormState(planet: Planet): PlanetFormState {
  return {
    planet_id: planet.planet_id,
    urutan_planet: String(planet.urutan_planet ?? planet.urutan_orbit ?? 1),
    nama: planet.nama ?? '',
    kategori_planet: planet.kategori_planet ?? 'TERRESTRIAL',
    diameter_km: String(planet.diameter_km ?? 0),
    perbandingan_bumi: planet.perbandingan_bumi ?? '',
    periode_rotasi: planet.periode_rotasi ?? '',
    subteks_rotasi: planet.subteks_rotasi ?? '',
    periode_orbit: planet.periode_orbit ?? '',
    subteks_orbit: planet.subteks_orbit ?? '',
    kemiringan_sumbu: planet.kemiringan_sumbu ?? '',
    suhu_rata_c: planet.suhu_rata_c ?? '',
    rentang_suhu: planet.rentang_suhu ?? '',
    usia_planet: planet.usia_planet ?? '',
    subteks_usia: planet.subteks_usia ?? '',
    judul_rotasi: planet.judul_rotasi ?? '',
    deskripsi_rotasi: planet.deskripsi_rotasi ?? '',
    deskripsi_materi: planet.deskripsi_materi ?? '',
    is_active: planet.is_active !== false,
  };
}

export default function AdminPlanetsPage() {
  const { searchQuery = '' } = useOutletContext<{ searchQuery?: string }>() || {};
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPlanet, setEditingPlanet] = useState<Planet | null>(null);
  const [formData, setFormData] = useState<PlanetFormState>(EMPTY_PLANET_FORM);
  const [modalViewMode, setModalViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Pagination State (M-02)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [modalNotification, setModalNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchPlanets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planets')
        .select('*')
        .order('urutan_planet', { ascending: true });

      if (error) throw error;
      setPlanets((data || []) as Planet[]);
    } catch (err: unknown) {
      console.error('Error fetching planets:', err);
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal mengambil data planet dari Supabase'),
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
    setFormData(toPlanetFormState(planet));
    setModalViewMode('EDIT');
    setModalNotification(null);
  };

  const handleCloseModal = () => {
    setEditingPlanet(null);
    setFormData(EMPTY_PLANET_FORM);
    setModalViewMode('EDIT');
    setModalNotification(null);
  };

  // Toggle Aktif / Nonaktif langsung via tabel
  const handleToggleActive = async (planet: Planet) => {
    if (togglingId) return;

    if (planet.planet_id === 'earth' && planet.is_active !== false) {
      setNotification({
        type: 'error',
        message: 'Planet Bumi adalah stasiun utama (Home) dan tidak dapat dinonaktifkan.',
      });
      return;
    }

    const nextActive = planet.is_active === false;

    if (!nextActive) {
      const activeCount = planets.filter((p) => p.is_active !== false).length;
      if (activeCount <= 1) {
        setNotification({
          type: 'error',
          message: 'Minimal harus ada satu planet aktif di dalam sistem AstroSphere.',
        });
        return;
      }
    }

    setTogglingId(planet.planet_id);
    setNotification(null);
    setPlanets((prev) =>
      prev.map((p) => (p.planet_id === planet.planet_id ? { ...p, is_active: nextActive } : p))
    );

    try {
      const { data, error } = await supabase
        .from('planets')
        .update({
          is_active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq('planet_id', planet.planet_id)
        .select('planet_id, is_active')
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Status planet tidak terbarui di database.');
      }

      setNotification({
        type: 'success',
        message: `Status planet ${planet.nama} berhasil diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`,
      });
      await fetchPlanets();
    } catch (err: unknown) {
      console.error('Toggle active error:', err);
      setPlanets((prev) =>
        prev.map((p) => (p.planet_id === planet.planet_id ? { ...p, is_active: planet.is_active } : p))
      );
      setNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal memperbarui status planet'),
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanet) return;

    setModalNotification(null);

    const orderNum = Number(formData.urutan_planet);
    const diameterNum = Number(formData.diameter_km);

    if (!formData.nama.trim()) {
      setModalNotification({ type: 'error', message: 'Nama resmi planet wajib diisi.' });
      return;
    }

    if (!Number.isInteger(orderNum) || orderNum < 1) {
      setModalNotification({
        type: 'error',
        message: 'Urutan planet harus berupa bilangan bulat minimal 1 (ke-1 sampai ke-8).',
      });
      return;
    }

    // Cegah bentrok urutan_planet dengan planet lain
    const conflictPlanet = planets.find(
      (p) => p.planet_id !== editingPlanet.planet_id && p.urutan_planet === orderNum
    );
    if (conflictPlanet) {
      setModalNotification({
        type: 'error',
        message: `Urutan ke-${orderNum} dari Matahari sudah dipakai oleh planet "${conflictPlanet.nama}". Pilih angka urutan lain.`,
      });
      return;
    }

    if (formData.diameter_km.trim() === '' || Number.isNaN(diameterNum) || diameterNum <= 0) {
      setModalNotification({
        type: 'error',
        message: 'Diameter ekuator harus lebih besar dari 0 km.',
      });
      return;
    }

    if (!formData.deskripsi_materi.trim()) {
      setModalNotification({
        type: 'error',
        message: 'Deskripsi ringkasan utama planet (PLY-02) wajib diisi.',
      });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const { data, error } = await supabase
        .from('planets')
        .update({
          urutan_planet: orderNum,
          nama: formData.nama.trim(),
          kategori_planet: formData.kategori_planet,
          diameter_km: diameterNum,
          perbandingan_bumi: formData.perbandingan_bumi.trim(),
          periode_rotasi: formData.periode_rotasi.trim(),
          subteks_rotasi: formData.subteks_rotasi.trim(),
          periode_orbit: formData.periode_orbit.trim(),
          subteks_orbit: formData.subteks_orbit.trim(),
          kemiringan_sumbu: formData.kemiringan_sumbu.trim(),
          suhu_rata_c: formData.suhu_rata_c.trim(),
          rentang_suhu: formData.rentang_suhu.trim(),
          usia_planet: formData.usia_planet.trim(),
          subteks_usia: formData.subteks_usia.trim(),
          judul_rotasi: formData.judul_rotasi.trim(),
          deskripsi_rotasi: formData.deskripsi_rotasi.trim(),
          deskripsi_materi: formData.deskripsi_materi.trim(),
          is_active: formData.planet_id === 'earth' ? true : formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('planet_id', editingPlanet.planet_id)
        .select('planet_id')
        .single();

      if (error) throw error;
      if (!data) {
        throw new Error('Data planet tidak terbarui di database.');
      }

      setNotification({
        type: 'success',
        message: `Data planet ${formData.nama.trim()} berhasil diperbarui!`,
      });

      handleCloseModal();
      await fetchPlanets();
    } catch (err: unknown) {
      console.error('Save error:', err);
      setModalNotification({
        type: 'error',
        message: formatSupabaseError(err, 'Gagal menyimpan data planet ke Supabase'),
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter berdasarkan search query top bar
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

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredPlanets.length / itemsPerPage));
  const paginatedPlanets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPlanets.slice(start, start + itemsPerPage);
  }, [filteredPlanets, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const activePlanetCount = planets.filter((p) => p.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
              Kelola Planet Tata Surya
            </h1>
            <span className="rounded-full bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 border border-blue-200">
              Katalog Observasi PLY-02
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data ilmiah katalog observasi dan ringkasan astronomis yang ditampilkan pada layar siswa PLY-02. Visual 3D dirender otomatis dengan Procedural Shader.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchPlanets();
            }}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner Global */}
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

      {/* 2. Table Card dengan Kolom Sesuai Desain PLY-02 */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table Top Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Daftar Entitas Planet
            </h2>
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {planets.length} Planet Utama
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {activePlanetCount} Aktif
            </span>
          </div>

          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Standar Kurikulum Astronomi &amp; NASA
          </span>
        </div>

        {/* Table Viewport */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">URUTAN &amp; NAMA</th>
                <th className="px-6 py-3.5">KATEGORI</th>
                <th className="px-6 py-3.5">DIAMETER EKUATOR</th>
                <th className="px-6 py-3.5">PERIODE ROTASI</th>
                <th className="px-6 py-3.5">SUHU RATA-RATA</th>
                <th className="px-6 py-3.5">STATUS</th>
                <th className="px-6 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Memuat data planet dari Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPlanets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    Tidak ada planet yang cocok dengan pencarian "{searchQuery}".
                  </td>
                </tr>
              ) : (
                paginatedPlanets.map((planet) => {
                  const isEarth = planet.planet_id === 'earth';
                  const isActive = planet.is_active !== false;
                  const urutanDisplay = planet.urutan_planet ?? planet.urutan_orbit ?? 1;

                  return (
                    <tr
                      key={planet.planet_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Urutan & Nama Planet */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border shrink-0 ${getPlanetBadgeStyle(
                              urutanDisplay
                            )}`}
                            title={`Planet ke-${urutanDisplay} dari Matahari`}
                          >
                            {urutanDisplay}
                          </div>
                          <div>
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
                            <span className="text-[11px] text-slate-400">
                              Planet ke-{urutanDisplay} dari Matahari
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="px-6 py-4">
                        <span className="text-[10px] uppercase font-bold rounded bg-slate-100 text-slate-700 px-2 py-0.5 border border-slate-200">
                          {planet.kategori_planet}
                        </span>
                      </td>

                      {/* Diameter Ekuator */}
                      <td className="px-6 py-4">
                        <div className="font-mono text-xs font-semibold text-slate-900">
                          {Number(planet.diameter_km).toLocaleString('id-ID')} km
                        </div>
                        <div className="text-[11px] text-cyan-600 font-medium">
                          {planet.perbandingan_bumi || '-'}
                        </div>
                      </td>

                      {/* Periode Rotasi */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-800">
                          {planet.periode_rotasi || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {planet.subteks_rotasi || '-'}
                        </div>
                      </td>

                      {/* Suhu Rata-rata */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-900">
                          {planet.suhu_rata_c || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={planet.rentang_suhu}>
                          {planet.rentang_suhu || '-'}
                        </div>
                      </td>

                      {/* Switch Toggle Status Aktif / Nonaktif */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(planet)}
                            disabled={(isEarth && isActive) || togglingId === planet.planet_id}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                              isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            } ${(isEarth && isActive) || togglingId === planet.planet_id ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                            title={
                              isEarth
                                ? 'Planet Bumi selalu aktif sebagai stasiun utama'
                                : `Klik untuk ${isActive ? 'menonaktifkan' : 'mengaktifkan'} planet`
                            }
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

                      {/* Tombol Aksi */}
                      <td className="px-6 py-4 text-right">
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
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
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
                className={`h-7 w-7 rounded-lg text-xs font-semibold transition-colors ${
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

      {/* 3. Modal Edit Data Planet & Pratinjau PLY-02 */}
      {editingPlanet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ubah Data Planet: {editingPlanet.nama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Katalog Observasi Astronomis Layar Siswa (PLY-02)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Notification */}
            {modalNotification && (
              <div
                className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs font-medium ${
                  modalNotification.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {modalNotification.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">{modalNotification.message}</div>
              </div>
            )}

            {/* View Mode Toggle: Form Edit vs Pratinjau Layar Siswa (PLY-02) */}
            <div className="mt-4 flex items-center justify-start gap-2 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setModalViewMode('EDIT')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalViewMode === 'EDIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Formulir Pengelola</span>
              </button>
              <button
                type="button"
                onClick={() => setModalViewMode('PREVIEW')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalViewMode === 'PREVIEW'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pratinjau Layar Siswa (PLY-02)</span>
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="mt-5 space-y-4">
              {modalViewMode === 'PREVIEW' && (() => {
                const diameterVal = Number(formData.diameter_km) || 0;
                const isRetrograde = formData.judul_rotasi.toLowerCase().includes('retrograd') || formData.subteks_rotasi.toLowerCase().includes('retrograd');

                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl space-y-4">
                    {/* Header PLY-02 */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-extrabold tracking-tight">
                              {formData.nama || 'Nama Planet'}
                            </h4>
                            <span className="text-[11px] font-mono rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                              Planet ke-{formData.urutan_planet || '1'} dari Matahari
                            </span>
                            <span className="text-[10px] uppercase font-bold rounded bg-cyan-500/20 text-cyan-300 px-2 py-0.5 border border-cyan-500/30">
                              {formData.kategori_planet}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Pratinjau Layar Siswa (PLY-02: Katalog Observasi Astronomis)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Badge Procedural 3D Shader */}
                    <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3.5 py-2 text-xs text-cyan-200">
                      <span className="h-3 w-3 rounded-full shrink-0 bg-cyan-400 animate-pulse" />
                      <span className="font-semibold text-cyan-300">Procedural 3D Shader:</span>
                      <span className="text-cyan-100/90 text-[11px]">
                        Dirender dinamis dengan rumus matematika 3D Simplex Noise &amp; Hamburan Atmosfer Mie di kartu grafis pemain.
                      </span>
                    </div>

                    {/* Kotak Ringkasan Utama Planet (PLY-02) */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Ringkasan Planet
                      </span>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs text-slate-200 leading-relaxed text-justify">
                        {formData.deskripsi_materi || 'Deskripsi utama planet belum diisi...'}
                      </div>
                    </div>

                    {/* Grid 6 Kotak Data Ilmiah PLY-02 */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                        Data Ilmiah (Katalog Observasi)
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {/* 1. Diameter Ekuator */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Maximize2 className="h-3 w-3 text-cyan-400" />
                            <span>Diameter Ekuator</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {diameterVal.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-400">km</span>
                          </div>
                          <div className="text-[10px] text-cyan-400 font-medium mt-0.5">
                            {formData.perbandingan_bumi || 'Standar Bumi'}
                          </div>
                        </div>

                        {/* 2. Periode Rotasi */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <RotateCw className="h-3 w-3 text-indigo-400" />
                            <span>Periode Rotasi</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formData.periode_rotasi || '-'}
                          </div>
                          <div className="text-[10px] text-indigo-300 font-medium mt-0.5">
                            {formData.subteks_rotasi || '-'}
                          </div>
                        </div>

                        {/* 3. Periode Orbit */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Sun className="h-3 w-3 text-amber-400" />
                            <span>Periode Orbit</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formData.periode_orbit || '-'}
                          </div>
                          <div className="text-[10px] text-amber-300 font-medium mt-0.5">
                            {formData.subteks_orbit || '-'}
                          </div>
                        </div>

                        {/* 4. Kemiringan Sumbu */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Compass className="h-3 w-3 text-emerald-400" />
                            <span>Kemiringan Sumbu</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formData.kemiringan_sumbu || '-'}
                          </div>
                          <div className="text-[10px] text-emerald-300 font-medium mt-0.5">
                            Kemiringan Poros
                          </div>
                        </div>

                        {/* 5. Suhu Rata-Rata */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Thermometer className="h-3 w-3 text-rose-400" />
                            <span>Suhu Rata-Rata</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formData.suhu_rata_c || '-'}
                          </div>
                          <div className="text-[10px] text-rose-300 font-medium mt-0.5 truncate" title={formData.rentang_suhu}>
                            {formData.rentang_suhu || '-'}
                          </div>
                        </div>

                        {/* 6. Usia Planet */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                            <Box className="h-3 w-3 text-purple-400" />
                            <span>Usia Planet</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-white">
                            {formData.usia_planet || '-'}
                          </div>
                          <div className="text-[10px] text-purple-300 font-medium mt-0.5 truncate" title={formData.subteks_usia}>
                            {formData.subteks_usia || '-'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kotak Arah & Dinamika Rotasi */}
                    <div className={`rounded-xl border p-3.5 space-y-1 ${
                      isRetrograde
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                        : 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <RotateCw className="h-4 w-4 shrink-0 text-amber-400" />
                        <span className="font-bold text-xs uppercase tracking-wide text-white">
                          {formData.judul_rotasi || 'Status Dinamika Rotasi'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed pl-6">
                        {formData.deskripsi_rotasi || '-'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className={modalViewMode === 'EDIT' ? 'space-y-5' : 'hidden'}>
                {/* Status Visibilitas Planet */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <div>
                    <span className="text-xs font-bold text-slate-900">
                      Visibilitas di Modul Pemain
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {formData.planet_id === 'earth'
                        ? 'Planet Bumi adalah stasiun utama (Home) dan harus selalu aktif.'
                        : 'Jika dinonaktifkan, planet akan disembunyikan dari orbit dan navigasi pemain.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={formData.planet_id === 'earth'}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          is_active: !prev.is_active,
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                        formData.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${formData.planet_id === 'earth' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
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

                {/* Bagian 1: Identitas & Klasifikasi Planet */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    1. Identitas &amp; Klasifikasi Planet
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Slug ID Planet (Terkunci)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formData.planet_id}
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 font-mono cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Resmi Planet <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nama}
                        onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                        required
                        placeholder="misal: Merkurius"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kategori Planet
                      </label>
                      <select
                        value={formData.kategori_planet}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            kategori_planet: e.target.value as NonNullable<Planet['kategori_planet']>,
                          })
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-medium"
                      >
                        <option value="TERRESTRIAL">TERRESTRIAL (Planet Kebumian / Batuan)</option>
                        <option value="GAS_GIANT">GAS_GIANT (Raksasa Gas)</option>
                        <option value="ICE_GIANT">ICE_GIANT (Raksasa Es)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Urutan Planet dari Matahari (1 s/d 8) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        step={1}
                        value={formData.urutan_planet ?? ''}
                        onChange={(e) => setFormData({ ...formData, urutan_planet: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 2: Ringkasan Utama Planet (PLY-02) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    2. Ringkasan Utama Planet (PLY-02)
                  </span>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deskripsi Ringkasan Planet <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formData.deskripsi_materi}
                      onChange={(e) => setFormData({ ...formData, deskripsi_materi: e.target.value })}
                      placeholder="Penjelasan sains astronomi utama yang ditampilkan di kotak Ringkasan Planet layar PLY-02..."
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:border-blue-600 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Bagian 3: Data Ilmiah (Katalog Observasi PLY-02) */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      3. Data Ilmiah (6 Kotak Katalog Observasi PLY-02)
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded border border-blue-200">
                      6 Parameter Ilmiah
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Diameter Khatulistiwa & Perbandingan Bumi */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        1. Diameter Ekuator (km) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        step="any"
                        value={formData.diameter_km ?? ''}
                        onChange={(e) => setFormData({ ...formData, diameter_km: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subteks Perbandingan Bumi (PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.perbandingan_bumi}
                        onChange={(e) => setFormData({ ...formData, perbandingan_bumi: e.target.value })}
                        placeholder="misal: 0.38x Bumi / 1.00x Standar"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* 2. Periode Rotasi & Subteks */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        2. Periode Rotasi (Label PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.periode_rotasi}
                        onChange={(e) => setFormData({ ...formData, periode_rotasi: e.target.value })}
                        placeholder="misal: 58.6 Hari Bumi / 23 Jam 56 Menit"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subteks Periode Rotasi (PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.subteks_rotasi}
                        onChange={(e) => setFormData({ ...formData, subteks_rotasi: e.target.value })}
                        placeholder="misal: 1.408 Jam / 1 Hari Sideris"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* 3. Periode Orbit & Subteks */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        3. Periode Orbit (Label PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.periode_orbit}
                        onChange={(e) => setFormData({ ...formData, periode_orbit: e.target.value })}
                        placeholder="misal: 88 Hari Bumi / 365.25 Hari"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subteks Periode Orbit (PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.subteks_orbit}
                        onChange={(e) => setFormData({ ...formData, subteks_orbit: e.target.value })}
                        placeholder="misal: 0.24 Tahun Bumi / 1 Tahun Kalender"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* 4. Kemiringan Sumbu */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        4. Kemiringan Sumbu (Label PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.kemiringan_sumbu}
                        onChange={(e) => setFormData({ ...formData, kemiringan_sumbu: e.target.value })}
                        placeholder="misal: 0.034° / 23.44° / 177.3°"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* 5. Suhu Rata-rata & Rentang Suhu */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        5. Suhu Rata-Rata (PLY-02 Utama)
                      </label>
                      <input
                        type="text"
                        value={formData.suhu_rata_c}
                        onChange={(e) => setFormData({ ...formData, suhu_rata_c: e.target.value })}
                        placeholder="misal: 167°C / 15°C / -65°C / 464°C"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rentang Suhu Permukaan (PLY-02 Subteks)
                      </label>
                      <input
                        type="text"
                        value={formData.rentang_suhu}
                        onChange={(e) => setFormData({ ...formData, rentang_suhu: e.target.value })}
                        placeholder="misal: -180°C s/d 430°C / 15°C (Rata-rata)"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* 6. Usia Planet & Subteks Usia */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        6. Usia Planet (PLY-02 Utama)
                      </label>
                      <input
                        type="text"
                        value={formData.usia_planet}
                        onChange={(e) => setFormData({ ...formData, usia_planet: e.target.value })}
                        placeholder="misal: ~4.5 Miliar Tahun / ~4.54 Miliar Tahun"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subteks Usia Planet (PLY-02)
                      </label>
                      <input
                        type="text"
                        value={formData.subteks_usia}
                        onChange={(e) => setFormData({ ...formData, subteks_usia: e.target.value })}
                        placeholder="misal: Terbentuk bersama Tata Surya / Radiometrik Batuan"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Bagian 4: Arah & Dinamika Rotasi */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    4. Kotak Arah &amp; Dinamika Rotasi (PLY-02)
                  </span>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Judul Status Dinamika Rotasi
                    </label>
                    <input
                      type="text"
                      value={formData.judul_rotasi}
                      onChange={(e) => setFormData({ ...formData, judul_rotasi: e.target.value })}
                      placeholder="misal: Rotasi Sangat Lambat / Rotasi Retrograd Unik / Rotasi Prograd Ideal"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deskripsi Dinamika Rotasi
                    </label>
                    <textarea
                      rows={2}
                      value={formData.deskripsi_rotasi}
                      onChange={(e) => setFormData({ ...formData, deskripsi_rotasi: e.target.value })}
                      placeholder="Penjelasan keunikan arah dan efek rotasi bagi durasi hari dan kondisi siang-malam planet..."
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

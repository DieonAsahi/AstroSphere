'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Globe,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Upload,
  Loader2,
  Image as ImageIcon,
  Box,
  Eye,
  BookOpen,
  Maximize2,
  RotateCw,
  Sun,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import { formatSupabaseError } from '../../../../lib/supabase/adminAuth';
import { uploadAdminAsset } from '../../../../lib/supabase/storageUpload';
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

interface PlanetFormState {
  planet_id: string;
  urutan_orbit: string;
  nama: string;
  kategori_planet: NonNullable<Planet['kategori_planet']>;
  diameter_km: string;
  rotation_period_hours: string;
  orbital_period_days: string;
  axial_tilt_deg: string;
  deskripsi_materi: string;
  ringkasan_cepat: string;
  sumber_referensi: string;
  aset_model_url: string;
  tekstur_url: string;
  warna_atmosfer_hex: string;
  skala_visual: string;
  batas_zona_radius: string;
  kecepatan_jelajah_nyaman: string;
  is_active: boolean;
}

const EMPTY_PLANET_FORM: PlanetFormState = {
  planet_id: '',
  urutan_orbit: '1',
  nama: '',
  kategori_planet: 'TERRESTRIAL',
  diameter_km: '10000',
  rotation_period_hours: '24',
  orbital_period_days: '365',
  axial_tilt_deg: '0',
  deskripsi_materi: '',
  ringkasan_cepat: '',
  sumber_referensi: 'NASA Planetary Fact Sheet',
  aset_model_url: '/models/planets/earth.glb',
  tekstur_url: '',
  warna_atmosfer_hex: '#38bdf8',
  skala_visual: '1',
  batas_zona_radius: '35',
  kecepatan_jelajah_nyaman: '15',
  is_active: true,
};

function toPlanetFormState(planet: Planet): PlanetFormState {
  return {
    planet_id: planet.planet_id,
    urutan_orbit: String(planet.urutan_orbit ?? 1),
    nama: planet.nama ?? '',
    kategori_planet: planet.kategori_planet ?? 'TERRESTRIAL',
    diameter_km: String(planet.diameter_km ?? 0),
    rotation_period_hours: String(planet.rotation_period_hours ?? 24),
    orbital_period_days: String(planet.orbital_period_days ?? 365),
    axial_tilt_deg: String(planet.axial_tilt_deg ?? 0),
    deskripsi_materi: planet.deskripsi_materi ?? '',
    ringkasan_cepat: planet.ringkasan_cepat ?? '',
    sumber_referensi: planet.sumber_referensi ?? '',
    aset_model_url: planet.aset_model_url ?? '/models/planets/earth.glb',
    tekstur_url: planet.tekstur_url ?? '',
    warna_atmosfer_hex: planet.warna_atmosfer_hex ?? '#38bdf8',
    skala_visual: String(planet.skala_visual ?? 1.0),
    batas_zona_radius: String(planet.batas_zona_radius ?? 35),
    kecepatan_jelajah_nyaman: String(planet.kecepatan_jelajah_nyaman ?? 15.0),
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

  // Upload states & previews
  const [uploadingTexture, setUploadingTexture] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [texturePreviewBroken, setTexturePreviewBroken] = useState(false);
  const textureInputRef = useRef<HTMLInputElement | null>(null);
  const modelInputRef = useRef<HTMLInputElement | null>(null);

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
        .order('urutan_orbit', { ascending: true });

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
    setTexturePreviewBroken(false);
    setModalNotification(null);
  };

  const handleCloseModal = () => {
    setEditingPlanet(null);
    setFormData(EMPTY_PLANET_FORM);
    setModalViewMode('EDIT');
    setTexturePreviewBroken(false);
    setModalNotification(null);
  };

  // Upload Tekstur Permukaan Planet ke Supabase Storage (astrosphere-assets/planets/)
  const handleTextureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (textureInputRef.current) {
      textureInputRef.current.value = '';
    }
    if (!file) return;

    setUploadingTexture(true);
    setModalNotification(null);

    try {
      const publicUrl = await uploadAdminAsset({
        file,
        folder: 'planets',
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
        maxSizeMB: 10,
        invalidTypeMessage:
          'Format tekstur tidak didukung. Gunakan gambar JPG, PNG, atau WebP.',
      });

      setFormData((prev) => ({ ...prev, tekstur_url: publicUrl }));
      setTexturePreviewBroken(false);
      setModalNotification({
        type: 'success',
        message: 'Tekstur permukaan planet berhasil diunggah ke Supabase Storage!',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengunggah tekstur planet.';
      setModalNotification({ type: 'error', message: errMsg });
    } finally {
      setUploadingTexture(false);
    }
  };

  // Upload Model 3D (.glb / .gltf) ke Supabase Storage (astrosphere-assets/planets/)
  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (modelInputRef.current) {
      modelInputRef.current.value = '';
    }
    if (!file) return;

    setUploadingModel(true);
    setModalNotification(null);

    try {
      const publicUrl = await uploadAdminAsset({
        file,
        folder: 'planets',
        allowedMimeTypes: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
        allowedExtensions: ['glb', 'gltf'],
        maxSizeMB: 25,
        invalidTypeMessage:
          'Format model 3D tidak didukung. Gunakan file .glb atau .gltf.',
      });

      setFormData((prev) => ({ ...prev, aset_model_url: publicUrl }));
      setModalNotification({
        type: 'success',
        message: 'Model 3D (.glb/.gltf) berhasil diunggah ke Supabase Storage!',
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengunggah model 3D.';
      setModalNotification({ type: 'error', message: errMsg });
    } finally {
      setUploadingModel(false);
    }
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
        throw new Error('Status planet tidak terbarui di database (akses RLS ditolak).');
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

    // Validasi string & numerik secara eksplisit
    const orbitNum = Number(formData.urutan_orbit);
    const diameterNum = Number(formData.diameter_km);
    const rotationNum = Number(formData.rotation_period_hours);
    const orbitalNum = Number(formData.orbital_period_days);
    const tiltNum = Number(formData.axial_tilt_deg);
    const scaleNum = Number(formData.skala_visual);
    const radiusNum = Number(formData.batas_zona_radius);
    const speedNum = Number(formData.kecepatan_jelajah_nyaman);

    if (!formData.nama.trim()) {
      setModalNotification({ type: 'error', message: 'Nama resmi planet wajib diisi.' });
      return;
    }

    if (!Number.isInteger(orbitNum) || orbitNum < 1) {
      setModalNotification({
        type: 'error',
        message: 'Urutan orbit harus berupa bilangan bulat minimal 1.',
      });
      return;
    }

    // Cegah bentrok urutan_orbit sebelum kirim ke database
    const conflictPlanet = planets.find(
      (p) => p.planet_id !== editingPlanet.planet_id && p.urutan_orbit === orbitNum
    );
    if (conflictPlanet) {
      setModalNotification({
        type: 'error',
        message: `Urutan orbit #${orbitNum} sudah dipakai oleh planet "${conflictPlanet.nama}". Pilih angka urutan lain.`,
      });
      return;
    }

    if (formData.diameter_km.trim() === '' || Number.isNaN(diameterNum) || diameterNum <= 0) {
      setModalNotification({
        type: 'error',
        message: 'Diameter khatulistiwa harus lebih besar dari 0 km.',
      });
      return;
    }

    if (
      formData.rotation_period_hours.trim() === '' ||
      Number.isNaN(rotationNum) ||
      rotationNum === 0
    ) {
      setModalNotification({
        type: 'error',
        message: 'Periode rotasi tidak boleh kosong atau 0 (gunakan negatif untuk retrograde).',
      });
      return;
    }

    if (
      formData.orbital_period_days.trim() === '' ||
      Number.isNaN(orbitalNum) ||
      orbitalNum <= 0
    ) {
      setModalNotification({
        type: 'error',
        message: 'Periode orbit / revolusi harus lebih besar dari 0 hari.',
      });
      return;
    }

    if (formData.axial_tilt_deg.trim() === '' || Number.isNaN(tiltNum)) {
      setModalNotification({
        type: 'error',
        message: 'Kemiringan sumbu rotasi harus berupa angka yang valid (boleh 0).',
      });
      return;
    }

    if (formData.skala_visual.trim() === '' || Number.isNaN(scaleNum) || scaleNum <= 0) {
      setModalNotification({
        type: 'error',
        message: 'Skala ukuran visual 3D harus lebih besar dari 0.',
      });
      return;
    }

    if (formData.batas_zona_radius.trim() === '' || Number.isNaN(radiusNum) || radiusNum <= 0) {
      setModalNotification({
        type: 'error',
        message: 'Radius batas zona masuk harus lebih besar dari 0.',
      });
      return;
    }

    if (
      formData.kecepatan_jelajah_nyaman.trim() === '' ||
      Number.isNaN(speedNum) ||
      speedNum <= 0
    ) {
      setModalNotification({
        type: 'error',
        message: 'Kecepatan jelajah nyaman harus lebih besar dari 0 km/s.',
      });
      return;
    }

    if (!formData.deskripsi_materi.trim()) {
      setModalNotification({
        type: 'error',
        message: 'Deskripsi utama planet wajib diisi.',
      });
      return;
    }

    setSaving(true);
    setNotification(null);

    try {
      const { data, error } = await supabase
        .from('planets')
        .update({
          urutan_orbit: orbitNum,
          nama: formData.nama.trim(),
          kategori_planet: formData.kategori_planet,
          diameter_km: diameterNum,
          rotation_period_hours: rotationNum,
          orbital_period_days: orbitalNum,
          axial_tilt_deg: tiltNum,
          deskripsi_materi: formData.deskripsi_materi.trim(),
          ringkasan_cepat: formData.ringkasan_cepat.trim(),
          sumber_referensi: formData.sumber_referensi.trim() || null,
          aset_model_url: formData.aset_model_url.trim() || editingPlanet.aset_model_url,
          tekstur_url: formData.tekstur_url.trim() || null,
          warna_atmosfer_hex: formData.warna_atmosfer_hex || '#38bdf8',
          skala_visual: scaleNum,
          batas_zona_radius: radiusNum,
          kecepatan_jelajah_nyaman: speedNum,
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

  const activePlanetCount = useMemo(
    () => planets.filter((p) => p.is_active !== false).length,
    [planets]
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai Gambar A02 (Tanpa Tombol Tambah Planet) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Data Planet
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Kelola parameter sains, tekstur/model 3D, ringkasan materi, dan status visibilitas planet tata surya.
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

      {/* 2. Table Card Sesuai Gambar A02 dengan Kolom STATUS */}
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
                <th className="px-6 py-3.5">STATUS</th>
                <th className="px-6 py-3.5 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Memuat data planet tata surya...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPlanets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                    Tidak ada planet yang cocok dengan pencarian "{searchQuery}".
                  </td>
                </tr>
              ) : (
                paginatedPlanets.map((planet) => {
                  const isEarth = planet.planet_id === 'earth';
                  const isActive = planet.is_active !== false;

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

      {/* 3. Modal Form: Ubah Data Planet (Tanpa Tambah / Hapus) */}
      {editingPlanet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ubah Data Planet: {formData.nama || editingPlanet.nama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi parameter sains, teks pembuka, aset 3D, dan visibilitas planet
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

            {/* Notifikasi Dalam Modal (Terlihat Jelas di Atas Backdrop) */}
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
                <button
                  type="button"
                  onClick={() => setModalNotification(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Toggle Tab Form Edit vs Pratinjau Layar Siswa */}
            <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setModalViewMode('EDIT')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  modalViewMode === 'EDIT'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Form Edit Data</span>
              </button>
              <button
                type="button"
                onClick={() => setModalViewMode('PREVIEW')}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
                  modalViewMode === 'PREVIEW'
                    ? 'bg-slate-900 text-cyan-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Pratinjau Layar Siswa</span>
              </button>
            </div>

            <form onSubmit={handleSave} noValidate className="mt-5 space-y-4">
              {modalViewMode === 'PREVIEW' && (() => {
                const rotHours = Number(formData.rotation_period_hours) || 0;
                const isRetrograde = rotHours < 0;
                const absRot = Math.abs(rotHours);
                const orbDays = Number(formData.orbital_period_days) || 0;
                const orbYears = (orbDays / 365.25).toFixed(2);
                const diameterVal = Number(formData.diameter_km) || 0;
                const tiltVal = Number(formData.axial_tilt_deg) || 0;

                return (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 text-white shadow-xl space-y-4">
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
                              Orbit #{formData.urutan_orbit || '1'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Simulasi Panel Deskripsi HUD 3D Siswa
                          </p>
                        </div>
                      </div>
                      <span
                        className="h-5 w-5 rounded-full border border-white/20 shadow-md shrink-0"
                        style={{ backgroundColor: formData.warna_atmosfer_hex || '#38bdf8' }}
                        title="Warna pendar atmosfer"
                      />
                    </div>

                    {/* Ringkasan Cepat / Teks Opening */}
                    {formData.ringkasan_cepat && (
                      <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 p-3.5">
                        <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-cyan-400 to-indigo-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                          Sekilas Pengenalan Planet
                        </span>
                        <p className="text-xs font-medium text-cyan-100 italic leading-relaxed">
                          "{formData.ringkasan_cepat}"
                        </p>
                      </div>
                    )}

                    {/* Peringatan Retrograde */}
                    {isRetrograde && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2.5">
                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <span className="font-bold text-amber-300 uppercase">
                            Rotasi Retrograde Terdeteksi
                          </span>
                          <p className="text-amber-200/90 mt-0.5">
                            {formData.nama || 'Planet ini'} berputar searah jarum jam ({formData.rotation_period_hours} jam).
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 4 Parameter Sains */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                          <Maximize2 className="h-3 w-3 text-cyan-400" />
                          <span>Diameter Khatulistiwa</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-white">
                          {diameterVal.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-400">km</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                          <RotateCw className="h-3 w-3 text-indigo-400" />
                          <span>Periode Rotasi</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-white">
                          {absRot.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-400">jam</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                          <Sun className="h-3 w-3 text-amber-400" />
                          <span>Periode Orbit</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-white">
                          {orbDays.toLocaleString('id-ID')} <span className="text-[11px] font-normal text-slate-400">hari ({orbYears} th)</span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                          <Compass className="h-3 w-3 text-emerald-400" />
                          <span>Kemiringan Sumbu</span>
                        </div>
                        <div className="font-mono text-sm font-bold text-white">
                          {tiltVal.toFixed(2)}°
                        </div>
                      </div>
                    </div>

                    {/* Rangkuman Materi */}
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 text-xs text-slate-300 leading-relaxed text-justify">
                      {formData.deskripsi_materi || 'Deskripsi utama planet belum diisi...'}
                    </div>

                    {/* Referensi */}
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>
                        Data diverifikasi berdasarkan {formData.sumber_referensi || 'NASA Planetary Fact Sheet'}.
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className={modalViewMode === 'EDIT' ? 'space-y-4' : 'hidden'}>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID Planet */}
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

                {/* Nama Planet */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Resmi Planet
                  </label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
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

                {/* Urutan Orbit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Urutan Orbit dari Matahari (≥ 1)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.urutan_orbit ?? ''}
                    onChange={(e) => setFormData({ ...formData, urutan_orbit: e.target.value })}
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
                    min={1}
                    step="any"
                    value={formData.diameter_km ?? ''}
                    onChange={(e) => setFormData({ ...formData, diameter_km: e.target.value })}
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
                    value={formData.rotation_period_hours ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, rotation_period_hours: e.target.value })
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
                    min={0.1}
                    step="any"
                    value={formData.orbital_period_days ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, orbital_period_days: e.target.value })
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
                    value={formData.axial_tilt_deg ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, axial_tilt_deg: e.target.value })
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
                  value={formData.ringkasan_cepat}
                  onChange={(e) => setFormData({ ...formData, ringkasan_cepat: e.target.value })}
                  placeholder="misal: Planet samudra biru, rumah bagi peradaban dan satu-satunya dunia berpenghuni."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Deskripsi Utama Materi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Utama Planet (Saat Pemain Berhenti &amp; Mengamati Planet)
                </label>
                <textarea
                  rows={3}
                  value={formData.deskripsi_materi}
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
                  value={formData.sumber_referensi}
                  onChange={(e) => setFormData({ ...formData, sumber_referensi: e.target.value })}
                  placeholder="misal: NASA Planetary Fact Sheet"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Parameter Visual, Upload Tekstur & Model 3D */}
              <div className="pt-3 border-t border-slate-100 space-y-4">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Pengaturan Model 3D, Tekstur &amp; Navigasi Jelajah
                </span>

                {/* Upload Tekstur Permukaan (.webp/.jpg/.png) + Live Preview */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Tekstur Permukaan Planet (.webp, .png, .jpg)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={formData.tekstur_url}
                      onChange={(e) => {
                        setFormData({ ...formData, tekstur_url: e.target.value });
                        setTexturePreviewBroken(false);
                      }}
                      placeholder="/textures/planets/earth.webp atau URL Supabase Storage"
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                    <input
                      ref={textureInputRef}
                      type="file"
                      accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
                      onChange={handleTextureUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => textureInputRef.current?.click()}
                      disabled={uploadingTexture}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 text-xs font-semibold text-blue-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {uploadingTexture ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-blue-600" />
                          <span>Upload Tekstur</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live Thumbnail Preview Tekstur */}
                  {formData.tekstur_url.trim() && (
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5">
                      <div className="h-14 w-24 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {!texturePreviewBroken ? (
                          <img
                            src={formData.tekstur_url}
                            alt={`Pratinjau tekstur ${formData.nama}`}
                            className="h-full w-full object-cover"
                            onError={() => setTexturePreviewBroken(true)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon className="h-4 w-4" />
                            <span className="text-[9px] mt-0.5">Tidak termuat</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-slate-800">
                          Pratinjau Tekstur Permukaan
                        </p>
                        <p className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                          {formData.tekstur_url}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, tekstur_url: '' });
                          setTexturePreviewBroken(false);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus URL tekstur"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Upload Model 3D (.glb / .gltf) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    URL Model 3D (.glb / .gltf)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Box className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.aset_model_url}
                        onChange={(e) => setFormData({ ...formData, aset_model_url: e.target.value })}
                        placeholder="/models/planets/earth.glb"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-xs text-slate-900 focus:border-blue-600 focus:outline-none font-mono"
                      />
                    </div>
                    <input
                      ref={modelInputRef}
                      type="file"
                      accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                      onChange={handleModelUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => modelInputRef.current?.click()}
                      disabled={uploadingModel}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      {uploadingModel ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                          <span>Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-indigo-600" />
                          <span>Upload .GLB</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Aset yang diunggah otomatis tersimpan ke bucket{' '}
                    <code className="bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-600 font-mono">
                      astrosphere-assets/planets/
                    </code>
                    .
                  </p>
                </div>

                {/* Grid Parameter Numerik & Atmosfer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        value={formData.warna_atmosfer_hex}
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
                      min={0.05}
                      step="any"
                      value={formData.skala_visual ?? ''}
                      onChange={(e) => setFormData({ ...formData, skala_visual: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Radius Batas Zona Masuk
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={formData.batas_zona_radius ?? ''}
                      onChange={(e) => setFormData({ ...formData, batas_zona_radius: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Kecepatan Jelajah Nyaman (km/s)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={formData.kecepatan_jelajah_nyaman ?? ''}
                      onChange={(e) =>
                        setFormData({ ...formData, kecepatan_jelajah_nyaman: e.target.value })
                      }
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={saving || uploadingTexture || uploadingModel}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
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

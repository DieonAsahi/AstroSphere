'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Globe,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  HelpCircle,
  Upload,
  Gauge,
  Compass,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { Planet, PlanetCategory } from '../../../../types/database';

export default function AdminPlanetsPage() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPlanet, setEditingPlanet] = useState<Planet | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [uploadingTexture, setUploadingTexture] = useState(false);

  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleEditClick = (planet: Planet) => {
    setEditingPlanet({ ...planet });
  };

  const handleCloseModal = () => {
    setEditingPlanet(null);
  };

  // Upload model .glb langsung ke bucket 'astrosphere-assets' (R01 & CMS)
  const handleUploadModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPlanet) return;

    try {
      setUploadingModel(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `models/${editingPlanet.planet_id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('astrosphere-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('astrosphere-assets')
        .getPublicUrl(data.path);

      setEditingPlanet((prev) =>
        prev ? { ...prev, aset_model_url: publicUrlData.publicUrl } : null
      );

      setNotification({
        type: 'success',
        message: `File model .glb berhasil diunggah ke storage: ${data.path}`,
      });
    } catch (err: unknown) {
      console.error('Upload model error:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengunggah model 3D ke Supabase Storage.',
      });
    } finally {
      setUploadingModel(false);
    }
  };

  // Upload tekstur permukaan langsung ke bucket 'astrosphere-assets'
  const handleUploadTexture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPlanet) return;

    try {
      setUploadingTexture(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `textures/${editingPlanet.planet_id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('astrosphere-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('astrosphere-assets')
        .getPublicUrl(data.path);

      setEditingPlanet((prev) =>
        prev ? { ...prev, tekstur_url: publicUrlData.publicUrl } : null
      );

      setNotification({
        type: 'success',
        message: `File tekstur berhasil diunggah ke storage: ${data.path}`,
      });
    } catch (err: unknown) {
      console.error('Upload texture error:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengunggah file tekstur ke Supabase Storage.',
      });
    } finally {
      setUploadingTexture(false);
    }
  };

  const handleSavePlanet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanet) return;

    try {
      setSaving(true);
      setNotification(null);

      const { data, error } = await supabase
        .from('planets')
        .update({
          nama: editingPlanet.nama,
          kategori_planet: editingPlanet.kategori_planet,
          diameter_km: Number(editingPlanet.diameter_km),
          rotation_period_hours: Number(editingPlanet.rotation_period_hours),
          orbital_period_days: Number(editingPlanet.orbital_period_days),
          axial_tilt_deg: Number(editingPlanet.axial_tilt_deg),
          skala_visual: Number(editingPlanet.skala_visual),
          batas_zona_radius: Number(editingPlanet.batas_zona_radius),
          kecepatan_jelajah_nyaman: Number(editingPlanet.kecepatan_jelajah_nyaman),
          ringkasan_cepat: editingPlanet.ringkasan_cepat,
          deskripsi_materi: editingPlanet.deskripsi_materi,
          aset_model_url: editingPlanet.aset_model_url,
          tekstur_url: editingPlanet.tekstur_url,
          warna_atmosfer_hex: editingPlanet.warna_atmosfer_hex,
          updated_at: new Date().toISOString(),
        })
        .eq('planet_id', editingPlanet.planet_id)
        .select()
        .single();

      if (error) throw error;

      // Update state locally in real time
      setPlanets((prev) =>
        prev.map((p) => (p.planet_id === editingPlanet.planet_id ? (data as Planet) : p))
      );

      setNotification({
        type: 'success',
        message: `Data planet ${editingPlanet.nama} berhasil diperbarui di database.`,
      });

      setEditingPlanet(null);
    } catch (err: unknown) {
      console.error('Error updating planet:', err);
      setNotification({
        type: 'error',
        message: 'Gagal menyimpan perubahan planet. Pastikan akun memiliki hak akses Administrator.',
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
              Manajemen Planet & Uploader Aset 3D
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
              R01, R02, R05, R07, R08
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kelola data ilmiah asli NASA, materi kurikulum edukasi, radius batas rem otomatis, dan unggah model `.glb`.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              fetchPlanets();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
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

      {/* Planets Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="border-b border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-white">
            Daftar 8 Planet Tata Surya Terurut Sumbu Orbit
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mencakup klasifikasi planet kebumian vs gas, nilai rotasi retrograde negatif, dan parameter zona terbang lokal.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold text-center w-12">Orbit</th>
                <th className="px-5 py-3 font-semibold">Nama Planet</th>
                <th className="px-5 py-3 font-semibold">Kategori</th>
                <th className="px-5 py-3 font-semibold">Diameter</th>
                <th className="px-5 py-3 font-semibold">Rotasi (1 Hari)</th>
                <th className="px-5 py-3 font-semibold">Revolusi (1 Tahun)</th>
                <th className="px-5 py-3 font-semibold">Batas Zona</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Memuat data planet...</span>
                    </div>
                  </td>
                </tr>
              ) : planets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data planet. Harap jalankan script `structure.sql` di Supabase SQL Editor.
                  </td>
                </tr>
              ) : (
                planets.map((planet) => {
                  const isRetrograde = Number(planet.rotation_period_hours) < 0;
                  const autoBrake80 = (Number(planet.batas_zona_radius) * 0.8).toFixed(1);

                  return (
                    <tr
                      key={planet.planet_id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-cyan-400">
                        #{planet.urutan_orbit}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="h-3 w-3 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: planet.warna_atmosfer_hex || '#38bdf8' }}
                          />
                          <div>
                            <span className="font-semibold text-white">{planet.nama}</span>
                            <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                              ({planet.planet_id})
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                            planet.kategori_planet === 'TERRESTRIAL'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : planet.kategori_planet === 'GAS_GIANT'
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {planet.kategori_planet || 'TERRESTRIAL'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {Number(planet.diameter_km).toLocaleString('id-ID')} km
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span>{Number(planet.rotation_period_hours).toLocaleString('id-ID')} jam</span>
                          {isRetrograde && (
                            <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-bold text-rose-300 border border-rose-500/30">
                              RETROGRADE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {Number(planet.orbital_period_days).toLocaleString('id-ID')} hari
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-300">
                        <span>{planet.batas_zona_radius} unit</span>
                        <span className="text-[10px] text-slate-500 block">
                          (Rem 80%: {autoBrake80})
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditClick(planet)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5 text-cyan-400" />
                          <span>Edit & Aset 3D</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Planet & Uploader Aset */}
      {editingPlanet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Edit Data & Aset 3D Planet: {editingPlanet.nama}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {editingPlanet.planet_id} &bull; Orbit #{editingPlanet.urutan_orbit}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanet} className="mt-5 space-y-5">
              {/* Seksi 1: Parameter Ilmiah */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  <span>Parameter Ilmiah Asli NASA (PRD R07)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Nama Tampilan
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlanet.nama}
                      onChange={(e) =>
                        setEditingPlanet({ ...editingPlanet, nama: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Kategori Planet (PRD Bagian 8)
                    </label>
                    <select
                      value={editingPlanet.kategori_planet || 'TERRESTRIAL'}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          kategori_planet: e.target.value as PlanetCategory,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="TERRESTRIAL">TERRESTRIAL (Kebumian Padat)</option>
                      <option value="GAS_GIANT">GAS_GIANT (Raksasa Gas)</option>
                      <option value="ICE_GIANT">ICE_GIANT (Raksasa Es)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Diameter Khatulistiwa (km)
                    </label>
                    <input
                      type="number"
                      required
                      value={editingPlanet.diameter_km}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          diameter_km: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Periode Rotasi (jam)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingPlanet.rotation_period_hours}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          rotation_period_hours: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">
                      Nilai negatif menandakan rotasi retrograde (contoh Venus -5832.5, Uranus -17.24).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Periode Orbit / 1 Tahun (hari)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingPlanet.orbital_period_days}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          orbital_period_days: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Kemiringan Poros / Axial Tilt (°)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingPlanet.axial_tilt_deg}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          axial_tilt_deg: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 2: Parameter Zona Terbang & Rem Otomatis 80% */}
              <div className="border-t border-slate-800 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>Parameter Zona Terbang & Rem Otomatis (PRD R02 & R08)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Radius Batas Zona (unit)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={editingPlanet.batas_zona_radius}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          batas_zona_radius: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <div className="mt-1 text-[11px] text-emerald-400 font-mono">
                      Rem Otomatis 80%: {(Number(editingPlanet.batas_zona_radius || 0) * 0.8).toFixed(1)} unit
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Skala Visual 3D
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      required
                      value={editingPlanet.skala_visual}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          skala_visual: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Kecepatan Nyaman (km/s)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={editingPlanet.kecepatan_jelajah_nyaman || 15}
                      onChange={(e) =>
                        setEditingPlanet({
                          ...editingPlanet,
                          kecepatan_jelajah_nyaman: parseFloat(e.target.value) || 15,
                        })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Seksi 3: Materi Kurikulum & Ringkasan Cepat */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Materi Pembelajaran Kurikulum (PRD R05)</span>
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ringkasan Cepat (Highlight untuk kartu informasi ringkas)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPlanet.ringkasan_cepat || ''}
                    onChange={(e) =>
                      setEditingPlanet({ ...editingPlanet, ringkasan_cepat: e.target.value })
                    }
                    placeholder="Contoh: Planet terpanas di Tata Surya dengan rotasi retrograde unik."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Deskripsi Materi Lengkap (Teks penjelasan ilmiah tingkat SMP ke atas)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={editingPlanet.deskripsi_materi}
                    onChange={(e) =>
                      setEditingPlanet({ ...editingPlanet, deskripsi_materi: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Seksi 4: Aset 3D, Tekstur, & Direct Supabase Storage Uploader */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5" />
                  <span>Aset Model 3D & Unggah ke Supabase Storage (astrosphere-assets)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Model .glb */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      URL Model 3D (.glb / .gltf)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingPlanet.aset_model_url}
                      onChange={(e) =>
                        setEditingPlanet({ ...editingPlanet, aset_model_url: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="file"
                        ref={modelFileInputRef}
                        accept=".glb,.gltf"
                        onChange={handleUploadModel}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => modelFileInputRef.current?.click()}
                        disabled={uploadingModel}
                        className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors"
                      >
                        <Upload className={`h-3.5 w-3.5 ${uploadingModel ? 'animate-bounce' : ''}`} />
                        <span>{uploadingModel ? 'Mengunggah Model...' : 'Upload Model .glb'}</span>
                      </button>
                      <span className="text-[10px] text-slate-500">Bucket: astrosphere-assets</span>
                    </div>
                  </div>

                  {/* Tekstur Permukaan */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      URL Tekstur Permukaan 2D
                    </label>
                    <input
                      type="text"
                      value={editingPlanet.tekstur_url || ''}
                      onChange={(e) =>
                        setEditingPlanet({ ...editingPlanet, tekstur_url: e.target.value })
                      }
                      placeholder="/textures/planets/... atau https://..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="file"
                        ref={textureFileInputRef}
                        accept="image/*,.webp,.png,.jpg"
                        onChange={handleUploadTexture}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => textureFileInputRef.current?.click()}
                        disabled={uploadingTexture}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors"
                      >
                        <ImageIcon className={`h-3.5 w-3.5 ${uploadingTexture ? 'animate-bounce' : ''}`} />
                        <span>{uploadingTexture ? 'Mengunggah...' : 'Upload Tekstur'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warna Atmosfer Hex */}
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-300">
                    Warna Semburat Atmosfer Hex:
                  </label>
                  <input
                    type="color"
                    value={editingPlanet.warna_atmosfer_hex || '#38bdf8'}
                    onChange={(e) =>
                      setEditingPlanet({ ...editingPlanet, warna_atmosfer_hex: e.target.value })
                    }
                    className="h-8 w-12 rounded cursor-pointer border border-slate-700 bg-transparent"
                  />
                  <span className="font-mono text-xs text-slate-400">
                    {editingPlanet.warna_atmosfer_hex}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{saving ? 'Menyimpan ke Supabase...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

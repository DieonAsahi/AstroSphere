'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Rocket,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  Award,
  Upload,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { Ship } from '../../../../types/database';

export default function AdminShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingShip, setEditingShip] = useState<Ship | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingModel, setUploadingModel] = useState(false);

  const modelFileInputRef = useRef<HTMLInputElement>(null);

  // Alerts
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchShips = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ships')
        .select('*')
        .order('urutan_tier', { ascending: true });

      if (error) throw error;
      setShips((data || []) as Ship[]);
    } catch (err: unknown) {
      console.error('Error fetching ships:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengambil master data pesawat ruang angkasa.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchShips();
  }, [fetchShips]);

  const handleEditClick = (ship: Ship) => {
    setEditingShip({ ...ship });
  };

  const handleUploadShipModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingShip) return;

    try {
      setUploadingModel(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `ships/${editingShip.ship_id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('astrosphere-assets')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('astrosphere-assets')
        .getPublicUrl(data.path);

      setEditingShip((prev) =>
        prev ? { ...prev, aset_model_url: publicUrlData.publicUrl } : null
      );

      setNotification({
        type: 'success',
        message: `Model pesawat berhasil diunggah ke storage: ${data.path}`,
      });
    } catch (err: unknown) {
      console.error('Upload ship model error:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengunggah file model pesawat ke Supabase Storage.',
      });
    } finally {
      setUploadingModel(false);
    }
  };

  const handleSaveShip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShip) return;

    try {
      setSaving(true);
      setNotification(null);

      const { data, error } = await supabase
        .from('ships')
        .update({
          nama: editingShip.nama.trim(),
          urutan_tier: Number(editingShip.urutan_tier) || 1,
          panjang_meter: Number(editingShip.panjang_meter),
          harga_poin: Number(editingShip.harga_poin),
          kecepatan_bonus_multiplier: Number(editingShip.kecepatan_bonus_multiplier) || 1.0,
          aset_model_url: editingShip.aset_model_url.trim(),
          deskripsi: editingShip.deskripsi.trim(),
        })
        .eq('ship_id', editingShip.ship_id)
        .select()
        .single();

      if (error) throw error;

      setShips((prev) =>
        prev.map((s) => (s.ship_id === editingShip.ship_id ? (data as Ship) : s))
      );

      setNotification({
        type: 'success',
        message: `Pesawat "${editingShip.nama}" berhasil diperbarui di database.`,
      });

      setEditingShip(null);
    } catch (err: unknown) {
      console.error('Save ship error:', err);
      setNotification({
        type: 'error',
        message: 'Gagal memperbarui pesawat. Pastikan Anda memiliki hak akses Administrator.',
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
              Hanggar Pesawat & Armada Reward
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
              PRD R09, R11 & Bagian 9
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Kelola master 3 kapal eksplorasi antariksa (Astra Scout 12m, Orion Glider 15m, Nova Voyager 18m) yang dibuka dengan akumulasi kuis koin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            fetchShips();
          }}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`flex items-center justify-between gap-3 rounded-lg border p-3.5 text-xs ${
            notification.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Info Card: Hangar Economy Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4.5 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Struktur Ekonomi Poin Hanggar (PRD Bagian 9)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Astra Scout (0 Poin / Bawaan) &bull; Orion Glider (300 Poin) &bull; Nova Voyager (700 Poin) = <strong>Total 1.000 Poin</strong>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-500/30 font-semibold">
            Target Capaian: 1.000 Poin
          </span>
        </div>
      </div>

      {/* Ships Grid Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <span>Memuat data kapal...</span>
            </div>
          </div>
        ) : (
          ships.map((ship) => (
            <div
              key={ship.ship_id}
              className="relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-5 backdrop-blur-sm shadow-xl transition-all hover:border-slate-700"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 font-mono text-xs font-bold text-cyan-400 border border-cyan-500/20">
                      T{ship.urutan_tier || 1}
                    </span>
                    <h2 className="text-sm font-bold text-white">{ship.nama}</h2>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-400">
                    {ship.harga_poin === 0 ? 'Gratis (Bawaan)' : `${ship.harga_poin} Poin`}
                  </div>
                </div>

                {/* Silhouette & Specs */}
                <div className="my-4 flex h-32 items-center justify-center rounded-xl bg-slate-950/60 border border-slate-800 relative overflow-hidden">
                  <Rocket className="h-14 w-14 text-cyan-400/80 drop-shadow-[0_0_12px_rgba(34,211,238,0.3)]" />
                  <span className="absolute bottom-2 right-2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-800">
                    Panjang: {ship.panjang_meter} Meter
                  </span>
                  <span className="absolute top-2 left-2 rounded bg-slate-900/90 px-2 py-0.5 font-mono text-[10px] text-indigo-300 border border-slate-800">
                    Propulsi: {ship.kecepatan_bonus_multiplier || 1.0}x
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed min-h-[48px]">
                  {ship.deskripsi}
                </p>

                {/* Model Path */}
                <div className="mt-3 rounded-lg bg-slate-950/40 p-2 text-[10px] font-mono text-slate-500 truncate">
                  Model: {ship.aset_model_url}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleEditClick(ship)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Edit Spesifikasi & Model 3D</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Edit Pesawat */}
      {editingShip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Rocket className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Edit Spesifikasi Kapal: {editingShip.nama}
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    ID: {editingShip.ship_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingShip(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShip} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nama Kapal
                  </label>
                  <input
                    type="text"
                    required
                    value={editingShip.nama}
                    onChange={(e) => setEditingShip({ ...editingShip, nama: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tingkat Tier (1, 2, atau 3)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="3"
                    required
                    value={editingShip.urutan_tier || 1}
                    onChange={(e) =>
                      setEditingShip({
                        ...editingShip,
                        urutan_tier: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Panjang (meter): 12, 15, 18
                  </label>
                  <input
                    type="number"
                    required
                    value={editingShip.panjang_meter}
                    onChange={(e) =>
                      setEditingShip({
                        ...editingShip,
                        panjang_meter: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Harga Unlock (Poin)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingShip.harga_poin}
                    onChange={(e) =>
                      setEditingShip({
                        ...editingShip,
                        harga_poin: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Multiplier Kecepatan
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={editingShip.kecepatan_bonus_multiplier || 1.0}
                    onChange={(e) =>
                      setEditingShip({
                        ...editingShip,
                        kecepatan_bonus_multiplier: parseFloat(e.target.value) || 1.0,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Aset Model & Upload ke Storage */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3.5 space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  URL Aset Model 3D (.glb)
                </label>
                <input
                  type="text"
                  required
                  value={editingShip.aset_model_url}
                  onChange={(e) =>
                    setEditingShip({ ...editingShip, aset_model_url: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                />

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={modelFileInputRef}
                    accept=".glb,.gltf"
                    onChange={handleUploadShipModel}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => modelFileInputRef.current?.click()}
                    disabled={uploadingModel}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors"
                  >
                    <Upload className={`h-3.5 w-3.5 ${uploadingModel ? 'animate-bounce' : ''}`} />
                    <span>{uploadingModel ? 'Mengunggah Model...' : 'Upload Model .glb ke Storage'}</span>
                  </button>
                  <span className="text-[10px] text-slate-500">Bucket: astrosphere-assets</span>
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Deskripsi Kapal
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingShip.deskripsi}
                  onChange={(e) =>
                    setEditingShip({ ...editingShip, deskripsi: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingShip(null)}
                  disabled={saving}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/20"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
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

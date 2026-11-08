'use client';

import { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';

interface CloudSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloudSaveModal({ isOpen, onClose }: CloudSaveModalProps) {
  const cloudUsername = usePlayerStore((state) => state.cloudUsername);
  const isSyncing = usePlayerStore((state) => state.isSyncing);
  const pointsBalance = usePlayerStore((state) => state.pointsBalance);
  const activeShipId = usePlayerStore((state) => state.activeShipId);
  const checkpointPlanetId = usePlayerStore((state) => state.checkpointPlanetId);

  const registerCloudAccount = usePlayerStore((state) => state.registerCloudAccount);
  const loginAndSyncCloudAccount = usePlayerStore((state) => state.loginAndSyncCloudAccount);
  const logoutCloudAccount = usePlayerStore((state) => state.logoutCloudAccount);
  const syncCurrentToCloud = usePlayerStore((state) => state.syncCurrentToCloud);

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const res = await registerCloudAccount(username, password);
    if (res.success) {
      setNotice({ type: 'success', message: res.message });
      setUsername('');
      setPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setNotice({ type: 'error', message: res.message });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const res = await loginAndSyncCloudAccount(username, password);
    if (res.success) {
      setNotice({ type: 'success', message: res.message });
      setUsername('');
      setPassword('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setNotice({ type: 'error', message: res.message });
    }
  };

  const handleManualSync = async () => {
    setNotice(null);
    try {
      await syncCurrentToCloud();
      setNotice({ type: 'success', message: 'Progres terbaru berhasil disimpan ke Cloud!' });
      setTimeout(() => setNotice(null), 3000);
    } catch {
      setNotice({ type: 'error', message: 'Gagal melakukan sinkronisasi cloud.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-cyan-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Cloud className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Cloud Save Antariksa
                </h2>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-400 border border-cyan-500/20">
                  Gaya .IO Bebas Ribet
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simpan & lanjutkan petualanganmu dari mana saja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Notice Alert */}
        {notice && (
          <div
            className={`mt-4 flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
              notice.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/30 bg-red-500/10 text-red-200'
            }`}
          >
            {notice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Jika Sudah Terhubung ke Cloud */}
        {cloudUsername ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span>Status Akun: Terhubung ke Cloud</span>
              </div>
              <p className="mt-1 text-base font-bold text-white">
                @{cloudUsername}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] font-mono border-t border-cyan-500/20 pt-2.5">
                <div>
                  <span className="text-slate-400 block">Saldo Poin:</span>
                  <strong className="text-amber-400">{pointsBalance} Poin</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Armada:</span>
                  <strong className="text-cyan-300">{activeShipId}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Checkpoint:</span>
                  <strong className="text-slate-200 capitalize">{checkpointPlanetId}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  logoutCloudAccount();
                  setNotice({
                    type: 'success',
                    message: 'Berhasil keluar dari Cloud. Anda kembali ke Mode Tamu lokal.',
                  });
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
                title="Keluar dari akun cloud"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        ) : (
          /* Jika Masih Mode Tamu: Tampilkan Tab Register & Login */
          <div className="mt-5 space-y-4">
            {/* Tab Selector */}
            <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('REGISTER');
                  setNotice(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'REGISTER'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Buat Akun / Tautkan
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setNotice(null);
                }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                  activeTab === 'LOGIN'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Muat Akun (Pindah Device)
              </button>
            </div>

            {/* Banner Keterangan Ramah Siswa */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                {activeTab === 'REGISTER'
                  ? 'Tanpa email & tanpa data pribadi! Cukup buat Username & Password untuk melanjutkan skor dan armada pesawatmu di rumah.'
                  : 'Pindah komputer atau HP? Masukkan username dan password untuk menggabungkan progres bermainmu secara otomatis.'}
              </span>
            </div>

            {/* Form */}
            <form
              onSubmit={activeTab === 'REGISTER' ? handleRegister : handleLogin}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username (Minimal 3 Karakter)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="misal: kapten_bima"
                    required
                    minLength={3}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kata Sandi (Minimal 4 Karakter)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={4}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 disabled:opacity-50 transition-all"
              >
                {isSyncing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Memproses Cloud...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {activeTab === 'REGISTER'
                        ? 'Tautkan Progres ke Akun Baru'
                        : 'Masuk & Sinkronkan Progres'}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-5 border-t border-slate-800/80 pt-3 text-center">
          <p className="text-[10px] text-slate-400">
            AstroSphere &bull; Game Edukasi Bebas Stres &bull; Aman & Ramah Siswa
          </p>
        </div>
      </div>
    </div>
  );
}

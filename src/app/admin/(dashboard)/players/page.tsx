'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  RefreshCw,
  Search,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  Award,
  Globe,
  ShieldAlert,
  KeyRound,
  Lock,
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase/client';
import type { PlayerProgress } from '../../../../types/database';

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<PlayerProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resettingUser, setResettingUser] = useState<PlayerProgress | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<PlayerProgress | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('player_progress')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setPlayers((data || []) as unknown as PlayerProgress[]);
    } catch (err: unknown) {
      console.error('Error fetching player progress:', err);
      setNotification({
        type: 'error',
        message: 'Gagal mengambil data progres pemain dari Supabase.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return players;
    const q = searchQuery.toLowerCase();
    return players.filter(
      (p) =>
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.player_id && p.player_id.toLowerCase().includes(q))
    );
  }, [players, searchQuery]);

  // Reset Progres Akun Demo (Sangat krusial untuk simulasi presentasi di depan juri!)
  const handleResetDemoAccount = async () => {
    if (!resettingUser) return;

    try {
      setActionLoading(true);

      const resetPayload = {
        saldo_poin: 0,
        kepemilikan_pesawat: ['astra-scout'],
        pesawat_aktif: 'astra-scout',
        checkpoint_planet_id: 'earth',
        skor_kuis: {},
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('player_progress')
        .update(resetPayload)
        .eq('player_id', resettingUser.player_id)
        .select()
        .single();

      if (error) throw error;

      setPlayers((prev) =>
        prev.map((p) => (p.player_id === resettingUser.player_id ? (data as unknown as PlayerProgress) : p))
      );

      setNotification({
        type: 'success',
        message: `Progres akun "${resettingUser.username}" berhasil di-reset ke kondisi awal untuk simulasi juri.`,
      });

      setResettingUser(null);
    } catch (err: unknown) {
      console.error('Reset demo account error:', err);
      setNotification({
        type: 'error',
        message: 'Gagal me-reset progres akun demo. Pastikan Anda login sebagai Administrator.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Ubah Password Akun Pemain menggunakan RPC admin_reset_player_password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;

    if (!newPassword || newPassword.trim().length < 4) {
      setNotification({
        type: 'error',
        message: 'Password baru minimal harus terdiri dari 4 karakter.',
      });
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase.rpc('admin_reset_player_password', {
        p_player_id: passwordModalUser.player_id,
        p_new_password: newPassword.trim(),
      });

      if (error) throw error;

      setNotification({
        type: 'success',
        message: `Password akun pemain "${passwordModalUser.username}" berhasil diperbarui.`,
      });

      setPasswordModalUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      console.error('Change password error:', err);
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal memperbarui password pemain.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Monitor Akun Pemain (Username & Password)
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/30">
              PRD R10, R11, R12 & Bagian 11
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pantau akun penjelajah antariksa berbasis Username & Password, ubah password siswa, dan reset progres akun demo saat simulasi lomba.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            fetchPlayers();
          }}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
        </button>
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

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Users className="h-4 w-4 text-cyan-400" />
          <span>Total Akun Terdaftar:</span>
          <span className="font-mono text-cyan-400 font-bold">{players.length} Pemain</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari username pemain..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Username Pemain</th>
                <th className="px-5 py-3 font-semibold text-center">Checkpoint</th>
                <th className="px-5 py-3 font-semibold text-center">Saldo Poin</th>
                <th className="px-5 py-3 font-semibold">Armada Hanggar</th>
                <th className="px-5 py-3 font-semibold">Rincian Rekor Kuis</th>
                <th className="px-5 py-3 font-semibold text-center">Terakhir Sync</th>
                <th className="px-5 py-3 font-semibold text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                      <span>Memuat data pemain...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Belum ada data pemain cloud save yang terdaftar. Pemain dapat mendaftar/login hanya dengan Username & Password di halaman depan.
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const scores = (player.skor_kuis || {}) as Record<string, number>;
                  const scoreEntries = Object.entries(scores);

                  return (
                    <tr key={player.player_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>{player.username}</span>
                          {player.username === 'demo_siswa' && (
                            <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-mono text-indigo-300 border border-indigo-500/30">
                              Akun Demo
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          ID: {player.player_id ? `${player.player_id.slice(0, 8)}...` : '-'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-cyan-300 border border-slate-700 capitalize">
                          <Globe className="h-3 w-3 text-cyan-400" />
                          <span>{player.checkpoint_planet_id}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-amber-300 font-bold">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                          <Award className="h-3 w-3 text-amber-400" />
                          <span>{player.saldo_poin} Poin</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {(player.kepemilikan_pesawat || ['astra-scout']).map((shipId) => (
                            <span
                              key={shipId}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                                shipId === player.pesawat_aktif
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {shipId === player.pesawat_aktif ? `★ ${shipId}` : shipId}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {scoreEntries.length === 0 ? (
                          <span className="text-slate-500 text-[11px] italic">Belum ada skor kuis</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {scoreEntries.map(([planet, score]) => (
                              <span
                                key={planet}
                                className="rounded bg-slate-950 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-800"
                              >
                                {planet}: <strong className="text-emerald-400">{score}</strong>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-[10px] text-slate-400">
                        {player.updated_at
                          ? new Date(player.updated_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setPasswordModalUser(player);
                              setNewPassword('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 text-[11px] font-medium text-indigo-300 transition-colors"
                            title="Ubah password pemain"
                          >
                            <KeyRound className="h-3 w-3" />
                            <span>Password</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setResettingUser(player)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 text-[11px] font-semibold text-amber-300 transition-colors"
                            title="Reset progres untuk simulasi juri"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Reset Demo</span>
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

      {/* Modal Ubah Password Pemain */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Ubah Password Pemain</h3>
                <p className="text-xs text-slate-400">Akun: <strong className="text-indigo-300">{passwordModalUser.username}</strong></p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password Baru (Minimal 4 Karakter)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru..."
                    required
                    minLength={4}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Password akan di-hash secara aman menggunakan algoritma bcrypt (pgcrypto) di database Supabase.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  disabled={actionLoading}
                  className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:opacity-95 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
                >
                  {actionLoading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5" />
                  )}
                  <span>{actionLoading ? 'Menyimpan...' : 'Simpan Password Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Akun Demo */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Progres Akun Demo</h3>
                <p className="text-xs text-slate-400">Persiapan Simulasi Penilaian Juri</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tindakan ini akan mengembalikan data akun{' '}
              <strong className="text-white">
                {resettingUser.username}
              </strong>{' '}
              ke kondisi awal:
            </p>

            <ul className="mt-3 space-y-1 text-xs text-slate-300 rounded-lg bg-slate-950/60 p-3 border border-slate-800 font-mono text-[11px]">
              <li>&bull; Saldo Poin: <span className="text-amber-400">0 Poin</span></li>
              <li>&bull; Armada: <span className="text-cyan-400">Hanya Astra Scout (Tier 1)</span></li>
              <li>&bull; Rekor Skor Kuis: <span className="text-emerald-400">Dikosongkan</span></li>
              <li>&bull; Checkpoint: <span className="text-slate-200">Earth (Bumi)</span></li>
            </ul>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                disabled={actionLoading}
                className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetDemoAccount}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20"
              >
                {actionLoading ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
                <span>{actionLoading ? 'Mereset...' : 'Ya, Reset Progres Demo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

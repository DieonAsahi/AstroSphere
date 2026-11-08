import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/types/database';

const GUEST_STORAGE_KEY = 'astrosphere_guest_progress';
const CLOUD_USERNAME_KEY = 'astrosphere_cloud_username';

export interface PlayerProgressState {
  // Progres Permainan
  quizBestScores: Record<string, number>;
  pointsBalance: number;
  ownedShips: string[];
  activeShipId: string;
  checkpointPlanetId: string;

  // Cloud Save Info (Username & Password Only - R12)
  cloudUsername: string | null;
  isSyncing: boolean;
  syncError: string | null;

  // Backward-compatibility getters
  userEmail: string | null;
  isCloudSynced: boolean;

  // Actions
  initializePlayer: () => Promise<void>;
  submitQuizScore: (planetId: string, score: number) => { delta: number; newTotal: number };
  buyShip: (shipId: string, price: number) => boolean;
  selectShip: (shipId: string) => boolean;
  setCheckpointPlanet: (planetId: string) => void;

  // Cloud Save Actions (R12 - Slither.io style)
  registerCloudAccount: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  loginAndSyncCloudAccount: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  logoutCloudAccount: () => void;
  syncCurrentToCloud: () => Promise<void>;

  // Backward-compatibility aliases
  syncCloudSave: () => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: () => Promise<void>;
  logoutCloud: () => Promise<void>;
}

function loadGuestProgress(): Partial<PlayerProgressState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function loadSavedUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(CLOUD_USERNAME_KEY);
  } catch {
    return null;
  }
}

function saveGuestProgress(state: {
  quizBestScores: Record<string, number>;
  pointsBalance: number;
  ownedShips: string[];
  activeShipId: string;
  checkpointPlanetId: string;
}) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      GUEST_STORAGE_KEY,
      JSON.stringify({
        quizBestScores: state.quizBestScores,
        pointsBalance: state.pointsBalance,
        ownedShips: state.ownedShips,
        activeShipId: state.activeShipId,
        checkpointPlanetId: state.checkpointPlanetId,
      })
    );
  } catch (err) {
    console.error('Gagal menyimpan guest progress:', err);
  }
}

export const usePlayerStore = create<PlayerProgressState>((set, get) => ({
  quizBestScores: {},
  pointsBalance: 0,
  ownedShips: ['astra-scout'],
  activeShipId: 'astra-scout',
  checkpointPlanetId: 'earth',

  cloudUsername: null,
  isSyncing: false,
  syncError: null,

  userEmail: null,
  isCloudSynced: false,

  initializePlayer: async () => {
    // 1. Muat data progres lokal dari LocalStorage
    const saved = loadGuestProgress();
    const savedUsername = loadSavedUsername();

    set({
      quizBestScores: saved.quizBestScores || {},
      pointsBalance: typeof saved.pointsBalance === 'number' ? saved.pointsBalance : 0,
      ownedShips:
        saved.ownedShips && saved.ownedShips.length > 0 ? saved.ownedShips : ['astra-scout'],
      activeShipId: saved.activeShipId || 'astra-scout',
      checkpointPlanetId: saved.checkpointPlanetId || 'earth',
      cloudUsername: savedUsername,
      userEmail: savedUsername ? `@${savedUsername}` : null,
      isCloudSynced: !!savedUsername,
    });
  },

  // Logika Klaim Poin Kuis Bebas Stres (R10)
  submitQuizScore: (planetId: string, newScore: number) => {
    const currentBest = get().quizBestScores[planetId] || 0;
    // Poin hanya diberikan jika skor baru melampaui skor terbaik lama (selisih delta)
    const delta = Math.max(0, newScore - currentBest);
    const newBest = Math.max(currentBest, newScore);
    const newBalance = get().pointsBalance + delta;

    const newQuizScores = {
      ...get().quizBestScores,
      [planetId]: newBest,
    };

    set({
      quizBestScores: newQuizScores,
      pointsBalance: newBalance,
    });

    saveGuestProgress({
      quizBestScores: newQuizScores,
      pointsBalance: newBalance,
      ownedShips: get().ownedShips,
      activeShipId: get().activeShipId,
      checkpointPlanetId: get().checkpointPlanetId,
    });

    // Jika akun cloud aktif, sinkronkan perubahan di latar belakang
    if (get().cloudUsername) {
      get().syncCurrentToCloud();
    }

    return { delta, newTotal: newBalance };
  },

  // Logika Pembelian Pesawat di Hanggar (R11)
  buyShip: (shipId: string, price: number) => {
    const state = get();
    if (state.ownedShips.includes(shipId)) {
      set({ activeShipId: shipId });
      saveGuestProgress(get());
      if (state.cloudUsername) get().syncCurrentToCloud();
      return true;
    }

    if (state.pointsBalance >= price) {
      const newBalance = state.pointsBalance - price;
      const newOwned = [...state.ownedShips, shipId];

      set({
        pointsBalance: newBalance,
        ownedShips: newOwned,
        activeShipId: shipId,
      });

      saveGuestProgress({
        quizBestScores: state.quizBestScores,
        pointsBalance: newBalance,
        ownedShips: newOwned,
        activeShipId: shipId,
        checkpointPlanetId: state.checkpointPlanetId,
      });

      if (state.cloudUsername) get().syncCurrentToCloud();
      return true;
    }

    return false;
  },

  selectShip: (shipId: string) => {
    if (get().ownedShips.includes(shipId)) {
      set({ activeShipId: shipId });
      saveGuestProgress(get());
      if (get().cloudUsername) get().syncCurrentToCloud();
      return true;
    }
    return false;
  },

  setCheckpointPlanet: (planetId: string) => {
    set({ checkpointPlanetId: planetId });
    saveGuestProgress(get());
    if (get().cloudUsername) get().syncCurrentToCloud();
  },

  // =========================================================================
  // Cloud Save Berbasis Username & Password Saja (R12 - Kasual Game .io)
  // =========================================================================

  registerCloudAccount: async (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    if (cleanUser.length < 3) {
      return { success: false, message: 'Username minimal terdiri dari 3 karakter.' };
    }
    if (password.length < 4) {
      return { success: false, message: 'Password minimal terdiri dari 4 karakter.' };
    }

    set({ isSyncing: true, syncError: null });

    try {
      const { data, error } = await supabase.rpc('register_player_cloud', {
        p_username: cleanUser,
        p_password: password,
        p_scores: get().quizBestScores as unknown as Json,
        p_ships: get().ownedShips,
        p_active_ship: get().activeShipId,
        p_checkpoint: get().checkpointPlanetId,
      });

      if (error) throw error;

      const res = data as {
        success: boolean;
        message?: string;
        player?: {
          player_id: string;
          username: string;
          saldo_poin: number;
          kepemilikan_pesawat: string[];
          pesawat_aktif: string;
          checkpoint_planet_id: string;
          skor_kuis: Record<string, number>;
        };
      };

      if (!res.success) {
        set({ isSyncing: false, syncError: res.message || 'Pendaftaran gagal.' });
        return { success: false, message: res.message || 'Pendaftaran akun gagal.' };
      }

      if (res.player) {
        set({
          cloudUsername: res.player.username,
          pointsBalance: res.player.saldo_poin,
          ownedShips: res.player.kepemilikan_pesawat,
          activeShipId: res.player.pesawat_aktif,
          checkpointPlanetId: res.player.checkpoint_planet_id,
          quizBestScores: res.player.skor_kuis || get().quizBestScores,
          userEmail: `@${res.player.username}`,
          isCloudSynced: true,
          isSyncing: false,
        });

        // Simpan username ke localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem(CLOUD_USERNAME_KEY, res.player.username);
        }

        saveGuestProgress({
          quizBestScores: res.player.skor_kuis || get().quizBestScores,
          pointsBalance: res.player.saldo_poin,
          ownedShips: res.player.kepemilikan_pesawat,
          activeShipId: res.player.pesawat_aktif,
          checkpointPlanetId: res.player.checkpoint_planet_id,
        });
      }

      return {
        success: true,
        message: res.message || 'Akun berhasil dibuat dan progres tersimpan di Cloud!',
      };
    } catch (err: unknown) {
      console.error('Error saat register_player_cloud:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal mendaftarkan akun cloud.';
      set({ isSyncing: false, syncError: errMsg });
      return { success: false, message: errMsg };
    }
  },

  loginAndSyncCloudAccount: async (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      return { success: false, message: 'Harap masukkan username dan password.' };
    }

    set({ isSyncing: true, syncError: null });

    try {
      const { data, error } = await supabase.rpc('login_and_merge_player_cloud', {
        p_username: cleanUser,
        p_password: password,
        p_local_scores: get().quizBestScores as unknown as Json,
        p_local_ships: get().ownedShips,
        p_active_ship: get().activeShipId,
        p_checkpoint: get().checkpointPlanetId,
      });

      if (error) throw error;

      const res = data as {
        success: boolean;
        message?: string;
        player?: {
          player_id: string;
          username: string;
          saldo_poin: number;
          kepemilikan_pesawat: string[];
          pesawat_aktif: string;
          checkpoint_planet_id: string;
          skor_kuis: Record<string, number>;
        };
      };

      if (!res.success) {
        set({ isSyncing: false, syncError: res.message || 'Login gagal.' });
        return { success: false, message: res.message || 'Username atau password tidak sesuai.' };
      }

      if (res.player) {
        set({
          cloudUsername: res.player.username,
          pointsBalance: res.player.saldo_poin,
          ownedShips: res.player.kepemilikan_pesawat,
          activeShipId: res.player.pesawat_aktif,
          checkpointPlanetId: res.player.checkpoint_planet_id,
          quizBestScores: res.player.skor_kuis || get().quizBestScores,
          userEmail: `@${res.player.username}`,
          isCloudSynced: true,
          isSyncing: false,
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(CLOUD_USERNAME_KEY, res.player.username);
        }

        saveGuestProgress({
          quizBestScores: res.player.skor_kuis || get().quizBestScores,
          pointsBalance: res.player.saldo_poin,
          ownedShips: res.player.kepemilikan_pesawat,
          activeShipId: res.player.pesawat_aktif,
          checkpointPlanetId: res.player.checkpoint_planet_id,
        });
      }

      return {
        success: true,
        message: res.message || 'Berhasil masuk dan menyinkronkan progres antariksa!',
      };
    } catch (err: unknown) {
      console.error('Error saat login_and_merge_player_cloud:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal masuk ke akun cloud.';
      set({ isSyncing: false, syncError: errMsg });
      return { success: false, message: errMsg };
    }
  },

  logoutCloudAccount: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLOUD_USERNAME_KEY);
    }
    set({
      cloudUsername: null,
      userEmail: null,
      isCloudSynced: false,
      syncError: null,
    });
  },

  syncCurrentToCloud: async () => {
    const username = get().cloudUsername;
    if (!username) return;

    try {
      // Perbarui data cloud di latar belakang
      await supabase
        .from('player_progress')
        .update({
          skor_kuis: get().quizBestScores as unknown as Json,
          saldo_poin: get().pointsBalance,
          kepemilikan_pesawat: get().ownedShips,
          pesawat_aktif: get().activeShipId,
          checkpoint_planet_id: get().checkpointPlanetId,
          updated_at: new Date().toISOString(),
        })
        .eq('username', username.toLowerCase());
    } catch (err) {
      console.warn('Latar belakang sync gagal:', err);
    }
  },

  // Backward-compatibility aliases
  syncCloudSave: async () => {
    if (get().cloudUsername) {
      await get().syncCurrentToCloud();
      return { success: true, message: 'Progres berhasil disinkronkan ke Cloud!' };
    }
    return { success: false, message: 'Anda berada di Mode Tamu. Tautkan username untuk simpan ke cloud.' };
  },

  loginWithGoogle: async () => {
    // Mode Username & Password Only - tidak membutuhkan Google OAuth
    return Promise.resolve();
  },

  logoutCloud: async () => {
    get().logoutCloudAccount();
    return Promise.resolve();
  },
}));

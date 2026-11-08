import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerStore } from './usePlayerStore';
import { supabase } from '@/lib/supabase/client';

describe('usePlayerStore (Mode Tamu, Kuis Delta Poin, & Hanggar Pesawat)', () => {
  beforeEach(() => {
    // Reset state ke kondisi awal
    usePlayerStore.setState({
      quizBestScores: {},
      pointsBalance: 0,
      ownedShips: ['astra-scout'],
      activeShipId: 'astra-scout',
      checkpointPlanetId: 'earth',
      cloudUsername: null,
      userEmail: null,
      isCloudSynced: false,
      isSyncing: false,
      syncError: null,
    });
  });

  it('memberikan poin hanya dari selisih (delta) peningkatan skor kuis bebas tekanan (PRD R10)', () => {
    // Percobaan pertama: skor 50 -> delta +50, saldo = 50
    const attempt1 = usePlayerStore.getState().submitQuizScore('earth', 50);
    expect(attempt1.delta).toBe(50);
    expect(attempt1.newTotal).toBe(50);
    expect(usePlayerStore.getState().pointsBalance).toBe(50);
    expect(usePlayerStore.getState().quizBestScores.earth).toBe(50);

    // Percobaan kedua: skor 40 (lebih rendah) -> delta 0, tidak ada pengurangan saldo atau penalti
    const attempt2 = usePlayerStore.getState().submitQuizScore('earth', 40);
    expect(attempt2.delta).toBe(0);
    expect(attempt2.newTotal).toBe(50);
    expect(usePlayerStore.getState().pointsBalance).toBe(50);
    expect(usePlayerStore.getState().quizBestScores.earth).toBe(50);

    // Percobaan ketiga: skor 80 (rekor baru) -> delta 80 - 50 = +30, saldo = 80
    const attempt3 = usePlayerStore.getState().submitQuizScore('earth', 80);
    expect(attempt3.delta).toBe(30);
    expect(attempt3.newTotal).toBe(80);
    expect(usePlayerStore.getState().pointsBalance).toBe(80);
    expect(usePlayerStore.getState().quizBestScores.earth).toBe(80);
  });

  it('mengelola pembelian dan pemilihan pesawat hanggar (PRD R11)', () => {
    // Saldo awal 0, mencoba membeli Orion Glider (harga 300) harus gagal
    const buyFail = usePlayerStore.getState().buyShip('orion-glider', 300);
    expect(buyFail).toBe(false);
    expect(usePlayerStore.getState().ownedShips).toEqual(['astra-scout']);

    // Berikan poin lewat kuis 500 poin
    usePlayerStore.setState({ pointsBalance: 500 });

    // Pembelian sukses
    const buySuccess = usePlayerStore.getState().buyShip('orion-glider', 300);
    expect(buySuccess).toBe(true);
    expect(usePlayerStore.getState().pointsBalance).toBe(200); // 500 - 300
    expect(usePlayerStore.getState().ownedShips).toContain('orion-glider');
    expect(usePlayerStore.getState().activeShipId).toBe('orion-glider'); // Otomatis dipasang

    // Memilih kembali ke Astra Scout
    const selectScout = usePlayerStore.getState().selectShip('astra-scout');
    expect(selectScout).toBe(true);
    expect(usePlayerStore.getState().activeShipId).toBe('astra-scout');

    // Memilih pesawat yang belum dimiliki harus gagal
    const selectUnowned = usePlayerStore.getState().selectShip('nova-voyager');
    expect(selectUnowned).toBe(false);
    expect(usePlayerStore.getState().activeShipId).toBe('astra-scout');
  });

  it('memperbarui planet checkpoint pemain (PRD R12)', () => {
    usePlayerStore.getState().setCheckpointPlanet('mars');
    expect(usePlayerStore.getState().checkpointPlanetId).toBe('mars');
  });

  it('memvalidasi pendaftaran cloud account dengan username & password minimal (PRD R12)', async () => {
    // Username terlalu pendek (< 3 karakter)
    const resShortUser = await usePlayerStore.getState().registerCloudAccount('ab', 'secret123');
    expect(resShortUser.success).toBe(false);
    expect(resShortUser.message).toContain('3 karakter');

    // Password terlalu pendek (< 4 karakter)
    const resShortPass = await usePlayerStore.getState().registerCloudAccount('bima', '12');
    expect(resShortPass.success).toBe(false);
    expect(resShortPass.message).toContain('4 karakter');
  });

  it('berhasil mendaftarkan cloud account via RPC register_player_cloud (PRD R12)', async () => {
    vi.spyOn(supabase, 'rpc').mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Akun penjelajah berhasil didaftarkan!',
        player: {
          player_id: '11111111-1111-1111-1111-111111111111',
          username: 'kapten_bima',
          saldo_poin: 150,
          kepemilikan_pesawat: ['astra-scout'],
          pesawat_aktif: 'astra-scout',
          checkpoint_planet_id: 'earth',
          skor_kuis: { earth: 150 },
        },
      },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.rpc>>);

    const res = await usePlayerStore.getState().registerCloudAccount('kapten_bima', 'astro123');
    expect(res.success).toBe(true);
    expect(usePlayerStore.getState().cloudUsername).toBe('kapten_bima');
    expect(usePlayerStore.getState().isCloudSynced).toBe(true);
    expect(usePlayerStore.getState().pointsBalance).toBe(150);

    // Logout cloud account
    usePlayerStore.getState().logoutCloudAccount();
    expect(usePlayerStore.getState().cloudUsername).toBeNull();
    expect(usePlayerStore.getState().isCloudSynced).toBe(false);
  });
});

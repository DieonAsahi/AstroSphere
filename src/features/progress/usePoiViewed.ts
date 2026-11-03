import { useEffect, useRef } from 'react';
import { useProgressStore } from './progressStore';

/**
 * Handler pelacakan titik minat yang telah dikunjungi siswa.
 * Melakukan upsert ke progressStore / user_progress agar tidak ganda.
 */
export function onPoiViewed(
  poiId: string,
  timeSpentSec = 5,
  userId?: string,
): void {
  useProgressStore.getState().recordPoiViewed(poiId, timeSpentSec, userId);
  console.info('[AstroSphere] POI viewed:', poiId);
}

/**
 * Hook pelacakan durasi waktu membaca panel POI.
 * Mencatat kunjungan setelah panel terbuka beberapa detik (ambang batas >= 3 detik),
 * serta mengakumulasikan total detik waktu yang dihabiskan siswa saat membaca.
 */
export function usePoiViewed(poiId: string | null | undefined): void {
  const startTimeRef = useRef<number>(0);
  const recordedInitialRef = useRef<boolean>(false);

  useEffect(() => {
    if (!poiId) return;

    startTimeRef.current = Date.now();
    recordedInitialRef.current = false;

    // Catat pembacaan awal setelah panel terbuka minimal 3 detik
    const initialTimer = window.setTimeout(() => {
      recordedInitialRef.current = true;
      onPoiViewed(poiId, 3);
    }, 3000);

    // Saat unmount (panel ditutup), hitung sisa durasi waktu baca yang dihabiskan
    return () => {
      window.clearTimeout(initialTimer);
      if (startTimeRef.current > 0) {
        const elapsedSec = Math.floor(
          (Date.now() - startTimeRef.current) / 1000,
        );
        // Jika pembacaan awal 3 detik sudah dicatat, akumulasikan sisa detiknya
        const additionalSec = recordedInitialRef.current
          ? Math.max(0, elapsedSec - 3)
          : elapsedSec >= 3
            ? elapsedSec
            : 0;

        if (additionalSec > 0) {
          onPoiViewed(poiId, additionalSec);
        }
      }
    };
  }, [poiId]);
}

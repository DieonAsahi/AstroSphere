import { create } from 'zustand';
import type { QualityLevel } from '../../lib/perf';
import type { KpiSummary, SessionMetric } from './types';
import { useAuthStore } from '../classes/authStore';
import { useQualityStore } from '../../state/qualityStore';

const METRICS_STORAGE_KEY = 'astrosphere_session_metrics';

// Data awal metrik sesi (mensimulasikan sesi siswa/guru di laptop sekolah)
export const INITIAL_SESSION_METRICS: SessionMetric[] = [
  {
    id: 'ses-demo-101',
    userId: 'user-siswa-demo-001',
    startedAt: '2026-10-31T08:30:00Z',
    durationSec: 640,
    poisOpened: 2,
    avgFps: 58.4,
    qualityTier: 'high',
    deviceClass: 'desktop',
    createdAt: '2026-10-31T08:40:40Z',
  },
  {
    id: 'ses-demo-102',
    userId: 'user-siswa-demo-004',
    startedAt: '2026-10-31T09:00:00Z',
    durationSec: 480,
    poisOpened: 1,
    avgFps: 46.2,
    qualityTier: 'mid',
    deviceClass: 'desktop',
    createdAt: '2026-10-31T09:08:00Z',
  },
  {
    id: 'ses-demo-103',
    userId: null, // Pengguna anonim / tamu
    startedAt: '2026-10-31T10:15:00Z',
    durationSec: 320,
    poisOpened: 2,
    avgFps: 34.8,
    qualityTier: 'low',
    deviceClass: 'laptop-sekolah',
    createdAt: '2026-10-31T10:20:20Z',
  },
  {
    id: 'ses-demo-104',
    userId: 'user-guru-demo-002',
    startedAt: '2026-10-31T11:00:00Z',
    durationSec: 1250,
    poisOpened: 2,
    avgFps: 56.1,
    qualityTier: 'high',
    deviceClass: 'desktop',
    createdAt: '2026-10-31T11:20:50Z',
  },
  {
    id: 'ses-demo-105',
    userId: null,
    startedAt: '2026-10-31T12:00:00Z',
    durationSec: 190,
    poisOpened: 1,
    avgFps: 28.5, // 1 sesi di bawah 30 FPS sebelum auto-decline
    qualityTier: 'low',
    deviceClass: 'laptop-lawas',
    createdAt: '2026-10-31T12:03:10Z',
  },
];

function loadStoredMetrics(): SessionMetric[] {
  if (typeof window === 'undefined') return INITIAL_SESSION_METRICS;
  try {
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_SESSION_METRICS;
  } catch {
    return INITIAL_SESSION_METRICS;
  }
}

function persistMetrics(metrics: SessionMetric[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
  }
}

/**
 * Kalkulasi murni metrik KPI target minimal 30 FPS (FR-12).
 */
export function calculateKpiSummary(metrics: SessionMetric[]): KpiSummary {
  const totalSessions = metrics.length;
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      targetFpsMetCount: 0,
      targetFpsPercentage: 0,
      overallAvgFps: 0,
      qualityDistribution: { high: 0, mid: 0, low: 0 },
      avgSessionDurationSec: 0,
    };
  }

  // Hitung jumlah sesi yang memenuhi target FPS >= 30
  const targetFpsMetCount = metrics.filter((m) => m.avgFps >= 30).length;
  const targetFpsPercentage = Math.round(
    (targetFpsMetCount / totalSessions) * 100,
  );

  // Rata-rata FPS global
  const totalFps = metrics.reduce((sum, m) => sum + m.avgFps, 0);
  const overallAvgFps = Math.round((totalFps / totalSessions) * 10) / 10;

  // Distribusi kualitas visual
  const qualityDistribution: Record<QualityLevel, number> = {
    high: 0,
    mid: 0,
    low: 0,
  };
  metrics.forEach((m) => {
    if (m.qualityTier in qualityDistribution) {
      qualityDistribution[m.qualityTier] += 1;
    }
  });

  // Rata-rata durasi sesi
  const totalDuration = metrics.reduce((sum, m) => sum + m.durationSec, 0);
  const avgSessionDurationSec = Math.round(totalDuration / totalSessions);

  return {
    totalSessions,
    targetFpsMetCount,
    targetFpsPercentage,
    overallAvgFps,
    qualityDistribution,
    avgSessionDurationSec,
  };
}

interface MetricsState {
  metrics: SessionMetric[];
  currentSessionStartedAt: number;
  distinctPoisOpened: Set<string>;
  fpsSamples: number[];

  recordPoiOpened: (poiId: string) => void;
  addFpsSample: (fps: number) => void;
  endSession: () => SessionMetric | null;
  getKpiSummary: () => KpiSummary;
}

export const useMetricsStore = create<MetricsState>((set, get) => ({
  metrics: loadStoredMetrics(),
  currentSessionStartedAt: Date.now(),
  distinctPoisOpened: new Set<string>(),
  fpsSamples: [],

  recordPoiOpened: (poiId) => {
    set((state) => {
      const next = new Set(state.distinctPoisOpened);
      next.add(poiId);
      return { distinctPoisOpened: next };
    });
  },

  addFpsSample: (fps) => {
    if (fps <= 0 || fps > 144) return;
    set((state) => ({
      fpsSamples: [...state.fpsSamples.slice(-100), fps],
    }));
  },

  endSession: () => {
    const { currentSessionStartedAt, distinctPoisOpened, fpsSamples, metrics } =
      get();
    const durationSec = Math.max(
      1,
      Math.floor((Date.now() - currentSessionStartedAt) / 1000),
    );

    // Hitung rata-rata FPS selama sesi berlangsung
    let avgFps = 60.0;
    if (fpsSamples.length > 0) {
      const sum = fpsSamples.reduce((a, b) => a + b, 0);
      avgFps = Math.round((sum / fpsSamples.length) * 10) / 10;
    }

    const user = useAuthStore.getState().user;
    const quality = useQualityStore.getState().quality;

    const newMetric: SessionMetric = {
      id: `ses-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user?.id ?? null,
      startedAt: new Date(currentSessionStartedAt).toISOString(),
      durationSec,
      poisOpened: distinctPoisOpened.size,
      avgFps,
      qualityTier: quality,
      deviceClass:
        typeof window !== 'undefined' && window.innerWidth < 768
          ? 'mobile'
          : 'desktop',
      createdAt: new Date().toISOString(),
    };

    const nextMetrics = [newMetric, ...metrics];
    persistMetrics(nextMetrics);

    // Reset sesi baru
    set({
      metrics: nextMetrics,
      currentSessionStartedAt: Date.now(),
      distinctPoisOpened: new Set<string>(),
      fpsSamples: [],
    });

    return newMetric;
  },

  getKpiSummary: () => {
    return calculateKpiSummary(get().metrics);
  },
}));

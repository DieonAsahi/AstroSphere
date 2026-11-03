import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminMetricsPage } from './AdminMetricsPage';
import {
  calculateKpiSummary,
  INITIAL_SESSION_METRICS,
  useMetricsStore,
} from './metricsStore';
import type { SessionMetric } from './types';

describe('Performance Metrics & Target 30 FPS KPI (FR-12)', () => {
  beforeEach(() => {
    localStorage.clear();
    useMetricsStore.setState({
      metrics: JSON.parse(JSON.stringify(INITIAL_SESSION_METRICS)),
      currentSessionStartedAt: Date.now(),
      distinctPoisOpened: new Set<string>(),
      fpsSamples: [],
    });
  });

  describe('1. Pure Calculation: calculateKpiSummary', () => {
    it('calculates percentage of sessions achieving >= 30 FPS, average FPS, and quality distribution', () => {
      const mockMetrics: SessionMetric[] = [
        {
          id: 's1',
          userId: 'u1',
          startedAt: '2026-10-31T08:00:00Z',
          durationSec: 600,
          poisOpened: 2,
          avgFps: 60.0,
          qualityTier: 'high',
          deviceClass: 'desktop',
          createdAt: '2026-10-31T08:10:00Z',
        },
        {
          id: 's2',
          userId: null,
          startedAt: '2026-10-31T08:15:00Z',
          durationSec: 300,
          poisOpened: 1,
          avgFps: 45.0,
          qualityTier: 'mid',
          deviceClass: 'desktop',
          createdAt: '2026-10-31T08:20:00Z',
        },
        {
          id: 's3',
          userId: 'u2',
          startedAt: '2026-10-31T08:30:00Z',
          durationSec: 400,
          poisOpened: 3,
          avgFps: 32.0,
          qualityTier: 'low',
          deviceClass: 'laptop-sekolah',
          createdAt: '2026-10-31T08:36:40Z',
        },
        {
          id: 's4',
          userId: null,
          startedAt: '2026-10-31T09:00:00Z',
          durationSec: 200,
          poisOpened: 1,
          avgFps: 25.0, // di bawah 30 FPS
          qualityTier: 'low',
          deviceClass: 'laptop-lawas',
          createdAt: '2026-10-31T09:03:20Z',
        },
      ];

      const summary = calculateKpiSummary(mockMetrics);

      expect(summary.totalSessions).toBe(4);
      // 3 dari 4 sesi mencapai target minimal 30 FPS = 75%
      expect(summary.targetFpsMetCount).toBe(3);
      expect(summary.targetFpsPercentage).toBe(75);

      // Rata-rata FPS global: (60 + 45 + 32 + 25) / 4 = 162 / 4 = 40.5 FPS
      expect(summary.overallAvgFps).toBe(40.5);

      // Distribusi kualitas
      expect(summary.qualityDistribution.high).toBe(1);
      expect(summary.qualityDistribution.mid).toBe(1);
      expect(summary.qualityDistribution.low).toBe(2);

      // Rata-rata durasi: (600 + 300 + 400 + 200) / 4 = 1500 / 4 = 375 detik
      expect(summary.avgSessionDurationSec).toBe(375);
    });

    it('handles empty metrics list gracefully without division by zero or NaN', () => {
      const summary = calculateKpiSummary([]);

      expect(summary.totalSessions).toBe(0);
      expect(summary.targetFpsMetCount).toBe(0);
      expect(summary.targetFpsPercentage).toBe(0);
      expect(summary.overallAvgFps).toBe(0);
      expect(summary.qualityDistribution.high).toBe(0);
      expect(summary.qualityDistribution.mid).toBe(0);
      expect(summary.qualityDistribution.low).toBe(0);
      expect(summary.avgSessionDurationSec).toBe(0);
    });
  });

  describe('2. Store: useMetricsStore & Privacy Compliance (UU PDP)', () => {
    it('records distinct POIs opened and filters invalid FPS samples', () => {
      const store = useMetricsStore.getState();

      // Rekam beberapa POI
      store.recordPoiOpened('mars-olympus-mons');
      store.recordPoiOpened('mars-olympus-mons'); // duplikat, tidak boleh menambah distinct size
      store.recordPoiOpened('jupiter-great-red-spot');

      expect(useMetricsStore.getState().distinctPoisOpened.size).toBe(2);

      // Rekam sampel FPS
      store.addFpsSample(59.2);
      store.addFpsSample(60.1);
      store.addFpsSample(-5); // diabaikan karena <= 0
      store.addFpsSample(250); // diabaikan karena > 144

      const samples = useMetricsStore.getState().fpsSamples;
      expect(samples).toHaveLength(2);
      expect(samples).toEqual([59.2, 60.1]);
    });

    it('ends session, calculates session averages, and ensures strict UU PDP privacy compliance', () => {
      const store = useMetricsStore.getState();

      store.recordPoiOpened('mars-olympus-mons');
      store.addFpsSample(55.0);
      store.addFpsSample(65.0);

      const metric = store.endSession();
      expect(metric).not.toBeNull();
      if (!metric) return;

      expect(metric.poisOpened).toBe(1);
      expect(metric.avgFps).toBe(60.0);
      expect(metric.durationSec).toBeGreaterThanOrEqual(1);

      // Jaminan Kepatuhan UU PDP No. 27/2022:
      // Hanya menyimpan metrik teknis kinerja (FPS, durasi, tingkat kualitas),
      // dilarang menyimpan alamat IP, fingerprint pelacak, atau data biometrik/lokasi presisi
      const metricKeys = Object.keys(metric);
      expect(metricKeys).not.toContain('ip');
      expect(metricKeys).not.toContain('ip_address');
      expect(metricKeys).not.toContain('mac_address');
      expect(metricKeys).not.toContain('fingerprint');
      expect(metricKeys).not.toContain('location');

      // State sesi di-reset untuk sesi berikutnya
      expect(useMetricsStore.getState().distinctPoisOpened.size).toBe(0);
      expect(useMetricsStore.getState().fpsSamples).toHaveLength(0);
    });
  });

  describe('3. UI: AdminMetricsPage & Accessibility Audit', () => {
    it('renders AdminMetricsPage with KPI card, quality distribution, and PDP privacy notice', () => {
      render(
        <MemoryRouter>
          <AdminMetricsPage />
        </MemoryRouter>,
      );

      // Judul dan kartu hero KPI target minimal 30 FPS
      expect(
        screen.getByText('Metrik Performa & KPI Sistem'),
      ).toBeInTheDocument();
      expect(screen.getByText(/Target Minimal 30 FPS/i)).toBeInTheDocument();
      expect(screen.getByText(/sesi memenuhi FPS ≥ 30/i)).toBeInTheDocument();

      // Distribusi kualitas
      expect(
        screen.getByText(/Distribusi Kualitas Visual/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Kualitas Tinggi/i)).toBeInTheDocument();
      expect(screen.getByText(/Kualitas Rendah/i)).toBeInTheDocument();

      // Jaminan privasi UU PDP
      expect(
        screen.getByText(/Privasi Terjamin \(UU PDP\)/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Transparansi Pelacakan Teknis'),
      ).toBeInTheDocument();
    });

    it('passes axe accessibility audit with zero violations on AdminMetricsPage', async () => {
      const { container } = render(
        <MemoryRouter>
          <AdminMetricsPage />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});

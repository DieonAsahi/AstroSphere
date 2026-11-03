import type { QualityLevel } from '../../lib/perf';

export interface SessionMetric {
  id: string;
  userId: string | null;
  startedAt: string;
  durationSec: number;
  poisOpened: number;
  avgFps: number;
  qualityTier: QualityLevel;
  deviceClass: string;
  createdAt: string;
}

export interface KpiSummary {
  totalSessions: number;
  targetFpsMetCount: number;
  targetFpsPercentage: number;
  overallAvgFps: number;
  qualityDistribution: Record<QualityLevel, number>;
  avgSessionDurationSec: number;
}

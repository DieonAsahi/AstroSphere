import { create } from 'zustand';
import type { QualityLevel } from '../lib/perf';
import { id } from '../lib/i18n/id';

export interface QualityParams {
  textureResolution: 'high' | 'mid' | 'low';
  sphereSegments: number;
  particleCount: number;
  maxDpr: number;
  bloom: boolean;
  starCount: number;
  shadows: boolean;
}

export function getQualityParams(level: QualityLevel): QualityParams {
  switch (level) {
    case 'high':
      return {
        textureResolution: 'high',
        sphereSegments: 64,
        particleCount: 40000,
        maxDpr: 1.5,
        bloom: true,
        starCount: 6000,
        shadows: true,
      };
    case 'mid':
      return {
        textureResolution: 'mid',
        sphereSegments: 40,
        particleCount: 15000,
        maxDpr: 1.25,
        bloom: false,
        starCount: 3000,
        shadows: false,
      };
    case 'low':
      return {
        textureResolution: 'low',
        sphereSegments: 24,
        particleCount: 4000,
        maxDpr: 1.0,
        bloom: false,
        starCount: 1000,
        shadows: false,
      };
  }
}

interface QualityState {
  quality: QualityLevel;
  reducedMotion: boolean;
  highContrast: boolean;
  previousQuality: QualityLevel | null;
  autoDeclineToast: string | null;
  setQuality: (quality: QualityLevel) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
  setHighContrast: (highContrast: boolean) => void;
  triggerAutoDecline: () => void;
  undoQualityDecline: () => void;
  dismissToast: () => void;
}

function loadInitialQuality(): QualityLevel {
  if (typeof window === 'undefined') return 'mid';
  const saved = localStorage.getItem('astrosphere_quality');
  if (saved === 'high' || saved === 'mid' || saved === 'low') return saved;
  return 'mid';
}

function loadInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('astrosphere_reduced_motion');
  if (saved !== null) return saved === 'true';
  return Boolean(
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

function loadInitialHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('astrosphere_high_contrast') === 'true';
}

export const useQualityStore = create<QualityState>((set, get) => ({
  quality: loadInitialQuality(),
  reducedMotion: loadInitialReducedMotion(),
  highContrast: loadInitialHighContrast(),
  previousQuality: null,
  autoDeclineToast: null,

  setQuality: (quality) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('astrosphere_quality', quality);
    }
    set({ quality });
  },

  setReducedMotion: (reducedMotion) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'astrosphere_reduced_motion',
        reducedMotion ? 'true' : 'false',
      );
      document.documentElement.setAttribute(
        'data-reduced-motion',
        reducedMotion ? 'true' : 'false',
      );
    }
    set({ reducedMotion });
  },

  setHighContrast: (highContrast) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'astrosphere_high_contrast',
        highContrast ? 'true' : 'false',
      );
      document.documentElement.setAttribute(
        'data-high-contrast',
        highContrast ? 'true' : 'false',
      );
    }
    set({ highContrast });
  },

  triggerAutoDecline: () => {
    const current = get().quality;
    if (current === 'low') return; // Sudah di kualitas terendah

    const nextTier: QualityLevel = current === 'high' ? 'mid' : 'low';
    const qualityLabels: Record<QualityLevel, string> = {
      high: id.qualityHigh,
      mid: id.qualityMid,
      low: id.qualityLow,
    };

    const message = id.performance.autoDeclineToast(
      qualityLabels[current],
      qualityLabels[nextTier],
    );

    if (typeof window !== 'undefined') {
      localStorage.setItem('astrosphere_quality', nextTier);
    }

    set({
      previousQuality: current,
      quality: nextTier,
      autoDeclineToast: message,
    });
  },

  undoQualityDecline: () => {
    const prev = get().previousQuality;
    if (prev) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('astrosphere_quality', prev);
      }
      set({ quality: prev, previousQuality: null, autoDeclineToast: null });
    }
  },

  dismissToast: () => set({ autoDeclineToast: null }),
}));

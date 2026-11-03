export type QualityLevel = 'low' | 'mid' | 'high';

export function detectQualityLevel(): QualityLevel {
  if (typeof navigator === 'undefined') return 'mid';

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 4 || memory <= 4) return 'low';
  if (cores >= 8 && memory >= 8) return 'high';
  return 'mid';
}

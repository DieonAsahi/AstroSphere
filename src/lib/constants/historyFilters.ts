/**
 * Konstanta Baku Filter 2 Tingkat Sejarah & POI Bumi (Dataset Master v3):
 * Tingkat 1 = 6 Zaman Baku
 * Tingkat 2 = Sub-filter rentang 1 abad khusus untuk 'Zaman Modern (1500 – Sekarang)'
 */

export const MODERN_ERA_LABEL = 'Zaman Modern (1500 – Sekarang)' as const;

export const EARTH_ERA_OPTIONS = [
  'Zaman Awal Bumi & Purba',
  'Zaman Dinosaurus & Kapur',
  'Zaman Manusia Purba & Batu',
  'Zaman Peradaban Kuno & Kenabian',
  'Zaman Pertengahan & Nusantara',
  MODERN_ERA_LABEL,
] as const;

export type EarthEraLabel = (typeof EARTH_ERA_OPTIONS)[number];

export const MODERN_CENTURY_OPTIONS = [
  { id: '1500 - 1599', label: '1500 - 1599', minYear: 1500, maxYear: 1599 },
  { id: '1600 - 1699', label: '1600 - 1699', minYear: 1600, maxYear: 1699 },
  { id: '1700 - 1799', label: '1700 - 1799', minYear: 1700, maxYear: 1799 },
  { id: '1800 - 1899', label: '1800 - 1899', minYear: 1800, maxYear: 1899 },
  { id: '1900 - 1999', label: '1900 - 1999', minYear: 1900, maxYear: 1999 },
  { id: '2000 - Sekarang', label: '2000 - Sekarang', minYear: 2000, maxYear: Number.POSITIVE_INFINITY },
] as const;

export type ModernCenturyKey = (typeof MODERN_CENTURY_OPTIONS)[number]['id'];

export function matchesModernCenturyFilter(year: number, centuryKey: string): boolean {
  if (!centuryKey || centuryKey === 'ALL') return true;
  const match = MODERN_CENTURY_OPTIONS.find((opt) => opt.id === centuryKey);
  if (!match) return true;
  return year >= match.minYear && year <= match.maxYear;
}


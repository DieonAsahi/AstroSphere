import { describe, expect, it } from 'vitest';
import {
  FALLBACK_PLANETS,
  FALLBACK_HISTORY_EVENTS,
  FALLBACK_PHENOMENA,
  FALLBACK_QUESTIONS,
} from './fallbackMasterData';
import {
  EARTH_ERA_OPTIONS,
  MODERN_ERA_LABEL,
  MODERN_CENTURY_OPTIONS,
  matchesModernCenturyFilter,
} from '@/lib/constants/historyFilters';

describe('Master Fallback Dataset v3 Integrity (List -> Detail)', () => {
  it('contains all 8 planets with opening greetings and detailed materials', () => {
    const slugs = Object.keys(FALLBACK_PLANETS);
    expect(slugs).toEqual([
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ]);

    for (const slug of slugs) {
      const planet = FALLBACK_PLANETS[slug];
      expect(planet.ringkasan_cepat).toContain('Selamat datang di');
      expect(planet.deskripsi_materi.length).toBeGreaterThan(80);
      expect(planet.is_active).toBe(true);
    }
  });

  it('contains 108 history events v3 (28 for 7 other planets + 80 for Earth) with ringkasan_singkat and 2-tier filters', () => {
    const earthEvents = FALLBACK_HISTORY_EVENTS.earth ?? [];
    expect(earthEvents).toHaveLength(80);

    const otherPlanetsCount = [
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
    ].reduce((sum, pid) => sum + (FALLBACK_HISTORY_EVENTS[pid]?.length ?? 0), 0);
    expect(otherPlanetsCount).toBe(28);

    const allowedEarthEras = new Set<string>(EARTH_ERA_OPTIONS);
    for (const ev of earthEvents) {
      expect(allowedEarthEras.has(ev.era_label ?? '')).toBe(true);
      if (ev.era_label === MODERN_ERA_LABEL) {
        const matchedAnyCentury = MODERN_CENTURY_OPTIONS.some((c) =>
          matchesModernCenturyFilter(ev.tahun_kejadian, c.id)
        );
        expect(matchedAnyCentury).toBe(true);
      }
    }

    for (const list of Object.values(FALLBACK_HISTORY_EVENTS)) {
      for (const ev of list) {
        expect(ev.era_label?.trim().length).toBeGreaterThan(0);
        expect(ev.ringkasan_singkat?.trim().length).toBeGreaterThan(10);
        expect(ev.gambar_url?.trim().length).toBeGreaterThan(0);
        expect(ev.judul.trim().length).toBeGreaterThan(0);
        expect(ev.deskripsi.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('contains 8 active phenomena scenarios with valid visual config and steps', () => {
    expect(FALLBACK_PHENOMENA).toHaveLength(8);
    for (const phenom of FALLBACK_PHENOMENA) {
      expect(phenom.is_active).toBe(true);
      expect(phenom.tombol_aksi_label?.trim().length).toBeGreaterThan(0);
      expect(phenom.konfigurasi_visual.educationalSteps?.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('contains 32 quiz questions (4 per planet) totaling 1,600 points', () => {
    const allQuestions = Object.values(FALLBACK_QUESTIONS).flat();
    expect(allQuestions).toHaveLength(32);

    const totalPoints = allQuestions.reduce((sum, q) => sum + q.bobot_poin, 0);
    expect(totalPoints).toBe(1600);

    for (const pid of Object.keys(FALLBACK_PLANETS)) {
      const planetQuestions = FALLBACK_QUESTIONS[pid] ?? [];
      expect(planetQuestions).toHaveLength(4);
      for (const q of planetQuestions) {
        expect(q.opsi).toHaveLength(4);
        expect(q.kunci_jawaban).toBeGreaterThanOrEqual(0);
        expect(q.kunci_jawaban).toBeLessThanOrEqual(3);
      }
    }
  });
});

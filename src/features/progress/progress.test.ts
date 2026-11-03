import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateClassProgress,
  useProgressStore,
  INITIAL_PROGRESS,
} from './progressStore';
import type { ClassMember } from '../classes/types';
import type { PointOfInterest } from '../../data/types';
import type { QuizAttempt } from '../quiz/types';
import type { UserProgress } from './types';

const mockClassMembers: ClassMember[] = [
  {
    classId: 'class-test-01',
    studentId: 'student-budi',
    studentName: 'Budi Prakoso',
    studentSchool: 'SMPN 1 Merauke',
    joinedAt: '2026-10-31T08:00:00Z',
  },
  {
    classId: 'class-test-01',
    studentId: 'student-siti',
    studentName: 'Siti Rahma',
    studentSchool: 'SMPN 1 Merauke',
    joinedAt: '2026-10-31T08:15:00Z',
  },
  {
    classId: 'class-test-01',
    studentId: 'student-andi',
    studentName: 'Andi Pratama',
    studentSchool: 'SMPN 1 Merauke',
    joinedAt: '2026-10-31T08:30:00Z',
  },
];

const mockPois: PointOfInterest[] = [
  {
    id: 'mars-olympus-mons',
    bodyId: 'mars',
    slug: 'olympus-mons',
    name: 'Olympus Mons',
    type: 'gunung',
    lat: 18.65,
    lon: 226.2,
    historyText: 'Gunung berapi perisai terbesar di Tata Surya.',
    dimensions: [],
    sources: [],
  },
  {
    id: 'jupiter-great-red-spot',
    bodyId: 'jupiter',
    slug: 'badai-merah-raksasa',
    name: 'Badai Merah Raksasa',
    type: 'badai',
    lat: -22,
    lon: 270,
    historyText: 'Antisiklon raksasa bertekanan tinggi di atmosfer Jupiter.',
    dimensions: [],
    sources: [],
  },
  {
    id: 'moon-tycho-crater',
    bodyId: 'moon',
    slug: 'kawah-tycho',
    name: 'Kawah Tycho',
    type: 'kawah',
    lat: -43.3,
    lon: 11.2,
    historyText: 'Kawah tumbukan muda di Bulan dengan sistem sinar menonjol.',
    dimensions: [],
    sources: [],
  },
];

describe('Progress Feature & Class Progress Summary Calculations (FR-09)', () => {
  beforeEach(() => {
    localStorage.clear();
    useProgressStore.setState({
      progress: JSON.parse(JSON.stringify(INITIAL_PROGRESS)),
    });
  });

  describe('1. Pure calculation: calculateClassProgress', () => {
    it('calculates most and least viewed POIs, average time, and student breakdown correctly', () => {
      const mockProgress: UserProgress[] = [
        // Budi visited Olympus Mons (60s) and Great Red Spot (90s)
        {
          id: 'p1',
          userId: 'student-budi',
          poiId: 'mars-olympus-mons',
          viewedAt: '2026-10-31T09:00:00Z',
          timeSpentSec: 60,
        },
        {
          id: 'p2',
          userId: 'student-budi',
          poiId: 'jupiter-great-red-spot',
          viewedAt: '2026-10-31T09:10:00Z',
          timeSpentSec: 90,
        },
        // Siti visited Olympus Mons (40s) only
        {
          id: 'p3',
          userId: 'student-siti',
          poiId: 'mars-olympus-mons',
          viewedAt: '2026-10-31T09:20:00Z',
          timeSpentSec: 40,
        },
        // Andi hasn't visited any POI yet
      ];

      const mockQuizAttempts: QuizAttempt[] = [
        {
          id: 'qa1',
          quizId: 'quiz-olympus',
          poiId: 'mars-olympus-mons',
          userId: 'student-budi',
          score: 3,
          maxScore: 3, // 100%
          answers: {},
          completedAt: '2026-10-31T09:15:00Z',
        },
        {
          id: 'qa2',
          quizId: 'quiz-olympus',
          poiId: 'mars-olympus-mons',
          userId: 'student-siti',
          score: 2,
          maxScore: 3, // 66.7%
          answers: {},
          completedAt: '2026-10-31T09:25:00Z',
        },
      ];

      const summary = calculateClassProgress(
        'class-test-01',
        mockClassMembers,
        mockPois,
        mockProgress,
        mockQuizAttempts,
      );

      expect(summary.totalStudents).toBe(3);
      expect(summary.activeStudentsCount).toBe(2);

      // Olympus Mons dibuka 2 kali, Great Red Spot 1 kali, Tycho 0 kali
      expect(summary.mostViewedPoi).not.toBeNull();
      expect(summary.mostViewedPoi?.poiId).toBe('mars-olympus-mons');
      expect(summary.mostViewedPoi?.count).toBe(2);

      expect(summary.leastViewedPoi).not.toBeNull();
      expect(summary.leastViewedPoi?.poiId).toBe('moon-tycho-crater');
      expect(summary.leastViewedPoi?.count).toBe(0);

      // Total waktu: 60 + 90 + 40 = 190 detik / 3 catatan = ~63 detik
      expect(summary.averageTimeSpentSec).toBe(63);

      // Rata-rata kuis kelas: (100% + 66.67%) / 2 = 83.33% -> 83%
      expect(summary.averageQuizScore).toBe(83);

      // Breakdown per siswa
      const budi = summary.studentSummaries.find(
        (s) => s.studentId === 'student-budi',
      )!;
      expect(budi.visitedPoisCount).toBe(2);
      expect(budi.totalTimeSpentSec).toBe(150);
      expect(budi.averageQuizScore).toBe(100);

      const andi = summary.studentSummaries.find(
        (s) => s.studentId === 'student-andi',
      )!;
      expect(andi.visitedPoisCount).toBe(0);
      expect(andi.totalTimeSpentSec).toBe(0);
      expect(andi.averageQuizScore).toBeNull();
    });

    it('handles empty progress gracefully without crashing or NaN', () => {
      const summary = calculateClassProgress(
        'class-test-01',
        mockClassMembers,
        mockPois,
        [],
        [],
      );

      expect(summary.totalStudents).toBe(3);
      expect(summary.activeStudentsCount).toBe(0);
      expect(summary.mostViewedPoi).toBeNull();
      expect(summary.averageTimeSpentSec).toBe(0);
      expect(summary.averageQuizScore).toBeNull();
      expect(summary.studentSummaries).toHaveLength(3);
    });
  });

  describe('2. Upsert logic for user_progress', () => {
    it('creates a new record when user visits a POI for the first time', () => {
      const store = useProgressStore.getState();
      const initialCount = store.progress.length;

      const record = store.recordPoiViewed(
        'moon-tycho-crater',
        25,
        'student-budi',
      );
      expect(record.poiId).toBe('moon-tycho-crater');
      expect(record.timeSpentSec).toBe(25);
      expect(useProgressStore.getState().progress.length).toBe(
        initialCount + 1,
      );
      expect(store.isPoiVisited('moon-tycho-crater', 'student-budi')).toBe(
        true,
      );
    });

    it('upserts and accumulates timeSpentSec without duplicating rows on subsequent visits', () => {
      const store = useProgressStore.getState();

      // Kunjungan 1: 30 detik
      store.recordPoiViewed('mars-olympus-mons', 30, 'student-andi');
      const countAfterFirst = useProgressStore.getState().progress.length;
      expect(store.getPoiTimeSpent('mars-olympus-mons', 'student-andi')).toBe(
        30,
      );

      // Kunjungan 2: 45 detik lagi
      store.recordPoiViewed('mars-olympus-mons', 45, 'student-andi');
      const countAfterSecond = useProgressStore.getState().progress.length;

      // Jumlah baris tidak bertambah (tidak duplikat)
      expect(countAfterSecond).toBe(countAfterFirst);

      // Durasi waktu baca terakumulasi: 30 + 45 = 75 detik
      expect(store.getPoiTimeSpent('mars-olympus-mons', 'student-andi')).toBe(
        75,
      );
    });
  });
});

import { create } from 'zustand';
import type { ClassMember } from '../classes/types';
import type { PointOfInterest } from '../../data/types';
import type { QuizAttempt } from '../quiz/types';
import type {
  ClassProgressSummary,
  StudentProgressSummary,
  UserProgress,
} from './types';
import { useAuthStore } from '../classes/authStore';

const PROGRESS_STORAGE_KEY = 'astrosphere_user_progress';

// Data awal progres eksplorasi untuk siswa demonstrasi
export const INITIAL_PROGRESS: UserProgress[] = [
  {
    id: 'prog-demo-001',
    userId: 'user-siswa-demo-001', // Budi Prakoso (Kelas 7A & 8B)
    poiId: 'mars-olympus-mons',
    viewedAt: '2026-10-31T08:45:00Z',
    timeSpentSec: 65,
  },
  {
    id: 'prog-demo-002',
    userId: 'user-siswa-demo-001',
    poiId: 'jupiter-great-red-spot',
    viewedAt: '2026-10-31T09:10:00Z',
    timeSpentSec: 85,
  },
  {
    id: 'prog-demo-003',
    userId: 'user-siswa-demo-004', // Siti Rahma (Kelas 7A)
    poiId: 'mars-olympus-mons',
    viewedAt: '2026-10-31T09:20:00Z',
    timeSpentSec: 42,
  },
];

function loadStoredProgress(): UserProgress[] {
  if (typeof window === 'undefined') return INITIAL_PROGRESS;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_PROGRESS;
  } catch {
    return INITIAL_PROGRESS;
  }
}

function persistProgress(items: UserProgress[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(items));
  }
}

/**
 * Fungsi kalkulasi murni ringkasan progres kelas guru (FR-09).
 * Dirancang objektif dan suportif pedagogis tanpa membandingkan siswa secara mencolok.
 */
export function calculateClassProgress(
  classId: string,
  classMembers: ClassMember[],
  allPois: PointOfInterest[],
  allProgress: UserProgress[],
  allQuizAttempts: QuizAttempt[] = [],
): ClassProgressSummary {
  const studentIds = new Set(classMembers.map((m) => m.studentId));
  const relevantProgress = allProgress.filter((p) => studentIds.has(p.userId));
  const totalPoisCount = allPois.length;

  // 1. Kalkulasi progres per siswa
  const studentSummaries: StudentProgressSummary[] = classMembers.map(
    (member) => {
      const memberProgress = relevantProgress.filter(
        (p) => p.userId === member.studentId,
      );
      const visitedPoiIds = new Set(memberProgress.map((p) => p.poiId));
      const totalTime = memberProgress.reduce(
        (sum, p) => sum + (p.timeSpentSec || 0),
        0,
      );

      let lastActive: string | null = null;
      memberProgress.forEach((p) => {
        if (!lastActive || new Date(p.viewedAt) > new Date(lastActive)) {
          lastActive = p.viewedAt;
        }
      });

      // Rata-rata kuis siswa
      const memberAttempts = allQuizAttempts.filter(
        (a) => a.userId === member.studentId,
      );
      let avgQuiz: number | null = null;
      if (memberAttempts.length > 0) {
        const sumPct = memberAttempts.reduce(
          (sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0),
          0,
        );
        avgQuiz = Math.round(sumPct / memberAttempts.length);
      }

      return {
        studentId: member.studentId,
        studentName: member.studentName,
        studentSchool: member.studentSchool,
        visitedPoisCount: visitedPoiIds.size,
        totalPoisCount,
        totalTimeSpentSec: totalTime,
        lastActiveAt: lastActive,
        averageQuizScore: avgQuiz,
      };
    },
  );

  const activeStudents = studentSummaries.filter((s) => s.visitedPoisCount > 0);

  // 2. Kalkulasi POI paling banyak dan paling sedikit dibuka
  const poiStats = new Map<string, { count: number; totalTime: number }>();
  allPois.forEach((poi) => {
    poiStats.set(poi.id, { count: 0, totalTime: 0 });
  });

  relevantProgress.forEach((prog) => {
    const stat = poiStats.get(prog.poiId);
    if (stat) {
      stat.count += 1;
      stat.totalTime += prog.timeSpentSec || 0;
    }
  });

  let mostViewed: { poiId: string; poiName: string; count: number } | null =
    null;
  let leastViewed: { poiId: string; poiName: string; count: number } | null =
    null;

  for (const poi of allPois) {
    const stat = poiStats.get(poi.id) ?? { count: 0, totalTime: 0 };
    if (!mostViewed || stat.count > mostViewed.count) {
      mostViewed = { poiId: poi.id, poiName: poi.name, count: stat.count };
    }
    if (!leastViewed || stat.count < leastViewed.count) {
      leastViewed = { poiId: poi.id, poiName: poi.name, count: stat.count };
    }
  }

  // Jika belum ada aktivitas sama sekali (semua 0 kunjungan)
  if (mostViewed && (mostViewed as { count: number }).count === 0) {
    mostViewed = null;
    leastViewed = null;
  }

  // 3. Rata-rata waktu per eksplorasi
  const totalExplorationTime = relevantProgress.reduce(
    (sum, p) => sum + (p.timeSpentSec || 0),
    0,
  );
  const averageTimeSpentSec =
    relevantProgress.length > 0
      ? Math.round(totalExplorationTime / relevantProgress.length)
      : 0;

  // 4. Rata-rata skor kuis kelas
  const relevantAttempts = allQuizAttempts.filter((a) =>
    studentIds.has(a.userId),
  );
  let averageQuizScore: number | null = null;
  if (relevantAttempts.length > 0) {
    const sumPct = relevantAttempts.reduce(
      (sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0),
      0,
    );
    averageQuizScore = Math.round(sumPct / relevantAttempts.length);
  }

  return {
    classId,
    totalStudents: classMembers.length,
    activeStudentsCount: activeStudents.length,
    mostViewedPoi: mostViewed,
    leastViewedPoi: leastViewed,
    averageTimeSpentSec,
    averageQuizScore,
    studentSummaries,
  };
}

interface ProgressState {
  progress: UserProgress[];
  recordPoiViewed: (
    poiId: string,
    timeSpentSec?: number,
    customUserId?: string,
  ) => UserProgress;
  getUserProgress: (userId?: string) => UserProgress[];
  isPoiVisited: (poiId: string, userId?: string) => boolean;
  getPoiTimeSpent: (poiId: string, userId?: string) => number;
  getClassProgressSummary: (
    classId: string,
    classMembers: ClassMember[],
    allPois: PointOfInterest[],
    allQuizAttempts?: QuizAttempt[],
  ) => ClassProgressSummary;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progress: loadStoredProgress(),

  recordPoiViewed: (poiId, timeSpentSec = 5, customUserId) => {
    const currentUserId =
      customUserId || useAuthStore.getState().user?.id || 'guest-user';
    const now = new Date().toISOString();
    const duration = Math.max(1, Math.round(timeSpentSec));

    const existingIndex = get().progress.findIndex(
      (p) => p.userId === currentUserId && p.poiId === poiId,
    );

    let nextProgress: UserProgress[];
    let recordedItem: UserProgress;

    if (existingIndex >= 0) {
      // UPSERT: Perbarui waktu kunjungan terakhir dan akumulasikan durasi eksplorasi
      const existing = get().progress[existingIndex];
      recordedItem = {
        ...existing,
        viewedAt: now,
        timeSpentSec: existing.timeSpentSec + duration,
      };
      nextProgress = [...get().progress];
      nextProgress[existingIndex] = recordedItem;
    } else {
      // Insert baru jika belum pernah dikunjungi
      recordedItem = {
        id: `prog-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUserId,
        poiId,
        viewedAt: now,
        timeSpentSec: duration,
      };
      nextProgress = [recordedItem, ...get().progress];
    }

    persistProgress(nextProgress);
    set({ progress: nextProgress });
    return recordedItem;
  },

  getUserProgress: (userId) => {
    const targetUserId =
      userId || useAuthStore.getState().user?.id || 'guest-user';
    return get().progress.filter((p) => p.userId === targetUserId);
  },

  isPoiVisited: (poiId, userId) => {
    const targetUserId =
      userId || useAuthStore.getState().user?.id || 'guest-user';
    return get().progress.some(
      (p) => p.userId === targetUserId && p.poiId === poiId,
    );
  },

  getPoiTimeSpent: (poiId, userId) => {
    const targetUserId =
      userId || useAuthStore.getState().user?.id || 'guest-user';
    const item = get().progress.find(
      (p) => p.userId === targetUserId && p.poiId === poiId,
    );
    return item?.timeSpentSec || 0;
  },

  getClassProgressSummary: (
    classId,
    classMembers,
    allPois,
    allQuizAttempts = [],
  ) => {
    return calculateClassProgress(
      classId,
      classMembers,
      allPois,
      get().progress,
      allQuizAttempts,
    );
  },
}));

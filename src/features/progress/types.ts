export interface UserProgress {
  id: string;
  userId: string;
  poiId: string;
  viewedAt: string;
  timeSpentSec: number;
}

export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  studentSchool?: string;
  visitedPoisCount: number;
  totalPoisCount: number;
  totalTimeSpentSec: number;
  lastActiveAt: string | null;
  averageQuizScore: number | null;
}

export interface ClassProgressSummary {
  classId: string;
  totalStudents: number;
  activeStudentsCount: number;
  mostViewedPoi: { poiId: string; poiName: string; count: number } | null;
  leastViewedPoi: { poiId: string; poiName: string; count: number } | null;
  averageTimeSpentSec: number;
  averageQuizScore: number | null;
  studentSummaries: StudentProgressSummary[];
}

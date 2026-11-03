import { useEffect, useMemo, useState } from 'react';
import type { ClassItem, ClassMember } from '../classes/types';
import type { PointOfInterest } from '../../data/types';
import { poiRepository } from '../../data/repository/poiRepository';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useProgressStore, calculateClassProgress } from './progressStore';
import { useQuizStore } from '../quiz/quizStore';

interface ClassProgressDashboardProps {
  classItem: ClassItem;
  classMembers: ClassMember[];
}

export function ClassProgressDashboard({
  classItem,
  classMembers,
}: ClassProgressDashboardProps) {
  const [allPois, setAllPois] = useState<PointOfInterest[]>([]);

  const allProgress = useProgressStore((state) => state.progress);
  const allQuizAttempts = useQuizStore((state) => state.attempts);

  useEffect(() => {
    void poiRepository.listPois().then(setAllPois);
  }, []);

  const summary = useMemo(() => {
    return calculateClassProgress(
      classItem.id,
      classMembers,
      allPois,
      allProgress,
      allQuizAttempts,
    );
  }, [classItem.id, classMembers, allPois, allProgress, allQuizAttempts]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0 dtk';
    if (seconds < 60) return `${seconds} dtk`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div
      className="class-progress-dashboard"
      role="region"
      aria-label={`Dasbor Progres ${classItem.name}`}
    >
      {/* Kartu Ringkasan Pedagogis (Tanpa Membandingkan Siswa) */}
      <div className="class-summary-metrics-grid">
        <GlassPanel className="class-summary-card">
          <span className="class-summary-label">
            {id.progress.mostOpenedPoi}
          </span>
          <strong className="class-summary-value">
            {summary.mostViewedPoi
              ? `${summary.mostViewedPoi.poiName} (${summary.mostViewedPoi.count}×)`
              : 'Belum ada data'}
          </strong>
        </GlassPanel>

        <GlassPanel className="class-summary-card">
          <span className="class-summary-label">
            {id.progress.leastOpenedPoi}
          </span>
          <strong className="class-summary-value">
            {summary.leastViewedPoi
              ? `${summary.leastViewedPoi.poiName} (${summary.leastViewedPoi.count}×)`
              : 'Belum ada data'}
          </strong>
        </GlassPanel>

        <GlassPanel className="class-summary-card">
          <span className="class-summary-label">
            {id.progress.avgTimePerPoi}
          </span>
          <strong className="class-summary-value tabular-nums">
            {formatDuration(summary.averageTimeSpentSec)}
          </strong>
        </GlassPanel>

        <GlassPanel className="class-summary-card">
          <span className="class-summary-label">
            {id.progress.avgQuizScore}
          </span>
          <strong className="class-summary-value tabular-nums">
            {summary.averageQuizScore !== null
              ? `${summary.averageQuizScore}%`
              : '-'}
          </strong>
        </GlassPanel>
      </div>

      {/* Tabel Keterlibatan Siswa per Akun */}
      <div className="class-progress-table-wrapper">
        <h4 className="class-progress-table-title">
          {id.progress.studentTableTitle} ({classMembers.length} Siswa)
        </h4>

        {classMembers.length === 0 ? (
          <p className="class-progress-empty">{id.progress.noData}</p>
        ) : (
          <div className="class-table-responsive">
            <table className="class-progress-table">
              <thead>
                <tr>
                  <th scope="col">{id.progress.colStudent}</th>
                  <th scope="col">{id.progress.colSchool}</th>
                  <th scope="col">{id.progress.colVisited}</th>
                  <th scope="col">{id.progress.colTime}</th>
                  <th scope="col">{id.progress.colQuiz}</th>
                  <th scope="col">{id.progress.colLastActive}</th>
                </tr>
              </thead>
              <tbody>
                {summary.studentSummaries.map((student) => (
                  <tr key={student.studentId}>
                    <td className="font-semibold text-primary">
                      {student.studentName}
                    </td>
                    <td className="text-secondary">
                      {student.studentSchool || '-'}
                    </td>
                    <td>
                      <span className="progress-tag">
                        {student.visitedPoisCount} / {student.totalPoisCount}{' '}
                        POI
                      </span>
                    </td>
                    <td className="tabular-nums">
                      {formatDuration(student.totalTimeSpentSec)}
                    </td>
                    <td className="tabular-nums">
                      {student.averageQuizScore !== null
                        ? `${student.averageQuizScore}%`
                        : '-'}
                    </td>
                    <td className="text-secondary">
                      {student.lastActiveAt
                        ? new Date(student.lastActiveAt).toLocaleDateString(
                            'id-ID',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

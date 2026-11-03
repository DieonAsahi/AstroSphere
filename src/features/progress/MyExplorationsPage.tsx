import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CelestialBody, PointOfInterest } from '../../data/types';
import { bodyRepository } from '../../data/repository/bodyRepository';
import { poiRepository } from '../../data/repository/poiRepository';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useAuthStore } from '../classes/authStore';
import { useProgressStore } from './progressStore';
import { useQuizStore } from '../quiz/quizStore';
import { AuthBackdrop3D } from '../classes/AuthBackdrop3D';

export function MyExplorationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [bodies, setBodies] = useState<CelestialBody[]>([]);

  const isPoiVisited = useProgressStore((state) => state.isPoiVisited);
  const getPoiTimeSpent = useProgressStore((state) => state.getPoiTimeSpent);
  const getUserAttemptForPoi = useQuizStore(
    (state) => state.getUserAttemptForPoi,
  );

  useEffect(() => {
    void poiRepository.listPois().then(setPois);
    void bodyRepository.listBodies().then(setBodies);
  }, []);

  const totalPois = pois.length;
  const visitedPois = pois.filter((poi) => isPoiVisited(poi.id, user?.id));
  const visitedCount = visitedPois.length;
  const progressPct =
    totalPois > 0 ? Math.round((visitedCount / totalPois) * 100) : 0;

  const totalTimeSpent = pois.reduce((sum, p) => {
    return sum + getPoiTimeSpent(p.id, user?.id);
  }, 0);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0 detik';
    if (seconds < 60) return `${seconds} detik`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="classes-view-container">
      <AuthBackdrop3D />

      <div
        className="classes-shell"
        style={{ zIndex: 10, position: 'relative' }}
      >
        {/* Navigasi Atas */}
        <header className="classes-nav-bar">
          <Link
            to="/"
            className="classes-back-btn"
            aria-label="Kembali ke tata surya"
          >
            ← <span className="classes-back-text">Kembali ke Tata Surya</span>
          </Link>
          <div className="classes-nav-links">
            <Link to="/kelas" className="classes-nav-link">
              Kelas
            </Link>
            <span className="classes-nav-link classes-nav-link--active">
              Jelajahku
            </span>
          </div>
        </header>

        {/* Header Judul */}
        <div className="classes-header">
          <div className="classes-title-group">
            <span className="auth-role-badge">Catatan Belajar Siswa</span>
            <h1 className="classes-title">{id.progress.myExplorationsTitle}</h1>
            <p className="classes-subtitle">
              {id.progress.myExplorationsSubtitle}
            </p>
          </div>
        </div>

        {/* Ringkasan Kemajuan Utama */}
        <GlassPanel className="progress-summary-card">
          <div className="progress-summary-header">
            <div className="progress-metric-block">
              <span className="progress-metric-label">
                Capaian Titik Minat (POI)
              </span>
              <strong className="progress-metric-value">
                {visitedCount} / {totalPois} POI ({progressPct}%)
              </strong>
            </div>

            <div className="progress-metric-block">
              <span className="progress-metric-label">
                Total Waktu Eksplorasi
              </span>
              <strong className="progress-metric-value tabular-nums">
                {formatDuration(totalTimeSpent)}
              </strong>
            </div>
          </div>

          <div
            className="progress-main-bar-bg"
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Persentase titik minat yang telah dijelajahi"
          >
            <div
              className="progress-main-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </GlassPanel>

        {/* Grid Titik Minat (POI) */}
        <section className="classes-section" aria-labelledby="poi-list-heading">
          <h2 id="poi-list-heading" className="classes-section-title">
            Daftar Titik Minat Astronomi ({totalPois} Objek)
          </h2>

          <div className="poi-exploration-grid">
            {pois.map((poi) => {
              const body = bodies.find((b) => b.id === poi.bodyId);
              const visited = isPoiVisited(poi.id, user?.id);
              const timeSpent = getPoiTimeSpent(poi.id, user?.id);
              const attempt = getUserAttemptForPoi(poi.id, user?.id);

              return (
                <GlassPanel
                  key={poi.id}
                  className={`poi-exploration-card ${
                    visited ? 'poi-exploration-card--visited' : ''
                  }`}
                >
                  <div className="poi-card-header">
                    <span
                      className={`tour-badge ${
                        visited ? 'tour-badge--published' : 'tour-badge--draft'
                      }`}
                    >
                      {visited
                        ? `✓ ${id.progress.visitedBadge}`
                        : id.progress.unvisitedBadge}
                    </span>
                    <span className="poi-card-body-name">
                      {body?.name ?? poi.bodyId}
                    </span>
                  </div>

                  <h3 className="poi-card-title">{poi.name}</h3>
                  <p className="poi-card-desc">
                    {poi.historyText.slice(0, 140)}...
                  </p>

                  <div className="poi-card-stats">
                    <div className="poi-stat-item">
                      <span className="poi-stat-label">Waktu Baca:</span>
                      <strong className="tabular-nums">
                        {formatDuration(timeSpent)}
                      </strong>
                    </div>

                    <div className="poi-stat-item">
                      <span className="poi-stat-label">Hasil Kuis:</span>
                      <strong>
                        {attempt
                          ? `${attempt.score}/${attempt.maxScore} (${Math.round((attempt.score / attempt.maxScore) * 100)}%)`
                          : id.progress.noQuizYet}
                      </strong>
                    </div>
                  </div>

                  <div className="poi-card-footer">
                    <button
                      type="button"
                      className="btn btn-primary poi-btn-visit"
                      onClick={() => {
                        navigate(
                          `/planet/${body?.slug ?? poi.bodyId}/${poi.slug}`,
                        );
                      }}
                    >
                      {id.progress.exploreNow} ▶
                    </button>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

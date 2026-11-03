import { Link } from 'react-router-dom';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useMetricsStore } from './metricsStore';
import { AuthBackdrop3D } from '../classes/AuthBackdrop3D';

export function AdminMetricsPage() {
  const metrics = useMetricsStore((state) => state.metrics);
  const kpi = useMetricsStore((state) => state.getKpiSummary)();

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec} dtk`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const isKpiTargetMet = kpi.targetFpsPercentage >= 80;

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
            <Link to="/admin" className="classes-nav-link">
              CMS Admin
            </Link>
            <span className="classes-nav-link classes-nav-link--active">
              Metrik KPI
            </span>
          </div>
        </header>

        {/* Header Judul */}
        <div className="classes-header">
          <div className="classes-title-group">
            <span className="auth-role-badge">Admin Observatorium</span>
            <h1 className="classes-title">{id.metrics.adminTitle}</h1>
            <p className="classes-subtitle">{id.metrics.adminSubtitle}</p>
          </div>
        </div>

        {/* Grid Kartu KPI Utama */}
        <div className="kpi-metrics-grid">
          {/* KARTU UTAMA: TARGET MINIMAL 30 FPS (FR-12) */}
          <GlassPanel className="kpi-hero-card">
            <div className="kpi-hero-header">
              <span className="kpi-hero-label">
                {id.metrics.targetFpsKpiTitle}
              </span>
              <span
                className={`tour-badge ${
                  isKpiTargetMet
                    ? 'tour-badge--published'
                    : 'tour-badge--preview'
                }`}
              >
                {isKpiTargetMet ? '✓ Target Tercapai (≥80%)' : 'Perlu Optimasi'}
              </span>
            </div>

            <div className="kpi-hero-number-row">
              <span className="kpi-hero-number tabular-nums">
                {kpi.targetFpsPercentage}%
              </span>
              <span className="kpi-hero-subtext">
                ({kpi.targetFpsMetCount} dari {kpi.totalSessions} sesi memenuhi
                FPS ≥ 30)
              </span>
            </div>

            <div
              className="progress-main-bar-bg"
              role="progressbar"
              aria-valuenow={kpi.targetFpsPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Persentase sesi yang memenuhi FPS 30"
            >
              <div
                className="progress-main-bar-fill"
                style={{ width: `${kpi.targetFpsPercentage}%` }}
              />
            </div>
            <p className="kpi-hero-desc">{id.metrics.targetFpsKpiDesc}</p>
          </GlassPanel>

          {/* RATA-RATA FPS GLOBAL */}
          <GlassPanel className="kpi-stat-card">
            <span className="kpi-stat-label">{id.metrics.avgFpsOverall}</span>
            <strong className="kpi-stat-value tabular-nums">
              {kpi.overallAvgFps} <span className="kpi-unit">FPS</span>
            </strong>
            <span className="kpi-stat-note">Target minimal: 30 FPS</span>
          </GlassPanel>

          {/* TOTAL SESI */}
          <GlassPanel className="kpi-stat-card">
            <span className="kpi-stat-label">{id.metrics.totalSessions}</span>
            <strong className="kpi-stat-value tabular-nums">
              {kpi.totalSessions} <span className="kpi-unit">Sesi</span>
            </strong>
            <span className="kpi-stat-note">Siswa, guru & tamu anonim</span>
          </GlassPanel>

          {/* RATA-RATA DURASI SESI */}
          <GlassPanel className="kpi-stat-card">
            <span className="kpi-stat-label">{id.metrics.avgDuration}</span>
            <strong className="kpi-stat-value tabular-nums">
              {formatDuration(kpi.avgSessionDurationSec)}
            </strong>
            <span className="kpi-stat-note">Waktu penjelajahan per sesi</span>
          </GlassPanel>
        </div>

        {/* Distribusi Kualitas Visual */}
        <GlassPanel
          className="kpi-quality-distribution-card"
          style={{ marginTop: '1.5rem' }}
        >
          <h2
            className="classes-section-title"
            style={{ fontSize: '1rem', marginBottom: '0.75rem' }}
          >
            {id.metrics.qualityDistribution}
          </h2>
          <div className="kpi-quality-pills">
            <div className="kpi-quality-pill">
              <span className="kpi-quality-name">Kualitas Rendah (Low):</span>
              <strong className="tabular-nums">
                {kpi.qualityDistribution.low} Sesi
              </strong>
            </div>
            <div className="kpi-quality-pill">
              <span className="kpi-quality-name">Kualitas Sedang (Mid):</span>
              <strong className="tabular-nums">
                {kpi.qualityDistribution.mid} Sesi
              </strong>
            </div>
            <div className="kpi-quality-pill">
              <span className="kpi-quality-name">Kualitas Tinggi (High):</span>
              <strong className="tabular-nums">
                {kpi.qualityDistribution.high} Sesi
              </strong>
            </div>
          </div>
        </GlassPanel>

        {/* Pernyataan Perlindungan Data Pribadi (UU PDP) */}
        <div className="privacy-callout" style={{ marginTop: '1.5rem' }}>
          <span className="privacy-callout-icon" aria-hidden="true">
            🛡️
          </span>
          <div>
            <strong>Transparansi Pelacakan Teknis</strong>
            <p>{id.metrics.privacyStatement}</p>
          </div>
        </div>

        {/* Tabel Riwayat Sesi Terkini */}
        <section className="classes-section" style={{ marginTop: '2rem' }}>
          <h2 className="classes-section-title">
            Riwayat Sesi Terkini ({metrics.length})
          </h2>

          <div
            className="class-table-responsive"
            style={{ marginTop: '0.75rem' }}
          >
            <table className="class-progress-table">
              <thead>
                <tr>
                  <th scope="col">ID Sesi</th>
                  <th scope="col">Pengguna</th>
                  <th scope="col">Durasi</th>
                  <th scope="col">POI Dibuka</th>
                  <th scope="col">Rata-rata FPS</th>
                  <th scope="col">Kualitas</th>
                  <th scope="col">Waktu Mulai</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id}>
                    <td
                      className="font-mono text-secondary"
                      style={{ fontSize: '11px' }}
                    >
                      {m.id}
                    </td>
                    <td>{m.userId ? 'Siswa / Guru' : 'Tamu Anonim'}</td>
                    <td className="tabular-nums">
                      {formatDuration(m.durationSec)}
                    </td>
                    <td className="tabular-nums">{m.poisOpened} POI</td>
                    <td className="tabular-nums font-semibold">
                      <span
                        className={
                          m.avgFps >= 30 ? 'text-accent' : 'text-danger'
                        }
                      >
                        {m.avgFps.toFixed(1)} FPS
                      </span>
                    </td>
                    <td>
                      <span className="progress-tag">{m.qualityTier}</span>
                    </td>
                    <td className="text-secondary" style={{ fontSize: '12px' }}>
                      {new Date(m.startedAt).toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

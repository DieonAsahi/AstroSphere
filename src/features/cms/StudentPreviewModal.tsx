import { GlassPanel } from '../../ui/GlassPanel';
import { PoiPanel } from '../../ui/PoiPanel';
import type { CelestialBody, PointOfInterest } from '../../data/types';
import type { CmsCelestialBody, CmsPoi } from './types';

interface StudentPreviewModalProps {
  type: 'body' | 'poi';
  item: CmsCelestialBody | CmsPoi;
  parentBody?: CelestialBody;
  onClose: () => void;
}

export function StudentPreviewModal({
  type,
  item,
  parentBody,
  onClose,
}: StudentPreviewModalProps) {
  const isPoi = type === 'poi';

  return (
    <div
      className="tour-modal-backdrop student-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau Siswa: ${item.name}`}
    >
      {/* Banner Notifikasi Mode Pratinjau Siswa */}
      <div className="student-preview-bar">
        <div className="student-preview-bar-content">
          <span className="tour-badge tour-badge--preview">
            👁️ Mode Pratinjau Siswa
          </span>
          <span className="student-preview-msg">
            Menampilkan antarmuka persis seperti yang dilihat siswa di Tata
            Surya. Status saat ini:{' '}
            <strong>
              {item.isPublished ? '✓ Terpublikasi' : '⚠️ Masih Draf (Tertutup)'}
            </strong>
          </span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onClose}
          aria-label="Tutup pratinjau siswa"
        >
          ✕ Tutup Pratinjau
        </button>
      </div>

      <div className="student-preview-body">
        {isPoi ? (
          /* TAMPILAN PANEL POI PERSIS SEPERTI SISWA */
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              margin: '0 auto',
            }}
          >
            <PoiPanel
              poi={item as PointOfInterest}
              body={
                parentBody || {
                  id: (item as CmsPoi).bodyId,
                  slug: (item as CmsPoi).bodyId,
                  name: (item as CmsPoi).bodyId.toUpperCase(),
                  type: 'planet',
                  diameterKm: 6779,
                  massKg: null,
                  rotationPeriodH: 24.6,
                  axialTiltDeg: 25.2,
                  semiMajorAxisAu: 1.52,
                  eccentricity: 0.093,
                  inclinationDeg: 1.85,
                  orbitPeriodDays: 687,
                  textureUrls: { low: '', mid: '', high: '' },
                  description: '',
                  sources: [],
                }
              }
              onClose={onClose}
            />
          </div>
        ) : (
          /* TAMPILAN KARTU BENDA LANGIT PERSIS SEPERTI SISWA */
          <GlassPanel
            className="student-preview-card"
            style={{ maxWidth: '640px', margin: '2rem auto' }}
          >
            <div className="tour-builder-header">
              <div>
                <span className="auth-role-badge">
                  {(item as CmsCelestialBody).type.toUpperCase()}
                </span>
                <h2 className="classes-title" style={{ marginTop: '0.25rem' }}>
                  {item.name}
                </h2>
                <p className="text-secondary" style={{ fontSize: '13px' }}>
                  Slug URL: <code>/{item.slug}</code>
                </p>
              </div>
            </div>

            <p style={{ marginTop: '1rem', lineHeight: '1.6' }}>
              {(item as CmsCelestialBody).description}
            </p>

            {/* Grid Dimensi & Karakteristik Fisik */}
            <h4
              style={{
                marginTop: '1.5rem',
                marginBottom: '0.5rem',
                fontSize: '14px',
              }}
            >
              Parameter Dimensi & Orbit:
            </h4>
            <div className="asset-meta-grid">
              <div className="asset-meta-item">
                <span className="asset-meta-label">Diameter:</span>
                <span className="tabular-nums">
                  {(item as CmsCelestialBody).diameterKm?.toLocaleString(
                    'id-ID',
                  )}{' '}
                  km
                </span>
              </div>
              <div className="asset-meta-item">
                <span className="asset-meta-label">Periode Rotasi:</span>
                <span className="tabular-nums">
                  {(item as CmsCelestialBody).rotationPeriodH} jam
                </span>
              </div>
              <div className="asset-meta-item">
                <span className="asset-meta-label">Sumbu Semi-Mayor:</span>
                <span className="tabular-nums">
                  {(item as CmsCelestialBody).semiMajorAxisAu ?? '-'} AU
                </span>
              </div>
              <div className="asset-meta-item">
                <span className="asset-meta-label">Periode Orbit:</span>
                <span className="tabular-nums">
                  {(item as CmsCelestialBody).orbitPeriodDays ?? '-'} hari
                </span>
              </div>
            </div>

            {/* Sumber Ilmiah Terbuka Wajib */}
            <h4
              style={{
                marginTop: '1.5rem',
                marginBottom: '0.5rem',
                fontSize: '14px',
              }}
            >
              Sumber Fakta Ilmiah Terverifikasi:
            </h4>
            <ul
              style={{
                paddingLeft: '1.25rem',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              {item.sources.map((s, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  {s}
                </li>
              ))}
            </ul>
          </GlassPanel>
        )}
      </div>
    </div>
  );
}

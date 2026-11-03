import { id } from '../lib/i18n/id';
import type { QualityLevel } from '../lib/perf';
import { getQualityParams, useQualityStore } from '../state/qualityStore';

export function QualitySettings() {
  const quality = useQualityStore((state) => state.quality);
  const reducedMotion = useQualityStore((state) => state.reducedMotion);
  const setQuality = useQualityStore((state) => state.setQuality);
  const setReducedMotion = useQualityStore((state) => state.setReducedMotion);
  const highContrast = useQualityStore((state) => state.highContrast);
  const setHighContrast = useQualityStore((state) => state.setHighContrast);

  const params = getQualityParams(quality);

  const qualityLabels: Record<QualityLevel, string> = {
    high: id.qualityHigh,
    mid: id.qualityMid,
    low: id.qualityLow,
  };

  return (
    <div className="quality-settings-panel">
      <div className="quality-settings-group">
        <label htmlFor="quality-level-select" className="quality-label">
          <span>{id.quality}</span>
          <select
            id="quality-level-select"
            className="quality-select"
            value={quality}
            onChange={(event) => setQuality(event.target.value as QualityLevel)}
          >
            {(['high', 'mid', 'low'] as QualityLevel[]).map((level) => (
              <option key={level} value={level}>
                {qualityLabels[level]}
              </option>
            ))}
          </select>
        </label>

        {/* Rincian Parameter Kualitas Aktif */}
        <div className="quality-specs-grid">
          <div className="quality-spec-item">
            <span>{id.performance.particleCountLabel}</span>
            <strong>{params.particleCount.toLocaleString('id-ID')}</strong>
          </div>
          <div className="quality-spec-item">
            <span>{id.performance.starfield}</span>
            <strong>{params.starCount.toLocaleString('id-ID')}</strong>
          </div>
          <div className="quality-spec-item">
            <span>{id.performance.sphereSegments}</span>
            <strong>
              {params.sphereSegments}×{params.sphereSegments}
            </strong>
          </div>
          <div className="quality-spec-item">
            <span>{id.performance.shadows}</span>
            <strong>{params.shadows ? 'Aktif' : 'Nonaktif'}</strong>
          </div>
        </div>
      </div>

      <div className="quality-toggles-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(event) => setReducedMotion(event.target.checked)}
          />
          <span>{id.reducedMotion}</span>
        </label>

        <label className="toggle-label">
          <input
            type="checkbox"
            checked={highContrast}
            onChange={(event) => setHighContrast(event.target.checked)}
          />
          <span>Kontras tinggi (WCAG AAA)</span>
        </label>
      </div>
    </div>
  );
}

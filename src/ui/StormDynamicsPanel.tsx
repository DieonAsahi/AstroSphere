import { id } from '../lib/i18n/id';
import { useParticleStormStore } from '../state/particleStormStore';
import { useQualityStore } from '../state/qualityStore';
import type { PointOfInterest } from '../data/types';

interface StormDynamicsPanelProps {
  poi: PointOfInterest;
}

export function StormDynamicsPanel({ poi }: StormDynamicsPanelProps) {
  const isPaused = useParticleStormStore((state) => state.isPaused);
  const togglePaused = useParticleStormStore((state) => state.togglePaused);
  const speed = useParticleStormStore((state) => state.speed);
  const setSpeed = useParticleStormStore((state) => state.setSpeed);
  const density = useParticleStormStore((state) => state.density);
  const setDensity = useParticleStormStore((state) => state.setDensity);

  const quality = useQualityStore((state) => state.quality);
  const reducedMotion = useQualityStore((state) => state.reducedMotion);

  // Hitung jumlah partikel aktif saat ini berdasarkan kualitas dan slider kepadatan
  const baseCount =
    quality === 'high' ? 40000 : quality === 'mid' ? 15000 : 4000;
  const currentParticleCount = Math.max(
    800,
    Math.round(baseCount * density),
  ).toLocaleString('id-ID');

  const qualityLabels: Record<string, string> = {
    high: id.qualityHigh,
    mid: id.qualityMid,
    low: id.qualityLow,
  };

  return (
    <div
      className="storm-dynamics-panel"
      aria-label={id.poi.stormControls.title}
    >
      {/* KONTROL SIMULASI PARTIKEL GPU */}
      <div className="storm-controls-box">
        <div className="storm-controls-header">
          <h4 className="storm-controls-title">{id.poi.stormControls.title}</h4>
          <span className="storm-particle-badge tabular-nums">
            {currentParticleCount} partikel ({qualityLabels[quality]})
          </span>
        </div>

        {reducedMotion && (
          <div className="storm-reduced-motion-notice" role="status">
            <span>ℹ</span>
            <span>{id.poi.stormControls.reducedMotionActive}</span>
          </div>
        )}

        <div className="storm-control-actions">
          {/* Tombol Jeda / Putar */}
          <button
            type="button"
            className={`storm-play-button ${isPaused ? 'storm-play-button--paused' : ''}`}
            onClick={togglePaused}
            aria-label={
              isPaused ? id.poi.stormControls.play : id.poi.stormControls.pause
            }
          >
            <span aria-hidden="true" className="storm-btn-icon">
              {isPaused ? '▶' : '⏸'}
            </span>
            <span>
              {isPaused
                ? id.poi.stormControls.play
                : id.poi.stormControls.pause}
            </span>
          </button>

          {/* Slider Kecepatan */}
          <div className="storm-slider-group">
            <label htmlFor="storm-speed-slider" className="storm-slider-label">
              <span>{id.poi.stormControls.speed}</span>
              <span className="tabular-nums font-semibold">
                {speed.toFixed(1)}×
              </span>
            </label>
            <input
              id="storm-speed-slider"
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={speed}
              disabled={reducedMotion}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="terrain-slider"
              aria-valuemin={0.2}
              aria-valuemax={3.0}
              aria-valuenow={speed}
              aria-valuetext={`${speed.toFixed(1)} kali`}
            />
          </div>

          {/* Slider Kepadatan */}
          <div className="storm-slider-group">
            <label
              htmlFor="storm-density-slider"
              className="storm-slider-label"
            >
              <span>{id.poi.stormControls.density}</span>
              <span className="tabular-nums font-semibold">
                {Math.round(density * 100)}%
              </span>
            </label>
            <input
              id="storm-density-slider"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={density}
              onChange={(e) => setDensity(Number(e.target.value))}
              className="terrain-slider"
              aria-valuemin={0.1}
              aria-valuemax={1.0}
              aria-valuenow={density}
              aria-valuetext={`${Math.round(density * 100)} persen`}
            />
          </div>
        </div>
      </div>

      {/* PANEL INFO "BAGAIMANA BADAI INI TERBENTUK" */}
      <div className="storm-formation-panel">
        <div className="storm-formation-header">
          <h4 className="storm-formation-title">
            {id.poi.stormFormation.title}
          </h4>
          <p className="storm-formation-subtitle">
            {poi.name} · {id.poi.stormFormation.subtitle}
          </p>
        </div>

        <div className="storm-formation-sections">
          {/* 1. Apa itu Antisiklon */}
          <article className="storm-fact-card">
            <h5 className="storm-fact-title">
              {id.poi.stormFormation.anticycloneTitle}
            </h5>
            <p className="storm-fact-desc">
              {id.poi.stormFormation.anticycloneDesc}
            </p>
            <small className="storm-fact-source">
              Sumber: {id.poi.stormFormation.anticycloneSource}
            </small>
          </article>

          {/* 2. Mengapa bertahan berabad-abad tanpa permukaan padat */}
          <article className="storm-fact-card">
            <h5 className="storm-fact-title">
              {id.poi.stormFormation.noSurfaceTitle}
            </h5>
            <p className="storm-fact-desc">
              {id.poi.stormFormation.noSurfaceDesc}
            </p>
            <small className="storm-fact-source">
              Sumber: {id.poi.stormFormation.noSurfaceSource}
            </small>
          </article>

          {/* 3. Fenomena ukuran menyusut */}
          <article className="storm-fact-card">
            <h5 className="storm-fact-title">
              {id.poi.stormFormation.shrinkingTitle}
            </h5>
            <p className="storm-fact-desc">
              {id.poi.stormFormation.shrinkingDesc}
            </p>
            <small className="storm-fact-source">
              Sumber: {id.poi.stormFormation.shrinkingSource}
            </small>
          </article>

          {/* 4. Misteri yang belum terpecahkan */}
          <article className="storm-fact-card storm-fact-card--mystery">
            <div className="storm-mystery-tag">
              <span className="mystery-badge">{id.poi.needsVerification}</span>
              <h5 className="storm-fact-title">
                {id.poi.stormFormation.mysteriesTitle}
              </h5>
            </div>
            <ul className="storm-mystery-list">
              <li>{id.poi.stormFormation.mysteryDepth}</li>
              <li>{id.poi.stormFormation.mysteryColor}</li>
              <li>{id.poi.stormFormation.mysteryFuture}</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  );
}

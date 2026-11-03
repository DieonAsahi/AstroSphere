import { useState } from 'react';
import bodies from '../data/bodies.json';
import pois from '../data/pois.json';
import type { CelestialBody, PointOfInterest } from '../data/types';
import { id } from '../lib/i18n/id';
import { GlassPanel } from './GlassPanel';

export function WebGLFallback() {
  const [filter, setFilter] = useState<'all' | 'planet' | 'poi'>('all');
  const allBodies = bodies as CelestialBody[];
  const allPois = pois as PointOfInterest[];

  const displayedBodies =
    filter === 'poi'
      ? []
      : filter === 'planet'
        ? allBodies.filter((b) => b.type === 'planet')
        : allBodies;

  const displayedPois = filter === 'planet' ? [] : allPois;

  return (
    <div className="webgl-fallback-container" role="main">
      <GlassPanel className="webgl-fallback-card">
        {/* Header Peringatan Ramah */}
        <div className="webgl-fallback-header">
          <span className="webgl-fallback-icon" aria-hidden="true">
            ⚠️
          </span>
          <div>
            <h1 className="webgl-fallback-title">{id.webglFallback.title}</h1>
            <p className="webgl-fallback-desc">
              {id.webglFallback.description}
            </p>
          </div>
        </div>

        {/* Panduan Rekomendasi Peramban */}
        <section
          className="webgl-fallback-guide"
          aria-labelledby="webgl-guide-title"
        >
          <h2 id="webgl-guide-title" className="webgl-guide-title">
            {id.webglFallback.recommendationTitle}
          </h2>
          <ul className="webgl-guide-list">
            {id.webglFallback.recommendations.map((rec, index) => (
              <li key={index}>{rec}</li>
            ))}
          </ul>
        </section>
      </GlassPanel>

      {/* Direktori Benda Langit Berbasis Teks */}
      <section
        className="webgl-text-directory"
        aria-labelledby="directory-heading"
      >
        <div className="webgl-directory-header">
          <h2 id="directory-heading" className="webgl-directory-title">
            {id.webglFallback.directoryTitle}
          </h2>

          <div
            className="tab-list glass-panel"
            role="tablist"
            aria-label="Filter objek astronomi"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`tab-button ${filter === 'all' ? 'tab-button--active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Semua
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'planet'}
              className={`tab-button ${filter === 'planet' ? 'tab-button--active' : ''}`}
              onClick={() => setFilter('planet')}
            >
              Planet
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'poi'}
              className={`tab-button ${filter === 'poi' ? 'tab-button--active' : ''}`}
              onClick={() => setFilter('poi')}
            >
              Titik Minat (POI)
            </button>
          </div>
        </div>

        <div className="webgl-directory-grid">
          {displayedBodies.map((body) => (
            <article key={body.id} className="webgl-directory-card">
              <div className="webgl-card-top">
                <span className="webgl-body-badge">{body.type}</span>
                <h3 className="webgl-body-name">{body.name}</h3>
              </div>
              <p className="webgl-body-desc">{body.description}</p>
              <div className="webgl-body-stats">
                {body.diameterKm && (
                  <span>
                    Diameter: {body.diameterKm.toLocaleString('id-ID')} km
                  </span>
                )}
                {body.orbitPeriodDays && (
                  <span>Orbit: {body.orbitPeriodDays} hari Bumi</span>
                )}
              </div>
            </article>
          ))}

          {displayedPois.map((poi) => (
            <article
              key={poi.id}
              className="webgl-directory-card webgl-directory-card--poi"
            >
              <div className="webgl-card-top">
                <span className="webgl-body-badge webgl-body-badge--poi">
                  {poi.type} · {poi.bodyId}
                </span>
                <h3 className="webgl-body-name">{poi.name}</h3>
              </div>
              <p className="webgl-body-desc">{poi.historyText}</p>
              <div className="webgl-body-stats">
                {poi.dimensions.map((dim) => (
                  <span key={dim.label}>
                    {dim.label}:{' '}
                    {dim.nilai === null
                      ? 'Perlu verifikasi'
                      : `${dim.nilai.toLocaleString('id-ID')} ${dim.satuan}`}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

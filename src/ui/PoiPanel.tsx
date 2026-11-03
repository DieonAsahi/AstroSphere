import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CelestialBody, PointOfInterest } from '../data/types';
import { GlassPanel } from './GlassPanel';
import { TabList } from './TabList';
import { TerrainViewer } from '../scene/TerrainViewer';
import { ScaleComparison3D } from './ScaleComparison3D';
import { StormDynamicsPanel } from './StormDynamicsPanel';
import { usePoiViewed } from '../features/progress/usePoiViewed';
import { id } from '../lib/i18n/id';
import { QuizView } from '../features/quiz/QuizView';

export interface PoiPanelProps {
  poi: PointOfInterest;
  body: CelestialBody;
  onClose: () => void;
}

export function PoiPanel({ poi, body, onClose }: PoiPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-title`;

  // Rekam kunjungan POI ke log dan lacak progres belajar siswa
  useEffect(() => {
    console.info('[AstroSphere] POI viewed:', poi.id);
  }, [poi.id]);
  usePoiViewed(poi.id);

  // Tab konfigurasi berdasarkan tipe objek
  const isStorm = poi.type === 'badai';
  const tabs = useMemo(() => {
    return [
      { id: 'history', label: id.poi.tabs.history },
      { id: 'dimensions', label: id.poi.tabs.dimensions },
      {
        id: isStorm ? 'atmosphere' : 'terrain',
        label: isStorm ? id.poi.tabs.atmosphere : id.poi.tabs.terrain,
      },
      { id: 'quiz', label: id.quiz.tabLabel },
      { id: 'sources', label: id.poi.tabs.sources },
    ];
  }, [isStorm]);

  const [activeTab, setActiveTab] = useState(tabs[0].id);

  // Saat panel dibuka, pindahkan fokus keyboard ke tombol tutup atau panel
  useEffect(() => {
    const timer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [poi.id]);

  // Tutup panel dengan Escape dan kembalikan fokus ke penanda POI
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      window.setTimeout(() => {
        const markerBtn = document.querySelector<HTMLButtonElement>(
          `[data-poi-id="${poi.id}"]`,
        );
        markerBtn?.focus();
      }, 50);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, poi.id]);

  const handleClose = () => {
    onClose();
    window.setTimeout(() => {
      const markerBtn = document.querySelector<HTMLButtonElement>(
        `[data-poi-id="${poi.id}"]`,
      );
      markerBtn?.focus();
    }, 50);
  };

  // Format jenis POI
  const poiTypeLabels: Record<string, string> = {
    gunung: 'Gunung Berapi Perisai',
    badai: 'Badai Atmosfer Antisiklonik',
    kawah: 'Kawah Impak',
    lembah: 'Lembah / Ngarai',
    lainnya: 'Fitur Geologi',
  };
  const typeLabel = poiTypeLabels[poi.type] ?? poi.type;

  // Pisahkan paragraf teks sejarah
  const historyParagraphs = useMemo(() => {
    return poi.historyText
      .split(/\n\s*\n|\n/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [poi.historyText]);

  return (
    <>
      {/* Pengumuman pembaca layar saat panel terbuka */}
      <div className="sr-only" role="status" aria-live="polite">
        {id.poi.panelOpened(poi.name)}
      </div>

      <GlassPanel
        ref={panelRef}
        className="poi-panel"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* Header Panel */}
        <div className="poi-panel__header">
          <div className="poi-panel__titles">
            <span className="poi-panel__eyebrow">
              {id.poi.eyebrow(typeLabel, body.name)}
            </span>
            <h2 id={titleId} className="poi-panel__title">
              {poi.name}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            className="icon-button poi-panel__close-btn"
            aria-label={id.poi.closePanel}
            onClick={handleClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Tab Navigasi Aksesibel */}
        <div className="poi-panel__tabs-wrapper">
          <TabList
            label={`Kategori informasi ${poi.name}`}
            options={tabs}
            value={activeTab}
            onChange={setActiveTab}
            baseId={baseId}
          />
        </div>

        {/* Konten Tab */}
        <div
          id={`${baseId}-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${activeTab}`}
          className="poi-panel__content"
          tabIndex={0}
        >
          {/* TAB 1: SEJARAH */}
          {activeTab === 'history' && (
            <div className="poi-tab-section poi-history">
              <h3 className="poi-section-heading">
                {id.poi.historySectionTitle}
              </h3>
              <div className="poi-history__text">
                {historyParagraphs.map((paragraph, index) => (
                  <p key={index} className="poi-history__paragraph">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Undangan Kuis Cepat Setelah Membaca */}
              <div className="poi-quiz-cta-banner">
                <div className="poi-quiz-cta-content">
                  <span className="poi-quiz-cta-icon" aria-hidden="true">
                    💡
                  </span>
                  <div>
                    <strong>{id.quiz.ctaBannerTitle}</strong>
                    <p>{id.quiz.ctaBannerDesc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary poi-quiz-cta-btn"
                  onClick={() => setActiveTab('quiz')}
                >
                  {id.quiz.startQuizBtn} ▶
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DIMENSI & PERBANDINGAN 3D */}
          {activeTab === 'dimensions' && (
            <div className="poi-tab-section poi-dimensions-section">
              <h3 className="poi-section-heading">
                {id.poi.dimensionsSectionTitle}
              </h3>

              {/* Grid Kartu Dimensi Terstruktur */}
              <div className="poi-dimension-grid">
                {poi.dimensions.map((dim) => {
                  const isUnverified = dim.nilai === null;
                  return (
                    <article className="poi-dimension-card" key={dim.label}>
                      <span className="poi-dimension-label">{dim.label}</span>
                      <strong
                        className={`poi-dimension-value tabular-nums ${
                          isUnverified ? 'poi-dimension-value--unverified' : ''
                        }`}
                      >
                        {dim.nilai === null
                          ? id.poi.needsVerification
                          : `${dim.nilai.toLocaleString('id-ID')} ${dim.satuan}`}
                      </strong>
                      <small className="poi-dimension-source">
                        {dim.sumber}
                      </small>
                    </article>
                  );
                })}
              </div>

              {/* Visualisasi Perbandingan 3D Sederhana */}
              <ScaleComparison3D poi={poi} />
            </div>
          )}

          {/* TAB 3: TOPOGRAFI 3D (Objek Permukaan Padat) */}
          {activeTab === 'terrain' && (
            <div className="poi-tab-section poi-terrain-section">
              <TerrainViewer poi={poi} />
            </div>
          )}

          {/* TAB 3 ALTERNATIF: DINAMIKA ATMOSFER (Untuk POI Gas/Badai Tanpa Permukaan) */}
          {activeTab === 'atmosphere' && (
            <div className="poi-tab-section poi-atmosphere-section">
              <StormDynamicsPanel poi={poi} />
            </div>
          )}

          {/* TAB 4: KUIS CEPAT (FR-10) */}
          {activeTab === 'quiz' && (
            <div className="poi-tab-section poi-quiz-section">
              <QuizView poiId={poi.id} poiName={poi.name} onClose={onClose} />
            </div>
          )}

          {/* TAB 5: SUMBER & LISENSI */}
          {activeTab === 'sources' && (
            <div className="poi-tab-section poi-sources-section">
              <h3 className="poi-section-heading">{id.poi.sourcesTitle}</h3>
              <ul className="poi-source-list">
                {poi.sources.map((source, index) => {
                  const isUrl = source.startsWith('http');
                  return (
                    <li key={index} className="poi-source-item">
                      {isUrl ? (
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="poi-source-link"
                          title={id.poi.externalLinkNotice}
                        >
                          <span className="poi-source-icon" aria-hidden="true">
                            ↗
                          </span>
                          <span className="poi-source-text">{source}</span>
                        </a>
                      ) : (
                        <span className="poi-source-text">{source}</span>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="poi-license-box">
                <h4 className="poi-license-title">{id.poi.licenseTitle}</h4>
                <p className="poi-license-text">{id.poi.licenseContent}</p>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>
    </>
  );
}

import { useEffect, useRef } from 'react';
import { id } from '../../lib/i18n/id';
import { GlassPanel } from '../../ui/GlassPanel';
import { useTourStore } from './tourStore';

export function TourPlayerOverlay() {
  const activeTour = useTourStore((state) => state.activeTour);
  const currentStepIndex = useTourStore((state) => state.currentStepIndex);
  const isPlaying = useTourStore((state) => state.isPlaying);
  const isAutoAdvance = useTourStore((state) => state.isAutoAdvance);
  const stepElapsedTime = useTourStore((state) => state.stepElapsedTime);
  const isPreviewMode = useTourStore((state) => state.isPreviewMode);

  const nextStep = useTourStore((state) => state.nextStep);
  const prevStep = useTourStore((state) => state.prevStep);
  const goToStep = useTourStore((state) => state.goToStep);
  const togglePlayPause = useTourStore((state) => state.togglePlayPause);
  const toggleAutoAdvance = useTourStore((state) => state.toggleAutoAdvance);
  const tickPlayback = useTourStore((state) => state.tickPlayback);
  const exitTour = useTourStore((state) => state.exitTour);

  const containerRef = useRef<HTMLDivElement>(null);

  // Interval pemutaran otomatis berdasarkan durasi langkah
  useEffect(() => {
    if (!activeTour || !isPlaying) return;

    const interval = window.setInterval(() => {
      tickPlayback(0.1);
    }, 100);

    return () => window.clearInterval(interval);
  }, [activeTour, isPlaying, tickPlayback]);

  // Dukungan tombol pintas keyboard: Space (Jeda/Putar), Panah Kanan/Kiri (Langkah), Esc (Keluar)
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan bila pengguna sedang fokus di input / textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        exitTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, togglePlayPause, nextStep, prevStep, exitTour]);

  if (!activeTour) return null;

  const totalSteps = activeTour.steps.length;
  const currentStep = activeTour.steps[currentStepIndex];
  if (!currentStep) return null;

  const duration = currentStep.durationS || 10;
  const progressPercent = Math.min(100, (stepElapsedTime / duration) * 100);
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isCompleted = isLastStep && stepElapsedTime >= duration;

  return (
    <div
      ref={containerRef}
      className="tour-player-shell"
      role="region"
      aria-label={id.tours.title}
    >
      <GlassPanel className="tour-player-panel">
        {/* Header Tur: Badge, Judul, dan Tombol Keluar */}
        <div className="tour-player-header">
          <div className="tour-player-title-row">
            <span
              className={`tour-badge ${
                isPreviewMode ? 'tour-badge--preview' : 'tour-badge--active'
              }`}
            >
              {isPreviewMode
                ? id.tours.player.previewBadge
                : id.tours.player.tourBadge}
            </span>
            <h2 className="tour-player-tour-title">{activeTour.title}</h2>
          </div>

          <button
            type="button"
            className="tour-btn-exit"
            onClick={exitTour}
            aria-label={id.tours.player.exit}
            title={id.tours.player.exit}
          >
            ✕ <span className="tour-btn-exit-text">{id.tours.player.exit}</span>
          </button>
        </div>

        {/* Bilah Progres Langkah & Stepper Dots */}
        <div className="tour-stepper-container">
          <div
            className="tour-step-indicators"
            role="tablist"
            aria-label="Daftar langkah tur"
          >
            {activeTour.steps.map((step, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPassed = idx < currentStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  className={`tour-step-dot ${
                    isCurrent
                      ? 'tour-step-dot--current'
                      : isPassed
                        ? 'tour-step-dot--passed'
                        : ''
                  }`}
                  onClick={() => goToStep(idx)}
                  title={`Langkah ${idx + 1}: ${step.poiName}`}
                  aria-label={`Lompat ke Langkah ${idx + 1}: ${step.poiName}`}
                >
                  <span className="sr-only">Langkah {idx + 1}</span>
                </button>
              );
            })}
          </div>

          {/* Indikator Waktu Berjalan per Langkah */}
          <div
            className="tour-time-bar-bg"
            role="progressbar"
            aria-valuenow={Math.round(progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progres durasi langkah saat ini"
          >
            <div
              className="tour-time-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Informasi Langkah & Teks Narasi Ilmiah */}
        <div className="tour-content-section">
          <div className="tour-step-info-header">
            <span className="tour-step-counter">
              {id.tours.player.stepCount(currentStepIndex + 1, totalSteps)}
            </span>
            <span className="tour-poi-heading">
              {currentStep.poiName} · <em>{currentStep.bodyName}</em>
            </span>
          </div>

          <div
            className="tour-narration-box"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="tour-narration-text">{currentStep.narrationText}</p>
          </div>
        </div>

        {/* Modal Mini Penyelesaian Tur jika langkah terakhir selesai */}
        {isCompleted && (
          <div
            className="tour-completed-banner"
            role="alert"
            aria-live="assertive"
          >
            <div className="tour-completed-content">
              <span className="tour-completed-icon" aria-hidden="true">
                🎉
              </span>
              <div>
                <strong>{id.tours.player.completedTitle}</strong>
                <p>{id.tours.player.completedDesc}</p>
              </div>
            </div>
            <div className="tour-completed-actions">
              <button
                type="button"
                className="btn btn-secondary tour-btn-restart"
                onClick={() => goToStep(0)}
              >
                {id.tours.player.restartTour}
              </button>
              <button
                type="button"
                className="btn btn-primary tour-btn-done"
                onClick={exitTour}
              >
                {id.tours.player.backToExplore}
              </button>
            </div>
          </div>
        )}

        {/* Kontrol Navigasi & Pintasan */}
        <div className="tour-player-footer">
          <div className="tour-controls-group">
            <button
              type="button"
              className="btn btn-secondary tour-nav-btn"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              aria-label={`${id.tours.player.previous} (Panah Kiri)`}
            >
              ◀ {id.tours.player.previous}
            </button>

            <button
              type="button"
              className="btn btn-primary tour-nav-btn tour-play-btn"
              onClick={togglePlayPause}
              aria-label={
                isPlaying
                  ? `${id.tours.player.pause} (Spasi)`
                  : `${id.tours.player.play} (Spasi)`
              }
            >
              {isPlaying
                ? `⏸ ${id.tours.player.pause}`
                : `▶ ${id.tours.player.play}`}
            </button>

            <button
              type="button"
              className="btn btn-secondary tour-nav-btn"
              onClick={nextStep}
              disabled={isLastStep && isCompleted}
              aria-label={`${id.tours.player.next} (Panah Kanan)`}
            >
              {id.tours.player.next} ▶
            </button>

            <button
              type="button"
              className={`tour-auto-toggle ${
                isAutoAdvance ? 'tour-auto-toggle--active' : ''
              }`}
              onClick={toggleAutoAdvance}
              aria-pressed={isAutoAdvance}
              aria-label="Alihkan pemutaran otomatis"
              title="Lanjut otomatis saat durasi narasi langkah selesai"
            >
              {isAutoAdvance
                ? id.tours.player.autoAdvanceOn
                : id.tours.player.autoAdvanceOff}
            </button>
          </div>

          <div className="tour-shortcuts-hint" aria-hidden="true">
            {id.tours.player.shortcutsHint}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

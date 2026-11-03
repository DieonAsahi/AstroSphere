import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, useProgress } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bodyRepository } from '../../data/repository/bodyRepository';
import { poiRepository } from '../../data/repository/poiRepository';
import type { CelestialBody, PointOfInterest } from '../../data/types';
import { id } from '../../lib/i18n/id';
import { isWebGL2Available } from '../../lib/webgl';
import { SolarSystem } from '../../scene/SolarSystem';
import { getQualityParams, useQualityStore } from '../../state/qualityStore';
import { useSceneStore } from '../../state/sceneStore';
import { useUiStore } from '../../state/uiStore';
import { FpsOverlay } from '../../ui/FpsOverlay';
import { Hud } from '../../ui/HUD';
import { PoiPanel } from '../../ui/PoiPanel';
import { WebGLFallback } from '../../ui/WebGLFallback';
import { TourPlayerOverlay } from '../../features/tours/TourPlayerOverlay';
import { useTourStore } from '../../features/tours/tourStore';
import { useMetricsStore } from '../../features/metrics/metricsStore';

/**
 * Indikator pemuatan aset tekstur/model 3D yang non-blocking.
 */
function AssetLoadingIndicator() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <div
      className="asset-loading-badge"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span aria-hidden="true">⏳</span>
      <span>
        {id.loadingAsset} ({Math.round(progress)}%)
      </span>
    </div>
  );
}

export function HomePage() {
  const { planetSlug, poiSlug } = useParams();
  const selectBody = useSceneStore((state) => state.selectBody);
  const selectPoi = useSceneStore((state) => state.selectPoi);
  const navigate = useNavigate();
  const requestCameraReset = useUiStore((state) => state.requestCameraReset);
  const quality = useQualityStore((state) => state.quality);
  const qualityParams = getQualityParams(quality);
  const activeTour = useTourStore((state) => state.activeTour);

  const [activeBody, setActiveBody] = useState<CelestialBody | null>(null);
  const [activePoi, setActivePoi] = useState<PointOfInterest | null>(null);
  const [hasWebGL2] = useState(() => isWebGL2Available());

  useEffect(() => {
    if (!planetSlug) {
      selectBody(null);
      selectPoi(null);
      setActiveBody(null);
      setActivePoi(null);
      return;
    }

    void bodyRepository.listBodies().then((bodies) => {
      const body = bodies.find((item) => item.slug === planetSlug) ?? null;
      setActiveBody(body);
      selectBody(body?.id ?? null);

      if (!body || !poiSlug) {
        selectPoi(null);
        setActivePoi(null);
        return;
      }

      void poiRepository.listPoisByBody(body.id).then((pois) => {
        const poi = pois.find((item) => item.slug === poiSlug) ?? null;
        setActivePoi(poi);
        selectPoi(poi?.id ?? null);
      });
    });
  }, [planetSlug, poiSlug, selectBody, selectPoi]);

  useEffect(() => {
    if (activePoi) {
      useMetricsStore.getState().recordPoiOpened(activePoi.id);
    }
  }, [activePoi]);

  useEffect(() => {
    const handleUnload = () => {
      useMetricsStore.getState().endSession();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Bila tombol Escape ditekan saat di halaman utama planet (tanpa POI), kembali ke tata surya
      if (event.key === 'Escape' && planetSlug && !poiSlug) {
        navigate('/');
        requestCameraReset();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, planetSlug, poiSlug, requestCameraReset]);

  const handleClosePoi = () => {
    selectPoi(null);
    setActivePoi(null);
    if (activeBody) {
      navigate(`/planet/${activeBody.slug}`);
    } else {
      navigate('/');
    }
  };

  // Pengumuman dinamis ramah pembaca layar saat fokus berpindah
  const currentAnnouncement = useMemo(() => {
    if (activeBody && activePoi) {
      return id.announcements.viewingPoi(activePoi.name, activeBody.name);
    }
    if (activeBody) {
      const typeLabel =
        activeBody.type === 'star'
          ? 'Bintang'
          : activeBody.type === 'moon'
            ? 'Bulan'
            : 'Planet';
      return id.announcements.viewingBody(activeBody.name, typeLabel);
    }
    return id.announcements.solarSystemView;
  }, [activeBody, activePoi]);

  // Bila WebGL2 tidak didukung perangkat, alihkan ke halaman ramah teks
  if (!hasWebGL2) {
    return <WebGLFallback />;
  }

  return (
    <>
      {/* Tautan lewati ke konten utama untuk pengguna papan ketik */}
      <a href="#main-canvas" className="skip-link">
        {id.skipLink}
      </a>

      <main
        id="main-canvas"
        className="relative h-full w-full"
        tabIndex={-1}
        role="region"
        aria-label={id.canvasLabel}
        aria-roledescription={id.canvasRoleDesc}
      >
        {/* Status ARIA Live untuk Pembaca Layar */}
        <div className="sr-only" role="status" aria-live="polite">
          {currentAnnouncement}
        </div>

        {/* Indikator Pemuatan Aset Non-Blocking */}
        <AssetLoadingIndicator />

        <Canvas
          camera={{ position: [0, 8, 16], fov: 45 }}
          dpr={[1, qualityParams.maxDpr]}
          gl={{ antialias: quality !== 'low' }}
        >
          {/* Pemantau performa otomatis (FR-12): bila FPS anjlok di bawah 30, turunkan satu tier */}
          <PerformanceMonitor
            onDecline={() => {
              useQualityStore.getState().triggerAutoDecline();
            }}
          />
          <SolarSystem />
        </Canvas>

        <Hud />

        {/* Panel Detail POI saat aktif (hanya bila tidak sedang dalam mode tur) */}
        {activeBody && activePoi && !activeTour && (
          <PoiPanel
            poi={activePoi}
            body={activeBody}
            onClose={handleClosePoi}
          />
        )}

        {/* Pemutar Tur Sinematik Overlay saat tur sedang aktif */}
        <TourPlayerOverlay />

        {import.meta.env.DEV ? <FpsOverlay /> : null}
      </main>
    </>
  );
}

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import { FALLBACK_PLANETS, FALLBACK_HISTORY_EVENTS } from '@/data/fallbackMasterData';
import type { Planet, HistoryEvent } from '@/types/database';

import { PlanetMesh } from './PlanetMesh';
import { BoundaryZone } from './BoundaryZone';
import { Spacecraft } from './Spacecraft';
import { HistoryPOIMarkers } from './HistoryPOIMarkers';
import { PhenomenonStage } from './PhenomenonStage';

export default function AstroCanvas() {
  const activePlanetId = useSceneStore((state) => state.activePlanetId);
  const mode = useSceneStore((state) => state.mode);
  const activePhenomenon = useSceneStore((state) => state.activePhenomenon);
  const activePoi = useSceneStore((state) => state.activePoi);

  const [planetData, setPlanetData] = useState<Planet>(
    FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth
  );
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [planetRotationY, setPlanetRotationY] = useState(0);

  const orbitControlsRef = useRef<OrbitControlsImpl>(null);

  // Ambil data planet aktif & POI dari Supabase (dengan fallback)
  useEffect(() => {
    let isMounted = true;

    async function loadPlanetDetails() {
      try {
        const [planetRes, eventsRes] = await Promise.all([
          supabase
            .from('planets')
            .select('*')
            .eq('planet_id', activePlanetId)
            .maybeSingle(),
          supabase
            .from('history_events')
            .select('*')
            .eq('planet_id', activePlanetId),
        ]);

        if (isMounted) {
          if (planetRes.data) {
            // Jika planet ini dinonaktifkan oleh admin, otomatis alihkan pemain ke Bumi
            if (planetRes.data.is_active === false) {
              useSceneStore.getState().setActivePlanetId('earth');
              return;
            }
            setPlanetData(planetRes.data);
          } else {
            setPlanetData(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
          }

          if (eventsRes.data && eventsRes.data.length > 0) {
            setHistoryEvents(eventsRes.data);
          } else {
            setHistoryEvents(FALLBACK_HISTORY_EVENTS[activePlanetId] || []);
          }
        }
      } catch (err) {
        console.warn('Menggunakan fallback data ilmiah:', err);
        if (isMounted) {
          setPlanetData(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
          setHistoryEvents(FALLBACK_HISTORY_EVENTS[activePlanetId] || []);
        }
      }
    }

    loadPlanetDetails();

    // Realtime subscriptions ke tabel planets dan history_events (M-03)
    const channel = supabase
      .channel(`public:realtime_canvas_${activePlanetId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planets' },
        () => {
          loadPlanetDetails();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'history_events', filter: `planet_id=eq.${activePlanetId}` },
        () => {
          loadPlanetDetails();
        }
      )
      .subscribe();

    const handleFocus = () => loadPlanetDetails();
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [activePlanetId]);

  // Efek fokus kamera saat POI dipilih di mode HISTORY (R04)
  useEffect(() => {
    if (activePoi && orbitControlsRef.current && mode === 'HISTORY') {
      const radius = Number(planetData.batas_zona_radius) || 30;
      // Geser kamera sedikit mendekat ke arah depan planet
      orbitControlsRef.current.target.set(0, 0, 0);
      orbitControlsRef.current.minDistance = 6;
      orbitControlsRef.current.maxDistance = radius;
    }
  }, [activePoi, mode, planetData]);

  const batasZonaRadius = useMemo(
    () => Number(planetData.batas_zona_radius) || 32,
    [planetData.batas_zona_radius]
  );

  return (
    <div className="absolute inset-0 h-full w-full bg-slate-950 overflow-hidden">
      <Canvas
        camera={{ position: [0, 4, 18], fov: 50, near: 0.1, far: 2000 }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        {/* Latar Belakang Bintang Realistis */}
        <color attach="background" args={['#030712']} />
        <Stars radius={300} depth={80} count={6000} factor={4} saturation={0.5} fade speed={1} />

        {/* Pencahayaan Kosmis */}
        <ambientLight intensity={0.25} />
        <directionalLight
          position={[25, 12, 18]}
          intensity={1.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-20, -10, -15]} intensity={0.3} color="#38bdf8" />

        {/* Scene Komponen Utama */}
        {mode !== 'PHENOMENON' ? (
          <>
            {/* Bola Planet Utama */}
            <PlanetMesh
              planet={planetData}
              onRotationUpdate={setPlanetRotationY}
            />

            {/* Titik POI Linimasa Sejarah (R04) */}
            <HistoryPOIMarkers
              events={historyEvents}
              planetRadius={planetData.skala_visual ? Number(planetData.skala_visual) * 4.0 : 4.0}
              planetRotationY={planetRotationY}
            />

            {/* Batas Zona Radius 80% (R02) */}
            <BoundaryZone radius={batasZonaRadius} />

            {/* Pesawat Pemain & Kontrol Terbang (R02, R03, R09) */}
            <Spacecraft batasZonaRadius={batasZonaRadius} />

            {/* Orbit Controls (Aktif saat bukan mode eksplorasi terbang agar bebas putar 360°) */}
            {mode !== 'EXPLORE' && (
              <OrbitControls
                ref={orbitControlsRef}
                enablePan={false}
                minDistance={5.5}
                maxDistance={batasZonaRadius * 1.1}
                rotateSpeed={0.8}
                zoomSpeed={1.0}
                autoRotate={mode === 'DESCRIPTION'}
                autoRotateSpeed={0.5}
              />
            )}
          </>
        ) : (
          /* Mode Simulasi Fenomena Khusus (R14) */
          <>
            <PhenomenonStage phenomenon={activePhenomenon} />
            <OrbitControls
              enablePan={false}
              minDistance={10}
              maxDistance={80}
              rotateSpeed={0.8}
            />
          </>
        )}
      </Canvas>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSceneStore } from '@/store/useSceneStore';
import { supabase } from '@/lib/supabase/client';
import type { Planet, HistoryEvent } from '@/types/database';

import { PlanetMesh } from './PlanetMesh';
import { BoundaryZone } from './BoundaryZone';
import { Spacecraft } from './Spacecraft';
import { HistoryPOIMarkers } from './HistoryPOIMarkers';
import { PhenomenonStage } from './PhenomenonStage';

// Fallback data planet ilmiah offline jika jaringan terputus (PRD R01)
const FALLBACK_PLANETS: Record<string, Planet> = {
  mercury: {
    planet_id: 'mercury',
    urutan_orbit: 1,
    nama: 'Merkurius',
    diameter_km: 4879,
    rotation_period_hours: 1407.6,
    orbital_period_days: 87.97,
    axial_tilt_deg: 0.034,
    deskripsi_materi: 'Planet terdekat dengan Matahari dan terkecil di Tata Surya.',
    aset_model_url: '/models/planets/mercury.glb',
    skala_visual: 0.8,
    batas_zona_radius: 26,
    updated_at: new Date().toISOString(),
  },
  venus: {
    planet_id: 'venus',
    urutan_orbit: 2,
    nama: 'Venus',
    diameter_km: 12104,
    rotation_period_hours: -5832.5,
    orbital_period_days: 224.7,
    axial_tilt_deg: 177.36,
    deskripsi_materi: 'Planet terpanas di Tata Surya dengan rotasi retrograde unik.',
    aset_model_url: '/models/planets/venus.glb',
    skala_visual: 0.95,
    batas_zona_radius: 30,
    updated_at: new Date().toISOString(),
  },
  earth: {
    planet_id: 'earth',
    urutan_orbit: 3,
    nama: 'Bumi',
    diameter_km: 12742,
    rotation_period_hours: 23.93,
    orbital_period_days: 365.25,
    axial_tilt_deg: 23.44,
    deskripsi_materi: 'Satu-satunya planet berpenghuni dengan air cair di permukaannya.',
    aset_model_url: '/models/planets/earth.glb',
    skala_visual: 1.0,
    batas_zona_radius: 32,
    updated_at: new Date().toISOString(),
  },
  mars: {
    planet_id: 'mars',
    urutan_orbit: 4,
    nama: 'Mars',
    diameter_km: 6779,
    rotation_period_hours: 24.62,
    orbital_period_days: 687.0,
    axial_tilt_deg: 25.19,
    deskripsi_materi: 'Planet Merah dengan gunung berapi tertinggi dan lembah terdalam.',
    aset_model_url: '/models/planets/mars.glb',
    skala_visual: 0.85,
    batas_zona_radius: 28,
    updated_at: new Date().toISOString(),
  },
  jupiter: {
    planet_id: 'jupiter',
    urutan_orbit: 5,
    nama: 'Jupiter',
    diameter_km: 139820,
    rotation_period_hours: 9.93,
    orbital_period_days: 4332.59,
    axial_tilt_deg: 3.13,
    deskripsi_materi: 'Planet terbesar berputar paling cepat dengan Badai Merah Raksasa.',
    aset_model_url: '/models/planets/jupiter.glb',
    skala_visual: 1.5,
    batas_zona_radius: 45,
    updated_at: new Date().toISOString(),
  },
  saturn: {
    planet_id: 'saturn',
    urutan_orbit: 6,
    nama: 'Saturnus',
    diameter_km: 116460,
    rotation_period_hours: 10.7,
    orbital_period_days: 10759.22,
    axial_tilt_deg: 26.73,
    deskripsi_materi: 'Raksasa gas dengan sistem cincin es paling megah di Tata Surya.',
    aset_model_url: '/models/planets/saturn.glb',
    skala_visual: 1.35,
    batas_zona_radius: 42,
    updated_at: new Date().toISOString(),
  },
  uranus: {
    planet_id: 'uranus',
    urutan_orbit: 7,
    nama: 'Uranus',
    diameter_km: 50724,
    rotation_period_hours: -17.24,
    orbital_period_days: 30685.4,
    axial_tilt_deg: 97.77,
    deskripsi_materi: 'Raksasa es yang menggelinding miring dengan rotasi retrograde.',
    aset_model_url: '/models/planets/uranus.glb',
    skala_visual: 1.15,
    batas_zona_radius: 36,
    updated_at: new Date().toISOString(),
  },
  neptune: {
    planet_id: 'neptune',
    urutan_orbit: 8,
    nama: 'Neptunus',
    diameter_km: 49244,
    rotation_period_hours: 16.11,
    orbital_period_days: 60189.0,
    axial_tilt_deg: 28.32,
    deskripsi_materi: 'Planet terluar berwarna biru pekat dengan angin supersonik.',
    aset_model_url: '/models/planets/neptune.glb',
    skala_visual: 1.1,
    batas_zona_radius: 35,
    updated_at: new Date().toISOString(),
  },
};

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
            setPlanetData(planetRes.data);
          } else {
            setPlanetData(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
          }

          if (eventsRes.data) {
            setHistoryEvents(eventsRes.data);
          }
        }
      } catch (err) {
        console.warn('Menggunakan fallback data ilmiah:', err);
        if (isMounted) {
          setPlanetData(FALLBACK_PLANETS[activePlanetId] || FALLBACK_PLANETS.earth);
        }
      }
    }

    loadPlanetDetails();

    return () => {
      isMounted = false;
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

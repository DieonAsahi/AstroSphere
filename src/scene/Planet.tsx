import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import type { CelestialBody, PointOfInterest } from '../data/types';
import {
  calculateEllipticalOrbitPosition,
  educationalPlanetRadius,
  latLonToPlanetSurface,
} from '../lib/math3d';
import { useQualityStore } from '../state/qualityStore';
import { useSceneStore } from '../state/sceneStore';
import pois from '../data/pois.json';
import { PoiMarker } from './PoiMarker';
import { ProceduralBody } from './ProceduralBody';
import { ParticleStorm } from './ParticleStorm';
import { JupiterCloudBands } from './JupiterCloudBands';

const planetPalette: Record<string, string> = {
  mercury: '#aaa6a1',
  venus: '#d8ad72',
  earth: '#3978b5',
  mars: '#c66a43',
  jupiter: '#d2b58b',
  saturn: '#d9ca96',
  uranus: '#81c4d4',
  neptune: '#416bd4',
};

interface PlanetProps {
  body: CelestialBody;
  orbitDistance: number;
}

export function Planet({ body, orbitDistance }: PlanetProps) {
  const navigate = useNavigate();
  const group = useRef<THREE.Group>(null);
  const rotationPivot = useRef<THREE.Group>(null);
  const simulationDays = useRef(0);
  const [hovered, setHovered] = useState(false);
  const selectedBodyId = useSceneStore((state) => state.selectedBodyId);
  const quality = useQualityStore((state) => state.quality);
  const segments = quality === 'high' ? 64 : quality === 'mid' ? 40 : 24;
  const radius =
    body.diameterKm === null ? 1 : educationalPlanetRadius(body.diameterKm);
  const selected = selectedBodyId === body.id;
  const bodyPois = (pois as PointOfInterest[]).filter(
    (poi) => poi.bodyId === body.id,
  );

  useFrame((_, delta) => {
    const state = useSceneStore.getState();
    if (!state.isOrbitPaused) {
      simulationDays.current += delta * state.simulationTimeScale;
    }
    if (!group.current || !rotationPivot.current) return;
    const meanAnomaly =
      (simulationDays.current / (body.orbitPeriodDays ?? 365)) * Math.PI * 2;
    const [x, y, z] = calculateEllipticalOrbitPosition({
      semiMajorAxisAu: orbitDistance,
      eccentricity: body.eccentricity ?? 0,
      inclinationDeg: body.inclinationDeg ?? 0,
      meanAnomalyRad: meanAnomaly,
    });
    group.current.position.set(x, y, z);
    const rotation =
      simulationDays.current *
      (24 / Math.abs(body.rotationPeriodH ?? 24)) *
      Math.PI *
      2;
    rotationPivot.current.rotation.y = rotation;
  });

  const focusPlanet = () => {
    useSceneStore.getState().selectBody(body.id);
    navigate(`/planet/${body.slug}`);
  };

  return (
    <group ref={group} scale={selectedBodyId && !selected ? 0.88 : 1}>
      <group
        ref={rotationPivot}
        rotation={[THREE.MathUtils.degToRad(body.axialTiltDeg ?? 0), 0, 0]}
        name={body.name}
      >
        <mesh
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation();
            focusPlanet();
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'default';
          }}
        >
          <sphereGeometry args={[radius, segments, segments]} />
          {body.id === 'jupiter' ? null : (
            <ProceduralBody
              color={planetPalette[body.id] ?? '#9ca9c8'}
              bands={['saturn', 'uranus', 'neptune'].includes(body.id)}
            />
          )}
        </mesh>
        {body.id === 'jupiter' && <JupiterCloudBands radius={radius} />}
        {/* Sistem partikel badai GPU untuk fenomena atmosfer */}
        {bodyPois.map((poi) =>
          poi.particleConfig ? (
            <ParticleStorm
              key={`storm-${poi.id}`}
              poi={poi}
              planetRadius={radius}
            />
          ) : null,
        )}
        {(hovered || selected) && (
          <mesh scale={1.065} rotation={[0, 0, 0]}>
            <sphereGeometry args={[radius, segments, segments]} />
            <meshBasicMaterial
              color={planetPalette[body.id] ?? '#ffffff'}
              side={THREE.BackSide}
              transparent
              opacity={0.7}
            />
          </mesh>
        )}
        {selected
          ? bodyPois.map((poi) => (
              <PoiMarker
                key={poi.id}
                poi={poi}
                position={latLonToPlanetSurface(
                  poi.lat,
                  poi.lon,
                  radius * 1.02,
                )}
                radius={radius}
                onSelect={() => navigate(`/planet/${body.slug}/${poi.slug}`)}
              />
            ))
          : null}
        {(hovered || selected) && (
          <Html position={[0, radius * 1.35, 0]} center distanceFactor={18}>
            <div className="chip" style={{ whiteSpace: 'nowrap' }}>
              {body.name}
            </div>
          </Html>
        )}
        {body.id === 'saturn' && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 1.3, radius * 2.05, segments * 2]} />
            <meshStandardMaterial
              color="#d4bd85"
              roughness={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

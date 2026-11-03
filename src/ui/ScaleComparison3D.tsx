import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useState } from 'react';
import type { PointOfInterest } from '../data/types';
import { id } from '../lib/i18n/id';

interface ScaleComparison3DProps {
  poi: PointOfInterest;
}

function MountainComparisonMesh({ wireframe }: { wireframe: boolean }) {
  // Height scale: 1 unit = 10 km
  // Everest: 8.848 km -> height ~0.885 unit
  // Olympus Mons: 21.9 km -> height ~2.19 units
  return (
    <group position={[0, -1, 0]}>
      {/* Ground plane / baseline (0 km) */}
      <gridHelper args={[8, 8, '#6887a8', '#1e293b']} position={[0, 0, 0]} />

      {/* Gunung Everest (Bumi) */}
      <group position={[-1.8, 0, 0]}>
        <mesh position={[0, 0.442, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.7, 0.885, 32]} />
          <meshStandardMaterial
            color="#7889a4"
            roughness={0.7}
            wireframe={wireframe}
          />
        </mesh>
        {/* Snowy peak */}
        <mesh position={[0, 0.74, 0]}>
          <coneGeometry args={[0.26, 0.3, 32]} />
          <meshStandardMaterial
            color="#f1f5f9"
            roughness={0.4}
            wireframe={wireframe}
          />
        </mesh>
      </group>

      {/* Olympus Mons (Mars) - Gunung berapi perisai raksasa dengan kaldera */}
      <group position={[1.4, 0, 0]}>
        {/* Main broad shield volcano base */}
        <mesh position={[0, 1.095, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 2.2, 2.19, 40]} />
          <meshStandardMaterial
            color="#d66a35"
            roughness={0.8}
            wireframe={wireframe}
          />
        </mesh>
        {/* Caldera rim depression */}
        <mesh position={[0, 2.18, 0]}>
          <cylinderGeometry args={[0.48, 0.52, 0.08, 32]} />
          <meshStandardMaterial
            color="#8c3917"
            roughness={0.9}
            wireframe={wireframe}
          />
        </mesh>
      </group>
    </group>
  );
}

function StormComparisonMesh({ wireframe }: { wireframe: boolean }) {
  // Scale: 1 unit = 10,000 km
  // Earth: 12,742 km -> diameter 1.274 unit (radius ~0.637)
  // Great Red Spot: 16,350 km -> width 1.635 unit (radius ~0.817)
  return (
    <group position={[0, 0, 0]}>
      {/* Baseline */}
      <gridHelper args={[6, 6, '#6887a8', '#1e293b']} position={[0, -1.2, 0]} />

      {/* Bumi (Planet Pembanding) */}
      <group position={[-1.4, 0, 0]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.637, 32, 32]} />
          <meshStandardMaterial
            color="#3b82f6"
            roughness={0.5}
            wireframe={wireframe}
          />
        </mesh>
      </group>

      {/* Badai Merah Raksasa (Jupiter) */}
      <group position={[1.4, 0, 0]} scale={[1, 0.72, 1]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.817, 36, 36]} />
          <meshStandardMaterial
            color="#d9532f"
            roughness={0.7}
            wireframe={wireframe}
          />
        </mesh>
      </group>
    </group>
  );
}

export function ScaleComparison3D({ poi }: ScaleComparison3DProps) {
  const [wireframe, setWireframe] = useState(false);
  const isStorm = poi.type === 'badai';

  return (
    <div className="scale-comparison-3d" aria-label={id.poi.comparisonTitle}>
      <div className="scale-comparison-3d__header">
        <div>
          <h4 className="scale-comparison-3d__title">
            {id.poi.comparisonTitle}
          </h4>
          <p className="scale-comparison-3d__subtitle">
            {id.poi.comparisonSubtitle}
          </p>
        </div>
        <label className="scale-comparison-3d__toggle">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
            aria-label={id.poi.wireframe}
          />
          <span>{id.poi.wireframe}</span>
        </label>
      </div>

      <div
        className="scale-comparison-3d__canvas"
        aria-label={`Visualisasi perbandingan skala 3D ${poi.name}`}
      >
        <Canvas camera={{ position: [0, 1.5, 6.2], fov: 40 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#060c18']} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[5, 8, 5]} intensity={1.8} />
          <directionalLight position={[-4, 2, -3]} intensity={0.4} />

          {isStorm ? (
            <StormComparisonMesh wireframe={wireframe} />
          ) : (
            <MountainComparisonMesh wireframe={wireframe} />
          )}

          <OrbitControls
            enablePan={false}
            minDistance={4}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>

      <div className="scale-comparison-3d__legend">
        {isStorm ? (
          <>
            <div className="scale-comparison-card">
              <span
                className="scale-legend-swatch"
                style={{ backgroundColor: '#3b82f6' }}
              />
              <div className="scale-card-info">
                <strong>{id.poi.earthLabel}</strong>
                <span className="scale-card-val">{id.poi.earthSize}</span>
                <small>{id.poi.earthSource}</small>
              </div>
            </div>
            <div className="scale-comparison-card scale-comparison-card--target">
              <span
                className="scale-legend-swatch"
                style={{ backgroundColor: '#d9532f' }}
              />
              <div className="scale-card-info">
                <strong>{id.poi.grsLabel}</strong>
                <span className="scale-card-val">{id.poi.grsSize}</span>
                <small>{id.poi.grsSource}</small>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="scale-comparison-card">
              <span
                className="scale-legend-swatch"
                style={{ backgroundColor: '#7889a4' }}
              />
              <div className="scale-card-info">
                <strong>{id.poi.everestLabel}</strong>
                <span className="scale-card-val">{id.poi.everestHeight}</span>
                <small>{id.poi.everestSource}</small>
              </div>
            </div>
            <div className="scale-comparison-card scale-comparison-card--target">
              <span
                className="scale-legend-swatch"
                style={{ backgroundColor: '#d66a35' }}
              />
              <div className="scale-card-info">
                <strong>{id.poi.olympusLabel}</strong>
                <span className="scale-card-val">{id.poi.olympusHeight}</span>
                <small>{id.poi.olympusSource}</small>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

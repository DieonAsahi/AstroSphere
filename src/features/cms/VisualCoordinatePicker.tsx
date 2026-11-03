import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { latLonToPlanetSurface, unitVectorToLatLon } from '../../lib/math3d';
import { isWebGL2Available } from '../../lib/webgl';

interface VisualCoordinatePickerProps {
  planetName?: string;
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}

const SPHERE_RADIUS = 2.0;

function PlanetSphere({
  lat,
  lon,
  onChange,
}: {
  lat: number;
  lon: number;
  onChange: (lat: number, lon: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Posisi pin 3D di permukaan bola planet
  const pinPosition = useMemo(() => {
    return latLonToPlanetSurface(lat, lon, SPHERE_RADIUS);
  }, [lat, lon]);

  // Vektor normal outward dari pusat bola
  const normalDirection = useMemo(() => {
    return pinPosition.clone().normalize();
  }, [pinPosition]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!e.point) return;
    const coords = unitVectorToLatLon(e.point);
    onChange(coords.lat, coords.lon);
  };

  return (
    <group>
      {/* Bola 3D Planet */}
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        data-testid="planet-sphere-mesh"
      >
        <sphereGeometry args={[SPHERE_RADIUS, 36, 36]} />
        <meshStandardMaterial
          color="#c25b33"
          roughness={0.7}
          metalness={0.1}
          wireframe={false}
        />
      </mesh>

      {/* Grid garis bujur & lintang halus sebagai panduan */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS + 0.005, 18, 18]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe={true}
          transparent={true}
          opacity={0.15}
        />
      </mesh>

      {/* Penanda Pin 3D di Lokasi POI */}
      <group position={pinPosition}>
        {/* Kepala pin (glowing cyan sphere) */}
        <mesh position={normalDirection.clone().multiplyScalar(0.2)}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0284c7"
            emissiveIntensity={1.5}
          />
        </mesh>
        {/* Batang jarum pin menancap ke permukaan */}
        <mesh position={normalDirection.clone().multiplyScalar(0.1)}>
          <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

export function VisualCoordinatePicker({
  planetName = 'Planet',
  lat,
  lon,
  onChange,
}: VisualCoordinatePickerProps) {
  const hasWebGL = typeof window !== 'undefined' && isWebGL2Available();

  return (
    <div
      className="visual-picker-container"
      role="region"
      aria-label={`Penentu Koordinat Visual 3D ${planetName}`}
    >
      <div className="visual-picker-header">
        <div>
          <h3 className="visual-picker-title">
            📍 Penentu Koordinat Visual 3D ({planetName})
          </h3>
          <p className="visual-picker-help">
            Klik langsung pada permukaan bola 3D planet untuk menetapkan titik
            lintang dan bujur. Putar bola dengan menyeret kursor (drag).
          </p>
        </div>
        <div className="visual-picker-readout">
          <span className="visual-picker-coord tabular-nums">
            Lat: <strong>{lat.toFixed(2)}°</strong>
          </span>
          <span className="visual-picker-coord tabular-nums">
            Lon: <strong>{lon.toFixed(2)}°</strong>
          </span>
        </div>
      </div>

      <div className="visual-picker-canvas-box">
        {hasWebGL ? (
          <Canvas
            camera={{ position: [0, 0, 4.8], fov: 45 }}
            style={{ width: '100%', height: '260px', background: '#050816' }}
            tabIndex={0}
            aria-label="Kanvas 3D penentu koordinat planet"
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 3, 5]} intensity={1.2} />
            <pointLight position={[-5, -2, -3]} intensity={0.5} />
            <PlanetSphere lat={lat} lon={lon} onChange={onChange} />
            <OrbitControls
              enablePan={false}
              minDistance={3}
              maxDistance={8}
              rotateSpeed={0.8}
            />
          </Canvas>
        ) : (
          <div
            className="visual-picker-fallback"
            data-testid="visual-picker-fallback"
          >
            <p className="text-secondary" style={{ fontSize: '13px' }}>
              Simulasi Koordinat Planet ({planetName}):
            </p>
            <div className="visual-picker-presets">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(0, 0)}
              >
                Khatulistiwa (0°, 0°)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(18.65, 226.2)}
              >
                Olympus Mons (18.65°, 226.2°)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(-22, 270)}
              >
                Badai Merah (-22°, 270°)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onChange(90, 0)}
              >
                Kutub Utara (90°, 0°)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

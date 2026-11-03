import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { PointOfInterest } from '../data/types';
import { id } from '../lib/i18n/id';
import { generateProceduralTerrainData } from '../lib/proceduralTerrain';

interface TerrainViewerProps {
  poi: PointOfInterest;
}

interface TerrainMeshProps {
  exaggeration: number;
  wireframe: boolean;
  poi: PointOfInterest;
}

export function TerrainMesh({
  exaggeration,
  wireframe,
  poi,
}: TerrainMeshProps) {
  // Pre-alokasikan PlaneGeometry satu kali saja, tidak dialokasikan ulang saat slider bergeser
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(5.6, 5.6, 72, 72);
    const pos = geo.attributes.position as THREE.BufferAttribute;

    const { heights, colors } = generateProceduralTerrainData(
      pos.count,
      poi,
      (idx) => pos.getX(idx),
      (idx) => pos.getY(idx),
    );

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.userData.baseHeights = heights;

    // Terapkan elevasi awal
    for (let i = 0; i < pos.count; i += 1) {
      pos.setZ(i, heights[i]);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    return geo;
  }, [poi]);

  // Perbarui ketinggian verteks secara in-place saat pembesaran vertikal berubah
  useEffect(() => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const baseHeights = geometry.userData.baseHeights as Float32Array;
    if (!pos || !baseHeights) return;

    for (let i = 0; i < pos.count; i += 1) {
      pos.setZ(i, baseHeights[i] * exaggeration);
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [exaggeration, geometry]);

  // Bersihkan memori GPU saat unmount
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      rotation={[-Math.PI / 2.2, 0, 0]}
      receiveShadow
      castShadow
    >
      <meshStandardMaterial
        vertexColors
        wireframe={wireframe}
        roughness={0.78}
        metalness={0.12}
      />
    </mesh>
  );
}

export function TerrainViewer({ poi }: TerrainViewerProps) {
  const [exaggeration, setExaggeration] = useState(1.0);
  const [wireframe, setWireframe] = useState(false);
  const legendStops = useMemo(
    () => [
      { color: '#2563eb', label: id.poi.elevationLow },
      { color: '#d97706', label: id.poi.elevationMid },
      { color: '#fed7aa', label: id.poi.elevationHigh },
    ],
    [],
  );

  // Ambil referensi dimensi tinggi asli untuk sumbu skala
  const heightDimension = poi.dimensions.find((dim) =>
    dim.label.toLowerCase().includes('tinggi'),
  );
  const maxRealKm = heightDimension?.nilai ?? 21.9;
  const scaledKm = (maxRealKm * exaggeration).toFixed(1);

  return (
    <div
      className="terrain-viewer"
      aria-label={id.poi.terrainCanvasAria(poi.name)}
    >
      {/* Banner informasi model ilustrasi */}
      <div className="terrain-viewer__notice" role="status">
        <span className="terrain-notice-badge">
          {id.poi.terrainNoticeTitle}
        </span>
        <p className="terrain-notice-desc">{id.poi.terrainNoticeDesc}</p>
      </div>

      {/* Kanvas 3D Interaktif */}
      <div
        className="terrain-viewer__canvas"
        aria-label={id.poi.terrainCanvasAria(poi.name)}
      >
        <Canvas camera={{ position: [0, 4.8, 6.8], fov: 42 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#050b16']} />
          <ambientLight intensity={0.65} />
          <directionalLight position={[5, 8, 4]} intensity={2.0} castShadow />
          <directionalLight position={[-4, 3, -4]} intensity={0.35} />

          <TerrainMesh
            exaggeration={exaggeration}
            wireframe={wireframe}
            poi={poi}
          />

          <gridHelper
            args={[8, 16, '#6887a8', '#1e293b']}
            position={[0, -0.05, 0]}
          />
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={4}
            maxDistance={12}
            minPolarAngle={Math.PI / 8}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </div>

      {/* Kontrol interaktif: slider elevasi dan toggle wireframe */}
      <div className="terrain-controls">
        <div className="terrain-control-group">
          <label
            htmlFor="terrain-exaggeration-slider"
            className="terrain-label"
          >
            <span>{id.poi.verticalExaggeration}</span>
            <span className="tabular-nums font-semibold">
              {exaggeration.toFixed(1)}×
            </span>
          </label>
          <input
            id="terrain-exaggeration-slider"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            value={exaggeration}
            onChange={(e) => setExaggeration(Number(e.target.value))}
            className="terrain-slider"
            aria-valuemin={0.5}
            aria-valuemax={3.0}
            aria-valuenow={exaggeration}
            aria-valuetext={`${exaggeration.toFixed(1)} kali`}
          />
        </div>

        <label className="terrain-toggle">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
            aria-label={id.poi.wireframe}
          />
          <span>{id.poi.wireframe}</span>
        </label>
      </div>

      {/* Legenda Ketinggian & Sumbu Skala */}
      <div className="terrain-scale-container">
        <div className="terrain-scale-axis">
          <div className="terrain-scale-header">
            <span>{id.poi.scaleAxis}</span>
            <span className="terrain-scale-val tabular-nums">
              Puncak: ~{scaledKm} km
            </span>
          </div>
          <div className="terrain-scale-bar" aria-hidden="true" />
        </div>

        <div className="terrain-legend" aria-label={id.poi.elevationLegend}>
          <div className="terrain-legend-gradient" aria-hidden="true" />
          <div className="terrain-legend-labels">
            {legendStops.map((stop) => (
              <span key={stop.label} className="terrain-legend-item">
                <i
                  className="terrain-legend-swatch"
                  style={{ backgroundColor: stop.color }}
                />
                {stop.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

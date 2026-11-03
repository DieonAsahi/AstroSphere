import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GlassPanel } from '../../ui/GlassPanel';
import { isWebGL2Available } from '../../lib/webgl';
import type { CmsAsset } from './types';

interface AssetPreviewViewerProps {
  asset: CmsAsset;
  onClose?: () => void;
}

function TexturePreviewSphere() {
  // Gunakan material dengan warna aksen jika tekstur lokal/mock
  return (
    <mesh>
      <sphereGeometry args={[1.8, 36, 36]} />
      <meshStandardMaterial
        color="#e07a5f"
        roughness={0.6}
        metalness={0.1}
        wireframe={false}
      />
    </mesh>
  );
}

function ModelPreviewBox() {
  return (
    <group>
      <mesh>
        <dodecahedronGeometry args={[1.5, 0]} />
        <meshStandardMaterial color="#38bdf8" wireframe={true} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[1.0, 0]} />
        <meshStandardMaterial color="#818cf8" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

function TerrainPreviewPlane() {
  // Simulasi relief topografi 3D
  const geometry = new THREE.PlaneGeometry(3, 3, 32, 32);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Simple Gaussian bump for preview
    const z = Math.exp(-(x * x + y * y)) * 0.8;
    pos.setZ(i, z);
  }
  geometry.computeVertexNormals();

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 3, 0, 0]}>
      <meshStandardMaterial
        color="#c25b33"
        wireframe={false}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

export function AssetPreviewViewer({
  asset,
  onClose,
}: AssetPreviewViewerProps) {
  const hasWebGL = typeof window !== 'undefined' && isWebGL2Available();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="tour-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau Aset ${asset.assetType}`}
    >
      <GlassPanel className="asset-preview-modal-card">
        {/* Header Modal */}
        <div className="tour-builder-header">
          <div>
            <span className="tour-badge tour-badge--preview">
              Pratinjau Aset 3D: {asset.assetType.toUpperCase()} (v
              {asset.version})
            </span>
            <h3 className="tour-builder-title" style={{ marginTop: '0.25rem' }}>
              {asset.bodyId
                ? `Target: ${asset.bodyId}`
                : `Target: ${asset.poiId}`}{' '}
              · Kualitas {asset.qualityTier}
            </h3>
          </div>
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              aria-label="Tutup pratinjau aset"
            >
              ✕ Tutup
            </button>
          )}
        </div>

        {/* Viewport 3D Canvas Pratinjau */}
        <div className="asset-preview-viewport">
          {hasWebGL ? (
            <Canvas
              camera={{ position: [0, 0, 4], fov: 45 }}
              style={{
                width: '100%',
                height: '320px',
                background: '#050816',
                borderRadius: '8px',
              }}
            >
              <ambientLight intensity={0.5} />
              <directionalLight position={[5, 5, 5]} intensity={1.2} />
              <pointLight position={[-4, -3, -2]} intensity={0.6} />

              {asset.assetType === 'tekstur' && <TexturePreviewSphere />}
              {asset.assetType === 'terrain' && <TerrainPreviewPlane />}
              {asset.assetType === 'model' && <ModelPreviewBox />}
              {asset.assetType === 'partikel' && <ModelPreviewBox />}

              <OrbitControls autoRotate={true} autoRotateSpeed={1.0} />
            </Canvas>
          ) : (
            <div className="asset-preview-fallback">
              <p>
                Visualisasi 3D ({asset.assetType}) siap ditampilkan di peramban
                WebGL.
              </p>
              <span
                className="font-mono text-secondary"
                style={{ fontSize: '12px' }}
              >
                {asset.fileUrl}
              </span>
            </div>
          )}
        </div>

        {/* Metadata & Kartu Lisensi Hak Cipta */}
        <div className="asset-meta-grid" style={{ marginTop: '1rem' }}>
          <div className="asset-meta-item">
            <span className="asset-meta-label">Format / MIME:</span>
            <span className="font-mono">{asset.mimeType}</span>
          </div>
          <div className="asset-meta-item">
            <span className="asset-meta-label">Ukuran Berkas:</span>
            <span className="tabular-nums">
              {formatSize(asset.fileSizeBytes)}
            </span>
          </div>
          <div className="asset-meta-item">
            <span className="asset-meta-label">Versi:</span>
            <span>v{asset.version}</span>
          </div>
          <div className="asset-meta-item">
            <span className="asset-meta-label">Tingkat Kualitas:</span>
            <span className="progress-tag">{asset.qualityTier}</span>
          </div>
        </div>

        <div className="asset-license-box" style={{ marginTop: '0.75rem' }}>
          <div>
            <strong>Lisensi:</strong> {asset.license}
          </div>
          <div style={{ marginTop: '0.25rem' }}>
            <strong>Atribusi:</strong> {asset.attribution}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

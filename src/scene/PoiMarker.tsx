import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { PointOfInterest } from '../data/types';
import { useProgressStore } from '../features/progress/progressStore';
import { useAuthStore } from '../features/classes/authStore';

interface PoiMarkerProps {
  poi: PointOfInterest;
  position: [number, number, number] | THREE.Vector3;
  radius: number;
  onSelect: () => void;
}

export function PoiMarker({ poi, position, radius, onSelect }: PoiMarkerProps) {
  const marker = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(true);
  const user = useAuthStore((state) => state.user);
  const isVisited = useProgressStore((state) =>
    state.isPoiVisited(poi.id, user?.id),
  );

  // Vektor pembantu yang digunakan ulang dalam useFrame tanpa alokasi objek baru
  const worldPosRef = useRef(new THREE.Vector3());
  const normalRef = useRef(new THREE.Vector3());
  const cameraDirRef = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    if (!marker.current) return;
    marker.current.quaternion.copy(camera.quaternion).invert();

    // Cek keterlihatan POI dari sudut pandang kamera (occlusion di balik planet)
    marker.current.getWorldPosition(worldPosRef.current);
    normalRef.current.copy(worldPosRef.current).normalize();
    cameraDirRef.current
      .copy(camera.position)
      .sub(worldPosRef.current)
      .normalize();

    const isFacingCamera = normalRef.current.dot(cameraDirRef.current) > 0.05;
    if (visible !== isFacingCamera) {
      setVisible(isFacingCamera);
    }

    if (ring.current) {
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.14;
      ring.current.scale.set(pulse, pulse, 1);
    }
  });

  return (
    <group
      ref={marker}
      position={position}
      visible={visible}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
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
      {/* Cincin penanda berkedip lembut (hijau zamrud bila sudah dikunjungi) */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.1, radius * 0.16, 32]} />
        <meshBasicMaterial
          color={isVisited ? '#10b981' : '#ffd166'}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Titik pusat penanda */}
      <mesh position={[0, 0, 0.02]}>
        <circleGeometry args={[radius * 0.055, 24]} />
        <meshBasicMaterial color={isVisited ? '#a7f3d0' : '#fff4bd'} />
      </mesh>

      {/* Label tombol penanda yang dapat diakses penuh via keyboard */}
      <Html position={[0, radius * 0.28, 0]} center distanceFactor={12}>
        <button
          type="button"
          className={`chip poi-marker-chip ${hovered ? 'poi-marker-chip--hovered' : ''} ${
            isVisited ? 'poi-marker-chip--visited' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          data-poi-id={poi.id}
          aria-label={
            isVisited ? `${poi.name} (Sudah dikunjungi)` : `Buka ${poi.name}`
          }
          tabIndex={0}
        >
          <span
            className={`poi-marker-dot ${
              isVisited ? 'poi-marker-dot--visited' : ''
            }`}
            aria-hidden="true"
          />
          {isVisited && (
            <span
              className="poi-visited-checkmark"
              title="Sudah dijelajahi"
              aria-hidden="true"
            >
              ✓
            </span>
          )}
          <span>{poi.name}</span>
        </button>
      </Html>
    </group>
  );
}

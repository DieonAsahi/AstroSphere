'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/store/useSceneStore';

interface BoundaryZoneProps {
  radius: number;
}

export function BoundaryZone({ radius }: BoundaryZoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const nearBoundary = useSceneStore((state) => state.nearBoundary);
  const boundaryRatio = useSceneStore((state) => state.boundaryRatio);
  const mode = useSceneStore((state) => state.mode);

  // Efek denyut peringatan ketika mendekati batas 80% (R02)
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.04;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.02) * 0.05;

    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    if (nearBoundary) {
      // Denyut merah/oranye cepat saat waspada batas
      const pulse = (Math.sin(clock.getElapsedTime() * 8) + 1) * 0.5;
      material.color.setRGB(0.95, 0.25 + pulse * 0.35, 0.15);
      material.opacity = 0.22 + pulse * 0.18;
    } else {
      // Biru/cyan tenang
      material.color.setHex(0x06b6d4);
      material.opacity = Math.max(0.04, Math.min(0.12, (boundaryRatio - 0.4) * 0.2));
    }
  });

  // Hanya tampilkan visual zona di mode eksplorasi
  if (mode !== 'EXPLORE') return null;

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshBasicMaterial
        wireframe
        transparent
        opacity={0.06}
        color="#06b6d4"
        side={THREE.BackSide}
      />
    </mesh>
  );
}

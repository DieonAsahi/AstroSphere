import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { Starfield } from '../../scene/Starfield';
import { useQualityStore } from '../../state/qualityStore';

function RotatingBackdrop() {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = useQualityStore((state) => state.reducedMotion);

  useFrame((_, delta) => {
    if (!reducedMotion && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.04;
      groupRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      <Starfield />
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} />
      {/* Objek kosmik dekoratif di kejauhan */}
      <mesh position={[8, -2, -18]} scale={3.5}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#3a4d7a" roughness={0.8} metalness={0.1} />
      </mesh>
    </group>
  );
}

export function AuthBackdrop3D() {
  return (
    <div
      className="auth-3d-backdrop"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(ellipse at center, #09112a 0%, #050816 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, alpha: true }}
      >
        <RotatingBackdrop />
      </Canvas>
    </div>
  );
}

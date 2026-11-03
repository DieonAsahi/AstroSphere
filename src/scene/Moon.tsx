import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { CelestialBody } from '../data/types';
import { useSceneStore } from '../state/sceneStore';

interface MoonProps {
  body: CelestialBody;
}

export function Moon({ body }: MoonProps) {
  const mesh = useRef<THREE.Mesh>(null);
  const elapsedDays = useRef(0);
  const { scene } = useThree();

  useFrame((_, delta) => {
    const sceneState = useSceneStore.getState();
    if (!sceneState.isOrbitPaused) {
      elapsedDays.current += delta * sceneState.simulationTimeScale;
    }
    if (!mesh.current) return;
    const angle =
      (elapsedDays.current / (body.orbitPeriodDays ?? 27.3)) * Math.PI * 2;
    const parent = scene.getObjectByName('Bumi');
    if (parent) {
      mesh.current.position.copy(parent.position);
    }
    mesh.current.position.x += Math.cos(angle) * 0.9;
    mesh.current.position.z += Math.sin(angle) * 0.9;
  });

  return (
    <mesh ref={mesh} name={body.name}>
      <sphereGeometry args={[0.18, 24, 24]} />
      <meshStandardMaterial color="#b8bec8" roughness={1} />
    </mesh>
  );
}

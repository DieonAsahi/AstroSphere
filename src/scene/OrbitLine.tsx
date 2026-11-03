import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface OrbitLineProps {
  radius: number;
  eccentricity?: number;
  inclinationDeg?: number;
}

export function OrbitLine({
  radius,
  eccentricity = 0,
  inclinationDeg = 0,
}: OrbitLineProps) {
  const points = Array.from({ length: 97 }, (_, index) => {
    const angle = (index / 96) * Math.PI * 2;
    return [
      Math.cos(angle) * radius - radius * eccentricity,
      -Math.sin(angle) *
        radius *
        Math.sin(THREE.MathUtils.degToRad(inclinationDeg)),
      Math.sin(angle) *
        radius *
        Math.sqrt(1 - eccentricity * eccentricity) *
        Math.cos(THREE.MathUtils.degToRad(inclinationDeg)),
    ] as [number, number, number];
  });

  return (
    <Line
      points={points}
      color="#51618f"
      lineWidth={0.6}
      transparent
      opacity={0.55}
    />
  );
}

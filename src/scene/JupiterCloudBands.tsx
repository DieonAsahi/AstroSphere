import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useQualityStore } from '../state/qualityStore';

interface JupiterCloudBandsProps {
  radius: number;
}

// GLSL Shader untuk pita awan atmosfer Jupiter dengan jet stream berlawanan arah
const jupiterAtmosphereVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const jupiterAtmosphereFragmentShader = `
uniform float uTime;
uniform float uReducedMotion;
uniform vec3 uColorZone;
uniform vec3 uColorBeltDark;
uniform vec3 uColorBeltWarm;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Lintang berkisar dari -1.0 (kutub selatan) hingga +1.0 (kutub utara)
  float lat = vPosition.y / length(vPosition);

  // Jet stream zonal: arah dan kecepatan angin horizontal berbeda di tiap lintang
  // Sabuk Khatulistiwa dan Tropis bergerak berlawanan arah
  float jetStreamDirection = sin(lat * 14.0);
  float speed = jetStreamDirection * 0.04;

  float effectiveTime = uReducedMotion > 0.5 ? 0.0 : uTime;
  float uShift = vUv.x + effectiveTime * speed;

  // Pola pita awan berlapis (zona terang dan sabuk gelap)
  float bandWave = sin(lat * 24.0 + sin(uShift * 18.0) * 0.12);
  float microTexture = sin(uShift * 60.0 + lat * 30.0) * cos(lat * 40.0) * 0.06;

  float bandPattern = smoothstep(-0.6, 0.6, bandWave + microTexture);

  // Pencampuran warna atmosfer Jupiter (krem zona, oranye hangat, dan cokelat sabuk)
  vec3 baseColor = mix(uColorBeltDark, uColorZone, bandPattern);
  if (lat > -0.35 && lat < -0.12) {
    // Wilayah Sabuk Khatulistiwa Selatan (SEB) di sekitar Badai Merah Raksasa
    baseColor = mix(baseColor, uColorBeltWarm, 0.45);
  }

  // Efek pencahayaan lembut bola atmosfer (rim lighting / limb darkening)
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float limb = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.2);
  vec3 finalColor = mix(baseColor, vec3(0.12, 0.16, 0.28), limb * 0.5);

  gl_FragColor = vec4(finalColor, 0.94);
}
`;

export function JupiterCloudBands({ radius }: JupiterCloudBandsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const reducedMotion = useQualityStore((state) => state.reducedMotion);
  const quality = useQualityStore((state) => state.quality);
  const segments = quality === 'high' ? 64 : quality === 'mid' ? 40 : 24;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uReducedMotion: { value: reducedMotion ? 1.0 : 0.0 },
      uColorZone: { value: new THREE.Color('#e8d4b8') }, // Krem Zona
      uColorBeltDark: { value: new THREE.Color('#8b4e28') }, // Cokelat gelap Sabuk
      uColorBeltWarm: { value: new THREE.Color('#c26a35') }, // Oranye hangat Sabuk SEB
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((_, delta) => {
    if (materialRef.current) {
      if (!reducedMotion) {
        materialRef.current.uniforms.uTime.value += delta;
      }
      materialRef.current.uniforms.uReducedMotion.value = reducedMotion
        ? 1.0
        : 0.0;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius * 1.002, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={jupiterAtmosphereVertexShader}
        fragmentShader={jupiterAtmosphereFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
      />
    </mesh>
  );
}

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { PointOfInterest } from '../data/types';
import { latLonToPlanetSurface } from '../lib/math3d';
import { useParticleStormStore } from '../state/particleStormStore';
import { useQualityStore } from '../state/qualityStore';

interface ParticleStormProps {
  poi: PointOfInterest;
  planetRadius: number;
}

// GLSL Vertex Shader: Perhitungan posisi partikel sepenuhnya di GPU
const particleVertexShader = `
uniform float uTime;
uniform float uSpeed;
uniform float uVortexRadius;
uniform vec3 uCenter;
uniform vec3 uTangentX;
uniform vec3 uTangentY;
uniform float uPlanetRadius;
uniform float uIsPaused;
uniform float uReducedMotion;
uniform float uDirection;

attribute float aRadius;
attribute float aAngle;
attribute float aSpeedFactor;
attribute float aSize;
attribute float aSeed;

varying float vRadius;
varying float vVelocity;
varying float vSeed;

void main() {
  vRadius = aRadius;
  vSeed = aSeed;

  // Profil kecepatan pusaran antisiklonik (Modified Lamb-Oseen / Rankine profile):
  // 1. Mata badai tenang (aRadius < 0.2): kecepatan mendekati nol
  // 2. Tepi pusaran (collar, aRadius ~ 0.65-0.85): kecepatan tertinggi (430-680 km/jam)
  // 3. Batas luar (aRadius > 0.85): melambat dan berinteraksi dengan sabuk awan
  float collar = 0.72;
  float velocityProfile;
  if (aRadius < collar) {
    velocityProfile = smoothstep(0.04, collar, aRadius);
  } else {
    velocityProfile = 1.0 - smoothstep(collar, 1.05, aRadius) * 0.42;
  }
  vVelocity = velocityProfile;

  // Penanganan aksesibilitas: kurangi animasi menghasilkan garis aliran statis
  float effectiveTime;
  if (uReducedMotion > 0.5) {
    effectiveTime = 0.0;
  } else if (uIsPaused > 0.5) {
    effectiveTime = 0.0;
  } else {
    effectiveTime = uTime * uSpeed;
  }

  // Arah putar: berlawanan arah jarum jam (counter-clockwise)
  // omega = v / r
  float angularVelocity = (0.7 + 1.6 * velocityProfile) * aSpeedFactor * uDirection;
  float currentAngle = aAngle + effectiveTime * angularVelocity;

  // Turbulensi riak aliran atmosfer
  float turbulence = sin(aSeed * 24.0 + effectiveTime * 0.4) * 0.012;
  float rEffective = aRadius + turbulence;

  // Bentuk elips lonjong khas Badai Merah Raksasa (rasio ~1.32 timur-barat vs utara-selatan)
  float xLocal = 1.32 * rEffective * cos(currentAngle) * uVortexRadius;
  float yLocal = 0.96 * rEffective * sin(currentAngle) * uVortexRadius;

  // Proyeksikan ke bidang singgung pada lokasi badai
  vec3 tangentPoint = uCenter + (uTangentX * xLocal) + (uTangentY * yLocal);

  // Lengkungkan ke kelengkungan bola planet pada radius sedikit di atas atmosfer (1.012)
  vec3 sphereSurfacePos = normalize(tangentPoint) * (uPlanetRadius * 1.012);

  vec4 mvPosition = modelViewMatrix * vec4(sphereSurfacePos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Ukuran titik partikel responsif terhadap jarak kamera dan kecepatan
  float sizeFactor = aSize * (0.8 + 0.5 * velocityProfile);
  gl_PointSize = sizeFactor * (170.0 / -mvPosition.z);
}
`;

// GLSL Fragment Shader: Pewarnaan krem ke oranye-merah menyala dengan titik lembut Gaussian
const particleFragmentShader = `
uniform vec3 uColorCore;
uniform vec3 uColorCollar;
uniform vec3 uColorOuter;
uniform float uOpacity;

varying float vRadius;
varying float vVelocity;
varying float vSeed;

void main() {
  // Bentuk partikel bulat lembut dengan gradien Gaussian
  vec2 coord = gl_PointCoord - vec2(0.5);
  float distSq = dot(coord, coord);
  if (distSq > 0.25) discard;

  float softAlpha = smoothstep(0.25, 0.01, distSq);

  // Gradasi warna dari krem (mata badai) -> oranye-merah (collar kecepatan tinggi) -> terakota (tepi)
  vec3 particleColor;
  if (vRadius < 0.3) {
    float t = vRadius / 0.3;
    particleColor = mix(uColorCore, uColorCollar, t);
  } else if (vRadius < 0.78) {
    float t = (vRadius - 0.3) / 0.48;
    particleColor = mix(uColorCollar, uColorCollar * 1.12, sin(t * 3.1415));
  } else {
    float t = (vRadius - 0.78) / 0.22;
    particleColor = mix(uColorCollar, uColorOuter, t);
  }

  // Variasi kecerahan alami antar partikel gas
  particleColor += vec3(sin(vSeed * 30.0) * 0.035);

  gl_FragColor = vec4(particleColor, softAlpha * uOpacity);
}
`;

export function ParticleStorm({ poi, planetRadius }: ParticleStormProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const quality = useQualityStore((state) => state.quality);
  const reducedMotion = useQualityStore((state) => state.reducedMotion);

  const isPaused = useParticleStormStore((state) => state.isPaused);
  const speedMultiplier = useParticleStormStore((state) => state.speed);
  const densityMultiplier = useParticleStormStore((state) => state.density);

  // Konfigurasi dari POI
  const pConfig = poi.particleConfig;
  const baseSpeed = pConfig?.speed ?? 1.0;
  const vortexRadius = pConfig?.vortexRadius ?? 0.32;
  const isCounterClockwise = pConfig?.direction !== 'clockwise'; // Default: counterclockwise di belahan selatan

  // Jumlah partikel berdasarkan tingkat kualitas
  const targetCount = useMemo(() => {
    let countForTier = 15000;
    if (quality === 'high') countForTier = 40000;
    else if (quality === 'mid') countForTier = 15000;
    else if (quality === 'low') countForTier = 4000;

    return Math.max(800, Math.round(countForTier * densityMultiplier));
  }, [densityMultiplier, quality]);

  // Hitung vektor pusat dan bidang singgung lokal pada bola
  const { center, tangentX, tangentY } = useMemo(() => {
    // Pusat badai di permukaan planet
    const [cx, cy, cz] = latLonToPlanetSurface(poi.lat, poi.lon, planetRadius);
    const c = new THREE.Vector3(cx, cy, cz);
    const normal = c.clone().normalize();

    // Vektor singgung timur (East tangent)
    const worldUp = new THREE.Vector3(0, 1, 0);
    const tx = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
    if (tx.lengthSq() < 0.001) {
      tx.set(1, 0, 0);
    }

    // Vektor singgung utara (North tangent)
    const ty = new THREE.Vector3().crossVectors(normal, tx).normalize();

    return { center: c, tangentX: tx, tangentY: ty };
  }, [planetRadius, poi.lat, poi.lon]);

  // Alokasi geometri partikel GPU (BufferGeometry)
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = targetCount;

    const positions = new Float32Array(count * 3);
    const radiusArr = new Float32Array(count);
    const angleArr = new Float32Array(count);
    const speedFactorArr = new Float32Array(count);
    const sizeArr = new Float32Array(count);
    const seedArr = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      // Posisi dummy untuk bounding sphere three.js
      positions[i * 3] = center.x;
      positions[i * 3 + 1] = center.y;
      positions[i * 3 + 2] = center.z;

      // Distribusi radius berbobot (konsentrasi tinggi di area pusaran)
      const u = Math.random();
      const r = Math.sqrt(u) * 0.96 + Math.random() * 0.04;
      radiusArr[i] = Math.min(1.0, r);

      angleArr[i] = Math.random() * Math.PI * 2;
      speedFactorArr[i] = 0.85 + Math.random() * 0.3;
      sizeArr[i] = 2.2 + Math.random() * 2.8;
      seedArr[i] = Math.random() * 10.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radiusArr, 1));
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angleArr, 1));
    geo.setAttribute(
      'aSpeedFactor',
      new THREE.BufferAttribute(speedFactorArr, 1),
    );
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizeArr, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedArr, 1));

    return geo;
  }, [center, targetCount]);

  // Bersihkan memori geometri GPU saat unmount / re-alokasi
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  // Uniforms shader
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: baseSpeed * speedMultiplier },
      uVortexRadius: { value: vortexRadius },
      uCenter: { value: center },
      uTangentX: { value: tangentX },
      uTangentY: { value: tangentY },
      uPlanetRadius: { value: planetRadius },
      uIsPaused: { value: isPaused ? 1.0 : 0.0 },
      uReducedMotion: { value: reducedMotion ? 1.0 : 0.0 },
      uDirection: { value: isCounterClockwise ? 1.0 : -1.0 },
      uColorCore: { value: new THREE.Color(pConfig?.coreColor ?? '#f8e2c3') }, // Krem/emas mata badai
      uColorCollar: { value: new THREE.Color(pConfig?.color ?? '#d9381e') }, // Oranye-merah tepi badai
      uColorOuter: {
        value: new THREE.Color(pConfig?.secondaryColor ?? '#e67332'),
      }, // Terakota luar
      uOpacity: { value: 0.92 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseSpeed, center, planetRadius, tangentX, tangentY, vortexRadius],
  );

  // Pembaruan waktu simulasi per-frame di GPU
  useFrame((_, delta) => {
    if (!materialRef.current) return;

    if (!isPaused && !reducedMotion) {
      materialRef.current.uniforms.uTime.value += delta;
    }
    materialRef.current.uniforms.uSpeed.value = baseSpeed * speedMultiplier;
    materialRef.current.uniforms.uIsPaused.value = isPaused ? 1.0 : 0.0;
    materialRef.current.uniforms.uReducedMotion.value = reducedMotion
      ? 1.0
      : 0.0;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

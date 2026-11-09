'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { resolveAssetUrl } from '@/lib/utils/cdn';
import type { Planet } from '@/types/database';

interface PlanetMeshProps {
  planet: Planet;
  onRotationUpdate?: (rotationY: number) => void;
}

// Skala radius visual yang proporsional dan nyaman dilihat dalam viewport
function getPlanetRadius(planetId: string, skalaVisual = 1.0): number {
  switch (planetId) {
    case 'mercury':
      return 2.2 * skalaVisual;
    case 'venus':
      return 3.6 * skalaVisual;
    case 'earth':
      return 4.0 * skalaVisual;
    case 'mars':
      return 2.8 * skalaVisual;
    case 'jupiter':
      return 7.5 * skalaVisual;
    case 'saturn':
      return 6.5 * skalaVisual;
    case 'uranus':
      return 5.0 * skalaVisual;
    case 'neptune':
      return 4.8 * skalaVisual;
    default:
      return 4.0 * skalaVisual;
  }
}

// Konfigurasi palet warna material planet
function getPlanetVisualConfig(planetId: string) {
  switch (planetId) {
    case 'mercury':
      return {
        baseColor: '#8a8682',
        roughness: 0.9,
        metalness: 0.1,
        atmosphereColor: null,
      };
    case 'venus':
      return {
        baseColor: '#e3c287',
        roughness: 0.6,
        metalness: 0.05,
        atmosphereColor: '#ffeaae',
      };
    case 'earth':
      return {
        baseColor: '#1d63b8',
        roughness: 0.45,
        metalness: 0.15,
        atmosphereColor: '#62b0ff',
      };
    case 'mars':
      return {
        baseColor: '#c85028',
        roughness: 0.85,
        metalness: 0.1,
        atmosphereColor: '#e07850',
      };
    case 'jupiter':
      return {
        baseColor: '#cfa268',
        roughness: 0.5,
        metalness: 0.05,
        atmosphereColor: '#dfb77d',
      };
    case 'saturn':
      return {
        baseColor: '#ded09c',
        roughness: 0.55,
        metalness: 0.05,
        atmosphereColor: '#eedfad',
      };
    case 'uranus':
      return {
        baseColor: '#62c4c7',
        roughness: 0.4,
        metalness: 0.08,
        atmosphereColor: '#8ee6e8',
      };
    case 'neptune':
      return {
        baseColor: '#2f49b8',
        roughness: 0.4,
        metalness: 0.1,
        atmosphereColor: '#4f75e8',
      };
    default:
      return {
        baseColor: '#3a6ea5',
        roughness: 0.5,
        metalness: 0.1,
        atmosphereColor: '#60a5fa',
      };
  }
}

export function PlanetMesh({ planet, onRotationUpdate }: PlanetMeshProps) {
  const tiltGroupRef = useRef<THREE.Group>(null);
  const planetMeshRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const ringsRef = useRef<THREE.Mesh>(null);

  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [customModel, setCustomModel] = useState<THREE.Group | null>(null);

  const radius = useMemo(
    () => getPlanetRadius(planet.planet_id, Number(planet.skala_visual) || 1.0),
    [planet.planet_id, planet.skala_visual]
  );

  const visualConfig = useMemo(
    () => getPlanetVisualConfig(planet.planet_id),
    [planet.planet_id]
  );

  // Kemiringan poros rotasi (Axial Tilt)
  const axialTiltRad = useMemo(
    () => ((Number(planet.axial_tilt_deg) || 0) * Math.PI) / 180,
    [planet.axial_tilt_deg]
  );

  // Kecepatan rotasi angular: negatif berarti berputar berlawanan arah (retrograde)
  const rotationSpeed = useMemo(() => {
    const hours = Number(planet.rotation_period_hours) || 24;
    const isRetrograde = hours < 0;
    const baseSpeed = (2 * Math.PI) / (Math.abs(hours) * 1.5 + 20);
    return isRetrograde ? -baseSpeed : baseSpeed;
  }, [planet.rotation_period_hours]);

  // Dynamic Texture Loading dengan fallback (T-02)
  useEffect(() => {
    let isCurrent = true;
    if (planet.tekstur_url && planet.tekstur_url.trim()) {
      const resolvedUrl = resolveAssetUrl(planet.tekstur_url.trim());
      const loader = new THREE.TextureLoader();
      loader.load(
        resolvedUrl,
        (loadedTex) => {
          if (isCurrent) {
            loadedTex.colorSpace = THREE.SRGBColorSpace;
            setTexture(loadedTex);
          }
        },
        undefined,
        () => {
          if (isCurrent) setTexture(null);
        }
      );
    } else {
      setTexture(null);
    }

    return () => {
      isCurrent = false;
    };
  }, [planet.tekstur_url]);

  // Dynamic GLTF Model Loading dengan fallback (T-02)
  useEffect(() => {
    let isCurrent = true;
    if (
      planet.aset_model_url &&
      planet.aset_model_url.trim() &&
      (planet.aset_model_url.endsWith('.glb') || planet.aset_model_url.endsWith('.gltf'))
    ) {
      const resolvedUrl = resolveAssetUrl(planet.aset_model_url.trim());
      const loader = new GLTFLoader();
      loader.load(
        resolvedUrl,
        (gltf) => {
          if (isCurrent) {
            setCustomModel(gltf.scene);
          }
        },
        undefined,
        () => {
          if (isCurrent) setCustomModel(null);
        }
      );
    } else {
      setCustomModel(null);
    }

    return () => {
      isCurrent = false;
    };
  }, [planet.aset_model_url]);

  useFrame((_, delta) => {
    if (planetMeshRef.current) {
      planetMeshRef.current.rotation.y += rotationSpeed * delta * 0.7;
      if (onRotationUpdate) {
        onRotationUpdate(planetMeshRef.current.rotation.y);
      }
    }

    // Awan bumi berputar sedikit lebih cepat
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += (rotationSpeed * 1.15) * delta * 0.7;
    }
  });

  const atmosphereColor = planet.warna_atmosfer_hex || visualConfig.atmosphereColor;

  return (
    <group ref={tiltGroupRef} rotation={[0, 0, axialTiltRad]}>
      {/* Bola Planet Utama (Atau Model GLTF jika berhasil dimuat) */}
      <group ref={planetMeshRef}>
        {customModel ? (
          <primitive object={customModel} scale={radius} />
        ) : (
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[radius, 64, 64]} />
            <meshStandardMaterial
              color={texture ? '#ffffff' : visualConfig.baseColor}
              map={texture || null}
              roughness={visualConfig.roughness}
              metalness={visualConfig.metalness}
            />
          </mesh>
        )}
      </group>

      {/* Lapisan Atmosfer / Awan (Khusus Bumi & Venus) */}
      {planet.planet_id === 'earth' && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[radius * 1.02, 64, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            transparent
            opacity={0.32}
            blending={THREE.AdditiveBlending}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* Atmospheric Glow Rim */}
      {atmosphereColor && (
        <mesh>
          <sphereGeometry args={[radius * 1.05, 32, 32]} />
          <meshBasicMaterial
            color={atmosphereColor}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Cincin Saturnus (Rings) */}
      {planet.planet_id === 'saturn' && (
        <mesh ref={ringsRef} rotation={[-Math.PI / 2 + 0.1, 0, 0]} receiveShadow>
          <ringGeometry args={[radius * 1.35, radius * 2.35, 64]} />
          <meshStandardMaterial
            color="#cbb685"
            side={THREE.DoubleSide}
            transparent
            opacity={0.82}
            roughness={0.6}
            metalness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}

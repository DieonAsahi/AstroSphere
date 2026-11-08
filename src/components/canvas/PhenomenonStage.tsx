'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '@/store/useSceneStore';
import type { Phenomenon } from '@/types/database';

interface PhenomenonStageProps {
  phenomenon: Phenomenon | null;
}

// Simulasi Gerhana Matahari: Matahari - Bulan - Bumi sejajar (R14)
function SolarEclipseSimulation() {
  const moonRef = useRef<THREE.Mesh>(null);
  const umbraConeRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.35;
    // Bulan melintasi garis pandang antara Matahari (x=30) dan Bumi (x=0)
    const moonX = 10;
    const moonY = Math.sin(t) * 2.8;
    const moonZ = Math.cos(t) * 2.8;

    if (moonRef.current) {
      moonRef.current.position.set(moonX, moonY, moonZ);
    }

    // Kerucut Bayangan Umbra memanjang dari Bulan ke arah Bumi (menuju x=0)
    if (umbraConeRef.current) {
      umbraConeRef.current.position.set(moonX - 4.5, moonY * 0.55, moonZ * 0.55);
      umbraConeRef.current.rotation.z = Math.PI / 2;
    }
  });

  return (
    <group>
      {/* Matahari Bercahaya (Sun) */}
      <mesh position={[30, 0, 0]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>
      <pointLight position={[30, 0, 0]} intensity={4.5} distance={100} color="#fffbeb" />

      {/* Bumi Observasi */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshStandardMaterial color="#1d63b8" roughness={0.5} />
      </mesh>

      {/* Bulan Transit */}
      <mesh ref={moonRef} position={[10, 0, 0]}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>

      {/* Visualisasi Kerucut Bayangan Umbra */}
      <mesh ref={umbraConeRef}>
        <coneGeometry args={[1.2, 9, 32]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

// Simulasi Gerhana Bulan: Matahari - Bumi - Bulan masuk ke bayangan Bumi (R14)
function LunarEclipseSimulation() {
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.3;
    const moonX = -12;
    const moonY = Math.sin(t) * 3.5;
    const moonZ = Math.cos(t) * 3.5;

    if (moonRef.current) {
      moonRef.current.position.set(moonX, moonY, moonZ);
      // Saat masuk bayangan bumi (dekat y=0, z=0), bulan berubah menjadi warna tembaga kemerahan
      const distFromShadowCenter = Math.sqrt(moonY * moonY + moonZ * moonZ);
      const inEclipse = distFromShadowCenter < 1.8;
      const mat = moonRef.current.material as THREE.MeshStandardMaterial;
      if (inEclipse) {
        mat.color.setHex(0x991b1b); // Coppery blood red
      } else {
        mat.color.setHex(0x94a3b8);
      }
    }
  });

  return (
    <group>
      {/* Matahari di sisi berlawanan */}
      <mesh position={[30, 0, 0]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>
      <directionalLight position={[30, 0, 0]} intensity={3.5} />

      {/* Bumi di tengah */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshStandardMaterial color="#1d63b8" roughness={0.5} />
      </mesh>

      {/* Bayangan Bumi Silindris (Umbra) */}
      <mesh position={[-8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[3.6, 3.4, 16, 32]} />
        <meshBasicMaterial color="#020617" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Bulan */}
      <mesh ref={moonRef} position={[-12, 0, 0]}>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Simulasi Fase Bulan: Siklus 29.5 hari mengelilingi Bumi
function MoonPhasesSimulation() {
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.4;
    const orbitRadius = 10;
    if (moonRef.current) {
      moonRef.current.position.set(
        Math.cos(t) * orbitRadius,
        0,
        Math.sin(t) * orbitRadius
      );
      moonRef.current.rotation.y = t;
    }
  });

  return (
    <group>
      {/* Sinar Matahari Sejajar dari arah X+ */}
      <directionalLight position={[25, 0, 0]} intensity={4.0} />

      {/* Bumi di Pusat */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[3.8, 48, 48]} />
        <meshStandardMaterial color="#1d63b8" roughness={0.5} />
      </mesh>

      {/* Lintasan Orbit Bulan */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.95, 10.05, 64]} />
        <meshBasicMaterial color="#475569" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Bulan dengan shading pencahayaan dinamis */}
      <mesh ref={moonRef} position={[10, 0, 0]}>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.7} />
      </mesh>
    </group>
  );
}

// Simulasi Transit 4 Satelit Galileo di Jupiter (R14)
function GalileanTransitSimulation() {
  const moons = [
    { name: 'Io', radius: 0.5, orbitDist: 8.5, speed: 1.8, color: '#facc15' },
    { name: 'Europa', radius: 0.42, orbitDist: 10.5, speed: 1.3, color: '#e2e8f0' },
    { name: 'Ganymede', radius: 0.72, orbitDist: 13.0, speed: 0.85, color: '#94a3b8' },
    { name: 'Callisto', radius: 0.65, orbitDist: 16.0, speed: 0.55, color: '#64748b' },
  ];

  const moonRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shadowRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    moons.forEach((m, idx) => {
      const angle = time * m.speed;
      const x = Math.sin(angle) * m.orbitDist;
      const z = Math.cos(angle) * m.orbitDist;

      const moonMesh = moonRefs.current[idx];
      if (moonMesh) {
        moonMesh.position.set(x, 0, z);
      }

      // Bayangan jatuh di permukaan Jupiter (radius 6.0) saat satelit berada di depan (z > 0)
      const shadowMesh = shadowRefs.current[idx];
      if (shadowMesh) {
        if (z > 0 && Math.abs(x) < 5.8) {
          const shadowZ = Math.sqrt(Math.max(0, 36 - x * x));
          shadowMesh.position.set(x, 0, shadowZ + 0.05);
          shadowMesh.visible = true;
        } else {
          shadowMesh.visible = false;
        }
      }
    });
  });

  return (
    <group>
      {/* Sinar Matahari dari Kamera */}
      <directionalLight position={[0, 5, 25]} intensity={3.5} />

      {/* Jupiter Raksasa */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[6.0, 64, 64]} />
        <meshStandardMaterial color="#cfa268" roughness={0.5} />
      </mesh>

      {/* Orbit & Satelit Galileo */}
      {moons.map((m, idx) => (
        <React.Fragment key={m.name}>
          {/* Garis Orbit */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[m.orbitDist - 0.04, m.orbitDist + 0.04, 64]} />
            <meshBasicMaterial color="#475569" transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>

          {/* Satelit */}
          <mesh
            ref={(el) => {
              moonRefs.current[idx] = el;
            }}
          >
            <sphereGeometry args={[m.radius, 24, 24]} />
            <meshStandardMaterial color={m.color} roughness={0.6} />
          </mesh>

          {/* Bayangan Transit di Awan Jupiter */}
          <mesh
            ref={(el) => {
              shadowRefs.current[idx] = el;
            }}
          >
            <circleGeometry args={[m.radius * 0.8, 16]} />
            <meshBasicMaterial color="#090d16" />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
}

export function PhenomenonStage({ phenomenon }: PhenomenonStageProps) {
  const mode = useSceneStore((state) => state.mode);

  if (mode !== 'PHENOMENON') return null;

  const animationType = phenomenon?.tipe_animasi || 'SOLAR_ECLIPSE';

  switch (animationType) {
    case 'SOLAR_ECLIPSE':
      return <SolarEclipseSimulation />;
    case 'LUNAR_ECLIPSE':
      return <LunarEclipseSimulation />;
    case 'MOON_PHASES':
      return <MoonPhasesSimulation />;
    case 'GALILEAN_TRANSIT':
      return <GalileanTransitSimulation />;
    default:
      return <SolarEclipseSimulation />;
  }
}


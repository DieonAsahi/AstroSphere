'use client';

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useSceneStore } from '@/store/useSceneStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { supabase } from '@/lib/supabase/client';
import { resolveAssetUrl } from '@/lib/utils/cdn';

interface SpacecraftProps {
  batasZonaRadius: number;
}

// Model Geometris 3D untuk 3 Pesawat Reward PRD (R09)
function AstraScoutModel({ accelerating }: { accelerating: boolean }) {
  // 12m skala (~0.55 unit)
  return (
    <group scale={0.55}>
      {/* Fuselage Badan */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.5, 2.2, 5]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cockpit Canopy */}
      <mesh position={[0, 0.22, 0.2]}>
        <boxGeometry args={[0.3, 0.22, 0.7]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Sayap Delta */}
      <mesh position={[0, -0.05, -0.3]}>
        <boxGeometry args={[2.0, 0.06, 0.9]} />
        <meshStandardMaterial color="#0369a1" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Fin Stabilizer */}
      <mesh position={[0, 0.35, -0.6]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.06, 0.6, 0.6]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      {/* Dual Ion Thrusters */}
      <mesh position={[-0.3, 0, -1.0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.3, 12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.3, 0, -1.0]}>
        <cylinderGeometry args={[0.15, 0.18, 0.3, 12]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Engine Plume Glow */}
      <mesh position={[0, 0, -1.25]} scale={accelerating ? 1.6 : 0.8}>
        <coneGeometry args={[0.3, 0.7, 8]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

function OrionGliderModel({ accelerating }: { accelerating: boolean }) {
  // 15m skala (~0.7 unit)
  return (
    <group scale={0.7}>
      {/* Badan Ramping Aerodinamis */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.45, 2.8, 6]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Sayap Sapuan Maju (Swept-Forward) */}
      <mesh position={[0, 0.05, 0.1]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[2.8, 0.08, 0.6]} />
        <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* Twin Plasma Pods */}
      <mesh position={[-0.55, -0.05, -0.7]}>
        <cylinderGeometry args={[0.2, 0.22, 0.8, 12]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>
      <mesh position={[0.55, -0.05, -0.7]}>
        <cylinderGeometry args={[0.2, 0.22, 0.8, 12]} />
        <meshStandardMaterial color="#451a03" />
      </mesh>
      {/* Twin Plume Glow */}
      <mesh position={[-0.55, -0.05, -1.3]} scale={accelerating ? 1.8 : 0.9}>
        <coneGeometry args={[0.22, 0.8, 8]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0.55, -0.05, -1.3]} scale={accelerating ? 1.8 : 0.9}>
        <coneGeometry args={[0.22, 0.8, 8]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function NovaVoyagerModel({ accelerating }: { accelerating: boolean }) {
  // 18m skala (~0.85 unit)
  return (
    <group scale={0.85}>
      {/* Heavy Command Hull */}
      <mesh position={[0, 0.1, 0.2]}>
        <boxGeometry args={[0.9, 0.7, 3.2]} />
        <meshStandardMaterial color="#818cf8" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Raised Bridge Tower */}
      <mesh position={[0, 0.65, 0.5]}>
        <boxGeometry args={[0.45, 0.35, 0.7]} />
        <meshStandardMaterial color="#4338ca" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Heavy Armored Wings */}
      <mesh position={[0, -0.1, -0.4]}>
        <boxGeometry args={[3.2, 0.18, 1.2]} />
        <meshStandardMaterial color="#312e81" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Quad Engine Array */}
      {[-0.6, 0.6].map((x) =>
        [-0.15, 0.25].map((y) => (
          <group key={`${x}-${y}`} position={[x, y, -1.6]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.24, 0.5, 12]} />
              <meshStandardMaterial color="#1e1b4b" />
            </mesh>
            <mesh position={[0, 0, -0.4]} scale={accelerating ? 1.7 : 0.85}>
              <coneGeometry args={[0.18, 0.6, 8]} />
              <meshBasicMaterial color="#a5b4fc" transparent opacity={0.9} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

export function Spacecraft({ batasZonaRadius }: SpacecraftProps) {
  const shipGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  const mode = useSceneStore((state) => state.mode);
  const isShipVisible = useSceneStore((state) => state.isShipVisible);
  const shouldStopImmediately = useSceneStore((state) => state.shouldStopImmediately);
  const resetStopTrigger = useSceneStore((state) => state.resetStopTrigger);
  const setFlightTelemetry = useSceneStore((state) => state.setFlightTelemetry);
  const saveSnapshot = useSceneStore((state) => state.saveSnapshot);
  const savedSnapshot = useSceneStore((state) => state.savedSnapshot);
  const restoreTrigger = useSceneStore((state) => state.restoreTrigger);

  const activeShipId = usePlayerStore((state) => state.activeShipId);

  // Dynamic 3D Model Loading untuk Pesawat (T-02)
  const [customShipModel, setCustomShipModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function loadShipAsset() {
      try {
        const { data } = await supabase
          .from('ships')
          .select('aset_model_url')
          .eq('ship_id', activeShipId)
          .maybeSingle();

        if (
          isCurrent &&
          data?.aset_model_url &&
          (data.aset_model_url.endsWith('.glb') || data.aset_model_url.endsWith('.gltf'))
        ) {
          const resolved = resolveAssetUrl(data.aset_model_url);
          const loader = new GLTFLoader();
          loader.load(
            resolved,
            (gltf) => {
              if (isCurrent) setCustomShipModel(gltf.scene);
            },
            undefined,
            () => {
              if (isCurrent) setCustomShipModel(null);
            }
          );
        } else {
          if (isCurrent) setCustomShipModel(null);
        }
      } catch {
        if (isCurrent) setCustomShipModel(null);
      }
    }

    loadShipAsset();
    return () => {
      isCurrent = false;
    };
  }, [activeShipId]);

  // Vektor Fisika Terbang
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const keysPressed = useRef<Record<string, boolean>>({});
  const isAccelerating = useRef(false);

  // Listener Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Set posisi awal pesawat saat pertama kali mount
  useEffect(() => {
    if (shipGroupRef.current) {
      shipGroupRef.current.position.set(0, 3, 14);
      shipGroupRef.current.quaternion.identity();
    }
  }, []);

  // Handle Restore Snapshot saat berpindah kembali ke mode 'EXPLORE' (R14)
  useEffect(() => {
    if (restoreTrigger > 0 && savedSnapshot && shipGroupRef.current) {
      shipGroupRef.current.position.set(...savedSnapshot.shipPosition);
      shipGroupRef.current.quaternion.set(...savedSnapshot.shipQuaternion);
      velocity.current.set(...savedSnapshot.shipVelocity);
    }
  }, [restoreTrigger, savedSnapshot]);

  // Handle Emergency Stop Button (R03)
  useEffect(() => {
    if (shouldStopImmediately) {
      velocity.current.set(0, 0, 0);
      resetStopTrigger();
    }
  }, [shouldStopImmediately, resetStopTrigger]);

  useFrame((_, delta) => {
    if (!shipGroupRef.current || mode !== 'EXPLORE' || !isShipVisible) return;

    const ship = shipGroupRef.current;
    const dt = Math.min(delta, 0.1);

    const keys = keysPressed.current;
    const forward = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
    const yaw = (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0) - (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0);
    const boost = keys['ShiftLeft'] || keys['ShiftRight'] ? 2.2 : 1.0;
    const brake = keys['Space'] || false;

    isAccelerating.current = forward > 0;

    // Rotasi Yaw & Pitch
    const turnSpeed = 1.8;
    if (yaw !== 0) {
      ship.rotateY(yaw * turnSpeed * dt);
    }

    // Akselerasi Maju Mengikuti Orientasi Pesawat
    const forwardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);

    if (forward !== 0) {
      const accelForce = 14.0 * forward * boost;
      velocity.current.addScaledVector(forwardVector, accelForce * dt);
    }

    // Pengereman (Spasi / Redaman Alami)
    if (brake) {
      velocity.current.multiplyScalar(Math.max(0, 1 - 6.0 * dt));
    } else {
      // Hambatan inersia angkasa halus
      velocity.current.multiplyScalar(Math.max(0, 1 - 0.7 * dt));
    }

    // Batasi kecepatan maksimal
    const maxSpeed = 35.0 * boost;
    if (velocity.current.length() > maxSpeed) {
      velocity.current.setLength(maxSpeed);
    }

    // =========================================================================
    // Batas Zona Terbang 80% (PRD R02)
    // =========================================================================
    const distFromCenter = ship.position.length();
    const ratio = distFromCenter / batasZonaRadius;
    const nearBoundary = ratio >= 0.8;

    if (nearBoundary) {
      // Vektor radial keluar dari pusat planet
      const radialOut = ship.position.clone().normalize();
      const outwardSpeed = velocity.current.dot(radialOut);

      // Redam kecepatan yang mengarah ke luar batas
      if (outwardSpeed > 0) {
        velocity.current.addScaledVector(radialOut, -outwardSpeed * 4.0 * dt);
      }

      // Jika melebihi 95% zona, tarik halus posisi kembali ke dalam zona aman
      if (ratio >= 0.95) {
        ship.position.setLength(batasZonaRadius * 0.94);
      }
    }

    // Update Posisi Pesawat
    ship.position.addScaledVector(velocity.current, dt);

    // Kirim telemetri ke HUD store
    const speedKmS = Math.round(velocity.current.length() * 12);
    setFlightTelemetry(speedKmS, nearBoundary, ratio);

    // Simpan snapshot berkala untuk restore
    saveSnapshot({
      shipPosition: [ship.position.x, ship.position.y, ship.position.z],
      shipQuaternion: [ship.quaternion.x, ship.quaternion.y, ship.quaternion.z, ship.quaternion.w],
      shipVelocity: [velocity.current.x, velocity.current.y, velocity.current.z],
      cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
      cameraTarget: [ship.position.x, ship.position.y, ship.position.z],
      planetRotationY: 0,
      simulationTime: Date.now(),
    });

    // =========================================================================
    // Smooth Follow Camera (Third Person View)
    // =========================================================================
    const cameraOffset = new THREE.Vector3(0, 2.2, -6.5).applyQuaternion(ship.quaternion);
    const targetCameraPos = ship.position.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.1);

    const lookTarget = ship.position.clone().add(forwardVector.clone().multiplyScalar(4));
    camera.lookAt(lookTarget);
  });

  if (mode !== 'EXPLORE' || !isShipVisible) return null;

  return (
    <group ref={shipGroupRef}>
      {customShipModel ? (
        <primitive object={customShipModel} scale={0.7} />
      ) : activeShipId === 'nova-voyager' ? (
        <NovaVoyagerModel accelerating={isAccelerating.current} />
      ) : activeShipId === 'orion-glider' ? (
        <OrionGliderModel accelerating={isAccelerating.current} />
      ) : (
        <AstraScoutModel accelerating={isAccelerating.current} />
      )}
    </group>
  );
}

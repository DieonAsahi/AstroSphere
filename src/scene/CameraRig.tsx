import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useUiStore } from '../state/uiStore';
import { useSceneStore } from '../state/sceneStore';
import { useTourStore } from '../features/tours/tourStore';
import { useQualityStore } from '../state/qualityStore';

const bodyNameById: Record<string, string> = {
  mercury: 'Merkurius',
  venus: 'Venus',
  earth: 'Bumi',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturnus',
  uranus: 'Uranus',
  neptune: 'Neptunus',
  moon: 'Bulan',
};

export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, scene } = useThree();
  const resetTarget = useRef<THREE.Vector3 | null>(null);
  const resetCameraPosition = useMemo(() => new THREE.Vector3(0, 14, 24), []);
  const originTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const resetVersion = useUiStore((state) => state.cameraResetVersion);
  const selectedBodyId = useSceneStore((state) => state.selectedBodyId);
  const selectedPoiId = useSceneStore((state) => state.selectedPoiId);

  // Scratch vectors untuk useFrame agar tidak membuat objek baru setiap frame
  const selectedPlanetPosition = useRef(new THREE.Vector3());
  const cameraDir = useRef(new THREE.Vector3());
  const rightDir = useRef(new THREE.Vector3());
  const shiftedTarget = useRef(new THREE.Vector3());
  const desiredPosition = useRef(new THREE.Vector3());
  const currentPoiOffset = useRef(0);
  const tourTargetPos = useRef(new THREE.Vector3());
  const tourTargetLookAt = useRef(new THREE.Vector3());
  const lastCameraSyncKey = useRef('');

  useEffect(() => {
    if (resetVersion > 0) resetTarget.current = resetCameraPosition.clone();
  }, [resetCameraPosition, resetVersion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const control = controls.current;
      if (!control) return;
      const offset = camera.position.clone().sub(control.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      let handled = true;
      if (event.key === 'ArrowLeft') spherical.theta -= 0.08;
      else if (event.key === 'ArrowRight') spherical.theta += 0.08;
      else if (event.key === 'ArrowUp') spherical.phi -= 0.08;
      else if (event.key === 'ArrowDown') spherical.phi += 0.08;
      else if (event.key === '+' || event.key === '=') spherical.radius *= 0.9;
      else if (event.key === '-' || event.key === '_') spherical.radius *= 1.1;
      else if (event.key === 'Home')
        resetTarget.current = resetCameraPosition.clone();
      else handled = false;
      if (handled) {
        event.preventDefault();
        offset.setFromSpherical(spherical);
        camera.position.copy(control.target).add(offset);
        control.update();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [camera, resetCameraPosition]);

  useFrame(() => {
    // Sinkronisasi posisi kamera aktual ke tourStore untuk tombol "Simpan posisi kamera saat ini"
    if (controls.current) {
      const posKey = `${camera.position.x.toFixed(2)},${camera.position.y.toFixed(2)},${camera.position.z.toFixed(2)}`;
      if (posKey !== lastCameraSyncKey.current) {
        lastCameraSyncKey.current = posKey;
        useTourStore.getState().setLiveCamera({
          position: [
            parseFloat(camera.position.x.toFixed(2)),
            parseFloat(camera.position.y.toFixed(2)),
            parseFloat(camera.position.z.toFixed(2)),
          ],
          target: [
            parseFloat(controls.current.target.x.toFixed(2)),
            parseFloat(controls.current.target.y.toFixed(2)),
            parseFloat(controls.current.target.z.toFixed(2)),
          ],
          fov: (camera as THREE.PerspectiveCamera).fov,
        });
      }
    }

    // MODE TUR TERPANDU: Bila tur sedang aktif, kamera diarahkan sesuai cameraPreset langkah saat ini
    const activeTour = useTourStore.getState().activeTour;
    const currentStepIndex = useTourStore.getState().currentStepIndex;
    const reducedMotion = useQualityStore.getState().reducedMotion;

    if (activeTour && controls.current) {
      const currentStep = activeTour.steps[currentStepIndex];
      if (currentStep) {
        const [px, py, pz] = currentStep.cameraPreset.position;
        const [tx, ty, tz] = currentStep.cameraPreset.target;
        tourTargetPos.current.set(px, py, pz);
        tourTargetLookAt.current.set(tx, ty, tz);

        if (reducedMotion) {
          // Dengan "kurangi animasi", kamera berpindah langsung tanpa gerak panjang
          camera.position.copy(tourTargetPos.current);
          controls.current.target.copy(tourTargetLookAt.current);
        } else {
          // Animasi kamera sinematik halus
          camera.position.lerp(tourTargetPos.current, 0.04);
          controls.current.target.lerp(tourTargetLookAt.current, 0.05);
        }

        if (
          currentStep.cameraPreset.fov &&
          (camera as THREE.PerspectiveCamera).fov !==
            currentStep.cameraPreset.fov
        ) {
          (camera as THREE.PerspectiveCamera).fov =
            currentStep.cameraPreset.fov;
          (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
        }

        controls.current.update();
        return;
      }
    }

    const selectedObject =
      selectedBodyId && selectedBodyId !== 'sun'
        ? scene.getObjectByName(bodyNameById[selectedBodyId])
        : null;

    if (selectedObject && controls.current) {
      selectedObject.getWorldPosition(selectedPlanetPosition.current);

      if (!resetTarget.current) {
        const distance = 5.5;

        // Saat panel POI aktif, geser kamera ke kanan agar objek tampak di sisi kiri layar
        const targetOffsetScalar = selectedPoiId ? 1.4 : 0;
        currentPoiOffset.current = THREE.MathUtils.lerp(
          currentPoiOffset.current,
          targetOffsetScalar,
          0.06,
        );

        // Hitung arah kanan (right vector) dari kamera
        camera.getWorldDirection(cameraDir.current);
        rightDir.current
          .copy(cameraDir.current)
          .cross(camera.up)
          .normalize()
          .multiplyScalar(currentPoiOffset.current);

        shiftedTarget.current
          .copy(selectedPlanetPosition.current)
          .add(rightDir.current);

        controls.current.target.lerp(shiftedTarget.current, 0.08);

        // Arah kamera terhadap target
        desiredPosition.current
          .copy(camera.position)
          .sub(controls.current.target)
          .normalize()
          .multiplyScalar(distance)
          .add(shiftedTarget.current);

        camera.position.lerp(desiredPosition.current, 0.04);
      }
    }

    if (!resetTarget.current || !controls.current) return;
    camera.position.lerp(resetTarget.current, 0.08);
    controls.current.target.lerp(originTarget, 0.08);
    if (
      camera.position.distanceTo(resetTarget.current) < 0.05 &&
      controls.current.target.distanceTo(originTarget) < 0.05
    ) {
      camera.position.copy(resetTarget.current);
      controls.current.target.copy(originTarget);
      resetTarget.current = null;
    }
    controls.current.update();
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan
      enableDamping
      dampingFactor={0.055}
      minDistance={3}
      maxDistance={55}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}

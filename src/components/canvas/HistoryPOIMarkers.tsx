'use client';

import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore } from '@/store/useSceneStore';
import type { HistoryEvent } from '@/types/database';

interface HistoryPOIMarkersProps {
  events: HistoryEvent[];
  planetRadius: number;
  planetRotationY: number;
}

// Konversi koordinat bola (Lat°, Lng°) ke koordinat Kartesius 3D (x, y, z)
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function SinglePoiPin({
  event,
  planetRadius,
}: {
  event: HistoryEvent;
  planetRadius: number;
}) {
  const activePoi = useSceneStore((state) => state.activePoi);
  const setActivePoi = useSceneStore((state) => state.setActivePoi);

  const isSelected = activePoi?.event_id === event.event_id;

  // Letakkan pin sedikit di atas permukaan bola
  const position = useMemo(() => {
    return latLngToVector3(
      Number(event.koordinat_lat),
      Number(event.koordinat_lng),
      planetRadius * 1.04
    );
  }, [event.koordinat_lat, event.koordinat_lng, planetRadius]);

  return (
    <group position={position}>
      {/* 3D Pin Beacon */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setActivePoi(event);
        }}
      >
        <cylinderGeometry args={[0.04, 0.08, 0.45, 8]} />
        <meshBasicMaterial color={isSelected ? '#38bdf8' : '#818cf8'} />
      </mesh>

      {/* Pulsing Base Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <ringGeometry args={[0.12, 0.22, 16]} />
        <meshBasicMaterial
          color={isSelected ? '#06b6d4' : '#6366f1'}
          transparent
          opacity={isSelected ? 0.9 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* HTML Hover Label */}
      <Html distanceFactor={14} position={[0, 0.35, 0]} center>
        <button
          type="button"
          onClick={() => setActivePoi(event)}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md transition-transform hover:scale-110 cursor-pointer ${
            isSelected
              ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-lg shadow-cyan-500/30'
              : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          <span className="font-mono text-cyan-400">
            {event.tahun_kejadian < 0
              ? `${Math.abs(event.tahun_kejadian) >= 1000000 ? `${(Math.abs(event.tahun_kejadian) / 1000000).toFixed(0)} Jt` : Math.abs(event.tahun_kejadian)} SM`
              : `${event.tahun_kejadian} M`}
          </span>
          <span>·</span>
          <span>{event.judul}</span>
        </button>
      </Html>
    </group>
  );
}

export function HistoryPOIMarkers({
  events,
  planetRadius,
  planetRotationY,
}: HistoryPOIMarkersProps) {
  const mode = useSceneStore((state) => state.mode);
  const selectedYearFilter = useSceneStore((state) => state.selectedYearFilter);

  // Filter tahun sejarah (R04)
  const filteredEvents = useMemo(() => {
    if (selectedYearFilter === null) return events;
    return events.filter((ev) => ev.tahun_kejadian <= selectedYearFilter);
  }, [events, selectedYearFilter]);

  if (mode !== 'HISTORY') return null;

  return (
    <group rotation={[0, planetRotationY, 0]}>
      {filteredEvents.map((event) => (
        <SinglePoiPin
          key={event.event_id}
          event={event}
          planetRadius={planetRadius}
        />
      ))}
    </group>
  );
}

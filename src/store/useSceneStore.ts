import { create } from 'zustand';
import type { HistoryEvent, Phenomenon } from '@/types/database';

export type SceneMode = 'EXPLORE' | 'DESCRIPTION' | 'HISTORY' | 'PHENOMENON' | 'QUIZ';

export interface SceneSnapshot {
  shipPosition: [number, number, number];
  shipQuaternion: [number, number, number, number];
  shipVelocity: [number, number, number];
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  planetRotationY: number;
  simulationTime: number;
}

interface SceneState {
  // Identitas & Mode
  activePlanetId: string;
  mode: SceneMode;
  selectedYearFilter: number | null;
  activePhenomenon: Phenomenon | null;
  activePoi: HistoryEvent | null;

  // Status Pesawat & Telemetri
  isShipVisible: boolean;
  currentSpeed: number; // km/s
  nearBoundary: boolean; // d >= 0.8 * R_zona
  boundaryRatio: number; // d / R_zona (0..1+)
  shouldStopImmediately: boolean;

  // Snapshot State (R05, R06, R14)
  savedSnapshot: SceneSnapshot | null;
  restoreTrigger: number; // Increment counter to trigger 3D restore hook

  // Actions
  setActivePlanetId: (planetId: string) => void;
  switchMode: (newMode: SceneMode) => void;
  setSelectedYearFilter: (year: number | null) => void;
  setActivePhenomenon: (phenomenon: Phenomenon | null) => void;
  setActivePoi: (poi: HistoryEvent | null) => void;
  stopShip: () => void;
  resetStopTrigger: () => void;
  setFlightTelemetry: (speed: number, nearBoundary: boolean, ratio: number) => void;
  saveSnapshot: (snapshot: SceneSnapshot) => void;
  restoreSnapshot: () => void;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  activePlanetId: 'earth',
  mode: 'EXPLORE',
  selectedYearFilter: null,
  activePhenomenon: null,
  activePoi: null,

  isShipVisible: true,
  currentSpeed: 0,
  nearBoundary: false,
  boundaryRatio: 0,
  shouldStopImmediately: false,

  savedSnapshot: null,
  restoreTrigger: 0,

  setActivePlanetId: (planetId: string) => {
    set({
      activePlanetId: planetId,
      activePoi: null,
      activePhenomenon: null,
      nearBoundary: false,
      boundaryRatio: 0,
    });
  },

  switchMode: (newMode: SceneMode) => {
    const currentMode = get().mode;
    if (currentMode === newMode) return;

    if (currentMode === 'EXPLORE' && newMode !== 'EXPLORE') {
      // Tinggalkan mode jelajah: sembunyikan pesawat dan nolkan kecepatan
      set({
        mode: newMode,
        isShipVisible: false,
        currentSpeed: 0,
        shouldStopImmediately: true,
      });
    } else if (newMode === 'EXPLORE') {
      // Kembali ke mode jelajah: tampilkan pesawat dan pulihkan snapshot
      set((state) => ({
        mode: newMode,
        isShipVisible: true,
        restoreTrigger: state.restoreTrigger + 1,
      }));
    } else {
      set({ mode: newMode });
    }
  },

  setSelectedYearFilter: (year: number | null) => {
    set({ selectedYearFilter: year });
  },

  setActivePhenomenon: (phenomenon: Phenomenon | null) => {
    set({ activePhenomenon: phenomenon });
  },

  setActivePoi: (poi: HistoryEvent | null) => {
    set({ activePoi: poi });
  },

  stopShip: () => {
    set({
      currentSpeed: 0,
      shouldStopImmediately: true,
    });
  },

  resetStopTrigger: () => {
    set({ shouldStopImmediately: false });
  },

  setFlightTelemetry: (speed: number, nearBoundary: boolean, ratio: number) => {
    set({
      currentSpeed: speed,
      nearBoundary,
      boundaryRatio: ratio,
    });
  },

  saveSnapshot: (snapshot: SceneSnapshot) => {
    set({ savedSnapshot: snapshot });
  },

  restoreSnapshot: () => {
    set((state) => ({
      restoreTrigger: state.restoreTrigger + 1,
    }));
  },
}));


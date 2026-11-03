import { create } from 'zustand';

interface SceneState {
  selectedBodyId: string | null;
  selectedPoiId: string | null;
  simulationTimeScale: number;
  simulationDays: number;
  isOrbitPaused: boolean;
  selectBody: (id: string | null) => void;
  selectPoi: (id: string | null) => void;
  setSimulationTimeScale: (scale: number) => void;
  setOrbitPaused: (paused: boolean) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedBodyId: null,
  selectedPoiId: null,
  simulationTimeScale: 1,
  simulationDays: 0,
  isOrbitPaused: false,
  selectBody: (selectedBodyId) => set({ selectedBodyId }),
  selectPoi: (selectedPoiId) => set({ selectedPoiId }),
  setSimulationTimeScale: (simulationTimeScale) => set({ simulationTimeScale }),
  setOrbitPaused: (isOrbitPaused) => set({ isOrbitPaused }),
}));

import { create } from 'zustand';

interface ParticleStormState {
  isPaused: boolean;
  speed: number;
  density: number;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setSpeed: (speed: number) => void;
  setDensity: (density: number) => void;
  reset: () => void;
}

export const useParticleStormStore = create<ParticleStormState>((set) => ({
  isPaused: false,
  speed: 1.0,
  density: 1.0,
  setPaused: (isPaused) => set({ isPaused }),
  togglePaused: () => set((state) => ({ isPaused: !state.isPaused })),
  setSpeed: (speed) => set({ speed }),
  setDensity: (density) => set({ density }),
  reset: () => set({ isPaused: false, speed: 1.0, density: 1.0 }),
}));

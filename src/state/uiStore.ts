import { create } from 'zustand';

interface UiState {
  isHudVisible: boolean;
  cameraResetVersion: number;
  toggleHud: () => void;
  requestCameraReset: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isHudVisible: true,
  cameraResetVersion: 0,
  toggleHud: () =>
    set((state) => ({
      isHudVisible: !state.isHudVisible,
    })),
  requestCameraReset: () =>
    set((state) => ({ cameraResetVersion: state.cameraResetVersion + 1 })),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from './useSceneStore';

describe('useSceneStore State Management (Tahap 2)', () => {
  beforeEach(() => {
    // Reset state sebelum tiap tes
    useSceneStore.setState({
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
    });
  });

  it('menginisialisasi store dengan default planet Earth dan mode EXPLORE', () => {
    const state = useSceneStore.getState();
    expect(state.activePlanetId).toBe('earth');
    expect(state.mode).toBe('EXPLORE');
    expect(state.isShipVisible).toBe(true);
  });

  it('mengganti mode ke DESCRIPTION menyembunyikan pesawat dan menolkan kecepatan', () => {
    useSceneStore.getState().setFlightTelemetry(12, false, 0.4);
    expect(useSceneStore.getState().currentSpeed).toBe(12);

    useSceneStore.getState().switchMode('DESCRIPTION');

    const state = useSceneStore.getState();
    expect(state.mode).toBe('DESCRIPTION');
    expect(state.isShipVisible).toBe(false);
    expect(state.currentSpeed).toBe(0);
    expect(state.shouldStopImmediately).toBe(true);
  });

  it('kembali ke mode EXPLORE menampilkan kembali pesawat dan mentrigger pemulihan posisi', () => {
    useSceneStore.getState().switchMode('HISTORY');
    expect(useSceneStore.getState().isShipVisible).toBe(false);

    const initialRestoreTrigger = useSceneStore.getState().restoreTrigger;
    useSceneStore.getState().switchMode('EXPLORE');

    const state = useSceneStore.getState();
    expect(state.mode).toBe('EXPLORE');
    expect(state.isShipVisible).toBe(true);
    expect(state.restoreTrigger).toBe(initialRestoreTrigger + 1);
  });

  it('stopShip mengaktifkan sinyal berhenti darurat dan kecepatan 0 km/s (PRD R03)', () => {
    useSceneStore.getState().setFlightTelemetry(15, false, 0.5);
    useSceneStore.getState().stopShip();

    const state = useSceneStore.getState();
    expect(state.currentSpeed).toBe(0);
    expect(state.shouldStopImmediately).toBe(true);

    useSceneStore.getState().resetStopTrigger();
    expect(useSceneStore.getState().shouldStopImmediately).toBe(false);
  });

  it('menyimpan dan memulihkan snapshot kamera dan orbit (PRD R05, R06, R14)', () => {
    const mockSnapshot = {
      shipPosition: [10, 2, 5] as [number, number, number],
      shipQuaternion: [0, 0, 0, 1] as [number, number, number, number],
      shipVelocity: [0, 0, 0] as [number, number, number],
      cameraPosition: [10, 6, 20] as [number, number, number],
      cameraTarget: [10, 2, 5] as [number, number, number],
      planetRotationY: 1.57,
      simulationTime: 120,
    };

    useSceneStore.getState().saveSnapshot(mockSnapshot);
    expect(useSceneStore.getState().savedSnapshot).toEqual(mockSnapshot);

    const prevTrigger = useSceneStore.getState().restoreTrigger;
    useSceneStore.getState().restoreSnapshot();
    expect(useSceneStore.getState().restoreTrigger).toBe(prevTrigger + 1);
  });

  it('mengatur filter tahun linimasa sejarah POI (PRD R04)', () => {
    useSceneStore.getState().setSelectedYearFilter(1975);
    expect(useSceneStore.getState().selectedYearFilter).toBe(1975);

    useSceneStore.getState().setSelectedYearFilter(null);
    expect(useSceneStore.getState().selectedYearFilter).toBeNull();
  });
});


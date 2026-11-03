import { create } from 'zustand';
import type { UserProfile } from '../classes/types';
import type { CameraPreset, Tour, TourStep } from './types';
import { useSceneStore } from '../../state/sceneStore';
import { onPoiViewed } from '../progress/usePoiViewed';

const TOURS_STORAGE_KEY = 'astrosphere_guided_tours';

// Data tur awal edukasi astronomi untuk demonstrasi & evaluasi
export const INITIAL_TOURS: Tour[] = [
  {
    id: 'tour-demo-001',
    createdBy: 'user-guru-demo-002',
    authorName: 'Ibu Dewi Kartika, M.Pd.',
    title: 'Ekspedisi Geologi Mars & Badai Raksasa Jupiter',
    description:
      'Jelajahi keajaiban struktur geologi gunung berapi tertinggi di Mars dan sistem pusaran antisiklonik raksasa di atmosfer Jupiter.',
    isPublished: true,
    classIds: ['class-demo-001', 'class-demo-002'],
    createdAt: '2026-10-31T10:00:00Z',
    updatedAt: '2026-10-31T10:00:00Z',
    steps: [
      {
        id: 'step-mars-olympus-mons',
        tourId: 'tour-demo-001',
        poiId: 'mars-olympus-mons',
        poiName: 'Olympus Mons',
        bodyId: 'mars',
        bodyName: 'Mars',
        stepNo: 1,
        narrationText:
          'Selamat datang di stasiun observasi Mars! Di hadapan kita berdiri Olympus Mons, gunung berapi perisai raksasa dengan ketinggian 21,9 km—hampir tiga kali tinggi Gunung Everest. Kaldera puncaknya selebar 80 km terbentuk dari runtuhnya ruang magma setelah letusan besar.',
        cameraPreset: {
          position: [3.8, 2.2, 4.8],
          target: [0, 0, 0],
          fov: 45,
        },
        durationS: 12,
      },
      {
        id: 'step-jupiter-great-red-spot',
        tourId: 'tour-demo-001',
        poiId: 'jupiter-great-red-spot',
        poiName: 'Badai Merah Raksasa',
        bodyId: 'jupiter',
        bodyName: 'Jupiter',
        stepNo: 2,
        narrationText:
          'Kini kita berpindah ke planet gas raksasa Jupiter. Di belahan selatan terlihat Badai Merah Raksasa (Great Red Spot), pusaran antisiklonik bertekanan tinggi yang berputar berlawanan arah jarum jam dengan kecepatan tepi mencapai 432 km/jam. Badai ini telah berlangsung lebih dari 300 tahun!',
        cameraPreset: {
          position: [4.5, -1.2, 5.5],
          target: [0, 0, 0],
          fov: 45,
        },
        durationS: 14,
      },
    ],
  },
  {
    id: 'tour-demo-draft',
    createdBy: 'user-guru-demo-002',
    authorName: 'Ibu Dewi Kartika, M.Pd.',
    title: 'Draf Eksplorasi Atmosfer Planet Luar',
    description:
      'Materi persiapan kajian badai dan dinamika fluida di atmosfer planet-planet gas luar Tata Surya.',
    isPublished: false,
    classIds: ['class-demo-001'],
    createdAt: '2026-10-31T11:00:00Z',
    updatedAt: '2026-10-31T11:00:00Z',
    steps: [
      {
        id: 'step-draft-jupiter',
        tourId: 'tour-demo-draft',
        poiId: 'jupiter-great-red-spot',
        poiName: 'Badai Merah Raksasa',
        bodyId: 'jupiter',
        bodyName: 'Jupiter',
        stepNo: 1,
        narrationText:
          'Draf catatan guru: Jelaskan mengapa badai bertahan lama tanpa permukaan padat yang memberikan gesekan penahan.',
        cameraPreset: {
          position: [4.0, 0.0, 5.0],
          target: [0, 0, 0],
          fov: 45,
        },
        durationS: 10,
      },
    ],
  },
  {
    id: 'tour-demo-other-teacher',
    createdBy: 'user-guru-demo-999',
    authorName: 'Pak Hendra, S.Pd.',
    title: 'Vulkanisme Tata Surya (Kelas Khusus SMP 2)',
    description:
      'Kajian perbandingan struktur gunung api perisai di Mars dengan kawah vulkanik Bulan.',
    isPublished: true,
    classIds: ['class-demo-999'],
    createdAt: '2026-10-31T12:00:00Z',
    updatedAt: '2026-10-31T12:00:00Z',
    steps: [
      {
        id: 'step-other-olympus',
        tourId: 'tour-demo-other-teacher',
        poiId: 'mars-olympus-mons',
        poiName: 'Olympus Mons',
        bodyId: 'mars',
        bodyName: 'Mars',
        stepNo: 1,
        narrationText:
          'Materi perbandingan untuk siswa SMPN 2 Jayapura mengenai kaldera vulkanik Mars.',
        cameraPreset: {
          position: [3.5, 2.0, 4.5],
          target: [0, 0, 0],
          fov: 45,
        },
        durationS: 10,
      },
    ],
  },
];

function loadStoredTours(): Tour[] {
  if (typeof window === 'undefined') return INITIAL_TOURS;
  try {
    const raw = localStorage.getItem(TOURS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_TOURS;
  } catch {
    return INITIAL_TOURS;
  }
}

function persistTours(tours: Tour[]): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOURS_STORAGE_KEY, JSON.stringify(tours));
  }
}

interface TourState {
  tours: Tour[];
  activeTour: Tour | null;
  currentStepIndex: number;
  isPlaying: boolean;
  isAutoAdvance: boolean;
  stepElapsedTime: number;
  isPreviewMode: boolean;
  liveCamera: CameraPreset;

  // Actions Pembuat Tur (Guru)
  setLiveCamera: (preset: CameraPreset) => void;
  createTour: (
    teacher: UserProfile,
    data: {
      title: string;
      description: string;
      classIds: string[];
      steps: TourStep[];
      isPublished?: boolean;
    },
  ) => Tour;
  updateTour: (tourId: string, updates: Partial<Tour>) => void;
  deleteTour: (tourId: string) => void;
  publishTour: (tourId: string, isPublished: boolean) => void;
  assignTourToClasses: (tourId: string, classIds: string[]) => void;
  reorderSteps: (tourId: string, fromIndex: number, toIndex: number) => void;
  moveStepUp: (tourId: string, stepIndex: number) => void;
  moveStepDown: (tourId: string, stepIndex: number) => void;
  addStepToTour: (
    tourId: string,
    step: Omit<TourStep, 'id' | 'tourId' | 'stepNo'>,
  ) => void;
  removeStepFromTour: (tourId: string, stepId: string) => void;
  updateStepInTour: (
    tourId: string,
    stepId: string,
    updates: Partial<TourStep>,
  ) => void;
  captureCameraToStep: (tourId: string, stepId: string) => void;

  // Actions Pemutar Tur (Siswa & Pratinjau)
  startTour: (tour: Tour, isPreview?: boolean) => void;
  pauseTour: () => void;
  resumeTour: () => void;
  togglePlayPause: () => void;
  toggleAutoAdvance: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  tickPlayback: (deltaSeconds: number) => void;
  exitTour: () => void;

  // Helper Otorisasi / RLS
  getAvailableToursForUser: (
    user: UserProfile | null,
    studentClassIds: string[],
  ) => Tour[];
  getTourById: (tourId: string) => Tour | undefined;
}

export const useTourStore = create<TourState>((set, get) => ({
  tours: loadStoredTours(),
  activeTour: null,
  currentStepIndex: 0,
  isPlaying: false,
  isAutoAdvance: true,
  stepElapsedTime: 0,
  isPreviewMode: false,
  liveCamera: {
    position: [0, 14, 24],
    target: [0, 0, 0],
    fov: 45,
  },

  setLiveCamera: (liveCamera) => set({ liveCamera }),

  createTour: (teacher, data) => {
    const id = `tour-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const newTour: Tour = {
      id,
      createdBy: teacher.id,
      authorName: teacher.name,
      title: data.title.trim(),
      description: data.description.trim(),
      isPublished: Boolean(data.isPublished),
      classIds: data.classIds,
      steps: data.steps.map((st, idx) => ({
        ...st,
        id: st.id || `step-${id}-${idx + 1}`,
        tourId: id,
        stepNo: idx + 1,
      })),
      createdAt: now,
      updatedAt: now,
    };

    const nextTours = [newTour, ...get().tours];
    persistTours(nextTours);
    set({ tours: nextTours });
    return newTour;
  },

  updateTour: (tourId, updates) => {
    const now = new Date().toISOString();
    const nextTours = get().tours.map((t) =>
      t.id === tourId ? { ...t, ...updates, updatedAt: now } : t,
    );
    persistTours(nextTours);
    set({ tours: nextTours });

    if (get().activeTour?.id === tourId) {
      set({ activeTour: { ...get().activeTour!, ...updates, updatedAt: now } });
    }
  },

  deleteTour: (tourId) => {
    const nextTours = get().tours.filter((t) => t.id !== tourId);
    persistTours(nextTours);
    set({ tours: nextTours });

    if (get().activeTour?.id === tourId) {
      get().exitTour();
    }
  },

  publishTour: (tourId, isPublished) => {
    get().updateTour(tourId, { isPublished });
  },

  assignTourToClasses: (tourId, classIds) => {
    get().updateTour(tourId, { classIds });
  },

  reorderSteps: (tourId, fromIndex, toIndex) => {
    const tour = get().tours.find((t) => t.id === tourId);
    if (!tour) return;
    if (
      fromIndex < 0 ||
      fromIndex >= tour.steps.length ||
      toIndex < 0 ||
      toIndex >= tour.steps.length
    )
      return;

    const reordered = [...tour.steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Perbarui urutan nomor langkah secara konsisten 1..N
    const updatedSteps = reordered.map((step, idx) => ({
      ...step,
      stepNo: idx + 1,
    }));

    get().updateTour(tourId, { steps: updatedSteps });
  },

  moveStepUp: (tourId, stepIndex) => {
    if (stepIndex <= 0) return;
    get().reorderSteps(tourId, stepIndex, stepIndex - 1);
  },

  moveStepDown: (tourId, stepIndex) => {
    const tour = get().tours.find((t) => t.id === tourId);
    if (!tour || stepIndex >= tour.steps.length - 1) return;
    get().reorderSteps(tourId, stepIndex, stepIndex + 1);
  },

  addStepToTour: (tourId, stepData) => {
    const tour = get().tours.find((t) => t.id === tourId);
    if (!tour) return;

    const nextNo = tour.steps.length + 1;
    const newStep: TourStep = {
      ...stepData,
      id: `step-${tourId}-${Date.now()}-${nextNo}`,
      tourId,
      stepNo: nextNo,
    };

    get().updateTour(tourId, {
      steps: [...tour.steps, newStep],
    });
  },

  removeStepFromTour: (tourId, stepId) => {
    const tour = get().tours.find((t) => t.id === tourId);
    if (!tour) return;

    const filtered = tour.steps
      .filter((s) => s.id !== stepId)
      .map((s, idx) => ({ ...s, stepNo: idx + 1 }));

    get().updateTour(tourId, { steps: filtered });
  },

  updateStepInTour: (tourId, stepId, updates) => {
    const tour = get().tours.find((t) => t.id === tourId);
    if (!tour) return;

    const updatedSteps = tour.steps.map((s) =>
      s.id === stepId ? { ...s, ...updates } : s,
    );

    get().updateTour(tourId, { steps: updatedSteps });
  },

  captureCameraToStep: (tourId, stepId) => {
    const currentCamera = get().liveCamera;
    get().updateStepInTour(tourId, stepId, {
      cameraPreset: {
        position: [...currentCamera.position],
        target: [...currentCamera.target],
        fov: currentCamera.fov ?? 45,
      },
    });
  },

  // Logika Pemutar Tur
  startTour: (tour, isPreview = false) => {
    if (!tour.steps || tour.steps.length === 0) return;

    const firstStep = tour.steps[0];
    const sceneState = useSceneStore.getState();

    // Hentikan orbit sementara agar posisi planet stabil selama penjelajahan narasi
    sceneState.setOrbitPaused(true);
    sceneState.selectBody(firstStep.bodyId);
    sceneState.selectPoi(firstStep.poiId);

    set({
      activeTour: tour,
      currentStepIndex: 0,
      isPlaying: true,
      stepElapsedTime: 0,
      isPreviewMode: isPreview,
    });
  },

  pauseTour: () => set({ isPlaying: false }),
  resumeTour: () => set({ isPlaying: true }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  toggleAutoAdvance: () =>
    set((state) => ({ isAutoAdvance: !state.isAutoAdvance })),

  nextStep: () => {
    const { activeTour, currentStepIndex } = get();
    if (!activeTour) return;

    const currentStep = activeTour.steps[currentStepIndex];
    if (currentStep) {
      onPoiViewed(currentStep.poiId);
    }

    if (currentStepIndex < activeTour.steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextStepObj = activeTour.steps[nextIndex];
      const sceneState = useSceneStore.getState();
      sceneState.selectBody(nextStepObj.bodyId);
      sceneState.selectPoi(nextStepObj.poiId);

      set({
        currentStepIndex: nextIndex,
        stepElapsedTime: 0,
        isPlaying: true,
      });
    } else {
      // Selesai seluruh langkah
      set({ isPlaying: false });
    }
  },

  prevStep: () => {
    const { activeTour, currentStepIndex } = get();
    if (!activeTour || currentStepIndex <= 0) return;

    const prevIndex = currentStepIndex - 1;
    const prevStepObj = activeTour.steps[prevIndex];
    const sceneState = useSceneStore.getState();
    sceneState.selectBody(prevStepObj.bodyId);
    sceneState.selectPoi(prevStepObj.poiId);

    set({
      currentStepIndex: prevIndex,
      stepElapsedTime: 0,
      isPlaying: true,
    });
  },

  goToStep: (index) => {
    const { activeTour } = get();
    if (!activeTour || index < 0 || index >= activeTour.steps.length) return;

    const targetStep = activeTour.steps[index];
    const sceneState = useSceneStore.getState();
    sceneState.selectBody(targetStep.bodyId);
    sceneState.selectPoi(targetStep.poiId);

    set({
      currentStepIndex: index,
      stepElapsedTime: 0,
      isPlaying: true,
    });
  },

  tickPlayback: (deltaSeconds) => {
    const {
      activeTour,
      isPlaying,
      currentStepIndex,
      stepElapsedTime,
      isAutoAdvance,
    } = get();
    if (!activeTour || !isPlaying) return;

    const currentStep = activeTour.steps[currentStepIndex];
    if (!currentStep) return;

    const nextElapsed = stepElapsedTime + deltaSeconds;
    if (nextElapsed >= currentStep.durationS) {
      onPoiViewed(currentStep.poiId);
      if (isAutoAdvance) {
        if (currentStepIndex < activeTour.steps.length - 1) {
          get().nextStep();
        } else {
          set({
            isPlaying: false,
            stepElapsedTime: currentStep.durationS,
          });
        }
      } else {
        set({
          isPlaying: false,
          stepElapsedTime: currentStep.durationS,
        });
      }
    } else {
      set({ stepElapsedTime: nextElapsed });
    }
  },

  exitTour: () => {
    const sceneState = useSceneStore.getState();
    sceneState.setOrbitPaused(false);
    sceneState.selectPoi(null);

    set({
      activeTour: null,
      currentStepIndex: 0,
      isPlaying: false,
      stepElapsedTime: 0,
      isPreviewMode: false,
    });
  },

  getAvailableToursForUser: (user, studentClassIds) => {
    const all = get().tours;
    if (!user) {
      // Tamu / pengunjung umum: hanya tur yang terbit secara publik/demo
      return all.filter((t) => t.isPublished);
    }

    if (user.role === 'admin') {
      return all;
    }

    if (user.role === 'guru') {
      // Guru dapat melihat semua tur buatannya (draf maupun terbit)
      return all.filter((t) => t.createdBy === user.id);
    }

    // Siswa: HANYA melihat tur yang terbit DAN ditugaskan ke kelas yang diikutinya
    return all.filter(
      (t) =>
        t.isPublished &&
        t.classIds.some((classId) => studentClassIds.includes(classId)),
    );
  },

  getTourById: (tourId) => {
    return get().tours.find((t) => t.id === tourId);
  },
}));

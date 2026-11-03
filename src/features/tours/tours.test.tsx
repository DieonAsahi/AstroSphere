import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useTourStore, INITIAL_TOURS } from './tourStore';
import { useAuthStore } from '../classes/authStore';
import { useQualityStore } from '../../state/qualityStore';
import { TourPlayerOverlay } from './TourPlayerOverlay';
import { TourBuilderModal } from './TourBuilderModal';
import { TourListModal } from './TourListModal';
import * as progressTracker from '../progress/usePoiViewed';
import type { UserProfile } from '../classes/types';

const mockTeacher: UserProfile = {
  id: 'user-guru-demo-002',
  email: 'dewi.guru@sekolah.id',
  name: 'Ibu Dewi Kartika, M.Pd.',
  role: 'guru',
  schoolName: 'SMPN 1 Merauke',
};

const mockStudentEnrolledClass1: UserProfile = {
  id: 'user-siswa-demo-001',
  email: 'budi.siswa@sekolah.id',
  name: 'Budi Prakoso',
  role: 'siswa',
  schoolName: 'SMPN 1 Merauke',
};

const mockStudentOtherClass: UserProfile = {
  id: 'user-siswa-demo-other',
  email: 'citra.siswa@sekolah.id',
  name: 'Citra Kirana',
  role: 'siswa',
  schoolName: 'SMPN 2 Jayapura',
};

describe('Guided Tours Feature (FR-08)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().signOut();
    useTourStore.setState({
      tours: JSON.parse(JSON.stringify(INITIAL_TOURS)),
      activeTour: null,
      currentStepIndex: 0,
      isPlaying: false,
      isAutoAdvance: true,
      stepElapsedTime: 0,
      isPreviewMode: false,
    });
    useQualityStore.getState().setReducedMotion(false);
  });

  describe('1. Urutan Langkah (Step Reordering: Drag & Drop and Keyboard)', () => {
    it('reorders steps using store reorderSteps and maintains 1-based sequential stepNo', () => {
      const store = useTourStore.getState();
      const tour = store.getTourById('tour-demo-001')!;
      expect(tour.steps[0].poiId).toBe('mars-olympus-mons');
      expect(tour.steps[0].stepNo).toBe(1);
      expect(tour.steps[1].poiId).toBe('jupiter-great-red-spot');
      expect(tour.steps[1].stepNo).toBe(2);

      // Tukar urutan langkah
      store.reorderSteps('tour-demo-001', 0, 1);

      const updated = useTourStore.getState().getTourById('tour-demo-001')!;
      expect(updated.steps[0].poiId).toBe('jupiter-great-red-spot');
      expect(updated.steps[0].stepNo).toBe(1);
      expect(updated.steps[1].poiId).toBe('mars-olympus-mons');
      expect(updated.steps[1].stepNo).toBe(2);
    });

    it('moves steps up and down using keyboard helper methods', () => {
      const store = useTourStore.getState();

      // Pindahkan langkah kedua ke atas
      store.moveStepUp('tour-demo-001', 1);
      let updated = useTourStore.getState().getTourById('tour-demo-001')!;
      expect(updated.steps[0].poiId).toBe('jupiter-great-red-spot');

      // Pindahkan langkah pertama ke bawah
      store.moveStepDown('tour-demo-001', 0);
      updated = useTourStore.getState().getTourById('tour-demo-001')!;
      expect(updated.steps[0].poiId).toBe('mars-olympus-mons');
    });

    it('reorders steps via keyboard buttons in TourBuilderModal with ARIA announcements', async () => {
      useAuthStore.setState({ user: mockTeacher });

      await act(async () => {
        render(
          <MemoryRouter>
            <TourBuilderModal
              isOpen={true}
              onClose={() => {}}
              editingTourId="tour-demo-001"
            />
          </MemoryRouter>,
        );
      });

      // Cari tombol pindah ke bawah pada langkah 1
      const moveDownBtn = screen.getByRole('button', {
        name: /Pindahkan langkah 1 ke bawah/i,
      });
      await act(async () => {
        fireEvent.click(moveDownBtn);
      });

      // Verifikasi pengumuman ARIA live terisi
      const liveRegion = screen.getByRole('status');
      expect(liveRegion.textContent).toMatch(/berhasil dipindahkan/i);
    });

    it('reorders steps via Alt+ArrowDown keyboard shortcut on step card', async () => {
      useAuthStore.setState({ user: mockTeacher });

      await act(async () => {
        render(
          <MemoryRouter>
            <TourBuilderModal
              isOpen={true}
              onClose={() => {}}
              editingTourId="tour-demo-001"
            />
          </MemoryRouter>,
        );
      });

      const stepCards = screen.getAllByRole('listitem');
      expect(stepCards.length).toBeGreaterThanOrEqual(2);

      // Tekan Alt+ArrowDown pada langkah 1
      await act(async () => {
        fireEvent.keyDown(stepCards[0], { key: 'ArrowDown', altKey: true });
      });

      const liveRegion = screen.getByRole('status');
      expect(liveRegion.textContent).toMatch(/berhasil dipindahkan/i);
    });

    it('supports drag and drop reordering', async () => {
      useAuthStore.setState({ user: mockTeacher });

      await act(async () => {
        render(
          <MemoryRouter>
            <TourBuilderModal
              isOpen={true}
              onClose={() => {}}
              editingTourId="tour-demo-001"
            />
          </MemoryRouter>,
        );
      });

      const stepCards = screen.getAllByRole('listitem');
      const dataTransfer = {
        data: {} as Record<string, string>,
        setData(key: string, val: string) {
          this.data[key] = val;
        },
        getData(key: string) {
          return this.data[key];
        },
      };

      await act(async () => {
        fireEvent.dragStart(stepCards[0], { dataTransfer });
        fireEvent.drop(stepCards[1], { dataTransfer });
      });

      const liveRegion = screen.getByRole('status');
      expect(liveRegion.textContent).toMatch(/berhasil dipindahkan/i);
    });
  });

  describe('2. Pembagian ke Kelas (Multi-Class Sharing)', () => {
    it('allows assigning a tour to single or multiple classes', () => {
      const store = useTourStore.getState();
      const newTour = store.createTour(mockTeacher, {
        title: 'Tur Multi Kelas Tata Surya',
        description: 'Eksplorasi yang dibagikan ke kelas 7A dan 8B.',
        classIds: ['class-demo-001', 'class-demo-002'],
        steps: [
          {
            id: 's1',
            tourId: 'temp',
            poiId: 'mars-olympus-mons',
            poiName: 'Olympus Mons',
            bodyId: 'mars',
            bodyName: 'Mars',
            stepNo: 1,
            narrationText: 'Penjelasan awal',
            cameraPreset: { position: [1, 2, 3], target: [0, 0, 0] },
            durationS: 10,
          },
        ],
        isPublished: true,
      });

      expect(newTour.classIds).toEqual(['class-demo-001', 'class-demo-002']);

      // Perbarui pembagian kelas
      store.assignTourToClasses(newTour.id, ['class-demo-001']);
      const updated = store.getTourById(newTour.id)!;
      expect(updated.classIds).toEqual(['class-demo-001']);
    });
  });

  describe('3. Otorisasi & Kebijakan Akses (RLS)', () => {
    it('ensures students ONLY see published tours assigned to their enrolled classes', () => {
      const store = useTourStore.getState();

      // Siswa terdaftar di kelas class-demo-001
      const studentClassIds = ['class-demo-001'];
      const visibleTours = store.getAvailableToursForUser(
        mockStudentEnrolledClass1,
        studentClassIds,
      );

      // Siswa dapat melihat tour-demo-001 (karena isPublished = true dan classIds mengandung class-demo-001)
      expect(visibleTours.some((t) => t.id === 'tour-demo-001')).toBe(true);

      // Siswa TIDAK DAPAT melihat tour-demo-draft (karena isPublished = false)
      expect(visibleTours.some((t) => t.id === 'tour-demo-draft')).toBe(false);

      // Siswa TIDAK DAPAT melihat tour-demo-other-teacher (karena hanya ditugaskan ke class-demo-999)
      expect(visibleTours.some((t) => t.id === 'tour-demo-other-teacher')).toBe(
        false,
      );
    });

    it('prevents students in different classes from seeing tours they are not enrolled in', () => {
      const store = useTourStore.getState();

      // Siswa di kelas lain (class-demo-999)
      const studentClassIds = ['class-demo-999'];
      const visibleTours = store.getAvailableToursForUser(
        mockStudentOtherClass,
        studentClassIds,
      );

      // Hanya dapat melihat tour-demo-other-teacher
      expect(visibleTours.some((t) => t.id === 'tour-demo-other-teacher')).toBe(
        true,
      );
      // Tidak dapat melihat tour-demo-001 yang diperuntukkan kelas demo 001/002
      expect(visibleTours.some((t) => t.id === 'tour-demo-001')).toBe(false);
    });

    it('allows teachers to see all their own tours including drafts', () => {
      const store = useTourStore.getState();
      const teacherTours = store.getAvailableToursForUser(mockTeacher, []);

      // Guru melihat tur terbit dan draf buatannya
      expect(teacherTours.some((t) => t.id === 'tour-demo-001')).toBe(true);
      expect(teacherTours.some((t) => t.id === 'tour-demo-draft')).toBe(true);
      // Tetapi tidak melihat tur milik guru lain
      expect(teacherTours.some((t) => t.id === 'tour-demo-other-teacher')).toBe(
        false,
      );
    });
  });

  describe('4. Pemutar Tur (Tour Player, Navigation & Progress Recording)', () => {
    it('records progress on step completion via onPoiViewed', () => {
      const poiSpy = vi.spyOn(progressTracker, 'onPoiViewed');
      const store = useTourStore.getState();
      const demoTour = store.getTourById('tour-demo-001')!;

      // Mulai tur
      store.startTour(demoTour);
      expect(useTourStore.getState().activeTour).not.toBeNull();
      expect(useTourStore.getState().currentStepIndex).toBe(0);

      // Beralih ke langkah berikutnya
      store.nextStep();
      expect(poiSpy).toHaveBeenCalledWith('mars-olympus-mons');
      expect(useTourStore.getState().currentStepIndex).toBe(1);

      // Selesaikan langkah terakhir
      store.nextStep();
      expect(poiSpy).toHaveBeenCalledWith('jupiter-great-red-spot');
      expect(useTourStore.getState().isPlaying).toBe(false);
    });

    it('renders TourPlayerOverlay and responds to player button clicks', () => {
      const store = useTourStore.getState();
      const demoTour = store.getTourById('tour-demo-001')!;
      store.startTour(demoTour);

      render(<TourPlayerOverlay />);

      // Memastikan teks judul dan narasi tampil
      expect(
        screen.getByText('Ekspedisi Geologi Mars & Badai Raksasa Jupiter'),
      ).toBeInTheDocument();
      expect(
        screen.getAllByText(/Olympus Mons/i).length,
      ).toBeGreaterThanOrEqual(1);

      // Uji tombol Sebelumnya (awalnya disabled di langkah 1)
      const prevBtn = screen.getByRole('button', {
        name: /Sebelumnya \(Panah Kiri\)/i,
      });
      expect(prevBtn).toBeDisabled();

      // Uji tombol Berikutnya
      const nextBtn = screen.getByRole('button', {
        name: /Berikutnya \(Panah Kanan\)/i,
      });
      fireEvent.click(nextBtn);
      expect(useTourStore.getState().currentStepIndex).toBe(1);

      // Tombol sebelumnya kini aktif
      expect(prevBtn).not.toBeDisabled();
      fireEvent.click(prevBtn);
      expect(useTourStore.getState().currentStepIndex).toBe(0);
    });

    it('responds to global keyboard shortcuts: Space, ArrowRight, ArrowLeft, Esc', () => {
      const store = useTourStore.getState();
      const demoTour = store.getTourById('tour-demo-001')!;
      store.startTour(demoTour);

      render(<TourPlayerOverlay />);

      // Spacebar untuk jeda / putar
      expect(useTourStore.getState().isPlaying).toBe(true);
      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(useTourStore.getState().isPlaying).toBe(false);

      fireEvent.keyDown(window, { key: ' ', code: 'Space' });
      expect(useTourStore.getState().isPlaying).toBe(true);

      // Panah Kanan untuk langkah berikutnya
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(useTourStore.getState().currentStepIndex).toBe(1);

      // Panah Kiri untuk langkah sebelumnya
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(useTourStore.getState().currentStepIndex).toBe(0);

      // Escape untuk keluar tur
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useTourStore.getState().activeTour).toBeNull();
    });

    it('advances automatically when auto-advance is enabled and duration elapses', () => {
      const poiSpy = vi.spyOn(progressTracker, 'onPoiViewed');
      const store = useTourStore.getState();
      const demoTour = store.getTourById('tour-demo-001')!;
      store.startTour(demoTour);

      // Majukan waktu sebesar durasi langkah pertama (12 detik)
      act(() => {
        store.tickPlayback(12.5);
      });

      expect(poiSpy).toHaveBeenCalledWith('mars-olympus-mons');
      expect(useTourStore.getState().currentStepIndex).toBe(1);
    });

    it('captures live camera coordinates into step camera_preset', () => {
      const store = useTourStore.getState();
      store.setLiveCamera({
        position: [10.5, 5.2, 8.8],
        target: [1.0, 0.0, -1.0],
        fov: 50,
      });

      store.captureCameraToStep('tour-demo-001', 'step-mars-olympus-mons');
      const updatedTour = store.getTourById('tour-demo-001')!;
      const step = updatedTour.steps.find(
        (s) => s.id === 'step-mars-olympus-mons',
      )!;

      expect(step.cameraPreset.position).toEqual([10.5, 5.2, 8.8]);
      expect(step.cameraPreset.target).toEqual([1.0, 0.0, -1.0]);
      expect(step.cameraPreset.fov).toBe(50);
    });
  });

  describe('5. Aksesibilitas WCAG AA (Zero axe Violations)', () => {
    it('passes axe accessibility audit on TourPlayerOverlay', async () => {
      const store = useTourStore.getState();
      const demoTour = store.getTourById('tour-demo-001')!;
      store.startTour(demoTour);

      const { container } = render(<TourPlayerOverlay />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('passes axe accessibility audit on TourListModal', async () => {
      useAuthStore.setState({ user: mockTeacher });

      let containerElement: HTMLElement;
      await act(async () => {
        const { container } = render(
          <MemoryRouter>
            <TourListModal isOpen={true} onClose={() => {}} />
          </MemoryRouter>,
        );
        containerElement = container;
      });

      const results = await axe(containerElement!);
      expect(results).toHaveNoViolations();
    });

    it('passes axe accessibility audit on TourBuilderModal', async () => {
      useAuthStore.setState({ user: mockTeacher });

      let containerElement: HTMLElement;
      await act(async () => {
        const { container } = render(
          <MemoryRouter>
            <TourBuilderModal
              isOpen={true}
              onClose={() => {}}
              editingTourId="tour-demo-001"
            />
          </MemoryRouter>,
        );
        containerElement = container;
      });

      const results = await axe(containerElement!);
      expect(results).toHaveNoViolations();
    });
  });
});
